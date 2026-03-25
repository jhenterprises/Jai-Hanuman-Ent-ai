import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Trash2, Shield, User, Edit2, Check, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

const UsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', role: 'user' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');
  
  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/users', newUser);
    setShowAdd(false);
    setNewUser({ name: '', email: '', phone: '', password: '', role: 'user' });
    fetchUsers();
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${id}`);
          fetchUsers();
        } catch (err: any) {
          if (err.response && err.response.status === 400) {
            alert(err.response.data.error);
          } else {
            console.error('Error deleting user:', err);
            alert('Failed to delete user. Please try again.');
          }
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEditRole = async (id: number) => {
    try {
      await api.put(`/users/${id}/role`, { role: editRole });
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update role', error);
    }
  };

  const startEditing = (user: any) => {
    setEditingId(user.id);
    setEditRole(user.role);
  };

  const filtered = users.filter(u => 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Users & Staff</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-64"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add User</span>
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Add New User/Staff</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input 
              type="text" placeholder="Full Name" required
              value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            />
            <input 
              type="email" placeholder="Email" required
              value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            />
            <input 
              type="tel" placeholder="Phone" required
              value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            />
            <input 
              type="password" placeholder="Password" required
              value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            />
            <select 
              value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            >
              <option value="user">User</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <div className="lg:col-span-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">Save User</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-700/30 border-b border-slate-700/50">
                <th className="p-4 text-slate-300 font-semibold">Name</th>
                <th className="p-4 text-slate-300 font-semibold">Email</th>
                <th className="p-4 text-slate-300 font-semibold">Phone</th>
                <th className="p-4 text-slate-300 font-semibold">Role</th>
                <th className="p-4 text-slate-300 font-semibold">Password Actions</th>
                <th className="p-4 text-slate-300 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="p-4 text-slate-200 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    {item.name}
                  </td>
                  <td className="p-4 text-slate-400">{item.email}</td>
                  <td className="p-4 text-slate-400">{item.phone}</td>
                  <td className="p-4">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <select 
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="px-2 py-1 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 text-sm"
                        >
                          <option value="user">User</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => handleEditRole(item.id)} className="text-green-400 hover:text-green-300">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        item.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        item.role === 'staff' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {item.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                        {item.role.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => alert('Reset Password functionality')} className="text-blue-400 hover:text-blue-300 text-xs">Reset</button>
                    <button onClick={() => alert('Set Password functionality')} className="text-green-400 hover:text-green-300 text-xs">Set</button>
                  </td>
                  <td className="p-4 text-right">
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => startEditing(item)}
                          className="text-slate-500 hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-slate-700/50 mr-1"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default UsersPage;
