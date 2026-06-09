import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apartmentSchema, getApartmentPrompt } from '../../../lib/prompts/apartment';
import { generalSchema, getGeneralPrompt } from '../../../lib/prompts/general';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const APARTMENT_CATEGORIES = new Set(['apartment', '아파트']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, text } = body;

    if (!category || !text) {
      return NextResponse.json({ error: '카테고리와 텍스트가 필요합니다.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const isApartment = APARTMENT_CATEGORIES.has(category);
    const schema = isApartment ? apartmentSchema : generalSchema;
    const prompt = isApartment ? getApartmentPrompt(text) : getGeneralPrompt(category, text);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    return NextResponse.json(JSON.parse(result.response.text()));
  } catch (error: unknown) {
    console.error('Extraction Error:', error);
    const message = error instanceof Error ? error.message : '데이터 추출 중 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
