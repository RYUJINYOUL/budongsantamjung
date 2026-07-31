import { getFirebaseAdmin } from './firebaseAdmin';
import { isAdminUser } from './adminUids';

export type AdminAuthResult =
  | { ok: true; uid: string }
  | { ok: false; error: string; status: number };

function decodeFirebaseUidFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      sub?: string;
      user_id?: string;
    };
    return payload.sub || payload.user_id || null;
  } catch {
    return null;
  }
}

async function verifyAdminViaBackend(authHeader: string): Promise<AdminAuthResult> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!backendUrl) {
    return { ok: false, error: '백엔드 URL이 설정되지 않았습니다.', status: 500 };
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  if (!token) {
    return { ok: false, error: '인증이 필요합니다.', status: 401 };
  }

  try {
    const res = await fetch(`${backendUrl}/api/land/detective/my-reports?limit=1`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Authorization: authHeader },
    });

    if (res.status === 401) {
      return { ok: false, error: '유효하지 않은 인증 토큰입니다.', status: 401 };
    }
    if (!res.ok) {
      return { ok: false, error: '인증 확인에 실패했습니다.', status: 401 };
    }

    const uid = decodeFirebaseUidFromJwt(token);
    if (!uid) {
      return { ok: false, error: '사용자 정보를 확인할 수 없습니다.', status: 401 };
    }
    if (!isAdminUser(uid)) {
      return { ok: false, error: '관리자 권한이 필요합니다.', status: 403 };
    }
    return { ok: true, uid };
  } catch {
    return { ok: false, error: '인증 서버 연결에 실패했습니다.', status: 503 };
  }
}

export async function verifyAdminRequest(request: Request): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: '인증이 필요합니다.', status: 401 };
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return { ok: false, error: '인증이 필요합니다.', status: 401 };
  }

  try {
    const decoded = await getFirebaseAdmin().auth().verifyIdToken(token);
    if (!isAdminUser(decoded.uid)) {
      return { ok: false, error: '관리자 권한이 필요합니다.', status: 403 };
    }
    return { ok: true, uid: decoded.uid };
  } catch (localError) {
    console.warn('[verifyAdminRequest] local Firebase Admin verify failed, trying backend:', localError);
    return verifyAdminViaBackend(authHeader);
  }
}

async function generateSummaryLocally(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash',
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 2048,
    },
  });

  const text = result.response.text().trim();
  if (!text) {
    throw new Error('AI 응답이 비어 있습니다.');
  }
  return text;
}

export async function generateCompareAdminSummary(
  request: Request,
  prompt: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { ok: false, error: '인증이 필요합니다.', status: 401 };
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl}/api/land/detective/apartment-compare/admin-summary`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && data.text) {
        return { ok: true, text: String(data.text) };
      }
      if (response.status !== 404 && response.status !== 502 && response.status !== 503) {
        return {
          ok: false,
          error: data.error || data.message || 'AI 글 생성에 실패했습니다.',
          status: response.status,
        };
      }
    } catch (error) {
      console.warn('[generateCompareAdminSummary] backend proxy failed, falling back to local:', error);
    }
  }

  const auth = await verifyAdminRequest(request);
  if (auth.ok === false) {
    return { ok: false, error: auth.error, status: auth.status };
  }

  try {
    const text = await generateSummaryLocally(prompt);
    return { ok: true, text };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI 생성 중 오류가 발생했습니다.';
    return { ok: false, error: message, status: 500 };
  }
}
