'use client';

import { passBadgeStyle, type PassBadge } from '@/lib/passQueue';

export default function PassQueueBadge({
  passBadge,
  label,
  size = 'sm',
}: {
  passBadge?: PassBadge | null;
  label?: string | null;
  size?: 'sm' | 'md';
}) {
  if (!passBadge || !label) return null;
  const style = passBadgeStyle(passBadge);
  const sizeClass = size === 'md'
    ? 'text-xs px-2.5 py-1'
    : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 font-extrabold rounded-full border ${style.className} ${sizeClass}`}
    >
      {style.icon && <span aria-hidden>{style.icon}</span>}
      {label}
    </span>
  );
}
