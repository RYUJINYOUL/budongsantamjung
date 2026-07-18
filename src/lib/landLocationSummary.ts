/** AnalysisClientPage 토지 입지 및 형상 분석 요약과 동일한 데이터 */

export type LandAnalysisRow = {
    label: string;
    title: string;
    desc: string;
    badge: string;
    type: 'good' | 'warning' | 'danger' | 'info';
};

export const LAND_LOCATION_DISCLAIMER =
    '* 정확한 건축 허가 가능 여부 및 상세 건축 조건은 해당 지방자치단체 조례 및 건축과 공식 유선 확인이 반드시 필요합니다.';

function formatKoreanCurrency(val: number): string {
    if (!val || val === 0) return '0';
    if (val >= 100000000) {
        const eok = Math.floor(val / 100000000);
        const rest = val % 100000000;
        if (rest >= 10000) return `${eok}억 ${Math.round(rest / 10000).toLocaleString()}만`;
        return `${eok}억`;
    }
    if (val >= 10000) return `${Math.round(val / 10000).toLocaleString()}만`;
    return Math.round(val).toLocaleString();
}

function getRoadConnectionExplanation(road: string) {
    if (!road || road === '정보없음') return null;
    const cleanConn = road.replace(/\s+/g, '');
    if (cleanConn.includes('광대로한면') || cleanConn.includes('광대한면')) {
        return { title: '광대로 한 면 접함 (대형 도로)', desc: '폭 25m 이상의 넓은 도로에 한 면이 접해 있어 차량 진출입과 통행 여건이 매우 우수하며, 대형 차량의 접근성이 뛰어납니다.', badge: '광대접면', type: 'good' as const };
    }
    if (cleanConn.includes('광대로-광대로') || cleanConn.includes('광대소각') || cleanConn.includes('광대로등')) {
        return { title: '광대로 및 소로 각지 (다면 접함)', desc: '폭 25m 이상 도로와 폭 8m 이상 도로의 모퉁이(각지)에 접해 있어 가시성과 교통 접근성이 매우 뛰어나며 우수한 토지 활용 가치를 제공합니다.', badge: '광대교차', type: 'good' as const };
    }
    if (cleanConn.includes('광대로-세로') || cleanConn.includes('광대세각')) {
        return { title: '광대로 및 세로 접함', desc: '폭 25m 이상의 대로와 폭 8m 미만의 골목 도로에 동시 접해 있습니다. 넓은 도로의 가시성과 좁은 도로의 조용함을 겸비한 위치입니다.', badge: '대로/세로', type: 'info' as const };
    }
    if (cleanConn.includes('중로한면') || cleanConn.includes('중로')) {
        return { title: '중로 한 면 접함 (중형 도로)', desc: '폭 12m~25m 미만의 도로에 한 면이 접해 있어 일반 차량의 원활한 통행과 진출입이 보장되며 양호한 주거/보행 환경을 이룹니다.', badge: '중로접면', type: 'good' as const };
    }
    if (cleanConn.includes('소로-소로') || cleanConn.includes('소로각지')) {
        return { title: '소로 각지 (이면 교차)', desc: '폭 8m~12m 미만 소형 도로 두 면 이상에 접해 있는 모퉁이 필지로, 양방향 접근이 가능하여 가시성이 양호합니다.', badge: '소로각지', type: 'good' as const };
    }
    if (cleanConn.includes('소로한면') || cleanConn.includes('소로')) {
        return { title: '소로 한 면 접함 (일반 도로)', desc: '폭 8m~12m 미만의 일반 소형 도로에 접하여, 소형 및 중형 차량의 양방향 통행 및 진출입이 수월합니다.', badge: '소로접면', type: 'info' as const };
    }
    if (cleanConn.includes('세로한면(가)') || cleanConn.includes('세로(가)')) {
        return { title: '세로 한 면 접함 (차량 가능 골목)', desc: '차량 통행은 가능하나 도로 폭이 8m 미만으로 다소 협소합니다. 대형 차량 진입이 어려울 수 있으며 보행자/차량 이동에 주의가 요구됩니다.', badge: '차량가능 골목', type: 'warning' as const };
    }
    if (cleanConn.includes('세로-세로(가)') || cleanConn.includes('세각(가)')) {
        return { title: '세각(가) (좁은 도로 각지)', desc: '폭 8m 미만의 좁은 골목길 도로 두 면 이상에 접해 있습니다. 골목길 차량 통행은 가능하나 폭이 협소하므로 통행 시 주의가 요구됩니다.', badge: '골목 각지', type: 'warning' as const };
    }
    if (cleanConn.includes('세로한면(불)') || cleanConn.includes('세로(불)')) {
        return { title: '세로한면(불) (차량 진입 불가)', desc: '사람은 다닐 수 있으나 차량 통행이 불가능한 보행자용 좁은 골목에 접해 있습니다. 소방 차량 진입이나 차량 주차가 불가하므로 가치 판단에 주의가 필요합니다.', badge: '차량불가 골목', type: 'danger' as const };
    }
    if (cleanConn.includes('맹지')) {
        return { title: '맹지 (접면 도로 없음)', desc: '공로(公路) 또는 통행 가능한 도로와 접해 있지 않는 필지입니다. 건축 인허가 시 인접 토지 소유주의 사용 승낙(진입로 확보) 등이 반드시 수반되어야 합니다.', badge: '맹지', type: 'danger' as const };
    }
    return null;
}

function getTopographyExplanation(topo: string) {
    if (!topo || topo === '정보없음') return null;
    const clean = topo.replace(/\s+/g, '');
    if (clean.includes('평지')) return { title: '평지 (평탄한 지세)', desc: '간선도로나 주변 지형과 높이가 비슷한 토지로, 건축 공사 시 성토나 절토 등의 추가 토목 공사 비용이 적게 들어 대단히 경제적입니다.', badge: '평지', type: 'good' as const };
    if (clean.includes('완경사')) return { title: '완경사 (경사 15° 이하)', desc: '주변 지형보다 높고 경사도가 15도 이하인 토지입니다. 자연 배수가 원활하고 조망 확보에 유리하며, 적절한 토목 설계를 통해 훌륭한 건축이 가능합니다.', badge: '완경사', type: 'info' as const };
    if (clean.includes('급경사')) return { title: '급경사 (경사 15° 초과)', desc: '주변 지형보다 높고 경사도가 15도를 초과하는 토지입니다. 개발 행위 허가 및 옹벽 설치 등 추가 토목 공사 비용 부담이 비교적 크게 발생할 수 있습니다.', badge: '급경사', type: 'danger' as const };
    if (clean.includes('고단')) return { title: '고단 (지대 높음)', desc: '주변 필지보다 지대가 높은 토지입니다. 일조권과 조망이 우수하지만 진출입로 확보 및 경사면(법면) 처리에 따른 토목 비용이 수반될 수 있습니다.', badge: '고단', type: 'info' as const };
    if (clean.includes('저단')) return { title: '저단 (지대 낮음)', desc: '주변보다 지대가 낮은 토지입니다. 강우 시 배수 대책이 필요할 수 있으며 성토 작업이나 배수 시설 구축 등 기초 보완을 검토해야 합니다.', badge: '저단', type: 'warning' as const };
    if (clean.includes('혼합')) return { title: '혼합 지세', desc: '한 필지 내에 평지와 완경사 등 여러 높낮이가 복합적으로 섞여 있는 지세입니다. 토지의 지세에 맞춘 입체적인 설계가 요구됩니다.', badge: '혼합', type: 'warning' as const };
    return null;
}

function getLandShapeExplanation(shape: string) {
    if (!shape || shape === '정보없음') return null;
    const clean = shape.replace(/\s+/g, '');
    if (clean.includes('정방형') || clean.includes('01')) return { title: '정방형 (정사각형)', desc: '가로·세로 비율이 1:1.1 내외인 정사각형 형태의 우수한 형상입니다. 건축 배치 및 토지의 데드 스페이스(로스율)가 거의 없어 가치가 높습니다.', badge: '정방형', type: 'good' as const };
    if (clean.includes('가장형') || clean.includes('02')) return { title: '가장형 (가로 직사각형)', desc: '직사각형 모양 중 넓은 면이 도로에 접하거나 향하고 있는 형태입니다. 도로변 상가나 건물의 전면 가시성을 넓게 확보하기에 가장 유리합니다.', badge: '가장형', type: 'good' as const };
    if (clean.includes('세장형') || clean.includes('03')) return { title: '세장형 (세로 직사각형)', desc: '직사각형 모양의 토지 중 좁은 면이 도로에 접하는 형태입니다. 안쪽으로 깊은 형태를 띄고 있어, 깊이감을 고려한 공간 배치 계획이 효과적입니다.', badge: '세장형', type: 'info' as const };
    if (clean.includes('사다리형') || clean.includes('04') || clean.includes('사다리')) return { title: '사다리형 (사다리꼴)', desc: '사다리꼴 형태의 토지입니다. 비정형 모서리 부분의 가치를 극대화하기 위해 조경, 주차장 또는 독특한 건축 설계 레이아웃을 추천합니다.', badge: '사다리형', type: 'info' as const };
    if (clean.includes('삼각형') || clean.includes('05')) {
        if (clean.includes('역삼각형') || clean.includes('06')) {
            return { title: '역삼각형 (뾰족면 접면)', desc: '삼각형 모양 중 뾰족한 꼭짓점 부분이 도로에 접하는 토지입니다. 도로와 접하는 전면부가 협소하여 진출입 동선 계획에 제약이 있을 수 있습니다.', badge: '역삼각형', type: 'danger' as const };
        }
        return { title: '삼각형 (삼각형 형상)', desc: '삼각형 형태의 토지입니다. 예리한 모서리 영역의 손실을 방지하고 잔여지를 주차장 또는 조경 시설로 구성하면 가치를 보존할 수 있습니다.', badge: '삼각형', type: 'warning' as const };
    }
    if (clean.includes('부정형') || clean.includes('07')) return { title: '부정형 (불규칙 형태)', desc: '모양이 매우 불규칙하여 토지의 손실율(로스율)이 높고 일반적인 건물 건축에 제약이 있으나, 창의적 설계로 보완할 수 있습니다.', badge: '부정형', type: 'warning' as const };
    if (clean.includes('자루형') || clean.includes('08') || clean.includes('자루')) return { title: '자루형 (자루 모양 토지)', desc: '메인 필지가 건물들 안쪽에 숨어 있고 좁은 입구 통로(자루)로 도로와 접한 토지입니다. 조용하고 아늑하나 도로 개방감이 다소 낮습니다.', badge: '자루형', type: 'warning' as const };
    return null;
}

function getZoningExplanation(zoning: string) {
    if (!zoning || zoning === '정보없음') return null;
    const clean = zoning.replace(/\s+/g, '');
    if (clean.includes('제1종전용주거')) return { title: '제1종 전용주거지역', desc: '단독주택 중심의 조용하고 쾌적한 고급 주택가로 개발할 수 있는 지역입니다. (아파트 건축 불가)', badge: '주거지역', type: 'info' as const };
    if (clean.includes('제2종전용주거')) return { title: '제2종 전용주거지역', desc: '공동주택(빌라·타운하우스) 중심의 쾌적한 주거 환경을 조성하기 위해 지정된 지역입니다.', badge: '주거지역', type: 'info' as const };
    if (clean.includes('제1종일반주거')) return { title: '제1종 일반주거지역', desc: '저층 주택(4층 이하) 중심의 주거지로, 다세대나 빌라 개발에 아주 적합한 용도지역입니다.', badge: '주거지역', type: 'good' as const };
    if (clean.includes('제2종일반주거')) return { title: '제2종 일반주거지역', desc: '중층 주택(보통 15층~25층 이하)을 중심으로 쾌적한 환경을 갖춘, 가장 흔하고 활용도 높은 대중적인 주거지역입니다.', badge: '주거지역', type: 'good' as const };
    if (clean.includes('제3종일반주거')) return { title: '제3종 일반주거지역', desc: '층수 제한이 없는 고층 아파트 중심의 주거 개발지로, 용적률이 높고 개발 사업성이 매우 뛰어납니다.', badge: '주거지역', type: 'good' as const };
    if (clean.includes('준주거')) return { title: '준주거지역', desc: '주거 기능과 상업 기능이 유기적으로 결합된 땅으로, 오피스텔이나 상가주택 개발에 최적의 가치를 지닙니다.', badge: '주거지역', type: 'good' as const };
    if (clean.includes('중심상업')) return { title: '중심상업지역', desc: '도심의 핵심 상권으로 용적률과 건폐율이 가장 높습니다. 고층 빌딩 및 대형 상가 개발이 가능하나, 순수 단독주택은 지을 수 없습니다.', badge: '상업지역', type: 'good' as const };
    if (clean.includes('일반상업')) return { title: '일반상업지역', desc: '일반적인 시내 상권 및 주 상권 업무지구입니다. 고부가가치의 주상복합 건물이나 상업 빌딩 건축에 매우 적합합니다.', badge: '상업지역', type: 'good' as const };
    if (clean.includes('근린상업')) return { title: '근린상업지역', desc: '주택가 인근에 밀접한 근린 생활 상권입니다. 동네 대형 상가나 병원, 학원 건물 용도로 활용하기 좋습니다.', badge: '상업지역', type: 'good' as const };
    if (clean.includes('유통상업')) return { title: '유통상업지역', desc: '도시 내 물류센터 및 대형 도매시장 전용 영토입니다. 일반 주택이나 아파트 등 주거용 건물은 절대 들어설 수 없습니다.', badge: '상업지역', type: 'warning' as const };
    if (clean.includes('전용공업')) return { title: '전용공업지역', desc: '중화학공장이나 공해 유발 공장 전용입니다. 주거용 및 생활 편의 시설은 법적으로 절대 들어설 수 없습니다.', badge: '공업지역', type: 'danger' as const };
    if (clean.includes('일반공업')) return { title: '일반공업지역', desc: '환경오염 우려가 적은 일반 공장 설립용 지역입니다. 지자체 조례에 따라 제한적인 단독주택 등의 조성이 예외적으로 허용될 수 있습니다.', badge: '공업지역', type: 'warning' as const };
    if (clean.includes('준공업')) return { title: '준공업지역', desc: '경공업을 수용하되 주거와 상업 기능까지 조화롭게 융합할 수 있습니다. 지식산업센터나 아파트 전환 투자처로 인기가 높습니다.', badge: '공업지역', type: 'good' as const };
    if (clean.includes('보전녹지')) return { title: '보전녹지지역', desc: '도시의 자연환경 보전이 최우선 목표인 땅입니다. 4층 이하의 엄격한 제한 및 개발 허가를 받아내기가 매우 까다롭습니다.', badge: '녹지지역', type: 'danger' as const };
    if (clean.includes('생산녹지')) return { title: '생산녹지지역', desc: '농업적 생산 활동을 위해 향후 개발을 일시 유보해 둔 보전 성향의 땅입니다. 4층 이하 건축 제한이 적용됩니다.', badge: '녹지지역', type: 'warning' as const };
    if (clean.includes('자연녹지')) return { title: '자연녹지지역', desc: '녹지지역 중 향후 개발 잠재력이 가장 높습니다. 제한적인 4층 이하의 소형 건축이 가능하여 투자자들의 수요가 많습니다.', badge: '녹지지역', type: 'info' as const };
    if (clean.includes('보전관리')) return { title: '보전관리지역', desc: '자연환경 보호를 목적으로 자연환경보전지역에 준하여 엄격하게 관리되는 땅으로, 개발 규제가 매우 까다롭습니다.', badge: '관리지역', type: 'danger' as const };
    if (clean.includes('생산관리')) return { title: '생산관리지역', desc: '농업적 관리를 위해 농림지역에 준하여 관리되는 토지입니다. 주로 농어업용 창고나 관련 생산 시설 위주로 허용됩니다.', badge: '관리지역', type: 'warning' as const };
    if (clean.includes('계획관리')) return { title: '계획관리지역', desc: '비도시 지역의 대장 땅! 향후 대도시 편입이 예정된 개발의 핵심지로, 빌라, 공장, 예쁜 카페 등 폭넓은 개발과 최고의 활용도를 지닙니다.', badge: '관리지역', type: 'good' as const };
    if (clean.includes('농림')) return { title: '농림지역', desc: '농업 생산성 증진과 임업 육성 전용 구역입니다. 일반인 건축은 불가하며 실제 농업인 전용 주택만 제한적으로 허용됩니다.', badge: '농림지역', type: 'danger' as const };
    if (clean.includes('자연환경보전')) return { title: '자연환경보전지역', desc: '청정 자연환경, 문화재 및 수자원 보호를 위한 법적 보존구역입니다. 일반 개발이나 건축은 사실상 전면 불가(극소수 농어민 주택 제외)합니다.', badge: '보전지역', type: 'danger' as const };
    return { title: zoning, desc: '국토의 계획 및 이용에 관한 법률에 의거해 토지의 용도와 규제를 지자체별로 세분화하여 정의한 법적 구역입니다.', badge: '용도지역', type: 'info' as const };
}

function toRow(label: string, explanation: { title: string; desc: string; badge: string; type: LandAnalysisRow['type'] } | null): LandAnalysisRow | null {
    if (!explanation) return null;
    return { label, ...explanation };
}

export function buildLandLocationRows(mergedData: Record<string, unknown>): LandAnalysisRow[] {
    const parcel = (mergedData?.vitals as { land?: { characteristics?: Record<string, unknown> } })?.land?.characteristics || {};
    const officialLandPriceRaw =
        (mergedData?.officialLandPrice as unknown[]) ||
        ((mergedData?.vitals as { officialLandPrice?: unknown[] })?.officialLandPrice) ||
        [];
    const officialLandPrice = [...officialLandPriceRaw]
        .filter((d: unknown) => (d as { year?: unknown })?.year)
        .sort((a: unknown, b: unknown) => String((a as { year?: unknown }).year).localeCompare(String((b as { year?: unknown }).year)));

    const pricePerM2 = (() => {
        const raw =
            parcel.pnuPrice ||
            parcel.latestOfficialPrice ||
            (officialLandPrice.length > 0 ? (officialLandPrice[officialLandPrice.length - 1] as { price?: unknown }).price : 0);
        if (!raw) return 0;
        return typeof raw === 'string' ? parseInt(String(raw).replace(/,/g, ''), 10) : Number(raw);
    })();
    const areaVal = Number(parcel.area || mergedData?.area || 0);
    const pyeongVal = areaVal * 0.3025;

    let totalLandPriceExplanation: LandAnalysisRow | null = null;
    if (pricePerM2 > 0 && pyeongVal > 0) {
        const totalPrice = pricePerM2 * 3.3 * pyeongVal;
        const pricePerPyeong = pricePerM2 * 3.3;
        totalLandPriceExplanation = {
            label: '공시지가 총액',
            title: `공시지가 총액 ${formatKoreanCurrency(totalPrice)}원`,
            desc: `평당 약 ${formatKoreanCurrency(pricePerPyeong)}원 * 토지 면적 ${pyeongVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}평 기준으로 계산한 총 공시지가 가치입니다.`,
            badge: '공시지가 총액',
            type: 'good',
        };
    }

    const rows = [
        totalLandPriceExplanation,
        toRow('용도지역', getZoningExplanation(String(parcel.zoning || ''))),
        toRow('도로접면', getRoadConnectionExplanation(String(parcel.roadConnection || ''))),
        toRow('지형지세', getTopographyExplanation(String(parcel.topography || ''))),
        toRow('토지형상', getLandShapeExplanation(String(parcel.landShape || ''))),
    ].filter((r): r is LandAnalysisRow => r !== null);

    return rows;
}

export function landBadgeColors(type: LandAnalysisRow['type']) {
    if (type === 'good') return { text: '#34d399', border: '#34d39955', bg: '#34d39918' };
    if (type === 'warning' || type === 'danger') return { text: '#fcd34d', border: '#fcd34d55', bg: '#fcd34d18' };
    return { text: '#38bdf8', border: '#38bdf855', bg: '#38bdf818' };
}
