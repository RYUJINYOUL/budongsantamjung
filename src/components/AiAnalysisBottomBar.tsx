'use client';

interface AiAnalysisBottomBarProps {
    onTriggerAnalysis: () => void;
    isCheckingAccess: boolean;
}

export default function AiAnalysisBottomBar({ onTriggerAnalysis, isCheckingAccess }: AiAnalysisBottomBarProps) {
    return (
        <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
            <div className="pointer-events-auto max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-[#0a0a0c] from-60% via-[#0a0a0c]/95 to-transparent">
                <button
                    type="button"
                    onClick={onTriggerAnalysis}
                    disabled={isCheckingAccess}
                    className="w-full h-14 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-60 text-white font-bold text-[15px] rounded-2xl shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                    {isCheckingAccess ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-white">결제 확인 중...</span>
                        </>
                    ) : (
                        <span className="text-white">계약 전 마지막 체크! 3,900원 AI 정밀 검토하기</span>
                    )}
                </button>
            </div>
        </div>
    );
}
