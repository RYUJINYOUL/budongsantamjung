import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params = searchParams.toString();

  const res = await fetch(`${backendUrl}/api/land/apt-ranking?${params}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
