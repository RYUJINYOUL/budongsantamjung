import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// ── 숫자(원) → 한국식 금액 문자열 변환 ──────────────────────────────
function formatKRW(won: number): string {
    if (!won || isNaN(won)) return '정보 없음';
    const eok = Math.floor(won / 100_000_000);
    const man = Math.round((won % 100_000_000) / 10_000);
    if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
    if (eok > 0) return `${eok}억`;
    if (man > 0) return `${man.toLocaleString()}만원`;
    return `${won.toLocaleString()}원`;
}

// ── 점수 → 등급 라벨 ──────────────────────────────────────────────
function scoreToGrade(score: number): string {
    if (score >= 80) return '우수';
    if (score >= 60) return '양호';
    if (score >= 40) return '보통';
    return '재검토 필요';
}

// ── 점수 → 색상 ───────────────────────────────────────────────────
function scoreToColor(score: number): string {
    if (score >= 80) return '#0F6E56';
    if (score >= 60) return '#185FA5';
    if (score >= 40) return '#B45309';
    return '#A32D2D';
}

// ── 카테고리 한글화 ───────────────────────────────────────────────
function categoryLabel(cat: string): string {
    const map: Record<string, string> = {
        apartment: '아파트',
        land: '토지',
        building: '건물',
        store: '상가',
        house: '주택',
    };
    return map[cat] || 'AI 분석';
}

// ── 투자 등급 한글화 ──────────────────────────────────────────────
function investGradeLabel(grade: string | null | undefined): string | null {
    if (!grade) return null;
    const map: Record<string, string> = {
        'A+': '최우선 매수', A: '적극 매수',
        'B+': '조건부 매수', B: '보류 검토',
        C: '매수 보류', D: '매수 기피',
    };
    return map[grade] ?? grade;
}

async function fetchReportData(id: string): Promise<any> {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';
    const url = `${backendUrl}/api/land/detective/report/${id}`;
    try {
        const res = await fetch(url, {
            next: { revalidate: 3600 },
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    // ── Noto Sans KR 폰트 로드 (한글 깨짐 방지) ─────────────────────
    let fontRegular: ArrayBuffer | null = null;
    let fontBold: ArrayBuffer | null = null;
    try {
        [fontRegular, fontBold] = await Promise.all([
            fetch(
                'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.0.woff'
            ).then((r) => r.arrayBuffer()),
            fetch(
                'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.7.woff'
            ).then((r) => r.arrayBuffer()),
        ]);
    } catch {
        // 폰트 로드 실패 시 시스템 폰트로 fallback
    }

    const fontConfig = [
        ...(fontRegular ? [{ name: 'NotoSansKR', data: fontRegular, weight: 400 as const }] : []),
        ...(fontBold ? [{ name: 'NotoSansKR', data: fontBold, weight: 700 as const }] : []),
    ];
    const fontFamily = fontConfig.length > 0 ? 'NotoSansKR, sans-serif' : 'sans-serif';

    // ── 데이터 fetch ─────────────────────────────────────────────────
    const data = await fetchReportData(id);

    // ── 기본 이미지 (데이터 없음) ─────────────────────────────────────
    if (!data) {
        return new ImageResponse(
            (
                <div
                    style={{
                        width: '1200px', height: '630px',
                        background: 'linear-gradient(135deg, #0a0a14 0%, #111827 100%)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        fontFamily,
                    }}
                >
                    <div style={{ fontSize: '48px', fontWeight: 700, color: '#ffffff', display: 'flex' }}>
                        부동산탐정
                    </div>
                    <div style={{ fontSize: '22px', color: '#6b7280', marginTop: '16px', display: 'flex' }}>
                        AI 기반 부동산 리스크 분석
                    </div>
                </div>
            ),
            { width: 1200, height: 630, fonts: fontConfig }
        );
    }

    // ── 실제 API 필드 추출 ────────────────────────────────────────────
    const rawData = data.rawData || {};
    const userSubmitted = rawData.userSubmittedData || {};
    const complexInfo = rawData.targetComplexInfo || {};
    const report = data.report || {};

    // AI 분석 JSON 파싱
    let parsedAi: Record<string, any> = {};
    try {
        const raw = data.analysis?.recommendations ||
            (typeof data.analysis === 'string' ? data.analysis : null);
        if (raw) parsedAi = JSON.parse(raw);
    } catch { /* ignore */ }

    const analysisMetadata = report.analysisMetadata || parsedAi.analysisMetadata || {};

    // 핵심 값 추출
    const address: string =
        userSubmitted.address || complexInfo.address || report.address || '주소 정보 없음';

    // 주소에서 구+동 추출 (예: "서울특별시 마포구 월드컵북로..." → "마포구")
    const addressShort = (() => {
        const m = address.match(/([가-힣]+구)\s+([가-힣]+동)/);
        return m ? `${m[1]} ${m[2]}` : address.slice(0, 20);
    })();

    const complexName: string = complexInfo.name || parsedAi.propertyTitle || report.address || '매물';
    const area: number | null = userSubmitted.area || null;
    const floor: number | null = userSubmitted.floor || null;
    const transactionType: string = userSubmitted.transactionType || '매매';
    const category: string = rawData.category || report.category || 'apartment';

    const priceWon: number | null = userSubmitted.price || null;
    const estimatedPriceWon: number | null =
        analysisMetadata.estimatedTotalPrice ||
        analysisMetadata.weightedTotalPrice ||
        null;

    const priceStr = priceWon ? formatKRW(priceWon) : '정보 없음';
    const estimatedStr = estimatedPriceWon ? formatKRW(estimatedPriceWon) : null;

    // 종합 점수
    const compRisk = parsedAi['1_comprehensiveRisk'] || {};
    const score: number =
        compRisk.totalScore ??
        report.propertyGrade?.riskScore ??
        0;

    // 투자 등급
    const finalVerdict = parsedAi['8_finalVerdict'] || {};
    const investGrade: string | null =
        typeof finalVerdict === 'string' ? null : finalVerdict.investmentGrade || null;
    const gradeLabelRaw = investGradeLabel(investGrade);
    const gradeLabel = gradeLabelRaw || scoreToGrade(score);

    // 가격 차이 %
    const priceGapPct: number | null = analysisMetadata.priceGapPercent ?? null;
    const isOverpriced = priceGapPct !== null && priceWon !== null && estimatedPriceWon !== null
        ? priceWon > estimatedPriceWon
        : null;

    const scoreColor = scoreToColor(score);
    const catLabel = categoryLabel(category);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '1200px', height: '630px',
                    background: '#ffffff',
                    display: 'flex', flexDirection: 'column',
                    padding: '56px 72px 48px',
                    fontFamily,
                    position: 'relative',
                }}
            >
                {/* 좌측 강조 바 */}
                <div
                    style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: '8px',
                        background: 'linear-gradient(180deg, #1d4ed8 0%, #7c3aed 100%)',
                    }}
                />

                {/* 상단: 브랜드 + 카테고리 뱃지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div
                        style={{
                            background: '#EFF6FF', color: '#1d4ed8',
                            fontSize: '15px', fontWeight: 700,
                            padding: '6px 18px', borderRadius: '999px',
                            display: 'flex',
                        }}
                    >
                        {catLabel} AI 분석
                    </div>
                    <div style={{ fontSize: '15px', color: '#9ca3af', display: 'flex' }}>
                        부동산탐정 · tamjung.me
                    </div>
                </div>

                {/* 주소 + 단지명 */}
                <div style={{ fontSize: '22px', color: '#6b7280', marginBottom: '8px', display: 'flex' }}>
                    {addressShort} · {transactionType}
                </div>
                <div
                    style={{
                        fontSize: '44px', fontWeight: 700, color: '#111827',
                        marginBottom: '8px', display: 'flex',
                        lineHeight: 1.15,
                    }}
                >
                    {complexName.length > 22 ? complexName.slice(0, 22) + '…' : complexName}
                </div>
                {(area || floor) && (
                    <div style={{ fontSize: '20px', color: '#9ca3af', marginBottom: '36px', display: 'flex' }}>
                        {area ? `전용 ${area}㎡` : ''}{area && floor ? ' · ' : ''}{floor ? `${floor}층` : ''}
                    </div>
                )}

                {/* 핵심 수치 카드 3개 */}
                <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                    {/* 종합 점수 */}
                    <div
                        style={{
                            flex: 1, background: '#f9fafb',
                            borderRadius: '20px', padding: '24px 28px',
                            display: 'flex', flexDirection: 'column',
                            border: '1.5px solid #e5e7eb',
                        }}
                    >
                        <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '10px', display: 'flex' }}>
                            종합 리스크 점수
                        </div>
                        <div style={{ fontSize: '46px', fontWeight: 700, color: '#111827', display: 'flex', lineHeight: 1 }}>
                            {score}
                            <span style={{ fontSize: '22px', marginLeft: '4px', marginTop: '20px', color: '#6b7280' }}>점</span>
                        </div>
                        <div
                            style={{
                                fontSize: '18px', fontWeight: 700,
                                color: scoreColor, marginTop: '8px', display: 'flex',
                            }}
                        >
                            {gradeLabel}
                            {investGrade ? ` (${investGrade})` : ''}
                        </div>
                    </div>

                    {/* 제시 매매가 */}
                    <div
                        style={{
                            flex: 1, background: '#f9fafb',
                            borderRadius: '20px', padding: '24px 28px',
                            display: 'flex', flexDirection: 'column',
                            border: '1.5px solid #e5e7eb',
                        }}
                    >
                        <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '10px', display: 'flex' }}>
                            제시 {transactionType}가
                        </div>
                        <div style={{ fontSize: '34px', fontWeight: 700, color: '#111827', display: 'flex', lineHeight: 1.2 }}>
                            {priceStr}
                        </div>
                    </div>

                    {/* AI 추정 적정가 */}
                    {estimatedStr && (
                        <div
                            style={{
                                flex: 1, background: '#f9fafb',
                                borderRadius: '20px', padding: '24px 28px',
                                display: 'flex', flexDirection: 'column',
                                border: '1.5px solid #e5e7eb',
                            }}
                        >
                            <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '10px', display: 'flex' }}>
                                AI 추정 적정가
                            </div>
                            <div
                                style={{
                                    fontSize: '34px', fontWeight: 700,
                                    color: isOverpriced ? '#dc2626' : '#059669',
                                    display: 'flex', lineHeight: 1.2,
                                }}
                            >
                                {estimatedStr}
                            </div>
                            {priceGapPct !== null && (
                                <div
                                    style={{
                                        fontSize: '14px', fontWeight: 700,
                                        color: isOverpriced ? '#dc2626' : '#059669',
                                        marginTop: '6px', display: 'flex',
                                    }}
                                >
                                    {isOverpriced ? `호가 ${priceGapPct.toFixed(1)}% 고평가` : `호가 적정 수준`}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 하단 URL */}
                <div
                    style={{
                        marginTop: '28px', fontSize: '16px', color: '#d1d5db',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1d4ed8', display: 'flex' }} />
                    tamjung.me/analyze/{id}
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
            fonts: fontConfig,
        }
    );
}
