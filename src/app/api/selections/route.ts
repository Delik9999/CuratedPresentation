import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getSelectionById, upsertSelection } from '@/lib/dataClient';
import type { Selection } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing selection id' }, { status: 400 });
  }
  const selection = await getSelectionById(id);
  if (!selection) {
    return NextResponse.json({ error: 'Selection not found' }, { status: 404 });
  }
  return NextResponse.json({ selection });
}

export async function POST(request: Request) {
  const payload = await request.json();

  if (payload.action === 'duplicate') {
    const sourceId: string | undefined = payload.selectionId;
    const dealerId: string | undefined = payload.dealerId;
    if (!sourceId || !dealerId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    const source = await getSelectionById(sourceId);
    if (!source) {
      return NextResponse.json({ error: 'Selection not found' }, { status: 404 });
    }
    const clone: Selection = {
      ...source,
      id: `sel_${nanoid(6)}`,
      dealerId,
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await upsertSelection(clone);
    return NextResponse.json({ selection: saved });
  }

  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const selection = await upsertSelection(payload as Selection);
  return NextResponse.json({ selection });
}
