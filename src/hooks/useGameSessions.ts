import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch, isAuthenticated } from '@/lib/authClient';

interface GameSession {
  id: number;
  session_name: string;
  game_name: string;
  game_slug: string;
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled';
  current_players: number;
  max_players: number;
  created_at: string;
  last_activity: string;
  ended_at?: string;
  is_host: boolean;
  players: string[];
}

export function useGameSessions(gameSlug: string) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGameSessions = useCallback(async () => {
    // Si l'utilisateur n'est pas authentifié, ne pas faire d'appel API
    if (!isAuthenticated()) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/sessions');
      
      if (response.ok) {
        const data = await response.json();
        const allSessions: GameSession[] = data.sessions || [];
        
        // Filtrer les sessions de ce jeu qui ne sont pas cancelled
        const gameSessions = allSessions
          .filter(session => 
            session.game_slug === gameSlug && 
            session.status !== 'cancelled'
          )
          .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
        
        setSessions(gameSessions);
      }
    } catch (error) {
      console.error('Error fetching sessions for game:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [gameSlug]);

  useEffect(() => {
    if (gameSlug) {
      fetchGameSessions();
    }
  }, [gameSlug, fetchGameSessions]);

  return {
    sessions,
    loading,
    hasSessions: sessions.length > 0,
    activeSessions: sessions.filter(s => s.status === 'active' || s.status === 'waiting'),
    completedSessions: sessions.filter(s => s.status === 'completed'),
    refetch: fetchGameSessions
  };
}