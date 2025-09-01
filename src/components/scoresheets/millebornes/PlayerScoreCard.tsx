/**
 * Unified player score card for Mille Bornes
 * Replaces both PlayerScoreInputModule and ReadOnlyPlayerScoreModule
 */

import React from 'react';
import { 
  MilleBornesRoundData, 
  MilleBornesPrimes, 
  GameVariant,
  CLASSIC_END_BONUSES,
  EXTENSION_END_BONUSES
} from '@/constants/millebornes';
import DistanceInput from './DistanceInput';
import BootesSection from './BootesSection';
import { formatScore } from '@/utils/millebornes';

interface PlayerScoreCardProps {
  playerId: number;
  playerName: string;
  roundData: MilleBornesRoundData;
  gameVariant: GameVariant;
  score: number;
  onDistanceChange?: (distance: number) => void;
  onPrimeChange?: (key: keyof MilleBornesPrimes, value: boolean) => void;
  readonly?: boolean;
  teamLabel?: string;
}

export default function PlayerScoreCard({
  playerId,
  playerName,
  roundData,
  gameVariant,
  score,
  onDistanceChange,
  onPrimeChange,
  readonly = false,
  teamLabel
}: PlayerScoreCardProps) {
  const distance = roundData.distances[playerId] || 0;
  const primes = roundData.primes[playerId] || {} as MilleBornesPrimes;
  
  const endBonuses = gameVariant === 'classic' ? CLASSIC_END_BONUSES : EXTENSION_END_BONUSES;

  const handlePrimeChange = (key: keyof MilleBornesPrimes, value: boolean) => {
    if (!readonly && onPrimeChange) {
      onPrimeChange(key, value);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {playerName} {teamLabel && <span className="text-sm text-gray-500">({teamLabel})</span>}
        </h3>
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {formatScore(score)} pts
        </div>
      </div>

      {/* Distance */}
      <DistanceInput
        value={distance}
        onChange={(value) => onDistanceChange?.(value)}
        readonly={readonly}
        playerName={playerName}
      />

      {/* Bottes & Coups Fourrés */}
      <BootesSection
        primes={primes}
        onPrimeChange={handlePrimeChange}
        readonly={readonly}
      />

      {/* Fins de manche */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 dark:text-gray-300">
          Fins de manche ({gameVariant === 'classic' ? 'Classique' : 'Extension'})
        </h4>
        
        <div className="space-y-2">
          {endBonuses.map(({ key, label, description, value }) => (
            <div 
              key={key}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </div>
              </div>
              {readonly ? (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  primes[key] 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                }`}>
                  {primes[key] ? `✓ ${value}` : '-'}
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={primes[key] || false}
                    onChange={(e) => handlePrimeChange(key, e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {value}
                  </span>
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Score breakdown (readonly only) */}
      {readonly && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Distance</span>
            <span>{distance} km</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Primes</span>
            <span>{score - distance} pts</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 dark:text-white mt-2 pt-2 border-t">
            <span>Total</span>
            <span>{formatScore(score)} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}