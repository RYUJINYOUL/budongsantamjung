/** 분양 탭 지역 필터 (시·도) */
export const PRESALE_REGIONS = [
  '전국',
  '서울특별시',
  '경기도',
  '인천광역시',
  '부산광역시',
  '대구광역시',
  '대전광역시',
  '광주광역시',
  '울산광역시',
  '세종특별자치시',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
] as const;

/** 지역 칩 짧은 라벨 */
export const PRESALE_REGION_CHIP_LABEL: Record<(typeof PRESALE_REGIONS)[number], string> = {
  전국: '전국',
  서울특별시: '서울',
  경기도: '경기',
  인천광역시: '인천',
  부산광역시: '부산',
  대구광역시: '대구',
  대전광역시: '대전',
  광주광역시: '광주',
  울산광역시: '울산',
  세종특별자치시: '세종',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전북특별자치도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
};

export type PresaleRegion = (typeof PRESALE_REGIONS)[number];

export const PRESALE_TABS = [
  { id: 'private' as const, label: '민간분양' },
  { id: 'public' as const, label: 'LH 공공분양' },
  { id: 'results' as const, label: '분양결과' },
];
