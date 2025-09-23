import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hasSupabaseConfig } from './env';
import { loadLibSpecProducts } from './libspecLoader';
import type { Collection, DealerProfile, Product, Selection } from './types';

const dataDir = join(process.cwd(), 'data');

async function readJson<T>(fileName: string): Promise<T> {
  const filePath = join(dataDir, fileName);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

type CollectionMeta = {
  heroVideoUrl?: string;
  description?: string;
  sortOrder?: number;
  name?: string;
};

const COLLECTION_OVERRIDES: Record<string, CollectionMeta> = {
  calcolo: {
    heroVideoUrl: 'https://libandco.com/cdn/showroom/video/calcolo-loop.mp4',
    description: 'Precision balanced forms with carved alabaster diffusers—heroed for Dallas Market.',
    sortOrder: 0,
  },
  vinci: {
    heroVideoUrl: 'https://libandco.com/cdn/showroom/video/vinci-loop.mp4',
    description: 'Versatile LED wall luminaires tuned for spa and hospitality refreshes.',
    sortOrder: 1,
  },
  ancona: {
    heroVideoUrl: 'https://libandco.com/cdn/showroom/video/ancona-loop.mp4',
    description: 'Italian-influenced ceiling accents pairing opal glass with metallic finishes.',
    sortOrder: 2,
  },
  dolo: {
    heroVideoUrl: 'https://libandco.com/cdn/showroom/video/dolo-loop.mp4',
    description: 'Slimline LED bath bars delivering tunable white for luxury projects.',
    sortOrder: 3,
  },
  trapani: {
    heroVideoUrl: 'https://libandco.com/cdn/showroom/video/trapani-loop.mp4',
    description: 'Grand statement chandeliers in Soft Brass and Metallic Black for dramatic entries.',
    sortOrder: 4,
  },
};

const selectionStore = new Map<string, Selection>();

function cloneSelection(selection: Selection): Selection {
  return {
    ...selection,
    lines: selection.lines.map((line) => ({
      ...line,
      pickedBy: [...(line.pickedBy ?? [])],
      favorites: [...(line.favorites ?? [])],
    })),
  };
}

function buildCollectionsFromProducts(products: Product[]): Collection[] {
  const map = new Map<string, Collection>();

  products.forEach((product) => {
    const collectionId = product.collectionId;
    const override = COLLECTION_OVERRIDES[collectionId];
    const existing = map.get(collectionId);
    if (existing) {
      if (!existing.heroVideoUrl) {
        existing.heroVideoUrl = override?.heroVideoUrl ?? product.videoUrls?.[0];
      }
      return;
    }

    const collectionName =
      override?.name ??
      product.specs['Collection name'] ??
      collectionId.replace(/-/g, ' ');

    map.set(collectionId, {
      id: collectionId,
      name: collectionName,
      heroVideoUrl: override?.heroVideoUrl ?? product.videoUrls?.[0],
      description: override?.description,
      sortOrder: override?.sortOrder ?? Number.MAX_SAFE_INTEGER,
    });
  });

  return Array.from(map.values())
    .sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    })
    .map((collection, index) => ({
      id: collection.id,
      name: collection.name,
      heroVideoUrl: collection.heroVideoUrl,
      description: collection.description,
      sortOrder: index + 1,
    }));
}

export async function getCollections(): Promise<Collection[]> {
  if (hasSupabaseConfig()) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await client
      .from('collections')
      .select('*')
      .order('sortOrder', { ascending: true });
    if (error) throw error;
    return data as Collection[];
  }
  const libProducts = await loadLibSpecProducts();
  if (libProducts && libProducts.length > 0) {
    const activeProducts = libProducts.filter((product) => product.active);
    return buildCollectionsFromProducts(activeProducts);
  }

  return [];
}

export async function getProducts(): Promise<Product[]> {
  if (hasSupabaseConfig()) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('active', true);
    if (error) throw error;
    return data as Product[];
  }
  const libProducts = await loadLibSpecProducts();
  if (libProducts) {
    return libProducts.filter((product) => product.active);
  }
  return [];
}

export async function getDealerProfile(id: string): Promise<DealerProfile | null> {
  if (hasSupabaseConfig()) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await client
      .from('dealers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as DealerProfile | null;
  }
  const dealers = await readJson<DealerProfile[]>('dealers.json');
  return dealers.find((dealer) => dealer.id === id) ?? null;
}

export async function getSelectionById(id: string): Promise<Selection | null> {
  if (hasSupabaseConfig()) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await client
      .from('selections')
      .select('*, lines:selection_lines(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      dealerId: data.dealerId,
      name: data.name,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lines: data.lines,
    } as Selection;
  }

  const cached = selectionStore.get(id);
  return cached ? cloneSelection(cached) : null;
}

export async function upsertSelection(selection: Selection): Promise<Selection> {
  if (hasSupabaseConfig()) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await client
      .from('selections')
      .upsert(selection)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as Selection;
  }

  const copy = cloneSelection(selection);
  selectionStore.set(copy.id, copy);
  return cloneSelection(copy);
}

const shareCache = new Map<string, { selectionId: string; createdAt: string }>();

export function persistShareToken(token: string, selectionId: string) {
  shareCache.set(token, { selectionId, createdAt: new Date().toISOString() });
}

export function resolveShareToken(token: string): string | null {
  return shareCache.get(token)?.selectionId ?? null;
}

export function registerLocalSelection(selection: Selection) {
  if (hasSupabaseConfig()) return;
  const copy = cloneSelection(selection);
  selectionStore.set(copy.id, copy);
}
