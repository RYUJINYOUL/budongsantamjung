# 네이버 로그인 (토지지옥 / Next.js)

> tamjung.me 웹 로그인 · 2026-07-16 적용  
> 백엔드(ddangpago-backend)와 무관 — **Vercel(Next) + Firebase Admin** 만 사용

---

## 1. 환경변수

로컬: `.env.example` → `.env` 복사 후 값 입력  
Vercel: **Project → Settings → Environment Variables**

### 네이버 로그인 (필수)

| 변수 | 공개 | 설명 |
|------|------|------|
| `NAVER_CLIENT_ID` | 서버 전용 | 네이버 개발자센터 Client ID |
| `NAVER_CLIENT_SECRET` | 서버 전용 | 네이버 Client Secret |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 서버 전용 | Firebase Admin SDK JSON **전체를 한 줄** |

> 카카오는 Cloud Function fallback 가능하지만, **네이버는 `FIREBASE_SERVICE_ACCOUNT_JSON` 필수**.

`FIREBASE_SERVICE_ACCOUNT_JSON` 발급: Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 → JSON 내용을 `.env` 한 줄로 붙여넣기.

### 기존 Firebase 클라이언트 (변경 없음)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 네이버 지도 (로그인과 별개)

```
NEXT_PUBLIC_NAVER_CLIENT_ID=
```

---

## 2. 네이버 개발자센터 Callback URL

**둘 다** 등록해야 함 (운영 redirect가 `www` 사용):

```
https://tamjung.me/auth/naver/callback
https://www.tamjung.me/auth/naver/callback
```

미등록 시 네이버에서 **「서비스 설정 오류(100)」** 발생.

---

## 3. 로그인 흐름

```
[로그인/회원가입] 네이버 버튼 클릭
  → GET /api/auth/naver/authorize?returnTo=/
  → 네이버 OAuth (nid.naver.com)
  → /auth/naver/callback?code=...&state=...
  → POST /api/auth/naver  { code, state }
  → Firebase customToken 발급
  → signInWithCustomToken → returnTo 로 이동
```

Firebase UID 형식: `naver{네이버ID}`

---

## 4. 추가/변경 파일

| 파일 | 역할 |
|------|------|
| `src/lib/naverAuthClient.ts` | authorize 이동, code→token, returnTo 처리 |
| `src/lib/firebaseAdmin.ts` | code→accessToken, accessToken→customToken |
| `src/components/NaverAuthButton.tsx` | 네이버 버튼 UI |
| `src/app/api/auth/naver/authorize/route.ts` | OAuth authorize redirect |
| `src/app/api/auth/naver/route.ts` | POST: code 또는 access_token → customToken |
| `src/app/auth/naver/callback/page.tsx` | OAuth callback 처리 |
| `src/app/login/page.tsx` | Google · 카카오 · **네이버** 버튼 |
| `src/app/signup/page.tsx` | Google · 카카오 · **네이버** 버튼 |
| `.env.example` | env 템플릿 |

---

## 5. 로그인 화면 구성

### `/login`

소셜 버튼 순서 (위→아래):

1. Google로 계속하기
2. 카카오 (`KakaoAuthButton`)
3. **네이버로 계속하기** (`NaverAuthButton`, 기본 라벨)
4. 구분선 「또는 이메일」
5. 이메일 로그인 폼

설명 문구: `이메일 · Google · 카카오 · 네이버로 시작`

### `/signup`

1. Google로 계속하기
2. 카카오로 시작하기
3. **네이버로 시작하기** (`label="네이버로 시작하기"`)

### 네이버 버튼 스타일 (`NaverAuthButton`)

- 배경: `#03C75A` (네이버 그린)
- 텍스트: 흰색, `rounded-xl`, full width
- 아이콘: 흰색 **N** 문자
- props: `disabled`, `returnTo`, `onError`, `label`, `className`

---

## 6. 로컬 테스트

```bash
npm run dev
# http://localhost:3000/login
```

로컬 Callback (네이버 콘솔에 추가):

```
http://localhost:3000/auth/naver/callback
```

---

## 7. Vercel 배포 체크리스트

- [ ] `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 등록
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` 등록 (한 줄 JSON)
- [ ] 네이버 Callback: `www` / non-`www` 둘 다
- [ ] 배포 후 `https://www.tamjung.me/login` 에서 네이버 로그인 테스트

---

## 8. 자주 나는 오류

| 증상 | 원인 |
|------|------|
| 서비스 설정 오류 (100) | Callback URL 불일치 (`www` 누락 등) |
| `NAVER_CLIENT_ID가 서버 환경변수에 없습니다` | Vercel env 미설정 |
| `FIREBASE_SERVICE_ACCOUNT_JSON이 필요합니다` | Admin SDK 키 없음 |
| 카카오 지도 `appkey=undefined` | `.env` 줄바꿈 깨짐 — `# Firebase` 와 `NEXT_PUBLIC_KAKAO_*` 가 한 줄에 붙지 않았는지 확인 |

---

## 9. Flutter 앱(yongcar)과의 관계

앱은 별도 작업. 웹 API 엔드포인트:

```
POST https://www.tamjung.me/api/auth/naver
Body: { "access_token": "..." }
Response: { "customToken": "..." }
```

웹(Next) 작업 범위는 위 Vercel env + 로그인/회원가입 UI + API route 까지.
