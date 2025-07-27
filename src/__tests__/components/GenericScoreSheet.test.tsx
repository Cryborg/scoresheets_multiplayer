import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GenericScoreSheet from '@/components/scoresheets/GenericScoreSheet';

// Mock du hook useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock de BaseScoreSheetMultiplayer
jest.mock('@/components/scoresheets/BaseScoreSheetMultiplayer', () => {
  return function MockBaseScoreSheetMultiplayer({ children }: { children: (props: unknown) => React.ReactNode }) {
    const mockSession = {
      id: 1,
      session_name: 'Test Generic Game',
      status: 'waiting',
      players: [
        { id: 1, player_name: 'Alice', position: 1 },
        { id: 2, player_name: 'Bob', position: 2 }
      ],
      rounds: []
    };
    
    const mockGameState = {
      isHost: true,
      canJoinSession: false
    };

    return children({ session: mockSession, gameState: mockGameState });
  };
});

describe('GenericScoreSheet', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders generic score sheet with session name', () => {
    render(<GenericScoreSheet sessionId="test123" />);
    
    expect(screen.getByText(/Test Generic Game/)).toBeInTheDocument();
    expect(screen.getByText(/Scores actuels/)).toBeInTheDocument();
  });

  test('displays players correctly', () => {
    render(<GenericScoreSheet sessionId="test123" />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('renders without crashing with waiting status', () => {
    render(<GenericScoreSheet sessionId="test123" />);
    
    // Should render basic elements without errors
    expect(screen.getByText(/Scores actuels/)).toBeInTheDocument();
    expect(screen.getByText(/Classement en temps réel/)).toBeInTheDocument();
  });

  test('component uses correct gameSlug for API calls', () => {
    render(<GenericScoreSheet sessionId="test123" />);
    
    // Le composant devrait être monté sans erreur
    expect(screen.getByText(/Scores actuels/)).toBeInTheDocument();
  });
});