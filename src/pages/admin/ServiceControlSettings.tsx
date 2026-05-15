import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Power, Construction, Clock, Save, 
  MessageSquare, LayoutGrid, CheckCircle2, XCircle, 
  RefreshCcw, Smartphone, Zap, Send, Fingerprint,
  Wallet, FileJson, LucideIcon, Trash2, Plus,
  Tv, Droplets, Flame, Wifi, CreditCard, ShieldCheck,
  UserCheck, Database
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { useServiceControl, ServiceControl } from '../../context/ServiceControlContext';
import GlassCard from '../../components/GlassCard';
import { toast } from 'react-hot-toast';

const ICON_MAP: Record<string, LucideIcon> = {
  mobileRecharge: Smartphone,
  dthRecharge: Tv,
  electricityBill: Zap,
  waterBill: Droplets,
  gasBill: Flame,
  broadbandBill: Wifi,
  dmt: Send,
  aeps: Fingerprint,
  aadhaarPay: CreditCard,
  wallet: Wallet,
  pan: FileJson,
  aadhaarService: UserCheck,
  fastag: Database,
};

const ServiceControlSettings = () => {
  const { services, loading } = useServiceControl();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ServiceControl>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleEdit = (service: ServiceControl) => {
    setEditingId(service.id);
    setFormData(service);
  };

  const handleSave = async (id: string, partial?: Partial<ServiceControl>) => {
    const toastId = toast.loading('Saving changes...');
    try {
      const dataToSave = {
        ...(partial || formData),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'service_controls', id), dataToSave, { merge: true });
      toast.success('Service updated successfully', { id: toastId });
      if (!partial) setEditingId(null);
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to update service', { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service control?')) return;
    const toastId = toast.loading('Deleting service...');
    try {
      await deleteDoc(doc(db, 'service_controls', id));
      toast.success('Service deleted', { id: toastId });
    } catch (error) {
      toast.error('Delete failed', { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newServiceData, setNewServiceData] = useState({
    key: '',
    name: ''
  });

  const handleAddNewService = async () => {
    if (!newServiceData.key || !newServiceData.name) {
      toast.error('Please enter both key and name');
      return;
    }

    const toastId = toast.loading('Adding service...');
    try {
      const newService = {
        serviceKey: newServiceData.key,
        serviceName: newServiceData.name,
        isLive: true,
        maintenanceMode: false,
        comingSoon: false,
        bannerMessage: '',
        order: services.length + 1,
        apiStatus: 'connected',
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'service_controls', newServiceData.key), newService);
      toast.success('Service added', { id: toastId });
      setShowAddForm(false);
      setNewServiceData({ key: '', name: '' });
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service', { id: toastId });
    }
  };

  const seedServices = async () => {
    if (!window.confirm('This will initialize all standard service controls. Existing ones will be kept. Proceed?')) return;
    
    const defaults = [
      { key: 'mobileRecharge', name: 'Mobile Recharge', order: 1 },
      { key: 'dthRecharge', name: 'DTH Recharge', order: 2 },
      { key: 'electricityBill', name: 'Electricity Bill', order: 3 },
      { key: 'waterBill', name: 'Water Bill', order: 4 },
      { key: 'gasBill', name: 'Gas Bill', order: 5 },
      { key: 'broadbandBill', name: 'Broadband Bill', order: 6 },
      { key: 'fastag', name: 'Fastag Recharge', order: 7 },
      { key: 'dmt', name: 'Money Transfer (DMT)', order: 8 },
      { key: 'aeps', name: 'AEPS Banking', order: 9 },
      { key: 'aadhaarPay', name: 'Aadhaar Pay', order: 10 },
      { key: 'pan', name: 'PAN Services', order: 11 },
      { key: 'aadhaarService', name: 'Aadhaar Services', order: 12 },
      { key: 'wallet', name: 'Wallet Load', order: 13 },
    ];

    const toastId = toast.loading('Seeding services...');
    console.log('Starting seed process with defaults:', defaults);
    
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const item of defaults) {
        // Check both ID and serviceKey field
        const isExisting = services.some(s => s.id === item.key || s.serviceKey === item.key);
        if (!isExisting) {
          console.log(`Adding service: ${item.key}`);
          const docRef = doc(db, 'service_controls', item.key);
          batch.set(docRef, {
            serviceKey: item.key,
            serviceName: item.name,
            isLive: true,
            maintenanceMode: false,
            comingSoon: false,
            bannerMessage: '',
            order: item.order,
            apiStatus: 'connected',
            updatedAt: new Date().toISOString()
          });
          count++;
        } else {
          console.log(`Service already exists: ${item.key}`);
        }
      }

      if (count > 0) {
        console.log(`Committing batch with ${count} new services`);
        await batch.commit();
        toast.success(`Successfully initialized ${count} services`, { id: toastId });
      } else {
        console.log('No new services to add');
        toast.success('All default services are already present', { id: toastId });
      }
    } catch (error) {
      console.error('Seed error full context:', error);
      toast.error(`Failed to seed services: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-4">
        <RefreshCcw className="animate-spin text-blue-500" size={40} />
        <p className="font-black uppercase tracking-widest text-xs">Loading Controls...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-32"
    >
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tight">Service <span className="text-blue-500">Control Panel</span></h1>
          <p className="text-slate-500">Enable/disable financial services and manage maintenance modes.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-6 py-3 ${showAddForm ? 'bg-red-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-500'} text-white font-black rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-600/20 uppercase tracking-widest text-xs`}
        >
          {showAddForm ? <XCircle size={18} /> : <Plus size={18} />}
          {showAddForm ? 'Cancel' : 'Add Service'}
        </button>
        <button 
          onClick={seedServices}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl flex items-center gap-2 transition-all border border-white/5 uppercase tracking-widest text-xs"
        >
          <RefreshCcw size={18} /> Initialize Defaults
        </button>
      </header>

      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <GlassCard className="p-8 border-blue-500/30 bg-blue-500/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Service Key (e.g. mobileRecharge)</label>
                <input 
                  value={newServiceData.key}
                  onChange={e => setNewServiceData({...newServiceData, key: e.target.value})}
                  placeholder="lowerCamelCase recommended"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold focus:ring-2 ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Service Display Name</label>
                <input 
                  value={newServiceData.name}
                  onChange={e => setNewServiceData({...newServiceData, name: e.target.value})}
                  placeholder="e.g. Mobile Recharge"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold focus:ring-2 ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleAddNewService}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Plus size={16} /> Create Service Control
              </button>
              <button 
                onClick={() => setShowAddForm(false)}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl uppercase tracking-widest text-[10px]"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {services.map((service) => {
          const isEditing = editingId === service.id;
          const Icon = ICON_MAP[service.serviceKey] || Settings;

          return (
            <GlassCard key={service.id} className="p-8 border-white/5 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Status Indicator */}
                <div className="flex items-start gap-6 lg:w-1/3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-white/5 shadow-2xl relative overflow-hidden group`}>
                    <div className={`absolute inset-0 opacity-10 ${service.isLive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <Icon size={32} className={service.isLive ? 'text-emerald-400' : 'text-red-400'} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">{service.serviceName}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${service.isLive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {service.isLive ? 'Live' : 'Disabled'}
                      </span>
                      {service.maintenanceMode && (
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md text-[10px] font-black uppercase tracking-widest">
                          Maintenance
                        </span>
                      )}
                      {service.comingSoon && (
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[10px] font-black uppercase tracking-widest">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 pt-2">
                      <div className={`w-2 h-2 rounded-full ${service.apiStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                      API Status: <span className="uppercase">{service.apiStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button 
                    onClick={() => handleSave(service.id, { isLive: !service.isLive })}
                    className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${service.isLive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                  >
                    <Power size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Toggle Live</span>
                  </button>

                  <button 
                    onClick={() => handleSave(service.id, { maintenanceMode: !service.maintenanceMode })}
                    className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${service.maintenanceMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                  >
                    <Construction size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Maintenance</span>
                  </button>

                  <button 
                    onClick={() => handleSave(service.id, { comingSoon: !service.comingSoon })}
                    className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${service.comingSoon ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                  >
                    <Clock size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Coming Soon</span>
                  </button>

                  <button 
                    onClick={() => handleEdit(service)}
                    className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${isEditing ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                  >
                    <Settings size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Configure</span>
                  </button>
                </div>
              </div>

              {isEditing && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8 pt-8 border-t border-white/5 space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Service Display Name</label>
                      <input 
                        value={formData.serviceName}
                        onChange={e => setFormData({...formData, serviceName: e.target.value})}
                        className="w-full p-4 bg-white/5 border border-white/5 rounded-xl text-white font-bold focus:ring-2 ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Banner Message (Optional)</label>
                      <div className="relative">
                        <MessageSquare size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                          value={formData.bannerMessage}
                          onChange={e => setFormData({...formData, bannerMessage: e.target.value})}
                          placeholder="e.g. 5% Cashback on First Recharge"
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-xl text-white font-bold focus:ring-2 ring-blue-500 outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Display Order</label>
                      <input 
                        type="number"
                        value={formData.order}
                        onChange={e => setFormData({...formData, order: parseInt(e.target.value)})}
                        className="w-full p-4 bg-white/5 border border-white/5 rounded-xl text-white font-bold focus:ring-2 ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">API Status</label>
                      <select 
                        value={formData.apiStatus}
                        onChange={e => setFormData({...formData, apiStatus: e.target.value as any})}
                        className="w-full p-4 bg-slate-900 border border-white/5 rounded-xl text-white font-bold outline-none"
                      >
                        <option value="connected">Connected</option>
                        <option value="disconnected">Disconnected</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleSave(service.id)}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <Save size={16} /> Save Changes
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl uppercase tracking-widest text-[10px] transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleDelete(service.id)}
                      className="p-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ServiceControlSettings;
