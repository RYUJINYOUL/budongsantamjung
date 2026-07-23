import { buildAnalyzeReportHref, getViewingReportId } from './reportNavigation';

export type ActiveAiAnalysisStatus = 'analyzing' | 'completed' | 'failed';

export interface ActiveAiAnalysis {
    id: string;
    address: string;
    category: string;
    startedAt: number;
    currentStep?: number;
    status?: ActiveAiAnalysisStatus;
}

const STORAGE_KEY = 'active_ai_analyses';

export function readActiveAiAnalyses(): ActiveAiAnalysis[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function writeActiveAiAnalyses(list: ActiveAiAnalysis[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event('active-ai-analyses-changed'));
    } catch { /* noop */ }
}

export function registerActiveAiAnalysis(item: Omit<ActiveAiAnalysis, 'status'> & { status?: ActiveAiAnalysisStatus }) {
    const list = readActiveAiAnalyses().filter((entry) => String(entry.id) !== String(item.id));
    list.push({
        ...item,
        status: item.status ?? 'analyzing',
        currentStep: item.currentStep ?? 0,
    });
    writeActiveAiAnalyses(list);
}

export function updateActiveAiAnalysis(id: string, patch: Partial<ActiveAiAnalysis>) {
    const list = readActiveAiAnalyses();
    const idx = list.findIndex((entry) => String(entry.id) === String(id));
    if (idx < 0) return;
    list[idx] = { ...list[idx], ...patch };
    writeActiveAiAnalyses(list);
}

/** 분석 완료 시 reportId가 바뀌면(old → new) 항목 id 교체 */
export function completeActiveAiAnalysis(previousId: string, finalId?: string) {
    const list = readActiveAiAnalyses();
    const idx = list.findIndex((entry) => String(entry.id) === String(previousId));
    if (idx < 0) {
        if (finalId) {
            registerActiveAiAnalysis({
                id: String(finalId),
                address: '분석 완료',
                category: 'apartment',
                startedAt: Date.now(),
                status: 'completed',
            });
        }
        return;
    }
    const item = list[idx];
    const resolvedId = finalId ? String(finalId) : item.id;
    if (finalId && String(finalId) !== String(previousId)) {
        list.splice(idx, 1);
        list.push({ ...item, id: resolvedId, status: 'completed' });
    } else {
        list[idx] = { ...item, status: 'completed' };
    }
    writeActiveAiAnalyses(list);
}

export function failActiveAiAnalysis(id: string) {
    updateActiveAiAnalysis(id, { status: 'failed' });
}

export function dismissActiveAiAnalysis(id: string): ActiveAiAnalysis[] {
    const updated = readActiveAiAnalyses().filter((entry) => String(entry.id) !== String(id));
    writeActiveAiAnalyses(updated);
    return updated;
}

export { getViewingReportId };

export function buildAiReportHref(item: ActiveAiAnalysis): string {
    return buildAnalyzeReportHref(item.id);
}
