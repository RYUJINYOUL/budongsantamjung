import admin from 'firebase-admin';

/** yongcar 프로젝트에 배포된 카카오 Custom Token 발급 함수 */
const DEFAULT_KAKAO_AUTH_API_URL =
  'https://asia-northeast3-yongcar-4377c.cloudfunctions.net/kakaoCallback';

function hasServiceAccount(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}

function initAdmin(): typeof admin {
  if (admin.apps.length > 0) return admin;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!json) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON이 없습니다. 로컬에서는 Cloud Function 프록시를 사용하거나, Firebase 콘솔 > 서비스 계정에서 JSON 키를 발급해 .env에 한 줄로 넣어 주세요.',
    );
  }

  const serviceAccount = JSON.parse(json) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.projectId,
  });
  return admin;
}

export function getFirebaseAdmin() {
  return initAdmin();
}

export function getKakaoAuthApiUrl(): string {
  return process.env.KAKAO_AUTH_API_URL?.trim() || DEFAULT_KAKAO_AUTH_API_URL;
}

export async function createKakaoFirebaseCustomToken(accessToken: string): Promise<string> {
  const kakaoRestKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoRestKey) {
    throw new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
  }

  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    const errText = await userRes.text();
    throw new Error(`카카오 사용자 조회 실패: ${userRes.status} ${errText}`);
  }

  const user = await userRes.json();
  const kakaoId = user.id;
  if (!kakaoId) {
    throw new Error('카카오 사용자 ID를 확인할 수 없습니다.');
  }

  const uid = `kakao${kakaoId}`;
  const nickname = user.kakao_account?.profile?.nickname as string | undefined;
  const email = user.kakao_account?.email as string | undefined;
  const photoURL = user.kakao_account?.profile?.profile_image_url as string | undefined;

  const firebaseAdmin = getFirebaseAdmin();
  let firebaseUid = uid;

  const existingByEmail = email
    ? await firebaseAdmin.auth().getUserByEmail(email).catch(() => null)
    : null;

  if (existingByEmail) {
    firebaseUid = existingByEmail.uid;
    await firebaseAdmin.auth().updateUser(firebaseUid, {
      displayName: nickname || existingByEmail.displayName,
      photoURL: photoURL || existingByEmail.photoURL || undefined,
    });
  } else {
    try {
      await firebaseAdmin.auth().updateUser(firebaseUid, {
        displayName: nickname,
        email: email || undefined,
        photoURL: photoURL || undefined,
      });
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/user-not-found') {
        await firebaseAdmin.auth().createUser({
          uid: firebaseUid,
          displayName: nickname,
          email: email || undefined,
          photoURL: photoURL || undefined,
        });
      } else {
        throw error;
      }
    }
  }

  return firebaseAdmin.auth().createCustomToken(firebaseUid);
}

export async function exchangeKakaoCodeForAccessToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const clientId = process.env.KAKAO_REST_API_KEY;
  if (!clientId) {
    throw new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
  }

  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`카카오 토큰 교환 실패: ${tokenRes.status} ${errText}`);
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) {
    throw new Error('카카오 access_token이 없습니다.');
  }
  return accessToken;
}

/** yongcar Cloud Function으로 Custom Token 발급 (로컬 Admin 불필요) */
export async function proxyKakaoToCloudFunction(accessToken: string): Promise<string> {
  const url = getKakaoAuthApiUrl();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  });

  const raw = await res.text();
  let data: { customToken?: string; error?: string; details?: string } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    data = { error: raw.slice(0, 200) };
  }

  if (!res.ok) {
    throw new Error(
      data.details || data.error || `카카오 인증 API 실패 (${res.status})`,
    );
  }

  if (!data.customToken) {
    throw new Error(data.error || data.details || 'customToken 없음');
  }
  return data.customToken;
}

export async function resolveKakaoCustomToken(accessToken: string): Promise<string> {
  try {
    return await proxyKakaoToCloudFunction(accessToken);
  } catch (cfError) {
    if (!hasServiceAccount()) {
      const hint =
        cfError instanceof Error ? cfError.message : 'Cloud Function 연동 실패';
      throw new Error(
        `카카오 로그인 서버 연동 실패: ${hint}. (로컬 Admin 미설정 — FIREBASE_SERVICE_ACCOUNT_JSON 없음)`,
      );
    }
    console.warn('[kakao] Cloud Function 실패, 로컬 Firebase Admin 시도:', cfError);
    return createKakaoFirebaseCustomToken(accessToken);
  }
}

type NaverProfile = {
  id?: string;
  email?: string;
  name?: string;
  nickname?: string;
  profile_image?: string;
};

export async function exchangeNaverCodeForAccessToken(
  code: string,
  state: string,
): Promise<string> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다.');
  }

  const tokenRes = await fetch(
    `https://nid.naver.com/oauth2.0/token?${new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state,
    }).toString()}`,
  );

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`네이버 토큰 교환 실패: ${tokenRes.status} ${errText}`);
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) {
    throw new Error(
      (tokenJson.error_description as string | undefined) ||
        (tokenJson.error as string | undefined) ||
        '네이버 access_token이 없습니다.',
    );
  }
  return accessToken;
}

export async function createNaverFirebaseCustomToken(
  accessToken: string,
): Promise<string> {
  const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    const errText = await userRes.text();
    throw new Error(`네이버 사용자 조회 실패: ${userRes.status} ${errText}`);
  }

  const payload = await userRes.json();
  if (payload.resultcode !== '00') {
    throw new Error(payload.message || '네이버 사용자 정보를 가져오지 못했습니다.');
  }

  const profile = payload.response as NaverProfile;
  const naverId = profile.id;
  if (!naverId) {
    throw new Error('네이버 사용자 ID를 확인할 수 없습니다.');
  }

  const uid = `naver${naverId}`;
  const nickname = profile.nickname || profile.name;
  const email = profile.email;
  const photoURL = profile.profile_image;

  const firebaseAdmin = getFirebaseAdmin();
  let firebaseUid = uid;

  const existingByEmail = email
    ? await firebaseAdmin.auth().getUserByEmail(email).catch(() => null)
    : null;

  if (existingByEmail) {
    firebaseUid = existingByEmail.uid;
    await firebaseAdmin.auth().updateUser(firebaseUid, {
      displayName: nickname || existingByEmail.displayName,
      photoURL: photoURL || existingByEmail.photoURL || undefined,
    });
  } else {
    try {
      await firebaseAdmin.auth().updateUser(firebaseUid, {
        displayName: nickname,
        email: email || undefined,
        photoURL: photoURL || undefined,
      });
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/user-not-found') {
        await firebaseAdmin.auth().createUser({
          uid: firebaseUid,
          displayName: nickname,
          email: email || undefined,
          photoURL: photoURL || undefined,
        });
      } else {
        throw error;
      }
    }
  }

  return firebaseAdmin.auth().createCustomToken(firebaseUid);
}

export async function resolveNaverCustomToken(accessToken: string): Promise<string> {
  if (!hasServiceAccount()) {
    throw new Error(
      '네이버 로그인에는 FIREBASE_SERVICE_ACCOUNT_JSON이 필요합니다. Firebase 콘솔 > 서비스 계정에서 JSON 키를 발급해 .env에 넣어 주세요.',
    );
  }
  return createNaverFirebaseCustomToken(accessToken);
}
