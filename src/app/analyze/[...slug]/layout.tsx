/**
 * [id]/layout.tsx
 *
 * - loading.tsx가 page.tsx를 Suspense로 감싸기 때문에
 *   page.tsx 안의 내용은 __next_f.push(스트리밍 RSC)로 전달됨
 * - layout은 Suspense 바깥 → 여기서 SeoTextBlock을 렌더링하면
 *   초기 HTML 본문에 <h1>, <p>, <ul> 태그로 포함됨
 * - 크롤러(구글, 네이버)가 JS 없이도 분석 본문을 읽을 수 있음
 */

import SeoTextBlock from '../../../components/SeoTextBlock';

async function getReportData(id: string) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';
    const url = `${backendUrl}/api/land/detective/report/${id}`;
    try {
        const res = await fetch(url, {
            next: { revalidate: 3600 },
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export default async function AnalyzeIdLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { id: string };
}) {
    // Next.js fetch 중복 제거(deduplication) 덕분에
    // page.tsx에서 동일한 URL을 fetch해도 실제 네트워크 요청은 1회만 발생
    const data = await getReportData(params.id);

    return (
        <>
            {/* ── SEO 텍스트 블록 ──────────────────────────────────────────
                이 레이아웃은 Suspense(loading.tsx) 바깥에서 실행되므로
                초기 HTML에 실제 <h1>, <p>, <ul> 태그로 출력됨
                크롤러가 JS 없이도 분석 내용을 읽을 수 있는 핵심 블록
            ──────────────────────────────────────────────────────────── */}
            <SeoTextBlock data={data} />

            {/* 나머지 페이지 콘텐츠 (page.tsx + loading.tsx Suspense) */}
            {children}
        </>
    );
}
