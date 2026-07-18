import PresaleDetailClient from './PresaleDetailClient';

export default function PresaleDetailPage({ params }: { params: { id: string } }) {
  return <PresaleDetailClient id={params.id} />;
}
