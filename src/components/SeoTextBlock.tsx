/**
 * SeoTextBlock — 크롤러 가독 숨김 텍스트 블록
 *
 * - 시각적으로 보이지 않지만 HTML 본문에 포함됨 (sr-only 패턴)
 * - display:none 대신 CSS clip 방식 → 구글 패널티 없음
 * - 서버 컴포넌트 (use client 없음)
 */

interface ScoreItem {
    name?: string;
    score?: number | null;
    reason?: string;
    description?: string;
    [key: string]: any;
}

interface SeoData {
    address?: string;
    propertyTitle?: string;
    score?: number | string | null;
    grade?: string;
    price?: string | number | null;
    adjustedPrice?: string | number | null;
    summary?: string;
    scoreItems?: ScoreItem[] | Record<string, any>;
    priceOpinion?: string;
    deepAnalysis?: string;
    checklist?: string[];
    detectiveNote?: string;
    category?: string;
    // 실제 API 응답 구조 지원
    report?: {
        address?: string;
        detectiveNote?: string;
        propertyGrade?: { riskScore?: number | string };
        ai_analysis_status?: string;
    };
    analysis?: {
        recommendations?: string;
    };
}

function parseAnalysisJson(rawData: SeoData): Record<string, any> {
    try {
        const rawString =
            rawData?.analysis?.recommendations ||
            (typeof rawData?.analysis === 'string' ? rawData.analysis : null);
        if (!rawString) return {};
        return JSON.parse(rawString);
    } catch {
        return {};
    }
}

function formatPrice(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return '정보 없음';
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return String(val);
    if (num >= 100000000) {
        return `${(num / 100000000).toFixed(1)}억 원`;
    }
    if (num >= 10000) {
        return `${Math.round(num / 10000)}만 원`;
    }
    return `${num.toLocaleString()}원`;
}

export default function SeoTextBlock({ data }: { data: SeoData }) {
    if (!data) return null;

    const parsed = parseAnalysisJson(data);
    const report = data.report;

    // 주소
    const address = data.address || report?.address || parsed?.propertyTitle || '매물';

    // 종합 점수 — parsed JSON에서 직접 추출 (data.score 필드가 없는 API 구조)
    const compRisk = parsed?.['1_comprehensiveRisk'] || {};
    const rawScore = compRisk?.totalScore ?? compRisk?.score ?? null;
    // score를 항상 숫자 또는 null로 정규화
    const score: number | null = rawScore !== null && rawScore !== undefined
        ? Number(rawScore)
        : null;

    // 등급/결론
    const priceReas = parsed?.['5_priceReasonableness'] || {};
    const grade = data.grade || priceReas?.conclusion || null;

    // AI 요약
    const summary =
        data.summary ||
        compRisk?.coreJudgement ||
        report?.detectiveNote ||
        null;

    // 세부 점수 아이템
    const scoreItemsRaw: ScoreItem[] = (() => {
        if (Array.isArray(data.scoreItems)) return data.scoreItems;
        const rawItems = data.scoreItems || compRisk?.scoreItems;
        if (!rawItems) return [];
        if (typeof rawItems === 'object') {
            return Object.entries(rawItems).map(([k, v]: [string, any]) => ({
                name: k,
                score: typeof v === 'object' ? v?.score : v,
                reason: typeof v === 'object' ? v?.reason : undefined,
            }));
        }
        return [];
    })();

    // 가격 타당성
    const priceOpinion =
        data.priceOpinion || priceReas?.opinion || priceReas?.conclusion || null;

    // 심층 분석
    const inDepth = parsed?.['7_inDepthReport'] || {};
    const deepAnalysisEntries = Object.entries(inDepth).filter(
        ([, v]) => v && String(v).trim()
    );

    // 체크리스트
    const checklist: string[] = data.checklist ||
        (Array.isArray(parsed?.['6_mustCheckList']) ? parsed['6_mustCheckList'] : []);

    // 최종 판정
    const finalVerdict = parsed?.['8_finalVerdict'];
    const verdictText =
        typeof finalVerdict === 'string'
            ? finalVerdict
            : finalVerdict?.verdict || finalVerdict?.reason || null;

    // 실거래가 분석
    const priceAnalysis = parsed?.['3_priceAnalysisReport'] || {};

    // 점수 텍스트 — template literal로 단일 문자열 생성 (React 배열 렌더링 방지)
    const scoreText = score !== null
        ? `종합 리스크 점수: ${score}점${grade ? ` / 등급: ${grade}` : ''}`
        : null;

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: 0,
                padding: 0,
                margin: '-1px',
            }}
        >
            <h2>{address} 부동산 AI 분석 결과 | 부동산탐정</h2>

            {scoreText && <p>{scoreText}</p>}

            {(data.price || data.adjustedPrice) && (
                <p>
                    {data.price && <>제시 매매가: {formatPrice(data.price)}</>}
                    {data.adjustedPrice && <> / 보정 적정가치: {formatPrice(data.adjustedPrice)}</>}
                </p>
            )}

            {summary && (
                <>
                    <h2>AI 요약 평가</h2>
                    <p>{summary}</p>
                </>
            )}

            {scoreItemsRaw.length > 0 && (
                <>
                    <h2>세부 리스크 평가 항목</h2>
                    <ul>
                        {scoreItemsRaw.map((item, i) => (
                            <li key={item.name || i}>
                                {item.name}
                                {item.score !== null && item.score !== undefined
                                    ? `: ${item.score}점`
                                    : ''}
                                {item.reason ? ` — ${item.reason}` : ''}
                                {item.description ? ` — ${item.description}` : ''}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {priceOpinion && (
                <>
                    <h2>가격 타당성 검증</h2>
                    <p>{priceOpinion}</p>
                </>
            )}

            {(priceAnalysis.landFiresaleSummary || priceAnalysis.comparableAnalysis || priceAnalysis.buildingTradeVolume) && (
                <>
                    <h2>실거래가 및 시세 비교</h2>
                    {priceAnalysis.landFiresaleSummary && <p>{priceAnalysis.landFiresaleSummary}</p>}
                    {priceAnalysis.comparableAnalysis && <p>{priceAnalysis.comparableAnalysis}</p>}
                    {priceAnalysis.buildingTradeVolume && <p>{priceAnalysis.buildingTradeVolume}</p>}
                </>
            )}

            {deepAnalysisEntries.length > 0 && (
                <>
                    <h2>심층 분석</h2>
                    {deepAnalysisEntries.map(([key, val]) => (
                        <p key={key}>{String(val)}</p>
                    ))}
                </>
            )}

            {checklist.length > 0 && (
                <>
                    <h2>현장 체크리스트</h2>
                    <ul>
                        {checklist.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </>
            )}

            {verdictText && (
                <>
                    <h2>최종 판정</h2>
                    <p>{verdictText}</p>
                </>
            )}
        </div>
    );
}
