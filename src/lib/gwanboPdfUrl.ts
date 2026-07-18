const GWANBO_ORIGIN = 'https://www.gwanbo.go.kr';

function toGwanboHost(url: string): string {
  return url.replace(/https?:\/\/(www\.)?ggo\.go\.kr/gi, GWANBO_ORIGIN);
}

export function resolveGwanboPdfLink(item: {
  pdfUrl?: string | null;
  contentSeq?: string | null;
  title?: string | null;
}): string | null {
  const raw = toGwanboHost(String(item.pdfUrl || '').trim());

  if (raw.startsWith('http')) {
    try {
      const u = new URL(raw);
      if (u.hostname.includes('gwanbo.go.kr') && u.pathname.includes('ezpdf/')) {
        const contentId = u.searchParams.get('contentId');
        const tocId = u.searchParams.get('tocId');
        if (contentId && tocId) {
          const params = new URLSearchParams({
            contentId,
            tocId,
            isTocOrder: u.searchParams.get('isTocOrder') || 'N',
          });
          return `${GWANBO_ORIGIN}/ezpdf/customLayout.jsp?${params.toString()}`;
        }
      }
      if (u.pathname !== '/' && u.pathname !== '') return raw;
    } catch {
      /* fall through */
    }
  }

  if (raw.includes('ezpdf/')) {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${GWANBO_ORIGIN}${path}`;
  }

  const seq = String(item.contentSeq || '').trim();
  if (seq) {
    const params = new URLSearchParams({ tocId: seq, isTocOrder: 'N' });
    if (item.title) params.set('name', String(item.title).slice(0, 200));
    return `${GWANBO_ORIGIN}/ezpdf/customLayout.jsp?${params.toString()}`;
  }

  return null;
}
