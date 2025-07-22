// Test simple pour valider la configuration Jest
describe('Configuration Jest', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    await expect(promise).resolves.toBe('test');
  });

  it('should mock functions', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should handle objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toHaveProperty('name', 'test');
    expect(obj).toMatchObject({ name: 'test' });
  });
});

// Test des utilitaires mathématiques simples
describe('Math Utils', () => {
  const add = (a: number, b: number) => a + b;
  const multiply = (a: number, b: number) => a * b;

  it('should add numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 5)).toBe(5);
  });

  it('should multiply numbers correctly', () => {
    expect(multiply(2, 3)).toBe(6);
    expect(multiply(-2, 3)).toBe(-6);
    expect(multiply(0, 5)).toBe(0);
  });
});

// Test localStorage mock
describe('localStorage Mock', () => {
  beforeEach(() => {
    // localStorage est mocké dans jest.setup.js
    localStorage.clear();
  });

  it('should store and retrieve data', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
  });

  it('should return null for missing keys', () => {
    expect(localStorage.getItem('missing')).toBeNull();
  });
});

// Test des types de données de jeu
describe('Game Data Types', () => {
  interface Player {
    id: number;
    name: string;
    score: number;
  }

  interface GameSession {
    id: string;
    players: Player[];
    status: 'active' | 'completed';
  }

  it('should validate player structure', () => {
    const player: Player = {
      id: 1,
      name: 'Test Player',
      score: 100
    };

    expect(player).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      score: expect.any(Number)
    });
  });

  it('should validate game session structure', () => {
    const session: GameSession = {
      id: 'test-session',
      players: [
        { id: 1, name: 'Player 1', score: 100 },
        { id: 2, name: 'Player 2', score: 150 }
      ],
      status: 'active'
    };

    expect(session).toMatchObject({
      id: expect.any(String),
      players: expect.arrayContaining([
        expect.objectContaining({ id: expect.any(Number) })
      ]),
      status: expect.stringMatching(/^(active|completed)$/)
    });

    expect(session.players).toHaveLength(2);
    expect(session.players[0].score).toBeLessThan(session.players[1].score);
  });
});