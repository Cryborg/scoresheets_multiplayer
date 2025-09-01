/**
 * Bottes and Coups Fourrés section for Mille Bornes
 * Handles the special safety cards UI
 */

import React from 'react';
import { MilleBornesPrimes } from '@/constants/millebornes';
import { BOTTES_CONFIG } from '@/constants/millebornes';

interface BootesSectionProps {
  primes: MilleBornesPrimes;
  onPrimeChange: (key: keyof MilleBornesPrimes, value: boolean) => void;
  readonly?: boolean;
}

export default function BootesSection({
  primes,
  onPrimeChange,
  readonly = false
}: BootesSectionProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-700 dark:text-gray-300">
        Bottes & Coups Fourrés
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BOTTES_CONFIG.map(({ botteKey, coupKey, label, description, icon }) => (
          <div key={botteKey} className="space-y-2">
            {/* Botte */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {description}
                  </div>
                </div>
              </div>
              {readonly ? (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  primes[botteKey] 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                }`}>
                  {primes[botteKey] ? '✓ 100' : '-'}
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={primes[botteKey]}
                    onChange={(e) => onPrimeChange(botteKey, e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    100
                  </span>
                </label>
              )}
            </div>
            
            {/* Coup Fourré */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg ml-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Coup Fourré
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Parade instantanée
                  </div>
                </div>
              </div>
              {readonly ? (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  primes[coupKey] 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                }`}>
                  {primes[coupKey] ? '✓ 300' : '-'}
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={primes[coupKey]}
                    onChange={(e) => onPrimeChange(coupKey, e.target.checked)}
                    disabled={!primes[botteKey]} // Can't have coup fourré without botte
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    300
                  </span>
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}