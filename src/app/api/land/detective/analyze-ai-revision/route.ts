import { NextResponse } from 'next/server';

/**
 * AI 재분석 요청 프록시 (이미지 포함)
 * POST /api/land/detective/analyze-ai-revision
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    const contentType = request.headers.get('Content-Type');

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const url = `${backendUrl}/api/land/detective/analyze-ai-revision`;

        const body = await request.arrayBuffer();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...(contentType ? { 'Content-Type': contentType } : {}),
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body,
        });

        if (!response.ok) {
            const errorText = await response.text();

            try {
                const errorData = JSON.parse(errorText);
                return NextResponse.json(errorData, { status: response.status });
            } catch {
                return NextResponse.json(
                    { error: `백엔드 서버 에러 (${response.status})`, details: errorText },
                    { status: response.status },
                );
            }
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: '프록시 서버 내부 오류',
                message,
                stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
            },
            { status: 500 },
        );
    }
}
