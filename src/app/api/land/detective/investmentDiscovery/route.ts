import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const body = await request.json();
        const url = `${backendUrl}/api/land/detective/investmentDiscovery`;
        console.log('투자처 발굴 API 요청:', url, body);

        const authHeader = request.headers.get('Authorization');
        const response = await fetch(url, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(180_000), // 3분 타임아웃
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json({ error: data.error || '투자처 발굴 중 오류가 발생했습니다.' }, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('투자처 발굴 API 오류:', error);
        return NextResponse.json({ error: '서버 연결에 실패했습니다.', message: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
