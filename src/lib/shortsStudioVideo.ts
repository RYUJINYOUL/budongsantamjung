import { captureSceneElement } from './shortsFrameDownload';
import {
    STUDIO_BGM_FADE_OUT_SEC,
    STUDIO_BGM_PATH,
    STUDIO_VIDEO_DURATION_SEC,
    allocateStudioSlideDurations,
    buildStudioSlideTimeline,
} from './shortsStudioTiming';
import type { TenYearStudioSlideMeta } from './shortsTenYearQuarters';

export type StudioVideoProgress = {
    phase: 'capture' | 'encode' | 'audio' | 'mux' | 'done';
    message: string;
    current?: number;
    total?: number;
};

function dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1] ?? '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

let ffmpegPromise: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null;

async function loadFfmpeg(onLog?: (message: string) => void): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
    if (ffmpegPromise) return ffmpegPromise;

    ffmpegPromise = (async () => {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { toBlobURL } = await import('@ffmpeg/util');
        const ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            onLog?.(message);
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        return ffmpeg;
    })();

    return ffmpegPromise;
}

async function captureSlidePngs(
    slides: TenYearStudioSlideMeta[],
    onProgress?: (current: number, total: number) => void,
): Promise<Uint8Array[]> {
    const pngs: Uint8Array[] = [];

    for (let i = 0; i < slides.length; i += 1) {
        const slide = slides[i]!;
        onProgress?.(i + 1, slides.length);

        const el = document.querySelector(`[data-shorts-scene="${slide.sceneId}"]`) as HTMLElement | null;
        if (!el) {
            throw new Error(`씬 ${slide.sceneId} (${slide.label}) 캡처 요소를 찾을 수 없습니다.`);
        }

        const dataUrl = await captureSceneElement(el);
        pngs.push(dataUrlToBytes(dataUrl));
        await new Promise((resolve) => setTimeout(resolve, 120));
    }

    return pngs;
}

export async function buildStudioVideoMp4(
    slides: TenYearStudioSlideMeta[],
    filename: string,
    onProgress?: (progress: StudioVideoProgress) => void,
    videoTitle?: string,
): Promise<void> {
    if (!slides.length) {
        throw new Error('슬라이드가 없습니다.');
    }

    await document.fonts?.ready;
    await new Promise((resolve) => setTimeout(resolve, 200));

    const durations = allocateStudioSlideDurations(slides);
    const timeline = buildStudioSlideTimeline(slides);
    const totalSec = timeline[timeline.length - 1]?.endSec ?? STUDIO_VIDEO_DURATION_SEC;

    if (Math.abs(totalSec - STUDIO_VIDEO_DURATION_SEC) > 0.01) {
        throw new Error(`타임라인 합계(${totalSec}초)가 ${STUDIO_VIDEO_DURATION_SEC}초와 맞지 않습니다.`);
    }

    onProgress?.({ phase: 'capture', message: 'PNG 캡처 중…', current: 0, total: slides.length });
    const pngs = await captureSlidePngs(slides, (current, total) => {
        onProgress?.({ phase: 'capture', message: `PNG 캡처 ${current}/${total}`, current, total });
    });

    onProgress?.({ phase: 'encode', message: '인코더 준비 중…' });
    const ffmpeg = await loadFfmpeg();

    for (let i = 0; i < pngs.length; i += 1) {
        await ffmpeg.writeFile(`slide_${i}.png`, pngs[i]!);
    }

    const concatLines: string[] = [];
    for (let i = 0; i < pngs.length; i += 1) {
        concatLines.push(`file 'slide_${i}.png'`);
        concatLines.push(`duration ${durations[i]}`);
    }
    const lastIndex = pngs.length - 1;
    concatLines.push(`file 'slide_${lastIndex}.png'`);

    await ffmpeg.writeFile('concat.txt', concatLines.join('\n'));

    onProgress?.({ phase: 'encode', message: '영상 인코딩 중… (1/3)' });
    const fadeStart = Math.max(0, STUDIO_VIDEO_DURATION_SEC - STUDIO_BGM_FADE_OUT_SEC);
    await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-vf', 'fps=30,format=yuv420p',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-t', String(STUDIO_VIDEO_DURATION_SEC),
        'video_only.mp4',
    ]);

    onProgress?.({ phase: 'audio', message: 'BGM 자르는 중… (2/3)' });
    const { fetchFile } = await import('@ffmpeg/util');
    await ffmpeg.writeFile('bgm_full.mp3', await fetchFile(STUDIO_BGM_PATH));
    await ffmpeg.exec([
        '-i', 'bgm_full.mp3',
        '-t', String(STUDIO_VIDEO_DURATION_SEC),
        '-af', `afade=t=out:st=${fadeStart}:d=${STUDIO_BGM_FADE_OUT_SEC}`,
        '-c:a', 'aac',
        'bgm_trim.aac',
    ]);

    onProgress?.({ phase: 'mux', message: '영상·음악 합치는 중… (3/3)' });
    const muxArgs = [
        '-i', 'video_only.mp4',
        '-i', 'bgm_trim.aac',
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-t', String(STUDIO_VIDEO_DURATION_SEC),
    ];
    if (videoTitle?.trim()) {
        muxArgs.push('-metadata', `title=${videoTitle.trim()}`);
    }
    muxArgs.push('output.mp4');
    await ffmpeg.exec(muxArgs);

    const data = await ffmpeg.readFile('output.mp4');
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy], { type: 'video/mp4' });

    triggerBlobDownload(blob, filename);
    onProgress?.({ phase: 'done', message: '완료' });
}

export {
    STUDIO_BGM_PATH,
    STUDIO_VIDEO_DURATION_SEC,
    buildStudioSlideTimeline,
    formatTimelineSec,
} from './shortsStudioTiming';
