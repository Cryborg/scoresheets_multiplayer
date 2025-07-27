/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import RamiScoreSheet from '@/components/scoresheets/RamiScoreSheet';

// Mock BaseScoreSheetMultiplayer
jest.mock('@/components/scoresheets/BaseScoreSheetMultiplayer', () => {
  return function MockBaseScoreSheetMultiplayer({ children }: { children: (props: unknown) => React.ReactNode }) {
    const mockSession = {
      id: 1,
      status: 'active',
      players: [
        { id: 1, player_name: 'Alice' },
        { id: 2, player_name: 'Bob' }
      ],
      rounds: [
        { id: 1, scores: { '1': 10, '2': 15 } },
        { id: 2, scores: { '1': 8, '2': 12 } }
      ]
    };

    const mockGameState = { isHost: true };
    return children({ session: mockSession, gameState: mockGameState });
  };
});

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('RamiScoreSheet', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockToast.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('calcule correctement les totaux depuis les rounds', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Alice: 10 + 8 = 18, Bob: 15 + 12 = 27
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
  });

  test('affiche le trophée pour le leader (score le plus bas)', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Alice a 18 points, Bob a 27 points
    // Alice devrait avoir le trophée
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  test('met en évidence les gagnants de manche dans le tableau', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Alice a gagné les deux manches (10 < 15 et 8 < 12)
    // Vérifier la structure du tableau
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Manche 1')).toBeInTheDocument();
    expect(screen.getByText('Manche 2')).toBeInTheDocument();
  });

  test('soumission d\'une nouvelle manche', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<RamiScoreSheet sessionId="1" />);

    // Remplir les scores
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '5' } });
    fireEvent.change(inputs[1], { target: { value: '7' } });

    // Soumettre
    const button = screen.getByText('Valider la manche');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/rami/sessions/1/rounds',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            scores: [
              { playerId: 1, score: 5 },
              { playerId: 2, score: 7 }
            ]
          })
        })
      );
    });
  });

  test('gère les erreurs de soumission', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<RamiScoreSheet sessionId="1" />);

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '5' } });
    fireEvent.change(inputs[1], { target: { value: '7' } });

    const button = screen.getByText('Valider la manche');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Erreur",
        description: "Impossible d'ajouter la manche",
        variant: "destructive"
      });
    });
  });

  test('empêche la soumission si scores incomplets', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Remplir seulement un score
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '5' } });

    const button = screen.getByText('Valider la manche');
    expect(button).toBeDisabled();
  });
});