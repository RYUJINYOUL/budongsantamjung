import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const url = `${backendUrl}/api/recom/apartments?${searchParams.toString()}`;
    const authHeader = request.headers.get('Authorization');
    const response = await fetch(url, {
      cache: 'no-store',
      headers: authHeader ? { Authorization: authHeader } : {},
      signal: request.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          message: errorData.message || '추천 아파트 조회에 실패했습니다.',
          items: [],
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'AbortError' || request.signal.aborted) {
      return new Response('Aborted', { status: 499 });
    }
    return NextResponse.json(
      { success: false, message: err.message || '서버 연결에 실패했습니다.', items: [] },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
