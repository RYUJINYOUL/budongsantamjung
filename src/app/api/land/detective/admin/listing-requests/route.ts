import { NextRequest, NextResponse } from 'next/server';

async function proxyAdminGet(request: NextRequest, path: string) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const searchParams = request.nextUrl.search;
    const url = `${backendUrl}/api/land/detective/${path}${searchParams}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: authHeader },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || '조회에 실패했습니다.' },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: '서버 연결에 실패했습니다.', message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return proxyAdminGet(request, 'admin/listing-requests');
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
