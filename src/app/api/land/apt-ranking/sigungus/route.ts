import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';

export async function GET(_req: NextRequest) {
  const res = await fetch(`${backendUrl}/api/land/apt-ranking/sigungus`, {
    next: { revalidate: 300 }, // 5분 캐시
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
