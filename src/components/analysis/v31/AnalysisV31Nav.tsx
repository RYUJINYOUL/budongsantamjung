'use client';

import React from 'react';
import type { V31NavItem } from '../../../lib/analysisV31Helpers';

type Props = {
  items: V31NavItem[];
};

export default function AnalysisV31Nav({ items }: Props) {
  const [activeId, setActiveId] = React.useState(items[0]?.id || '');

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.2, 0.5] },
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  return (
    <nav className="analysis-v31-nav" aria-label="분석 섹션">
      <div className="analysis-v31-nav-inner">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`analysis-v31-nav-btn${activeId === item.id ? ' active' : ''}`}
            onClick={() => scrollTo(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
