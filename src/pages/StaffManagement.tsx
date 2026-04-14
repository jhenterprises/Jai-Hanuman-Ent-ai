import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Shield, User, Lock, RefreshCw, Plus, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const StaffManagement = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', password: '', role: 'staff' });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      console.log('Fetching staff from API...');
      const res = await api.get('/users?role=staff');
      console.log('Staff fetched successfully:', res.data);
      setStaff(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Error fetching staff from API:', err);
      
      // Fallback to Firestore if API fails (e.g. server restarting)
      if (err.message?.includes('HTML') || !err.response || err.code === 'ECONNABORTED' || err.response?.status >= 500) {
        try {
          console.log('Attempting to fetch staff from Firestore fallback...');
          const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'staff')));
          const staffList = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter((s: any) => !s.deleted_at);
          
          console.log('Staff fetched from Firestore successfully');
          setStaff(staffList);
        } catch (fsErr) {
          console.error('Firestore fallback failed:', fsErr);
          setStaff([]);
        }
      } else {
        setStaff([]);
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', newStaff);
      setShowAdd(false);
      setNewStaff({ name: '', email: '', phone: '', password: '', role: 'staff' });
      fetchStaff();
      alert('Staff member added successfully');
    } catch (err: any) {
      console.error('Error adding staff:', err);
      alert(err.response?.data?.error || 'Failed to add staff member');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!window.confirm('Are you sure you want to reset this staff member\'s password?')) return;
    try {
      const res = await api.post(`/users/${id}/reset-password`);
      alert(`Password reset successfully. Temporary password: ${res.data.tempPassword}\n\nPlease share this with the staff member.`);
    } catch (err: any) {
      console.error('Reset password error:', err);
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleSetPassword = async (id: string) => {
    const newPassword = window.prompt('Enter new password (min 6 characters):');
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    try {
      await api.post(`/users/${id}/set-password`, { password: newPassword });
      alert('Password updated successfully');
    } catch (err: any) {
      console.error('Set password error:', err);
      alert(err.response?.data?.error || 'Failed to set password');
    }
  };

  const filtered = staff.filter(s => 
    (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Staff Management</h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors w-fit"
        >
          <Plus size={20} />
          <span>Add Staff</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Add New Staff Member</h2>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 ml-1">Full Name</label>
              <input 
                type="text" placeholder="Full Name" required
                value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 ml-1">Email</label>
              <input 
                type="email" placeholder="Email" required
                value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 ml-1">Phone</label>
              <input 
                type="tel" placeholder="Phone" required
                value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 ml-1">Password</label>
              <input 
                type="password" placeholder="Password" required
                value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium">Save Staff Member</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search staff..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-64"
        />
      </div>
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-700/30 border-b border-slate-700/50">
              <th className="p-4 text-slate-300 font-semibold">Staff Name</th>
              <th className="p-4 text-slate-300 font-semibold">Email</th>
              <th className="p-4 text-slate-300 font-semibold">Role</th>
              <th className="p-4 text-slate-300 font-semibold">Status</th>
              <th className="p-4 text-slate-300 font-semibold">Password Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No staff members found.
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                <td className="p-4 text-slate-200">{s.name || 'Unknown Staff'}</td>
                <td className="p-4 text-slate-400">{s.email || 'No Email'}</td>
                <td className="p-4 text-slate-400">{s.role || 'staff'}</td>
                <td className="p-4 text-slate-400">Active</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => handleResetPassword(s.id)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm">
                    <RefreshCw size={16} /> Reset
                  </button>
                  <button onClick={() => handleSetPassword(s.id)} className="text-green-400 hover:text-green-300 flex items-center gap-1 text-sm">
                    <Lock size={16} /> Set Password
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffManagement;
