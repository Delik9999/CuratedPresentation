import { NextResponse } from 'next/server';
import { getDealerProfile } from '@/lib/dataClient';

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const dealer = await getDealerProfile(context.params.id);
  if (!dealer) {
    return NextResponse.json({ dealer: null }, { status: 404 });
  }
  return NextResponse.json({ dealer });
}
