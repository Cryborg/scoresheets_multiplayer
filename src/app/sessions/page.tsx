'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Clock, Play, Trash2, Square, Calendar } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';
import AuthGuard from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Session {
  id: number;
  session_name: string;
  game_name: string;
  game_slug: string;
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled';
  current_players: number;
  max_players: number;
  created_at: string;
  last_activity: string;
  is_host: boolean;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'completed'>('all');
  const { toast } = useToast();

  const fetchSessions = async () => {
    try {
      const response = await authenticatedFetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        console.error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleEndSession = async (sessionId: number) => {
    try {
      const response = await authenticatedFetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "Partie terminée",
          description: "La partie a été marquée comme terminée"
        });
        fetchSessions(); // Refresh the list
      } else {
        const data = await response.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de terminer la partie",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette partie ? Cette action est irréversible.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Partie supprimée",
          description: "La partie a été supprimée définitivement"
        });
        fetchSessions(); // Refresh the list
      } else {
        const data = await response.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de supprimer la partie",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'paused': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusText = (status: Session['status']) => {
    switch (status) {
      case 'waiting': return 'En attente';
      case 'active': return 'En cours';
      case 'paused': return 'En pause';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Chargement des parties...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Mes Parties
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gérez vos parties en cours et passées
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Toutes', count: sessions.length },
                { key: 'waiting', label: 'En attente', count: sessions.filter(s => s.status === 'waiting').length },
                { key: 'active', label: 'En cours', count: sessions.filter(s => s.status === 'active').length },
                { key: 'completed', label: 'Terminées', count: sessions.filter(s => s.status === 'completed').length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  } border border-gray-200 dark:border-gray-600`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Sessions List */}
          {filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Aucune partie trouvée
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {filter === 'all' 
                    ? "Vous n'avez participé à aucune partie pour le moment."
                    : `Aucune partie ${getStatusText(filter as any).toLowerCase()} trouvée.`
                  }
                </p>
                <Link href="/dashboard">
                  <Button>
                    Créer une nouvelle partie
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredSessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {session.session_name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                            {getStatusText(session.status)}
                          </span>
                          {session.is_host && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                              Hôte
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{session.game_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{session.current_players}/{session.max_players}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Créée le {formatDate(session.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {(session.status === 'waiting' || session.status === 'active') && (
                          <Link href={`/games/${session.game_slug}/${session.id}`}>
                            <Button variant="default" size="sm">
                              <Play className="h-4 w-4 mr-1" />
                              Rejoindre
                            </Button>
                          </Link>
                        )}
                        
                        {session.is_host && session.status === 'completed' && (
                          <Link href={`/games/${session.game_slug}/${session.id}`}>
                            <Button variant="outline" size="sm">
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reprendre
                            </Button>
                          </Link>
                        )}
                        
                        {session.is_host && (session.status === 'waiting' || session.status === 'active') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEndSession(session.id)}
                          >
                            <Square className="h-4 w-4 mr-1" />
                            Terminer
                          </Button>
                        )}
                        
                        {session.is_host && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}