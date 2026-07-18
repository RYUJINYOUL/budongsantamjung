import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const searchParams = request.nextUrl.search;
        const url = `${backendUrl}/api/land/detective/my-reports${searchParams}`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: authHeader ? { 'Authorization': authHeader } : {}
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || '내 분석 목록을 가져오는 데 실패했습니다.' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('내 분석 목록 API 호출 오류:', error);
        return NextResponse.json(
            { error: '서버 연결에 실패했습니다.', message: error.message },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
