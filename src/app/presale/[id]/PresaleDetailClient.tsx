'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SideNav from '../../../components/SideNav';
import TopBar from '../../../components/TopBar';
import {
  PANEL_CARD,
  PANEL_SECTION_DESC,
  PANEL_SECTION_LABEL,
} from '../../../components/analyzePanelFormStyles';
import {
  decodePresaleId,
  fetchPresaleDetail,
  fetchPresaleTrades,
  buildRankingHref,
  type PresaleDetail,
  type PresaleTradeRow,
} from '../../../lib/presaleApi';
import { ExternalLink, Phone, Building2, ChevronRight } from 'lucide-react';
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
    <div className={`${PANEL_CARD} p-4`}>
      <h3 className={PANEL_SECTION_LABEL}>분양권전매 시세 추이</h3>
      <p className={`${PANEL_SECTION_DESC} mb-3`}>최근 {data.length}건 기준 (억원)</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} />
          <Tooltip
            formatter={(value: number) => [`${value}억`, '거래가']}
            labelFormatter={(label) => `거래일 ${label}`}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line type="monotone" dataKey="priceEok" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TradeList({ title, rows, kind }: { title: string; rows: PresaleTradeRow[]; kind: 'sale' | 'rent' | 'silv' }) {
  if (!rows.length) return null;
  return (
    <div className={`${PANEL_CARD} p-4`}>
      <h3 className={PANEL_SECTION_LABEL}>{title}</h3>
      <p className={`${PANEL_SECTION_DESC} mb-3`}>최근 {rows.length}건</p>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {rows.slice(0, 20).map((t, i) => (
          <li key={i} className="text-xs border-b border-slate-100 pb-2 last:border-0">
            <span className="text-slate-500">{formatTradeDate(t)}</span>
            {' · '}
            {t.exclusiveArea ? `${t.exclusiveArea}㎡` : '-'}
            {' · '}
            <span className="font-bold text-slate-800">
              {kind === 'rent'
                ? `보증 ${t.deposit || '-'} / 월 ${t.monthlyRent || '-'}`
                : t.dealAmount
                  ? `${(t.dealAmount / 10000).toFixed(1)}억`
                  : '-'}
            </span>
            {t.floor ? ` · ${t.floor}층` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PresaleDetailClient({ id }: { id: string }) {
  const { houseManageNo, pblancNo } = decodePresaleId(id);
  const [detail, setDetail] = useState<PresaleDetail | null>(null);
  const [trades, setTrades] = useState<{ sale: PresaleTradeRow[]; rent: PresaleTradeRow[]; silv: PresaleTradeRow[] } | null>(null);
  const [tradesNote, setTradesNote] = useState<string | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="detective-bg min-h-screen flex items-center justify-center text-slate-500 font-semibold">
        분양 상세 로딩 중…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="detective-bg min-h-screen">
        <SideNav />
        <main className="lg:ml-16 p-8">
          <p className="text-rose-600 font-semibold">{error || '데이터 없음'}</p>
          <Link href="/presale" className="text-emerald-600 text-sm font-bold mt-4 inline-block">
            ← 분양 목록
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="detective-bg min-h-screen text-slate-800 flex font-noto-sans-kr pb-16">
      <SideNav />
      <main className="flex-1 lg:ml-16 min-h-screen flex flex-col">
        <TopBar title={detail.houseName} backHref="/presale" centered />

        <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
          <div className={`${PANEL_CARD} p-5`}>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                {detail.status?.statusText}
              </span>
            </div>
            <p className="text-sm text-slate-600">{detail.address}</p>
            {detail.phone && (
              <p className="text-sm text-slate-600 mt-2 flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {detail.phone}
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              {detail.homepageUrl && (
                <a
                  href={detail.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-600 flex items-center gap-1"
                >
                  분양 홈페이지 <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {detail.noticeUrl && (
                <a
                  href={detail.noticeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-sky-600 flex items-center gap-1"
                >
                  입주자 모집공고 <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* 공급 개요 */}
          <div className={`${PANEL_CARD} p-5`}>
            <h2 className={PANEL_SECTION_LABEL}>공급 개요</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-400 text-xs">공급규모</dt>
                <dd className="font-bold">{detail.totalHouseholds ? `${detail.totalHouseholds}세대` : '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">입주예정</dt>
                <dd className="font-bold">{detail.moveInDate || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">건설사</dt>
                <dd className="font-bold">{detail.constructor || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">시행사</dt>
                <dd className="font-bold">{detail.developer || '-'}</dd>
              </div>
              {detail.avgPriceLabel && (
                <div className="col-span-2">
                  <dt className="text-slate-400 text-xs">대표 분양가(평균)</dt>
                  <dd className="font-black text-lg text-emerald-700">{detail.avgPriceLabel}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* 평형별 분양가 */}
          {detail.models?.length > 0 && (
            <div className={`${PANEL_CARD} p-5`}>
              <h2 className={PANEL_SECTION_LABEL}>평형별 분양가</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left py-2 pr-2">타입</th>
                      <th className="text-right py-2 pr-2">세대</th>
                      <th className="text-right py-2 pr-2">분양가</th>
                      <th className="text-right py-2">경쟁률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.models.map((m, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2.5 font-bold">{m.typeLabel || m.type || '-'}</td>
                        <td className="py-2.5 text-right">{m.supplyHouseholds || '-'}</td>
                        <td className="py-2.5 text-right font-bold text-emerald-700">{m.priceLabel || '-'}</td>
                        <td className="py-2.5 text-right font-bold text-slate-700">{m.competitionRate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 분양 일정 */}
          {detail.schedule?.length > 0 && (
            <div className={`${PANEL_CARD} p-5`}>
              <h2 className={PANEL_SECTION_LABEL}>분양 일정</h2>
              <ul className="mt-3 space-y-2">
                {detail.schedule.map((s) => (
                  <li key={s.key} className="flex justify-between text-sm border-b border-slate-50 pb-2">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="font-semibold">{s.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 경쟁률 · 당첨가점 */}
          {detail.competition?.items?.length ? (
            <div className={`${PANEL_CARD} p-5`}>
              <h2 className={PANEL_SECTION_LABEL}>청약 결과 · 경쟁률</h2>
              {detail.competition.avgRate && (
                <p className="text-sm font-bold text-emerald-700 mb-3">
                  평균 경쟁률 {detail.competition.avgRate} : 1
                </p>
              )}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left py-2 pr-2">타입</th>
                      <th className="text-left py-2 pr-2">지역</th>
                      <th className="text-right py-2 pr-2">공급</th>
                      <th className="text-right py-2 pr-2">접수</th>
                      <th className="text-right py-2 pr-2">경쟁률</th>
                      <th className="text-right py-2">당첨가점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.competition.items.map((c, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2.5 font-bold whitespace-nowrap">
                          {c.houseType || c.houseTypeRaw || '-'}
                          {c.rankLabel ? (
                            <span className="ml-1 text-[10px] font-semibold text-slate-400">{c.rankLabel}</span>
                          ) : null}
                        </td>
                        <td className="py-2.5 text-slate-600 whitespace-nowrap">{c.resideSeNm || '-'}</td>
                        <td className="py-2.5 text-right">{c.supplyHouseholds ?? '-'}</td>
                        <td className="py-2.5 text-right">{c.applicants ?? '-'}</td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            c.undersubscribed ? 'text-sky-600' : 'text-emerald-700'
                          }`}
                        >
                          {c.competitionRate || '-'}
                        </td>
                        <td className="py-2.5 text-right font-semibold">
                          {c.winningScore ? (
                            <>
                              {c.winningScore}
                              {c.avgScore ? (
                                <span className="block text-[10px] font-normal text-slate-400">
                                  평균 {c.avgScore}
                                </span>
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
            </div>
          ) : detail.status?.phase === 'results' ? (
            <p className={`${PANEL_SECTION_DESC} text-center py-4`}>
              청약이 마감되었으나 경쟁률·당첨가점 데이터가 아직 공개되지 않았습니다.
            </p>
          ) : null}

          {/* 실거래 */}
          {tradesLoading ? (
            <p className={`${PANEL_SECTION_DESC} text-center py-4`}>실거래 조회 중…</p>
          ) : trades && (trades.sale.length + trades.rent.length + trades.silv.length > 0) ? (
            <div className="space-y-3">
              <h2 className={`${PANEL_SECTION_LABEL} px-1 flex items-center gap-2`}>
                <Building2 className="w-4 h-4" />
                실거래 시세
              </h2>
              <TradeList title="매매" rows={trades.sale} kind="sale" />
              <TradeList title="전월세" rows={trades.rent} kind="rent" />
              <SilvTradeChart rows={trades.silv} />
              <TradeList title="분양권전매" rows={trades.silv} kind="silv" />
            </div>
          ) : tradesNote ? (
            <p className={`${PANEL_SECTION_DESC} text-center py-4`}>{tradesNote}</p>
          ) : null}

          {(detail.rankingSigunguName || detail.address) && (
            <Link
              href={buildRankingHref(detail)}
              className={`${PANEL_CARD} flex items-center justify-between p-4 hover:border-emerald-300 transition-colors group`}
            >
              <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">
                {detail.rankingSigunguName || '해당 지역'} 아파트 순위 더보기
              </span>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
