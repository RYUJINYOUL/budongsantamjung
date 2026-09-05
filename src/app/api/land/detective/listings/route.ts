import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const qs = request.nextUrl.searchParams.toString();
    const url = `${backendUrl}/api/land/detective/listings${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data.error || '매물 목록 조회 실패' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: '서버 연결 실패', message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
