import { NextResponse } from 'next/server';
import {
  exchangeNaverCodeForAccessToken,
  resolveNaverCustomToken,
} from '../../../../lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken = (body.accessToken || body.access_token) as
      | string
      | undefined;
    const code = body.code as string | undefined;
    const state = body.state as string | undefined;

    let token = accessToken;

    if (!token && code) {
      if (!state) {
        return NextResponse.json(
          { error: 'state가 필요합니다.' },
          { status: 400 },
        );
      }
      token = await exchangeNaverCodeForAccessToken(code, state);
    }

    if (!token) {
      return NextResponse.json(
        { error: 'accessToken 또는 code가 필요합니다.' },
        { status: 400 },
      );
    }

    const customToken = await resolveNaverCustomToken(token);
    return NextResponse.json({ customToken });
  } catch (error: unknown) {
    console.error('[api/auth/naver]', error);
    const message = error instanceof Error ? error.message : '네이버 로그인 실패';
    return NextResponse.json(
      { error: 'naver_auth_failed', details: message },
      { status: 500 },
    );
  }
}
