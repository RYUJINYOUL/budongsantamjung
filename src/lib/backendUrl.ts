/** 백엔드 API origin — 로컬·프록시 공통 SSOT */
export const DEFAULT_BACKEND_URL = 'https://api.tamjung.me';

export function resolveBackendUrl(explicit?: string | null): string {
  const raw = (explicit ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim();
  if (!raw) return DEFAULT_BACKEND_URL;
  return raw.replace(/\/api\/?$/, '');
}
