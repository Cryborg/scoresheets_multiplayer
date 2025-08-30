'use client';

import { useState } from 'react';
import { Users, Play, Copy, Check, UserPlus, Crown, ArrowLeft } from 'lucide-react';
import { Player } from '@/types/multiplayer';

interface GameSession {
  id: number;
  session_name: string;
  session_code: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  game_name: string;
  host_user_id: number;
  min_players: number;
  max_players: number;
  players: Player[];
}

interface WaitingRoomProps {
  session: GameSession;
  currentUserId: number | null;
  onStartGame: () => Promise<void>;
  onBack?: () => void;
}

export default function WaitingRoom({ session, currentUserId, onStartGame, onBack }: WaitingRoomProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = currentUserId === session.host_user_id;
  const connectedPlayers = session.players.filter(p => p.is_connected);
  const canStart = connectedPlayers.length >= session.min_players;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.session_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleStartGame = async () => {
    if (!canStart || isStarting) return;
    
    setIsStarting(true);
    try {
      await onStartGame();
    } catch (error) {
      console.error('Failed to start game:', error);
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Bar */}
      {onBack && (
        <nav className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button 
                  onClick={onBack}
                  className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-4 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {session.session_name}
                  </h1>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {session.game_name} • En attente de joueurs
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          {!onBack && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {session.session_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {session.game_name} • En attente de joueurs
              </p>
            </>
          )}
          
          {/* Session Code */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Code de partie:</span>
              <span className="ml-2 font-mono text-lg font-semibold text-blue-600 dark:text-blue-400">
                {session.session_code}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Copier le code"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 mb-6">
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Joueurs ({connectedPlayers.length}/{session.max_players})
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Minimum requis: {session.min_players}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {session.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    player.is_connected
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      player.is_connected 
                        ? 'bg-green-400' 
                        : 'bg-gray-400'
                    }`} />
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {player.player_name}
                      </span>
                      {player.user_id === session.host_user_id && (
                        <Crown className="h-4 w-4 text-yellow-500" title="Hôte" />
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    {player.is_connected ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Connecté
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        En attente...
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: session.max_players - session.players.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600"
                >
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <UserPlus className="h-4 w-4" />
                    <span>Place disponible</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          {isHost ? (
            <div className="text-center">
              <button
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  canStart && !isStarting
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <Play className="h-5 w-5" />
                {isStarting ? 'Démarrage...' : 'Commencer la partie'}
              </button>
              
              {!canStart && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Il faut au moins {session.min_players} joueur{session.min_players > 1 ? 's' : ''} pour commencer
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">
                En attente que l&apos;hôte démarre la partie...
              </p>
              {!canStart && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Il faut encore {session.min_players - connectedPlayers.length} joueur{session.min_players - connectedPlayers.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Share Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md text-center">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              <strong>Invitez vos amis :</strong>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Partagez le code <strong>{session.session_code}</strong> ou envoyez-leur le lien de cette page
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}