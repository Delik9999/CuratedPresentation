import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Product } from './types';

const DATA_DIR = join(process.cwd(), 'data');
const SPEC_FILE = 'libspecs.json';
const IMAGE_BASE_URL = 'https://libandco.com/cdn/shop/files';
const DEFAULT_IMAGE_VERSION = '1734408335';

type JsonRecord = Record<string, unknown>;

type LookupMap = Map<string, unknown>;

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

function createLookup(record: JsonRecord): LookupMap {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    map.set(normalizeKey(key), value);
  }
  return map;
}

function getValue<T>(lookup: LookupMap, aliases: string[]): T | undefined {
  for (const alias of aliases) {
    const value = lookup.get(normalizeKey(alias));
    if (value !== undefined && value !== '') {
      return value as T;
    }
  }
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function toNumberValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9+\-.]/g, '');
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toBooleanValue(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const text = String(value).toLowerCase().trim();
  if (['true', 'yes', 'y', '1'].includes(text)) return true;
  if (['false', 'no', 'n', '0'].includes(text)) return false;
  return undefined;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .trim();
}

function buildSize(width?: string, height?: string, depth?: string): string | undefined {
  const parts = [width, height, depth].map((part) => part?.trim()).filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  return parts.join(' × ');
}

function ensureImageUrl(rawUrl: string, version?: string): string {
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    if (version && !rawUrl.includes('?')) {
      return `${rawUrl}?v=${version}`;
    }
    return rawUrl;
  }
  const url = `${IMAGE_BASE_URL}/${rawUrl}.jpg`;
  return version ? `${url}?v=${version}` : url;
}

const STOCK_FILE_PATTERN = /^libcoststock[-\d]+\.json$/i;

function stockSortKey(file: string): string {
  const digits = file.replace(/\D/g, '');
  if (digits.length >= 8) {
    return digits.slice(0, 8);
  }
  return digits || file;
}

type StockSnapshot = {
  map: Map<string, LookupMap>;
  asOf?: string;
};

async function loadLatestStockSnapshot(): Promise<StockSnapshot> {
  try {
    const entries = await readdir(DATA_DIR);
    const stockFiles = entries
      .filter((file) => STOCK_FILE_PATTERN.test(file))
      .map((file) => ({ file, key: stockSortKey(file) }))
      .sort((a, b) => a.key.localeCompare(b.key));
    if (stockFiles.length === 0) {
      return { map: new Map() };
    }
    const latestFile = stockFiles[stockFiles.length - 1].file;
    const raw = await readFile(join(DATA_DIR, latestFile), 'utf-8');
    const json = JSON.parse(raw) as JsonRecord;
    const asOf = toStringValue((json as { asOf?: unknown }).asOf);
    const collection = Array.isArray(json)
      ? json
      : Array.isArray(json.items)
        ? json.items
        : Array.isArray((json as { inventory?: unknown }).inventory)
          ? ((json as { inventory: unknown[] }).inventory)
          : [];
    const map = new Map<string, LookupMap>();
    for (const entry of collection) {
      if (!entry || typeof entry !== 'object') continue;
      const lookup = createLookup(entry as JsonRecord);
      const sku = toStringValue(getValue<string>(lookup, ['sku', 'item', 'itemnumber', 'catalogsku']));
      if (!sku) continue;
      map.set(sku.toUpperCase(), lookup);
    }
    return { map, asOf };
  } catch (error) {
    console.warn('Unable to read libcoststock snapshot', error);
    return { map: new Map() };
  }
}

export async function loadLibSpecProducts(): Promise<Product[] | null> {
  const specPath = join(DATA_DIR, SPEC_FILE);
  if (!existsSync(specPath)) {
    return null;
  }

  try {
    const raw = await readFile(specPath, 'utf-8');
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) {
      console.warn('libspecs.json must contain an array of records.');
      return null;
    }

    const { map: stockMap, asOf: stockAsOf } = await loadLatestStockSnapshot();
    const products: Product[] = [];

    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      const spec = record as JsonRecord;
      const lookup = createLookup(spec);

      const sku = toStringValue(getValue<string>(lookup, ['sku', 'itemnumber', 'item', 'catalogsku']));
      if (!sku) continue;

      const title =
        toStringValue(getValue<string>(lookup, ['name', 'title', 'productname', 'description'])) ?? sku;
      const vendor =
        toStringValue(getValue<string>(lookup, ['vendor', 'brand', 'manufacturer'])) ?? 'Lib&Co';
      const collectionName = toStringValue(
        getValue<string>(lookup, ['collection', 'collectionname', 'family', 'line'])
      );
      const category = toStringValue(getValue<string>(lookup, ['category', 'type', 'producttype']));
      const finish = toStringValue(getValue<string>(lookup, ['finish', 'finishcolor', 'color']));
      const bulbs = toStringValue(getValue<string>(lookup, ['bulbs', 'lamps', 'lampqty', 'lamptype']));
      const dimmable = toBooleanValue(getValue(lookup, ['dimmable', 'isdimmable']));
      const width = toStringValue(getValue<string>(lookup, ['width', 'overallwidth', 'w']));
      const height = toStringValue(getValue<string>(lookup, ['height', 'overallheight', 'h']));
      const depth = toStringValue(
        getValue<string>(lookup, ['depth', 'overalldepth', 'projection', 'length', 'overalllength', 'd'])
      );
      const description = toStringValue(
        getValue<string>(lookup, ['description', 'shortdescription', 'story', 'notes'])
      );
      const video = toStringValue(getValue<string>(lookup, ['video', 'videourl', 'herovideo']));
      const imageVersion =
        toStringValue(getValue<string>(lookup, ['imageversion', 'version', 'v'])) ?? DEFAULT_IMAGE_VERSION;
      const rawImage = toStringValue(getValue<string>(lookup, ['image', 'imageurl', 'primaryimage'])) ?? sku;
      const imageUrl = ensureImageUrl(rawImage, imageVersion);

      let msrp = toNumberValue(getValue<number | string>(lookup, ['msrp', 'msrpprice']));
      let dealerNet = toNumberValue(getValue<number | string>(lookup, ['dealernet', 'netprice', 'wholesale']));
      let map = toNumberValue(getValue<number | string>(lookup, ['map', 'minimumadvertisedprice']));
      let displayCost = toNumberValue(getValue<number | string>(lookup, ['displaycost', 'displayprice']));
      const newIntro = toBooleanValue(getValue(lookup, ['isnewintro', 'newintro', 'new']));
      const marketRecommended = toBooleanValue(
        getValue(lookup, ['ismarketrecommended', 'markethighlight', 'dallasrecommended'])
      );

      const stockLookup = stockMap.get(sku.toUpperCase());
      const available = stockLookup
        ? toNumberValue(getValue<number | string>(stockLookup, ['available', 'qty', 'quantity', 'onhand', 'stock']))
        : undefined;
      const displayEligible = stockLookup
        ? toBooleanValue(getValue(stockLookup, ['displayeligible', 'displayeligibleflag', 'display']))
        : undefined;
      if (stockLookup) {
        dealerNet = dealerNet ?? toNumberValue(getValue(stockLookup, ['dealernet', 'netprice', 'wholesale']));
        msrp = msrp ?? toNumberValue(getValue(stockLookup, ['msrp']));
        map = map ?? toNumberValue(getValue(stockLookup, ['map']));
        displayCost = displayCost ?? toNumberValue(getValue(stockLookup, ['displaycost', 'displayprice']));
      }

      const specs: Product['specs'] = {};
      if (collectionName) specs['Collection name'] = collectionName;
      if (category) specs.Category = category;
      if (bulbs) specs['Number of Bulbs'] = bulbs;
      if (finish) specs.Finish = finish;
      const size = buildSize(width, height, depth);
      if (size) specs.size = size;
      if (dimmable !== undefined) specs.dimmable = dimmable;
      if (description) specs.Story = description;

      const collectionId = slugify(collectionName ?? 'general');

      const fallbackMsrp = msrp ?? dealerNet ?? map ?? displayCost ?? 0;

      const product: Product = {
        sku,
        title,
        vendor,
        images: [imageUrl],
        specs,
        collectionId,
        price: {
          msrp: fallbackMsrp,
          dealerNet: dealerNet ?? undefined,
          map: map ?? undefined,
          displayCost: displayCost ?? undefined,
        },
        isNewIntro: Boolean(newIntro),
        isMarketRecommended: Boolean(marketRecommended),
        active: available === undefined ? true : available > 0,
      };

      if (video) {
        product.videoUrls = [video];
      }

      if (stockLookup) {
        let status: NonNullable<Product['availability']>['status'] = 'unknown';
        if (available !== undefined) {
          if (available <= 0) {
            status = 'backorder';
          } else if (available <= 10) {
            status = 'limited';
          } else {
            status = 'in_stock';
          }
        }

        product.availability = {
          status,
          available: available ?? undefined,
          displayEligible: displayEligible ?? undefined,
          asOf: stockAsOf,
        };

        if (product.availability.available === undefined) {
          delete product.availability.available;
        }

        if (product.availability.displayEligible === undefined) {
          delete product.availability.displayEligible;
        }

        if (!product.availability.asOf) {
          delete product.availability.asOf;
        }

        if (product.availability.status === 'unknown' && Object.keys(product.availability).length === 1) {
          delete product.availability;
        }
      }

      products.push(product);
    }

    return products;
  } catch (error) {
    console.warn('Unable to parse libspecs.json', error);
    return null;
  }
}
