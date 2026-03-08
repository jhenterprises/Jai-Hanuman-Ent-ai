import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Download, Search, Filter } from 'lucide-react';

const Ledger = () => {
  const [ledger, setLedger] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ customer_name: '', service_name: '', amount: '', date: '' });
  const { user } = useAuth();

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    const res = await api.get('/ledger');
    setLedger(res.data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/ledger', newEntry);
    setShowAdd(false);
    setNewEntry({ customer_name: '', service_name: '', amount: '', date: '' });
    fetchLedger();
  };

  const filtered = ledger.filter(l => 
    (l.customer_name || '').toLowerCase().includes(search.toLowerCase()) &&
    (dateFilter ? l.date.startsWith(dateFilter) : true)
  );

  const total = filtered.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Ledger Reports</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search customer..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-64"
            />
          </div>
          <input 
            type="month" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Entry</span>
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-white mb-4">New Ledger Entry</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input 
              type="text" placeholder="Customer Name" required
              value={newEntry.customer_name} onChange={e => setNewEntry({...newEntry, customer_name: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            />
            <input 
              type="text" placeholder="Service Name" required
              value={newEntry.service_name} onChange={e => setNewEntry({...newEntry, service_name: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            />
            <input 
              type="number" placeholder="Amount (₹)" required
              value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            />
            <input 
              type="date" required
              value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200"
            />
            <div className="md:col-span-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">Save Entry</button>
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
                <th className="p-4 text-slate-300 font-semibold">Customer</th>
                <th className="p-4 text-slate-300 font-semibold">Service</th>
                <th className="p-4 text-slate-300 font-semibold">Amount</th>
                {user?.role === 'admin' && <th className="p-4 text-slate-300 font-semibold">Staff</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="p-4 text-slate-400">{item.date}</td>
                  <td className="p-4 text-slate-200 font-medium">{item.customer_name}</td>
                  <td className="p-4 text-slate-400">{item.service_name}</td>
                  <td className="p-4 text-green-400 font-medium">₹{item.amount}</td>
                  {user?.role === 'admin' && <td className="p-4 text-slate-400">{item.staff_name}</td>}
                </tr>
              ))}
              <tr className="bg-slate-700/50 font-bold border-t-2 border-slate-600">
                <td colSpan={3} className="p-4 text-right text-slate-200">Total Revenue:</td>
                <td className="p-4 text-cyan-400 text-xl">₹{total}</td>
                {user?.role === 'admin' && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
