import MilleBornesEquipesScoreSheetMultiplayer from '@/components/scoresheets/MilleBornesEquipesScoreSheetMultiplayer';

export default async function MilleBornesEquipesSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <MilleBornesEquipesScoreSheetMultiplayer sessionId={sessionId} />;
}