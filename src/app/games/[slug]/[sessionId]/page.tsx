import YamsScoreSheetMultiplayer from '@/components/scoresheets/YamsScoreSheetMultiplayer';
import TarotScoreSheetMultiplayer from '@/components/scoresheets/TarotScoreSheetMultiplayer';
import BeloteScoreSheetMultiplayer from '@/components/scoresheets/BeloteScoreSheetMultiplayer';
import BridgeScoreSheetMultiplayer from '@/components/scoresheets/BridgeScoreSheetMultiplayer';
import MilleBornesScoreSheetMultiplayer from '@/components/scoresheets/MilleBornesScoreSheetMultiplayer';

interface GameSessionPageProps {
  params: Promise<{ 
    slug: string; 
    sessionId: string 
  }>;
}

export default async function GameSessionPage({ params }: GameSessionPageProps) {
  const { slug, sessionId } = await params;

  // Sélectionner le bon composant selon le slug
  const getScoreSheetComponent = () => {
    switch (slug) {
      case 'yams':
        return <YamsScoreSheetMultiplayer sessionId={sessionId} />;
      case 'tarot':
        return <TarotScoreSheetMultiplayer sessionId={sessionId} />;
      case 'belote':
        return <BeloteScoreSheetMultiplayer sessionId={sessionId} />;
      case 'bridge':
        return <BridgeScoreSheetMultiplayer sessionId={sessionId} />;
      case 'mille-bornes':
        return <MilleBornesScoreSheetMultiplayer sessionId={sessionId} />;
      default:
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Jeu non trouvé
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Le jeu "{slug}" n'est pas encore implémenté.
              </p>
            </div>
          </div>
        );
    }
  };

  return getScoreSheetComponent();
}