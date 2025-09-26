'use client';

import React, { createContext, useContext } from 'react';
import { notify } from '@/lib/toast';

interface ToastContextType {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const success = (title: string, message?: string) => {
    const text = message ? `${title}: ${message}` : title;
    notify.success(text);
  };

  const error = (title: string, message?: string) => {
    const text = message ? `${title}: ${message}` : title;
    notify.error(text);
  };

  const warning = (title: string, message?: string) => {
    const text = message ? `${title}: ${message}` : title;
    notify.error(text); // react-hot-toast n'a pas de warning, on utilise error
  };

  const info = (title: string, message?: string) => {
    const text = message ? `${title}: ${message}` : title;
    notify.success(text); // react-hot-toast n'a pas de info, on utilise success
  };

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}