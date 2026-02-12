import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { url, imageUrl, text } = await request.json();

        let contextText = text || '';
        let hasImage = false;

        // gemini-2.5-flash 모델과 v1 API 버전 사용
        const model = genAI.getGenerativeModel(
            { model: 'gemini-2.5-flash' },
            { apiVersion: 'v1' }
        );

        // 이미지 URL이 있는 경우 - Vision API 사용
        if (imageUrl) {
            try {
                // 파일 확장자로부터 MIME 타입 추론
                const getMimeType = (url: string): string => {
                    const ext = url.split('.').pop()?.toLowerCase();
                    const mimeMap: { [key: string]: string } = {
                        'jpg': 'image/jpeg',
                        'jpeg': 'image/jpeg',
                        'png': 'image/png',
                        'gif': 'image/gif',
                        'webp': 'image/webp',
                        'bmp': 'image/bmp'
                    };
                    return mimeMap[ext || ''] || 'image/jpeg';
                };

                // 이미지 다운로드
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                const base64Image = Buffer.from(imageBuffer).toString('base64');

                // Firebase Storage가 잘못된 Content-Type을 반환할 수 있으므로 URL에서 추론
                const mimeType = getMimeType(imageUrl);

                const prompt = `
당신은 배달 기사들의 권익을 보호하고 갑질 사례를 분석하는 '용카 AI'입니다.
아래 이미지에 담긴 내용을 정확하게 분석하여 두 가지 결과를 반환해 주세요.

1. 상세 제보 내용: 이미지에서 보이는 텍스트와 상황을 있는 그대로 상세하게 기재해 주세요. (OCR 결과 포함)
2. 용카 AI 제보 내용 정리: 상황을 배달 기사의 입장에서 핵심만 짚어서 5개에서 7개의 한 줄 문장으로 요약해 주세요.

형식은 반드시 JSON으로 반환해 주세요:
{
  "extractedText": "...",
  "yongcaSummary": "• 첫 번째 요약\\n• 두 번째 요약\\n• 세 번째 요약\\n• 네 번째 요약\\n• 다섯 번째 요약\\n• (여섯 번째 요약)\\n• (일곱 번째 요약)"
}
                `;

                const result = await model.generateContent([
                    { text: prompt },
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    }
                ]);

                const responseText = result.response.text();
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('Failed to parse AI response');
                }

                const analysis = JSON.parse(jsonMatch[0]);
                return NextResponse.json(analysis);

            } catch (err) {
                console.error('Error analyzing image:', err);
                throw new Error('이미지 분석 중 오류가 발생했습니다.');
            }
        }

        // URL이 제공된 경우 - 텍스트 추출
        if (url) {
            try {
                const response = await fetch(url);
                const html = await response.text();
                // Extracting text from HTML (very basic approach)
                contextText = html.replace(/<[^>]*>?/gm, ' ').substring(0, 15000);
            } catch (err) {
                console.error('Error fetching URL:', err);
            }
        }

        // 텍스트만 있는 경우
        const prompt = `
당신은 배달 기사들의 권익을 보호하고 갑질 사례를 분석하는 '용카 AI'입니다.
아래 제공된 텍스트를 분석하여 두 가지 결과를 반환해 주세요.

1. 상세 제보 내용: 텍스트에서 파악된 구체적인 상황과 사실 관계를 상세하게 정리해 주세요.
2. 용카 AI 제보 내용 정리: 상황을 배달 기사의 입장에서 핵심만 짚어서 5개에서 7개의 한 줄 문장으로 요약해 주세요.

입력 내용: ${contextText}

형식은 반드시 JSON으로 반환해 주세요:
{
  "extractedText": "...",
  "yongcaSummary": "• 첫 번째 요약\\n• 두 번째 요약\\n• 세 번째 요약\\n• 네 번째 요약\\n• 다섯 번째 요약\\n• (여섯 번째 요약)\\n• (일곱 번째 요약)"
}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Attempt to parse JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json({ error: error.message || '분석 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
