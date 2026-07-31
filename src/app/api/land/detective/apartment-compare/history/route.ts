import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const body = await request.json();
    const url = `${backendUrl}/api/land/detective/apartment-compare/history`;

    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || '비교 내역 저장에 실패했습니다.' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('apartment-compare/history POST 오류:', message);
    return NextResponse.json({ success: false, error: '서버 연결에 실패했습니다.', message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
