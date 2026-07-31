import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);

    const url = `${backendUrl}/api/land/detective/apartments/discover?${searchParams.toString()}`;
    const authHeader = request.headers.get('Authorization');
    const response = await fetch(url, {
      cache: 'no-store',
      headers: authHeader ? { Authorization: authHeader } : {},
      signal: request.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || '아파트 발견 정보를 가져오는 데 실패했습니다.', items: [] },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (
      err.name === 'AbortError' ||
      request.signal.aborted
    ) {
      return new Response('Aborted', { status: 499 });
    }
    return NextResponse.json(
      { error: '서버 연결에 실패했습니다.', message: err.message, items: [] },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
