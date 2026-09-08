'use client';

import PassQueueBadge from './PassQueueBadge';
import { PASS_BADGE, type PassBadge } from '@/lib/passQueue';

export default function PassQueueAnalyzeConsentModal({
  open,
  passBadge,
  passBadgeLabel,
  address,
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  passBadge?: PassBadge | null;
  passBadgeLabel?: string | null;
  address?: string | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const isTradeVolumeCheck = passBadge === PASS_BADGE.TRADE_VOLUME_CHECK;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <p className="text-lg font-extrabold text-slate-900">심층 분석 요청</p>
          {passBadge && passBadgeLabel && (
            <PassQueueBadge passBadge={passBadge} label={passBadgeLabel} size="md" />
          )}
        </div>

        {address && (
          <p className="text-xs text-slate-500 font-semibold mb-3 truncate">{address}</p>
        )}

        <div className="text-sm text-slate-600 leading-relaxed space-y-3 mb-6">
          {isTradeVolumeCheck ? (
            <>
              <p>
                이 매물은 <strong>거래량 확인 필</strong> 상태입니다. 시스템이 저평가로 추천하지 않으며,
                분석 결과도 투자 권유가 아닙니다.
              </p>
              <p>
                AI 심층 분석을 요청하면 호재·리스크·가격 근거를 확인할 수 있습니다. 최종 매수 여부는
                직접 판단해 주세요.
              </p>
            </>
          ) : (
            <>
              <p>
                AI 심층 분석은 수 분이 걸릴 수 있습니다. 분석 결과는 참고 자료이며, 최종 투자 결정은
                사용자 본인의 책임입니다.
              </p>
              <p>
                분석 완료 후 50점 이상이면 추천 등록을 검토할 수 있습니다.
              </p>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 text-sm"
          >
            취소
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-slate-900 font-bold text-white text-sm"
          >
            {loading ? '이동 중…' : '분석 진행'}
          </button>
        </div>
      </div>
    </div>
  );
}
