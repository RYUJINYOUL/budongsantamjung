import { redirect } from 'next/navigation';

export default function ListingDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/listings?listing=${params.id}`);
}
