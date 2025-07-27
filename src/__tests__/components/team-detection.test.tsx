import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameSessionWithRounds } from '../../types/multiplayer';

// Mock du hook useMultiplayerGame

// Mock du component parent pour tester la logique de détection d'équipes
const TeamDetectionTest = ({ session, currentUserId }: { 
  session: GameSessionWithRounds;
  currentUserId: number;
}) => {
  // Logique extraite du composant réel MilleBornesEquipesScoreSheetMultiplayerTeam
  const getTeamDetection = () => {
    if (!session?.players) {
      return { myTeamPlayers: [], otherTeamPlayers: [], displayTeamId: 1 };
    }
    
    const currentPlayer = session.players.find(p => p.user_id === currentUserId);
    
    if (!currentPlayer) {
      return { myTeamPlayers: [], otherTeamPlayers: [], displayTeamId: 1 };
    }
    
    // Primary method: Use team_id from player record
    const myTeamId = currentPlayer.team_id;
    
    if (myTeamId) {
      const myPlayers = session.players.filter(p => p.team_id === myTeamId);
      const otherPlayers = session.players.filter(p => p.team_id && p.team_id !== myTeamId);
      
      // Convert database team IDs to display IDs (1 or 2)
      let displayId = 1;
      if (myTeamId === 1) displayId = 1;
      else if (myTeamId === 2) displayId = 2;
      else if (myTeamId >= 21 && myTeamId <= 22) displayId = myTeamId - 20; // Convert 21->1, 22->2
      else displayId = 1; // Fallback to team 1 for any other ID
      
      return { 
        myTeamPlayers: myPlayers, 
        otherTeamPlayers: otherPlayers, 
        displayTeamId: displayId
      };
    }
    
    // Fallback method: Try session.teams structure
    if (session.teams && session.teams.length > 0) {
      const myTeam = session.teams.find(team => 
        team.players?.some(p => p.user_id === currentUserId)
      );
      
      if (myTeam) {
        const otherTeam = session.teams.find(team => team.id !== myTeam.id);
        const displayId = session.teams.indexOf(myTeam) + 1;
        
        return {
          myTeamPlayers: myTeam.players || [],
          otherTeamPlayers: otherTeam?.players || [],
          displayTeamId: displayId
        };
      }
    }
    
    return { myTeamPlayers: [], otherTeamPlayers: [], displayTeamId: 1 };
  };

  const { myTeamPlayers, otherTeamPlayers, displayTeamId } = getTeamDetection();

  return (
    <div>
      <div data-testid="my-team-count">{myTeamPlayers.length}</div>
      <div data-testid="other-team-count">{otherTeamPlayers.length}</div>
      <div data-testid="display-team-id">{displayTeamId}</div>
      <div data-testid="my-team-names">
        {myTeamPlayers.map(p => p.player_name).join(', ')}
      </div>
      <div data-testid="other-team-names">
        {otherTeamPlayers.map(p => p.player_name).join(', ')}
      </div>
    </div>
  );
};

describe('Team Detection Logic', () => {
  describe('Primary Method - team_id from player record', () => {
    it('should detect team 1 correctly (database ID = 1)', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', team_id: 1, user_id: 123, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', team_id: 1, user_id: 456, is_connected: 1, is_ready: 1, position: 1 },
          { id: 3, player_name: 'Charlie', team_id: 2, user_id: 789, is_connected: 1, is_ready: 1, position: 2 },
          { id: 4, player_name: 'David', team_id: 2, user_id: 999, is_connected: 1, is_ready: 1, position: 3 }
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('my-team-count')).toHaveTextContent('2');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('2');
      expect(screen.getByTestId('display-team-id')).toHaveTextContent('1');
      expect(screen.getByTestId('my-team-names')).toHaveTextContent('Alice, Bob');
      expect(screen.getByTestId('other-team-names')).toHaveTextContent('Charlie, David');
    });

    it('should detect team 2 correctly (database ID = 2)', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', team_id: 1, user_id: 456, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', team_id: 1, user_id: 789, is_connected: 1, is_ready: 1, position: 1 },
          { id: 3, player_name: 'Charlie', team_id: 2, user_id: 123, is_connected: 1, is_ready: 1, position: 2 },
          { id: 4, player_name: 'David', team_id: 2, user_id: 999, is_connected: 1, is_ready: 1, position: 3 }
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('my-team-count')).toHaveTextContent('2');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('2');
      expect(screen.getByTestId('display-team-id')).toHaveTextContent('2');
      expect(screen.getByTestId('my-team-names')).toHaveTextContent('Charlie, David');
      expect(screen.getByTestId('other-team-names')).toHaveTextContent('Alice, Bob');
    });

    it('should convert database ID 21 to display ID 1', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', team_id: 21, user_id: 123, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', team_id: 21, user_id: 456, is_connected: 1, is_ready: 1, position: 1 },
          { id: 3, player_name: 'Charlie', team_id: 22, user_id: 789, is_connected: 1, is_ready: 1, position: 2 },
          { id: 4, player_name: 'David', team_id: 22, user_id: 999, is_connected: 1, is_ready: 1, position: 3 }
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('display-team-id')).toHaveTextContent('1'); // 21 - 20 = 1
      expect(screen.getByTestId('my-team-count')).toHaveTextContent('2');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('2');
    });

    it('should convert database ID 22 to display ID 2', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', team_id: 21, user_id: 456, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', team_id: 21, user_id: 789, is_connected: 1, is_ready: 1, position: 1 },
          { id: 3, player_name: 'Charlie', team_id: 22, user_id: 123, is_connected: 1, is_ready: 1, position: 2 },
          { id: 4, player_name: 'David', team_id: 22, user_id: 999, is_connected: 1, is_ready: 1, position: 3 }
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('display-team-id')).toHaveTextContent('2'); // 22 - 20 = 2
      expect(screen.getByTestId('my-team-count')).toHaveTextContent('2');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('2');
    });

    it('should handle edge case team IDs (fallback to 1)', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', team_id: 999, user_id: 123, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', team_id: 999, user_id: 456, is_connected: 1, is_ready: 1, position: 1 }
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('display-team-id')).toHaveTextContent('1'); // Fallback
      expect(screen.getByTestId('my-team-count')).toHaveTextContent('2');
    });
  });

  describe('Fallback Method - session.teams structure', () => {
    it('should use teams structure when player team_id is missing', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', user_id: 123, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', user_id: 456, is_connected: 1, is_ready: 1, position: 1 }
          // No team_id on players
        ],
        teams: [
          {
            id: 1,
            team_name: 'Équipe 1',
            players: [
              { id: 1, player_name: 'Alice', user_id: 123, is_connected: 1, is_ready: 1, position: 0 },
              { id: 2, player_name: 'Bob', user_id: 456, is_connected: 1, is_ready: 1, position: 1 }
            ]
          },
          {
            id: 2,
            team_name: 'Équipe 2',
            players: [
              { id: 3, player_name: 'Charlie', user_id: 789, is_connected: 1, is_ready: 1, position: 2 },
              { id: 4, player_name: 'David', user_id: 999, is_connected: 1, is_ready: 1, position: 3 }
            ]
          }
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('my-team-count')).toHaveTextContent('2');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('2');
      expect(screen.getByTestId('display-team-id')).toHaveTextContent('1'); // First team in array
      expect(screen.getByTestId('my-team-names')).toHaveTextContent('Alice, Bob');
      expect(screen.getByTestId('other-team-names')).toHaveTextContent('Charlie, David');
    });

    it('should calculate display ID based on team position in array', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', user_id: 456, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', user_id: 123, is_connected: 1, is_ready: 1, position: 1 }
        ],
        teams: [
          {
            id: 10,
            team_name: 'First Team',
            players: [
              { id: 1, player_name: 'Alice', user_id: 456, is_connected: 1, is_ready: 1, position: 0 }
            ]
          },
          {
            id: 20,
            team_name: 'Second Team',
            players: [
              { id: 2, player_name: 'Bob', user_id: 123, is_connected: 1, is_ready: 1, position: 1 }
            ]
          }
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('display-team-id')).toHaveTextContent('2'); // Second team in array (index 1 + 1)
      expect(screen.getByTestId('my-team-names')).toHaveTextContent('Bob');
      expect(screen.getByTestId('other-team-names')).toHaveTextContent('Alice');
    });
  });

  describe('Error Handling', () => {
    it('should return defaults when no session provided', () => {
      const session = null as any;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('my-team-count')).toHaveTextContent('0');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('0');
      expect(screen.getByTestId('display-team-id')).toHaveTextContent('1');
    });

    it('should return defaults when no players found', () => {
      const session = {
        id: 123,
        players: []
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('my-team-count')).toHaveTextContent('0');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('0');
      expect(screen.getByTestId('display-team-id')).toHaveTextContent('1');
    });

    it('should return defaults when current user not found', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', team_id: 1, user_id: 456, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', team_id: 1, user_id: 789, is_connected: 1, is_ready: 1, position: 1 }
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={999} />); // User not in session

      expect(screen.getByTestId('my-team-count')).toHaveTextContent('0');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('0');
      expect(screen.getByTestId('display-team-id')).toHaveTextContent('1');
    });

    it('should handle empty teams array gracefully', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', user_id: 123, is_connected: 1, is_ready: 1, position: 0 }
          // No team_id
        ],
        teams: [] // Empty teams array
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('my-team-count')).toHaveTextContent('0');
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('0');
      expect(screen.getByTestId('display-team-id')).toHaveTextContent('1');
    });
  });

  describe('Mixed Team Scenarios', () => {
    it('should filter out players without team_id from other teams', () => {
      const session = {
        id: 123,
        players: [
          { id: 1, player_name: 'Alice', team_id: 1, user_id: 123, is_connected: 1, is_ready: 1, position: 0 },
          { id: 2, player_name: 'Bob', team_id: 1, user_id: 456, is_connected: 1, is_ready: 1, position: 1 },
          { id: 3, player_name: 'Charlie', team_id: 2, user_id: 789, is_connected: 1, is_ready: 1, position: 2 },
          { id: 4, player_name: 'David', user_id: 999, is_connected: 1, is_ready: 1, position: 3 }
          // David has no team_id - should not appear in other teams
        ]
      } as GameSessionWithRounds;

      render(<TeamDetectionTest session={session} currentUserId={123} />);

      expect(screen.getByTestId('my-team-count')).toHaveTextContent('2'); // Alice + Bob
      expect(screen.getByTestId('other-team-count')).toHaveTextContent('1'); // Only Charlie (David filtered out)
      expect(screen.getByTestId('other-team-names')).toHaveTextContent('Charlie');
    });
  });
});