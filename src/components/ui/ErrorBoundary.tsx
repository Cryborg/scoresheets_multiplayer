'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Appel du callback d'erreur personnalisé
    this.props.onError?.(error, errorInfo);

    // En production, envoyer l'erreur à un service de monitoring
    if (process.env.NODE_ENV === 'production') {
      // Exemple: Sentry, LogRocket, etc.
      // Sentry.captureException(error);
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.retry} />;
      }

      return <DefaultErrorFallback error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Composant de fallback par défaut
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const router = useRouter();

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        
        <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-white">
          Une erreur s&apos;est produite
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          Désolé, quelque chose ne s&apos;est pas passé comme prévu. 
          Vous pouvez essayer de recharger la page ou retourner à l&apos;accueil.
        </p>

        {/* Détails de l'erreur en développement */}
        {isDevelopment && (
          <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded border">
            <h3 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">
              Détails de l&apos;erreur (dev) :
            </h3>
            <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
              {error.message}
            </pre>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={retry}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            <Home className="h-4 w-4" />
            Accueil
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook pour capturer les erreurs dans les composants fonctionnels
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: string) => {
    console.error('Handled error:', error, errorInfo);
    
    if (process.env.NODE_ENV === 'production') {
      // Envoyer à un service de monitoring
      // Sentry.captureException(error);
    }
  }, []);

  return { handleError };
}

// Wrapper pour les erreurs async
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Composant principal exporté
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props} />;
}

export default ErrorBoundary;