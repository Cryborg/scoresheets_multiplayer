'use client';

interface SessionData {
  sessionId: string;
  gameSlug: string;
  sessionCode: string;
  playerName?: string;
  joinedAt: string;
  lastActivity: string;
}

interface StoredSessions {
  [sessionId: string]: SessionData;
}

const STORAGE_KEY = 'scoresheets_sessions';
const MAX_STORED_SESSIONS = 10;
const SESSION_EXPIRY_DAYS = 7;

// Utilitaires de stockage local sécurisé
class SessionStorageManager {
  private isClient = typeof window !== 'undefined';

  private getStoredSessions(): StoredSessions {
    if (!this.isClient) return {};
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};
      
      const sessions = JSON.parse(stored) as StoredSessions;
      
      // Nettoyer les sessions expirées
      const now = new Date();
      const validSessions: StoredSessions = {};
      
      Object.entries(sessions).forEach(([id, session]) => {
        const sessionDate = new Date(session.lastActivity);
        const daysDiff = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < SESSION_EXPIRY_DAYS) {
          validSessions[id] = session;
        }
      });
      
      return validSessions;
    } catch (error) {
      console.error('Error reading stored sessions:', error);
      return {};
    }
  }

  private saveStoredSessions(sessions: StoredSessions): void {
    if (!this.isClient) return;
    
    try {
      // Limiter le nombre de sessions stockées (garder les plus récentes)
      const sessionEntries = Object.entries(sessions);
      if (sessionEntries.length > MAX_STORED_SESSIONS) {
        sessionEntries.sort((a, b) => 
          new Date(b[1].lastActivity).getTime() - new Date(a[1].lastActivity).getTime()
        );
        
        const limitedSessions: StoredSessions = {};
        sessionEntries.slice(0, MAX_STORED_SESSIONS).forEach(([id, session]) => {
          limitedSessions[id] = session;
        });
        sessions = limitedSessions;
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving stored sessions:', error);
    }
  }

  // Sauvegarder une session
  saveSession(sessionData: SessionData): void {
    const sessions = this.getStoredSessions();
    sessions[sessionData.sessionId] = {
      ...sessionData,
      lastActivity: new Date().toISOString()
    };
    this.saveStoredSessions(sessions);
  }

  // Récupérer une session
  getSession(sessionId: string): SessionData | null {
    const sessions = this.getStoredSessions();
    return sessions[sessionId] || null;
  }

  // Mettre à jour l'activité d'une session
  updateSessionActivity(sessionId: string): void {
    const sessions = this.getStoredSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].lastActivity = new Date().toISOString();
      this.saveStoredSessions(sessions);
    }
  }

  // Obtenir toutes les sessions récentes
  getRecentSessions(limit = 5): SessionData[] {
    const sessions = this.getStoredSessions();
    return Object.values(sessions)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, limit);
  }

  // Supprimer une session
  removeSession(sessionId: string): void {
    const sessions = this.getStoredSessions();
    delete sessions[sessionId];
    this.saveStoredSessions(sessions);
  }

  // Nettoyer toutes les sessions
  clearAllSessions(): void {
    if (this.isClient) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Vérifier si une session peut être reconnectée
  canReconnect(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;
    
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    // Permettre la reconnexion si moins de 24h d'inactivité
    return hoursSinceActivity < 24;
  }
}

// Instance singleton
export const sessionStorage = new SessionStorageManager();

// Hook pour gérer la persistance des sessions
export function useSessionPersistence() {
  const saveCurrentSession = (sessionId: string, gameSlug: string, sessionCode: string, playerName?: string) => {
    const sessionData: SessionData = {
      sessionId,
      gameSlug,
      sessionCode,
      playerName,
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    sessionStorage.saveSession(sessionData);
  };

  const updateActivity = (sessionId: string) => {
    sessionStorage.updateSessionActivity(sessionId);
  };

  const getRecentSessions = () => {
    return sessionStorage.getRecentSessions();
  };

  const canReconnectToSession = (sessionId: string) => {
    return sessionStorage.canReconnect(sessionId);
  };

  const removeSession = (sessionId: string) => {
    sessionStorage.removeSession(sessionId);
  };

  return {
    saveCurrentSession,
    updateActivity,
    getRecentSessions,
    canReconnectToSession,
    removeSession
  };
}

// Utilitaire pour la reconnexion automatique
export async function attemptSessionReconnection(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/status`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Vérifier si la session est encore active et accepte les reconnexions
      return data.status === 'active' || data.status === 'waiting';
    }
    
    return false;
  } catch (error) {
    console.error('Session reconnection check failed:', error);
    return false;
  }
}

export default sessionStorage;