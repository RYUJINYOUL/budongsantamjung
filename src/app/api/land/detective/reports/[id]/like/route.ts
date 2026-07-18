import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const authHeader = request.headers.get('Authorization');
    
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const url = `${backendUrl}/api/land/detective/reports/${id}/like`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { 'Authorization': authHeader } : {})
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || '찜하기 처리에 실패했습니다.' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('찜하기 토글 API 호출 오류:', error);
        return NextResponse.json(
            { error: '서버 연결에 실패했습니다.', message: error.message },
            { status: 500 }
        );
    }
}
