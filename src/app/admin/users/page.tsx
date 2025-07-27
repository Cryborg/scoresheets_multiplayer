'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Lock, Unlock, Trash2, KeyRound, Search, 
  ArrowLeft, AlertCircle, User, Calendar, Clock
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
  last_seen: string;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Administration des utilisateurs
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs inscrits</CardTitle>
            <CardDescription>
              Gérez les comptes utilisateurs de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Utilisateur</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Statut</th>
                    <th className="text-left p-4">Inscrit le</th>
                    <th className="text-left p-4">Dernière visite</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            {user.display_name && (
                              <div className="text-sm text-muted-foreground">{user.display_name}</div>
                            )}
                          </div>
                          {user.is_admin === 1 && (
                            <Badge variant="default" className="ml-2">Admin</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{user.email}</td>
                      <td className="p-4">
                        {user.is_blocked === 1 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <Lock className="h-3 w-3" />
                            Bloqué
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Unlock className="h-3 w-3" />
                            Actif
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(user.created_at)}
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDate(user.last_seen)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType('reset');
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType(user.is_blocked ? 'unblock' : 'block');
                            }}
                          >
                            {user.is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType('delete');
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
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
            <Input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Ex: Comportement inapproprié"
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