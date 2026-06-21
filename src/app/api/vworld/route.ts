import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat, lng required' }, { status: 400 });
  }

  try {
    const vworldKey = process.env.NEXT_PUBLIC_VWORLD_KEY;
    
    // 요청을 보낸 호스트 도메인을 동적으로 추출 (포트 제거)
    const hostHeader = request.headers.get('host') || 'localhost';
    const domain = hostHeader.split(':')[0]; // 예: 'www.tamjung.me' 또는 'localhost'
    
    // Vworld req/data 엔드포인트를 노드 서버 단에서 호출하여 브라우저 CORS 회피
    const response = await fetch(
      `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${vworldKey}&domain=${domain}&crs=EPSG:4326&geomFilter=POINT(${lng}%20${lat})`
    );
    
    if (!response.ok) {
        const errText = await response.text();
        console.error('VWorld API fail detail:', errText);
        return NextResponse.json({ error: 'VWorld API request failed', details: errText }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('VWorld API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
