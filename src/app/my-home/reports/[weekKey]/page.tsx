'use client';

import MyHomeWeeklyReportDetailClient from '../../../../components/my-home/weekly-report/MyHomeWeeklyReportDetailClient';

type Props = {
  params: { weekKey: string };
};

export default function MyHomeWeeklyReportPage({ params }: Props) {
  return <MyHomeWeeklyReportDetailClient weekKey={decodeURIComponent(params.weekKey)} />;
}
