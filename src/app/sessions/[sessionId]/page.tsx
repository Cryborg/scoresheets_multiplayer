import YamsScoreSheetMultiplayer from '@/components/scoresheets/YamsScoreSheetMultiplayer';

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;
  
  return <YamsScoreSheetMultiplayer sessionId={sessionId} />;
}