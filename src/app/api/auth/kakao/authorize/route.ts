import { NextRequest, NextResponse } from 'next/server';

/**
 * 카카오 로그인 시작 — SDK 없이 OAuth authorize URL로 302 리다이렉트
 * client_id: REST API 키 (카카오 로그인 REST API 규격)
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    return NextResponse.json(
      { error: 'KAKAO_REST_API_KEY가 서버 환경변수에 없습니다.' },
      { status: 500 },
    );
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/auth/kakao/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: returnTo,
  });

  const response = NextResponse.redirect(
    `https://kauth.kakao.com/oauth/authorize?${params.toString()}`,
  );

  // 토큰 교환 시 authorize와 동일한 redirect_uri 사용 (KOE320 방지)
  response.cookies.set('kakao_redirect_uri', redirectUri, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  return response;
}
