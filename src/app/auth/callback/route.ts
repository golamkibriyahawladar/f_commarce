import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Auth callback not configured' }, { status: 400 });
}
