'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface Category {
  id?: number;
  name: string;
  description: string;
  icon: string;
}

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Omit<Category, 'id'>) => Promise<void>;
  category?: Category | null;
}

const emojiCategories = [
  { name: 'Jeux', emojis: ['🎮', '🎲', '🃏', '🎯', '🎪', '🎭', '🎨', '🎸', '🎹'] },
  { name: 'Sports', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🥊'] },
  { name: 'Nature', emojis: ['🌿', '🌲', '🌳', '🌴', '🌵', '🌷', '🌸', '🌺', '🌻'] },
  { name: 'Animaux', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨'] },
  { name: 'Nourriture', emojis: ['🍎', '🍕', '🍔', '🍟', '🍿', '🍰', '🍪', '🍫', '🍬'] },
  { name: 'Objets', emojis: ['💎', '🔮', '🏆', '🎁', '🎉', '🎊', '📚', '💡', '🔥'] }
];

export default function CategoryEditModal({
  isOpen,
  onClose,
  onSave,
  category
}: CategoryEditModalProps) {
  const [formData, setFormData] = useState<Omit<Category, 'id'>>({
    name: '',
    description: '',
    icon: '🎮'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description,
        icon: category.icon
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '🎮'
      });
    }
  }, [category]);

  // Gérer l'escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isLoading, showEmojiPicker]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const selectEmoji = (emoji: string) => {
    setFormData({ ...formData, icon: emoji });
    setShowEmojiPicker(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full transform transition-all animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Icon Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icône
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-2xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center cursor-pointer"
                >
                  {formData.icon}
                </button>
                
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 z-10 max-h-64 overflow-y-auto">
                    {emojiCategories.map((category) => (
                      <div key={category.name} className="mb-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          {category.name}
                        </p>
                        <div className="grid grid-cols-9 gap-1">
                          {category.emojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => selectEmoji(emoji)}
                              className="p-2 text-xl hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Jeux de cartes"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Description de la catégorie..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              <Save className="h-4 w-4" />
              {category ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}