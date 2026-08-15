'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Sparkles } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
  fetchMyHomeConfig,
  fetchMyHomeWeeklyReports,
  saveMyHomeConfig,
} from '../../lib/myHomeFirestore';
import { fetchMyHomeCompareData, resolveMyHomeReportTargetId, scoringItemAt } from '../../lib/myHomeApi';
import type { CompareScoringPayload } from '../../lib/apartmentCompareScoring';
import { momentumFromScoring } from '../../lib/myHomeCompareTable';
import type {
  MyApartmentRegistration,
  MyHomeCompareItem,
  MyHomeCompareSlot,
  MyHomeConfig,
  MyHomeWeeklyReport,
} from '../../lib/myHomeTypes';
import { MY_HOME_COMPARE_MAX } from '../../lib/myHomeTypes';
import SideNav from '../SideNav';
import { PAGE_HEADER_TITLE, PAGE_STICKY_HEADER } from '../analyzePanelFormStyles';
import MyHomeHighlightStrip from './MyHomeHighlightStrip';
import MyHomeCompareTable from './MyHomeCompareTable';
import MyHomeMapPanel, { type MyHomeMapPickMode } from './MyHomeMapPanel';
import MyHomeWorkplaceField from './MyHomeWorkplaceField';
import MyHomeReportButtons from './MyHomeReportButtons';
import MyHomeRomanticHousesGallery from './MyHomeRomanticHousesGallery';
import MyHomeViewToggleCta, { type MyHomeLeftView } from './MyHomeViewToggleCta';
import type { MyHomeWorkplace } from '../../lib/myHomeTypes';

const emptyConfig = (): MyHomeConfig => ({
  compareSlots: [],
  workplace: {},
  weeklyOptIn: true,
  updatedAtMs: Date.now(),
});

export default function MyHomeClientPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [config, setConfig] = useState<MyHomeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [compareResults, setCompareResults] = useState<MyHomeCompareItem[]>([]);
  const [compareScoring, setCompareScoring] = useState<CompareScoringPayload | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [reports, setReports] = useState<MyHomeWeeklyReport[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickMode, setPickMode] = useState<MyHomeMapPickMode>(null);
  const [leftView, setLeftView] = useState<MyHomeLeftView>('compare');

  const showMap = pickMode != null;
  /** PC(lg+)는 지도 항상 표시, 모바일은 pickMode일 때만 */
  const showMapMobile = showMap;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) router.replace('/login?redirect=/my-home');
    });
    return () => unsub();
  }, [router]);

  const loadConfig = useCallback(async (uid: string) => {
    setConfigLoading(true);
    try {
      const c = await fetchMyHomeConfig(uid);
      setConfig(c ?? emptyConfig());
      const reps = await fetchMyHomeWeeklyReports(uid, 6);
      setReports(reps);
    } catch {
      setConfig(emptyConfig());
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadConfig(user.uid);
  }, [user, loadConfig]);

  const refreshCompare = useCallback(async (c: MyHomeConfig) => {
    if (!c.registration) {
      setCompareResults([]);
      setCompareScoring(null);
      setCompareError(null);
      return;
    }
    setCompareLoading(true);
    setCompareError(null);
    try {
      const { items, scoring } = await fetchMyHomeCompareData(
        c.registration,
        c.compareSlots,
        c.workplace,
      );
      setCompareResults(items);
      setCompareScoring(scoring);
    } catch (e) {
      setCompareResults([]);
      setCompareScoring(null);
      setCompareError(e instanceof Error ? e.message : '시세를 불러오지 못했습니다.');
    } finally {
      setCompareLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!config?.registration) return;
    void refreshCompare(config);
  }, [config, refreshCompare]);

  const persistConfig = async (next: MyHomeConfig) => {
    if (!user) return;
    setSaving(true);
    const payload = { ...next, updatedAtMs: Date.now() };
    try {
      await saveMyHomeConfig(user.uid, payload);
      setConfig(payload);
      setPickMode(null);
    } finally {
      setSaving(false);
    }
  };

  const saveRegistration = async (payload: {
    masterId?: string;
    rtmsAptSeq?: string;
    r114PropId?: string;
    exclusiveAreaM2: number;
    complexName: string;
    lat?: number | null;
    lng?: number | null;
    reportId?: string | null;
  }) => {
    const reg: MyApartmentRegistration = {
      type: 'current',
      masterId: payload.masterId ?? null,
      rtmsAptSeq: payload.rtmsAptSeq ?? null,
      r114PropId: payload.r114PropId ?? null,
      exclusiveAreaM2: payload.exclusiveAreaM2,
      complexName: payload.complexName,
      lat: payload.lat,
      lng: payload.lng,
      reportId: payload.reportId ?? null,
      registeredAtMs: Date.now(),
    };
    await persistConfig({ ...(config ?? emptyConfig()), registration: reg });
  };

  const addCompareSlot = async (payload: {
    masterId?: string;
    rtmsAptSeq?: string;
    r114PropId?: string;
    exclusiveAreaM2: number;
    complexName: string;
    lat?: number | null;
    lng?: number | null;
    reportId?: string | null;
  }) => {
    const base = config ?? emptyConfig();
    if (base.compareSlots.length >= MY_HOME_COMPARE_MAX) return;
    const slot: MyHomeCompareSlot = {
      masterId: payload.masterId ?? null,
      rtmsAptSeq: payload.rtmsAptSeq ?? null,
      r114PropId: payload.r114PropId ?? null,
      exclusiveAreaM2: payload.exclusiveAreaM2,
      complexName: payload.complexName,
      lat: payload.lat,
      lng: payload.lng,
      reportId: payload.reportId ?? null,
    };
    await persistConfig({ ...base, compareSlots: [...base.compareSlots, slot] });
  };

  const removeCompareSlot = async (index: number) => {
    const base = config ?? emptyConfig();
    const next = base.compareSlots.filter((_, i) => i !== index);
    await persistConfig({ ...base, compareSlots: next });
  };

  const saveWorkplace = useCallback(async (workplace: MyHomeWorkplace) => {
    const base = config ?? emptyConfig();
    await persistConfig({ ...base, workplace });
  }, [config, user]);

  const clearRegistration = async () => {
    if (!window.confirm('우리집 등록을 해제할까요? 비교 단지도 함께 삭제됩니다.')) return;
    const base = config ?? emptyConfig();
    await persistConfig({ ...base, registration: null, compareSlots: [] });
    setCompareResults([]);
    setCompareScoring(null);
    setCompareError(null);
    setLeftView('compare');
  };

  const toggleLeftView = () => {
    setLeftView((v) => (v === 'compare' ? 'romantic' : 'compare'));
  };

  const startPickHome = () => {
    setPickMode('home');
  };

  const startPickCompare = () => {
    const base = config ?? emptyConfig();
    if (base.compareSlots.length >= MY_HOME_COMPARE_MAX) return;
    setPickMode('compare');
  };

  const clearPickMode = () => {
    setPickMode(null);
  };

  const handleMapPick = (payload: {
    masterId?: string;
    rtmsAptSeq?: string;
    r114PropId?: string;
    exclusiveAreaM2: number;
    complexName: string;
    lat?: number | null;
    lng?: number | null;
    reportId?: string | null;
  }) => {
    if (pickMode === 'home') void saveRegistration(payload);
    else if (pickMode === 'compare') void addCompareSlot(payload);
  };

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const reg = config?.registration;
  const compareSlots = config?.compareSlots ?? [];
  const workplace = config?.workplace ?? {};
  const homeMomentum = momentumFromScoring(scoringItemAt(compareScoring, 0));

  const reportTargets = reg
    ? [
        {
          label: '보고서 1',
          reportId: resolveMyHomeReportTargetId(compareResults[0]),
          complexName: reg.complexName,
          isHome: true,
        },
        ...compareSlots.map((slot, i) => ({
          label: `보고서 ${i + 2}`,
          reportId: resolveMyHomeReportTargetId(compareResults[i + 1]),
          complexName: slot.complexName,
          isHome: false,
        })),
      ]
    : [];

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative">
      <SideNav />

      <div className="relative z-10 w-full h-screen overflow-hidden lg:pl-16 flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)]">
        {/* ── 좌측: 우리집 패널 ── */}
        <div
          className={`w-full flex flex-col bg-gradient-to-b from-white to-slate-50/30 min-w-0 z-20 min-h-0 overflow-hidden lg:h-full ${
            showMapMobile ? 'max-lg:hidden' : 'flex-1 min-h-0'
          }`}
        >
          <header className={PAGE_STICKY_HEADER}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 shrink-0 lg:hidden" />
                <h1 className={PAGE_HEADER_TITLE}>우리집</h1>
              </div>
              {reg && (
                <Link
                  href="/profile?tab=my-home"
                  className="shrink-0 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                >
                  AI기록
                </Link>
              )}
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 lg:px-6 py-5 pb-10 max-lg:pb-24 space-y-4">
            {!reg && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-snug tracking-tight">
                    우리집을 FUN하게 등록하세요.
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed font-medium">
                    우리집과 희망 매물을 한눈에 비교하고,
                    <br />
                    우리집 가격으로 만나는 낭만주택 매거진.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startPickHome}
                  className="w-full py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-400/20 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  우리집 등록
                </button>
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  앱 설치 시 매주 AI 주간 리포트를 푸시로 받을 수 있어요.
                  <br />
                  웹에서는 내기록 → 우리집 탭에서 리포트를 확인합니다.
                </p>
              </section>
            )}

            {reg && (
              <>
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">우리집</p>
                  <p className="text-base font-black text-slate-900 mt-0.5">{reg.complexName}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    전용 {reg.exclusiveAreaM2.toFixed(1)}㎡
                  </p>
                </div>

                <MyHomeViewToggleCta
                  view={leftView}
                  avgPrice1m={compareResults[0]?.avgPrice1m}
                  onToggle={toggleLeftView}
                  disabled={pickMode != null}
                />

                {leftView === 'compare' ? (
                  <>
                    <MyHomeWorkplaceField
                      workplace={workplace}
                      onSave={(wp) => void saveWorkplace(wp)}
                    />

                    <MyHomeHighlightStrip
                      homeResult={compareResults[0]}
                      yoy1y={homeMomentum.yoy1y}
                      cagr3y={homeMomentum.cagr3y}
                      loading={compareLoading}
                    />

                    {compareError && (
                      <p className="text-[11px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                        {compareError}
                      </p>
                    )}

                    <MyHomeCompareTable
                      registration={reg}
                      compareSlots={compareSlots}
                      compareResults={compareResults}
                      scoring={compareScoring}
                      workplace={workplace}
                      loading={compareLoading}
                      onAddCompare={startPickCompare}
                      onRemoveCompare={(i) => void removeCompareSlot(i)}
                    />

                    {reports.length > 0 && (
                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-sm font-black text-slate-900">주간 AI 리포트</h3>
                        </div>
                        <ul className="space-y-2">
                          {reports.map((r) => (
                            <li
                              key={r.weekKey}
                              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                            >
                              <p className="text-[10px] font-bold text-slate-400">
                                {new Date(r.createdAtMs).toLocaleDateString('ko-KR')}
                              </p>
                              <p className="text-xs font-bold text-slate-800 mt-0.5">
                                {r.skippedAi
                                  ? '변동 없음'
                                  : r.summaryLines[0] || `${r.homeComplexName || '우리집'} 주간 리포트`}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <MyHomeReportButtons targets={reportTargets} />

                    <button
                      type="button"
                      onClick={() => void clearRegistration()}
                      className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-400/20 transition-colors max-lg:mb-8"
                    >
                      등록 해제
                    </button>
                  </>
                ) : (
                  <MyHomeRomanticHousesGallery avgPrice1m={compareResults[0]?.avgPrice1m} />
                )}
              </>
            )}
          </main>
        </div>

        {/* ── 우측: 지도 (PC 항상 / 모바일은 등록·추가 시) ── */}
        <div
          className={`w-full bg-gradient-to-br from-slate-50 to-slate-100 border-l border-slate-200/50 relative flex-col min-w-0 min-h-0 ${
            showMapMobile ? 'flex flex-1' : 'hidden'
          } lg:flex lg:flex-none lg:h-full`}
        >
          <div className="h-full w-full min-h-0">
            <MyHomeMapPanel
              pickMode={pickMode}
              registration={reg}
              compareSlots={compareSlots}
              compareResults={compareResults}
              workplace={workplace}
              onPick={handleMapPick}
              onPickModeClear={clearPickMode}
            />
          </div>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}
