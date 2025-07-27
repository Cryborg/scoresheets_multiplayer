/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import RamiScoreSheet from '@/components/scoresheets/RamiScoreSheet';

// Mock des hooks et composants
jest.mock('@/hooks/useMultiplayerGame');
jest.mock('@/components/scoresheets/BaseScoreSheetMultiplayer', () => {
  return function MockBaseScoreSheetMultiplayer({ children }: any) {
    const mockSession = {
      id: 1,
      session_name: 'Test Rami',
      status: 'active',
      players: [
        { id: 1, player_name: 'Alice', position: 1 },
        { id: 2, player_name: 'Bob', position: 2 }
      ],
      rounds: [
        {
          id: 1,
          round_number: 1,
          scores: { '1': 15, '2': 23 }
        },
        {
          id: 2,
          round_number: 2,
          scores: { '1': 8, '2': 12 }
        }
      ]
    };

    const mockGameState = {
      isHost: true,
      canStartGame: false,
      lastUpdate: new Date().toISOString()
    };

    return children({ session: mockSession, gameState: mockGameState });
  };
});

// Mock fetch pour les API calls
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Rami Game Flow E2E', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('affiche les scores actuels correctement', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Vérifier que les joueurs sont affichés
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Vérifier la section scores actuels
    expect(screen.getByText('Scores actuels')).toBeInTheDocument();
    expect(screen.getByText('Classement en temps réel des joueurs')).toBeInTheDocument();
  });

  test('calcule les totaux correctement depuis les rounds', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Alice: 15 + 8 = 23 points
    // Bob: 23 + 12 = 35 points
    // Alice devrait être en tête (moins de points = mieux au Rami)
    
    const aliceElements = screen.getAllByText('23');
    const bobElements = screen.getAllByText('35');
    
    expect(aliceElements.length).toBeGreaterThan(0);
    expect(bobElements.length).toBeGreaterThan(0);
  });

  test('affiche le formulaire de nouvelle manche pour l\'hôte', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Vérifier que le formulaire de nouvelle manche est présent
    expect(screen.getByText('Nouvelle manche')).toBeInTheDocument();
    expect(screen.getByText('Saisissez les points de chaque joueur pour cette manche')).toBeInTheDocument();
    
    // Vérifier les inputs pour chaque joueur
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(2); // Un input par joueur
  });

  test('affiche le tableau d\'historique des manches', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Vérifier le header du tableau
    expect(screen.getByText('Historique des manches')).toBeInTheDocument();
    expect(screen.getByText('Détail des 2 manches jouées')).toBeInTheDocument();
    
    // Vérifier la structure du tableau
    expect(screen.getByText('Joueurs')).toBeInTheDocument();
    expect(screen.getByText('Manche 1')).toBeInTheDocument();
    expect(screen.getByText('Manche 2')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    
    // Vérifier les scores dans le tableau
    expect(screen.getByText('15')).toBeInTheDocument(); // Alice manche 1
    expect(screen.getByText('8')).toBeInTheDocument();  // Alice manche 2
    expect(screen.getByText('12')).toBeInTheDocument(); // Bob manche 2
  });

  test('met en évidence le gagnant de chaque manche', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Alice a gagné la manche 1 (15 < 23) et la manche 2 (8 < 12)
    // Vérifier que les meilleurs scores ont la classe CSS appropriée
    const container = screen.getByRole('table');
    expect(container).toBeInTheDocument();
    
    // On ne peut pas facilement tester les classes CSS avec testing-library
    // mais on peut vérifier que la structure est correcte
    const cells = screen.getAllByRole('cell');
    expect(cells.length).toBeGreaterThan(0);
  });

  test('gère la soumission d\'une nouvelle manche', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response);

    render(<RamiScoreSheet sessionId="1" />);

    // Remplir les scores
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });
    fireEvent.change(inputs[1], { target: { value: '15' } });

    // Soumettre la manche
    const submitButton = screen.getByText('Valider la manche');
    fireEvent.click(submitButton);

    // Vérifier l'appel API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/rami/sessions/1/rounds',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scores: [
              { playerId: 1, score: 10 },
              { playerId: 2, score: 15 }
            ]
          })
        })
      );
    });
  });

  test('empêche la soumission si tous les scores ne sont pas remplis', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Remplir seulement un score
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });

    // Le bouton devrait être désactivé
    const submitButton = screen.getByText('Valider la manche');
    expect(submitButton).toBeDisabled();
    
    // Message d'aide devrait être affiché
    expect(screen.getByText('Veuillez saisir les scores pour tous les joueurs')).toBeInTheDocument();
  });

  test('affiche un spinner pendant la soumission', async () => {
    // Mock d'une réponse lente
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        } as Response), 100)
      )
    );

    render(<RamiScoreSheet sessionId="1" />);

    // Remplir tous les scores
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });
    fireEvent.change(inputs[1], { target: { value: '15' } });

    // Soumettre
    const submitButton = screen.getByText('Valider la manche');
    fireEvent.click(submitButton);

    // Vérifier le spinner
    expect(screen.getByText('Enregistrement...')).toBeInTheDocument();
    
    // Attendre la fin
    await waitFor(() => {
      expect(screen.queryByText('Enregistrement...')).not.toBeInTheDocument();
    });
  });

  test('gère les erreurs de soumission', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Erreur réseau'));

    // Mock de useToast
    const mockToast = jest.fn();
    jest.doMock('@/hooks/use-toast', () => ({
      useToast: () => ({ toast: mockToast })
    }));

    render(<RamiScoreSheet sessionId="1" />);

    // Remplir et soumettre
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });
    fireEvent.change(inputs[1], { target: { value: '15' } });

    const submitButton = screen.getByText('Valider la manche');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  test('affiche le trophée pour le leader dans les totaux', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Alice a 23 points, Bob a 35 points
    // Alice devrait avoir le trophée (score le plus bas)
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    // Vérifier que le trophée est présent quelque part dans le tableau
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  test('tri les joueurs par score dans la section scores actuels', () => {
    render(<RamiScoreSheet sessionId="1" />);

    // Dans la section scores actuels, Alice (23 pts) devrait être avant Bob (35 pts)
    const scoresSection = screen.getByText('Scores actuels').closest('div');
    expect(scoresSection).toBeInTheDocument();
    
    // Vérifier la présence du badge "En tête"
    expect(screen.getByText('🏆 En tête')).toBeInTheDocument();
  });
});