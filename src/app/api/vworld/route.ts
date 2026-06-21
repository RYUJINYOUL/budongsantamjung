import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat, lng required' }, { status: 400 });
  }

  try {
    const vworldKey = process.env.NEXT_PUBLIC_VWORLD_KEY || '84FBD507-770F-3B0D-894C-7753297A9AE7';
    
    // Vworld req/data 엔드포인트를 노드 서버 단에서 호출하여 브라우저 CORS 회피
    const response = await fetch(
      `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${vworldKey}&domain=localhost&crs=EPSG:4326&geomFilter=POINT(${lng}%20${lat})`
    );
    
    if (!response.ok) {
        return NextResponse.json({ error: 'VWorld API request failed' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('VWorld API proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
