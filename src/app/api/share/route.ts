import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { persistShareToken } from '@/lib/dataClient';

export async function POST(request: Request) {
  const body = await request.json();
  const selectionId: string | undefined = body.selectionId;
  if (!selectionId) {
    return NextResponse.json({ error: 'Missing selection id' }, { status: 400 });
  }
  const token = nanoid(8);
  persistShareToken(token, selectionId);
  const origin = headers().get('origin') ?? 'http://localhost:3000';
  const url = `${origin}/showroom?share=${token}`;
  return NextResponse.json({ token, url });
}
