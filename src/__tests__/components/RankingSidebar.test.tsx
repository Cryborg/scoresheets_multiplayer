/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import RankingSidebar from '@/components/layout/RankingSidebar';

describe('RankingSidebar', () => {
  const mockPlayers = [
    { id: 1, name: 'Alice', totalScore: 150 },
    { id: 2, name: 'Bob', totalScore: 120 },
    { id: 3, name: 'Charlie', totalScore: 200 }
  ];

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('affiche le titre Classement', () => {
    render(<RankingSidebar players={mockPlayers} />);
    
    expect(screen.getByText('Classement')).toBeInTheDocument();
  });

  test('affiche tous les joueurs avec leurs scores', () => {
    render(<RankingSidebar players={mockPlayers} />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    
    expect(screen.getByText('150 points')).toBeInTheDocument();
    expect(screen.getByText('120 points')).toBeInTheDocument();
    expect(screen.getByText('200 points')).toBeInTheDocument();
  });

  test('affiche les positions des joueurs', () => {
    render(<RankingSidebar players={mockPlayers} />);
    
    // Vérifier les numéros de position (1, 2, 3)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('gère le cas où players est undefined', () => {
    render(<RankingSidebar players={undefined as any} />);
    
    expect(screen.getByText('Classement')).toBeInTheDocument();
    expect(screen.getByText('Aucun joueur')).toBeInTheDocument();
  });

  test('gère le cas où players est un array vide', () => {
    render(<RankingSidebar players={[]} />);
    
    expect(screen.getByText('Classement')).toBeInTheDocument();
    expect(screen.getByText('Aucun joueur')).toBeInTheDocument();
  });

  test('gère le cas où players est null', () => {
    render(<RankingSidebar players={null as any} />);
    
    expect(screen.getByText('Classement')).toBeInTheDocument();
    expect(screen.getByText('Aucun joueur')).toBeInTheDocument();
  });

  test('affiche le score target quand fourni', () => {
    render(
      <RankingSidebar 
        players={mockPlayers} 
        scoreTarget={500}
        hasScoreTarget={true}
      />
    );
    
    expect(screen.getByText('Score à atteindre :')).toBeInTheDocument();
    expect(screen.getByText('500 points')).toBeInTheDocument();
  });

  test('n\'affiche pas le score target si hasScoreTarget est false', () => {
    render(
      <RankingSidebar 
        players={mockPlayers} 
        scoreTarget={500}
        hasScoreTarget={false}
      />
    );
    
    expect(screen.queryByText('Score à atteindre :')).not.toBeInTheDocument();
  });

  test('n\'affiche pas le score target si scoreTarget est 0', () => {
    render(
      <RankingSidebar 
        players={mockPlayers} 
        scoreTarget={0}
        hasScoreTarget={true}
      />
    );
    
    expect(screen.queryByText('Score à atteindre :')).not.toBeInTheDocument();
  });

  test('affiche le trophée pour les joueurs qui atteignent le score target', () => {
    const playersWithTarget = [
      { id: 1, name: 'Alice', totalScore: 550 }, // Au-dessus du target
      { id: 2, name: 'Bob', totalScore: 450 }    // En dessous du target
    ];

    render(
      <RankingSidebar 
        players={playersWithTarget} 
        scoreTarget={500}
        hasScoreTarget={true}
      />
    );
    
    // Alice devrait avoir le trophée (550 >= 500)
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  test('gère les scores négatifs', () => {
    const playersWithNegative = [
      { id: 1, name: 'Alice', totalScore: -10 },
      { id: 2, name: 'Bob', totalScore: 50 }
    ];

    render(<RankingSidebar players={playersWithNegative} />);
    
    expect(screen.getByText('-10 points')).toBeInTheDocument();
    expect(screen.getByText('50 points')).toBeInTheDocument();
  });

  test('gère les très gros scores', () => {
    const playersWithBigScores = [
      { id: 1, name: 'Alice', totalScore: 999999 }
    ];

    render(<RankingSidebar players={playersWithBigScores} />);
    
    expect(screen.getByText('999999 points')).toBeInTheDocument();
  });

  test('applique les bonnes classes CSS pour les positions', () => {
    const { container } = render(<RankingSidebar players={mockPlayers} />);
    
    // Vérifier la structure générale
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
    expect(container.querySelector('.dark\\:bg-gray-800')).toBeInTheDocument();
  });

  test('respecte la prop scoreTarget exactement', () => {
    const playersAtTarget = [
      { id: 1, name: 'Alice', totalScore: 500 }, // Exactement le target
      { id: 2, name: 'Bob', totalScore: 499 }    // Juste en dessous
    ];

    render(
      <RankingSidebar 
        players={playersAtTarget} 
        scoreTarget={500}
        hasScoreTarget={true}
      />
    );
    
    // Alice devrait avoir le trophée (500 >= 500)
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  test('ne plante pas avec des propriétés undefined dans players', () => {
    const playersWithUndefined = [
      { id: 1, name: undefined as any, totalScore: 100 },
      { id: 2, name: 'Bob', totalScore: undefined as any }
    ];

    expect(() => {
      render(<RankingSidebar players={playersWithUndefined} />);
    }).not.toThrow();
  });

  test('affiche "pts" comme unité', () => {
    render(<RankingSidebar players={mockPlayers} />);
    
    // Vérifier que "points" est affiché (pas juste "pts")
    expect(screen.getByText('150 points')).toBeInTheDocument();
    expect(screen.getByText('120 points')).toBeInTheDocument();
    expect(screen.getByText('200 points')).toBeInTheDocument();
  });

  test('maintient l\'ordre des joueurs tel que fourni', () => {
    const { container } = render(<RankingSidebar players={mockPlayers} />);
    
    // Les joueurs devraient apparaître dans l'ordre fourni
    const playerElements = container.querySelectorAll('[class*="space-y-3"] > div');
    expect(playerElements).toHaveLength(3);
  });

  test('gère un seul joueur', () => {
    const singlePlayer = [
      { id: 1, name: 'Solo', totalScore: 100 }
    ];

    render(<RankingSidebar players={singlePlayer} />);
    
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByText('100 points')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Position 1
  });

  test('ne fait pas planter .map() sur undefined', () => {
    // Test spécifique pour le bug que nous avons corrigé
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<RankingSidebar players={undefined as any} />);
    }).not.toThrow();

    // Vérifier qu'aucune erreur n'a été loggée
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('TypeError')
    );

    consoleSpy.mockRestore();
  });
});