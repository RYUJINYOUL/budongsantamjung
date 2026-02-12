import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 새로운 라우트 분석 요청인 경우
        if (body.company && body.images) {
            return await handleRouteAnalysis(body);
        }

        // 기존 갑질 제보 분석 요청인 경우
        return await handleReportAnalysis(body);

    } catch (error: any) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json({ error: error.message || '분석 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

// 라우트 분석 처리
async function handleRouteAnalysis(data: any) {
    const { company, startAddress, terminalAddress, jobInfo, warnings, images } = data;

    const model = genAI.getGenerativeModel(
        { model: 'gemini-2.5-flash' },
        { apiVersion: 'v1' }
    );

    // 이미지를 base64에서 순수 데이터로 추출
    const imageParts = images.map((base64Image: string) => {
        const base64Data = base64Image.split(',')[1] || base64Image;
        const mimeType = base64Image.match(/data:(image\/[^;]+);/) ?
            base64Image.match(/data:(image\/[^;]+);/)![1] : 'image/jpeg';

        return {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        };
    });

    const prompt = `
당신은 대한민국 택배 시장과 배송 라우트를 정밀 분석하는 전문 AI '용카 AI'입니다.
제공된 지도 이미지와 모든 정보를 바탕으로 아래 **4대 핵심 분석**을 수행하고 결과를 예시와 같은 JSON으로 반환해주세요.

**4대 핵심 분석 로직:**
1. **지도 이미지 및 지형 분석**: 
   - 업로드된 이미지를 픽셀 단위로 분석하여 실제 배송 예정지의 지도를 확인하세요.
   - 좁은 골목길 비율, 경사도(언덕), 아파트 단지 크기, 주차 용이성 등을 파악하여 난이도에 반영하세요.
2. **택배사별 작업 프로세스(회전 수) 반영**: 
   - 선택된 택배사(${company})의 특징을 반영하세요. (예: CJ대한통운은 보통 1회전, 쿠팡은 주/야간에 따른 다회전 등)
   - 회전 수와 분류 방식에 따른 예상 구속 시간과 피로도를 계산하세요.
3. **주소 기반 정밀 유류비 계산**: 
   - 출발 주소(${startAddress})에서 터미널(${terminalAddress}), 그리고 실제 배송 구역(지도상 분석 지역) 사이의 예왕복 거리를 추정하세요.
   - 택배용 탑차의 평균 연비와 최근 유가를 고려하여 현실적인 '일일 유류비'를 산출하세요.
4. **수익성 및 최적화 방안 산출**: 
   - 구인 정보(${jobInfo})의 단가, 물량에서 위에서 계산된 유류비, 식비, 차량 유지비를 제외하여 '실수령액'을 계산하세요.
   - 계산 근거를 바탕으로 해당 구역에서 수익을 극대화할 수 있는 작업 방안(예: 깔판 활용, 루트 최적화 등)을 제안하세요.

**출력 스타일 예시:**
택배 일자리 분석 - 씨제이
📍 마전동
택배도 연차가 있습니다. 처음부터 완벽한 라우트는 없습니다.
마전동, 초반 고생은 있어도 텃세 없는 무난한 워밍업 코스! 💪
⚠️ 워밍업 코스: 지번/원룸 숙달 훈련소
피로도: 72/100
💰 실수령액: 일 평균 약 18만원 (유류비, 식비 공제 후)
⛽ 유류비: 13,000원
🏘️ 구역 비율: 빌라 70%, 아파트 30%
⚠️ 언덕길 구간 주의. 안전 운전은 기본입니다.

**JSON 형식으로만 반환해주세요 (반드시 이 구조를 유지):**
{
  "deliveryCompany": "${company}",
  "location": {
    "name": "분석된 지역명 (예: 마전동)",
    "address": "${startAddress || ''}"
  },
  "oneLiner": "한 줄 평 (예: 처음부터 완벽한 라우트는 없습니다.)",
  "catchphrase": "강조 문구 (예: 텃세 없는 무난한 워밍업 코스! 💪)",
  "routeGrade": {
    "overall": "등급 레이블 (예: ⚠️ 워밍업 코스: 지번/원룸 숙달 훈련소)",
    "fatigueScore": "피로도 점수 (0-100)",
    "reason": "이미지 분석, 회전 수, 지형 특성을 종합한 등급 선정 사유"
  },
  "realIncome": "계산된 예상 실수령액 (예: 일 평균 약 18만원 (유류비 공제 후))",
  "fuelCost": {
    "dailyFuelCost": "계산된 예상 유류비 (예: 13,000원)",
    "details": "거리 및 연비 기준 계산 근거"
  },
  "zoneRatio": {
    "villa": 빌라백분율(숫자),
    "apartment": 아파트백분율(숫자)
  },
  "warningPoints": {
    "point1": "⚠️ 지형/난이도 관련 주의사항",
    "point2": "⚠️ 수익/단가 관련 주의사항",
    "point3": "⚠️ 장비/작업팁 관련 주의사항"
  },
  "cafeText": "위의 모든 분석 과정을 포함한 최종 상세 리포트 텍스트"
}
    `;

    const contentParts = [
        { text: prompt },
        ...imageParts
    ];

    const result = await model.generateContent(contentParts);
    const responseText = result.response.text();

    // JSON 파싱
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI 응답 파싱 실패');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Firestore에 자동 저장
    try {
        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');

        const firebaseConfig = {
            apiKey: "AIzaSyDrdm9iLABioN9GE7yRi_8M7jgYP0DSVxU",
            authDomain: "route-test-fe6fc.firebaseapp.com",
            projectId: "route-test-fe6fc",
            storageBucket: "route-test-fe6fc.firebasestorage.app",
            messagingSenderId: "790621700166",
            appId: "1:790621700166:web:4527fd2fa01d5bb1504a47"
        };

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const db = getFirestore(app);

        await addDoc(collection(db, 'analyses'), {
            ...analysis,
            createdAt: serverTimestamp(),
            source: 'web_analyze'
        });
        console.log('Analysis saved to Firestore');
    } catch (saveError) {
        console.error('Firestore save error:', saveError);
    }

    return NextResponse.json(analysis);
}

// 기존 갑질 제보 분석 처리
async function handleReportAnalysis(data: any) {
    const { url, imageUrl, text } = data;

    let contextText = text || '';

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
}
