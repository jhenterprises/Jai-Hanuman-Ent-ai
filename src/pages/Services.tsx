import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as LucideIcons from 'lucide-react';
import { Search, Plus, Trash2, ExternalLink, ArrowRight, X, Check, Eye, EyeOff, Power, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Services = () => {
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    service_name: '', 
    description: '', 
    url: '',
    type: 'internal',
    icon: '',
    visible_status: 1,
    active_status: 1
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
        visible_status: 1, 
        active_status: 1 
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
      visible_status: service.visible_status,
      active_status: service.active_status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string | number) => {
    console.log('Delete button clicked for ID:', id);
    if (confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
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
    }
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
    if (key) {
      navigate(`/app/user/apply/${key}`);
    } else {
      alert('This service is currently not available for online application.');
    }
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

  const filtered = services.filter(s => s.service_name.toLowerCase().includes(search.toLowerCase()));

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
            <button 
              onClick={() => {
                setEditingService(null);
                setFormData({ 
                  service_name: '', 
                  description: '', 
                  url: '', 
                  type: 'internal',
                  icon: '',
                  visible_status: 1, 
                  active_status: 1 
                });
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
            >
              <Plus size={20} />
              <span>Add Service</span>
            </button>
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
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20">
                {editingService ? 'Update Service' : 'Create Service'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <p className="text-slate-400 text-sm mb-6 line-clamp-3 flex-1">{service.description}</p>
              
              <div className="mt-auto flex flex-col gap-2">
                {(user?.role === 'admin' || user?.role === 'staff') ? (
                  <>
                    <button 
                      onClick={() => handleApply(service)}
                      className="inline-flex items-center justify-center w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold text-sm gap-2 shadow-lg shadow-blue-600/20"
                    >
                      Apply for Customer
                    </button>
                    <button 
                      onClick={() => handleOpenUrl(service)}
                      className="inline-flex items-center justify-center w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all font-bold text-sm gap-2"
                    >
                      Open Service URL
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleApply(service)}
                    className="inline-flex items-center justify-center w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold text-sm gap-2 shadow-lg shadow-blue-600/20"
                  >
                    Apply
                  </button>
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
    </div>
  );
};

export default Services;
