'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PANEL_CARD,
  PANEL_CARD_INNER,
} from '../../../components/analyzePanelFormStyles';
import {
  decodePresaleId,
  fetchPresaleDetail,
  fetchPresaleTrades,
  buildRankingHref,
  type PresaleDetail,
  type PresaleTradeRow,
} from '../../../lib/presaleApi';
import { buildPresaleListHrefFromSearchParams } from '../../../lib/presaleListQuery';
import { geocodePresaleAddress } from '../../../lib/presaleGeocode';
import { usePresaleShell } from '../PresaleShellLayout';
import {
  ArrowLeft,
  ExternalLink,
  Phone,
  Building2,
  ChevronRight,
  MapPin,
  CalendarDays,
  BarChart3,
  Home,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function formatTradeDate(t: PresaleTradeRow) {
  const y = String(t.dealYear || '').slice(-2);
  const m = String(t.dealMonth || '').padStart(2, '0');
  const d = String(t.dealDay || '').padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function formatYm(value: string | null | undefined) {
  if (!value) return '-';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 6) return `${digits.slice(0, 4)}.${digits.slice(4, 6)}`;
  return value;
}

function statusTone(statusText: string | undefined) {
  const t = statusText || '';
  if (t.includes('특별') || t.includes('청약') || t.includes('접수')) {
    return 'bg-emerald-600 text-white border-emerald-600';
  }
  if (t.includes('예정')) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (t.includes('마감') || t.includes('종료') || t.includes('결과')) {
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }
  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
}

function DetailSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-emerald-100/80 bg-white overflow-hidden shadow-[0_1px_3px_rgba(16,185,129,0.06)]">
      <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50/90 to-white border-b border-emerald-100/70 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
        {icon ? <span className="text-emerald-600 shrink-0">{icon}</span> : null}
        <h2 className="text-[13px] font-extrabold text-emerald-950 tracking-tight">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={`${PANEL_CARD_INNER} px-3 py-2.5 border-emerald-50/80`}>
      <dt className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wide">{label}</dt>
      <dd className="text-[13px] font-bold text-slate-800 mt-1 leading-snug">{value}</dd>
    </div>
  );
}

function ExternalLinkBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-extrabold text-emerald-800 bg-white border border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-sm shadow-emerald-500/5"
    >
      {label}
      <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
    </a>
  );
}

function SilvTradeChart({ rows }: { rows: PresaleTradeRow[] }) {
  if (rows.length < 2) return null;

  const data = [...rows]
    .sort((a, b) => {
      const ka = `${a.dealYear}${String(a.dealMonth).padStart(2, '0')}${String(a.dealDay || 0).padStart(2, '0')}`;
      const kb = `${b.dealYear}${String(b.dealMonth).padStart(2, '0')}${String(b.dealDay || 0).padStart(2, '0')}`;
      return ka.localeCompare(kb);
    })
    .slice(-12)
    .map((t) => ({
      date: formatTradeDate(t),
      priceEok: t.dealAmount ? Number((t.dealAmount / 10000).toFixed(2)) : 0,
      area: t.exclusiveArea,
    }));

  return (
    <DetailSection title="분양권전매 시세 추이" icon={<BarChart3 className="w-3.5 h-3.5" />}>
      <p className="text-[11px] text-slate-500 font-semibold mb-3">최근 {data.length}건 기준 (억원)</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={36} />
          <Tooltip
            formatter={(value: number) => [`${value}억`, '거래가']}
            labelFormatter={(label) => `거래일 ${label}`}
            contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #a7f3d0' }}
          />
          <Line type="monotone" dataKey="priceEok" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} />
        </LineChart>
      </ResponsiveContainer>
    </DetailSection>
  );
}

function TradeList({ title, rows, kind }: { title: string; rows: PresaleTradeRow[]; kind: 'sale' | 'rent' | 'silv' }) {
  if (!rows.length) return null;
  return (
    <DetailSection title={title} icon={<Building2 className="w-3.5 h-3.5" />}>
      <p className="text-[11px] text-slate-500 font-semibold mb-3">최근 {rows.length}건</p>
      <ul className="space-y-0 divide-y divide-emerald-50/80 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
        {rows.slice(0, 20).map((t, i) => (
          <li key={i} className="text-[11px] px-3 py-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-slate-500 font-semibold tabular-nums">{formatTradeDate(t)}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">{t.exclusiveArea ? `${t.exclusiveArea}㎡` : '-'}</span>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-emerald-800">
              {kind === 'rent'
                ? `보증 ${t.deposit || '-'} / 월 ${t.monthlyRent || '-'}`
                : t.dealAmount
                  ? `${(t.dealAmount / 10000).toFixed(1)}억`
                  : '-'}
            </span>
            {t.floor ? <span className="text-slate-400 ml-auto">{t.floor}층</span> : null}
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}

function PresaleDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile, showMobileMap, setShowMobileMap, leftPanelBodyClass, registerDetailMarker } = usePresaleShell();
  const backHref = buildPresaleListHrefFromSearchParams(searchParams);

  const { houseManageNo, pblancNo } = decodePresaleId(id);
  const [detail, setDetail] = useState<PresaleDetail | null>(null);
  const [trades, setTrades] = useState<{ sale: PresaleTradeRow[]; rent: PresaleTradeRow[]; silv: PresaleTradeRow[] } | null>(null);
  const [tradesNote, setTradesNote] = useState<string | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMobile) setShowMobileMap(false);
  }, [id, isMobile, setShowMobileMap]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setTrades(null);
      setTradesNote(null);
      try {
        const res = await fetchPresaleDetail(houseManageNo, pblancNo, { includeCompetition: true });
        if (cancelled) return;
        if (!res.success || !res.data) {
          setError(res.message || '상세 정보 없음');
          return;
        }
        setDetail(res.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [houseManageNo, pblancNo]);

  useEffect(() => {
    if (!detail?.address) {
      registerDetailMarker(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const geo = await geocodePresaleAddress(detail.address);
      if (cancelled) return;
      registerDetailMarker(detail, geo);
    })();

    return () => {
      cancelled = true;
      registerDetailMarker(null);
    };
  }, [detail, registerDetailMarker]);

  useEffect(() => {
    if (!detail?.houseName) return;

    if (detail.status?.phase !== 'results') {
      setTradesNote('청약 진행 중인 단지는 실거래 조회를 생략했습니다. (입주·거래 후 집계됩니다)');
      return;
    }

    let cancelled = false;
    setTradesLoading(true);
    setTradesNote(null);

    fetchPresaleTrades(detail.houseName, detail.address || '', 24)
      .then((tr) => {
        if (cancelled) return;
        if (tr?.success) {
          const sale = tr.sale || [];
          const rent = tr.rent || [];
          const silv = tr.silv || [];
          setTrades({ sale, rent, silv });
          if (sale.length + rent.length + silv.length === 0) {
            setTradesNote(
              tr.lawdCd
                ? '최근 24개월 실거래가 없습니다. (신규 분양·미입주 단지는 국토부 실거래에 아직 잡히지 않을 수 있습니다)'
                : '해당 단지명으로 최근 24개월 실거래가 없습니다.',
            );
          }
        } else {
          setTradesNote('주소에서 지역 코드를 찾지 못해 실거래를 조회하지 못했습니다.');
        }
      })
      .catch(() => {
        if (!cancelled) setTradesNote('실거래 조회 중 오류가 발생했습니다.');
      })
      .finally(() => {
        if (!cancelled) setTradesLoading(false);
      });

    return () => { cancelled = true; };
  }, [detail?.houseName, detail?.address, detail?.status?.phase]);

  const statusText = detail?.status?.statusText || '분양';
  const dDay = detail?.status?.dDay;

  return (
    <>
      <header className={PAGE_STICKY_HEADER}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 lg:hidden shrink-0" aria-hidden="true" />
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="shrink-0 p-1.5 rounded-xl hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
              aria-label="목록으로"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className={`${PAGE_HEADER_TITLE} truncate`}>분양 상세</h1>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setShowMobileMap((v) => !v)}
              className="bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95 shrink-0"
            >
              {showMobileMap ? '상세보기' : '지도보기'}
            </button>
          )}
        </div>
      </header>

      <div className={`flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-3.5 pb-6 space-y-3.5 ${leftPanelBodyClass}`}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-9 h-9 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-[13px] font-bold text-slate-400">분양 상세 불러오는 중…</p>
          </div>
        )}

        {!loading && (error || !detail) && (
          <div className={`${PANEL_CARD} p-6 text-center border-emerald-100`}>
            <p className="text-rose-600 font-semibold text-sm">{error || '데이터 없음'}</p>
            <Link href={backHref} className="text-emerald-600 text-xs font-bold mt-4 inline-block hover:text-emerald-700">
              ← 분양 목록
            </Link>
          </div>
        )}

        {!loading && detail && (
          <>
            {/* ── 히어로 요약 ── */}
            <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-white p-4 shadow-[0_2px_8px_rgba(16,185,129,0.08)]">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${statusTone(statusText)}`}>
                  {statusText}
                </span>
                {dDay != null && dDay >= 0 && (
                  <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                    D-{dDay}
                  </span>
                )}
              </div>

              <h2 className="text-[15px] font-black text-slate-900 leading-snug tracking-tight">
                {detail.houseName}
              </h2>

              <p className="text-[11px] text-slate-600 mt-2 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                {detail.address}
              </p>

              {detail.phone && (
                <p className="text-[11px] text-slate-600 mt-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span className="font-semibold tabular-nums">{detail.phone}</span>
                </p>
              )}

              {detail.avgPriceLabel && (
                <div className="mt-4 px-3 py-2.5 rounded-xl bg-white/80 border border-emerald-100 flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-bold text-emerald-700/80">대표 분양가</span>
                  <span className="text-lg font-black text-emerald-700 tabular-nums">{detail.avgPriceLabel}</span>
                </div>
              )}

              {(detail.homepageUrl || detail.noticeUrl) && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-emerald-100/80">
                  {detail.homepageUrl && <ExternalLinkBtn href={detail.homepageUrl} label="분양 홈페이지" />}
                  {detail.noticeUrl && <ExternalLinkBtn href={detail.noticeUrl} label="입주자 모집공고" />}
                </div>
              )}
            </div>

            {/* ── 공급 개요 ── */}
            <DetailSection title="공급 개요" icon={<Home className="w-3.5 h-3.5" />}>
              <dl className="grid grid-cols-2 gap-2">
                <InfoCell label="공급규모" value={detail.totalHouseholds ? `${detail.totalHouseholds}세대` : '-'} />
                <InfoCell label="입주예정" value={formatYm(detail.moveInDate)} />
                <InfoCell label="건설사" value={detail.constructor || '-'} />
                <InfoCell label="시행사" value={detail.developer || '-'} />
              </dl>
            </DetailSection>

            {/* ── 평형별 분양가 ── */}
            {detail.models?.length > 0 && (
              <DetailSection title="평형별 분양가" icon={<BarChart3 className="w-3.5 h-3.5" />}>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-emerald-800 bg-emerald-50/60">
                        <th className="text-left py-2.5 px-2 font-extrabold rounded-tl-lg">타입</th>
                        <th className="text-right py-2.5 px-2 font-extrabold">세대</th>
                        <th className="text-right py-2.5 px-2 font-extrabold">분양가</th>
                        <th className="text-right py-2.5 px-2 font-extrabold rounded-tr-lg">경쟁률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50">
                      {detail.models.map((m, i) => (
                        <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-2.5 px-2 font-bold text-slate-800">{m.typeLabel || m.type || '-'}</td>
                          <td className="py-2.5 px-2 text-right text-slate-600 tabular-nums">{m.supplyHouseholds || '-'}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-emerald-700 tabular-nums">{m.priceLabel || '-'}</td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-600">{m.competitionRate || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DetailSection>
            )}

            {/* ── 분양 일정 ── */}
            {detail.schedule?.length > 0 && (
              <DetailSection title="분양 일정" icon={<CalendarDays className="w-3.5 h-3.5" />}>
                <ul className="space-y-0 divide-y divide-emerald-50/80 rounded-xl border border-slate-100 overflow-hidden">
                  {detail.schedule.map((s) => (
                    <li
                      key={s.key}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-[11px] odd:bg-slate-50/40 even:bg-white"
                    >
                      <span className="text-slate-600 font-semibold leading-snug">{s.label}</span>
                      <span className="font-bold text-emerald-800 tabular-nums shrink-0">{s.date}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            {/* ── 청약 결과 ── */}
            {detail.competition?.items?.length ? (
              <DetailSection title="청약 결과 · 경쟁률" icon={<BarChart3 className="w-3.5 h-3.5" />}>
                {detail.competition.avgRate && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-800">
                    평균 경쟁률 {detail.competition.avgRate} : 1
                  </div>
                )}
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-emerald-800 bg-emerald-50/60">
                        <th className="text-left py-2 px-1.5 font-extrabold">타입</th>
                        <th className="text-left py-2 px-1.5 font-extrabold">지역</th>
                        <th className="text-right py-2 px-1.5 font-extrabold">공급</th>
                        <th className="text-right py-2 px-1.5 font-extrabold">접수</th>
                        <th className="text-right py-2 px-1.5 font-extrabold">경쟁률</th>
                        <th className="text-right py-2 px-1.5 font-extrabold">당첨가점</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50">
                      {detail.competition.items.map((c, i) => (
                        <tr key={i} className="hover:bg-emerald-50/30">
                          <td className="py-2 px-1.5 font-bold whitespace-nowrap text-slate-800">
                            {c.houseType || c.houseTypeRaw || '-'}
                            {c.rankLabel ? (
                              <span className="ml-1 text-[9px] font-semibold text-slate-400">{c.rankLabel}</span>
                            ) : null}
                          </td>
                          <td className="py-2 px-1.5 text-slate-600 whitespace-nowrap">{c.resideSeNm || '-'}</td>
                          <td className="py-2 px-1.5 text-right tabular-nums">{c.supplyHouseholds ?? '-'}</td>
                          <td className="py-2 px-1.5 text-right tabular-nums">{c.applicants ?? '-'}</td>
                          <td
                            className={`py-2 px-1.5 text-right font-bold tabular-nums ${
                              c.undersubscribed ? 'text-sky-600' : 'text-emerald-700'
                            }`}
                          >
                            {c.competitionRate || '-'}
                          </td>
                          <td className="py-2 px-1.5 text-right font-semibold tabular-nums">
                            {c.winningScore ? (
                              <>
                                {c.winningScore}
                                {c.avgScore ? (
                                  <span className="block text-[9px] font-normal text-slate-400">평균 {c.avgScore}</span>
                                ) : null}
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DetailSection>
            ) : detail.status?.phase === 'results' ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-center">
                <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                  청약이 마감되었으나 경쟁률·당첨가점 데이터가 아직 공개되지 않았습니다.
                </p>
              </div>
            ) : null}

            {/* ── 실거래 ── */}
            {tradesLoading ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 px-4 py-6 text-center">
                <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[11px] font-bold text-slate-500">실거래 조회 중…</p>
              </div>
            ) : trades && (trades.sale.length + trades.rent.length + trades.silv.length > 0) ? (
              <div className="space-y-3.5">
                <TradeList title="매매 실거래" rows={trades.sale} kind="sale" />
                <TradeList title="전월세 실거래" rows={trades.rent} kind="rent" />
                <SilvTradeChart rows={trades.silv} />
                <TradeList title="분양권전매" rows={trades.silv} kind="silv" />
              </div>
            ) : tradesNote ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3.5">
                <p className="text-[11px] text-emerald-900/80 font-semibold leading-relaxed text-center">{tradesNote}</p>
              </div>
            ) : null}

            {/* ── 지역 랭킹 ── */}
            {(detail.rankingSigunguName || detail.address) && (
              <Link
                href={buildRankingHref(detail)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 to-white p-4 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/10 transition-all group"
              >
                <span className="text-[12px] font-extrabold text-emerald-900 group-hover:text-emerald-700">
                  {detail.rankingSigunguName || '해당 지역'} 아파트 순위 더보기
                </span>
                <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:text-emerald-600 shrink-0" />
              </Link>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function PresaleDetailClient({ id }: { id: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 min-h-0 items-center justify-center text-slate-500 font-semibold text-sm">
          분양 상세 로딩 중…
        </div>
      }
    >
      <PresaleDetailInner id={id} />
    </Suspense>
  );
}
