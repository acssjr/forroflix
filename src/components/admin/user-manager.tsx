"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Loader2, 
  User, 
  Shield, 
  Check, 
  AlertCircle,
  Plus,
  X,
  Pencil,
  Trash2
} from 'lucide-react';

interface UserType {
  id: string;
  email: string;
  username?: string;
  full_name: string | null;
  role: 'student' | 'admin';
  subscription_active: number; // 0 ou 1
  created_at: string;
}

interface UserManagerProps {
  currentUserId: string;
  initialUsersList?: UserType[];
}

export function UserManager({ currentUserId, initialUsersList = [] }: UserManagerProps) {
  const [users, setUsers] = useState<UserType[]>(initialUsersList);
  const [loading, setLoading] = useState(initialUsersList.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para modal de criação de usuário
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'admin'>('student');
  const [newSubscriptionActive, setNewSubscriptionActive] = useState<number>(1);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Estados para modal de edição de usuário
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<'student' | 'admin'>('student');
  const [editSubscriptionActive, setEditSubscriptionActive] = useState<number>(1);
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Estados para modal de exclusão de usuário
  const [deletingUser, setDeletingUser] = useState<UserType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenEditModal = (user: UserType) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditUsername(user.username || '');
    setEditRole(user.role);
    setEditSubscriptionActive(user.subscription_active);
    setEditPassword('');
    setEditError(null);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editPassword && !/^\d{4}$/.test(editPassword)) {
      setEditError('A nova senha deve ser um PIN de 4 dígitos numéricos.');
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);

      const isSelfEdit = editingUser.id === currentUserId;
      const payload: any = {
        userId: editingUser.id,
        fullName: editFullName,
        username: editUsername
      };

      if (!isSelfEdit) {
        payload.role = editRole;
        payload.subscription_active = editSubscriptionActive;
      }

      if (editPassword) {
        payload.password = editPassword;
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao atualizar usuário');
      }

      setUsers(prev => 
        prev.map(u => u.id === editingUser.id ? data.user : u)
      );

      setEditingUser(null);
      setSuccessMessage('Membro atualizado com sucesso!');
    } catch (err: any) {
      setEditError(err.message || 'Erro ao atualizar dados.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setDeleteLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/users?userId=${deletingUser.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao excluir usuário');
      }

      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      setDeletingUser(null);
      setSuccessMessage('Membro excluído com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir usuário.');
      setDeletingUser(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Função para criar usuário via POST
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPassword)) {
      setCreateError('A senha deve ser um PIN de 4 dígitos numéricos.');
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError(null);

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
          subscriptionActive: newSubscriptionActive
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao cadastrar usuário');
      }

      // Adicionar o novo usuário na lista
      setUsers(prev => [data.user, ...prev]);

      // Resetar form e fechar modal
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('student');
      setNewSubscriptionActive(1);
      setShowCreateModal(false);
      
      setSuccessMessage('Novo usuário cadastrado com sucesso!');
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Carregar lista de usuários se não pré-carregado
  useEffect(() => {
    if (initialUsersList && initialUsersList.length > 0) {
      setUsers(initialUsersList);
      setLoading(false);
      return;
    }

    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Falha ao buscar usuários');
        }
        
        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar usuários. Verifique se possui permissões de administrador.');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpar mensagem de sucesso após alguns segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Atualizar papel ou status de assinatura do usuário
  const handleUpdateUser = async (userId: string, updates: { role?: 'student' | 'admin'; subscription_active?: number }) => {
    try {
      setUpdatingUserId(userId);
      setError(null);

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao atualizar usuário');
      }

      // Atualizar estado local
      setUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, ...data.user } : u)
      );

      setSuccessMessage('Usuário atualizado com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Falha ao processar atualização.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filtrar usuários com base na busca
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const name = (user.full_name || '').toLowerCase();
    const email = user.email.toLowerCase();
    const username = (user.username || '').toLowerCase();
    return name.includes(query) || email.includes(query) || username.includes(query);
  });

  // Formatar data de criação
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (_) {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="text-left space-y-1">
          <h2 className="text-xl font-black text-foreground">Gerenciamento de Acessos</h2>
          <p className="text-xs text-muted-foreground">
            Controle quem pode assistir às aulas e defina novos administradores para a plataforma.
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-primary/10 shrink-0 self-start sm:self-auto cursor-pointer flex items-center justify-center text-xs"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Usuário
        </button>
      </div>

      {/* Feedbacks de Operações */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-red-400">Falha na Operação</h4>
            <p className="text-[11px] text-red-400/80 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-2.5 text-left text-xs font-semibold text-emerald-400 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Barra de Ações & Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card/40 border border-border/40 p-4 rounded-3xl">
        <div className="relative w-full sm:max-w-xs flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, usuário ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-border/60 rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="text-xs text-muted-foreground sm:ml-auto select-none font-medium">
          {searchQuery ? (
            <span>Mostrando {filteredUsers.length} de {users.length} usuários</span>
          ) : (
            <span>Total de {users.length} usuários cadastrados</span>
          )}
        </div>
      </div>

      {/* Tabela de Usuários */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Carregando lista de usuários...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-card border border-border/60 rounded-3xl p-12 text-center text-muted-foreground text-xs font-medium">
          {searchQuery ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado na plataforma.'}
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-slate-900/30 text-[10px] font-black text-muted-foreground tracking-wider uppercase">
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4 hidden md:table-cell">Cadastro</th>
                  <th className="px-6 py-4">Permissão</th>
                  <th className="px-6 py-4 text-center">Status de Acesso</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const isUpdating = updatingUserId === user.id;
                  
                  // Gerar iniciais para avatar
                  const nameParts = (user.full_name || '').split(' ');
                  const initials = nameParts.length >= 2 
                    ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                    : nameParts[0] ? nameParts[0][0].toUpperCase() : 'U';

                  return (
                    <tr key={user.id} className="hover:bg-slate-900/10 transition-colors group">
                      {/* Usuário info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-extrabold text-primary shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0 text-left">
                            <span className="text-xs font-extrabold text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                              {user.full_name || 'Usuário Sem Nome'}
                            </span>
                            <span className="text-[10px] text-muted-foreground/75 truncate max-w-[150px] sm:max-w-[200px]">
                              @{user.username || (user.email ? user.email.split('@')[0] : 'usuario')}
                            </span>
                          </div>
                          {isSelf && (
                            <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider select-none shrink-0">
                              Você
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Data de cadastro */}
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatDate(user.created_at)}
                        </span>
                      </td>

                      {/* Dropdown de permissão */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isSelf ? (
                            <div className="flex items-center gap-1.5 text-xs text-primary font-bold bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10 select-none">
                              <Shield className="w-3.5 h-3.5" />
                              <span>Administrador</span>
                            </div>
                          ) : (
                            <select
                              value={user.role}
                              disabled={isUpdating}
                              onChange={(e) => handleUpdateUser(user.id, { role: e.target.value as 'student' | 'admin' })}
                              className="bg-slate-950 border border-border/80 text-[11px] font-bold text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="student">Aluno / Estudante</option>
                              <option value="admin">Administrador</option>
                            </select>
                          )}
                          {isUpdating && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}
                        </div>
                      </td>

                      {/* Switch de status de acesso */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          {isSelf ? (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 rounded-lg select-none py-1">
                              <UserCheck className="w-3 h-3" />
                              <span>ACESSO VITALÍCIO</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {/* Switch Toggle */}
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateUser(user.id, { 
                                  subscription_active: user.subscription_active === 1 ? 0 : 1 
                                })}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                  user.subscription_active === 1 ? 'bg-primary animate-pulse-slow' : 'bg-slate-800'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    user.subscription_active === 1 ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>

                              {/* Label textual */}
                              <span className={`text-[10px] font-bold select-none w-14 text-left ${
                                user.subscription_active === 1 ? 'text-primary' : 'text-muted-foreground'
                              }`}>
                                {user.subscription_active === 1 ? 'ATIVO' : 'BLOQUEADO'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg transition-colors cursor-pointer"
                            title="Editar Usuário"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          
                          {!isSelf && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para criar novo usuário */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b11] border border-border/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in text-left">
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="text-sm font-black text-foreground">Cadastrar Novo Usuário</h3>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                  setNewUsername('');
                  setNewPassword('');
                  setNewFullName('');
                  setNewRole('student');
                  setNewSubscriptionActive(1);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2 text-xs text-red-500 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Nome do Aluno"
                  className="w-full bg-slate-950 border border-border/60 rounded-xl px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Usuário (username)
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="username"
                  className="w-full bg-slate-950 border border-border/60 rounded-xl px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Senha (PIN de 4 dígitos)
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  pattern="\d*"
                  inputMode="numeric"
                  value={newPassword}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNewPassword(val);
                  }}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-border/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-center tracking-[1.2em] text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Permissão
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'student' | 'admin')}
                    className="w-full bg-slate-950 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                  >
                    <option value="student">Aluno</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Assinatura
                  </label>
                  <select
                    value={newSubscriptionActive}
                    onChange={(e) => setNewSubscriptionActive(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                  >
                    <option value={1}>Ativa / Liberada</option>
                    <option value={0}>Inativa / Bloqueada</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                  }}
                  className="flex-1 py-3 border border-border hover:bg-slate-900 rounded-xl text-xs font-bold text-card-foreground transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs shadow-lg shadow-primary/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Confirmar Cadastro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para editar usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b11] border border-border/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in text-left">
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="text-sm font-black text-foreground">Editar Membro</h3>
              <button 
                onClick={() => {
                  setEditingUser(null);
                  setEditError(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2 text-xs text-red-500 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Nome do Aluno"
                  className="w-full bg-slate-950 border border-border/60 rounded-xl px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Nome de Usuário (username)
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="username"
                  className="w-full bg-slate-950 border border-border/60 rounded-xl px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Redefinir Senha (PIN de 4 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d*"
                  inputMode="numeric"
                  value={editPassword}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setEditPassword(val);
                  }}
                  placeholder="Deixe em branco para manter a mesma"
                  className="w-full bg-slate-950 border border-border/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-center tracking-[1.2em] text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {editingUser.id !== currentUserId ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Permissão
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'student' | 'admin')}
                      className="w-full bg-slate-950 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                    >
                      <option value="student">Aluno</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Assinatura
                    </label>
                    <select
                      value={editSubscriptionActive}
                      onChange={(e) => setEditSubscriptionActive(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-border/60 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                    >
                      <option value={1}>Ativa / Liberada</option>
                      <option value={0}>Inativa / Bloqueada</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/50 border border-border/40 rounded-xl text-[10px] text-muted-foreground font-semibold uppercase text-center">
                  Você não pode alterar suas próprias permissões ou status de assinatura.
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setEditError(null);
                  }}
                  className="flex-1 py-3 border border-border hover:bg-slate-900 rounded-xl text-xs font-bold text-card-foreground transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs shadow-lg shadow-primary/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para confirmação de exclusão */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b11] border border-border/80 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in text-left">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-sm font-black text-foreground">Excluir Conta do Membro</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tem certeza que deseja excluir permanentemente o usuário <strong className="text-foreground">@{deletingUser.username || deletingUser.email.split('@')[0]}</strong>?
                  Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-3 border border-border hover:bg-slate-900 rounded-xl text-xs font-bold text-card-foreground transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteUser}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Confirmar Exclusão'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
