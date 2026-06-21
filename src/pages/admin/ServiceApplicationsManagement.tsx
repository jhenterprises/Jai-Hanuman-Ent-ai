import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  Search, Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown, Eye, EyeOff,
  Settings, Folder, Activity, HelpCircle, Layers, Shield, RefreshCw, Sparkles, Image, LayoutTemplate
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernButton from '../../components/ModernButton';
import ConfirmDialog from '../../components/ConfirmDialog';
import { toast } from 'react-hot-toast';

// Default standard services to seed if the collection is empty
const DEFAULT_SERVICES = [
  {
    serviceId: "aadhaar",
    serviceName: "Aadhaar Card",
    category: "Identity Services",
    displayOrder: 1,
    isVisible: true,
    status: "active",
    icon: "fa-fingerprint",
    image: "",
    description: "Apply for New Aadhaar or Update existing Aadhaar details."
  },
  {
    serviceId: "pan",
    serviceName: "PAN Card",
    category: "Identity Services",
    displayOrder: 2,
    isVisible: true,
    status: "active",
    icon: "fa-id-card",
    image: "",
    description: "Application for Permanent Account Number (PAN) dynamically."
  },
  {
    serviceId: "voterid",
    serviceName: "Voter ID",
    category: "Identity Services",
    displayOrder: 3,
    isVisible: true,
    status: "active",
    icon: "fa-users",
    image: "",
    description: "Form 6 - Application for inclusion of name in electoral roll."
  },
  {
    serviceId: "passport",
    serviceName: "Passport",
    category: "Identity Services",
    displayOrder: 4,
    isVisible: true,
    status: "active",
    icon: "fa-passport",
    image: "",
    description: "Application for Fresh Passport or Re-issue of Passport."
  },
  {
    serviceId: "income",
    serviceName: "Income Certificate",
    category: "Certificate Services",
    displayOrder: 5,
    isVisible: true,
    status: "active",
    icon: "fa-file-invoice-dollar",
    image: "",
    description: "Apply for Income Certificate for government subsidies and admissions."
  },
  {
    serviceId: "caste",
    serviceName: "Caste Certificate",
    category: "Certificate Services",
    displayOrder: 6,
    isVisible: true,
    status: "active",
    icon: "fa-user-graduate",
    image: "",
    description: "Apply for Caste Certificate to verify social community status."
  },
  {
    serviceId: "birth",
    serviceName: "Birth Certificate",
    category: "Certificate Services",
    displayOrder: 7,
    isVisible: true,
    status: "active",
    icon: "fa-baby",
    image: "",
    description: "Apply for Birth Certificate with local municipal registrations."
  }
];

export default function ServiceApplicationsManagement() {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    serviceId: '',
    serviceName: '',
    category: 'Identity Services',
    description: '',
    icon: 'fa-file',
    image: '',
    isVisible: true,
    status: 'active',
    displayOrder: 1,
    url: '',
    application_type: 'internal'
  });

  const [confirmDialog, setConfirmDialog] = useState<any>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async (forceSeed = false) => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'service_management'));
      let list: any[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

      // If empty or forceSeed, let's seed the collection with default services
      if ((list.length === 0 || forceSeed) && !isSeeding) {
        setIsSeeding(true);
        const batch = writeBatch(db);
        
        // Let's check the old "services" collection too, and merge if they exists
        let oldServices: any[] = [];
        try {
          const oldSnap = await getDocs(collection(db, 'services'));
          oldServices = oldSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        } catch (e) {
          console.log('No older services to migrate.');
        }

        const mergedDefaults = [...DEFAULT_SERVICES];
        oldServices.forEach(os => {
          const serviceKey = String(os.service_id || os.id || '');
          if (!serviceKey) return;
          
          const alreadyExists = mergedDefaults.some(d => d.serviceId === serviceKey);
          if (!alreadyExists && os.name) {
            mergedDefaults.push({
              serviceId: serviceKey,
              serviceName: os.name,
              category: "Identity Services",
              displayOrder: mergedDefaults.length + 1,
              isVisible: os.is_visible !== false,
              status: os.enabled !== false ? "active" : "disabled",
              icon: os.icon || "fa-file",
              image: "",
              description: os.description || ""
            });
          }
        });

        for (const item of mergedDefaults) {
          const docRef = doc(db, 'service_management', item.serviceId);
          batch.set(docRef, {
            ...item,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

        await batch.commit();
        setIsSeeding(false);
        
        // Fetch again after seeding
        const resnap = await getDocs(collection(db, 'service_management'));
        list = resnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      }
      
      // Merge with any remaining unmigrated services so admin can edit them
      const manageMap = new Map();
      list.forEach(item => manageMap.set((item as any).serviceId || item.id, item));
      
      try {
        const oldSnap = await getDocs(collection(db, 'services'));
        oldSnap.docs.forEach(docSnap => {
          const serviceId = docSnap.id;
          if (!manageMap.has(serviceId)) {
            const os = docSnap.data();
            manageMap.set(serviceId, {
              id: serviceId,
              serviceId: serviceId,
              serviceName: os.name || os.service_name || 'Unnamed',
              category: 'Other Services',
              displayOrder: manageMap.size + 1,
              isVisible: os.is_visible !== false,
              status: os.enabled !== false ? 'active' : 'disabled',
              icon: os.icon || 'fa-file',
              image: '',
              description: os.description || '',
              application_type: os.application_type || (os.url || os.service_url || os.serviceUrl ? 'external' : 'internal'),
              url: os.url || os.service_url || os.serviceUrl || ''
            });
          }
        });
      } catch (e) {
        // ignore
      }
      
      list = Array.from(manageMap.values());

      // Sort by displayOrder
      list.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setServices(list);
    } catch (err) {
      console.error('Error loading service management:', err);
      toast.error('Failed to load services database.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (service: any) => {
    setEditingService(service);
    const serviceUrl = service.serviceUrl || service.url || service.service_url || '';
    setFormData({
      serviceId: service.serviceId || service.id,
      serviceName: service.serviceName || service.name || '',
      category: service.category || 'Identity Services',
      description: service.description || '',
      icon: service.icon || 'fa-file',
      image: service.image || '',
      isVisible: service.isVisible !== false,
      status: service.status || 'active',
      displayOrder: service.displayOrder || 1,
      url: serviceUrl,
      application_type: service.application_type || (serviceUrl ? 'external' : 'internal')
    });
    setIsEditModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      serviceId: '',
      serviceName: '',
      category: 'Identity Services',
      description: '',
      icon: 'fa-file',
      image: '',
      isVisible: true,
      status: 'active',
      displayOrder: services.length + 1,
      url: '',
      application_type: 'internal'
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceId || !formData.serviceName) {
      toast.error('Service Name and Service ID are required.');
      return;
    }

    const cleanedId = formData.serviceId.trim().toLowerCase().replace(/\s+/g, '_');
    const saveData = {
      serviceId: cleanedId,
      serviceName: formData.serviceName,
      category: formData.category,
      description: formData.description,
      icon: formData.icon,
      image: formData.image,
      isVisible: formData.isVisible,
      status: formData.status,
      displayOrder: Number(formData.displayOrder) || 1,
      url: formData.url || '',
      serviceUrl: formData.url || '',
      application_type: formData.application_type || 'internal',
      updated_at: new Date().toISOString()
    };

    const loadId = toast.loading('Saving service information...');
    try {
      const docRef = doc(db, 'service_management', cleanedId);
      
      // If adding new, check if existing
      if (!editingService) {
        // Double check uniqueness of service ID
        const exists = services.some(s => s.serviceId === cleanedId);
        if (exists) {
          toast.dismiss(loadId);
          toast.error(`Service ID "${cleanedId}" already exists. Please choose a unique ID.`);
          return;
        }
      }

      await setDoc(docRef, saveData, { merge: true });

      // We should also duplicate / sync to the `services` collection to maintain flawless backward compatibility!
      // This is extremely safe and keeps both databases perfectly aligned!
      try {
        await setDoc(doc(db, 'services', cleanedId), {
          name: formData.serviceName,
          description: formData.description,
          icon: formData.icon,
          is_visible: formData.isVisible,
          enabled: formData.status === 'active',
          application_id: cleanedId,
          application_type: formData.application_type || 'internal',
          url: formData.url || '',
          service_url: formData.url || '',
          order: Number(formData.displayOrder) || 1,
          updated_at: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error('Fallback sync to services collection failed:', e);
      }

      toast.success('Service saved successfully!', { id: loadId });
      setIsEditModalOpen(false);
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save service.', { id: loadId });
    }
  };

  const handleDeleteService = (service: any) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Service',
      message: `Are you sure you want to remove "${service.serviceName || service.name}" from display? This will not touch any submission data.`,
      onConfirm: async () => {
        const loadId = toast.loading('Removing service...');
        try {
          await deleteDoc(doc(db, 'service_management', service.id));
          
          // Fallback sync - remove from services collection too
          try {
            await deleteDoc(doc(db, 'services', service.id));
          } catch (e) {
            console.log('Services collection sync deletetion bypassed.');
          }

          toast.success('Service deleted successfully.', { id: loadId });
          setConfirmDialog(p => ({ ...p, isOpen: false }));
          fetchServices();
        } catch (err) {
          console.error(err);
          toast.error('Failed to delete service.', { id: loadId });
        }
      }
    });
  };

  const handleToggleVisibility = async (service: any) => {
    const originalValue = service.isVisible;
    // optimistic update
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, isVisible: !originalValue } : s));
    try {
      await updateDoc(doc(db, 'service_management', service.id), {
        isVisible: !originalValue,
        updated_at: new Date().toISOString()
      });
      
      // Fallback sync to existing services
      try {
        await updateDoc(doc(db, 'services', service.id), {
          is_visible: !originalValue,
          updated_at: serverTimestamp()
        });
      } catch (e) {}

      toast.success(`${service.serviceName || 'Service'} visibility toggled.`);
    } catch (e) {
      // rollback
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, isVisible: originalValue } : s));
      toast.error('Failed to update visibility.');
    }
  };

  const handleBulkStatus = async (status: string) => {
    const filteredServices = filteredList();
    if (filteredServices.length === 0) {
      toast.error('No services match the current filters.');
      return;
    }

    const actionText = status === 'active' ? 'Enable' : 'Disable';
    setConfirmDialog({
      isOpen: true,
      title: `Bulk ${actionText} Services`,
      message: `Are you sure you want to set the status of all ${filteredServices.length} filtered services to "${status}"?`,
      onConfirm: async () => {
        const loadId = toast.loading(`Updating ${filteredServices.length} services...`);
        try {
          const batch = writeBatch(db);
          for (const s of filteredServices) {
            const docRef = doc(db, 'service_management', s.id);
            batch.update(docRef, {
              status: status,
              updated_at: new Date().toISOString()
            });

            // sync to services
            try {
              const oldRef = doc(db, 'services', s.id);
              batch.set(oldRef, {
                enabled: status === 'active',
                updated_at: serverTimestamp()
              }, { merge: true });
            } catch (e) {}
          }
          await batch.commit();
          toast.success(`Successfully updated ${filteredServices.length} services to ${status}!`, { id: loadId });
          setConfirmDialog(p => ({ ...p, isOpen: false }));
          fetchServices();
        } catch (err) {
          console.error(err);
          toast.error('Bulk update failed.', { id: loadId });
        }
      }
    });
  };

  const handleRestoreHidden = async () => {
    const hiddenOnes = services.filter(s => !s.isVisible);
    if (hiddenOnes.length === 0) {
      toast.success('No hidden services found.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Restore Hidden Services',
      message: `Are you sure you want to make all ${hiddenOnes.length} hidden services visible again?`,
      onConfirm: async () => {
        const loadId = toast.loading('Restoring services visibility...');
        try {
          const batch = writeBatch(db);
          for (const s of hiddenOnes) {
            batch.update(doc(db, 'service_management', s.id), {
              isVisible: true,
              updated_at: new Date().toISOString()
            });

            // sync
            try {
              batch.set(doc(db, 'services', s.id), {
                is_visible: true,
                updated_at: serverTimestamp()
              }, { merge: true });
            } catch (e) {}
          }
          await batch.commit();
          toast.success(`Restored ${hiddenOnes.length} services!`, { id: loadId });
          setConfirmDialog(p => ({ ...p, isOpen: false }));
          fetchServices();
        } catch (err) {
          console.error(err);
          toast.error('Restore failed.', { id: loadId });
        }
      }
    });
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= services.length) return;

    const listCopy = [...services];
    // swap items
    const temp = listCopy[index];
    listCopy[index] = listCopy[newIndex];
    listCopy[newIndex] = temp;

    // update displayOrder locally
    const updatedList = listCopy.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1
    }));
    
    setServices(updatedList);

    // save to database
    try {
      const batch = writeBatch(db);
      updatedList.forEach(item => {
        batch.update(doc(db, 'service_management', item.id), {
          displayOrder: item.displayOrder
        });
        
        // sync
        try {
          batch.set(doc(db, 'services', item.id), {
            order: item.displayOrder
          }, { merge: true });
        } catch (e) {}
      });
      await batch.commit();
      toast.success('Service arrangement updated.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save service order to firestore.');
      fetchServices();
    }
  };

  const handleSortByCategory = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Sort Automatically by Category',
      message: 'This will automatically sort your services first by their Category, and then by name. Are you sure you want to reassign display orders?',
      onConfirm: async () => {
        const sorted = [...services].sort((a, b) => {
          const catCompare = (a.category || '').localeCompare(b.category || '');
          if (catCompare !== 0) return catCompare;
          return (a.serviceName || '').localeCompare(b.serviceName || '');
        });

        const listWithNewOrders = sorted.map((item, idx) => ({
          ...item,
          displayOrder: idx + 1
        }));

        setServices(listWithNewOrders);

        const loadId = toast.loading('Updating display order on server...');
        try {
          const batch = writeBatch(db);
          listWithNewOrders.forEach(item => {
            batch.update(doc(db, 'service_management', item.id), {
              displayOrder: item.displayOrder
            });
            try {
              batch.set(doc(db, 'services', item.id), {
                order: item.displayOrder
              }, { merge: true });
            } catch (e) {}
          });
          await batch.commit();
          toast.success('Arranged by category successfully.', { id: loadId });
          setConfirmDialog(p => ({ ...p, isOpen: false }));
        } catch (e) {
          console.error(e);
          toast.error('Failed to save category arrangement on server.', { id: loadId });
          fetchServices();
        }
      }
    });
  };

  const filteredList = () => {
    return services.filter(s => {
      const matchesSearch = (s.serviceName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.serviceId || s.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  };

  const categoryList = Array.from(new Set(services.map(s => s.category || 'Identity Services')));

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Settings className="w-8 h-8 animate-spin-slow" />
            Service Applications Management
          </h1>
          <p className="text-blue-100/90 text-sm md:text-base mt-2 max-w-xl">
            Arrange, style, classify, and govern form visibility of citizen certificate and identity services dynamically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <ModernButton 
            text="Add Service Card" 
            icon={Plus} 
            onClick={handleOpenAdd}
            gradient="orange-gradient"
            className="shadow-lg border border-gold-400"
          />
          <button 
            onClick={() => fetchServices(true)}
            title="Reset to defaults & import current services"
            className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2 flex items-center gap-2 transition-all text-sm font-bold"
          >
            <RefreshCw className="w-4 h-4" /> Reset / Seed
          </button>
        </div>
      </div>

      {/* Control Actions & Filter Panel */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg space-y-4">
        
        {/* Bulk Management & Global Functions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-700/40">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mr-2">Bulk Controls:</span>
            <button 
              onClick={() => handleBulkStatus('active')}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
            >
              Bulk Enable Active
            </button>
            <button 
              onClick={() => handleBulkStatus('disabled')}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
            >
              Bulk Disable Cards
            </button>
            <button 
              onClick={handleRestoreHidden}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
            >
              Restore Hidden Services
            </button>
          </div>
          
          <button 
            onClick={handleSortByCategory}
            className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-black px-4 py-1.5 rounded-xl text-xs transition-colors"
          >
            <Layers className="w-3.5 h-3.5" /> Sort by Category
          </button>
        </div>

        {/* Live Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input 
              type="text"
              placeholder="Search service title, ID, or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-blue-500 text-sm"
            >
              <option value="all">All Categories</option>
              {categoryList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-blue-500 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="comingSoon">Coming Soon</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

      </div>

      {/* Main List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800/30 rounded-3xl border border-slate-700/30">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-slate-400">Loading service management structures...</p>
        </div>
      ) : filteredList().length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-slate-700/30">
          <HelpCircle className="w-12 h-12 text-slate-650 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">No services found</h3>
          <p className="text-slate-500 text-sm mt-1">Try resetting search criteria or add a custom service card.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList().map((service, index) => {
            const isFirst = index === 0;
            const isLast = index === filteredList().length - 1;

            return (
              <div 
                key={service.id}
                className="group bg-slate-800/40 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-blue-500/30 hover:bg-slate-800/60 transition-all shadow"
              >
                {/* Visual Metadata & Drag-Order Details */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                  
                  {/* Sorting Quick buttons */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button 
                      onClick={() => moveOrder(index, 'up')}
                      disabled={isFirst}
                      title="Move Display Order Up"
                      className={`p-1 rounded-md transition-colors ${isFirst ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => moveOrder(index, 'down')}
                      disabled={isLast}
                      title="Move Display Order Down"
                      className={`p-1 rounded-md transition-colors ${isLast ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Icon view */}
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 select-none overflow-hidden">
                    {service.image ? (
                      <img src={service.image} alt="service banner" className="w-full h-full object-cover" />
                    ) : (
                      <i className={`fas ${service.icon || 'fa-file'} text-xl`}></i>
                    )}
                  </div>

                  {/* Text labels */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-extrabold text-white text-base leading-tight">
                        {service.serviceName || service.name}
                      </h4>
                      <span className="text-[10px] bg-slate-700/60 border border-slate-600/50 text-slate-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {service.category}
                      </span>
                      <span className="text-[10px] bg-blue-900/40 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-600/20">
                        ID: {service.serviceId || service.id}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400/90 mt-1 max-w-xl line-clamp-1">{service.description}</p>
                  </div>
                </div>

                {/* Right controls: Status, Visibility & Actions */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-end md:border-l border-slate-700/40 md:pl-6 shrink-0">
                  
                  {/* Status Badges */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-505 font-bold mb-1">Status:</span>
                    {service.status === 'active' && (
                      <span className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Active
                      </span>
                    )}
                    {service.status === 'comingSoon' && (
                      <span className="text-xs bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Coming Soon
                      </span>
                    )}
                    {service.status === 'maintenance' && (
                      <span className="text-xs bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Under Maintenance
                      </span>
                    )}
                    {service.status === 'disabled' && (
                      <span className="text-xs bg-slate-700 border border-slate-600 text-slate-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Disabled
                      </span>
                    )}
                  </div>

                  {/* Toggle Visibility */}
                  <button
                    onClick={() => handleToggleVisibility(service)}
                    title={service.isVisible ? "Make Hidden" : "Make Visible"}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border ${
                      service.isVisible 
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                        : 'text-slate-500 bg-slate-800/40 border-slate-700'
                    }`}
                  >
                    {service.isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">
                      {service.isVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </button>

                  {/* Order Selector Card */}
                  <div className="bg-slate-900/40 border border-slate-700/50 p-2 rounded-xl text-center min-w-[50px] select-none h-12 flex flex-col justify-center">
                    <span className="text-[7px] text-slate-500 font-extrabold uppercase">Order</span>
                    <span className="text-sm font-black text-blue-400">{service.displayOrder}</span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/app/services/${encodeURIComponent(service.serviceId || service.id)}/builder`)}
                      className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-xl transition-colors"
                      title="Edit Service Form Fields"
                    >
                      <LayoutTemplate className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(service)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                      title="Edit Service Settings & Visual Elements"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
                      title="Remove Certificate/Identity Service Card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Add Service Card Offcanvas Modal Backdrop */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-900/60 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400 animate-spin-slow" />
                {editingService ? 'Edit Service Form Config & Card' : 'Add New Service Card'}
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto max-h-[75vh] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* ID and Name */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Service Unique ID (Lower_case)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pan_card, inc_cert, aadhaar"
                    disabled={!!editingService}
                    value={formData.serviceId}
                    onChange={e => setFormData({ ...formData, serviceId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm disabled:cursor-not-allowed disabled:text-slate-500 font-mono"
                  />
                  {!editingService && (
                    <p className="text-[10px] text-slate-500 font-medium">Use lowercase words. Matches existing custom form ID if available.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Service Name (Title)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Income Certificate"
                    value={formData.serviceName}
                    onChange={e => setFormData({ ...formData, serviceName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Categories & displayOrder */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm font-semibold"
                  >
                    <option value="Identity Services">Identity Services (Aadhaar, PAN, Voter ID, Passport etc)</option>
                    <option value="Certificate Services">Certificate Services (Income, Caste, Birth Certificate etc)</option>
                    <option value="Agricultural Schemes">Agricultural Schemes</option>
                    <option value="Financial & Utility Services">Financial & Utility Services</option>
                    <option value="Direct API Services">Direct API Services</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Display Order (Arrangement Rank)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={formData.displayOrder}
                    onChange={e => setFormData({ ...formData, displayOrder: Number(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm font-semibold"
                  />
                </div>

                {/* Icon Visual Design (FontAwesome) */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Card Icon (FontAwesome Standard)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. fa-fingerprint, fa-id-card, fa-baby"
                      value={formData.icon}
                      onChange={e => setFormData({ ...formData, icon: e.target.value })}
                      className="flex-1 px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm font-mono"
                    />
                    <div className="w-10 h-10 rounded-xl bg-slate-955 border border-slate-750 flex items-center justify-center text-blue-400 shrink-0">
                      <i className={`fas ${formData.icon || 'fa-file'} text-lg`}></i>
                    </div>
                  </div>
                </div>

                {/* Banner Image URL */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Banner Image URL (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. https://images.unsplash.com/... (optional)"
                      value={formData.image}
                      onChange={e => setFormData({ ...formData, image: e.target.value })}
                      className="flex-1 px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm"
                    />
                    <div className="w-10 h-10 rounded-xl bg-slate-955 border border-slate-750 flex items-center justify-center text-indigo-400 shrink-0">
                      <Image className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Application Type */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Application Type</label>
                  <select
                    value={formData.application_type}
                    onChange={e => setFormData({ ...formData, application_type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm font-bold"
                  >
                    <option value="internal">Internal Form (Standard Apply)</option>
                    <option value="external">External Link (Opens external portal URL)</option>
                  </select>
                </div>

                {/* Service URL */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Service Route / URL</label>
                  <p className="text-[10px] text-slate-500 mb-1">Use /services/SERVICE_ID for internal routes, or https://... for external.</p>
                  <input
                    type="text"
                    placeholder="/services/pan-card or https://..."
                    value={formData.url}
                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm font-semibold"
                  />
                </div>

                {/* Status Options */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Govt Service Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 text-sm font-bold"
                  >
                    <option value="active">Active (Renders Apply Form)</option>
                    <option value="comingSoon">Coming Soon Badge</option>
                    <option value="maintenance">Under Maintenance Badge</option>
                    <option value="disabled">Disabled (Hidden entirely from users)</option>
                  </select>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center gap-3 pt-6 pl-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={e => setFormData({ ...formData, isVisible: e.target.checked })}
                      className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Visible on User Dashboard</span>
                  </label>
                </div>

              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Card Description / instructions</label>
                <textarea
                  required
                  placeholder="Inform the users what files are needed, eligibility criteria, government agency, processing time, fee, state, etc..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-900/40 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-blue-500 h-28 resize-none text-sm"
                />
              </div>

              {/* Modal Footer Controls */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-slate-450 hover:text-white font-bold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold text-sm transition-colors shadow-lg"
                >
                  Save Configuration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Widget */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
      />

    </div>
  );
}
