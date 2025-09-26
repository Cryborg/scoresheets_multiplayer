'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams, useSearchParams } from 'next/navigation';
import {
  User, Clock, Activity, LogIn,
  Gamepad2, Trophy, ArrowLeft, RefreshCw, Shield,
  Plus, Edit2, Trash2, UserCheck
} from 'lucide-react';
import GameCard from '@/components/layout/GameCard';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  created_at: string;
  last_seen?: string;
  is_admin: number;
  is_blocked?: number;
}

interface Statistics {
  totalGamesCreated: number;
  totalGamesJoined: number;
  totalGamesCompleted: number;
  lastLogin?: string;
  totalLogins: number;
}

interface LoginHistory {
  id: number;
  login_at: string;
  ip_address?: string;
  user_agent?: string;
}

interface ActivityHistory {
  id: number;
  activity_type: string;
  session_name?: string;
  game_name?: string;
  created_at: string;
  related_data?: string;
}

interface ManagedPlayer {
  id: number;
  player_name: string;
  games_played: number;
  last_played: string;
  created_at: string;
}

export default function UserProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivityHistory[]>([]);
  const [managedPlayers, setManagedPlayers] = useState<ManagedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<{ id: number; name: string } | null>(null);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params?.userId as string;
  const fromAdmin = searchParams?.get('from') === 'admin';
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/user/profile/${userId}`);

      if (response.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (response.status === 403) {
        const errorData = await response.json();
        setError(errorData.error || 'Accès interdit');
        return;
      }

      if (response.status === 404) {
        setError('Utilisateur non trouvé');
        return;
      }

      const data = await response.json();
      setUser(data.user);
      setStatistics(data.statistics);
      setLoginHistory(data.loginHistory);
      setActivityHistory(data.activityHistory);
      setIsOwnProfile(data.isOwnProfile);
      setIsAdminView(data.isAdminView);

      // Load managed players for own profile
      if (data.isOwnProfile) {
        try {
          const playersResponse = await fetch('/api/user/players');
          if (playersResponse.ok) {
            const playersData = await playersResponse.json();
            setManagedPlayers(playersData.players || []);
          }
        } catch (err) {
          console.error('Error loading managed players:', err);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Jamais';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Jamais';

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatActivityType = (type: string) => {
    switch (type) {
      case 'game_created':
        return 'Partie créée';
      case 'game_joined':
        return 'Partie rejointe';
      case 'game_completed':
        return 'Partie terminée';
      default:
        return type;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'game_created':
        return <Gamepad2 className="h-4 w-4 text-blue-500" />;
      case 'game_joined':
        return <LogIn className="h-4 w-4 text-green-500" />;
      case 'game_completed':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBackUrl = () => {
    if (fromAdmin || isAdminView) return '/admin/users';
    return '/dashboard';
  };

  const getBackLabel = () => {
    if (fromAdmin || isAdminView) return 'Retour à la liste des utilisateurs';
    return 'Retour au dashboard';
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;

    try {
      const response = await fetch('/api/user/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: newPlayerName.trim() })
      });

      if (response.ok) {
        setNewPlayerName('');
        setAddingPlayer(false);
        // Refresh players list
        const playersResponse = await fetch('/api/user/players');
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setManagedPlayers(playersData.players || []);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erreur lors de l&apos;ajout');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Erreur lors de l&apos;ajout');
    }
  };

  const handleEditPlayer = async (playerId: number) => {
    if (!editingPlayer?.name.trim()) return;

    try {
      const response = await fetch('/api/user/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerName: editingPlayer.name.trim()
        })
      });

      if (response.ok) {
        setEditingPlayer(null);
        // Refresh players list
        const playersResponse = await fetch('/api/user/players');
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setManagedPlayers(playersData.players || []);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Error editing player:', error);
      alert('Erreur lors de la modification');
    }
  };

  const handleDeletePlayer = async (playerId: number, playerName: string) => {
    const confirmed = await confirm({
      title: 'Supprimer le joueur',
      message: `Êtes-vous sûr de vouloir supprimer "${playerName}" de votre liste ?`,
      confirmLabel: 'Supprimer',
      isDangerous: true
    });

    if (!confirmed) return;

    try {
      const response = await fetch('/api/user/players', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });

      if (response.ok) {
        // Refresh players list
        const playersResponse = await fetch('/api/user/players');
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setManagedPlayers(playersData.players || []);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {error}
          </h3>
          <button
            onClick={() => router.push(getBackUrl())}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {getBackLabel()}
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Utilisateur non trouvé
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(getBackUrl())}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
            title={getBackLabel()}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {isOwnProfile ? 'Mon Profil' : `Profil de ${user.username}`}
              </h1>
              {user.is_admin === 1 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </span>
              )}
              {user.is_blocked === 1 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  Bloqué
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isAdminView && 'Vue administrateur • '}
              {isOwnProfile ? 'Gérez vos informations et consultez votre activité' : 'Informations et activité utilisateur'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchProfile}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* User Info */}
      <GameCard>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Informations personnelles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isAdminView && (
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">ID</div>
                <div className="font-medium text-gray-900 dark:text-white">{user.id}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Nom d'utilisateur</div>
              <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Email</div>
              <div className="font-medium text-gray-900 dark:text-white">{user.email}</div>
            </div>
            {user.display_name && (
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Nom d'affichage</div>
                <div className="font-medium text-gray-900 dark:text-white">{user.display_name}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Membre depuis</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatDateTime(user.created_at)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Dernière visite</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatDateTime(user.last_seen)}
              </div>
            </div>
          </div>
        </div>
      </GameCard>

      {/* Statistics */}
      {statistics && (
        <GameCard>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Statistiques
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {statistics.totalGamesCreated}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Parties créées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {statistics.totalGamesJoined}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Parties rejointes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {statistics.totalGamesCompleted}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Parties terminées</div>
              </div>
              {isAdminView && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {statistics.totalLogins}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Connexions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDateTime(statistics.lastLogin)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Dernière connexion</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </GameCard>
      )}

      {/* Activity History */}
      <GameCard>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Activité récente {isAdminView && '(30 derniers événements)'}
          </h2>
          {activityHistory.length > 0 ? (
            <div className="space-y-3">
              {activityHistory.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {getActivityIcon(activity.activity_type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatActivityType(activity.activity_type)}
                      </span>
                      {activity.game_name && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          • {activity.game_name}
                        </span>
                      )}
                    </div>
                    {activity.session_name && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {activity.session_name}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(activity.created_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Aucune activité récente</p>
            </div>
          )}
        </div>
      </GameCard>

      {/* Player Management - Own Profile Only */}
      {isOwnProfile && (
        <GameCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Mes joueurs
              </h2>
              {!addingPlayer && (
                <button
                  onClick={() => setAddingPlayer(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Gérez vos joueurs récurrents pour les retrouver facilement lors de la création de parties.
            </p>

            {addingPlayer && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Nom du joueur..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                  />
                  <button
                    onClick={handleAddPlayer}
                    disabled={!newPlayerName.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setAddingPlayer(false);
                      setNewPlayerName('');
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {managedPlayers.length > 0 ? (
              <div className="space-y-3">
                {managedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      {editingPlayer?.id === player.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingPlayer.name}
                            onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && handleEditPlayer(player.id)}
                          />
                          <button
                            onClick={() => handleEditPlayer(player.id)}
                            disabled={!editingPlayer.name.trim()}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Sauver
                          </button>
                          <button
                            onClick={() => setEditingPlayer(null)}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {player.player_name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {player.games_played > 0 ? (
                              `${player.games_played} partie${player.games_played > 1 ? 's' : ''}`
                            ) : (
                              'Jamais utilisé'
                            )}
                            {player.games_played > 0 && (
                              <> • Dernière: {formatDateTime(player.last_played)}</>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {editingPlayer?.id !== player.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingPlayer({ id: player.id, name: player.player_name })}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player.id, player.player_name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Aucun joueur enregistré</p>
                <p className="text-xs text-gray-400 mt-1">
                  Les joueurs que vous créez en partie seront automatiquement ajoutés ici
                </p>
              </div>
            )}
          </div>
        </GameCard>
      )}

      {/* Login History - Admin View Only */}
      {isAdminView && (
        <GameCard>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Historique des connexions (20 dernières)
            </h2>
            {loginHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-medium">
                        Date de connexion
                      </th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-medium">
                        Adresse IP
                      </th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300 font-medium">
                        Navigateur
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((login) => (
                      <tr
                        key={login.id}
                        className="border-b border-gray-200 dark:border-gray-600"
                      >
                        <td className="p-2 text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {formatDateTime(login.login_at)}
                          </div>
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400">
                          {login.ip_address || 'Non disponible'}
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400 text-xs">
                          {login.user_agent ? (
                            <div className="max-w-xs truncate" title={login.user_agent}>
                              {login.user_agent}
                            </div>
                          ) : (
                            'Non disponible'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <LogIn className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Aucune connexion enregistrée</p>
              </div>
            )}
          </div>
        </GameCard>
      )}

      <ConfirmDialog />
    </div>
  );
}