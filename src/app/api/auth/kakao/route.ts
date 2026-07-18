import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  exchangeKakaoCodeForAccessToken,
  resolveKakaoCustomToken,
} from '../../../../lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken = (body.accessToken || body.access_token) as string | undefined;
    const code = body.code as string | undefined;
    const bodyRedirectUri = body.redirectUri as string | undefined;

    const cookieStore = await cookies();
    const redirectUri =
      cookieStore.get('kakao_redirect_uri')?.value || bodyRedirectUri;

    let token = accessToken;

    if (!token && code) {
      if (!redirectUri) {
        return NextResponse.json(
          { error: 'redirectUri가 필요합니다.' },
          { status: 400 },
        );
      }
      token = await exchangeKakaoCodeForAccessToken(code, redirectUri);
    }

    if (!token) {
      return NextResponse.json(
        { error: 'accessToken 또는 code가 필요합니다.' },
        { status: 400 },
      );
    }

    const customToken = await resolveKakaoCustomToken(token);

    const response = NextResponse.json({ customToken });
    response.cookies.set('kakao_redirect_uri', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error: unknown) {
    console.error('[api/auth/kakao]', error);
    const message = error instanceof Error ? error.message : '카카오 로그인 실패';
    return NextResponse.json(
      { error: 'kakao_auth_failed', details: message },
      { status: 500 },
    );
  }
}
