import { NextRequest, NextResponse } from 'next/server';

/**
 * 카카오 Static Map 프록시 — same-origin PNG (html-to-image / 쇼츠 캡처용)
 *
 * Kakao는 REST staticmap/v2 URL을 제공하지 않습니다.
 * JS SDK StaticMap이 사용하는 spi.map.kakao.com/imageservice 를 서버에서 프록시합니다.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
        return NextResponse.json({ error: 'lat, lng required' }, { status: 400 });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
        return NextResponse.json({ error: 'invalid coordinates' }, { status: 400 });
    }

    const restKey = process.env.KAKAO_REST_API_KEY || '';
    const jsKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '';

    if (!restKey) {
        return NextResponse.json({ error: 'KAKAO_REST_API_KEY not configured (coordinate conversion)' }, { status: 500 });
    }
    if (!jsKey) {
        return NextResponse.json({ error: 'NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY not configured (static map image)' }, { status: 500 });
    }

    const width = Math.min(1024, Math.max(400, parseInt(searchParams.get('w') || '960', 10) || 960));
    const height = Math.min(1024, Math.max(300, parseInt(searchParams.get('h') || '540', 10) || 540));
    const scale = searchParams.get('scale') || '3';

    try {
        const transRes = await fetch(
            `https://dapi.kakao.com/v2/local/geo/transcoord.json?x=${parsedLng}&y=${parsedLat}&input_coord=WGS84&output_coord=WCONGNAMUL`,
            {
                headers: { Authorization: `KakaoAK ${restKey}` },
                next: { revalidate: 86400 },
            },
        );

        if (!transRes.ok) {
            const text = await transRes.text().catch(() => '');
            console.error('[static-map] transcoord error:', transRes.status, text.slice(0, 200));
            return NextResponse.json({ error: 'Coordinate conversion failed' }, { status: 502 });
        }

        const transJson = await transRes.json();
        const mx = transJson?.documents?.[0]?.x;
        const my = transJson?.documents?.[0]?.y;
        if (!mx || !my) {
            console.error('[static-map] transcoord empty:', transJson);
            return NextResponse.json({ error: 'Coordinate conversion returned empty' }, { status: 502 });
        }

        const marker = `size:mid|color:0x0ea5e9|${mx},${my}`;
        const kakaoUrl =
            `https://spi.map.kakao.com/map2/map/imageservice` +
            `?IW=${width}&IH=${height}` +
            `&MX=${mx}&MY=${my}&CX=${mx}&CY=${my}` +
            `&SCALE=${encodeURIComponent(scale)}` +
            `&service=open` +
            `&markers=${encodeURIComponent(marker)}` +
            `&appkey=${jsKey}`;

        const res = await fetch(kakaoUrl, { next: { revalidate: 3600 } });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error('[static-map] imageservice error:', res.status, text.slice(0, 200));
            return NextResponse.json({ error: 'Kakao static map image failed' }, { status: 502 });
        }

        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': res.headers.get('Content-Type') || 'image/png',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (err) {
        console.error('[static-map] proxy error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
