import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { 
  FileText, Shield, Layers, HelpCircle, Eye, EyeOff, Sparkles, Check, X, 
  Trash2, Play, RefreshCw, AlertTriangle, ArrowLeft, LayoutTemplate, 
  FileSpreadsheet, ExternalLink, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernButton from '../../components/ModernButton';
import ConfirmDialog from '../../components/ConfirmDialog';
import { toast } from 'react-hot-toast';

// Default fields count for hardcoded forms
const DEFAULT_FIELDS_COUNTS: Record<string, number> = {
  aadhaar: 15,
  pan: 14,
  voterid: 16,
  passport: 17,
  general: 11
};

// Hardcoded structures of default forms for viewing / resetting purposes
const DEFAULT_FORM_SCHEMAS: Record<string, any> = {
  aadhaar: {
    sections: [
      {
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { name: 'parentName', label: 'Father / Mother / Spouse Name', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'houseNo', label: 'House Number', type: 'text', required: true },
          { name: 'street', label: 'Street / Area', type: 'text', required: true },
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
          { name: 'aadhaarNumber', label: 'Aadhaar Number (for update)', type: 'text', required: false },
        ]
      },
      {
        title: 'SECTION 4 – Service Details',
        fields: [
          { name: 'serviceType', label: 'Service Type', type: 'select', options: ['New Enrollment', 'Update Details', 'Download e-Aadhaar'], required: true },
          { name: 'updateType', label: 'Update Type (if applicable)', type: 'select', options: ['Name', 'Address', 'DOB', 'Mobile', 'Biometrics'], required: false },
        ]
      }
    ],
    documents: ['Photo', 'Identity Proof', 'Address Proof', 'Age Proof']
  },
  pan: {
    sections: [
      {
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { name: 'fatherName', label: 'Father\'s Name', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'houseNo', label: 'House Number', type: 'text', required: true },
          { name: 'street', label: 'Street / Area', type: 'text', required: true },
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
          { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 4 – Service Details',
        fields: [
          { name: 'panType', label: 'PAN Application Type', type: 'select', options: ['New PAN - Indian Citizen', 'New PAN - Foreign Citizen', 'Correction in Existing PAN'], required: true },
        ]
      }
    ],
    documents: ['Photo', 'Identity Proof', 'Address Proof', 'Age Proof']
  },
  voterid: {
    sections: [
      {
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { name: 'parentName', label: 'Father / Mother / Spouse Name', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'houseNo', label: 'House Number', type: 'text', required: true },
          { name: 'street', label: 'Street / Area', type: 'text', required: true },
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
          { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: false },
        ]
      },
      {
        title: 'SECTION 4 – Election Details',
        fields: [
          { name: 'constituency', label: 'Constituency', type: 'text', required: true },
          { name: 'assemblyArea', label: 'Assembly Area', type: 'text', required: true },
          { name: 'previousVoterId', label: 'Previous Voter ID (optional)', type: 'text', required: false },
        ]
      }
    ],
    documents: ['Photo', 'Age Proof', 'Address Proof', 'Identity Proof']
  },
  passport: {
    sections: [
      {
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'givenName', label: 'Given Name', type: 'text', required: true },
          { name: 'surname', label: 'Surname', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'placeOfBirth', label: 'Place of Birth', type: 'text', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { name: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'], required: true },
        ]
      },
      {
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'houseNo', label: 'House Number', type: 'text', required: true },
          { name: 'street', label: 'Street / Area', type: 'text', required: true },
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
          { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 4 – Service Details',
        fields: [
          { name: 'passportType', label: 'Application Type', type: 'select', options: ['Fresh Passport', 'Re-issue of Passport'], required: true },
          { name: 'validityRequired', label: 'Validity Required', type: 'select', options: ['10 Years', '5 Years', 'Up to 18 years of age'], required: true },
        ]
      }
    ],
    documents: ['Photo', 'Identity Proof', 'Address Proof', 'Age Proof']
  },
  general: {
    sections: [
      {
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
        ]
      },
      {
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true },
        ]
      },
      {
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
        ]
      },
      {
        title: 'SECTION 4 – Service Details',
        fields: [
          { name: 'serviceName', label: 'Service Name', type: 'text', required: true },
          { name: 'details', label: 'Application Details', type: 'textarea', required: true },
        ]
      }
    ],
    documents: ['Photo', 'Identity Proof', 'Supporting Document']
  }
};

export default function FormConfigurationManager() {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals & detail states
  const [viewingSchema, setViewingSchema] = useState<any | null>(null);
  const [viewingServiceName, setViewingServiceName] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get services from service_management (the Primary Data Source)
      const snap = await getDocs(collection(db, 'service_management'));
      let list: any[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

      // 2. Fetch standard/legacy services if we need to merge
      const manageMap = new Map();
      list.forEach(item => {
        const sid = item.serviceId || item.id;
        manageMap.set(sid, item);
      });

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
              category: os.category || 'Identity Services',
              displayOrder: manageMap.size + 1,
              isVisible: os.is_visible !== false,
              status: os.enabled !== false ? 'active' : 'disabled',
              icon: os.icon || 'fa-file',
              description: os.description || '',
              application_type: os.application_type || (os.url ? 'external' : 'internal'),
              url: os.url || ''
            });
          }
        });
      } catch (e) {
        console.warn('Services collection reading bypassed:', e);
      }

      list = Array.from(manageMap.values());

      // 3. For each service, calculate its custom fields count or fallback
      const finalServices = await Promise.all(list.map(async (service) => {
        const sId = service.serviceId || service.id;
        let totalFields = 0;
        let formSource = 'Default System Form';
        let customSchema: any = null;

        // Check if there's a custom form_schema inside service_management
        if (service.form_schema && Array.isArray(service.form_schema.sections)) {
          customSchema = service.form_schema;
          totalFields = service.form_schema.sections.reduce((acc: number, section: any) => {
            return acc + (Array.isArray(section.fields) ? section.fields.length : 0);
          }, 0);
          formSource = 'Custom Dynamic Form';
        } 
        
        // If not, look in form_settings collection
        if (totalFields === 0) {
          try {
            const settingsQ = query(collection(db, 'form_settings'), where('serviceId', '==', sId));
            const settingsSnap = await getDocs(settingsQ);
            if (!settingsSnap.empty) {
              const settingsData = settingsSnap.docs[0].data();
              if (Array.isArray(settingsData.fields)) {
                totalFields = settingsData.fields.length;
                formSource = 'Custom Settings Form';
                customSchema = {
                  sections: [{ title: 'General Fields', fields: settingsData.fields }]
                };
              }
            }
          } catch (e) {
            console.warn('Could not read form_settings:', e);
          }
        }

        // Fallback to hardcoded structures
        if (totalFields === 0) {
          const lowerId = String(sId).toLowerCase();
          if (DEFAULT_FIELDS_COUNTS[lowerId] !== undefined) {
            totalFields = DEFAULT_FIELDS_COUNTS[lowerId];
            formSource = 'Hardcoded System Form';
            customSchema = DEFAULT_FORM_SCHEMAS[lowerId];
          } else if (service.application_type === 'external' || service.url?.startsWith('http')) {
            totalFields = 0;
            formSource = 'External Redirect';
          } else {
            // default fallback to general config
            totalFields = DEFAULT_FIELDS_COUNTS.general;
            formSource = 'Generic Fallback Form';
            customSchema = DEFAULT_FORM_SCHEMAS.general;
          }
        }

        return {
          ...service,
          totalFields,
          formSource,
          customSchema
        };
      }));

      // Sort by category first, then by displayOrder
      finalServices.sort((a, b) => {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });

      setServices(finalServices);
    } catch (err) {
      console.error('Error loading form configurations:', err);
      toast.error('Failed to load forms database.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle active status: active vs disabled (one-click)
  const handleToggleActive = async (service: any) => {
    const sId = service.serviceId || service.id;
    const isCurrentlyActive = service.status === 'active';
    const newStatus = isCurrentlyActive ? 'disabled' : 'active';

    // Optimistic UI Update
    setServices(prev => prev.map(s => {
      const currentId = s.serviceId || s.id;
      return currentId === sId ? { ...s, status: newStatus } : s;
    }));

    try {
      // Use setDoc with merge: true to automatically create the document if it doesn't exist
      const refMgmt = doc(db, 'service_management', sId);
      await setDoc(refMgmt, {
        status: newStatus,
        updated_at: new Date().toISOString()
      }, { merge: true });

      // Synchronize back to standard services collection to maintain compatibility
      try {
        const refLegacy = doc(db, 'services', sId);
        await setDoc(refLegacy, {
          enabled: newStatus === 'active',
          updated_at: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('Sync to legacy services skipped:', err);
      }

      toast.success(`Form "${service.serviceName || service.name}" is now ${newStatus === 'active' ? 'Active' : 'Disabled'}.`);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to change form active status.');
      // Rollback
      setServices(prev => prev.map(s => {
        const currentId = s.serviceId || s.id;
        return currentId === sId ? { ...s, status: isCurrentlyActive ? 'active' : 'disabled' } : s;
      }));
    }
  };

  // Toggle visibility on user panel (one-click)
  const handleToggleVisibility = async (service: any) => {
    const sId = service.serviceId || service.id;
    const originalValue = service.isVisible !== false;
    const newValue = !originalValue;

    // Optimistic UI Update
    setServices(prev => prev.map(s => {
      const currentId = s.serviceId || s.id;
      return currentId === sId ? { ...s, isVisible: newValue } : s;
    }));

    try {
      const refMgmt = doc(db, 'service_management', sId);
      await setDoc(refMgmt, {
        isVisible: newValue,
        updated_at: new Date().toISOString()
      }, { merge: true });

      try {
        const refLegacy = doc(db, 'services', sId);
        await setDoc(refLegacy, {
          is_visible: newValue,
          updated_at: serverTimestamp()
        }, { merge: true });
      } catch (err) {}

      toast.success(`Form visible status updated successfully.`);
    } catch (err) {
      console.error('Error toggling visibility:', err);
      toast.error('Failed to change visible status.');
      // Rollback
      setServices(prev => prev.map(s => {
        const currentId = s.serviceId || s.id;
        return currentId === sId ? { ...s, isVisible: originalValue } : s;
      }));
    }
  };

  // Reset form schemas back to defaults with one-click
  const handleResetToDefault = (service: any) => {
    const sId = service.serviceId || service.id;
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Form to System Defaults',
      message: `Are you sure you want to reset the form fields for "${service.serviceName || service.name}"? This will delete all customized sections and restore the default fields structure. This does not delete user submission histories.`,
      onConfirm: async () => {
        setConfirmDialog(p => ({ ...p, isOpen: false }));
        const loadToast = toast.loading('Resetting form structure...');
        try {
          // Remove custom form_schema from service_management
          const refMgmt = doc(db, 'service_management', sId);
          await setDoc(refMgmt, {
            form_schema: null,
            updated_at: new Date().toISOString()
          }, { merge: true });

          // Delete custom entries in form_settings
          try {
            await deleteDoc(doc(db, 'form_settings', sId));
          } catch (e) {
            console.warn('Delete form_settings document bypassed:', e);
          }

          toast.success('Form restored to default system configurations!', { id: loadToast });
          fetchData();
        } catch (err) {
          console.error('Error resetting form:', err);
          toast.error('Failed to reset form fields.', { id: loadToast });
        }
      },
      onCancel: () => setConfirmDialog(p => ({ ...p, isOpen: false }))
    });
  };

  // View fields schema helper
  const handleOpenSchemaView = (service: any) => {
    setViewingServiceName(service.serviceName || service.name);
    setViewingSchema(service.customSchema || DEFAULT_FORM_SCHEMAS.general);
  };

  // Filters logic
  const filteredServices = () => {
    return services.filter(s => {
      const matchesSearch = (s.serviceName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.serviceId || s.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
      
      const isActive = s.status === 'active';
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && isActive) || 
                            (statusFilter === 'inactive' && !isActive);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  };

  const categories = Array.from(new Set(services.map(s => s.category || 'Identity Services')));

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500" id="form-config-root">
      
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6" id="form-config-header">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <LayoutTemplate className="w-8 h-8 text-blue-300 animate-pulse" />
            Form Configuration Manager
          </h1>
          <p className="text-blue-100/90 text-sm md:text-base mt-2 max-w-xl">
            Control, audit, enable, and inspect form structures for citizen certificate and identity services with instant, one-click safety controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            onClick={fetchData}
            id="btn-refresh-forms"
            title="Refresh database records"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2 transition-all text-sm font-bold"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Statuses
          </button>
        </div>
      </div>

      {/* Filtering Options */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg space-y-4" id="form-config-filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input 
              type="text"
              placeholder="Search by form name or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              id="input-search-forms"
              className="w-full pl-4 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-blue-500 transition-colors text-sm font-semibold"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              id="select-category-filter"
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-blue-500 text-sm font-bold"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              id="select-status-filter"
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-blue-500 text-sm font-bold"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Forms</option>
              <option value="inactive">Disabled Forms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Form Table Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800/30 rounded-3xl border border-slate-700/30" id="form-config-loader">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-slate-400">Fetching forms metadata and layouts...</p>
        </div>
      ) : filteredServices().length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-slate-700/30" id="form-config-empty">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">No application forms found</h3>
          <p className="text-slate-500 text-sm mt-1">Try resetting search criteria or search filters.</p>
        </div>
      ) : (
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-xl" id="form-config-table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="form-config-table">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/40">
                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-extrabold text-slate-400">Service Icon</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-extrabold text-slate-400">Service Name</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-extrabold text-slate-400">Category</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-extrabold text-slate-400">Total Fields</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-extrabold text-slate-400">Form Active</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-wider font-extrabold text-slate-400 text-right">One-Click Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {filteredServices().map(service => {
                  const isActive = service.status === 'active';
                  const isVisible = service.isVisible !== false;
                  const isExternal = service.application_type === 'external';

                  return (
                    <tr 
                      key={service.id} 
                      className="hover:bg-slate-700/20 transition-colors group"
                      id={`row-${service.id}`}
                    >
                      {/* Service Icon Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 overflow-hidden">
                          {service.image ? (
                            <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                          ) : (
                            <i className={`fas ${service.icon || 'fa-file'} text-lg`}></i>
                          )}
                        </div>
                      </td>

                      {/* Service Name & ID Column */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-base leading-tight">
                          {service.serviceName || service.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-900/60 text-blue-400 font-mono px-1.5 py-0.5 rounded border border-blue-600/20">
                            id: {service.serviceId || service.id}
                          </span>
                          {service.application_type === 'external' && (
                            <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> External
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[11px] bg-indigo-900/40 border border-indigo-600/20 text-indigo-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                          {service.category || 'Identity Services'}
                        </span>
                      </td>

                      {/* Total Fields Count Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-600">
                            {service.totalFields}
                          </span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            fields
                          </span>
                        </div>
                      </td>

                      {/* Form Active Switch (One-Click) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(service)}
                          id={`toggle-active-${service.id}`}
                          title={`Click to ${isActive ? 'Deactivate' : 'Activate'} form`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                            isActive 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                          <span className="text-xs font-black uppercase tracking-wider">
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </button>
                      </td>

                      {/* Controls Columns */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* Visibility toggle (one-click) */}
                          <button
                            onClick={() => handleToggleVisibility(service)}
                            id={`btn-toggle-vis-${service.id}`}
                            title={isVisible ? "Currently visible on catalog. Click to hide." : "Hidden from catalog. Click to make visible."}
                            className={`p-2 rounded-xl transition-all border ${
                              isVisible 
                                ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' 
                                : 'text-slate-500 bg-slate-800/40 border-slate-700 hover:text-slate-300'
                            }`}
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>

                          {/* Inspect Schema Modal launcher */}
                          {!isExternal && (
                            <button
                              onClick={() => handleOpenSchemaView(service)}
                              id={`btn-view-schema-${service.id}`}
                              className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500/20 border border-slate-700/50 rounded-xl transition-colors"
                              title="Inspect Fields Layout"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reset to Default */}
                          {!isExternal && (service.form_schema || service.formSource !== 'Hardcoded System Form') && (
                            <button
                              onClick={() => handleResetToDefault(service)}
                              id={`btn-reset-${service.id}`}
                              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-slate-700/50 rounded-xl transition-colors"
                              title="Reset custom form to standard system fields"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schema Inspection Modal */}
      {viewingSchema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-300" id="schema-modal-backdrop">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900/70 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                  Form Schema Inspector
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Auditing structure fields for: <span className="text-blue-400 font-bold">{viewingServiceName}</span></p>
              </div>
              <button 
                onClick={() => setViewingSchema(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                id="btn-close-schema"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {Array.isArray(viewingSchema.sections) && viewingSchema.sections.map((section: any, idx: number) => (
                <div key={idx} className="space-y-3 bg-slate-900/30 border border-slate-700/40 p-4 rounded-2xl">
                  <h4 className="font-extrabold text-white text-sm border-b border-slate-700/40 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 text-xs font-black rounded flex items-center justify-center">{idx + 1}</span>
                    {section.title || section.id || 'General Section'}
                  </h4>
                  <div className="divide-y divide-slate-800">
                    {Array.isArray(section.fields) && section.fields.map((field: any, fidx: number) => (
                      <div key={fidx} className="py-2.5 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-200">{field.label || field.name}</span>
                            {field.required && <span className="text-rose-500 text-xs font-bold">* Required</span>}
                          </div>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">Key ID: {field.name}</p>
                        </div>
                        <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          {field.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {Array.isArray(viewingSchema.documents) && viewingSchema.documents.length > 0 && (
                <div className="space-y-3 bg-slate-900/30 border border-slate-700/40 p-4 rounded-2xl">
                  <h4 className="font-extrabold text-white text-sm border-b border-slate-700/40 pb-1.5 uppercase tracking-wider">
                    Required Upload Documents
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingSchema.documents.map((doc: string, idx: number) => (
                      <span key={idx} className="text-xs bg-indigo-900/40 text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-700/30">
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-900/40 px-6 py-4 border-t border-slate-700/50 flex justify-end">
              <button
                onClick={() => setViewingSchema(null)}
                className="px-5 py-2.5 text-xs font-black uppercase text-slate-300 hover:text-white bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"
              >
                Close Audit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirm Dialog */}
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
