import { Schema, SchemaType } from '@google/generative-ai';

export const apartmentSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    propertyTitle: {
      type: SchemaType.STRING,
      description: '매물 식별 명칭. (익명화 필수)',
    },
    locationAddress: {
      type: SchemaType.STRING,
      description: '매물의 주소. 반드시 지번 주소 형태로만 출력.',
    },
    apartmentName: {
      type: SchemaType.STRING,
      description: '실제 아파트 단지명',
      nullable: true,
    },
    salePrice: {
      type: SchemaType.NUMBER,
      description: '현재 호가 (만원 단위 숫자)',
      nullable: true,
    },
    aptLowPrice: { type: SchemaType.NUMBER, description: '저층 실거래가 (만원)', nullable: true },
    aptMidPrice: { type: SchemaType.NUMBER, description: '중간층 실거래가 (만원)', nullable: true },
    aptHighPrice: { type: SchemaType.NUMBER, description: '고층 실거래가 (만원)', nullable: true },
    aptArea: { type: SchemaType.NUMBER, description: '평수', nullable: true },
    area: { type: SchemaType.NUMBER, description: '면적 (㎡)', nullable: true },
    population: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING },
        reason: { type: SchemaType.STRING },
      },
      required: ['status', 'reason'],
    },
    income: {
      type: SchemaType.OBJECT,
      properties: {
        level: { type: SchemaType.STRING },
        reason: { type: SchemaType.STRING },
      },
      required: ['level', 'reason'],
    },
    propertySpecs: { type: SchemaType.STRING },
    sellerDescription: { type: SchemaType.STRING },
    suspiciousKeywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ['suspiciousKeywords', 'propertySpecs', 'sellerDescription', 'population', 'income'],
};

export const getApartmentPrompt = (text: string) => `
당신은 아파트 매매 데이터를 정밀하게 추출하는 데이터 정제 AI입니다.
[필수 규칙]
1. 모든 금액은 만원 단위 숫자로 변환하세요.
2. propertyTitle은 지역+아파트 형태로 익명화하세요.

[원문 데이터]
${text}
`;
