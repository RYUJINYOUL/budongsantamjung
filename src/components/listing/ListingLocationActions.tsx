'use client';

import { ExternalLink, Map, ScanEye } from 'lucide-react';
import {
  getEumLandDetUrl,
  getKakaoMapUrl,
  getKakaoRoadviewUrl,
} from '@/lib/landExternalLinks';

export default function ListingLocationActions({
  address,
  lat,
  lng,
  pnu,
}: {
  address: string;
  lat: number;
  lng: number;
  pnu?: string | null;
}) {
  const roadviewUrl = getKakaoRoadviewUrl(lat, lng);
  const mapUrl = getKakaoMapUrl(address, lat, lng);
  const eumUrl = getEumLandDetUrl(pnu);

  const btnClass =
    'flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors';

  return (
    <div className="grid grid-cols-3 gap-2">
      <a
        href={roadviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
      >
        <ScanEye className="w-4 h-4 text-slate-600" />
        <span className="text-[10px] font-extrabold text-slate-700">로드뷰</span>
      </a>
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
      >
        <Map className="w-4 h-4 text-emerald-600" />
        <span className="text-[10px] font-extrabold text-slate-700">위치분석</span>
      </a>
      {eumUrl ? (
        <a
          href={eumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={btnClass}
        >
          <ExternalLink className="w-4 h-4 text-sky-600" />
          <span className="text-[10px] font-extrabold text-slate-700">토지이음</span>
        </a>
      ) : (
        <button
          type="button"
          disabled
          className={`${btnClass} opacity-50 cursor-not-allowed`}
          title="지번 확인 중"
        >
          <ExternalLink className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-extrabold text-slate-400">토지이음</span>
        </button>
      )}
    </div>
  );
}
