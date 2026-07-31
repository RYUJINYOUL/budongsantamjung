import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ aptSeq: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const authHeader = request.headers.get('Authorization');
  const { aptSeq } = await context.params;
  const query = request.nextUrl.searchParams.toString();

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const encoded = encodeURIComponent(aptSeq);
    const url = `${backendUrl}/api/land/detective/apartment/${encoded}/areas${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || '평형 목록을 가져오지 못했습니다.' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: '서버 연결에 실패했습니다.', message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
