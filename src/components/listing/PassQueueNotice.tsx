'use client';

import PassQueueBadge from './PassQueueBadge';
import { formatListingRatio, type PassQueueInfo } from '@/lib/passQueue';

export default function PassQueueNotice({
  passQueue,
  passBadge,
  passBadgeLabel,
  listingRatio,
}: {
  passQueue?: PassQueueInfo | null;
  passBadge?: PassQueueInfo['passBadge'];
  passBadgeLabel?: string | null;
  listingRatio?: number | null;
}) {
  const badge = passBadge ?? passQueue?.passBadge;
  const label = passBadgeLabel ?? passQueue?.passBadgeLabel;
  const ratio = listingRatio ?? passQueue?.listingRatio;
  const mp = passQueue?.marketProof;

  if (!badge) return null;

  const ratioLabel = formatListingRatio(ratio);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <PassQueueBadge passBadge={badge} label={label} size="md" />
        {ratioLabel && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            호가/추정 {ratioLabel}
          </span>
        )}
      </div>

      {mp?.userMessage && (
        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
          {mp.userMessage}
        </p>
      )}

      {badge === 'trade_volume_check' && (
        <p className="text-[10px] text-amber-900/90 leading-relaxed rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 font-medium">
          거래량이 적어 시스템 추천이 아닙니다. 호가·공시·활성도는 참고용이며, 심층 분석은 사용자 요청 시 진행됩니다.
        </p>
      )}

      {passQueue?.ddangyaUrl && (
        <a
          href={passQueue.ddangyaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
        >
          땅야 원본 매물 보기 →
        </a>
      )}
    </section>
  );
}
