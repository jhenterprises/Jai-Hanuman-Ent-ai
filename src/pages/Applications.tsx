import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, CheckCircle, XCircle, Clock, Eye, Download, User, ExternalLink, Activity, Upload, MessageSquare, Filter, Shield, Loader2 } from 'lucide-react';
import { downloadPDF } from '../utils/pdfGenerator';
import AcknowledgementReceipt from '../components/AcknowledgementReceipt';
import { safeFormat } from '../utils/dateUtils';

const Applications = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [serviceLinks, setServiceLinks] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    service_id: '',
    status: 'All',
    payment_status: 'All',
    start_date: '',
    end_date: ''
  });
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [updateData, setUpdateData] = useState({ status: '', comment: '' });
  const [assignStaffId, setAssignStaffId] = useState('');
  const [updateFiles, setUpdateFiles] = useState<File[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const [authToken, setAuthToken] = useState<string>('');
  
  useEffect(() => {
    const getToken = async () => {
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          setAuthToken(token);
        } catch (err) {
          console.error('Failed to get auth token:', err);
        }
      }
    };
    getToken();
  }, [auth.currentUser]);

  useEffect(() => {
    fetchApplications();
    if (user?.role === 'admin' || user?.role === 'staff') {
      fetchServiceLinks();
      fetchServices();
      if (user?.role === 'admin') {
        fetchStaffMembers();
      }
    }
  }, [user, filters]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const appId = params.get('id');
    if (appId && applications.length > 0) {
      const app = applications.find(a => String(a.id) === String(appId));
      if (app) setSelectedApp(app);
    }
  }, [location, applications]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!selectedApp) return;
    setIsGeneratingPDF(true);
    // Small delay to ensure styles are applied
    setTimeout(async () => {
      await downloadPDF('receipt-applications', `Application_${selectedApp.reference_number}`);
      setIsGeneratingPDF(false);
    }, 100);
  };

  const fetchApplications = async () => {
    try {
      let q = query(collection(db, 'applications'));
      
      if (user?.role === 'user' && user?.uid) {
        q = query(q, where('userId', '==', user.uid));
      } else if (user?.role === 'staff' && user?.uid) {
        q = query(q, where('assigned_staff', '==', user.uid));
      } else if (user?.role !== 'admin') {
        setApplications([]);
        return;
      }

      if (filters.status !== 'All') {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters.payment_status !== 'All') {
        q = query(q, where('payment_status', '==', filters.payment_status));
      }

      q = query(q, orderBy('created_at', 'desc'));

      const snapshot = await getDocs(q);
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Apply client-side search if needed
      if (search) {
        const searchLower = search.toLowerCase();
        setApplications(apps.filter(app => 
          (app.reference_number || '').toLowerCase().includes(searchLower) ||
          (app.user_name || '').toLowerCase().includes(searchLower) ||
          (app.user_phone || '').toLowerCase().includes(searchLower)
        ));
      } else {
        setApplications(apps);
      }
    } catch (err) {
      console.error('Error fetching applications from Firestore:', err);
    }
  };

  const fetchServices = async () => {
    try {
      console.log('Fetching services from Firestore for Applications...');
      const querySnapshot = await getDocs(collection(db, 'services'));
      const servicesData = querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          service_id: doc.id,
          ...data,
          service_name: data.service_name || data.name || 'Unnamed Service',
          description: data.description || 'No description available',
          service_url: data.service_url || data.url || '',
          icon: data.icon || 'fa-file',
          is_active: data.is_active !== undefined ? data.is_active : (data.enabled !== undefined ? data.enabled : 1),
          is_visible: data.is_visible !== undefined ? data.is_visible : 1,
          application_type: data.application_type || (data.url ? 'external' : 'internal')
        };
      });
      setServices(servicesData);
    } catch (err) {
      console.error('Error fetching services from Firestore for Applications:', err);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const res = await api.get('/users');
      setStaffMembers(res.data.filter((u: any) => u.role === 'staff' || u.role === 'admin'));
    } catch (err: any) {
      console.error('Error fetching staff members from API:', err);
      
      // Fallback to Firestore
      if (err.message?.includes('HTML') || !err.response || err.code === 'ECONNABORTED' || err.response?.status >= 500) {
        try {
          console.log('Attempting to fetch staff from Firestore fallback for Applications...');
          const snapshot = await getDocs(collection(db, 'users'));
          const staffList = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => (u.role === 'staff' || u.role === 'admin') && !u.deleted_at);
          setStaffMembers(staffList);
        } catch (fsErr) {
          console.error('Firestore staff fallback failed:', fsErr);
        }
      }
    }
  };

  const fetchServiceLinks = async () => {
    try {
      const res = await api.get('/service-links');
      setServiceLinks(res.data);
    } catch (err: any) {
      console.error('Error fetching service links from API:', err);
      
      // Fallback to Firestore
      if (err.message?.includes('HTML') || !err.response || err.code === 'ECONNABORTED' || err.response?.status >= 500) {
        try {
          console.log('Attempting to fetch service links from Firestore fallback...');
          const snapshot = await getDocs(collection(db, 'service_links'));
          setServiceLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (fsErr) {
          console.error('Firestore service links fallback failed:', fsErr);
        }
      }
    }
  };

  const getServiceLink = (type: string) => {
    return serviceLinks.find(l => (l.service_type || '').toLowerCase() === (type || '').toLowerCase());
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateData.status) return;
    
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('status', updateData.status);
      formData.append('comment', updateData.comment);
      formData.append('service_type', selectedApp.service_type);
      updateFiles.forEach(file => {
        formData.append('documents', file);
      });

      await api.patch(`/applications/${selectedApp.id}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      fetchApplications();
      setSelectedApp(null);
      setUpdateData({ status: '', comment: '' });
      setUpdateFiles([]);
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStaffId) return;

    setIsUpdating(true);
    try {
      await api.patch(`/applications/${selectedApp.id}/assign`, { staff_id: assignStaffId });
      fetchApplications();
      setSelectedApp(null);
      setAssignStaffId('');
    } catch (err) {
      console.error('Error assigning staff:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = applications; // Filtering is now done on the backend

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 'processing' || s === 'under review') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'documents required') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'completed') return <CheckCircle size={12} />;
    if (s === 'rejected') return <XCircle size={12} />;
    return <Clock size={12} />;
  };

  const statuses = ['All', 'Submitted', 'Under Review', 'Processing', 'Documents Required', 'Approved', 'Rejected', 'Completed'];
  const paymentStatuses = ['All', 'Paid', 'Pending'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Applications</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage and track service application requests</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Application ID, Name, Mobile..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchApplications()}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'staff') && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Service</label>
            <select 
              value={filters.service_id}
              onChange={(e) => setFilters({...filters, service_id: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Services</option>
              {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Payment Status</label>
            <select 
              value={filters.payment_status}
              onChange={(e) => setFilters({...filters, payment_status: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
            <input 
              type="date" 
              value={filters.start_date}
              onChange={(e) => setFilters({...filters, start_date: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
            <input 
              type="date" 
              value={filters.end_date}
              onChange={(e) => setFilters({...filters, end_date: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-5 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Application ID & Date</th>
                {(user?.role === 'admin' || user?.role === 'staff') && <th className="p-5 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Applicant</th>}
                <th className="p-5 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Service Type</th>
                <th className="p-5 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Payment</th>
                <th className="p-5 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Status</th>
                {(user?.role === 'admin' || user?.role === 'staff') && <th className="p-5 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Assigned Staff</th>}
                <th className="p-5 text-slate-500 font-bold text-[10px] uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={(user?.role === 'admin' || user?.role === 'staff') ? 7 : 5} className="p-12 text-center text-slate-400 italic">No applications found matching your criteria.</td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5">
                      <div className="text-slate-900 font-bold font-mono text-sm tracking-tight">{item.reference_number}</div>
                      <div className="text-slate-500 text-xs mt-1">{safeFormat(item.created_at, 'dd MMM, yyyy')}</div>
                      {item.created_by === 'staff' && (
                        <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 mt-1.5 inline-block font-bold uppercase tracking-tighter">Staff Assisted</span>
                      )}
                    </td>
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                      <td className="p-5">
                        <div className="text-slate-900 font-bold text-sm">{item.user_name}</div>
                        <div className="text-xs text-slate-400">{item.user_phone}</div>
                      </td>
                    )}
                    <td className="p-5">
                      <span className="text-slate-700 font-medium text-sm capitalize">{(item.service_name || item.service_type || '').replace(/-/g, ' ')}</span>
                    </td>
                    <td className="p-5">
                      {item.payment_required ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          item.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.payment_status || 'Pending'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider shadow-sm ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </td>
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                      <td className="p-5">
                        <div className="text-slate-700 text-sm">{item.staff_name || <span className="text-slate-400 italic">Unassigned</span>}</div>
                      </td>
                    )}
                    <td className="p-5 text-right flex items-center justify-end gap-2">
                      {downloadingId === item.id && (
                        <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
                          <AcknowledgementReceipt application={item} id={`receipt-row-${item.id}`} />
                        </div>
                      )}
                      <button 
                        onClick={() => setSelectedApp(item)}
                        className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm group-hover:shadow-md"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={async () => {
                          setDownloadingId(item.id);
                          // Delay to ensure hidden receipt is rendered and styles are applied
                          setTimeout(async () => {
                            await downloadPDF(`receipt-row-${item.id}`, `Acknowledgement_${item.reference_number}`);
                            setDownloadingId(null);
                          }, 500);
                        }}
                        disabled={downloadingId === item.id}
                        className="p-2.5 bg-white border border-slate-200 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group-hover:shadow-md disabled:opacity-50"
                        title="Download Acknowledgement"
                      >
                        {downloadingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white capitalize">{selectedApp.service_type} Application</h2>
                  <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400 border border-slate-700">{selectedApp.reference_number}</span>
                </div>
                <p className="text-slate-400 text-sm mt-1">Submitted on {safeFormat(selectedApp.created_at, 'dd MMM yyyy, hh:mm a')}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Info & Form */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Government Style Application Form View */}
                    <AcknowledgementReceipt application={selectedApp} id="receipt-applications" />
                    
                    <div className="p-6 bg-[#f8fafc] border-t border-[#e2e8f0] flex justify-center gap-4 no-print">
                      <button 
                        onClick={handleDownloadPDF} 
                        disabled={isGeneratingPDF}
                        className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        {isGeneratingPDF ? 'Generating...' : 'Download Application Record'}
                      </button>
                      <button 
                        onClick={async () => {
                          setIsGeneratingPDF(true);
                          // Small delay to ensure styles are applied
                          setTimeout(async () => {
                            await downloadPDF('receipt-applications', `Acknowledgement_${selectedApp.reference_number}`);
                            setIsGeneratingPDF(false);
                          }, 100);
                        }}
                        disabled={isGeneratingPDF}
                        className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        {isGeneratingPDF ? 'Generating...' : 'Download Acknowledgement'}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Timeline & Actions */}
                  <div className="space-y-8">
                  {/* Documents */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                      <FileText size={16} className="text-blue-600" /> Uploaded Documents
                    </h3>
                    <div className="space-y-3">
                      {selectedApp.documents && selectedApp.documents.length > 0 ? (
                        selectedApp.documents.map((doc: any) => (
                          <div 
                            key={doc.id}
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group cursor-pointer"
                            onClick={() => setPreviewDoc(doc)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200">
                              <FileText size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-700 group-hover:text-blue-700 truncate">{doc.file_name}</div>
                              <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Uploaded {safeFormat(doc.uploaded_at, 'dd/MM/yyyy')}</div>
                            </div>
                            <a 
                              href={`/api/admin/documents/${doc.id}?token=${authToken}`}
                              download={doc.file_name}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                              title="Download"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic text-center py-4">No documents uploaded.</p>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                      <Activity size={16} className="text-blue-600" /> Timeline
                    </h3>
                    <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      {selectedApp.updates && selectedApp.updates.map((update: any, idx: number) => (
                        <div key={update.id} className="relative pl-8">
                          <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm ${idx === 0 ? 'bg-blue-600' : 'bg-slate-200'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-bold text-slate-900">{update.status}</div>
                              <div className="text-[10px] text-slate-400">{safeFormat(update.updated_at, 'dd/MM/yyyy')}</div>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2">{update.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Admin/Staff Actions */}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <div className="space-y-6">
                      {user?.role === 'admin' && (
                        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm">
                          <h3 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2 uppercase tracking-widest">
                            <User size={16} /> Assign Staff
                          </h3>
                          <form onSubmit={handleAssignStaff} className="space-y-4">
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">Select Staff Member</label>
                              <select 
                                required
                                value={assignStaffId}
                                onChange={e => setAssignStaffId(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-500 outline-none text-xs"
                              >
                                <option value="">Select Staff</option>
                                {staffMembers.map(staff => (
                                  <option key={staff.id} value={staff.id}>{staff.name} ({staff.email})</option>
                                ))}
                              </select>
                            </div>
                            <button 
                              type="submit"
                              disabled={isUpdating || !assignStaffId}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                            >
                              {isUpdating ? 'Assigning...' : 'Assign Staff'}
                            </button>
                          </form>
                        </div>
                      )}

                      <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                        <h3 className="text-sm font-bold text-blue-600 mb-4 flex items-center gap-2 uppercase tracking-widest">
                          <MessageSquare size={16} /> Update Status
                        </h3>
                        <form onSubmit={handleStatusUpdate} className="space-y-4">
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">New Status</label>
                            <select 
                              required
                              value={updateData.status}
                              onChange={e => setUpdateData({...updateData, status: e.target.value})}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-500 outline-none text-xs"
                            >
                              <option value="">Select Status</option>
                              {statuses.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">Remarks</label>
                            <textarea 
                              placeholder="Add internal remarks or notes for user..."
                              value={updateData.comment}
                              onChange={e => setUpdateData({...updateData, comment: e.target.value})}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-500 outline-none h-24 resize-none text-xs"
                            />
                          </div>
                          <button 
                            type="submit"
                            disabled={isUpdating}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                          >
                            {isUpdating ? 'Updating...' : 'Verify & Update Status'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold truncate max-w-md">{previewDoc.file_name}</h3>
                  <p className="text-xs text-slate-400">Document Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={`/api/admin/documents/${previewDoc.id}?token=${authToken}`}
                  download={previewDoc.file_name}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  title="Download"
                >
                  <Download size={20} />
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 p-4 overflow-hidden flex items-center justify-center">
              {previewDoc.file_name.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={`/api/admin/documents/${previewDoc.id}?token=${authToken}`} 
                  className="w-full h-full rounded-xl bg-white"
                  title="PDF Preview"
                />
              ) : (
                <img 
                  src={`/api/admin/documents/${previewDoc.id}?token=${authToken}`} 
                  alt="Document Preview" 
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
