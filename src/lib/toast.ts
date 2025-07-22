import toast from 'react-hot-toast';

/**
 * Centralized toast notification system
 * Replaces all alert() calls with proper UI feedback
 */
export const notify = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
    });
  },

  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, { loading, success, error }, {
      position: 'top-right'
    });
  },

  // Game-specific notifications
  scoreUpdated: () => {
    toast.success('Score mis à jour', {
      duration: 2000,
      position: 'top-right',
      icon: '🎯'
    });
  },

  roundAdded: () => {
    toast.success('Manche ajoutée', {
      duration: 2000,
      position: 'top-right',
      icon: '🎲'
    });
  },

  playerJoined: (playerName: string) => {
    toast.success(`${playerName} a rejoint la partie`, {
      duration: 3000,
      position: 'top-right',
      icon: '👤'
    });
  },

  connectionLost: () => {
    toast.error('Connexion perdue', {
      duration: 5000,
      position: 'top-right',
      icon: '📡'
    });
  },

  reconnected: () => {
    toast.success('Reconnecté', {
      duration: 2000,
      position: 'top-right',
      icon: '✅'
    });
  }
};