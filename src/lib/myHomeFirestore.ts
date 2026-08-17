import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { MyHomeConfig, MyHomeWeeklyReport } from './myHomeTypes';

function configDoc(uid: string) {
  return doc(db, 'users', uid, 'private', 'myHomeConfig');
}

function parseRegistration(raw: unknown): MyHomeConfig['registration'] {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    type: r.type === 'wish' ? 'wish' : 'current',
    masterId: r.masterId?.toString() ?? null,
    rtmsAptSeq: r.rtmsAptSeq?.toString() ?? null,
    r114PropId: r.r114PropId?.toString() ?? null,
    exclusiveAreaM2: Number(r.exclusiveAreaM2) || 0,
    complexName: r.complexName?.toString() || '아파트',
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    reportId: r.reportId?.toString() ?? null,
    registeredAtMs: Number(r.registeredAtMs) || Date.now(),
  };
}

function parseSlots(raw: unknown): MyHomeConfig['compareSlots'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((s) => ({
      masterId: s.masterId?.toString() ?? null,
      rtmsAptSeq: s.rtmsAptSeq?.toString() ?? null,
      r114PropId: s.r114PropId?.toString() ?? null,
      exclusiveAreaM2: Number(s.exclusiveAreaM2) || 0,
      complexName: s.complexName?.toString() || '아파트',
      reportId: s.reportId?.toString() ?? null,
      lat: s.lat != null ? Number(s.lat) : null,
      lng: s.lng != null ? Number(s.lng) : null,
    }));
}

export function parseMyHomeConfig(data: Record<string, unknown>): MyHomeConfig {
  const wp = data.workplace;
  const workplace =
    wp && typeof wp === 'object'
      ? {
          workplaceLabel: (wp as Record<string, unknown>).workplaceLabel?.toString() ?? null,
          workLat:
            (wp as Record<string, unknown>).workLat != null
              ? Number((wp as Record<string, unknown>).workLat)
              : null,
          workLng:
            (wp as Record<string, unknown>).workLng != null
              ? Number((wp as Record<string, unknown>).workLng)
              : null,
        }
      : {};

  return {
    schemaVersion: Number(data.schemaVersion) || 1,
    registration: parseRegistration(data.registration),
    compareSlots: parseSlots(data.compareSlots),
    workplace,
    weeklyOptIn: data.weeklyOptIn !== false,
    updatedAtMs: Number(data.updatedAtMs) || 0,
  };
}

export async function fetchMyHomeConfig(uid: string): Promise<MyHomeConfig | null> {
  const snap = await getDoc(configDoc(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data) return null;
  return parseMyHomeConfig(data as Record<string, unknown>);
}

export async function saveMyHomeConfig(uid: string, config: MyHomeConfig): Promise<void> {
  await setDoc(
    configDoc(uid),
    {
      schemaVersion: 1,
      updatedAtMs: config.updatedAtMs || Date.now(),
      weeklyOptIn: config.weeklyOptIn,
      registration: config.registration ?? null,
      compareSlots: config.compareSlots,
      workplace: config.workplace,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

function isTableLikeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^\[.+\]$/.test(t)) return true;
  if (t.startsWith('---') || t.startsWith('항목 |')) return true;
  if (t.includes(' | ') && t.split('|').length >= 2) return true;
  return false;
}

export function parseMyHomeWeeklyReport(id: string, data: Record<string, unknown>): MyHomeWeeklyReport {
  const linesRaw = data.summaryLines;
  const summaryLines = Array.isArray(linesRaw)
    ? linesRaw
        .map((l) => String(l).trim())
        .filter((t) => t && !isTableLikeLine(t))
    : [];

  const compareRaw = data.compareComplexNames;
  const compareComplexNames = Array.isArray(compareRaw)
    ? compareRaw.map((l) => String(l).trim()).filter(Boolean)
    : [];

  const periodRaw = data.period;
  const period =
    periodRaw && typeof periodRaw === 'object'
      ? {
          start: (periodRaw as Record<string, unknown>).start?.toString(),
          end: (periodRaw as Record<string, unknown>).end?.toString(),
        }
      : null;

  const highlightsRaw = data.weeklyHighlights;
  const weeklyHighlights =
    highlightsRaw && typeof highlightsRaw === 'object'
      ? (highlightsRaw as MyHomeWeeklyReport['weeklyHighlights'])
      : null;

  const tableSnapshotRaw = data.tableSnapshot;
  const tableSnapshot =
    tableSnapshotRaw && typeof tableSnapshotRaw === 'object'
      ? (tableSnapshotRaw as Record<string, unknown>)
      : null;

  return {
    schemaVersion: Number(data.schemaVersion) || 1,
    weekKey: data.weekKey?.toString() || id,
    createdAtMs: Number(data.createdAtMs) || 0,
    summaryLines,
    homeComplexName: data.homeComplexName?.toString() ?? null,
    compareComplexNames,
    snapshotHash: data.snapshotHash?.toString() ?? null,
    digestHash: data.digestHash?.toString() ?? null,
    hasWeeklyChanges: typeof data.hasWeeklyChanges === 'boolean' ? data.hasWeeklyChanges : null,
    period,
    weeklyHighlights,
    tableSnapshot,
    skippedAi: data.skippedAi === true,
    reason: data.reason?.toString() ?? null,
    model: data.model?.toString() ?? null,
    tableText: data.tableText?.toString() ?? null,
  };
}

export async function fetchMyHomeWeeklyReport(
  uid: string,
  weekKey: string,
): Promise<MyHomeWeeklyReport | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'weeklyReports', weekKey));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data) return null;
  return parseMyHomeWeeklyReport(snap.id, data as Record<string, unknown>);
}

export async function fetchMyHomeWeeklyReports(uid: string, max = 12): Promise<MyHomeWeeklyReport[]> {
  const q = query(
    collection(db, 'users', uid, 'weeklyReports'),
    orderBy('createdAtMs', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => parseMyHomeWeeklyReport(d.id, d.data() as Record<string, unknown>));
}
