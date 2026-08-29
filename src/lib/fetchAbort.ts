/** 추천 API — 느린 DB 쿼리 대비 */
export const RECOM_FETCH_TIMEOUT_MS = 20_000;

/** 홈 타임라인·discover */
export const HOME_FEED_FETCH_TIMEOUT_MS = 25_000;

const FETCH_TIMEOUT_MESSAGE = '요청 시간이 초과되었습니다. 다시 시도해 주세요.';

export function scheduleFetchTimeout(
  abortController: AbortController,
  timeoutMs: number,
  message = FETCH_TIMEOUT_MESSAGE,
): () => void {
  const id = setTimeout(() => {
    abortController.abort(new DOMException(message, 'TimeoutError'));
  }, timeoutMs);
  return () => clearTimeout(id);
}

export function isFetchAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function isFetchTimeoutError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'TimeoutError';
}

export function fetchErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return '데이터를 불러오는데 실패했습니다';
}
