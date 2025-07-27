import RamiScoreSheet from '@/components/scoresheets/RamiScoreSheet';

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <RamiScoreSheet sessionId={sessionId} />;
}