'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { 
  Lock, Unlock, Trash2, KeyRound, Search, 
  AlertCircle, User, Calendar, Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: number;
  is_blocked: number;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  last_seen: string | null;
  display_name: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'reset' | 'block' | 'unblock' | 'delete' | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      // Vérifier si l'utilisateur est admin
      const checkResponse = await fetch('/api/admin/check');
      const { isAdmin } = await checkResponse.json();

      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }

      // Charger les utilisateurs
      const usersResponse = await fetch('/api/admin/users');
      if (!usersResponse.ok) throw new Error('Erreur lors du chargement');

      const data = await usersResponse.json();
      setUsers(data.users);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) throw new Error('Erreur lors de la réinitialisation');

      toast({
        title: "Succès",
        description: `Mot de passe réinitialisé pour ${selectedUser.username}`
      });

      setActionType(null);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le mot de passe",
        variant: "destructive"
      });
    }
  };

  const handleBlockUnblock = async (action: 'block' | 'unblock') => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: blockReason })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'opération');

      toast({
        title: "Succès",
        description: `Utilisateur ${action === 'block' ? 'bloqué' : 'débloqué'} avec succès`
      });

      await checkAdminAndLoadUsers();
      setActionType(null);
      setSelectedUser(null);
      setBlockReason('');
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de ${action === 'block' ? 'bloquer' : 'débloquer'} l'utilisateur`,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/delete`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      toast({
        title: "Succès",
        description: `Utilisateur ${selectedUser.username} supprimé`
      });

      await checkAdminAndLoadUsers();
      setActionType(null);
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
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
      year: 'numeric'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Utilisateurs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestion des comptes utilisateurs
          </p>
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
                          <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
                          {user.display_name && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">{user.display_name}</div>
                          )}
                        </div>
                        {user.is_admin === 1 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 ml-2">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="p-4">
                      {user.is_blocked === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                          <Lock className="h-3 w-3" />
                          Bloqué
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          <Unlock className="h-3 w-3" />
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {formatDate(user.last_seen)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        {user.is_admin === 1 ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                            Administrateur
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionType('reset');
                              }}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Réinitialiser le mot de passe"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionType(user.is_blocked ? 'unblock' : 'block');
                              }}
                              className={`p-2 rounded transition-colors ${
                                user.is_blocked 
                                  ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' 
                                  : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                              }`}
                              title={user.is_blocked ? 'Débloquer' : 'Bloquer'}
                            >
                              {user.is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionType('delete');
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dialog pour réinitialiser le mot de passe */}
      <AlertDialog open={actionType === 'reset'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe</AlertDialogTitle>
            <AlertDialogDescription>
              Définir un nouveau mot de passe pour {selectedUser?.username}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Nouveau mot de passe</Label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog pour bloquer un utilisateur */}
      <AlertDialog open={actionType === 'block'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Bloquer l'accès pour {selectedUser?.username}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Raison du blocage (optionnel)</Label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Ex: Comportement inapproprié"
              className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleBlockUnblock('block')}
              className="bg-destructive text-destructive-foreground"
            >
              Bloquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog pour débloquer */}
      <AlertDialog open={actionType === 'unblock'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Débloquer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurer l'accès pour {selectedUser?.username}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBlockUnblock('unblock')}>
              Débloquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog pour supprimer */}
      <AlertDialog open={actionType === 'delete'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Supprimer définitivement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données de {selectedUser?.username} seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}