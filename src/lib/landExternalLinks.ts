export function getEumLandDetUrl(pnu: string | null | undefined): string | null {
  if (!pnu || pnu.length !== 19) return null;
  const selSido = pnu.substring(0, 2);
  const selSgg = pnu.substring(2, 5);
  const selUmd = `0${pnu.substring(5, 8)}`;
  const selRi = pnu.substring(8, 10);
  const landGbn = pnu.substring(10, 11);
  const bobn = String(Number(pnu.substring(11, 15)));
  const bubnVal = Number(pnu.substring(15, 19));
  const bubn = bubnVal === 0 ? '' : String(bubnVal);

  return `https://www.eum.go.kr/web/ar/lu/luLandDet.jsp?selGbn=umd&isNoScr=script&s_type=1&pnu=${pnu}&tobrowser=1&mode=search&landGbnExt=1&selSido=${selSido}&selSgg=${selSgg}&selUmd=${selUmd}&selRi=${selRi}&landGbn=${landGbn}&bobn=${bobn}&bubn=${bubn}&withbrowser=#none&withbrowser`;
}

export function getKakaoMapUrl(address: string, lat?: number | null, lng?: number | null): string {
  if (lat != null && lng != null) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(address)},${lat},${lng}`;
  }
  return `https://map.kakao.com/?q=${encodeURIComponent(address)}`;
}

export function getKakaoRoadviewUrl(lat: number, lng: number): string {
  return `https://map.kakao.com/link/roadview/${lat},${lng}`;
}
