import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const searchParams = request.nextUrl.search;
    const url = `${backendUrl}/api/land/detective/admin/analyses-by-date${searchParams}`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: authHeader },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || '분석 목록을 가져오는 데 실패했습니다.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('관리자 분석 목록 API 호출 오류:', error);
    return NextResponse.json(
      { error: '서버 연결에 실패했습니다.', message },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
