import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as LucideIcons from 'lucide-react';
import { Search, Plus, Trash2, ExternalLink, ArrowRight, X, Check, Eye, EyeOff, Power, Edit2, Rocket, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import ModernButton from '../components/ModernButton';

import { useConfig } from '../context/ConfigContext';

const Services = () => {
  const { config } = useConfig();
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceInputs, setServiceInputs] = useState<any[]>([]);
  const [newInput, setNewInput] = useState({ input_label: '', input_type: 'text', required: true });
  
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

  const [formData, setFormData] = useState({ 
    service_name: '', 
    description: '', 
    url: '',
    type: 'internal',
    icon: '',
    application_id: '',
    visible_status: 1,
    active_status: 1,
    service_price: 0,
    payment_required: false,
    fee: 0,
    staff_commission: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await api.get('/services');
      setServices(res.data);
    } catch (err) {
      console.error('Error fetching services:', err);
      alert('Services temporarily unavailable. Please contact admin.');
    }
  };

  const fetchServiceInputs = async (serviceId: number) => {
    try {
      const res = await api.get(`/service-inputs/${serviceId}`);
      setServiceInputs(res.data);
    } catch (err) {
      console.error('Error fetching service inputs:', err);
    }
  };

  const handleAddInput = async () => {
    if (!editingService || !newInput.input_label) return;
    try {
      await api.post('/service-inputs', {
        service_id: editingService.service_id,
        ...newInput
      });
      setNewInput({ input_label: '', input_type: 'text', required: true });
      fetchServiceInputs(editingService.service_id);
    } catch (err) {
      console.error('Error adding input:', err);
      alert('Failed to add input field.');
    }
  };

  const handleDeleteInput = (inputId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Input Field',
      message: 'Are you sure you want to delete this input field?',
      onConfirm: async () => {
        try {
          await api.delete(`/service-inputs/${inputId}`);
          if (editingService) {
            fetchServiceInputs(editingService.service_id);
          }
        } catch (err) {
          console.error('Error deleting input field:', err);
          alert('Unable to delete input field. Please try again.');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        await api.put(`/services/${editingService.service_id}`, formData);
      } else {
        await api.post('/services', formData);
      }
      setShowForm(false);
      setEditingService(null);
      setFormData({ 
        service_name: '', 
        description: '', 
        url: '', 
        type: 'internal',
        icon: '',
        application_id: '',
        visible_status: 1, 
        active_status: 1,
        service_price: 0,
        payment_required: false,
        fee: 0,
        staff_commission: 0
      });
      fetchServices();
    } catch (err) {
      console.error('Error saving service:', err);
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      service_name: service.service_name,
      description: service.description,
      url: service.url || '',
      type: service.type || 'internal',
      icon: service.icon || '',
      application_id: service.application_id || '',
      visible_status: service.visible_status,
      active_status: service.active_status,
      service_price: service.service_price || 0,
      payment_required: service.payment_required === 1,
      fee: service.fee || 0,
      staff_commission: service.staff_commission || 0
    });
    setShowForm(true);
    fetchServiceInputs(service.service_id);
  };

  const handleDelete = (id: string | number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Service',
      message: 'Are you sure you want to delete this service? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/services/${id}`);
          fetchServices();
        } catch (err: any) {
          if (err.response && err.response.status === 400) {
            alert(err.response.data.error);
          } else {
            console.error('Error deleting service:', err);
            alert('Failed to delete service. Please try again.');
          }
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const toggleVisibility = async (id: number) => {
    try {
      await api.patch(`/services/${id}/visibility`);
      fetchServices();
    } catch (err) {
      console.error('Error toggling visibility:', err);
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      await api.patch(`/services/${id}/status`);
      fetchServices();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const getServiceKey = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('aadhaar')) return 'aadhaar';
    if (lowerName.includes('pan')) return 'pan';
    if (lowerName.includes('passport')) return 'passport';
    if (lowerName.includes('voter')) return 'voterid';
    if (lowerName.includes('income')) return 'income';
    if (lowerName.includes('caste')) return 'caste';
    if (lowerName.includes('birth')) return 'birth';
    if (lowerName.includes('scheme')) return 'scheme';
    if (lowerName.includes('loan')) return 'loan';
    if (lowerName.includes('bill')) return 'utility';
    return 'general';
  };

  const handleApply = (service: any) => {
    const key = getServiceKey(service.service_name);
    // If it's a hardcoded one, use that key. 
    // Otherwise, use the service name itself so ApplyService can find it.
    const urlParam = (key && key !== 'general') ? key : encodeURIComponent(service.service_name);
    navigate(`/app/user/apply/${urlParam}`);
  };

  const handleOpenUrl = async (service: any) => {
    if (service.url) {
      try {
        await api.post(`/services/${service.service_id}/log-access`, { action: 'Opened Service URL' });
      } catch (err) {
        console.error('Failed to log service access', err);
      }
      window.open(service.url, '_blank');
    } else {
      alert("Service URL not configured.");
    }
  };

  const filtered = (services || []).filter(s => (s.service_name || '').toLowerCase().includes(search.toLowerCase()));

  const isAdmin = user?.role === 'admin';
  console.log('User:', user, 'isAdmin:', isAdmin);

  const getIcon = (iconName: string) => {
    return <i className={`fas ${iconName} text-2xl`}></i>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Digital Services</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search services..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-64"
            />
          </div>
          {isAdmin && (
            <ModernButton 
              text="Add Service" 
              icon={Plus} 
              onClick={() => {
                setEditingService(null);
                setFormData({ 
                  service_name: '', 
                  description: '', 
                  url: '', 
                  type: 'internal',
                  icon: '',
                  application_id: '',
                  visible_status: 1, 
                  active_status: 1,
                  service_price: 0,
                  payment_required: false,
                  fee: 0,
                  staff_commission: 0
                });
                setShowForm(true);
              }}
              gradient="blue-gradient"
              className="!px-4 !py-2 !text-sm"
            />
          )}
        </div>
      </div>

      {showForm && isAdmin && (
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">{editingService ? 'Edit Service' : 'Add New Service'}</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Service Name</label>
                <input 
                  type="text" placeholder="e.g. Aadhaar Card" required
                  value={formData.service_name} onChange={e => setFormData({...formData, service_name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Application Type</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                >
                  <option value="internal">Internal Form</option>
                  <option value="external">External Service URL</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Service URL (for External Type)</label>
                <input 
                  type="url" placeholder="https://..." 
                  value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Application ID</label>
                <input 
                  type="text" placeholder="Enter Application ID" 
                  value={formData.application_id} onChange={e => setFormData({...formData, application_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Service Price (₹) - For Users</label>
                <input 
                  type="number" placeholder="0" 
                  value={formData.service_price} onChange={e => setFormData({...formData, service_price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Wallet Fee (₹) - For Staff/Admin</label>
                <input 
                  type="number" placeholder="0" 
                  value={formData.fee} onChange={e => setFormData({...formData, fee: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Staff Commission (₹)</label>
                <input 
                  type="number" placeholder="0" 
                  value={formData.staff_commission} onChange={e => setFormData({...formData, staff_commission: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Icon Name (FontAwesome Class)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" placeholder="e.g. fa-fingerprint, fa-id-card" 
                    value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})}
                    className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                  />
                  <div className="w-10 h-10 rounded-xl bg-slate-900/50 border border-slate-700 flex items-center justify-center text-blue-400">
                    {getIcon(formData.icon)}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Description</label>
              <textarea 
                placeholder="Brief description of the service..." required
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none h-24 resize-none"
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.visible_status === 1} 
                  onChange={e => setFormData({...formData, visible_status: e.target.checked ? 1 : 0})}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.visible_status === 1 ? 'bg-blue-600 border-blue-600' : 'border-slate-600 group-hover:border-slate-500'}`}>
                  {formData.visible_status === 1 && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-slate-300">Visible to Users</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.active_status === 1} 
                  onChange={e => setFormData({...formData, active_status: e.target.checked ? 1 : 0})}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.active_status === 1 ? 'bg-green-600 border-green-600' : 'border-slate-600 group-hover:border-slate-500'}`}>
                  {formData.active_status === 1 && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-slate-300">Active Status</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.payment_required} 
                  onChange={e => setFormData({...formData, payment_required: e.target.checked})}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.payment_required ? 'bg-orange-600 border-orange-600' : 'border-slate-600 group-hover:border-slate-500'}`}>
                  {formData.payment_required && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-slate-300">Payment Required before Application</span>
              </label>
            </div>

            {editingService && formData.type === 'internal' && (
              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Internal Form Builder</h3>
                    <p className="text-sm text-slate-400">Configure dynamic input fields and document requirements.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/services/${editingService.service_id}/builder`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Settings size={16} /> Open Form Builder
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-slate-400 hover:text-white transition-colors font-bold">Cancel</button>
              <ModernButton 
                text={editingService ? 'Update Service' : 'Create Service'} 
                icon={editingService ? Edit2 : Plus} 
                type="submit"
                gradient="blue-gold-gradient"
                className="!px-6 !py-2 !text-sm"
              />
            </div>
          </form>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.grid_columns || 4} gap-6`}>
        {filtered.length > 0 ? (
          filtered.map(service => (
            <div key={service.service_id} className="group bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg hover:border-blue-500/50 transition-all hover:-translate-y-1 relative flex flex-col">
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-100 transition-opacity">
                  <button onClick={() => toggleVisibility(service.service_id)} className={`p-1.5 rounded-lg ${service.visible_status ? 'text-blue-400' : 'text-slate-500'}`} title={service.visible_status ? 'Visible' : 'Hidden'}>
                    {service.visible_status ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => toggleStatus(service.service_id)} className={`p-1.5 rounded-lg ${service.active_status ? 'text-green-400' : 'text-slate-500'}`} title={service.active_status ? 'Deactivate' : 'Activate'}>
                    <Power size={16} />
                  </button>
                  <button onClick={() => handleEdit(service)} className="p-1.5 rounded-lg text-slate-400 hover:text-white" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(service.service_id)} className="p-1.5 rounded-lg text-red-400 hover:text-white" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-400">
                {getIcon(service.icon)}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{service.service_name}</h3>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30" title="User Price">
                  User: ₹{service.service_price || 0}
                </span>
                {(user?.role === 'admin' || user?.role === 'staff') && (
                  <>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30" title="Wallet Fee">
                      Fee: ₹{service.fee || 0}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" title="Staff Commission">
                      Comm: ₹{service.staff_commission || 0}
                    </span>
                  </>
                )}
                {service.payment_required === 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                    Paid Service
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mb-6 line-clamp-3 flex-1">{service.description}</p>
              
              <div className="mt-auto flex flex-col gap-2">
                {(user?.role === 'admin' || user?.role === 'staff') ? (
                  <>
                    <ModernButton 
                      text="Apply for Customer" 
                      icon={Rocket} 
                      onClick={() => handleApply(service)}
                      gradient="blue-gold-gradient"
                      className="w-full !py-2 !text-xs"
                    />
                    <button 
                      onClick={() => handleOpenUrl(service)}
                      className="inline-flex items-center justify-center w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all font-bold text-xs gap-2"
                    >
                      Open Service URL
                    </button>
                  </>
                ) : (
                  <ModernButton 
                    text="Apply Now" 
                    icon={Rocket} 
                    onClick={() => handleApply(service)}
                    gradient="blue-gold-gradient"
                    className="w-full !py-3 !text-sm"
                  />
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-slate-400 py-10">
            No services found.
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

export default Services;
