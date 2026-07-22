'use client';

import PresaleShellLayout from '../PresaleShellLayout';
import PresaleDetailClient from './PresaleDetailClient';

export default function PresaleDetailPage({ params }: { params: { id: string } }) {
  return (
    <PresaleShellLayout>
      <PresaleDetailClient id={params.id} />
    </PresaleShellLayout>
  );
}
