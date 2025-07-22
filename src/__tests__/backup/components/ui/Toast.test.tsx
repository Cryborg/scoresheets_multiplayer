/**
 * Tests pour le système de notifications Toast
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { ToastContainer, useToast } from '@/components/ui/Toast';

// Mock des timers pour contrôler l'auto-dismiss
jest.useFakeTimers();

describe('Toast System', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('useToast hook', () => {
    it('should add toasts with different types', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Success message');
        result.current.error('Error message');
        result.current.warning('Warning message');
        result.current.info('Info message');
      });

      expect(result.current.toasts).toHaveLength(4);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[1].type).toBe('error');
      expect(result.current.toasts[2].type).toBe('warning');
      expect(result.current.toasts[3].type).toBe('info');
    });

    it('should generate unique IDs for toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Message 1');
        result.current.success('Message 2');
      });

      const ids = result.current.toasts.map(toast => toast.id);
      expect(new Set(ids).size).toBe(2); // Tous les IDs sont uniques
    });

    it('should dismiss specific toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Message 1');
        result.current.success('Message 2');
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.dismissToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Message 2');
    });

    it('should clear all toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Message 1');
        result.current.error('Message 2');
        result.current.warning('Message 3');
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.clearAllToasts();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('ToastContainer', () => {
    it('should render toasts with correct content and styling', () => {
      const toasts = [
        {
          id: '1',
          type: 'success' as const,
          title: 'Success Title',
          message: 'Success message'
        },
        {
          id: '2',
          type: 'error' as const,
          title: 'Error Title',
          message: 'Error message'
        }
      ];

      const mockDismiss = jest.fn();

      render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

      expect(screen.getByText('Success Title')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error Title')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      const toasts = [
        {
          id: 'test-toast',
          type: 'info' as const,
          title: 'Test Toast'
        }
      ];

      const mockDismiss = jest.fn();

      render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

      const dismissButton = screen.getByLabelText('Fermer la notification');
      fireEvent.click(dismissButton);

      // Le dismiss devrait être appelé après l'animation de sortie
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockDismiss).toHaveBeenCalledWith('test-toast');
    });

    it('should auto-dismiss toasts after specified duration', async () => {
      const toasts = [
        {
          id: 'auto-dismiss-toast',
          type: 'success' as const,
          title: 'Auto Dismiss Toast',
          duration: 2000
        }
      ];

      const mockDismiss = jest.fn();

      render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

      expect(screen.getByText('Auto Dismiss Toast')).toBeInTheDocument();

      // Avancer le temps jusqu'au moment de l'auto-dismiss
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Puis avancer le temps pour l'animation de sortie
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockDismiss).toHaveBeenCalledWith('auto-dismiss-toast');
    });

    it('should not auto-dismiss when duration is 0', () => {
      const toasts = [
        {
          id: 'persistent-toast',
          type: 'warning' as const,
          title: 'Persistent Toast',
          duration: 0
        }
      ];

      const mockDismiss = jest.fn();

      render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

      // Avancer le temps plus que la durée par défaut
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockDismiss).not.toHaveBeenCalled();
      expect(screen.getByText('Persistent Toast')).toBeInTheDocument();
    });

    it('should not render dismiss button when dismissible is false', () => {
      const toasts = [
        {
          id: 'non-dismissible-toast',
          type: 'error' as const,
          title: 'Non-dismissible Toast',
          dismissible: false
        }
      ];

      const mockDismiss = jest.fn();

      render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

      expect(screen.getByText('Non-dismissible Toast')).toBeInTheDocument();
      expect(screen.queryByLabelText('Fermer la notification')).not.toBeInTheDocument();
    });

    it('should apply correct CSS classes for different toast types', () => {
      const toasts = [
        {
          id: 'success-toast',
          type: 'success' as const,
          title: 'Success Toast'
        },
        {
          id: 'error-toast',
          type: 'error' as const,
          title: 'Error Toast'
        }
      ];

      const mockDismiss = jest.fn();

      render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

      const successToast = screen.getByText('Success Toast').closest('div');
      const errorToast = screen.getByText('Error Toast').closest('div');

      expect(successToast).toHaveClass('text-green-800');
      expect(errorToast).toHaveClass('text-red-800');
    });

    it('should handle multiple toasts and render them in order', () => {
      const toasts = [
        { id: '1', type: 'success' as const, title: 'First' },
        { id: '2', type: 'error' as const, title: 'Second' },
        { id: '3', type: 'warning' as const, title: 'Third' }
      ];

      const mockDismiss = jest.fn();

      render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

      const toastElements = screen.getAllByRole('generic');
      const titleElements = [
        screen.getByText('First'),
        screen.getByText('Second'),
        screen.getByText('Third')
      ];

      expect(titleElements).toHaveLength(3);
      titleElements.forEach(element => {
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Toast animations', () => {
    it('should start invisible and become visible', async () => {
      const toasts = [
        {
          id: 'animated-toast',
          type: 'info' as const,
          title: 'Animated Toast'
        }
      ];

      const mockDismiss = jest.fn();

      render(<ToastContainer toasts={toasts} onDismiss={mockDismiss} />);

      const toastElement = screen.getByText('Animated Toast').closest('div');
      
      // Au début, le toast devrait avoir la classe d'invisibilité
      expect(toastElement).toHaveClass('translate-x-full');
      expect(toastElement).toHaveClass('opacity-0');

      // Après l'animation d'entrée (10ms + temps de render)
      act(() => {
        jest.advanceTimersByTime(50);
      });

      await waitFor(() => {
        expect(toastElement).toHaveClass('translate-x-0');
        expect(toastElement).toHaveClass('opacity-100');
      });
    });
  });
});