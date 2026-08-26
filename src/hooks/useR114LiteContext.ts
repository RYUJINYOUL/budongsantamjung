'use client';

import { useEffect, useState } from 'react';
import { fetchR114LiteContext } from '../lib/r114LiteApi';
import type { R114LiteContextDetails, R114LiteContextResponse, R114LiteContextRow } from '../lib/r114LiteTypes';

export type R114LiteContextState = {
  hasCoords: boolean;
  loading: boolean;
  error: string | null;
  data: R114LiteContextResponse | null;
  details: R114LiteContextDetails | undefined;
  rows: R114LiteContextRow[];
  sigunguCd: string | null | undefined;
  sigunguName: string | null | undefined;
};

const IDLE: R114LiteContextState = {
  hasCoords: false,
  loading: false,
  error: null,
  data: null,
  details: undefined,
  rows: [],
  sigunguCd: null,
  sigunguName: null,
};

export function useR114LiteContext(
  r114PropId: string,
  lat: number | null | undefined,
  lng: number | null | undefined,
): R114LiteContextState {
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const [state, setState] = useState<R114LiteContextState>({ ...IDLE, hasCoords });

  useEffect(() => {
    if (!hasCoords) {
      setState({ ...IDLE, hasCoords: false });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, hasCoords: true, loading: true, error: null }));
    void fetchR114LiteContext(r114PropId)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          setState({
            hasCoords: true,
            loading: false,
            error: res.message || '지역 정보를 불러오지 못했습니다.',
            data: null,
            details: undefined,
            rows: [],
            sigunguCd: null,
            sigunguName: null,
          });
          return;
        }
        setState({
          hasCoords: true,
          loading: false,
          error: null,
          data: res,
          details: res.data?.details,
          rows: res.data?.rows ?? [],
          sigunguCd: res.data?.sigunguCd,
          sigunguName: res.data?.sigunguName,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          hasCoords: true,
          loading: false,
          error: '네트워크 오류가 발생했습니다.',
          data: null,
          details: undefined,
          rows: [],
          sigunguCd: null,
          sigunguName: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [r114PropId, hasCoords, lat, lng]);

  return state;
}
