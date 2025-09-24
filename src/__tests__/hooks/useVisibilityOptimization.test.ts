/**
 * Tests pour le hook useVisibilityOptimization
 * Vérifie la gestion de la visibilité de page et l'optimisation des intervalles
 */

import { renderHook, act } from '@testing-library/react';
import { useVisibilityOptimization } from '@/hooks/useVisibilityOptimization';

// Mock des APIs du navigateur
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockDocumentHidden = jest.fn(() => false);

// Mock window et document
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});

Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
});

Object.defineProperty(document, 'hidden', {
  get: mockDocumentHidden,
  configurable: true,
});

describe('useVisibilityOptimization', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockDocumentHidden.mockReturnValue(false); // Page visible par défaut
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with visible and active state', () => {
    const { result } = renderHook(() => useVisibilityOptimization());

    expect(result.current.state.isVisible).toBe(true);
    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.shouldPause).toBe(false);
    expect(result.current.state.timeSinceLastActivity).toBe(0);
  });

  it('should setup event listeners when pauseOnHidden is true', () => {
    renderHook(() => useVisibilityOptimization({ pauseOnHidden: true }));

    expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
  });

  it('should not setup event listeners when pauseOnHidden is false', () => {
    renderHook(() => useVisibilityOptimization({ pauseOnHidden: false }));

    expect(mockAddEventListener).not.toHaveBeenCalled();
  });

  it('should handle visibility change correctly', () => {
    const onVisibilityChange = jest.fn();
    const { result } = renderHook(() =>
      useVisibilityOptimization({ onVisibilityChange })
    );

    // Simuler que la page devient cachée
    mockDocumentHidden.mockReturnValue(true);

    // Récupérer le handler de visibilitychange
    const visibilityHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1];

    act(() => {
      visibilityHandler?.();
    });

    expect(result.current.state.isVisible).toBe(false);
    expect(result.current.state.shouldPause).toBe(true);
    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });

  it('should handle focus/blur events correctly', () => {
    const { result } = renderHook(() => useVisibilityOptimization());

    // Récupérer les handlers
    const focusHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'focus'
    )?.[1];
    const blurHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'blur'
    )?.[1];

    // Test blur
    act(() => {
      blurHandler?.();
    });

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.shouldPause).toBe(true);

    // Test focus
    act(() => {
      focusHandler?.();
    });

    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.shouldPause).toBe(false);
  });

  it('should update activity when called', () => {
    const onActivityChange = jest.fn();
    const { result } = renderHook(() =>
      useVisibilityOptimization({ onActivityChange })
    );

    // Avancer le temps pour simuler de l'inactivité
    act(() => {
      jest.advanceTimersByTime(10000); // 10s
    });

    expect(result.current.state.timeSinceLastActivity).toBeGreaterThan(0);

    // Marquer une activité
    act(() => {
      result.current.updateActivity();
    });

    expect(result.current.state.timeSinceLastActivity).toBe(0);
    expect(onActivityChange).toHaveBeenCalled();
  });

  it('should calculate adaptive multiplier correctly', () => {
    const { result } = renderHook(() => useVisibilityOptimization());

    // État normal : multiplier = 1
    expect(result.current.getAdaptiveMultiplier()).toBe(1);

    // Page cachée : multiplier = 5
    mockDocumentHidden.mockReturnValue(true);
    const visibilityHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1];

    act(() => {
      visibilityHandler?.();
    });

    expect(result.current.getAdaptiveMultiplier()).toBe(5);

    // Remettre visible mais pas de focus : multiplier = 3
    mockDocumentHidden.mockReturnValue(false);
    act(() => {
      visibilityHandler?.();
    });

    const blurHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'blur'
    )?.[1];

    act(() => {
      blurHandler?.();
    });

    expect(result.current.getAdaptiveMultiplier()).toBe(3);
  });

  it('should handle inactivity timeout for adaptive multiplier', () => {
    const { result } = renderHook(() => useVisibilityOptimization());

    // Avancer le temps au-delà du seuil d'inactivité (30s)
    act(() => {
      jest.advanceTimersByTime(35000);
    });

    // Le multiplier devrait être 2.5 pour l'inactivité
    expect(result.current.getAdaptiveMultiplier()).toBe(2.5);

    // Marquer une activité devrait remettre à 1
    act(() => {
      result.current.updateActivity();
    });

    expect(result.current.getAdaptiveMultiplier()).toBe(1);
  });

  it('should update time since last activity periodically', () => {
    const { result } = renderHook(() => useVisibilityOptimization());

    expect(result.current.state.timeSinceLastActivity).toBe(0);

    // Avancer le timer de 5 secondes (interval de mise à jour)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.state.timeSinceLastActivity).toBeGreaterThan(0);
  });

  it('should trigger activity on visibility return', () => {
    const onActivityChange = jest.fn();
    const { result } = renderHook(() =>
      useVisibilityOptimization({ onActivityChange })
    );

    // Récupérer le handler dès le premier rendu
    const visibilityHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1];

    // Page devient cachée
    mockDocumentHidden.mockReturnValue(true);

    act(() => {
      visibilityHandler?.();
    });

    expect(result.current.state.isVisible).toBe(false);

    // Reset le mock pour compter seulement les prochains appels
    onActivityChange.mockClear();

    // Page redevient visible - devrait déclencher une activité
    mockDocumentHidden.mockReturnValue(false);

    act(() => {
      visibilityHandler?.();
    });

    expect(result.current.state.isVisible).toBe(true);
    expect(onActivityChange).toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useVisibilityOptimization());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
  });

  it('should cleanup timers on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useVisibilityOptimization());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should handle SSR safely', () => {
    // Temporairement supprimer window pour simuler SSR
    const originalWindow = global.window;
    // @ts-expect-error Removing window for SSR test
    delete global.window;

    const { result } = renderHook(() => useVisibilityOptimization());

    // Devrait initialiser comme visible en SSR
    expect(result.current.state.isVisible).toBe(true);

    // Restaurer window
    global.window = originalWindow;
  });
});