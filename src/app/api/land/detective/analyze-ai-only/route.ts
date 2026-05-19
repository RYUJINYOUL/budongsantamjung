import { NextResponse } from 'next/server';

/**
 * AI 분석 요청 프록시 (이미지 포함)
 * POST /api/land/detective/analyze-ai-only
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    const contentType = request.headers.get('Content-Type');
    
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const url = `${backendUrl}/api/land/detective/analyze-ai-only`;

        console.log(`[Proxy] Forwarding to: ${url}, Content-Type: ${contentType}`);

        // 요청 바디를 추출 (FormData파싱 실패 방지를 위해 Blob/ArrayBuffer로 취급)
        const body = await request.arrayBuffer();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...(contentType ? { 'Content-Type': contentType } : {}),
                ...(authHeader ? { 'Authorization': authHeader } : {})
            },
            body: body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Proxy] Backend error (${response.status}):`, errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                return NextResponse.json(errorData, { status: response.status });
            } catch {
                return NextResponse.json(
                    { error: `백엔드 서버 에러 (${response.status})`, details: errorText },
                    { status: response.status }
                );
            }
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Proxy] Critical error:', error);
        return NextResponse.json(
            { 
                error: '프록시 서버 내부 오류', 
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
