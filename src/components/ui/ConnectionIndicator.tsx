'use client';

import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

interface ConnectionIndicatorProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  className?: string;
  showText?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG = {
  connected: {
    icon: Wifi,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    text: 'Connecté',
    pulseClass: ''
  },
  connecting: {
    icon: Loader2,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    text: 'Connexion...',
    pulseClass: 'animate-spin'
  },
  disconnected: {
    icon: WifiOff,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    text: 'Déconnecté',
    pulseClass: 'animate-pulse'
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    text: 'Erreur connexion',
    pulseClass: 'animate-pulse'
  }
};

export default function ConnectionIndicator({ 
  status, 
  className = '', 
  showText = true,
  compact = false 
}: ConnectionIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`
        flex items-center justify-center
        ${compact ? 'w-6 h-6' : 'w-8 h-8'} 
        rounded-full ${config.bgColor}
      `}>
        <IconComponent 
          className={`
            ${compact ? 'h-3 w-3' : 'h-4 w-4'} 
            ${config.color} 
            ${config.pulseClass}
          `} 
        />
      </div>
      
      {showText && (
        <span className={`
          text-sm font-medium ${config.color}
          ${compact ? 'hidden sm:block' : ''}
        `}>
          {config.text}
        </span>
      )}
    </div>
  );
}