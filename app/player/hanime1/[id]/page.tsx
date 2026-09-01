import { PlayerClient } from './player-client';

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params;
  return <PlayerClient id={id} />;
}
