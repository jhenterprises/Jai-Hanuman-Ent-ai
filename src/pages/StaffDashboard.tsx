import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CheckCircle, XCircle, Eye, Clock, User, FileText } from 'lucide-react';
import { safeFormat } from '../utils/dateUtils';

const StaffDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications/staff');
      setApplications(res.data);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/applications/${id}/status`, { status });
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredApps = applications.filter(app => app.status === filter);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white">Staff Portal</h1>
          <p className="text-slate-500">Review and process citizen applications.</p>
        </div>
        <div className="flex glass p-1 rounded-2xl">
          {['Pending', 'Processing', 'Approved', 'Rejected'].map(s => (
            <button 
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === s ? 'blue-gradient text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 glass rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="glass rounded-[2.5rem] overflow-hidden border border-white/5">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-8 py-5">Application</th>
                <th className="px-8 py-5">Citizen</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Payment</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 blue-gradient rounded-xl flex items-center justify-center text-white">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{app.service_name || app.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">#JH-{app.id.toString().padStart(6, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <User size={14} />
                      </div>
                      <span className="text-sm text-slate-300 font-medium">{app.customer_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-400">
                    {safeFormat(app.created_at, 'dd/MM/yyyy')}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${app.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {app.payment_status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 glass rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors" title="View Details">
                        <Eye size={18} />
                      </button>
                      {app.status === 'Pending' && (
                        <button 
                          onClick={() => updateStatus(app.id, 'Processing')}
                          className="p-2 glass rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors" 
                          title="Start Processing"
                        >
                          <Clock size={18} />
                        </button>
                      )}
                      {app.status === 'Processing' && (
                        <>
                          <button 
                            onClick={() => updateStatus(app.id, 'Approved')}
                            className="p-2 glass rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors" 
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => updateStatus(app.id, 'Rejected')}
                            className="p-2 glass rounded-lg text-red-400 hover:bg-red-500/20 transition-colors" 
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApps.length === 0 && (
            <div className="py-20 text-center text-slate-500 italic">
              No applications found in this category.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
