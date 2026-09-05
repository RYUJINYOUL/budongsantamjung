import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const search = request.nextUrl.searchParams.toString();
    const url = `${backendUrl}/api/land/detective/listings/${params.id}/lite-context${search ? `?${search}` : ''}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data.error || '매물 컨텍스트 조회 실패' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: '서버 연결 실패', message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
