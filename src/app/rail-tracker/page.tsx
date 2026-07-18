'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  Train,
  Clock,
  MapPin,
  ExternalLink,
  Loader2,
  FileWarning,
} from 'lucide-react';

const STAGE_COLORS: Record<string, string> = {
  '계획 반영': '#3B82F6',
  사전타당성: '#06B6D4',
  '예타 착수': '#F59E0B',
  '예타 진행': '#F59E0B',
  '예타 통과': '#F59E0B',
  기본계획: '#10B981',
  기본설계: '#22C55E',
  실시설계: '#22C55E',
  '실시계획 인가': '#84CC16',
  착공: '#16A34A',
  '공사 중': '#16A34A',
  준공: '#15803D',
  '사업 보류': '#EF4444',
};

function getStageColor(name: string | null | undefined) {
  return (name && STAGE_COLORS[name]) || '#9CA3AF';
}

function getStageEmoji(order: number) {
  if (order < 0) return '🔴';
  if (order <= 20) return '🔵';
  if (order <= 40) return '🟠';
  if (order <= 60) return '🟡';
  if (order <= 80) return '🟢';
  return '✅';
}

function formatCost(b: number | null | undefined) {
  if (!b) return '—';
  return b >= 10000 ? `${(b / 10000).toFixed(1)}조원` : `${b.toLocaleString()}억원`;
}

function timeAgo(s: string | null | undefined) {
  if (!s) return '—';
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (days === 0) return '오늘';
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

const API = '/api/rail-tracker';

interface Project {
  id: number;
  line_name: string;
  source: string | null;
  project_type: string | null;
  from_station: string | null;
  to_station: string | null;
  distance_km: number | null;
  station_count: number | null;
  total_cost: number | null;
  current_stage: string | null;
  current_stage_order: number;
  stage_color?: string;
  open_year: number | null;
  is_metro: boolean | null;
}

interface ProjectEvent {
  id: number;
  project_id: number;
  event_date: string;
  stage: string;
  stage_order: number;
  title: string;
  summary: string | null;
  source: string;
  source_url: string | null;
}

interface ProjectDetail extends Project {
  events: ProjectEvent[];
}

interface DashboardStats {
  total_projects: number;
  active_projects: number;
  total_events: number;
  total_documents: number;
  matched_documents: number;
  unmatched_documents: number;
  last_crawl: string | null;
  stage_counts: Record<string, number>;
}

interface CrawledDocument {
  id: number;
  source: string;
  document_id: string;
  title: string;
  url: string | null;
  published_date: string | null;
  detected_stage: string | null;
  matched_project_id: number | null;
  is_processed: boolean;
  crawled_at: string;
}

async function fetchProjects(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v && v !== '전체') as [string, string][]
  );
  const res = await fetch(`${API}/projects?${qs}`);
  if (!res.ok) throw new Error('projects fetch failed');
  return res.json() as Promise<Project[]>;
}

async function fetchDashboard() {
  const res = await fetch(`${API}/dashboard`);
  if (!res.ok) throw new Error('dashboard fetch failed');
  return res.json() as Promise<DashboardStats>;
}

async function fetchProjectDetail(id: number) {
  const res = await fetch(`${API}/projects/${id}`);
  if (!res.ok) throw new Error('project detail fetch failed');
  return res.json() as Promise<ProjectDetail>;
}

async function fetchUnmatchedDocuments() {
  const res = await fetch(`${API}/documents/unmatched?limit=100`);
  if (!res.ok) throw new Error('unmatched documents fetch failed');
  return res.json() as Promise<CrawledDocument[]>;
}

async function triggerCrawl() {
  const res = await fetch(`${API}/crawl/trigger`, { method: 'POST' });
  return res.json();
}

function StageBar({ currentOrder }: { currentOrder: number }) {
  const pct = currentOrder < 0 ? 0 : Math.min((currentOrder / 100) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: 'var(--progress-bg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            width: `${pct}%`,
            background:
              currentOrder < 0 ? '#EF4444' : 'linear-gradient(90deg, #3B82F6, #16A34A)',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
        {currentOrder < 0 ? '보류' : `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

function ProjectRow({
  project,
  isExpanded,
  onToggle,
}: {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const stageColor = getStageColor(project.current_stage);

  useEffect(() => {
    if (isExpanded && !detail) {
      fetchProjectDetail(project.id).then(setDetail).catch(() => {});
    }
  }, [isExpanded, project.id, detail]);

  const events = detail?.events || [];
  const desc =
    project.from_station && project.to_station
      ? `${project.from_station} ~ ${project.to_station}`
      : '';

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        marginBottom: 8,
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          cursor: 'pointer',
          gap: 12,
          userSelect: 'none',
        }}
      >
        <div style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        <div style={{ flex: '0 0 auto', minWidth: 100 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
            {project.line_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            {project.source} · {project.project_type}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '0 12px' }}>
          <StageBar currentOrder={project.current_stage_order || 0} />
        </div>
        <div
          style={{
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: stageColor + '18',
            color: stageColor,
            whiteSpace: 'nowrap',
          }}
        >
          {getStageEmoji(project.current_stage_order || 0)} {project.current_stage || '미정'}
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            padding: '0 16px 16px',
            borderTop: '1px solid var(--border)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
              padding: '14px 0 16px',
            }}
          >
            {[
              {
                label: '총연장',
                value: project.distance_km ? `${project.distance_km}km` : '—',
              },
              {
                label: '역 수',
                value: project.station_count ? `${project.station_count}개역` : '—',
              },
              { label: '사업비', value: formatCost(project.total_cost) },
              {
                label: '개통목표',
                value: project.open_year ? `${project.open_year}년` : '—',
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--stat-bg)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {desc && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              {desc}
            </div>
          )}

          {events.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                진행 이력
              </div>
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 5,
                    top: 4,
                    bottom: 4,
                    width: 2,
                    background: 'var(--border)',
                    borderRadius: 1,
                  }}
                />
                {events.map((ev, i) => (
                  <div
                    key={ev.id}
                    style={{
                      position: 'relative',
                      paddingBottom: i < events.length - 1 ? 14 : 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: -17,
                        top: 5,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: getStageColor(ev.stage),
                        border: '2px solid var(--card-bg)',
                        boxShadow: `0 0 0 2px ${getStageColor(ev.stage)}40`,
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--text)',
                            lineHeight: 1.4,
                          }}
                        >
                          {ev.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-dim)',
                            marginTop: 3,
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <span>{ev.event_date}</span>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              background: 'var(--border)',
                              color: 'var(--text-dim)',
                            }}
                          >
                            {ev.source}
                          </span>
                        </div>
                      </div>
                      {ev.source_url && (
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text-dim)', flexShrink: 0 }}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {isExpanded && !detail && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 불러오는 중...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const cssVars = `
  :root {
    --bg: #F7F8FA; --card-bg: #FFFFFF; --border: #E5E7EB;
    --text: #1A1A2E; --text-secondary: #4A4A6A; --text-dim: #8B8BA7;
    --accent: #3B5BDB; --stat-bg: #F3F4F8; --progress-bg: #E5E7EB;
    --input-bg: #FFFFFF; --header-bg: #1A1A2E;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0F0F1A; --card-bg: #1A1A2E; --border: #2A2A40;
      --text: #E8E8F0; --text-secondary: #A0A0C0; --text-dim: #6A6A8A;
      --accent: #5B7BFF; --stat-bg: #12122A; --progress-bg: #2A2A40;
      --input-bg: #1E1E32; --header-bg: #0A0A18;
    }
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  select, input { font-family: inherit; }
`;

export default function RailTrackerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unmatchedDocs, setUnmatchedDocs] = useState<CrawledDocument[]>([]);
  const [showUnmatched, setShowUnmatched] = useState(true);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('전체');
  const [filterStage, setFilterStage] = useState('전체');
  const [sortBy, setSortBy] = useState('stage_desc');
  const [crawling, setCrawling] = useState(false);

  const loadData = () =>
    Promise.all([fetchProjects(), fetchDashboard(), fetchUnmatchedDocuments()])
      .then(([projs, dash, unmatched]) => {
        setProjects(projs);
        setStats(dash);
        setUnmatchedDocs(unmatched);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => {
    loadData();
  }, []);

  const sources = useMemo(
    () => ['전체', ...new Set(projects.map((p) => p.source).filter(Boolean))] as string[],
    [projects]
  );
  const stages = useMemo(
    () => ['전체', ...new Set(projects.map((p) => p.current_stage).filter(Boolean))] as string[],
    [projects]
  );

  const filtered = useMemo(() => {
    const result = projects.filter((p) => {
      if (search && !p.line_name?.includes(search)) return false;
      if (filterSource !== '전체' && p.source !== filterSource) return false;
      if (filterStage !== '전체' && p.current_stage !== filterStage) return false;
      return true;
    });
    result.sort((a, b) => {
      const ao = a.current_stage_order || 0;
      const bo = b.current_stage_order || 0;
      if (sortBy === 'stage_desc') return bo - ao;
      if (sortBy === 'stage_asc') return ao - bo;
      if (sortBy === 'name') return (a.line_name || '').localeCompare(b.line_name || '');
      if (sortBy === 'cost') return (b.total_cost || 0) - (a.total_cost || 0);
      return 0;
    });
    return result;
  }, [projects, search, filterSource, filterStage, sortBy]);

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      await triggerCrawl();
      setTimeout(() => loadData(), 5000);
    } catch {
      /* ignore */
    }
    setTimeout(() => setCrawling(false), 3000);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'var(--bg)',
          fontFamily: "'Pretendard', -apple-system, sans-serif",
        }}
      >
        <style>{cssVars}</style>
        <Loader2
          size={24}
          style={{ animation: 'spin 1s linear infinite', color: 'var(--text-dim)' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        fontFamily:
          "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: 'var(--text)',
      }}
    >
      <style>{cssVars}</style>

      <div style={{ background: 'var(--header-bg)', color: '#FFF', padding: '20px 24px' }}>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Train size={22} strokeWidth={2.5} />
              <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
                철도사업 추적 시스템
              </h1>
            </div>
            <p style={{ fontSize: 13, color: '#8B8BA7' }}>전국 철도·도시철도 사업 진행 현황</p>
          </div>
          <button
            onClick={handleCrawl}
            disabled={crawling}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: crawling ? '#333' : '#2A2A40',
              border: '1px solid #444',
              borderRadius: 8,
              color: '#CCC',
              fontSize: 12,
              cursor: crawling ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw
              size={14}
              style={crawling ? { animation: 'spin 1s linear infinite' } : {}}
            />
            {crawling ? '수집 중...' : '수동 수집'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10,
              marginBottom: 20,
            }}
          >
            {[
              { label: '추적 사업', value: stats.total_projects, icon: <Train size={16} /> },
              { label: '수집 문서', value: stats.total_documents, icon: <Search size={16} /> },
              { label: '매칭 완료', value: stats.matched_documents ?? 0, icon: <MapPin size={16} /> },
              { label: '미매칭', value: stats.unmatched_documents ?? 0, icon: <FileWarning size={16} /> },
              { label: '마지막 수집', value: timeAgo(stats.last_crawl), icon: <Clock size={16} /> },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                    color: 'var(--text-dim)',
                  }}
                >
                  {s.icon}
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                  {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {(stats?.unmatched_documents ?? unmatchedDocs.length) > 0 && (
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              marginBottom: 20,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setShowUnmatched((v) => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text)',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <FileWarning size={16} color="#F59E0B" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  미매칭 문서 ({stats?.unmatched_documents ?? unmatchedDocs.length})
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  프로젝트에 연결되지 않은 수집 문서
                </span>
              </div>
              {showUnmatched ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {showUnmatched && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {unmatchedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--text)',
                          lineHeight: 1.4,
                          marginBottom: 4,
                        }}
                      >
                        {doc.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-dim)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'var(--border)',
                          }}
                        >
                          {doc.source}
                        </span>
                        {doc.published_date && <span>{doc.published_date}</span>}
                        {doc.detected_stage && (
                          <span style={{ color: '#F59E0B' }}>감지 단계: {doc.detected_stage}</span>
                        )}
                        {!doc.is_processed && (
                          <span style={{ color: '#6B7280' }}>분석 대기</span>
                        )}
                      </div>
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text-dim)', flexShrink: 0, marginTop: 2 }}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <div style={{ flex: '1 1 200px', position: 'relative', maxWidth: 320 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="노선 검색..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 30px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>
          {[
            { value: filterSource, onChange: setFilterSource, options: sources },
            { value: filterStage, onChange: setFilterStage, options: stages },
            {
              value: sortBy,
              onChange: setSortBy,
              options: [
                { v: 'stage_desc', l: '진행률↓' },
                { v: 'stage_asc', l: '진행률↑' },
                { v: 'name', l: '이름순' },
                { v: 'cost', l: '사업비↓' },
              ],
              isObj: true,
            },
          ].map((f, i) => (
            <select
              key={i}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              style={{
                padding: '8px 28px 8px 10px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text)',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B8BA7' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
              }}
            >
              {'isObj' in f && f.isObj
                ? (f.options as { v: string; l: string }[]).map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))
                : (f.options as string[]).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
            </select>
          ))}
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>
            {filtered.length}개 사업
          </div>
        </div>

        {filtered.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            isExpanded={expandedId === p.id}
            onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)', fontSize: 14 }}>
            검색 결과가 없습니다
          </div>
        )}

        <div
          style={{
            marginTop: 32,
            padding: '16px 0',
            borderTop: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-dim)',
            lineHeight: 1.8,
          }}
        >
          <strong>데이터 출처:</strong> 전자관보 Open API (국토교통부·서울특별시) &nbsp;·&nbsp;
          <strong>수집 주기:</strong> 매일 09:00 / 13:00 / 18:00
        </div>
      </div>
    </div>
  );
}
