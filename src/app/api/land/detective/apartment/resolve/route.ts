import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    const searchParams = request.nextUrl.searchParams.toString();
    const query = searchParams ? `?${searchParams}` : '';

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const url = `${backendUrl}/api/land/detective/apartment/resolve${query}`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: authHeader ? { Authorization: authHeader } : {},
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || '단지 조회에 실패했습니다.' },
                { status: response.status },
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('apartment resolve API 호출 오류:', message);
        return NextResponse.json(
            { error: '서버 연결에 실패했습니다.', message },
            { status: 500 },
        );
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
