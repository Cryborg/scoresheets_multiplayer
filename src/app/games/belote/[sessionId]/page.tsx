import BeloteScoreSheetMultiplayer from '@/components/scoresheets/BeloteScoreSheetMultiplayer';

export default async function BelotePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <BeloteScoreSheetMultiplayer sessionId={sessionId} />;
}