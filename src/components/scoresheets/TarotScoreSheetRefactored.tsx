'use client';

import { useState, useCallback } from 'react';
import { Crown } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameLayout from '@/components/layout/GameLayout';
import RankingSidebar from '@/components/layout/RankingSidebar';
import WaitingRoom from '@/components/multiplayer/WaitingRoom';
import { StatusBar } from '@/components/multiplayer/StatusBar';
import { LoadingState, ErrorState, SessionNotFound, JoinSessionForm } from '@/components/multiplayer/GameStates';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { useScoreActions } from '@/hooks/useScoreActions';
import { GameSessionWithRounds, Player } from '@/types/multiplayer';

interface TarotContract {
  name: string;
  basePoints: number;
}

interface TarotRoundData {
  takerId: number;
  contract: string;
  points: number;
  oudlers: number;
  petitAuBout: boolean;
  chelem: boolean;
}

const TAROT_CONTRACTS: TarotContract[] = [
  { name: 'Prise', basePoints: 25 },
  { name: 'Garde', basePoints: 50 },
  { name: 'Garde Sans', basePoints: 100 },
  { name: 'Garde Contre', basePoints: 150 },
];

const OUDLERS_POINTS = [56, 51, 46, 36]; // Points nécessaires selon nombre d'oudlers (0,1,2,3)

interface TarotScoreSheetProps {
  sessionId: string;
}

export default function TarotScoreSheetRefactored({ sessionId }: TarotScoreSheetProps) {
  // Use our new multiplayer game hook
  const gameState = useMultiplayerGame<GameSessionWithRounds>({ sessionId });
  const scoreActions = useScoreActions({ sessionId });

  const {
    session,
    error,
    lastUpdate,
    currentUserId,
    connectionStatus,
    isConnected,
    canEditPlayerScores,
    isUserInSession,
    playerName,
    setPlayerName,
    joiningSession,
    handleJoinSession,
    handleStartGame,
    goToDashboard
  } = gameState;

  const [newRound, setNewRound] = useState<TarotRoundData>({
    takerId: 0,
    contract: 'Prise',
    points: 0,
    oudlers: 0,
    petitAuBout: false,
    chelem: false
  });

  // Calculate Tarot scores for a round
  const calculateTarotScore = useCallback((data: TarotRoundData): { [playerId: number]: number } => {
    if (!session?.players) return {};

    const contract = TAROT_CONTRACTS.find(c => c.name === data.contract);
    if (!contract) return {};

    const requiredPoints = OUDLERS_POINTS[data.oudlers];
    const scoreDiff = data.points - requiredPoints;
    const isSuccess = scoreDiff >= 0;

    let baseScore = Math.abs(scoreDiff) + contract.basePoints;
    
    // Bonuses
    if (data.petitAuBout) baseScore += 10;
    if (data.chelem) baseScore += data.contract === 'Garde Contre' ? 800 : 400;

    // Apply multiplier based on contract
    let multiplier = 1;
    if (data.contract === 'Garde') multiplier = 2;
    else if (data.contract === 'Garde Sans') multiplier = 4;
    else if (data.contract === 'Garde Contre') multiplier = 6;

    const finalScore = baseScore * multiplier * (isSuccess ? 1 : -1);

    const scores: { [playerId: number]: number } = {};
    session.players.forEach((player: Player) => {
      if (player.id === data.takerId) {
        scores[player.id] = finalScore * 3; // Preneur prend 3x
      } else {
        scores[player.id] = -finalScore; // Défenseurs perdent
      }
    });

    return scores;
  }, [session?.players]);

  // Handle round submission
  const handleSubmitRound = async () => {
    if (!session || newRound.takerId === 0) return;

    try {
      const scores = calculateTarotScore(newRound);
      const scoresArray = Object.entries(scores).map(([playerId, score]) => ({
        playerId: Number(playerId),
        score
      }));

      await scoreActions.submitRound(scoresArray, {
        taker_id: newRound.takerId,
        contract: newRound.contract,
        points: newRound.points,
        oudlers: newRound.oudlers,
        petit_au_bout: newRound.petitAuBout,
        chelem: newRound.chelem
      });

      // Reset form
      setNewRound({
        takerId: 0,
        contract: 'Prise',
        points: 0,
        oudlers: 0,
        petitAuBout: false,
        chelem: false
      });
    } catch (error) {
      console.error('Error submitting round:', error);
    }
  };

  // Calculate player totals
  const calculatePlayerTotal = (playerId: number): number => {
    if (!session?.rounds) return 0;
    return session.rounds.reduce((total, round) => {
      return total + (round.scores[playerId] || 0);
    }, 0);
  };

  // Get ranking
  const getPlayerRanking = (): Player[] => {
    if (!session?.players) return [];
    
    return [...session.players]
      .map(player => ({
        ...player,
        total_score: calculatePlayerTotal(player.id)
      }))
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  };

  // Loading state
  if (!isConnected && !session && !error) {
    return <LoadingState message="Connexion à la partie de Tarot..." />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onBack={goToDashboard} />;
  }

  // Join session form (if user needs to join and session is waiting)
  if (session && currentUserId && !isUserInSession(session.players, currentUserId) && session.status === 'waiting') {
    return (
      <JoinSessionForm
        sessionName={session.session_name}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        onJoin={handleJoinSession}
        onCancel={goToDashboard}
        isJoining={joiningSession}
      />
    );
  }

  // Waiting room
  if (session && session.status === 'waiting') {
    return (
      <WaitingRoom
        session={session}
        currentUserId={currentUserId}
        onStartGame={handleStartGame}
        onBack={goToDashboard}
      />
    );
  }

  // Session not found
  if (!session) {
    return <SessionNotFound onBack={goToDashboard} />;
  }

  return (
    <GameLayout
      title={session.session_name}
      subtitle={`Code: ${session.session_code}`}
      onBack={goToDashboard}
      rightContent={
        <RankingSidebar 
          players={getPlayerRanking()} 
          currentRound={session.current_round}
          scoreTarget={session.score_target}
        />
      }
    >
      {/* Status bar using our shared component */}
      <StatusBar 
        connectionStatus={connectionStatus}
        playersCount={session.players.length}
        isEditing={scoreActions.isAnySaving}
        lastUpdate={lastUpdate}
        gameStatus={session.status}
      />

      {/* Round input form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Crown className="inline w-5 h-5 mr-2" />
          Nouvelle manche
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Preneur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preneur
            </label>
            <select
              value={newRound.takerId}
              onChange={(e) => setNewRound(prev => ({ ...prev, takerId: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={0}>Sélectionner</option>
              {session.players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.player_name}
                </option>
              ))}
            </select>
          </div>

          {/* Contrat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contrat
            </label>
            <select
              value={newRound.contract}
              onChange={(e) => setNewRound(prev => ({ ...prev, contract: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {TAROT_CONTRACTS.map(contract => (
                <option key={contract.name} value={contract.name}>
                  {contract.name}
                </option>
              ))}
            </select>
          </div>

          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Points
            </label>
            <ScoreInput
              value={newRound.points}
              onChange={(value) => setNewRound(prev => ({ ...prev, points: Number(value) || 0 }))}
              min={0}
              max={91}
              className="w-full"
            />
          </div>

          {/* Oudlers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Oudlers
            </label>
            <select
              value={newRound.oudlers}
              onChange={(e) => setNewRound(prev => ({ ...prev, oudlers: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {[0, 1, 2, 3].map(count => (
                <option key={count} value={count}>
                  {count} oudler{count > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bonuses */}
        <div className="flex gap-4 mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={newRound.petitAuBout}
              onChange={(e) => setNewRound(prev => ({ ...prev, petitAuBout: e.target.checked }))}
              className="mr-2"
            />
            Petit au bout (+10)
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={newRound.chelem}
              onChange={(e) => setNewRound(prev => ({ ...prev, chelem: e.target.checked }))}
              className="mr-2"
            />
            Chelem (+400/800)
          </label>
        </div>

        {/* Submit button */}
        <div className="mt-4">
          <button
            onClick={handleSubmitRound}
            disabled={newRound.takerId === 0 || scoreActions.isAnySaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
          >
            {scoreActions.isAnySaving ? 'Enregistrement...' : 'Valider la manche'}
          </button>
        </div>
      </div>

      {/* Rounds history */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Manche
                </th>
                {session.players.map(player => (
                  <th key={player.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {player.player_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {session.rounds?.map((round, index) => (
                <tr key={round.round_number} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                    Manche {round.round_number}
                  </td>
                  {session.players.map(player => (
                    <td key={player.id} className="px-4 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                      {round.scores[player.id] || 0}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                <td className="px-4 py-4 text-gray-900 dark:text-gray-100">
                  Total
                </td>
                {session.players.map(player => (
                  <td key={player.id} className="px-4 py-4 text-center text-gray-900 dark:text-gray-100">
                    {calculatePlayerTotal(player.id)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </GameLayout>
  );
}