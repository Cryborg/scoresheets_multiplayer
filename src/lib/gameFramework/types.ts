// Game Framework Types - Mini-framework pour créer facilement de nouveaux jeux

import { GameSessionWithRounds, GameSessionWithCategories, Player } from '@/types/multiplayer';

export interface PlayerScores {
  [playerId: number]: number;
}

export interface TeamDefinition {
  id: string;
  name: string;
  color: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'yellow';
  players: (session: GameSessionWithRounds | GameSessionWithCategories) => Player[];
}

export interface FormField {
  name: string;
  label: string;
  type: 'number' | 'text' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: any; label: string }>;
  defaultValue?: any;
  validation?: (value: any) => boolean;
  description?: string;
}

export interface GameTheme {
  primary: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'yellow';
  accent?: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'yellow';
  teamColors?: {
    team1: string;
    team2: string;
  };
}

export interface ScoreCalculationRules<TRoundData = any> {
  // Fonction principale de calcul des scores
  calculateScore: (
    roundData: TRoundData, 
    session: GameSessionWithRounds | GameSessionWithCategories
  ) => PlayerScores;
  
  // Validation des données avant calcul (optionnel)
  validateRoundData?: (data: TRoundData) => { valid: boolean; error?: string };
  
  // Calcul du gagnant (optionnel)
  getWinner?: (session: GameSessionWithRounds | GameSessionWithCategories) => Player | null;
  
  // Condition de fin de partie (optionnel)
  isGameFinished?: (session: GameSessionWithRounds | GameSessionWithCategories) => boolean;
}

export interface UILayout {
  // Type de layout principal
  type: 'individual' | 'teams' | 'categories' | 'custom';
  
  // Définition des équipes (si type = 'teams')
  teams?: TeamDefinition[];
  
  // Affichage du score
  scoreDisplay: {
    showIndividualScores: boolean;
    showTeamScores: boolean;
    showRankings: boolean;
    showProgressBars?: boolean;
    targetScore?: number;
  };
  
  // Historique des manches
  roundHistory: {
    show: boolean;
    columns: Array<{
      key: string;
      label: string;
      render?: (round: any, session: any) => string | React.ReactNode;
    }>;
  };
}

export interface GameDefinition<TRoundData = any, TSession = GameSessionWithRounds> {
  // Métadonnées
  slug: string;
  name: string;
  description?: string;
  
  // Configuration des joueurs
  players: {
    min: number;
    max: number;
    exactCount?: number; // Pour jeux comme Bridge (exactement 4)
  };
  
  // Type de scoring
  scoreType: 'rounds' | 'categories';
  
  // Règles de calcul
  rules: ScoreCalculationRules<TRoundData>;
  
  // Interface utilisateur
  ui: {
    theme: GameTheme;
    layout: UILayout;
    
    // Formulaire pour ajouter une manche
    roundForm: {
      title?: string; // Par défaut "Ajouter la manche X"
      fields: FormField[];
      submitLabel?: string; // Par défaut "Valider la manche X"
    };
    
    // Textes personnalisables
    texts?: {
      roundLabel?: string; // "Manche", "Donne", "Partie"...
      scoreLabel?: string; // "Points", "Score"...
      teamLabel?: string; // "Équipe", "Paire"...
    };
  };
  
  // Composants personnalisés (optionnel)
  customComponents?: {
    scoreDisplay?: React.ComponentType<{ session: TSession; gameState: any }>;
    roundForm?: React.ComponentType<{ session: TSession; gameState: any; onSubmit: (data: TRoundData) => void }>;
    roundHistory?: React.ComponentType<{ session: TSession }>;
  };
}

// Types pour les props des composants générés
export interface GameFrameworkProps {
  sessionId: string;
  definition: GameDefinition;
}

export interface GameInterfaceProps<TSession = GameSessionWithRounds> {
  session: TSession;
  gameState: any; // ReturnType de useMultiplayerGame
  definition: GameDefinition;
}

// Hook personnalisé pour la logique de jeu
export interface UseGameLogicOptions<TRoundData = any> {
  definition: GameDefinition<TRoundData>;
  session: GameSessionWithRounds | GameSessionWithCategories;
  gameState: any;
}

export interface UseGameLogicResult<TRoundData = any> {
  // État du formulaire
  roundData: TRoundData;
  setRoundData: React.Dispatch<React.SetStateAction<TRoundData>>;
  isSubmitting: boolean;
  
  // Actions
  handleSubmitRound: () => Promise<void>;
  resetForm: () => void;
  
  // Calculs utiles
  getTotalScore: (playerId: number) => number;
  getTeamScore?: (teamId: string) => number;
  getCurrentRound: () => number;
  
  // État de la partie
  winner: Player | null;
  isGameFinished: boolean;
}