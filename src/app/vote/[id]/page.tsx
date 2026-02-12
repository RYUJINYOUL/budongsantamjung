import { Metadata } from 'next';
import ReportClient from './VoteClient';

export const metadata: Metadata = {
  title: '갑질 제보 - 용카 AI',
  description: '택배 업계의 갑질 사례에 대한 상세 정보와 의견을 확인하세요.',
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportClient reportId={id} />;
}