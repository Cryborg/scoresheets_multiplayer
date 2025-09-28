import React from 'react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameCard from '@/components/layout/GameCard';
import { FormField } from '../types';

interface DynamicFormProps<TData = Record<string, unknown>> {
  title: string;
  fields: FormField[];
  data: TData;
  setData: React.Dispatch<React.SetStateAction<TData>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export default function DynamicForm<TData = Record<string, unknown>>({
  title,
  fields,
  data,
  setData,
  onSubmit,
  isSubmitting,
  submitLabel = "Valider"
}: DynamicFormProps<TData>) {
  
  const handleFieldChange = (fieldName: string, value: unknown) => {
    setData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderField = (field: FormField) => {
    const value = (data as Record<string, unknown>)[field.name];

    switch (field.type) {
      case 'number':
        return (
          <ScoreInput
            value={value || 0}
            onChange={(newValue) => handleFieldChange(field.name, newValue)}
            placeholder={field.label}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );

      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm">{field.label}</span>
          </label>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <div className="text-red-500">Type de champ non supporté: {field.type}</div>
        );
    }
  };

  return (
    <GameCard title={title}>
      <div className="space-y-6">
        {fields.map((field) => (
          <div key={field.name}>
            {field.type !== 'checkbox' && (
              <label className="block text-sm font-medium mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {renderField(field)}
            {field.description && (
              <div className="text-xs text-gray-500 mt-1">
                {field.description}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors font-medium"
        >
          {isSubmitting ? 'En cours...' : submitLabel}
        </button>
      </div>
    </GameCard>
  );
}