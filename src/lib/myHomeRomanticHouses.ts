/** 낭만 주택 카드 — `public/house/` 이미지 */

export type MyHomeRomanticHouseCard = {
  id: string;
  iconSrc: string;
  title: string;
  cityName: string;
  charmPhrase: string;
  imageSrc: string;
  fallbackPriceLabel?: string;
};

export const MY_HOME_ROMANTIC_HOUSE_CARDS: MyHomeRomanticHouseCard[] = [
  {
    id: 'forest',
    iconSrc: '/house/forest1.png',
    title: '숲속에서 살기',
    cityName: '강원',
    charmPhrase: '창문을 열면 숲 내음이 먼저 들어와요',
    imageSrc: '/house/forest.jpg',
    fallbackPriceLabel: '8억대',
  },
  {
    id: 'ocean',
    iconSrc: '/house/ocean1.png',
    title: '바다에서 살기',
    cityName: '부산',
    charmPhrase: '거실에서 파도 소리가 하루 종일 들려요',
    imageSrc: '/house/ocean.jpg',
    fallbackPriceLabel: '9억대',
  },
  {
    id: 'movie',
    iconSrc: '/house/movie1.png',
    title: '영화처럼 살기',
    cityName: '서울',
    charmPhrase: '노을지는 거실이 매일 장면처럼 펼쳐져요',
    imageSrc: '/house/movie.jpg',
    fallbackPriceLabel: '7억대',
  },
  {
    id: 'rental',
    iconSrc: '/house/rental1.png',
    title: '월세 받는 주택',
    cityName: '대구',
    charmPhrase: '1층 임대 수익으로 생활비 부담이 줄어요',
    imageSrc: '/house/rental.jpg',
    fallbackPriceLabel: '6억대',
  },
  {
    id: 'island',
    iconSrc: '/house/island1.png',
    title: '섬에서 살기',
    cityName: '제주',
    charmPhrase: '섬 바람과 조용한 아침이 일상이 돼요',
    imageSrc: '/house/island.jpg',
    fallbackPriceLabel: '10억대',
  },
  {
    id: 'cafe',
    iconSrc: '/house/cafe1.png',
    title: '카페 겸 주택',
    cityName: '경주',
    charmPhrase: '집과 카페가 한 공간에서 자연스럽게 이어져요',
    imageSrc: '/house/cafe.jpg',
    fallbackPriceLabel: '8억대',
  },
];

export function romanticHousePriceLabel(
  avgPrice1m: number | null | undefined,
  card: MyHomeRomanticHouseCard,
  formatPrice: (v: number | null | undefined) => string,
): string | null {
  if (avgPrice1m != null && avgPrice1m > 0) {
    const formatted = formatPrice(avgPrice1m);
    if (formatted !== '-') return formatted;
  }
  return card.fallbackPriceLabel ?? null;
}
