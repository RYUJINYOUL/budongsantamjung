import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin } from 'lucide-react';

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
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-3.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold shadow-sm transition duration-150 ease-in-out"
          placeholder="비교할 시군구 검색"
          value={query}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
        />
        {searching ? (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : query ? (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              setSearchResults([]);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        ) : null}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {searchResults.length === 0 && !searching ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">검색 결과가 없습니다.</div>
          ) : (
            searchResults.map((r, i) => {
              const name = r.place_name || r.address_name;
              const address = r.road_address_name || r.address_name;
              // 시군구 레벨 표시
              const sigunguLabel = r.address?.region_2depth_name || r.address?.region_1depth_name;

              return (
                <button
                  key={i}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors border-b border-gray-100 last:border-0"
                  onClick={() => handleSelectResult(r)}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                      {name}
                      {sigunguLabel && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded font-medium">
                          시군구
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 text-xs text-gray-500 pl-5">{address}</span>
                  </div>
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
