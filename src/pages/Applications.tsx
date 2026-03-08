import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, CheckCircle, XCircle, Clock, Eye, Download, User, ExternalLink, Activity, Upload, MessageSquare, Filter } from 'lucide-react';

const Applications = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [serviceLinks, setServiceLinks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [updateData, setUpdateData] = useState({ status: '', comment: '' });
  const [updateFiles, setUpdateFiles] = useState<File[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    fetchApplications();
    if (user?.role === 'admin' || user?.role === 'staff') {
      fetchServiceLinks();
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const appId = params.get('id');
    if (appId && applications.length > 0) {
      const app = applications.find(a => a.id === parseInt(appId));
      if (app) setSelectedApp(app);
    }
  }, [location, applications]);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      setApplications(res.data);
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  const fetchServiceLinks = async () => {
    try {
      const res = await api.get('/service-links');
      setServiceLinks(res.data);
    } catch (err) {
      console.error('Error fetching service links:', err);
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

  const filtered = applications.filter(a => {
    const matchesSearch = 
      (a.reference_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.service_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.user_name || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'completed') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (s === 'processing' || s === 'under review') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (s === 'documents required') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  };

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'completed') return <CheckCircle size={12} />;
    if (s === 'rejected') return <XCircle size={12} />;
    return <Clock size={12} />;
  };

  const statuses = ['All', 'Submitted', 'Under Review', 'Processing', 'Documents Required', 'Approved', 'Rejected', 'Completed'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Applications</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Ref Number, Service, User..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-700/30 border-b border-slate-700/50">
                <th className="p-4 text-slate-300 font-semibold">Ref Number</th>
                {(user?.role === 'admin' || user?.role === 'staff') && <th className="p-4 text-slate-300 font-semibold">Applicant</th>}
                <th className="p-4 text-slate-300 font-semibold">Service</th>
                <th className="p-4 text-slate-300 font-semibold">Date</th>
                <th className="p-4 text-slate-300 font-semibold">Status</th>
                <th className="p-4 text-slate-300 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={(user?.role === 'admin' || user?.role === 'staff') ? 6 : 5} className="p-8 text-center text-slate-500">No applications found.</td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="p-4">
                      <div className="text-slate-200 font-bold font-mono text-sm">{item.reference_number}</div>
                      {item.created_by === 'staff' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 mt-1 inline-block">Staff Created</span>
                      )}
                    </td>
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                      <td className="p-4">
                        <div className="text-slate-200 font-medium">{item.user_name}</div>
                        <div className="text-xs text-slate-500">{item.user_email}</div>
                      </td>
                    )}
                    <td className="p-4 text-slate-300 capitalize">{item.service_type}</td>
                    <td className="p-4 text-slate-400 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedApp(item)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                        >
                          <Eye size={16} /> View
                        </button>
                      </div>
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
                <p className="text-slate-400 text-sm mt-1">Submitted on {new Date(selectedApp.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Info & Form */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Applicant Info */}
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <User size={20} className="text-blue-400" /> Applicant Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Name</p>
                        <p className="text-slate-200 font-medium">{selectedApp.user_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Email</p>
                        <p className="text-slate-200 font-medium">{selectedApp.user_email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Form Data */}
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText size={20} className="text-blue-400" /> Application Form
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {Object.entries(selectedApp.form_data).map(([key, value]) => (
                        <div key={key} className={key === 'address' || key === 'details' ? 'sm:col-span-2' : ''}>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-slate-200 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Download size={20} className="text-blue-400" /> Documents
                    </h3>
                    {selectedApp.documents && selectedApp.documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedApp.documents.map((doc: any) => {
                          const isStaffUpload = doc.uploaded_by !== selectedApp.user_id;
                          return (
                            <div 
                              key={doc.id} 
                              className={`flex items-center gap-3 p-3 bg-slate-950 border rounded-xl transition-colors group ${isStaffUpload ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-800'}`}
                            >
                              <FileText size={20} className={isStaffUpload ? 'text-blue-400' : 'text-slate-500'} />
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-sm font-medium text-slate-200">{doc.file_name}</div>
                                <div className="text-[10px] text-slate-600">
                                  {isStaffUpload ? 'Official Document' : 'My Upload'}
                                </div>
                              </div>
                              <a 
                                href={doc.file_path} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`p-2 rounded-lg transition-colors ${isStaffUpload ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                                title="Download"
                              >
                                <Download size={16} />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic text-center py-4">No documents uploaded.</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Timeline & Actions */}
                <div className="space-y-8">
                  {/* Timeline */}
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <Activity size={20} className="text-blue-400" /> Timeline
                    </h3>
                    <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                      {selectedApp.updates && selectedApp.updates.map((update: any, idx: number) => (
                        <div key={update.id} className="relative pl-8">
                          <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-slate-900 flex items-center justify-center z-10 ${idx === 0 ? 'bg-blue-500' : 'bg-slate-700'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-bold text-white">{update.status}</div>
                              <div className="text-[10px] text-slate-500">{new Date(update.updated_at).toLocaleDateString()}</div>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{update.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Admin/Staff Actions */}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                      <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                        <MessageSquare size={20} /> Update Status
                      </h3>
                      <form onSubmit={handleStatusUpdate} className="space-y-4">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">New Status</label>
                          <select 
                            required
                            value={updateData.status}
                            onChange={e => setUpdateData({...updateData, status: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                          >
                            <option value="">Select Status</option>
                            {statuses.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">Comment / Note</label>
                          <textarea 
                            placeholder="Add a comment for the user..."
                            value={updateData.comment}
                            onChange={e => setUpdateData({...updateData, comment: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-blue-500 outline-none h-24 resize-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 block">Upload Documents (Optional)</label>
                          <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-800 rounded-xl cursor-pointer hover:bg-slate-950 transition-colors">
                            <div className="flex flex-col items-center">
                              <Upload size={20} className="text-slate-500 mb-2" />
                              <span className="text-xs text-slate-400">{updateFiles.length > 0 ? `${updateFiles.length} files selected` : 'Click to upload approval/corrected docs'}</span>
                            </div>
                            <input 
                              type="file" 
                              multiple 
                              className="hidden" 
                              onChange={e => e.target.files && setUpdateFiles(Array.from(e.target.files))}
                            />
                          </label>
                        </div>
                        <button 
                          type="submit"
                          disabled={isUpdating}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                          {isUpdating ? 'Updating...' : 'Update Application'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Official Links (Admin/Staff Only) */}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-yellow-500/20">
                      <h3 className="text-lg font-semibold text-yellow-500 mb-4 flex items-center gap-2">
                        <ExternalLink size={20} /> Official Portals
                      </h3>
                      {(() => {
                        const link = getServiceLink(selectedApp.service_type);
                        if (!link) return <p className="text-slate-500 text-xs italic">No official links configured.</p>;
                        return (
                          <div className="space-y-3">
                            <a href={link.process_url} target="_blank" rel="noreferrer" className="block w-full py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-center text-xs hover:border-yellow-500/50 transition-all">Process Application</a>
                            <a href={link.apply_url} target="_blank" rel="noreferrer" className="block w-full py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-center text-xs hover:border-yellow-500/50 transition-all">Apply on Gov Portal</a>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
