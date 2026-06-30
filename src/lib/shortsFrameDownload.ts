import { toPng } from 'html-to-image';

export {
    SHORTS_WIDTH,
    SHORTS_HEIGHT,
    SHORTS_BG,
} from './shortsSceneData';

import { SHORTS_WIDTH, SHORTS_HEIGHT, SHORTS_BG } from './shortsSceneData';

const SCENE_COUNT = 7;

export type ShortsSceneMeta = {
    id: number;
    label: string;
    filename: string;
};

export function getShortsSceneMeta(isApartment: boolean, analyzeId?: string | number): ShortsSceneMeta[] {
    const prefix = analyzeId ? `${analyzeId}_` : '';
    const list: ShortsSceneMeta[] = [
        { id: 1, label: '1. 지도', filename: `${prefix}shorts_01_map.png` },
        { id: 2, label: '2. AI 분석 결과', filename: `${prefix}shorts_02_ai_summary.png` },
    ];
    if (isApartment) {
        list.push({ id: 8, label: '2-2. 아파트 가치 분석', filename: `${prefix}shorts_02_2_valuation.png` });
    }
    list.push(
        {
            id: 3,
            label: isApartment ? '3. 6개월 실거래' : '3. 토지 입지·형상',
            filename: isApartment ? `${prefix}shorts_03_pyung_trades.png` : `${prefix}shorts_03_land_summary.png`,
        },
        { id: 4, label: '4. 시장 동향', filename: `${prefix}shorts_04_market.png` },
        { id: 5, label: '5. 주택 공급', filename: `${prefix}shorts_05_housing_supply.png` },
        { id: 6, label: '6. 인구 변동', filename: `${prefix}shorts_06_population.png` },
        { id: 7, label: '7. 체크리스트', filename: `${prefix}shorts_07_must_check.png` },
    );
    return list;
}

function triggerDownload(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

/** 1080×1920 네이티브 캔버스 그대로 PNG (리사이즈·레터박스 없음) */
export async function captureSceneElement(element: HTMLElement): Promise<string> {
    const previewWrap = element.closest('[data-shorts-preview-wrap]') as HTMLElement | null;
    const prevTransform = previewWrap?.style.transform ?? '';
    if (previewWrap) previewWrap.style.transform = 'none';

    try {
        return await toPng(element, {
            pixelRatio: 1,
            width: SHORTS_WIDTH,
            height: SHORTS_HEIGHT,
            cacheBust: true,
            backgroundColor: SHORTS_BG,
            skipFonts: false,
        });
    } finally {
        if (previewWrap) previewWrap.style.transform = prevTransform;
    }
}

export async function downloadScenePng(sceneId: number, filename: string): Promise<void> {
    const el = document.querySelector(`[data-shorts-scene="${sceneId}"]`) as HTMLElement | null;
    if (!el) {
        throw new Error(`씬 ${sceneId} 요소를 찾을 수 없습니다.`);
    }
    const dataUrl = await captureSceneElement(el);
    triggerDownload(dataUrl, filename);
}

export async function downloadAllScenePngs(
    scenes: ShortsSceneMeta[],
    onProgress?: (current: number, total: number, label: string) => void,
): Promise<{ ok: number; failed: number }> {
    let ok = 0;
    let failed = 0;

    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        onProgress?.(i + 1, scenes.length, scene.label);
        try {
            await downloadScenePng(scene.id, scene.filename);
            ok += 1;
            await new Promise((r) => setTimeout(r, 450));
        } catch (err) {
            console.error(`[ShortsDownload] scene ${scene.id} failed:`, err);
            failed += 1;
        }
    }

    return { ok, failed };
}

export { SCENE_COUNT };
