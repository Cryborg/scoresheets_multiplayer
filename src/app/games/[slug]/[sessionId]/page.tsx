import { getGameComponent } from '@/lib/gameComponentLoader';
import AuthGuard from '@/components/AuthGuard';

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
      <AuthGuard>
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
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <ScoreSheetComponent sessionId={sessionId} />
    </AuthGuard>
  );
}