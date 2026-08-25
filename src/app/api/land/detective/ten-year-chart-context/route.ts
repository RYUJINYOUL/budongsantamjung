import { NextResponse } from 'next/server';

/**
 * GET /api/land/detective/ten-year-chart-context
 * query: sigunguCd, quarters (JSON)
 */
export async function GET(request: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const { searchParams } = new URL(request.url);
    const sigunguCd = searchParams.get('sigunguCd');
    const quarters = searchParams.get('quarters');

    if (!sigunguCd) {
      return NextResponse.json({ success: false, message: 'sigunguCd required' }, { status: 400 });
    }

    const params = new URLSearchParams({ sigunguCd });
    if (quarters) params.set('quarters', quarters);

    const response = await fetch(`${backendUrl}/api/land/detective/ten-year-chart-context?${params.toString()}`);
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return NextResponse.json(
        { success: false, message: `백엔드 응답 파싱 실패 (${response.status})`, details: text },
        { status: response.status },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
