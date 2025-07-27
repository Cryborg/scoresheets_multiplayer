/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import AdminGuard from '@/components/AdminGuard';

// Mock des dépendances
const mockPush = jest.fn();
const mockIsAuthenticated = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

jest.mock('@/lib/authClient', () => ({
  isAuthenticated: mockIsAuthenticated
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('AdminGuard', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFetch.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('affiche le spinner de chargement initial', () => {
    mockIsAuthenticated.mockReturnValue(true);
    
    // Mock d'une promesse qui ne se résout pas immédiatement
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(
      <AdminGuard>
        <div>Protected Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Vérification des droits administrateur...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('affiche un spinner correct en mode dark', () => {
    mockIsAuthenticated.mockReturnValue(true);
    
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <AdminGuard>
        <div>Protected Content</div>
      </AdminGuard>
    );

    // Vérifier les classes CSS pour le mode dark
    const loadingContainer = container.querySelector('.min-h-screen');
    expect(loadingContainer).toHaveClass('dark:bg-gray-900');
    
    const loadingText = screen.getByText('Vérification des droits administrateur...');
    expect(loadingText).toHaveClass('dark:text-gray-400');
  });

  test('render sans crash avec tous les props', () => {
    mockIsAuthenticated.mockReturnValue(true);
    
    mockFetch.mockImplementation(() => new Promise(() => {}));

    expect(() => {
      render(
        <AdminGuard>
          <div>Protected Content</div>
        </AdminGuard>
      );
    }).not.toThrow();
  });
});