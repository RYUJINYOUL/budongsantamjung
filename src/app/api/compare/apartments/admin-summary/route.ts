import { NextRequest, NextResponse } from 'next/server';
import { generateCompareAdminSummary } from '../../../../../lib/verifyAdminRequest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ success: false, error: 'prompt가 필요합니다.' }, { status: 400 });
  }

  const result = await generateCompareAdminSummary(request, prompt);
  if (result.ok === false) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, text: result.text });
}
