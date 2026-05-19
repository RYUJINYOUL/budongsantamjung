import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const url = `${backendUrl}/api/land/detective/discovery/global/${params.id}`;
        console.log('발견 상세 Proxy 요청:', url);

        const authHeader = request.headers.get('Authorization');
        const response = await fetch(url, {
            cache: 'no-store',
            headers: authHeader ? { Authorization: authHeader } : {},
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json({ error: data.error || '발견 상세를 가져오는 데 실패했습니다.' }, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: '서버 연결 실패', message: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
