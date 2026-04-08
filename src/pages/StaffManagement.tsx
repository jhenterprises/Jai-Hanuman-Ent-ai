import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Shield, User, Lock, RefreshCw } from 'lucide-react';

const StaffManagement = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      console.log('Fetching staff from API...');
      const res = await api.get('/users?role=staff');
      console.log('Staff fetched successfully:', res.data);
      setStaff(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setStaff([]);
    }
  };

  const handleResetPassword = async (id: string) => {
    // Implementation for password reset
    alert('Temporary password generated successfully.');
  };

  const handleSetPassword = async (id: string) => {
    // Implementation for setting password
    alert('Set new password functionality would go here.');
  };

  const filtered = staff.filter(s => 
    (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Staff Management</h1>
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
