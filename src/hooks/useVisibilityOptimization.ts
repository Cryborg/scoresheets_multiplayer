import { useEffect, useState } from 'react';

interface VisibilityOptions {
  pauseOnHidden?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export function useVisibilityOptimization({ pauseOnHidden = true, onVisibilityChange }: VisibilityOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!pauseOnHidden) return;

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      onVisibilityChange?.(visible);
    };

    const handleFocus = () => setIsActive(true);
    const handleBlur = () => setIsActive(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [pauseOnHidden, onVisibilityChange]);

  return {
    isVisible,
    isActive,
    shouldPause: pauseOnHidden && (!isVisible || !isActive)
  };
}