import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as LucideIcons from 'lucide-react';
import { Search, Plus, Trash2, ExternalLink, ArrowRight, X, Check, Eye, EyeOff, Power, Edit2, Rocket, Settings, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import ModernButton from '../components/ModernButton';
import { collection, getDocs, doc, updateDoc, serverTimestamp, addDoc, query, where, deleteDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

import { useConfig } from '../context/ConfigContext';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Star } from 'lucide-react';

const SortableServiceItem = ({ service, isAdmin, onTogglePopular }: { service: any, isAdmin: boolean, onTogglePopular: (s: any) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: service.service_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 p-4 rounded-2xl group hover:border-blue-500/30 transition-all"
    >
      <div {...attributes} {...listeners} className="cursor-grab p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
        <GripVertical size={20} />
      </div>
      
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
        <i className={`fas ${service.icon} text-lg`}></i>
      </div>
      
      <div className="flex-1">
        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{service.name}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{service.description}</p>
      </div>

      <button 
        onClick={() => onTogglePopular(service)}
        className={`p-2 rounded-xl transition-all ${service.isPopular ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/40'}`}
        title={service.isPopular ? "Remove from Popular" : "Make Popular"}
      >
        <Star size={18} fill={service.isPopular ? "currentColor" : "none"} />
      </button>
    </div>
  );
};

import { seedServicesToFirestore } from '../seedServices';

const Services = () => {
  const { config } = useConfig();
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'popular'
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      seedServicesToFirestore().catch(e => console.log(e));
    }
  }, [user]);
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
    name: '', 
    description: '', 
    url: '',
    type: 'internal',
    icon: '',
    application_id: '',
    visible_status: 1,
    enabled: true,
    service_price: 0,
    payment_required: false,
    fee: 0,
    staff_commission: 0,
    isPopular: false,
    order: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && isAdmin) {
      // Find indexes in the popular list context
      const popularServices = services.filter(s => s.isPopular).sort((a, b) => (a.order || 0) - (b.order || 0));
      const oldIndex = popularServices.findIndex((s) => s.service_id === active.id);
      const newIndex = popularServices.findIndex((s) => s.service_id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedPopular = arrayMove(popularServices, oldIndex, newIndex);
        
        // Update local state to reflect change immediately
        const newAllServices = services.map(s => {
          const reorderedIndex = reorderedPopular.findIndex(p => p.service_id === s.service_id);
          if (reorderedIndex !== -1) {
            return { ...s, order: reorderedIndex };
          }
          return s;
        });
        setServices(newAllServices);

        // Update Firestore
        try {
          const updates = reorderedPopular.map(async (service, index) => {
            await setDoc(doc(db, 'services', service.service_id), {
              order: index,
              updated_at: serverTimestamp()
            }, { merge: true });

            try {
              await setDoc(doc(db, 'service_management', service.service_id), {
                displayOrder: index,
                updated_at: new Date().toISOString()
              }, { merge: true });
            } catch (err) {
              console.warn('Sync to service_management failed:', err);
            }
          });
          await Promise.all(updates);
        } catch (err) {
          console.error('Error updating service orders:', err);
          alert('Failed to save service order.');
        }
      }
    }
  };

  const onTogglePopular = async (service: any) => {
    if (!isAdmin) return;
    const popularCount = services.filter(s => s.isPopular).length;
    
    if (!service.isPopular && popularCount >= 8) {
      alert('Maximum 8 popular services allowed.');
      return;
    }

    try {
      await setDoc(doc(db, 'services', service.service_id), {
        isPopular: !service.isPopular,
        updated_at: serverTimestamp()
      }, { merge: true });

      try {
        await setDoc(doc(db, 'service_management', service.service_id), {
          isPopular: !service.isPopular,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Sync to service_management failed:', err);
      }

      fetchServices();
    } catch (err) {
      console.error('Error toggling popular status:', err);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching services from both service_management and services...');
      const servicesMap = new Map();

      // First load from service_management (Admin edited)
      const manageSnapshot = await getDocs(collection(db, 'service_management'));
      if (!manageSnapshot.empty) {
        manageSnapshot.docs.forEach((doc) => {
          const data = doc.data() as any;
          const serviceUrl = data.url || data.service_url || data.serviceUrl || '';
          servicesMap.set(data.serviceId || doc.id, {
            service_id: doc.id,
            id: doc.id,
            serviceId: data.serviceId || doc.id,
            name: data.serviceName || data.name || 'Unnamed Service',
            description: data.description || 'No description available',
            url: serviceUrl,
            service_url: serviceUrl,
            serviceUrl: serviceUrl,
            icon: data.icon || 'fa-file',
            image: data.image || '',
            category: data.category || 'Identity Services',
            enabled: data.status === 'active',
            status: data.status || 'active',
            is_visible: data.isVisible !== undefined ? data.isVisible !== false : data.is_visible !== false,
            application_type: data.application_type || (serviceUrl ? 'external' : 'internal'),
            isPopular: !!data.isPopular,
            order: data.displayOrder || 0
          });
        });
      }

      // Then load from classic services collection, filling in whatever isn't already there
      const querySnapshot = await getDocs(collection(db, 'services'));
      if (!querySnapshot.empty) {
        querySnapshot.docs.forEach((doc) => {
          const serviceId = doc.id;
          if (!servicesMap.has(serviceId)) {
            const data = doc.data() as any;
            const serviceUrl = data.url || data.service_url || data.serviceUrl || '';
            servicesMap.set(serviceId, {
              service_id: doc.id,
              id: doc.id,
              serviceId: doc.id,
              name: data.name || data.service_name || 'Unnamed Service',
              description: data.description || 'No description available',
              url: serviceUrl,
              service_url: serviceUrl,
              serviceUrl: serviceUrl,
              icon: data.icon || 'fa-file',
              image: '',
              category: 'Other Services',
              enabled: data.enabled !== undefined ? data.enabled : (data.is_active !== undefined ? data.is_active : true),
              status: (data.enabled !== false) ? 'active' : 'disabled',
              is_visible: data.is_visible !== undefined ? data.is_visible : true,
              application_type: data.application_type || (serviceUrl ? 'external' : 'internal'),
              isPopular: !!data.isPopular,
              order: data.order || 0
            });
          }
        });
      }

      const servicesData = Array.from(servicesMap.values());
      servicesData.sort((a, b) => (a.order || 0) - (b.order || 0));
      console.log('Fetched integrated services:', servicesData);
      setServices(servicesData);
    } catch (err) {
      console.error('Error fetching services with fallback:', err);
      setError('Failed to load services. Please try again later.');
      setServices([]);
      handleFirestoreError(err, OperationType.LIST, 'services');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceInputs = async (serviceId: string) => {
    if (!serviceId) {
      setServiceInputs([]);
      return;
    }
    try {
      const q = query(collection(db, 'service_inputs'), where('service_id', '==', serviceId));
      const snapshot = await getDocs(q);
      setServiceInputs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching service inputs:', err);
    }
  };

  const handleAddInput = async () => {
    if (!editingService || !newInput.input_label) return;
    try {
      await addDoc(collection(db, 'service_inputs'), {
        service_id: editingService.service_id,
        ...newInput,
        created_at: serverTimestamp()
      });
      setNewInput({ input_label: '', input_type: 'text', required: true });
      fetchServiceInputs(editingService.service_id);
    } catch (err) {
      console.error('Error adding input:', err);
      alert('Failed to add input field.');
    }
  };

  const handleDeleteInput = (inputId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Input Field',
      message: 'Are you sure you want to delete this input field?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'service_inputs', inputId));
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

  const cleanData = (obj: any) => {
    return Object.entries(obj).reduce((acc: any, [key, varValue]) => {
      if (varValue !== undefined && varValue !== null) {
        acc[key] = varValue;
      }
      return acc;
    }, {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        // Use setDoc with merge for services as requested to prevent doc-not-found issues
        const serviceRef = doc(db, 'services', editingService.service_id);
        const updateData = cleanData({
          name: formData.name || '',
          description: formData.description || '',
          url: formData.url || '',
          application_type: formData.type || 'internal',
          icon: formData.icon || '',
          application_id: formData.application_id || '',
          is_visible: formData.visible_status === 1,
          enabled: formData.enabled ?? true,
          service_price: Number(formData.service_price) || 0,
          payment_required: !!formData.payment_required,
          fee: Number(formData.fee) || 0,
          staff_commission: Number(formData.staff_commission) || 0,
          isPopular: !!formData.isPopular,
          order: Number(formData.order) || 0,
          updated_at: serverTimestamp()
        });
        await setDoc(serviceRef, updateData, { merge: true });
        console.log('Service updated successfully via setDoc merge');

        try {
          const serviceMgmtRef = doc(db, 'service_management', editingService.service_id);
          const mgmtData = cleanData({
            serviceName: formData.name || '',
            description: formData.description || '',
            url: formData.url || '',
            application_type: formData.type || 'internal',
            icon: formData.icon || '',
            isVisible: formData.visible_status === 1,
            status: (formData.enabled ?? true) ? 'active' : 'disabled',
            service_price: Number(formData.service_price) || 0,
            payment_required: !!formData.payment_required,
            fee: Number(formData.fee) || 0,
            staff_commission: Number(formData.staff_commission) || 0,
            isPopular: !!formData.isPopular,
            displayOrder: Number(formData.order) || 0,
            updated_at: new Date().toISOString()
          });
          await setDoc(serviceMgmtRef, mgmtData, { merge: true });
          console.log('Service updated successfully in service_management via setDoc merge');
        } catch (err) {
          console.warn('Sync to service_management failed:', err);
        }
      } else {
        // For new services, we can also use addDoc directly or keep API
        const servicesRef = collection(db, 'services');
        const newData = cleanData({
          name: formData.name || '',
          description: formData.description || '',
          url: formData.url || '',
          application_type: formData.type || 'internal',
          icon: formData.icon || '',
          application_id: formData.application_id || '',
          is_visible: formData.visible_status === 1,
          enabled: formData.enabled ?? true,
          service_price: Number(formData.service_price) || 0,
          payment_required: !!formData.payment_required,
          fee: Number(formData.fee) || 0,
          staff_commission: Number(formData.staff_commission) || 0,
          isPopular: !!formData.isPopular,
          order: Number(formData.order) || services.length,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        const addedDocRef = await addDoc(servicesRef, newData);
        console.log('Service created successfully via addDoc', addedDocRef.id);

        try {
          const serviceMgmtRef = doc(db, 'service_management', addedDocRef.id);
          const mgmtData = cleanData({
            serviceId: addedDocRef.id,
            serviceName: formData.name || '',
            description: formData.description || '',
            url: formData.url || '',
            application_type: formData.type || 'internal',
            icon: formData.icon || '',
            isVisible: formData.visible_status === 1,
            status: (formData.enabled ?? true) ? 'active' : 'disabled',
            service_price: Number(formData.service_price) || 0,
            payment_required: !!formData.payment_required,
            fee: Number(formData.fee) || 0,
            staff_commission: Number(formData.staff_commission) || 0,
            isPopular: !!formData.isPopular,
            displayOrder: Number(formData.order) || services.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          await setDoc(serviceMgmtRef, mgmtData, { merge: true });
          console.log('Service created successfully in service_management via setDoc merge');
        } catch (err) {
          console.warn('Sync new service to service_management failed:', err);
        }
      }
      setShowForm(false);
      setEditingService(null);
      setFormData({ 
        name: '', 
        description: '', 
        url: '', 
        type: 'internal',
        icon: '',
        application_id: '',
        visible_status: 1, 
        enabled: true,
        service_price: 0,
        payment_required: false,
        fee: 0,
        staff_commission: 0,
        isPopular: false,
        order: services.length
      });
      fetchServices();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Failed to save service. Check console for details.');
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name || service.service_name,
      description: service.description,
      url: service.url || service.service_url || '',
      type: service.application_type || 'internal',
      icon: service.icon || '',
      application_id: service.application_id || '',
      visible_status: service.is_visible ? 1 : 0,
      enabled: !!service.enabled,
      service_price: service.service_price || 0,
      payment_required: !!service.payment_required,
      fee: service.fee || 0,
      staff_commission: service.staff_commission || 0,
      isPopular: !!service.isPopular,
      order: service.order || 0
    });
    setShowForm(true);
    fetchServiceInputs(service.service_id);
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Service',
      message: 'Are you sure you want to permanently delete this service? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'services', id));
          fetchServices();
        } catch (err: any) {
          console.error('Error deleting service:', err);
          alert('Failed to delete service. Please try again.');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const toggleVisibility = async (service: any) => {
    try {
      await setDoc(doc(db, 'services', service.service_id), {
        is_visible: !service.is_visible,
        updated_at: serverTimestamp()
      }, { merge: true });

      try {
        await setDoc(doc(db, 'service_management', service.service_id), {
          isVisible: !service.is_visible,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Sync to service_management failed:', err);
      }

      fetchServices();
    } catch (err) {
      console.error('Error toggling visibility:', err);
    }
  };

  const toggleStatus = async (service: any) => {
    try {
      await setDoc(doc(db, 'services', service.service_id), {
        enabled: !service.enabled,
        updated_at: serverTimestamp()
      }, { merge: true });

      try {
        await setDoc(doc(db, 'service_management', service.service_id), {
          status: !service.enabled ? 'active' : 'disabled',
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Sync to service_management failed:', err);
      }

      fetchServices();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const getServiceKey = (name: string) => {
    if (!name) return 'general';
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

  const handleApply = async (service: any) => {
    if (service.status === 'comingSoon') {
      alert('This service is Coming Soon! Please stay tuned.');
      return;
    }
    if (service.status === 'maintenance') {
      alert('This service is currently Under Maintenance. Please check back later.');
      return;
    }
    
    const sid = service.service_id || service.serviceId || service.id;
    const key = getServiceKey(service.name);
    // If it's a hardcoded one, use that key so ApplyService finds the hardcoded config. 
    // Otherwise, use the service id or name itself so ApplyService can find it.
    const urlParam = (key && key !== 'general') ? key : (sid ? sid : encodeURIComponent(service.name));
    navigate(`/app/user/apply/${urlParam}`);
  };

  const handleOpenUrl = async (service: any) => {
    const urlToOpen = service.url || service.service_url || service.serviceUrl;
    if (urlToOpen) {
      if (urlToOpen.startsWith('http')) {
        window.open(urlToOpen, '_blank');
      } else {
        window.open(`https://${urlToOpen}`, '_blank');
      }
    } else {
      alert("Service URL not configured.");
    }
  };

  const filtered = (services || [])
    .filter(s => {
      const isAdminUser = user?.role === 'admin';
      if (!isAdminUser) {
        if (s.is_visible === false) return false;
        if (s.status === 'disabled') return false;
      }
      const matchesSearch = (s.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'internal' && s.application_type === 'internal') ||
                           (filterType === 'external' && s.application_type === 'external') ||
                           (filterType === 'paid' && s.payment_required);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        const orderDiff = (a.order || 0) - (b.order || 0);
        if (orderDiff !== 0) return orderDiff;
      }
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'most-visited') return (b.visit_count || 0) - (a.visit_count || 0);
      if (sortBy === 'newest') {
        const dateA = a.created_at?._seconds || 0;
        const dateB = b.created_at?._seconds || 0;
        return dateB - dateA;
      }
      return 0;
    });

  const isAdmin = user?.role === 'admin';
  console.log('User:', user, 'isAdmin:', isAdmin);

  const getIcon = (iconName: string) => {
    return <i className={`fas ${iconName} text-2xl`}></i>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Digital Services</h1>
        
        {isAdmin && (
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              All Services
            </button>
            <button 
              onClick={() => setActiveTab('popular')}
              className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'popular' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Popular (Home)
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search services..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-64 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="name-asc">A-Z</option>
              <option value="name-desc">Z-A</option>
              <option value="most-visited">Most Visited</option>
              <option value="newest">Newest First</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Filter:</span>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Services</option>
              <option value="internal">Internal Only</option>
              <option value="external">External Only</option>
              <option value="paid">Paid Services</option>
            </select>
          </div>

          {isAdmin && (
            <ModernButton 
              text="Add Service" 
              icon={Plus} 
              onClick={() => {
                setEditingService(null);
                setFormData({ 
                  name: '', 
                  description: '', 
                  url: '', 
                  type: 'internal',
                  icon: '',
                  application_id: '',
                  visible_status: 1, 
                  enabled: true,
                  service_price: 0,
                  payment_required: false,
                  fee: 0,
                  staff_commission: 0,
                  isPopular: false,
                  order: services.length
                });
                setShowForm(true);
              }}
              gradient="blue-gradient"
              className="!px-4 !py-2 !text-sm"
            />
          )}
        </div>
      </div>

      {activeTab === 'popular' && isAdmin ? (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-lg">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Star className="text-amber-500" /> Popular Services Control
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Drag and drop to reorder how they appear on the homepage (Max 8).</p>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={services.filter(s => s.isPopular).sort((a,b) => (a.order || 0) - (b.order || 0)).map(s => s.service_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-3">
                {services.filter(s => s.isPopular).sort((a,b) => (a.order || 0) - (b.order || 0)).map(service => (
                  <SortableServiceItem 
                    key={service.service_id} 
                    service={service} 
                    isAdmin={isAdmin}
                    onTogglePopular={onTogglePopular}
                  />
                ))}
                {services.filter(s => s.isPopular).length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl">
                    <Star size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">No popular services selected. Mark services as popular from the "All Services" tab.</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <>
          {showForm && isAdmin && (
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingService ? 'Edit Service' : 'Add New Service'}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Service Name</label>
                <input 
                  type="text" placeholder="e.g. Aadhaar Card" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Application Type</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 focus:border-blue-500 outline-none"
                >
                  <option value="internal">Internal Form</option>
                  <option value="external">External Service URL</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Service URL (for External Type)</label>
                <input 
                  type="url" placeholder="https://..." 
                  value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Application ID</label>
                <input 
                  type="text" placeholder="Enter Application ID" 
                  value={formData.application_id} onChange={e => setFormData({...formData, application_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium font-bold">Icon Name (FontAwesome Class)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" placeholder="e.g. fa-fingerprint, fa-id-card" 
                    value={formData.icon || ''} onChange={e => setFormData({...formData, icon: e.target.value})}
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 focus:border-blue-500 outline-none"
                  />
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {getIcon(formData.icon)}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Description</label>
              <textarea 
                placeholder="Brief description of the service..." required
                value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 focus:border-blue-500 outline-none h-24 resize-none"
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
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.visible_status === 1 ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400 dark:group-hover:border-slate-500'}`}>
                  {formData.visible_status === 1 && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Visible to Users</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.enabled} 
                  onChange={e => setFormData({...formData, enabled: e.target.checked})}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.enabled ? 'bg-green-600 border-green-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400 dark:group-hover:border-slate-500'}`}>
                  {formData.enabled && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Active Status</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.isPopular} 
                  onChange={e => {
                    if (e.target.checked && services.filter(s => s.isPopular).length >= 8) {
                      alert('Maximum 8 popular services allowed.');
                      return;
                    }
                    setFormData({...formData, isPopular: e.target.checked})
                  }}
                  className="hidden"
                />
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isPopular ? 'bg-amber-600 border-amber-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400 dark:group-hover:border-slate-500'}`}>
                  {formData.isPopular && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Mark as Popular (Homepage)</span>
              </label>
            </div>

            {editingService && formData.type === 'internal' && (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Internal Form Builder</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Configure dynamic input fields and document requirements.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/services/${encodeURIComponent(editingService.serviceId || editingService.service_id || editingService.id)}/builder`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Settings size={16} /> Open Form Builder
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold">Cancel</button>
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

      {error && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-3 text-orange-400 mb-6">
          <LucideIcons.AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-12">
          {activeTab === 'popular' ? (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.grid_columns || 4} gap-6`}>
              {filtered.filter(s => s.isPopular).length > 0 ? (
                filtered.filter(s => s.isPopular).map(service => {
                  const isComingSoon = service.status === 'comingSoon';
                  const isMaintenance = service.status === 'maintenance';
                  return (
                    <div key={service.service_id} className="group bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-lg hover:border-blue-500/50 transition-all hover:-translate-y-1 relative flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
                      {isComingSoon && (
                        <div className="absolute top-4 right-4 bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                          Coming Soon
                        </div>
                      )}
                      {isMaintenance && (
                        <div className="absolute top-4 right-4 bg-cyan-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                          Maintenance
                        </div>
                      )}
                      {isAdmin && !isComingSoon && !isMaintenance && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-150 transition-opacity">
                          <button onClick={() => toggleVisibility(service)} className={`p-1.5 rounded-lg ${service.is_visible ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} title={service.is_visible ? 'Visible' : 'Hidden'}>
                            {service.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <button onClick={() => toggleStatus(service)} className={`p-1.5 rounded-lg ${service.enabled ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`} title={service.enabled ? 'Deactivate' : 'Activate'}>
                            <Power size={16} />
                          </button>
                          <button onClick={() => handleEdit(service)} className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-white" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(service.service_id || service.serviceId || service.id)} className="p-1.5 rounded-lg text-red-500 hover:text-red-700 dark:hover:text-white" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                        {getIcon(service.icon)}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{service.name}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-3 flex-1">{service.description}</p>
                      <div className="mt-auto flex flex-col gap-2">
                        {isComingSoon ? (
                          <button disabled className="w-full py-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider rounded-2xl text-xs cursor-not-allowed">Coming Soon</button>
                        ) : isMaintenance ? (
                          <button disabled className="w-full py-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-extrabold uppercase tracking-wider rounded-2xl text-xs cursor-not-allowed">Under Maintenance</button>
                        ) : (user?.role === 'admin' || user?.role === 'staff') ? (
                          <>
                            <ModernButton text="Apply for Customer" icon={UserCog} onClick={() => handleApply(service)} gradient="blue-gold-gradient" className="w-full !py-2 !text-xs" />
                            {(service.application_type === 'external' || service.service_url || service.url) && (
                              <button onClick={() => handleOpenUrl(service)} className="inline-flex items-center justify-center w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl transition-all font-bold text-xs gap-2">Open Service URL</button>
                            )}
                          </>
                        ) : (
                          <ModernButton text="Apply Now" icon={UserCog} onClick={() => handleApply(service)} gradient="blue-gold-gradient" className="w-full !py-3 !text-sm" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">No popular services found.</div>
              )}
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.grid_columns || 4} gap-6`}>
              {filtered.map(service => {
                const isComingSoon = service.status === 'comingSoon';
                const isMaintenance = service.status === 'maintenance';
                return (
                  <div key={service.service_id} className="group bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-lg hover:border-blue-500/50 transition-all hover:-translate-y-1 relative flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
                    {isComingSoon && (
                      <div className="absolute top-4 right-4 bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                        Coming Soon
                      </div>
                    )}
                    {isMaintenance && (
                      <div className="absolute top-4 right-4 bg-cyan-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                        Maintenance
                      </div>
                    )}
                    {isAdmin && !isComingSoon && !isMaintenance && (
                      <div className="absolute top-4 right-4 flex gap-2 opacity-100 transition-opacity">
                        <button onClick={() => toggleVisibility(service)} className={`p-1.5 rounded-lg ${service.is_visible ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} title={service.is_visible ? 'Visible' : 'Hidden'}>
                          {service.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button onClick={() => toggleStatus(service)} className={`p-1.5 rounded-lg ${service.enabled ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`} title={service.enabled ? 'Deactivate' : 'Activate'}>
                          <Power size={16} />
                        </button>
                        <button onClick={() => handleEdit(service)} className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-white" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(service.service_id || service.serviceId || service.id)} className="p-1.5 rounded-lg text-red-500 hover:text-red-700 dark:hover:text-white" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                      {getIcon(service.icon)}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{service.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-3 flex-1">{service.description}</p>
                    <div className="mt-auto flex flex-col gap-2">
                      {isComingSoon ? (
                        <button disabled className="w-full py-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider rounded-2xl text-xs cursor-not-allowed">Coming Soon</button>
                      ) : isMaintenance ? (
                        <button disabled className="w-full py-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-extrabold uppercase tracking-wider rounded-2xl text-xs cursor-not-allowed">Under Maintenance</button>
                      ) : (user?.role === 'admin' || user?.role === 'staff') ? (
                        <>
                          <ModernButton text="Apply for Customer" icon={UserCog} onClick={() => handleApply(service)} gradient="blue-gold-gradient" className="w-full !py-2 !text-xs" />
                          {(service.application_type === 'external' || service.service_url || service.url) && (
                            <button onClick={() => handleOpenUrl(service)} className="inline-flex items-center justify-center w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl transition-all font-bold text-xs gap-2">Open Service URL</button>
                          )}
                        </>
                      ) : (
                        <ModernButton text="Apply Now" icon={UserCog} onClick={() => handleApply(service)} gradient="blue-gold-gradient" className="w-full !py-3 !text-sm" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </>
      )}

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
