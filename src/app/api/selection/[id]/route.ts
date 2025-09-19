import { NextResponse } from 'next/server';
import { getSelectionById } from '@/lib/dataClient';

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const selection = await getSelectionById(context.params.id);
  if (!selection) {
    return NextResponse.json({ selection: null }, { status: 404 });
  }
  return NextResponse.json({ selection });
}
