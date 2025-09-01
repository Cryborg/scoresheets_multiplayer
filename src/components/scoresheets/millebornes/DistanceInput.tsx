/**
 * Distance input component for Mille Bornes
 * Handles distance entry with validation
 */

import React from 'react';

interface DistanceInputProps {
  value: number;
  onChange: (value: number) => void;
  readonly?: boolean;
  playerName: string;
  teamLabel?: string;
}

export default function DistanceInput({
  value,
  onChange,
  readonly = false,
  playerName,
  teamLabel
}: DistanceInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    // Max distance in Mille Bornes is 1000km
    if (newValue >= 0 && newValue <= 1000) {
      onChange(newValue);
    }
  };

  if (readonly) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {playerName} {teamLabel && `(${teamLabel})`}
        </label>
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {value} km
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={`distance-${playerName}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Distance parcourue - {playerName}
      </label>
      <div className="relative">
        <input
          id={`distance-${playerName}`}
          type="number"
          min="0"
          max="1000"
          step="25"
          value={value || ''}
          onChange={handleChange}
          placeholder="0"
          className="w-full px-4 py-2 pr-12 text-lg font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
          km
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[25, 50, 75, 100, 200].map(distance => (
          <button
            key={distance}
            type="button"
            onClick={() => onChange(Math.min(1000, value + distance))}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            +{distance}
          </button>
        ))}
      </div>
    </div>
  );
}