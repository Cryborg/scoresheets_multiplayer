import { getGameComponent } from '@/lib/gameComponentLoader';
import BackButton from '@/components/ui/BackButton';
import LastPlayedGameTracker from '@/components/LastPlayedGameTracker';
import { THEME } from '@/lib/theme';

interface GameSessionPageProps {
  params: Promise<{ 
    slug: string; 
    sessionId: string 
  }>;
}

export default async function GameSessionPage({ params }: GameSessionPageProps) {
  const { slug, sessionId } = await params;

  // Utiliser le gameComponentLoader pour charger dynamiquement le bon composant
  const ScoreSheetComponent = getGameComponent(slug);
  
  if (!ScoreSheetComponent) {
    return (
      <div className={`min-h-screen ${THEME.classes.pageBackground}`}>
          {/* Navigation Bar */}
          <nav className="bg-white dark:bg-gray-800 shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center h-16">
                <BackButton href="/dashboard" label="Retour au tableau de bord" />
              </div>
            </div>
          </nav>

          {/* Error Content */}
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md mx-auto px-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Jeu non trouvé
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Le jeu &quot;{slug}&quot; n&apos;est pas encore implémenté.
              </p>
              <BackButton 
                href="/dashboard" 
                label="Retour au tableau de bord"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              />
            </div>
          </div>
        </div>
    );
  }

  return (
    <>
      <LastPlayedGameTracker gameSlug={slug} />
      <ScoreSheetComponent sessionId={sessionId} gameSlug={slug} />
    </>
  );
}