declare global {
  interface Window {
    kakao: any;
  }
}

/** 카카오 Maps JS SDK (services + clusterer). 페이지 간 첫 로드 URL을 통일합니다. */
export const KAKAO_MAPS_SDK_LIBRARIES = 'services,clusterer';

export function kakaoMapsSdkUrl(apiKey: string): string {
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=${KAKAO_MAPS_SDK_LIBRARIES}&autoload=false`;
}

/** 카카오 Maps JS SDK 로드. 이미 로드 중이면 동일 스크립트를 재사용합니다. */
export function loadKakaoMapsSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('브라우저 환경에서만 사용할 수 있습니다.'));
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    if (!apiKey) {
      reject(new Error('카카오 JavaScript 키가 설정되지 않았습니다.'));
      return;
    }

    const invoke = () => {
      if (!window.kakao?.maps?.services) {
        reject(new Error('카카오 지도 서비스를 불러오지 못했습니다.'));
        return;
      }
      resolve();
    };

    if (window.kakao?.maps) {
      window.kakao.maps.load(invoke);
      return;
    }

    const existing = document.getElementById('kakao-maps-sdk');
    if (existing) {
      if (window.kakao?.maps) {
        window.kakao.maps.load(invoke);
      } else {
        existing.addEventListener('load', () => window.kakao.maps.load(invoke), { once: true });
        existing.addEventListener('error', () => reject(new Error('지도 SDK 로드 실패')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-maps-sdk';
    script.src = kakaoMapsSdkUrl(apiKey);
    script.onload = () => window.kakao.maps.load(invoke);
    script.onerror = () => reject(new Error('지도 SDK 로드 실패'));
    document.head.appendChild(script);
  });
}

export function hasKakaoMarkerClusterer(): boolean {
  return typeof window !== 'undefined'
    && typeof window.kakao?.maps?.MarkerClusterer === 'function';
}
