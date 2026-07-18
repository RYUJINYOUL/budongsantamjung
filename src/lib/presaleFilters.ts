export const PRESALE_AREA_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'under33', label: '~33㎡' },
  { id: '33to66', label: '33~66㎡' },
  { id: '66to99', label: '66~99㎡' },
  { id: '99to132', label: '99~132㎡' },
  { id: '132to165', label: '132~165㎡' },
  { id: 'over165', label: '165㎡~' },
] as const;

export const PRESALE_PRICE_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'under5', label: '~5억' },
  { id: '5to10', label: '5~10억' },
  { id: '10to15', label: '10~15억' },
  { id: 'over15', label: '15억~' },
] as const;

export type PresaleAreaFilter = (typeof PRESALE_AREA_FILTERS)[number]['id'];
export type PresalePriceFilter = (typeof PRESALE_PRICE_FILTERS)[number]['id'];
