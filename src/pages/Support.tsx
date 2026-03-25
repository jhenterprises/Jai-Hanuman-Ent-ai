import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Plus, CheckCircle, Clock, XCircle, User } from 'lucide-react';
import { safeFormat } from '../utils/dateUtils';

const Support = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/support');
      setTickets(res.data);
    } catch (error) {
      console.error('Failed to fetch support tickets', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/support', newTicket);
      setShowAdd(false);
      setNewTicket({ subject: '', message: '' });
      fetchTickets();
    } catch (error) {
      console.error('Failed to submit ticket', error);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.put(`/support/${id}/status`, { status });
      fetchTickets();
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'closed') return 'bg-green-500/10 text-green-400 border-green-500/20';
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  };

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'closed') return <CheckCircle size={12} />;
    return <Clock size={12} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Support</h1>
        {user?.role === 'user' && (
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Ticket</span>
          </button>
        )}
      </div>

      {showAdd && user?.role === 'user' && (
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Contact Support</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Subject</label>
              <input 
                type="text" 
                required
                value={newTicket.subject} 
                onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="Brief description of your issue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
              <textarea 
                required
                rows={4}
                value={newTicket.message} 
                onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Detailed explanation of your problem"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">Submit Ticket</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-700/30 border-b border-slate-700/50">
                <th className="p-4 text-slate-300 font-semibold">Date</th>
                {(user?.role === 'admin' || user?.role === 'staff') && (
                  <th className="p-4 text-slate-300 font-semibold">User</th>
                )}
                <th className="p-4 text-slate-300 font-semibold">Subject</th>
                <th className="p-4 text-slate-300 font-semibold">Status</th>
                <th className="p-4 text-slate-300 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'admin' || user?.role === 'staff' ? 5 : 4} className="p-8 text-center text-slate-500">
                    No support tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map(ticket => (
                  <tr key={ticket.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 text-slate-400">{safeFormat(ticket.created_at, 'dd/MM/yyyy')}</td>
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                      <td className="p-4 text-slate-200 font-medium">
                        <div>{ticket.user_name}</div>
                        <div className="text-xs text-slate-500">{ticket.user_email}</div>
                      </td>
                    )}
                    <td className="p-4 text-slate-300 font-medium">{ticket.subject}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {(ticket.status || '').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                      >
                        <MessageSquare size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
              <div>
                <h2 className="text-2xl font-bold text-white">Ticket Details</h2>
                <p className="text-slate-400 text-sm mt-1">Submitted on {safeFormat(selectedTicket.created_at, 'dd/MM/yyyy, hh:mm a')}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                    <User size={16} /> User Info
                  </h3>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <p className="text-slate-200 font-medium">{selectedTicket.user_name}</p>
                    <p className="text-slate-400 text-sm">{selectedTicket.user_email}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Subject</h3>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-slate-200 font-medium">{selectedTicket.subject}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Message</h3>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 whitespace-pre-wrap">
                  <p className="text-slate-300">{selectedTicket.message}</p>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <div className="p-6 border-t border-slate-700 bg-slate-800/80 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">Status:</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusIcon(selectedTicket.status)}
                      {(selectedTicket.status || '').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {selectedTicket.status !== 'Open' && (
                      <button 
                        onClick={() => handleStatusUpdate(selectedTicket.id, 'Open')}
                        className="px-4 py-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl transition-colors text-sm font-medium"
                      >
                        Reopen Ticket
                      </button>
                    )}
                    {selectedTicket.status !== 'Closed' && (
                      <button 
                        onClick={() => handleStatusUpdate(selectedTicket.id, 'Closed')}
                        className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-xl transition-colors text-sm font-medium"
                      >
                        Mark as Closed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
