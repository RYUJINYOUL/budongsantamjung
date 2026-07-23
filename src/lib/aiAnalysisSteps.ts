export interface AiAnalysisStep {
    icon: string;
    label: string;
    desc: string;
}

export const AI_ANALYSIS_STEPS: AiAnalysisStep[] = [
    { icon: '/tak/1a.png', label: '실거래가 분석', desc: '주변 동일 면적과 동일사례 실거래가를 분석합니다' },
    { icon: '/tak/2a.png', label: '입지 및 상권 분석', desc: '주변 유동인구와 배후 상권을 검토합니다' },
    { icon: '/tak/3a.png', label: '가격 거품 산정', desc: '공시지가 대비 호가의 거품률을 계산합니다' },
    { icon: '/tak/4a.png', label: '법적 리스크 교차검증', desc: '권리 관계와 행정 제약을 확인합니다' },
    { icon: '/tak/5a.png', label: '물리적 하자 탐지', desc: '시설 노후도와 수선 필요 비용을 추산합니다' },
    { icon: '/tak/6a.png', label: '네고 전략 수립', desc: '하자 근거로 협상 가능 금액을 산출합니다' },
    { icon: '/tak/7a.png', label: '계약 방어 특약 생성', desc: '리스크를 막을 필수 특약 문구를 작성합니다' },
    { icon: '/tak/8a.png', label: '최종 판독서 작성', desc: '탐정의 최종 판결을 정리합니다' },
];

/** 5초 간격 단계 진행 (모달·트래커 공용) */
export function getAiStepIndexFromElapsed(elapsedSec: number): number {
    return Math.min(AI_ANALYSIS_STEPS.length - 1, Math.floor(elapsedSec / 5));
}
