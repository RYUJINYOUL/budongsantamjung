/** AnalyzePanel 공통 스타일 — emerald 팔레트 통일 */

/** 페이지 상단 sticky 헤더 (모바일 하단 여백 확보) */
export const PAGE_STICKY_HEADER =
    'px-4 lg:px-6 pt-3.5 pb-4 lg:py-3 border-b border-slate-200/50 bg-white/95 backdrop-blur-sm sticky top-0 z-50 shrink-0';

export const PAGE_HEADER_TITLE =
    'text-lg font-black tracking-tighter text-black leading-none';

/** 폼·리스트 영역 서브 헤더 (매물분석 공공데이터 수집 등) */
export const PAGE_SUBHEADER =
    'px-4 lg:px-5 py-4 border-b border-slate-100 bg-white shrink-0';

export const PAGE_SUBHEADER_TITLE =
    'text-sm font-extrabold text-slate-900 tracking-tight';

export const PANEL_SECTION_LABEL =
    'text-[11px] font-bold text-slate-700 tracking-tight';

export const PANEL_SECTION_DESC =
    'text-[10px] text-slate-400 font-medium mt-0.5';

export const PANEL_CARD =
    'rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]';

export const PANEL_CARD_INNER =
    'rounded-xl border border-slate-100 bg-slate-50/40 p-3';

export const PANEL_DIVIDER = 'border-t border-slate-100 my-4';

export const PANEL_INPUT_WRAP =
    'flex items-center bg-slate-50/80 border border-slate-200/70 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all gap-2';

export const PANEL_INPUT =
    'flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium';

export const PANEL_HINT = 'mt-1.5 text-[10px] font-bold text-emerald-600 tabular-nums';

export const PANEL_SELECT =
    'w-full bg-slate-50/80 border border-slate-200/70 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none';

export function panelChoiceBtn(selected: boolean) {
    return [
        'py-2.5 rounded-xl text-[11px] font-bold border transition-all',
        selected
            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
            : 'border-slate-200/80 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700',
    ].join(' ');
}

export function panelCategoryBtn(selected: boolean) {
    return [
        'group flex flex-col items-center justify-center min-h-[5rem] py-3 px-2 rounded-xl border transition-all gap-1.5',
        selected
            ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-500/10'
            : 'border-transparent bg-slate-50/60 hover:bg-white hover:border-slate-200',
    ].join(' ');
}

export function panelStepBadge(n: number) {
    return [
        'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold shrink-0',
        'bg-emerald-500 text-white',
    ].join(' ');
}
