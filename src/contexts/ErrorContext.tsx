'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { notify } from '@/lib/toast';

export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  timestamp: Date;
  details?: Record<string, unknown>;
  context?: string; // auth, game, api, etc.
  dismissed?: boolean;
}

interface ErrorContextValue {
  errors: AppError[];
  showError: (message: string, context?: string, details?: Record<string, unknown>) => void;
  showWarning: (message: string, context?: string) => void;
  showSuccess: (message: string, context?: string) => void;
  showInfo: (message: string, context?: string) => void;
  dismissError: (id: string) => void;
  clearAllErrors: () => void;
  clearErrorsByContext: (context: string) => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = useCallback((
    message: string,
    type: AppError['type'],
    context?: string,
    details?: Record<string, unknown>
  ) => {
    const error: AppError = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: new Date(),
      context,
      details,
      dismissed: false
    };

    // Add to state for logging/debugging
    setErrors(prev => [error, ...prev.slice(0, 99)]); // Keep max 100 errors

    // Show appropriate toast notification
    switch (type) {
      case 'error':
        notify.error(message);
        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`[${context}] ${message}`, details || '');
        }
        break;
      case 'warning':
        notify.warning(message);
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[${context}] ${message}`, details || '');
        }
        break;
      case 'success':
        notify.success(message);
        break;
      case 'info':
        notify.info(message);
        break;
    }

    return error.id;
  }, []);

  const showError = useCallback((
    message: string,
    context: string = 'app',
    details?: Record<string, unknown>
  ) => {
    return addError(message, 'error', context, details);
  }, [addError]);

  const showWarning = useCallback((
    message: string,
    context: string = 'app'
  ) => {
    return addError(message, 'warning', context);
  }, [addError]);

  const showSuccess = useCallback((
    message: string,
    context: string = 'app'
  ) => {
    return addError(message, 'success', context);
  }, [addError]);

  const showInfo = useCallback((
    message: string,
    context: string = 'app'
  ) => {
    return addError(message, 'info', context);
  }, [addError]);

  const dismissError = useCallback((id: string) => {
    setErrors(prev => prev.map(error =>
      error.id === id ? { ...error, dismissed: true } : error
    ));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearErrorsByContext = useCallback((context: string) => {
    setErrors(prev => prev.filter(error => error.context !== context));
  }, []);

  const value: ErrorContextValue = {
    errors,
    showError,
    showWarning,
    showSuccess,
    showInfo,
    dismissError,
    clearAllErrors,
    clearErrorsByContext
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
}