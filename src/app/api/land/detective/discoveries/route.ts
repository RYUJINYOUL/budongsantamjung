import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const url = `${backendUrl}/api/land/detective/discovery/global`;
        console.log('발견 피드 Proxy 요청:', url);

        const authHeader = request.headers.get('Authorization');
        const response = await fetch(url, {
            cache: 'no-store',
            headers: authHeader ? { 'Authorization': authHeader } : {},
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || '발견 피드를 가져오는 데 실패했습니다.' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('발견 API 오류:', error);
        return NextResponse.json(
            { error: '서버 연결에 실패했습니다.', message: error.message },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
