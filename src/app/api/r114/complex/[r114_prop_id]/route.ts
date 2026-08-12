import { NextRequest, NextResponse } from 'next/server';

const BACKEND_TIMEOUT_MS = 120_000;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ r114_prop_id: string }> },
) {
  try {
    const { r114_prop_id: r114PropId } = await context.params;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const url = `${backendUrl}/api/r114/complex/${encodeURIComponent(r114PropId)}?${searchParams.toString()}`;
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(url, {
      cache: 'no-store',
      headers: authHeader ? { Authorization: authHeader } : {},
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return NextResponse.json(
        { success: false, message: '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || '서버 연결에 실패했습니다.' },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
