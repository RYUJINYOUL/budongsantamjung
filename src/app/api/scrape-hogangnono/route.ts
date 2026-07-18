import { NextRequest, NextResponse } from 'next/server';

const getHeaders = (type: string) => {
  const baseHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  };

  const specificHeaders: Record<string, Record<string, string>> = {
    naver: {
      Referer: 'https://new.land.naver.com/',
      Origin: 'https://new.land.naver.com',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
    valueup: {
      Referer: 'https://www.valueupmap.com/',
      Origin: 'https://www.valueupmap.com',
    },
    ddangya: {
      Referer: 'https://ddangya.com/',
      Origin: 'https://ddangya.com',
    },
  };

  return {
    ...baseHeaders,
    ...(specificHeaders[type] || {}),
  };
};

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries = 3,
  isHtml = false,
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 429) {
        lastError = new Error(`Rate limit (${attempt}/${maxRetries})`);
        continue;
      }

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        if (response.status >= 500 && attempt < maxRetries) continue;
        throw lastError;
      }

      if (isHtml) {
        const htmlContent = await response.text();
        return new NextResponse(htmlContent, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (attempt >= maxRetries) throw lastError;
    }
  }

  throw lastError || new Error('All retries failed');
}

export async function POST(request: NextRequest) {
  try {
    const { url, type } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });
    }

    const headers = getHeaders(type || 'hogangnono');
    const isHtml = type === 'naver-print';
    const maxRetries = ['naver', 'naver-print', 'valueup'].includes(type) ? 3 : 1;

    return await fetchWithRetry(url, headers, maxRetries, isHtml);
  } catch (error) {
    console.error('스크래핑 오류:', error);
    return NextResponse.json(
      {
        error: '데이터를 가져오는데 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
