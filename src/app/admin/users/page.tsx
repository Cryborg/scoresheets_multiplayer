'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock, Unlock, Trash2, KeyRound, Search,
  User, Calendar, Clock, ArrowLeft, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UserActionModal from '@/components/admin/UserActionModal';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: number;
  is_blocked: number;
  blocked_reason?: string;
  created_at: string;
  last_seen?: string;
  display_name?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionType, setActionType] = useState<'reset' | 'block' | 'unblock' | 'delete' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const checkAdminAndLoadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (response.status === 401) {
        router.push('/auth/login');
        return;
      }
      
      if (response.status === 403) {
        router.push('/dashboard');
        return;
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, [checkAdminAndLoadUsers]);

  const handleModalSuccess = async () => {
    const actionLabels = {
      reset: 'Mot de passe réinitialisé',
      block: 'Utilisateur bloqué', 
      unblock: 'Utilisateur débloqué',
      delete: 'Utilisateur supprimé'
    };

    if (selectedUser && actionType) {
      toast({
        title: "Succès",
        description: `${actionLabels[actionType]} pour ${selectedUser.username}`
      });
    }

    await checkAdminAndLoadUsers();
  };

  const openActionModal = (type: 'reset' | 'block' | 'unblock' | 'delete', user: User) => {
    setSelectedUser(user);
    setActionType(type);
  };

  const closeModal = () => {
    setActionType(null);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) {
      return 'Jamais';
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Jamais';
    }

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400 cursor-pointer"
            title="Retour au tableau de bord"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Utilisateurs
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Gestion des comptes utilisateurs
            </p>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Utilisateurs inscrits
          </h2>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-medium">Utilisateur</th>
                  <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-medium">Email</th>
                  <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-medium">Statut</th>
                  <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-medium">Inscrit le</th>
                  <th className="text-left p-4 text-gray-700 dark:text-gray-300 font-medium">Dernière visite</th>
                  <th className="text-right p-4 text-gray-700 dark:text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <Link
                            href={`/profile/${user.id}?from=admin`}
                            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
                            title={`Voir le profil de ${user.username}`}
                          >
                            {user.username}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          {user.display_name && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">{user.display_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-900 dark:text-white">{user.email}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {user.is_admin ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                            Admin
                          </span>
                        ) : null}
                        {user.is_blocked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            Bloqué
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            Actif
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDateTime(user.created_at)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDateTime(user.last_seen || null)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Seuls les utilisateurs avec compte peuvent avoir leur mot de passe réinitialisé */}
                        {user.email && (
                          <button
                            onClick={() => openActionModal('reset', user)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors cursor-pointer"
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        )}
                        {/* Seuls les utilisateurs avec compte peuvent être bloqués */}
                        {user.email && (
                          <button
                            onClick={() => openActionModal(user.is_blocked ? 'unblock' : 'block', user)}
                            className={`p-2 rounded transition-colors cursor-pointer ${
                              user.is_blocked
                                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                            title={user.is_blocked ? 'Débloquer l\'utilisateur' : 'Bloquer l\'utilisateur'}
                          >
                            {user.is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </button>
                        )}
                        {/* La suppression est possible pour tous les utilisateurs */}
                        <button
                          onClick={() => openActionModal('delete', user)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors cursor-pointer"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun utilisateur</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Aucun utilisateur ne correspond à votre recherche.' : 'Aucun utilisateur inscrit.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'action utilisateur */}
      <UserActionModal
        isOpen={actionType !== null}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
        user={selectedUser}
        actionType={actionType}
      />
    </div>
  );
}