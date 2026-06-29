export interface MapMarkerProperty {
  id: string;
  address: string;
  riskScore: number;
  lat?: number;
  lng?: number;
  category?: string;
  propertyTitle?: string;
  rank?: number;
}

type CategoryKey = 'apartment' | 'land' | 'house' | 'store' | 'building' | 'gosi' | 'other';


const CATEGORY_STYLES: Record<CategoryKey, { color: string; icon: string; label: string }> = {
  apartment: { color: '#ec4899', icon: '/apart.svg', label: '아파트' },
  land: { color: '#8b5cf6', icon: '/land.svg', label: '토지' },
  house: { color: '#fcd34d', icon: '/jutack.svg', label: '주택' },
  store: { color: '#7dd3fc', icon: '/cshop.svg', label: '상가' },
  building: { color: '#10b981', icon: '/build.svg', label: '빌딩' },
  gosi: { color: '#f59e0b', icon: '/3d/gicho.svg', label: '고시(호재)' }, // 임시 아이콘
  other: { color: '#94a3b8', icon: '/land.svg', label: '기타' },
};

export function resolveCategoryKey(category?: string): CategoryKey | 'gosi' {
  const c = (category || '').toLowerCase().trim();
  if (['gosi', '고시'].some(v => c.includes(v))) return 'gosi';
  if (['apartment', '아파트'].some(v => c.includes(v))) return 'apartment';
  if (['land', '토지'].some(v => c.includes(v))) return 'land';
  if (['house', '주택', '단독', '빌라', 'villa'].some(v => c.includes(v))) return 'house';
  if (['store', '상가', '상업', 'shop', 'commercial'].some(v => c.includes(v))) return 'store';
  if (['building', '빌딩', 'office'].some(v => c.includes(v))) return 'building';
  return 'other';
}

export function getScoreColors(score: number) {
  if (score >= 70) return { bg: '#FFE566', text: '#ffffff', label: '우수' };
  if (score >= 40) return { bg: '#66DFF6', text: '#ffffff', label: '보통' };
  if (score > 0) return { bg: '#F67D90', text: '#ffffff', label: '주의' };
  return { bg: '#64748b', text: '#ffffff', label: '-' };
}

/** 점수 구간별 마커 아이콘 (1–39 / 40–69 / 70+) */
export function getScoreIcon(score: number): string | null {
  if (score <= 0) return null;
  if (score >= 70) return '/70.svg';
  if (score >= 40) return '/50.svg';
  return '/30.svg';
}

function getScoreTailColor(score: number): string {
  if (score >= 40) return '#ffca28';
  return '#e52030';
}

/** 앱 KakaoMapWidget._getMarkerSize 와 동일 */
export function getMarkerSize(zoomLevel: number): number {
  if (zoomLevel <= 3) return 52;
  if (zoomLevel <= 5) return 44;
  if (zoomLevel <= 7) return 36;
  return 30;
}

export function hasValidCoords(p: MapMarkerProperty): boolean {
  return p.lat != null && p.lng != null && !Number.isNaN(p.lat) && !Number.isNaN(p.lng);
}

export function createMarkerElement(
  property: MapMarkerProperty,
  options: { selected: boolean; zoomLevel: number; isAnalyzePin?: boolean },
): HTMLDivElement {
  const size = getMarkerSize(options.zoomLevel);
  const iconSize = Math.round(size * 0.42);
  const isPin = property.id === '__analyze_pin__' || options.isAnalyzePin;

  const root = document.createElement('div');
  root.className = 'map-property-marker';
  root.dataset.markerId = property.id;
  root.style.cssText = [
    'position:relative',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'cursor:pointer',
    'user-select:none',
    `transform: scale(${options.selected ? 1.18 : 1})`,
    'transition: transform 0.2s ease, filter 0.2s ease',
    options.selected ? 'filter: drop-shadow(0 6px 14px rgba(16,185,129,0.45))' : 'filter: drop-shadow(0 3px 8px rgba(15,23,42,0.22))',
    'z-index:' + (options.selected ? '30' : '10'),
  ].join(';');

  // 순위(Rank) 정보가 존재할 경우 숫자가 들어간 전용 원형 마커 렌더링 (대표 색상 녹색으로 통일)
  if (property.rank != null && property.rank > 0) {
    const body = document.createElement('div');
    const rankColor = '#10b981'; // 웹사이트 대표 색상 녹색

    body.style.cssText = `
      width:${size}px;height:${size}px;border-radius:50%;
      background:${rankColor};border:3px solid ${options.selected ? '#ffffff' : '#ffffff'};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${options.selected ? '0 0 0 3px rgba(16,185,129,0.55), 0 4px 10px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.15)'};
    `;
    body.innerHTML = `<span style="color:#ffffff;font-size:${Math.round(size * 0.45)}px;font-weight:900;line-height:1;font-family:sans-serif;">${property.rank}</span>`;
    root.appendChild(body);

    const tail = document.createElement('div');
    tail.style.cssText = `width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid ${rankColor};margin-top:-2px;`;
    root.appendChild(tail);

    root.title = property.propertyTitle || `${property.rank}위 매물`;

    root.addEventListener('mouseenter', () => {
      if (!options.selected) root.style.transform = 'scale(1.12)';
    });
    root.addEventListener('mouseleave', () => {
      root.style.transform = options.selected ? 'scale(1.18)' : 'scale(1)';
    });

    return root;
  }

  if (isPin) {
    const body = document.createElement('div');
    body.style.cssText = `
      width:${size}px;height:${size}px;border-radius:50%;
      background:linear-gradient(145deg,#0ea5e9,#0284c7);
      border:3px solid #fff;display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(14,165,233,0.4);
    `;
    body.innerHTML = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.5" fill="white" stroke="none"/></svg>`;
    root.appendChild(body);
    const tail = document.createElement('div');
    tail.style.cssText = 'width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid #0284c7;margin-top:-2px;';
    root.appendChild(tail);
    return root;
  }

  const catKey = resolveCategoryKey(property.category);
  const cat = CATEGORY_STYLES[catKey];
  const score = getScoreColors(property.riskScore);
  const scoreIcon = getScoreIcon(property.riskScore);

  if (property.riskScore > 0 && catKey !== 'gosi') {
    const badge = document.createElement('div');
    badge.textContent = Math.round(property.riskScore).toString();
    badge.title = `AI 평가 ${Math.round(property.riskScore)}점 · ${score.label}`;
    badge.style.cssText = `
      position:absolute;top:-6px;right:-8px;min-width:22px;height:22px;padding:0 5px;
      border-radius:999px;background:${score.bg};color:#000000;
      font-size:11px;font-weight:800;line-height:22px;text-align:center;
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.15);z-index:2;
    `;
    root.appendChild(badge);
  } else if (catKey === 'gosi') {
    // 고시 마커 특별 스타일링 (직사각형 호재 제목 표시 - 대표 색상 녹색으로 변경)
    root.style.transform = 'none';
    root.style.filter = 'none';
    const badge = document.createElement('div');
    badge.textContent = property.propertyTitle || '개발호재';
    badge.style.cssText = `
      background:rgba(255, 255, 255, 0.95);
      border:1.5px solid #10b981;
      color:#047857;
      font-size:11px;
      font-weight:800;
      padding:5px 8px;
      border-radius:6px;
      white-space:nowrap;
      box-shadow:0 3px 6px rgba(0,0,0,0.15);
      position:relative;
      top:-10px;
    `;
    const tail = document.createElement('div');
    tail.style.cssText = `
      width:0;height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      border-top:7px solid #10b981;
      position:absolute;
      bottom:-7px;
      left:50%;
      transform:translateX(-50%);
    `;
    badge.appendChild(tail);
    root.appendChild(badge);
    return root;
  }

  const body = document.createElement('div');
  const tailColor = scoreIcon ? getScoreTailColor(property.riskScore) : cat.color;

  if (scoreIcon) {
    body.style.cssText = `
      width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
      border:3px solid ${options.selected ? '#10b981' : '#fff'};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${options.selected ? '0 0 0 3px rgba(16,185,129,0.35)' : '0 2px 6px rgba(0,0,0,0.12)'};
    `;
    const img = document.createElement('img');
    img.src = scoreIcon;
    img.alt = score.label;
    img.width = size;
    img.height = size;
    img.style.cssText = 'object-fit:cover;pointer-events:none;display:block;';
    body.appendChild(img);
  } else {
    body.style.cssText = `
      width:${size}px;height:${size}px;border-radius:50%;
      background:${cat.color};border:3px solid ${options.selected ? '#10b981' : '#fff'};
      display:flex;align-items:center;justify-content:center;
      box-shadow:${options.selected ? '0 0 0 3px rgba(16,185,129,0.35)' : 'none'};
    `;
    const img = document.createElement('img');
    img.src = cat.icon;
    img.alt = cat.label;
    img.width = iconSize;
    img.height = iconSize;
    img.style.cssText = 'object-fit:contain;pointer-events:none;';
    body.appendChild(img);
  }

  root.appendChild(body);

  const tail = document.createElement('div');
  tail.style.cssText = `width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid ${tailColor};margin-top:-2px;`;
  root.appendChild(tail);

  root.title = property.propertyTitle || property.address || (scoreIcon ? `AI ${score.label}` : cat.label);

  root.addEventListener('mouseenter', () => {
    if (!options.selected) root.style.transform = 'scale(1.12)';
  });
  root.addEventListener('mouseleave', () => {
    root.style.transform = options.selected ? 'scale(1.18)' : 'scale(1)';
  });

  return root;
}

export const LEGEND_ITEMS = [
  { icon: '/70.svg', label: '우수' },
  { icon: '/50.svg', label: '보통' },
  { icon: '/30.svg', label: '주의' },
] as const;

export const CATEGORY_LEGEND = Object.entries(CATEGORY_STYLES)
  .filter(([k]) => k !== 'other')
  .map(([key, v]) => ({ key, ...v }));
