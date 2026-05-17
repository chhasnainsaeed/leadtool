import { NextResponse } from 'next/server';
import { getStorageProvider } from '@/lib/storage';

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: getStorageProvider(),
  });
}

