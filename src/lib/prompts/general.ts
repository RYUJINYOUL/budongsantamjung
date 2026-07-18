import { Schema, SchemaType } from '@google/generative-ai';

export const generalSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    propertyTitle: {
      type: SchemaType.STRING,
      description: '매물 식별 명칭. (익명화 필수. 상호명/지번 제외)',
    },
    locationAddress: {
      type: SchemaType.STRING,
      description:
        '매물의 주소. 반드시 지번 주소 형태(예: 서울특별시 종로구 관훈동 84-18)로만 출력.',
    },
    salePrice: {
      type: SchemaType.NUMBER,
      description: '매매가 (만원 단위 숫자)',
      nullable: true,
    },
    premium: {
      type: SchemaType.NUMBER,
      description: '권리금/시설비 (만원 단위 숫자)',
      nullable: true,
    },
    area: { type: SchemaType.NUMBER, description: '면적 (제곱미터 ㎡ 단위)', nullable: true },
    propertySpecs: {
      type: SchemaType.STRING,
      description: '층수, 용도, 주차 등 하드웨어 스펙 요약',
    },
    sellerDescription: {
      type: SchemaType.STRING,
      description: '매도자 상세 설명 및 인프라 요약',
    },
    suspiciousKeywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: '의심/강조 키워드',
    },
  },
  required: ['suspiciousKeywords', 'propertySpecs', 'sellerDescription'],
};

export const getGeneralPrompt = (category: string, text: string) => `
당신은 부동산 광고 텍스트에서 데이터를 정확하게 추출하는 데이터 정제 AI입니다. 모든 부동산은 '매매' 물건임을 전제로 합니다.
선택된 카테고리: [${category}]

[필수 규칙]
1. 수치 규격화: 모든 금액 관련 데이터는 반드시 '만 원' 단위의 숫자(Number)로 변환하세요.
2. 면적 규격화: 평수로 기재된 경우 3.3을 곱하여 ㎡ 단위의 숫자(Number)로 변환하세요.
3. locationAddress는 지번 주소 형태로만 출력하세요.

[원문 데이터]
${text}
`;
