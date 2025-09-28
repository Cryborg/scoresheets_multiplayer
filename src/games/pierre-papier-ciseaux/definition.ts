import { createIndividualGameDefinition, PlayerScores } from '@/lib/gameFramework';
import { GameSessionWithRounds, Player } from '@/types/multiplayer';

// Types pour Pierre-Papier-Ciseaux
interface PPCRoundData {
  player1Choice: 'pierre' | 'papier' | 'ciseaux';
  player2Choice: 'pierre' | 'papier' | 'ciseaux';
  winnerId?: number;
}

// Logique du jeu Pierre-Papier-Ciseaux
function calculatePPCScore(roundData: PPCRoundData, session: GameSessionWithRounds): PlayerScores {
  const scores: PlayerScores = {};
  
  // Initialiser tous les joueurs à 0
  session.players.forEach((player: Player) => {
    scores[player.id] = 0;
  });

  // Pour simplifier, on ne gère que 2 joueurs
  if (session.players.length !== 2) {
    return scores;
  }

  const [player1, player2] = session.players;
  const choice1 = roundData.player1Choice;
  const choice2 = roundData.player2Choice;

  // Déterminer le gagnant
  if (choice1 === choice2) {
    // Égalité - 0 point pour tout le monde
    return scores;
  }

  let winner: Player | null = null;
  if (
    (choice1 === 'pierre' && choice2 === 'ciseaux') ||
    (choice1 === 'papier' && choice2 === 'pierre') ||
    (choice1 === 'ciseaux' && choice2 === 'papier')
  ) {
    winner = player1;
  } else {
    winner = player2;
  }

  // Le gagnant marque 1 point
  scores[winner.id] = 1;
  return scores;
}

// Définition du jeu Pierre-Papier-Ciseaux
export const pierrePapierCiseauxDefinition = createIndividualGameDefinition(
  'pierre-papier-ciseaux',
  'Pierre Papier Ciseaux',
  {
    players: { min: 2, max: 2 }, // Exactement 2 joueurs
    targetScore: 5, // Premier à 5 points gagne
    theme: { primary: 'green' },
    roundLabel: 'manche',
    
    fields: [
      {
        name: 'player1Choice',
        label: 'Choix Joueur 1',
        type: 'select',
        required: true,
        options: [
          { value: 'pierre', label: '🪨 Pierre' },
          { value: 'papier', label: '📄 Papier' },
          { value: 'ciseaux', label: '✂️ Ciseaux' }
        ]
      },
      {
        name: 'player2Choice',
        label: 'Choix Joueur 2',
        type: 'select',
        required: true,
        options: [
          { value: 'pierre', label: '🪨 Pierre' },
          { value: 'papier', label: '📄 Papier' },
          { value: 'ciseaux', label: '✂️ Ciseaux' }
        ]
      }
    ],
    
    calculateScore: calculatePPCScore,
    
    customColumns: [
      {
        key: 'choices',
        label: 'Choix',
        render: (round: Record<string, unknown>) => {
          const details = round.details as PPCRoundData | undefined;
          if (!details) return '-';

          const choice1Icon = getChoiceIcon(details.player1Choice);
          const choice2Icon = getChoiceIcon(details.player2Choice);

          return `${choice1Icon} vs ${choice2Icon}`;
        }
      },
      {
        key: 'result',
        label: 'Résultat',
        render: (round: Record<string, unknown>) => {
          // Trouver qui a gagné en regardant les scores
          const scores = Object.entries(round.scores as Record<string, number>);
          const winner = scores.find(([, score]) => score > 0);

          if (!winner) return '🤝 Égalité';

          // Récupérer le nom du joueur gagnant
          // (On devrait avoir accès à session ici, mais pour simplifier...)
          return `🏆 Gagnant`;
        }
      }
    ]
  }
);

function getChoiceIcon(choice: string): string {
  switch (choice) {
    case 'pierre': return '🪨';
    case 'papier': return '📄';
    case 'ciseaux': return '✂️';
    default: return '❓';
  }
}

// Règles additionnelles pour Pierre-Papier-Ciseaux
pierrePapierCiseauxDefinition.rules.getWinner = (session: GameSessionWithRounds) => {
  if (!session.players) return null;

  const playerScores = session.players.map(player => ({
    player,
    total: session.rounds?.reduce((sum, round) => sum + (round.scores[player.id] || 0), 0) || 0
  }));

  const winner = playerScores.find(p => p.total >= 5);
  return winner?.player || null;
};

pierrePapierCiseauxDefinition.rules.isGameFinished = (session: GameSessionWithRounds) => {
  if (!session.players || !session.rounds) return false;

  const maxScore = Math.max(...session.players.map(player =>
    session.rounds?.reduce((sum, round) => sum + (round.scores[player.id] || 0), 0) || 0
  ));

  return maxScore >= 5;
};