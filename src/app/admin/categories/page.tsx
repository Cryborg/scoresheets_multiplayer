'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import CategoryEditModal from '@/components/admin/CategoryEditModal';
import { errorLogger } from '@/lib/errorLogger';

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  games_count?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { confirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      errorLogger.logError({
        message: 'Erreur lors de la récupération des catégories',
        context: 'admin',
        details: {
          error: error instanceof Error ? error.message : String(error),
          action: 'fetchCategories'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (categoryData: Omit<Category, 'id'>) => {
    try {
      const isEditing = !!editingCategory;
      const url = isEditing 
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        throw new Error('Failed to save category');
      }

      await fetchCategories();
    } catch (error) {
      errorLogger.logError({
        message: 'Erreur lors de la sauvegarde de la catégorie',
        context: 'admin',
        details: {
          error: error instanceof Error ? error.message : String(error),
          action: 'saveCategory',
          isEditing: !!editingCategory
        }
      });
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Supprimer la catégorie',
      message: 'Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchCategories();
      }
    } catch (error) {
      errorLogger.logError({
        message: 'Erreur lors de la suppression de la catégorie',
        context: 'admin',
        details: {
          error: error instanceof Error ? error.message : String(error),
          action: 'deleteCategory',
          categoryId: id
        }
      });
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Catégories de jeux
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gérez les catégories utilisées pour classer les jeux
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Category Edit Modal */}
      <CategoryEditModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveCategory}
        category={editingCategory}
      />

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category.games_count || 0} jeu(x)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
                      disabled={category.games_count && category.games_count > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {category.description}
                </p>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucune catégorie
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Créez votre première catégorie pour organiser vos jeux.
              </p>
              <button
                onClick={handleCreateNew}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Créer une catégorie
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}