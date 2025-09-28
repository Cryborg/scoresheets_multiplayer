import { createIndividualGameDefinition, PlayerScores } from '@/lib/gameFramework';
import { GameSessionWithRounds, Player } from '@/types/multiplayer';

// Types pour Bataille
interface BatailleRoundData {
  winnerPlayerId: number;
}

// Logique ultra-simple : le gagnant de la manche gagne 1 point
function calculateBatailleScore(roundData: BatailleRoundData, session: GameSessionWithRounds): PlayerScores {
  const scores: PlayerScores = {};
  
  // Initialiser tous les joueurs à 0
  if (session?.players) {
    session.players.forEach((player: Player) => {
      scores[player.id] = 0;
    });
  
    // Le gagnant de la manche marque 1 point
    if (roundData.winnerPlayerId) {
      scores[roundData.winnerPlayerId] = 1;
    }
  }
  
  return scores;
}

// Définition ultra-simple de Bataille
export const batailleDefinition = createIndividualGameDefinition(
  'bataille',
  'Bataille',
  {
    players: { min: 2, max: 4 },
    targetScore: 10, // Premier à 10 points
    theme: { primary: 'red' },
    roundLabel: 'manche',
    
    fields: [
      {
        name: 'winnerPlayerId',
        label: 'Gagnant de la manche',
        type: 'select',
        required: true,
        options: [] // On va les générer dynamiquement
      }
    ],
    
    calculateScore: calculateBatailleScore
  }
);

// Modifier la définition pour générer dynamiquement les options de gagnant
batailleDefinition.ui.roundForm.fields[0].options = [];

batailleDefinition.rules.getWinner = (session: GameSessionWithRounds) => {
  if (!session.players) return null;

  const playerScores = session.players.map(player => ({
    player,
    total: session.rounds?.reduce((sum, round) => sum + (round.scores[player.id] || 0), 0) || 0
  }));

  const winner = playerScores.find(p => p.total >= 10);
  return winner?.player || null;
};

batailleDefinition.rules.isGameFinished = (session: GameSessionWithRounds) => {
  if (!session.players || !session.rounds) return false;

  const maxScore = Math.max(...session.players.map(player =>
    session.rounds?.reduce((sum, round) => sum + (round.scores[player.id] || 0), 0) || 0
  ));

  return maxScore >= 10;
};