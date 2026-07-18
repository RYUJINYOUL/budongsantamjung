import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const url = `${backendUrl}/api/batch/ranking/by-category${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ success: false, message: data.message || '조회 오류' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
