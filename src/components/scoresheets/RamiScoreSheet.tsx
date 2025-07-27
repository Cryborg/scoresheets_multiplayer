import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trophy, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RamiScoreSheet({ sessionId }: { sessionId: string }) {
  const [roundScores, setRoundScores] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleScoreChange = (playerId: number, score: number) => {
    setRoundScores(prev => ({
      ...prev,
      [playerId]: score
    }));
  };

  const handleSubmitRound = async (session: GameSessionWithRounds) => {
    const scores = Object.entries(roundScores).map(([playerId, score]) => ({
      playerId: parseInt(playerId),
      score
    }));

    if (scores.length !== session.players.length) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer les scores pour tous les joueurs",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/games/rami/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'ajout de la manche');

      setRoundScores({});
      toast({
        title: "Manche ajoutée",
        description: "Les scores ont été enregistrés"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la manche",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalScore = (playerScores: GameSessionWithRounds['scores'][0]['scores']) => {
    return playerScores.reduce((total, score) => total + score.score, 0);
  };

  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds>
      sessionId={sessionId} 
      gameSlug="rami"
    >
      {({ session, gameState }) => (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Scores actuels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {session.players.map(player => {
                  const playerScores = session.scores.find(s => s.player_id === player.id);
                  const totalScore = playerScores ? calculateTotalScore(playerScores.scores) : 0;
                  
                  return (
                    <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-medium">{player.player_name}</span>
                      <span className="text-xl font-bold flex items-center gap-2">
                        {totalScore > 0 && <TrendingDown className="h-4 w-4 text-orange-500" />}
                        {totalScore} points
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {session.status === 'active' && gameState.isHost && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Nouvelle manche
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {session.players.map(player => (
                    <div key={player.id} className="flex items-center gap-3">
                      <span className="w-32">{player.player_name}</span>
                      <Input
                        type="number"
                        placeholder="Points"
                        value={roundScores[player.id] || ''}
                        onChange={(e) => handleScoreChange(player.id, parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                    </div>
                  ))}
                  <Button 
                    onClick={() => handleSubmitRound(session)} 
                    disabled={isSubmitting}
                    className="w-full mt-4"
                  >
                    Valider la manche
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {session.rounds && session.rounds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique des manches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {session.rounds.map((round, index) => (
                    <div key={round.id} className="border-b pb-2">
                      <p className="text-sm text-muted-foreground mb-1">Manche {index + 1}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {round.scores.map(score => {
                          const player = session.players.find(p => p.id === score.player_id);
                          return (
                            <div key={score.player_id} className="flex justify-between">
                              <span>{player?.player_name}</span>
                              <span className="font-medium">{score.score}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </BaseScoreSheetMultiplayer>
  );
}