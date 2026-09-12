import { NextRequest, NextResponse } from 'next/server';
import { resolveBackendUrl } from '@/lib/backendUrl';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = resolveBackendUrl();
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const url = `${backendUrl}/api/auction/search?${searchParams.toString()}`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: request.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          message: errorData.message || errorData.error || '경매 목록 조회에 실패했습니다.',
          items: [],
          total: 0,
          page: 1,
          limit: 30,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json());
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'AbortError' || request.signal.aborted) {
      return new Response('Aborted', { status: 499 });
    }
    return NextResponse.json(
      {
        success: false,
        message: err.message || '서버 연결에 실패했습니다.',
        items: [],
        total: 0,
        page: 1,
        limit: 30,
      },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
