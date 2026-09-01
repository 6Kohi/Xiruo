import { ReaderClient } from './reader-client';

interface ReaderPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const { id } = await params;
  const { page } = await searchParams;
  const requestedPage = Number(page ?? '1');
  const initialPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return <ReaderClient id={id} initialPage={initialPage} />;
}
