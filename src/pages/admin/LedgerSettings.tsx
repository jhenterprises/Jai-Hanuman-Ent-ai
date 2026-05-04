import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  Settings2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface LedgerField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
  required: boolean;
  order: number;
  isActive: boolean;
}

const LedgerSettings = () => {
  const [fields, setFields] = useState<LedgerField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<LedgerField | null>(null);
  const [formData, setFormData] = useState<Partial<LedgerField>>({
    label: '',
    key: '',
    type: 'text',
    required: false,
    isActive: true,
    options: []
  });

  useEffect(() => {
    const q = query(collection(db, 'ledger_config'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fieldData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LedgerField[];
        setFields(fieldData);
        setLoading(false);
      } catch (err) {
        console.error("Error processing field configs:", err);
        toast.error("Data error. Check console.");
        setLoading(false);
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.error("Ledger config: Permission Denied. User:", auth.currentUser?.email, "UID:", auth.currentUser?.uid);
      } else {
        console.error("Ledger config snapshot error:", error);
      }
      toast.error(`Error: ${error.message}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (field?: LedgerField) => {
    if (field) {
      setEditingField(field);
      setFormData({ ...field });
    } else {
      setEditingField(null);
      setFormData({
        label: '',
        key: '',
        type: 'text',
        required: false,
        isActive: true,
        options: []
      });
    }
    setShowModal(true);
  };

  const handleUpdateKey = (label: string) => {
    if (editingField) {
      setFormData(prev => ({ ...prev, label }));
      return;
    }
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
    setFormData(prev => ({ ...prev, label, key }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key || !formData.label) {
      toast.error('Key and Label are required');
      return;
    }

    try {
      if (editingField) {
        await updateDoc(doc(db, 'ledger_config', editingField.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Field updated successfully');
      } else {
        // Find next order
        const orders = fields.map(f => f.order);
        const nextOrder = orders.length > 0 ? Math.max(...orders) + 1 : 1;
        await addDoc(collection(db, 'ledger_config'), {
          ...formData,
          order: nextOrder,
          createdAt: serverTimestamp()
        });
        toast.success('Field added successfully');
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving field:', error);
      toast.error('Failed to save field');
    }
  };

  const initializeDefaultTemplate = async () => {
    if (fields.length > 0 && !window.confirm('This will add recommended fields. Your existing fields will remain. Continue?')) {
      return;
    }

    const defaultFields = [
      { key: 'service_type', label: 'Service Type', type: 'select', options: ['Standard Service', 'Money Transfer', 'Cash Withdrawal', 'Print', 'Other'], required: true, order: 1, isActive: true },
      { key: 'customer_name', label: 'Customer Name', type: 'text', required: true, order: 2, isActive: true },
      { key: 'service_name', label: 'Service Name/Detail', type: 'text', required: true, order: 3, isActive: true },
      { key: 'principle_amount', label: 'Principal Amount', type: 'number', required: false, order: 4, isActive: true },
      { key: 'profit_amount', label: 'Profit / Fee', type: 'number', required: false, order: 5, isActive: true },
      { key: 'payment_mode', label: 'Payment Mode', type: 'select', options: ['Cash', 'PhonePe', 'GPay', 'Bank Transfer'], required: true, order: 6, isActive: true },
    ];

    const loadingToast = toast.loading('Initializing fields...');
    try {
      const promises = defaultFields.map(field => 
        addDoc(collection(db, 'ledger_config'), {
          ...field,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      toast.success('Default fields initialized successfully!', { id: loadingToast });
    } catch (error) {
      toast.error('Failed to initialize fields', { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this field?')) return;
    try {
      await deleteDoc(doc(db, 'ledger_config', id));
      toast.success('Field deleted');
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const toggleActive = async (field: LedgerField) => {
    try {
      await updateDoc(doc(db, 'ledger_config', field.id), {
        isActive: !field.isActive
      });
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const moveField = async (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    
    // Swap orders
    const field1 = newFields[index];
    const field2 = newFields[targetIndex];
    
    try {
      await Promise.all([
        updateDoc(doc(db, 'ledger_config', field1.id), { order: field2.order }),
        updateDoc(doc(db, 'ledger_config', field2.id), { order: field1.order })
      ]);
    } catch (error) {
      toast.error('Failed to reorder');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings2 className="text-blue-500" />
            Ledger Settings
          </h1>
          <p className="text-slate-400 mt-1">Manage dynamic input fields for the ledger system.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={initializeDefaultTemplate}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold border border-slate-700 transition-all"
          >
            <Check size={20} /> Load Default Template
          </button>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus size={20} /> Add New Field
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {fields.length === 0 ? (
          <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-3xl p-12 text-center">
            <AlertCircle className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-400">No custom fields defined yet. Click "Add New Field" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <motion.div
                key={field.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-800 border ${field.isActive ? 'border-slate-700' : 'border-slate-800 opacity-60'} rounded-2xl group transition-all`}
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-600 hover:text-white disabled:opacity-0"
                    >
                      <Plus size={14} className="rotate-45" />
                    </button>
                    <button 
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                      className="text-slate-600 hover:text-white disabled:opacity-0"
                    >
                      <Plus size={14} className="rotate-[135deg]" />
                    </button>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      {field.label}
                      <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-md font-mono uppercase">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Required</span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-500 font-mono">key: {field.key}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => toggleActive(field)}
                    className={`p-2 rounded-lg transition-colors ${field.isActive ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' : 'text-slate-400 bg-slate-700/50 hover:bg-slate-700'}`}
                    title={field.isActive ? 'Disable' : 'Enable'}
                  >
                    {field.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => handleOpenModal(field)}
                    className="p-2 text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(field.id)}
                    className="p-2 text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {editingField ? 'Edit Field Configuration' : 'Add New Field'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Field Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Service Type"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.label}
                    onChange={(e) => handleUpdateKey(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Field Key (Auto-generated)</label>
                  <input
                    type="text"
                    placeholder="e.g. service_type"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-500 focus:ring-0 outline-none font-mono text-sm"
                    value={formData.key}
                    readOnly
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Field Type</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="text">Text Input</option>
                      <option value="number">Number Input</option>
                      <option value="date">Date Picker</option>
                      <option value="select">Dropdown Menu</option>
                    </select>
                  </div>

                  <div className="flex items-end pb-1 gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={formData.required}
                          onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors ${formData.required ? 'bg-blue-600' : 'bg-slate-700'}`} />
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.required ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Required</span>
                    </label>
                  </div>
                </div>

                {formData.type === 'select' && (
                  <div className="space-y-2 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <label className="text-sm font-medium text-slate-400">Options (Comma separated)</label>
                    <textarea
                      placeholder="Option 1, Option 2, Option 3"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 text-sm"
                      value={formData.options?.join(', ')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        options: e.target.value.split(',').map(o => o.trim()).filter(o => o !== '') 
                      })}
                    />
                    <p className="text-[10px] text-slate-500 font-medium">List the items as you want them to appear in the dropdown.</p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> {editingField ? 'Update Field' : 'Save Field'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LedgerSettings;
