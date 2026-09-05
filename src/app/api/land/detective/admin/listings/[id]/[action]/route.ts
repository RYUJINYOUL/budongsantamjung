import { NextRequest, NextResponse } from 'next/server';

async function proxyAction(request: NextRequest, id: string, action: 'recom-approve' | 'recom-reject') {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const response = await fetch(`${backendUrl}/api/land/detective/admin/listings/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data.error || '처리 실패' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: '서버 연결 실패', message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } },
) {
  const action = params.action;
  if (action !== 'recom-approve' && action !== 'recom-reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  return proxyAction(request, params.id, action);
}

export const dynamic = 'force-dynamic';
