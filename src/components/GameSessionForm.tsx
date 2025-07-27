'use client';

import { 
  Users, 
  Target, 
  Play, 
  Plus,
  Settings
} from 'lucide-react';
import PlayerInput from './PlayerInput';
import GameSetupCard from './GameSetupCard';
import { Game, GameSessionCreatorState } from '@/hooks/useGameSessionCreator';

interface GameSessionFormProps {
  state: GameSessionCreatorState;
  game?: Game | null;
  onUpdateState: (updates: Partial<GameSessionCreatorState>) => void;
  onUpdatePlayer: (index: number, name: string) => void;
  onUpdateTeamPlayer: (teamIndex: number, playerIndex: number, name: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitButtonText?: string;
}

export default function GameSessionForm({
  state,
  game,
  onUpdateState,
  onUpdatePlayer,
  onUpdateTeamPlayer,
  onAddPlayer,
  onRemovePlayer,
  onSubmit,
  submitButtonText = "Créer la partie"
}: GameSessionFormProps) {
  
  // Récupérer tous les noms déjà utilisés
  const usedNames = game?.team_based 
    ? state.teams.flatMap(team => team.players.filter(name => name.trim() !== ''))
    : state.players.map(p => p.name).filter(name => name.trim() !== '');
  
  // Filtrer les suggestions pour exclure les noms déjà utilisés
  const getAvailableSuggestions = (currentValue: string) => {
    return state.suggestedPlayers.filter(suggestion => 
      !usedNames.includes(suggestion) || suggestion === currentValue
    );
  };
  
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Session Name */}
      <GameSetupCard
        title="Nom de la partie"
        description="Donnez un nom à votre partie (optionnel)"
        icon={Play}
      >
        <input
          type="text"
          value={state.sessionName}
          onChange={(e) => onUpdateState({ sessionName: e.target.value })}
          placeholder={game ? `Partie de ${game.name}` : "Partie avec scores simples"}
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md focus:shadow-lg"
        />
      </GameSetupCard>

      {/* Players Section */}
      <GameSetupCard
        title="Joueurs"
        description={game?.team_based 
          ? game.slug === 'mille-bornes-equipes'
            ? 'Créez votre équipe (2 joueurs). La deuxième équipe rejoindra via le salon.'
            : `Configuration des équipes (${game.min_players} joueurs requis)`
          : `Ajoutez entre ${game?.min_players || 2} et ${game?.max_players || 8} joueurs`
        }
        icon={Users}
      >
        {game?.team_based ? (
          <div className="space-y-6">
            {state.teams.map((team, teamIndex) => (
              <div key={teamIndex} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  {team.name}
                </h4>
                <div className="space-y-3">
                  {team.players.map((player, playerIndex) => (
                    <PlayerInput
                      key={`${teamIndex}-${playerIndex}`}
                      value={player}
                      onChange={(name) => onUpdateTeamPlayer(teamIndex, playerIndex, name)}
                      placeholder={`Joueur ${playerIndex + 1}`}
                      suggestions={getAvailableSuggestions(player)}
                      autoFocus={teamIndex === 0 && playerIndex === 0}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {state.players.map((player, index) => (
              <PlayerInput
                key={index}
                value={player.name}
                onChange={(name) => onUpdatePlayer(index, name)}
                onRemove={game && state.players.length > game.min_players ? () => onRemovePlayer(index) : undefined}
                placeholder={`Joueur ${index + 1}`}
                suggestions={getAvailableSuggestions(player.name)}
                canRemove={game ? state.players.length > game.min_players : state.players.length > 2}
                autoFocus={index === 0}
              />
            ))}
            
            {(!game || state.players.length < game.max_players) && (
              <button
                type="button"
                onClick={onAddPlayer}
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter un joueur</span>
              </button>
            )}
          </div>
        )}
      </GameSetupCard>

      {/* Game Options */}
      <GameSetupCard
        title="Options de jeu"
        description="Configurez les règles de la partie"
        icon={Settings}
      >
        <div className="space-y-4">
          {/* Score Direction for Generic Game */}
          {game?.slug === 'jeu-libre' && (
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                  Type de score
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Choisissez si le meilleur score est le plus haut ou le plus bas
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="scoreDirection"
                      value="higher"
                      checked={state.scoreDirection === 'higher'}
                      onChange={(e) => onUpdateState({ scoreDirection: e.target.value as 'higher' | 'lower' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Score élevé gagne</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Plus on a de points, mieux c'est</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="scoreDirection"
                      value="lower"
                      checked={state.scoreDirection === 'lower'}
                      onChange={(e) => onUpdateState({ scoreDirection: e.target.value as 'higher' | 'lower' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Score faible gagne</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Moins on a de points, mieux c'est</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Score Target */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="hasScoreTarget"
              checked={state.hasScoreTarget}
              onChange={(e) => onUpdateState({ hasScoreTarget: e.target.checked })}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="hasScoreTarget" className="text-sm font-medium text-gray-900 dark:text-white">
                Définir un score cible
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                La partie se termine quand un joueur atteint ce score
              </p>
              {state.hasScoreTarget && (
                <div className="mt-2 space-y-2">
                  <input
                    type="number"
                    value={state.scoreTarget}
                    onChange={(e) => onUpdateState({ scoreTarget: e.target.value })}
                    placeholder="Score cible (ex: 500)"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="finishCurrentRound"
                      checked={state.finishCurrentRound}
                      onChange={(e) => onUpdateState({ finishCurrentRound: e.target.checked })}
                      className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="finishCurrentRound" className="text-xs text-gray-600 dark:text-gray-400">
                      Terminer la manche en cours avant de déclarer le gagnant
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </GameSetupCard>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={state.loading}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {state.loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            Création...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Target className="h-5 w-5 mr-2" />
            {submitButtonText}
          </div>
        )}
      </button>
    </form>
  );
}