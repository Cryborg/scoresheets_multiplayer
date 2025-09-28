import Dexie, { Table } from 'dexie';

// Types pour le stockage offline
export interface OfflineGameSession {
  id: string; // UUID généré côté client
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
  team_based: boolean;
  offline_mode: boolean; // Marqueur pour sessions créées hors ligne
  server_id?: number; // ID serveur une fois synchronisé
  sync_status: 'pending' | 'synced' | 'conflict' | 'failed';
}

export interface OfflinePlayer {
  id: string; // UUID côté client
  session_id: string;
  name: string;
  position: number;
  team_id?: string;
  server_id?: number; // ID serveur une fois synchronisé
  sync_status: 'pending' | 'synced' | 'conflict' | 'failed';
}

export interface OfflineScore {
  id: string; // UUID côté client
  session_id: string;
  player_id: string;
  round_number?: number;
  category?: string;
  score: number;
  details?: Record<string, unknown>;
  created_at: string;
  server_id?: number; // ID serveur une fois synchronisé
  sync_status: 'pending' | 'synced' | 'conflict' | 'failed';
}

export interface OfflineAction {
  id: string; // UUID
  type: 'create_session' | 'join_session' | 'add_score' | 'update_session';
  session_id: string;
  data: Record<string, unknown>;
  created_at: string;
  retry_count: number;
  max_retries: number;
  priority: number; // 1 = haute, 5 = basse
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  error_message?: string;
}

export interface OfflineCache {
  id: string;
  url: string;
  method: string;
  data: Record<string, unknown>;
  timestamp: string;
  ttl: number; // Time to live en millisecondes
}

// Base de données IndexedDB
export class OfflineDatabase extends Dexie {
  sessions!: Table<OfflineGameSession>;
  players!: Table<OfflinePlayer>;
  scores!: Table<OfflineScore>;
  actions!: Table<OfflineAction>;
  cache!: Table<OfflineCache>;

  constructor() {
    super('OhSheetOfflineDB');

    this.version(1).stores({
      sessions: 'id, session_name, game_slug, status, offline_mode, sync_status, created_at',
      players: 'id, session_id, name, sync_status',
      scores: 'id, session_id, player_id, round_number, category, sync_status, created_at',
      actions: 'id, type, session_id, priority, sync_status, created_at',
      cache: 'id, url, timestamp'
    });
  }
}

// Instance globale
export const offlineDB = new OfflineDatabase();

// Utilitaires de génération d'ID
export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Service de gestion du stockage offline
export class OfflineStorageService {
  private db = offlineDB;

  // Sessions
  async createOfflineSession(sessionData: Omit<OfflineGameSession, 'id' | 'sync_status' | 'offline_mode'>): Promise<string> {
    const id = generateOfflineId();
    const session: OfflineGameSession = {
      ...sessionData,
      id,
      offline_mode: true,
      sync_status: 'pending'
    };

    await this.db.sessions.add(session);
    return id;
  }

  async getOfflineSession(id: string): Promise<OfflineGameSession | undefined> {
    return await this.db.sessions.get(id);
  }

  async getAllOfflineSessions(): Promise<OfflineGameSession[]> {
    return await this.db.sessions.toArray();
  }

  async updateOfflineSession(id: string, updates: Partial<OfflineGameSession>): Promise<void> {
    await this.db.sessions.update(id, {
      ...updates,
      last_activity: new Date().toISOString()
    });
  }

  // Players
  async addOfflinePlayer(playerData: Omit<OfflinePlayer, 'id' | 'sync_status'>): Promise<string> {
    const id = generateOfflineId();
    const player: OfflinePlayer = {
      ...playerData,
      id,
      sync_status: 'pending'
    };

    await this.db.players.add(player);
    return id;
  }

  async getOfflineSessionPlayers(sessionId: string): Promise<OfflinePlayer[]> {
    return await this.db.players.where('session_id').equals(sessionId).toArray();
  }

  // Scores
  async addOfflineScore(scoreData: Omit<OfflineScore, 'id' | 'sync_status' | 'created_at'>): Promise<string> {
    const id = generateOfflineId();
    const score: OfflineScore = {
      ...scoreData,
      id,
      created_at: new Date().toISOString(),
      sync_status: 'pending'
    };

    await this.db.scores.add(score);

    // Créer une action de synchronisation pour ce score
    await this.queueAction({
      type: 'add_score',
      session_id: scoreData.session_id,
      data: {
        sessionId: scoreData.session_id,
        playerId: scoreData.player_id,
        score: scoreData.score,
        roundNumber: scoreData.round_number,
        details: scoreData.details
      },
      priority: 2,
      max_retries: 3
    });

    return id;
  }

  async getOfflineSessionScores(sessionId: string): Promise<OfflineScore[]> {
    return await this.db.scores.where('session_id').equals(sessionId).toArray();
  }

  // Actions de synchronisation
  async queueAction(actionData: Omit<OfflineAction, 'id' | 'created_at' | 'retry_count' | 'sync_status'>): Promise<string> {
    const id = generateOfflineId();
    const action: OfflineAction = {
      ...actionData,
      id,
      created_at: new Date().toISOString(),
      retry_count: 0,
      sync_status: 'pending'
    };

    await this.db.actions.add(action);
    return id;
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    const actions = await this.db.actions
      .where('sync_status')
      .anyOf(['pending', 'failed'])
      .toArray();

    // Filtre les actions qui n'ont pas atteint le max de retry
    const pendingActions = actions.filter(action => action.retry_count < action.max_retries);

    // Trie par priorité après récupération
    return pendingActions.sort((a, b) => a.priority - b.priority);
  }

  async markActionAsSynced(actionId: string): Promise<void> {
    await this.db.actions.update(actionId, { sync_status: 'synced' });
  }

  async markActionAsFailed(actionId: string, errorMessage: string): Promise<void> {
    const action = await this.db.actions.get(actionId);
    if (action) {
      await this.db.actions.update(actionId, {
        sync_status: 'failed',
        retry_count: action.retry_count + 1,
        error_message: errorMessage
      });
    }
  }

  // Cache
  async setCache(url: string, method: string, data: Record<string, unknown>, ttl: number = 300000): Promise<void> {
    const id = `${method}_${url}`;
    const cache: OfflineCache = {
      id,
      url,
      method,
      data,
      timestamp: new Date().toISOString(),
      ttl
    };

    await this.db.cache.put(cache);
  }

  async getCache(url: string, method: string): Promise<Record<string, unknown> | null> {
    const id = `${method}_${url}`;
    const cache = await this.db.cache.get(id);

    if (!cache) return null;

    const now = Date.now();
    const cacheTime = new Date(cache.timestamp).getTime();

    if (now - cacheTime > cache.ttl) {
      await this.db.cache.delete(id);
      return null;
    }

    return cache.data;
  }

  // Suppression de session offline
  async deleteOfflineSession(sessionId: string): Promise<void> {
    // Supprimer la session
    await this.db.sessions.delete(sessionId);

    // Supprimer tous les joueurs de cette session
    const players = await this.db.players.where('session_id').equals(sessionId).toArray();
    const playerIds = players.map(p => p.id);
    await this.db.players.bulkDelete(playerIds);

    // Supprimer tous les scores de cette session
    const scores = await this.db.scores.where('session_id').equals(sessionId).toArray();
    const scoreIds = scores.map(s => s.id);
    await this.db.scores.bulkDelete(scoreIds);

    // Supprimer toutes les actions en attente pour cette session
    const actions = await this.db.actions.where('session_id').equals(sessionId).toArray();
    const actionIds = actions.map(a => a.id);
    await this.db.actions.bulkDelete(actionIds);
  }

  // Nettoyage
  async cleanExpiredCache(): Promise<void> {
    const now = Date.now();
    const expiredCaches = await this.db.cache
      .filter(cache => now - new Date(cache.timestamp).getTime() > cache.ttl)
      .toArray();

    const expiredIds = expiredCaches.map(cache => cache.id);
    await this.db.cache.bulkDelete(expiredIds);
  }

  async clearAllOfflineData(): Promise<void> {
    await this.db.sessions.clear();
    await this.db.players.clear();
    await this.db.scores.clear();
    await this.db.actions.clear();
    await this.db.cache.clear();
  }
}

// Instance globale du service
export const offlineStorage = new OfflineStorageService();