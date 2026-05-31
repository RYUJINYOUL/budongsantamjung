export type GeoPoint = { lat: number; lng: number };

export class GeolocationError extends Error {
  code: 'unsupported' | 'denied' | 'unavailable' | 'timeout';

  constructor(message: string, code: GeolocationError['code']) {
    super(message);
    this.name = 'GeolocationError';
    this.code = code;
  }
}

/** 브라우저 Geolocation API로 현재 좌표 조회 */
export function getCurrentPosition(options?: PositionOptions): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new GeolocationError('이 브라우저는 위치 서비스를 지원하지 않습니다.', 'unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeolocationError('위치 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.', 'denied'));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeolocationError('위치 요청 시간이 초과되었습니다.', 'timeout'));
        } else {
          reject(new GeolocationError('현재 위치를 가져올 수 없습니다.', 'unavailable'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
        ...options,
      },
    );
  });
}

/** 카카오 Geocoder coord2Address — 도로명 우선, 없으면 지번 */
export function reverseGeocodeKakao(lat: number, lng: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const kakao = typeof window !== 'undefined' ? (window as any).kakao : null;
    if (!kakao?.maps?.services) {
      reject(new Error('카카오 지도가 준비되지 않았습니다.'));
      return;
    }

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && result?.[0]) {
        const addr =
          result[0].road_address?.address_name ||
          result[0].address?.address_name ||
          '';
        if (addr) resolve(addr);
        else reject(new Error('주소를 찾을 수 없습니다.'));
      } else {
        reject(new Error('주소를 찾을 수 없습니다.'));
      }
    });
  });
}
