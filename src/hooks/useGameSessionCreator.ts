'use client';

import { useState, useEffect, useCallback } from 'react';
import { notify } from '@/lib/toast';
import { getGuestId, trackGuestSession, isGuest } from '@/lib/guestAuth';
import { authenticatedFetch } from '@/lib/authClient';
import { initializeGameSession, validateGameSession, type Game as GameTeamLogicGame } from '@/lib/gameTeamLogic';

export interface Player {
  name: string;
}

export interface Team {
  name: string;
  players: string[];
}

// Use the Game interface from gameTeamLogic for consistency
export interface Game extends GameTeamLogicGame {}

export interface GameSessionCreatorState {
  sessionName: string;
  players: Player[];
  teams: Team[];
  hasScoreTarget: boolean;
  scoreTarget: string;
  finishCurrentRound: boolean;
  scoreDirection: 'higher' | 'lower';
  loading: boolean;
  suggestedPlayers: string[];
}

export function useGameSessionCreator(game?: Game | null) {
  
  const [state, setState] = useState<GameSessionCreatorState>({
    sessionName: '',
    players: [{ name: '' }, { name: '' }],
    teams: [],
    hasScoreTarget: false,
    scoreTarget: '',
    finishCurrentRound: false,
    scoreDirection: 'higher',
    loading: false,
    suggestedPlayers: []
  });

  useEffect(() => {
    fetchSuggestedPlayers();
  }, []);

  useEffect(() => {
    if (game) {
      initializePlayers(game);
    }
  }, [game]);

  const fetchSuggestedPlayers = async () => {
    try {
      const response = await authenticatedFetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        const playerNames = (data.players || []).map((player: { player_name: string }) => player.player_name);
        setState(prev => ({ ...prev, suggestedPlayers: playerNames }));
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const initializePlayers = (game: Game) => {
    const { teams, players } = initializeGameSession(game);
    setState(prev => ({ ...prev, teams, players }));
  };

  const updatePlayer = useCallback((index: number, name: string) => {
    setState(prev => ({
      ...prev,
      players: prev.players.map((player, i) => 
        i === index ? { name } : player
      )
    }));
  }, []);

  const updateTeamPlayer = useCallback((teamIndex: number, playerIndex: number, name: string) => {
    setState(prev => ({
      ...prev,
      teams: prev.teams.map((team, tIdx) =>
        tIdx === teamIndex 
          ? {
              ...team,
              players: team.players.map((player, pIdx) =>
                pIdx === playerIndex ? name : player
              )
            }
          : team
      )
    }));
  }, []);

  const addPlayer = useCallback(() => {
    setState(prev => {
      if (!game || prev.players.length >= game.max_players) return prev;
      return {
        ...prev,
        players: [...prev.players, { name: '' }]
      };
    });
  }, [game]);

  const removePlayer = useCallback((index: number) => {
    setState(prev => {
      // Prevent removing the last player (must have at least 1)
      if (prev.players.length <= 1) return prev;
      return {
        ...prev,
        players: prev.players.filter((_, i) => i !== index)
      };
    });
  }, []);

  const validateSession = useCallback((game?: Game | null) => {
    const validPlayers = game?.team_based 
      ? state.teams.flatMap(team => team.players).filter(p => p.trim())
      : state.players.map(p => p.name).filter(p => p.trim());
    
    // Use centralized validation logic for minimum players
    const gameValidationError = validateGameSession(game, state.teams, state.players);
    if (gameValidationError) {
      return gameValidationError;
    }

    // Enforce max_players limit
    if (game && validPlayers.length > game.max_players) {
      return `Maximum ${game.max_players} joueurs autorisés`;
    }

    if (state.hasScoreTarget && (!state.scoreTarget || parseInt(state.scoreTarget) <= 0)) {
      return 'Veuillez saisir un score cible valide';
    }

    return null;
  }, [state.players, state.teams, state.hasScoreTarget, state.scoreTarget]);

  const createSession = useCallback(async (apiEndpoint: string, additionalPayload: Record<string, unknown> = {}) => {
    const validationError = validateSession(game);
    if (validationError) {
      notify.error(validationError);
      return null;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const basePayload = {
        sessionName: state.sessionName.trim() || (game ? `Partie de ${game.name}` : 'Partie avec scores simples'),
        hasScoreTarget: state.hasScoreTarget,
        scoreTarget: state.hasScoreTarget ? parseInt(state.scoreTarget) : null,
        finishCurrentRound: state.hasScoreTarget ? state.finishCurrentRound : false,
        scoreDirection: state.scoreDirection,
        ...additionalPayload
      };

      const payload = game?.team_based 
        ? { ...basePayload, teams: state.teams }
        : { 
            ...basePayload, 
            players: state.players.map(p => p.name).filter(p => p.trim())
          };

      // For guests, add guest ID to payload
      const finalPayload = isGuest() 
        ? { ...payload, guestId: getGuestId() }
        : payload;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies if any
        body: JSON.stringify(finalPayload),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Track session for guests
        if (isGuest() && data.sessionId && game) {
          trackGuestSession({
            sessionId: data.sessionId,
            sessionCode: data.sessionCode,
            gameSlug: game.slug,
            gameName: game.name,
            sessionName: state.sessionName.trim() || `Partie de ${game.name}`,
            createdAt: new Date().toISOString(),
            role: 'host'
          });
        }
        
        return data;
      } else {
        const data = await response.json();
        notify.error(data.error || 'Erreur lors de la création');
        return null;
      }
    } catch (error) {
      console.error('Session creation error:', error);
      notify.error('Erreur de connexion');
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [game, state.sessionName, state.players, state.teams, state.hasScoreTarget, state.scoreTarget, state.finishCurrentRound, state.scoreDirection, validateSession]);

  const updateState = useCallback((updates: Partial<GameSessionCreatorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    state,
    updateState,
    updatePlayer,
    updateTeamPlayer,
    addPlayer,
    removePlayer,
    createSession,
    validateSession
  };
}