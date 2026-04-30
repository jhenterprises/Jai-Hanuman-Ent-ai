import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RefreshCcw, Search, Filter, AlertCircle, CheckCircle2, Loader2, Database } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, addDoc, query, orderBy, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
      const q = query(collection(db, 'recycle_bin'), orderBy('deleted_at', 'desc'));
      const snapshot = await getDocs(q);
      const deletedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(deletedItems);
    } catch (err) {
      console.error('Error fetching recycle bin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string, type: string) => {
    setActionLoading(`restore-${type}-${id}`);
    try {
      const binRef = doc(db, 'recycle_bin', id);
      const binSnap = await getDoc(binRef);
      
      if (binSnap.exists()) {
        const item = binSnap.data();
        const collectionName = item.type === 'service' ? 'services' : (item.type === 'user' ? 'users' : 'applications');
        
        // Restore to original collection
        const restoredData = { ...item };
        // Remove bin-specific fields
        delete restoredData.type;
        delete restoredData.deleted_at;
        delete restoredData.deleted_by;
        const originalId = restoredData.original_id;
        delete restoredData.original_id;
        
        if (originalId) {
          await updateDoc(doc(db, collectionName, originalId), restoredData);
        } else {
          // If for some reason we don't have original_id, we add it back as a new doc
          await addDoc(collection(db, collectionName), restoredData);
        }
        
        // Delete from bin
        await deleteDoc(binRef);
        setItems(items.filter(item => item.id !== id));
        alert('Restored successfully');
      }
    } catch (err) {
      console.error('Error restoring item:', err);
      alert('Failed to restore item');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = (id: string, type: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanent Delete',
      message: 'This action cannot be undone. Are you sure you want to delete this permanently?',
      onConfirm: async () => {
        setActionLoading(`delete-${type}-${id}`);
        try {
          await deleteDoc(doc(db, 'recycle_bin', id));
          setItems(items.filter(item => item.id !== id));
          alert('Deleted permanently');
        } catch (err) {
          console.error('Error deleting item:', err);
          alert('Failed to delete item');
        } finally {
          setActionLoading(null);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = (item.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (item.reference_number || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Trash2 className="text-red-500" /> Recycle Bin
          </h1>
          <p className="text-slate-500">Soft deleted applications and data managed here. Only Administrators can access this.</p>
        </div>
      </header>

      <div className="glass rounded-[2.5rem] p-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="text"
              placeholder="Search by ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner"
            />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-12 pr-10 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all appearance-none"
              >
                <option value="all">All Items</option>
                <option value="application">Applications Only</option>
                <option value="service">Services Only</option>
                <option value="user">Users Only</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="text-blue-500 animate-spin" size={40} />
            <p className="text-slate-500">Scanning the vault...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 space-y-6">
            <div className="w-24 h-24 bg-slate-800/50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-600 border border-white/5 shadow-2xl">
              <Database size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white tracking-tight">The bin is empty</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Deleted data will appear here for 30 days before being automatically purged (simulation).</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-white/5">
                  <th className="py-5 px-6">S.No</th>
                  <th className="py-5 px-6">Application ID</th>
                  <th className="py-5 px-6">User Name</th>
                  <th className="py-5 px-6">Service Name</th>
                  <th className="py-5 px-6">Deleted Date</th>
                  <th className="py-5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item, index) => (
                  <tr key={`${item.id}`} className="group hover:bg-white/10 transition-all duration-300">
                    <td className="py-6 px-6 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-6 px-6">
                      <div className="font-bold text-white font-mono tracking-tighter text-sm bg-slate-800 px-2.5 py-1 rounded-lg border border-white/5 inline-block">
                        {item.reference_number || item.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="font-bold text-slate-200">{item.name || item.user_name}</div>
                      <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{item.type}</div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="text-sm font-medium text-slate-400 capitalize">
                        {item.service_name || item.service_type || 'System Admin'}
                      </div>
                    </td>
                    <td className="py-6 px-6 text-slate-400 text-xs">
                      {safeFormat(item.deleted_at, 'dd MMM yyyy, hh:mm a')}
                    </td>
                    <td className="py-6 px-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => handleRestore(item.id, item.type)}
                          disabled={actionLoading === `restore-${item.type}-${item.id}`}
                          className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
                          title="Restore to Main List"
                        >
                          {actionLoading === `restore-${item.type}-${item.id}` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                          Restore
                        </button>
                        <button 
                          onClick={() => handlePermanentDelete(item.id, item.type)}
                          disabled={actionLoading === `delete-${item.type}-${item.id}`}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
                          title="Permanently Delete"
                        >
                          {actionLoading === `delete-${item.type}-${item.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Delete
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
