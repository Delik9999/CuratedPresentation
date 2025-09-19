import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import { hasSupabaseConfig } from './env';
import type {
  Collection,
  DealerProfile,
  Product,
  Selection,
} from './types';

const dataDir = join(process.cwd(), 'data');

async function readJson<T>(fileName: string): Promise<T> {
  const filePath = join(dataDir, fileName);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function writeJson<T>(fileName: string, data: T) {
  const filePath = join(dataDir, fileName);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
  const local = await readJson<Collection[]>('collections.json');
  return local.sort((a, b) => a.sortOrder - b.sortOrder);
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
  const products = await readJson<Product[]>('products.json');
  return products.filter((product) => product.active);
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

  try {
    const selection = await readJson<Selection>('selection.example.json');
    return selection.id === id ? selection : null;
  } catch (error) {
    console.error('Selection read error', error);
    return null;
  }
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

  await writeJson('selection.example.json', selection);
  return selection;
}

export async function createSelectionFromTemplate(
  dealerId: string,
  template?: Partial<Selection>
) {
  const selection: Selection = {
    id: template?.id ?? `sel_${nanoid(8)}`,
    dealerId,
    name: template?.name ?? 'Dallas Market Selection',
    lines: template?.lines ?? [],
    createdAt: template?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return upsertSelection(selection);
}

const shareCache = new Map<string, { selectionId: string; createdAt: string }>();

export function persistShareToken(token: string, selectionId: string) {
  shareCache.set(token, { selectionId, createdAt: new Date().toISOString() });
}

export function resolveShareToken(token: string): string | null {
  return shareCache.get(token)?.selectionId ?? null;
}
