/** 앱 `MyHomeConfig` / Firestore `users/{uid}/private/myHomeConfig` 와 동일 */

export type MyApartmentRegistration = {
  type: 'current' | 'wish';
  masterId?: string | null;
  rtmsAptSeq?: string | null;
  r114PropId?: string | null;
  exclusiveAreaM2: number;
  complexName: string;
  lat?: number | null;
  lng?: number | null;
  reportId?: string | null;
  registeredAtMs: number;
};

export type MyHomeCompareSlot = {
  masterId?: string | null;
  rtmsAptSeq?: string | null;
  r114PropId?: string | null;
  exclusiveAreaM2: number;
  complexName: string;
  reportId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type MyHomeWorkplace = {
  workplaceLabel?: string | null;
  workLat?: number | null;
  workLng?: number | null;
};

export type MyHomeConfig = {
  schemaVersion?: number;
  registration?: MyApartmentRegistration | null;
  compareSlots: MyHomeCompareSlot[];
  workplace: MyHomeWorkplace;
  weeklyOptIn: boolean;
  updatedAtMs: number;
};

export type MyHomeWeeklyReport = {
  weekKey: string;
  createdAtMs: number;
  summaryLines: string[];
  homeComplexName?: string | null;
  compareComplexNames: string[];
  skippedAi?: boolean;
  tableText?: string | null;
};

export const MY_HOME_COMPARE_MAX = 2;

export type MyHomeCompareItem = {
  rtmsAptSeq?: string | null;
  masterId?: string | null;
  r114PropId?: string | null;
  complexName?: string | null;
  shortAddress?: string | null;
  exclusiveAreaM2?: number | null;
  riseRate6m?: number | null;
  avgPrice1m?: number | null;
  avgPriceMonth?: string | null;
  tradeCount6m?: number | null;
  jeonseRatePercent?: number | null;
  commuteMinutes?: number | null;
  commuteMinutesCar?: number | null;
  commuteMinutesTransit?: number | null;
  elementarySchoolNavMinutes?: number | null;
  elementarySchoolName?: string | null;
  hardware?: {
    householdCount?: number | null;
    buildingAgeYears?: number | null;
    parkingPerHousehold?: number | null;
  } | null;
  extended?: {
    available?: boolean;
    rows?: { id: string; label: string; value: string }[];
    details?: {
      dynamicNews?: {
        count?: number;
        items?: Array<{ title: string; date?: string | null; url?: string | null }>;
      };
      redevelopment?: {
        isInZone?: boolean;
        projectCount?: number;
        projects?: { title: string; stage?: string | null; gosiDate?: string | null }[];
      };
      academy?: { within1km?: number | null; within2km?: number | null };
    } | null;
  } | null;
  latestReportId?: string | null;
  latestCompletedReportId?: string | null;
  error?: string | null;
};
