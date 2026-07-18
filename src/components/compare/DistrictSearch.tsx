import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { PANEL_INPUT_WRAP, PANEL_INPUT } from '../analyzePanelFormStyles';

export interface District {
  name: string;       // 표시명: "역삼동", "분당동"
  code: string;       // 10자리 법정동코드: "1168010100"
  dongName: string;   // 동명: "역삼동"
  lat: number;
  lng: number;
}

interface Props {
  onSelect: (district: District) => void;
  selectedDistricts: District[];
}

export default function DistrictSearch({ onSelect, selectedDistricts }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchInput = (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setIsOpen(true);

    if (!(window as any).kakao?.maps?.services) {
      setSearching(false);
      return;
    }

    // 카카오 주소 검색 → 읍면동 단위까지 나옴
    const geocoder = new (window as any).kakao.maps.services.Geocoder();
    geocoder.addressSearch(q, (result: any, status: any) => {
      if (status === (window as any).kakao.maps.services.Status.OK) {
        setSearchResults(result.slice(0, 8));
        setSearching(false);
      } else {
        // 주소 검색 실패 시 키워드(장소) 검색
        const ps = new (window as any).kakao.maps.services.Places();
        ps.keywordSearch(q, (data: any, status: any) => {
          if (status === (window as any).kakao.maps.services.Status.OK) {
            setSearchResults(data.slice(0, 8));
          } else {
            setSearchResults([]);
          }
          setSearching(false);
        });
      }
    });
  };

  const handleSelectResult = (r: any) => {
    // 주소가 있는 경우 (addressSearch 결과)
    if (r.address && r.address.b_code) {
      const bCode = r.address.b_code;
      // 시군구 코드 (앞 5자리)
      const sigunguCode = bCode.substring(0, 5);
      const lat = parseFloat(r.y);
      const lng = parseFloat(r.x);

      // 시군구명 추출: 강남구, 분당구 등
      const sigunguName = r.address.region_2depth_name || r.address.region_1depth_name;
      const displayName = `${r.address.region_1depth_name} ${r.address.region_2depth_name}`.trim();

      // 이미 선택된 시군구인지 확인
      if (selectedDistricts.some(d => d.code === sigunguCode)) {
        alert('이미 선택된 지역입니다.');
        return;
      }

      onSelect({ name: displayName, code: sigunguCode, dongName: sigunguName, lat, lng });
      setQuery('');
      setIsOpen(false);
    } else if (r.address_name) {
      // 장소 검색 결과 → 주소로 다시 geocoding
      const geocoder = new (window as any).kakao.maps.services.Geocoder();
      geocoder.addressSearch(r.address_name, (res: any, status: any) => {
        if (status === (window as any).kakao.maps.services.Status.OK && res[0]?.address?.b_code) {
          const addr = res[0].address;
          const bCode = addr.b_code;
          const sigunguCode = bCode.substring(0, 5);
          const lat = parseFloat(res[0].y);
          const lng = parseFloat(res[0].x);

          const sigunguName = addr.region_2depth_name || addr.region_1depth_name;
          const displayName = `${addr.region_1depth_name} ${addr.region_2depth_name}`.trim();

          if (selectedDistricts.some(d => d.code === sigunguCode)) {
            alert('이미 선택된 지역입니다.');
            return;
          }

          onSelect({ name: displayName, code: sigunguCode, dongName: sigunguName, lat, lng });
          setQuery('');
          setIsOpen(false);
        } else {
          alert('해당 위치의 동 정보를 찾을 수 없습니다.');
        }
      });
    } else {
      alert('해당 위치의 동 정보를 찾을 수 없습니다.');
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className={PANEL_INPUT_WRAP}>
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          className={PANEL_INPUT}
          placeholder="비교할 시군구 검색"
          value={query}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
        />
        {searching ? (
          <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              setSearchResults([]);
            }}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {searchResults.length === 0 && !searching ? (
            <div className="px-3.5 py-2.5 text-xs font-bold text-slate-500 text-center">검색 결과가 없습니다.</div>
          ) : (
            searchResults.map((r, i) => {
              const name = r.place_name || r.address_name;
              const address = r.road_address_name || r.address_name;
              const sigunguLabel = r.address?.region_2depth_name || r.address?.region_1depth_name;

              return (
                <button
                  key={i}
                  type="button"
                  className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/60 border-b border-slate-50 last:border-0 transition-colors"
                  onClick={() => handleSelectResult(r)}
                >
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    {name}
                    {sigunguLabel && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100/50 font-bold">
                        시군구
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{address}</div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** 시군구+동 표시명 빌드 */
function _buildDisplayName(addr: any): string {
  const parts: string[] = [];
  if (addr.region_2depth_name) parts.push(addr.region_2depth_name); // 구
  if (addr.region_3depth_name) parts.push(addr.region_3depth_name); // 동
  return parts.join(' ') || addr.address_name || '';
}
