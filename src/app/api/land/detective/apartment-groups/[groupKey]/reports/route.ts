import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ groupKey: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
    const authHeader = request.headers.get('Authorization');
    const { groupKey } = await context.params;

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const encodedKey = encodeURIComponent(groupKey);
        const scope = request.nextUrl.searchParams.get('scope');
        const aiCompletedOnly = request.nextUrl.searchParams.get('aiCompletedOnly');
        const params = new URLSearchParams();
        if (scope) params.set('scope', scope);
        if (aiCompletedOnly) params.set('aiCompletedOnly', aiCompletedOnly);
        const query = params.toString() ? `?${params.toString()}` : '';
        const url = `${backendUrl}/api/land/detective/apartment-groups/${encodedKey}/reports${query}`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: authHeader ? { Authorization: authHeader } : {},
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || '단지 분석 목록을 가져오는 데 실패했습니다.' },
                { status: response.status },
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('apartment-group reports API 호출 오류:', message);
        return NextResponse.json(
            { error: '서버 연결에 실패했습니다.', message },
            { status: 500 },
        );
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
