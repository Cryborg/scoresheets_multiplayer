import { Settings, Clock, Shield } from 'lucide-react';
import { BRANDING } from '@/lib/branding';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6">
          <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Maintenance en cours
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {BRANDING.name} est temporairement indisponible pour des améliorations. 
          Nous serons de retour très bientôt !
        </p>

        {/* Details */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4 mr-2" />
            Durée estimée : Quelques minutes
          </div>
          <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <Shield className="w-4 h-4 mr-2" />
            Vos données sont en sécurité
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex justify-center">
          <div className="animate-pulse flex space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animation-delay-100"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animation-delay-200"></div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Merci pour votre patience
          </p>
        </div>
      </div>
    </div>
  );
}

// Add custom CSS for animation delays
const styles = `
  .animation-delay-100 {
    animation-delay: 0.1s;
  }
  .animation-delay-200 {
    animation-delay: 0.2s;
  }
`;

// Inject styles (Next.js will handle this)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}