import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const query = request.nextUrl.searchParams.toString();

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const url = `${backendUrl}/api/land/detective/apartment-compare${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || '단지 비교 데이터를 가져오지 못했습니다.' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('apartment-compare API 오류:', message);
    return NextResponse.json({ error: '서버 연결에 실패했습니다.', message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
