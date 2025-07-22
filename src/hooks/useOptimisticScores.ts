'use client';

import { useState, useCallback } from 'react';

export function useOptimisticScores() {
  const [currentScores, setCurrentScores] = useState<{ [key: string]: { [playerId: number]: string } }>({});
  const [editingFields, setEditingFields] = useState<{ [key: string]: boolean }>({});

  // Check if any field is being edited
  const isEditing = Object.values(editingFields).some(editing => editing);

  // Handle score change (optimistic update)
  const handleScoreChange = useCallback((categoryId: string, playerId: number, score: string) => {
    const fieldKey = `${categoryId}-${playerId}`;
    
    // Mark field as being edited
    setEditingFields(prev => ({ ...prev, [fieldKey]: true }));
    
    // Optimistic update
    setCurrentScores(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [playerId]: score
      }
    }));
  }, []);

  // Handle field focus
  const handleScoreFocus = useCallback((categoryId: string, playerId: number) => {
    const fieldKey = `${categoryId}-${playerId}`;
    setEditingFields(prev => ({ ...prev, [fieldKey]: true }));
  }, []);

  // Handle field blur
  const handleScoreBlur = useCallback((categoryId: string, playerId: number) => {
    const fieldKey = `${categoryId}-${playerId}`;
    // Small delay to allow submit to happen first
    setTimeout(() => {
      setEditingFields(prev => {
        const { [fieldKey]: _, ...rest } = prev;
        return rest; // Remove the field completely instead of setting to false
      });
    }, 100);
  }, []);

  // Clear optimistic state after successful save
  const clearOptimisticScore = useCallback((categoryId: string, playerId: number) => {
    setCurrentScores(prev => {
      const newScores = { ...prev };
      if (newScores[categoryId]) {
        const { [playerId]: _, ...rest } = newScores[categoryId];
        newScores[categoryId] = rest;
        // Remove empty category objects
        if (Object.keys(newScores[categoryId]).length === 0) {
          delete newScores[categoryId];
        }
      }
      return newScores;
    });
  }, []);

  // Revert optimistic update on error
  const revertOptimisticScore = useCallback((categoryId: string, playerId: number, originalScore?: number) => {
    setCurrentScores(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [playerId]: originalScore !== undefined ? originalScore.toString() : ''
      }
    }));
  }, []);

  // Get the current display value for a score field
  const getScoreValue = useCallback((categoryId: string, playerId: number, sessionScore?: number) => {
    return currentScores[categoryId]?.[playerId] || (sessionScore !== undefined ? sessionScore.toString() : '');
  }, [currentScores]);

  return {
    currentScores,
    editingFields,
    isEditing,
    handleScoreChange,
    handleScoreFocus,
    handleScoreBlur,
    clearOptimisticScore,
    revertOptimisticScore,
    getScoreValue
  };
}