import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RefreshCcw, Search, Filter, AlertCircle, CheckCircle2, Loader2, Database } from 'lucide-react';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { safeFormat } from '../utils/dateUtils';

const RecycleBin = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
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
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    try {
      const res = await api.get('/recycle-bin');
      setItems(res.data);
    } catch (err) {
      console.error('Error fetching recycle bin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number, type: string) => {
    setActionLoading(`restore-${type}-${id}`);
    try {
      await api.post('/recycle-bin/restore', { id, type });
      setItems(items.filter(item => !(item.id === id && item.type === type)));
    } catch (err) {
      console.error('Error restoring item:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = (id: number, type: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Delete',
      message: 'Are you sure you want to permanently delete this item? This action cannot be undone.',
      onConfirm: async () => {
        setActionLoading(`delete-${type}-${id}`);
        try {
          await api.delete(`/recycle-bin/permanent/${type}/${id}`);
          setItems(items.filter(item => !(item.id === id && item.type === type)));
        } catch (err) {
          console.error('Error deleting item:', err);
        } finally {
          setActionLoading(null);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Trash2 className="text-red-500" /> Recycle Bin
          </h1>
          <p className="text-slate-500">Restore or permanently delete data moved to the bin.</p>
        </div>
      </header>

      <div className="glass rounded-[2.5rem] p-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text"
              placeholder="Search deleted items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-12 pr-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all appearance-none"
              >
                <option value="all">All Types</option>
                <option value="service">Services</option>
                <option value="user">Users</option>
                <option value="application">Applications</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="text-blue-500 animate-spin" size={40} />
            <p className="text-slate-500">Loading deleted data...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-600">
              <Database size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Recycle bin is empty</h3>
              <p className="text-slate-500">No deleted items found matching your criteria.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-widest font-black border-b border-white/5">
                  <th className="pb-4 px-4">Item Name</th>
                  <th className="pb-4 px-4">Type</th>
                  <th className="pb-4 px-4">Deleted At</th>
                  <th className="pb-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="group hover:bg-white/5 transition-colors">
                    <td className="py-6 px-4">
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase">ID: {item.id}</div>
                    </td>
                    <td className="py-6 px-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        item.type === 'service' ? 'text-blue-400 border-blue-400/20 bg-blue-400/5' :
                        item.type === 'user' ? 'text-purple-400 border-purple-400/20 bg-purple-400/5' :
                        'text-amber-400 border-amber-400/20 bg-amber-400/5'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-slate-400 text-sm">
                      {safeFormat(item.deleted_at, 'dd/MM/yyyy, hh:mm a')}
                    </td>
                    <td className="py-6 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleRestore(item.id, item.type)}
                          disabled={actionLoading === `restore-${item.type}-${item.id}`}
                          className="p-3 glass rounded-xl text-emerald-400 hover:bg-emerald-400/10 transition-all disabled:opacity-50"
                          title="Restore"
                        >
                          {actionLoading === `restore-${item.type}-${item.id}` ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                        </button>
                        <button 
                          onClick={() => handlePermanentDelete(item.id, item.type)}
                          disabled={actionLoading === `delete-${item.type}-${item.id}`}
                          className="p-3 glass rounded-xl text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                          title="Permanently Delete"
                        >
                          {actionLoading === `delete-${item.type}-${item.id}` ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

export default RecycleBin;
