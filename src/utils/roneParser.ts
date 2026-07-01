export const getVal = (seriesData: any): string => {
  if (!seriesData) return '-';
  if (typeof seriesData === 'string' || typeof seriesData === 'number') {
    return String(seriesData);
  }
  let data = Array.isArray(seriesData) ? seriesData : seriesData.data;
  if (!data || data.length === 0) {
    if (seriesData.summary && seriesData.summary.latest !== undefined) {
      return String(seriesData.summary.latest);
    }
    return '-';
  }
  const latest = data[data.length - 1];
  if (latest && typeof latest === 'object') {
    return typeof latest.value === 'number' ? latest.value.toFixed(2) : String(latest.value || '-');
  }
  return typeof latest === 'number' ? latest.toFixed(2) : String(latest || '-');
};
