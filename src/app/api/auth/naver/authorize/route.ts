import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function buildState(returnTo: string): string {
  const nonce = randomBytes(8).toString('hex');
  return `${returnTo}::${nonce}`;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: 'NAVER_CLIENT_ID가 서버 환경변수에 없습니다.' },
      { status: 500 },
    );
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  const safeReturn =
    returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/auth/naver/callback`;
  const state = buildState(safeReturn);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });

  const response = NextResponse.redirect(
    `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`,
  );

  response.cookies.set('naver_redirect_uri', redirectUri, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  return response;
}
