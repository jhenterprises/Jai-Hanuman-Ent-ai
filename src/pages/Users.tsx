import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Plus, Trash2, Shield, User, Edit2, Check, X, 
  UserMinus, UserCheck, Key, Filter, ChevronLeft, ChevronRight,
  MoreVertical, Phone, Mail, Calendar, Info
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user'
  });

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
    setLoading(true);
    try {
      console.log('Fetching all users from API...');
      const res = await api.get('/users');
      console.log('Users received from API:', res.data);
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        throw new Error('Invalid API response');
      }
    } catch (err: any) {
      console.error('Error fetching users from API, trying Firestore fallback:', err);
      try {
        const { getDocs, collection, query, where } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        const snapshot = await getDocs(collection(db, 'users'));
        const usersList = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              role: data.role || 'user',
              status: data.status || 'active'
            };
          })
          .filter((u: any) => !u.deleted_at);
        
        console.log('Users fetched from Firestore fallback:', usersList);
        setUsers(usersList);
      } catch (fsErr: any) {
        console.error('Firestore fallback failed:', fsErr);
        const msg = fsErr.message || 'Failed to fetch users from all sources';
        alert('Error: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setShowAddModal(false);
      resetForm();
      fetchUsers();
      alert('User created successfully');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.put(`/users/${selectedUser.id}`, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role
      });
      setShowEditModal(false);
      resetForm();
      fetchUsers();
      alert('User updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await api.patch(`/users/${user.id}/status`, { status: newStatus });
      fetchUsers();
      alert(`User ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!window.confirm('Reset password to a temporary one?')) return;
    try {
      const res = await api.post(`/users/${id}/reset-password`);
      alert(`Password reset! Temp Password: ${res.data.tempPassword}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to move this user to the Recycle Bin?',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${id}`);
          fetchUsers();
          alert('User moved to Recycle Bin');
        } catch (err: any) {
          alert(err.response?.data?.error || 'Failed to delete user');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '', role: 'user' });
    setSelectedUser(null);
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: '',
      role: user.role
    });
    setShowEditModal(true);
  };

  // Filtering & Sorting
  const filtered = users
    .filter(u => {
      const matchesSearch = 
        u.name?.toLowerCase().includes(search.toLowerCase()) || 
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      if (sortBy === 'created_at') {
        valA = a.created_at?._seconds || 0;
        valB = b.created_at?._seconds || 0;
      }

      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const safeFormat = (timestamp: any, formatStr: string) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
      return format(date, formatStr);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage system users, roles, and access controls.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-blue-600/20 font-bold text-sm w-fit"
        >
          <Plus size={20} />
          Add New User
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email, phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="staff">Staff</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Info size={16} className="text-slate-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="created_at">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
          </select>
          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white"
          >
            {sortOrder === 'asc' ? <ChevronLeft className="rotate-90" /> : <ChevronRight className="rotate-90" />}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-700/30 border-b border-slate-700/50">
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">User Details</th>
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Contact Info</th>
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Role & Status</th>
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Joined Date</th>
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-400 text-sm font-medium">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-500 italic">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginated.map(item => (
                  <tr key={item.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-lg font-bold text-white shadow-inner">
                          {(item.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-slate-200 font-bold text-sm">{item.name || 'Unknown User'}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-300 text-xs">
                          <Mail size={12} className="text-slate-500" />
                          {item.email}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <Phone size={12} className="text-slate-500" />
                          {item.phone || 'No phone'}
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider w-fit ${
                          item.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          item.role === 'staff' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {item.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                          {item.role}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter w-fit ${
                          item.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {item.status === 'active' ? <UserCheck size={10} /> : <UserMinus size={10} />}
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Calendar size={12} className="text-slate-500" />
                        {safeFormat(item.created_at, 'dd MMM, yyyy')}
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                          title="Edit User"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(item)}
                          className={`p-2 transition-all rounded-xl ${
                            item.status === 'active' ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={item.status === 'active' ? 'Disable User' : 'Enable User'}
                        >
                          {item.status === 'active' ? <UserMinus size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button 
                          onClick={() => handleResetPassword(item.id)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                          title="Reset Password"
                        >
                          <Key size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-slate-700/30 flex items-center justify-between bg-slate-800/20">
            <span className="text-xs text-slate-500">
              Showing <span className="text-slate-300 font-bold">{(page - 1) * itemsPerPage + 1}</span> to <span className="text-slate-300 font-bold">{Math.min(page * itemsPerPage, filtered.length)}</span> of <span className="text-slate-300 font-bold">{filtered.length}</span> users
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      page === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900/50 text-slate-500 hover:text-white border border-slate-700/50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{showAddModal ? 'Add New User' : 'Edit User Details'}</h2>
                    <p className="text-slate-400 text-sm mt-1">{showAddModal ? 'Create a new account for a user or staff.' : 'Update account information and roles.'}</p>
                  </div>
                  <button 
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={showAddModal ? handleAdd : handleEdit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text" required
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Email Address</label>
                      <input 
                        type="email" required
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Phone Number</label>
                        <input 
                          type="tel" required
                          value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                          placeholder="+91 9876543210"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Account Role</label>
                        <select 
                          value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                          className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="user">User</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    {showAddModal && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Initial Password</label>
                        <input 
                          type="password" required
                          value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                      className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20"
                    >
                      {showAddModal ? 'Create User' : 'Update User'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
