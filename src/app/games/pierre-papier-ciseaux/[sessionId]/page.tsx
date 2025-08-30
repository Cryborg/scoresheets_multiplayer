import PierrePapierCiseauxScoreSheet from '@/components/scoresheets/PierrePapierCiseauxScoreSheet';

export default async function PierrePapierCiseauxPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <PierrePapierCiseauxScoreSheet sessionId={sessionId} />;
}