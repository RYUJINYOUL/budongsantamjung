import { NextResponse } from 'next/server';

/**
 * 10년스토리 Pro 전용 생성 프록시
 * POST /api/land/detective/ten-year-story
 */
export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const body = await request.json();

        const response = await fetch(`${backendUrl}/api/land/detective/ten-year-story`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            return NextResponse.json(data, { status: response.status });
        } catch {
            return NextResponse.json(
                { error: `백엔드 응답 파싱 실패 (${response.status})`, details: text },
                { status: response.status },
            );
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: '프록시 오류', message }, { status: 500 });
    }
}
