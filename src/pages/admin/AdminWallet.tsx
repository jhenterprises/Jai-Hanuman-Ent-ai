import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Search, ArrowUpRight, ArrowDownLeft, History, Users, IndianRupee, AlertCircle, CheckCircle2, Filter, Download, ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { safeFormat } from '../../utils/dateUtils';

interface WalletInfo {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  balance: number;
  updated_at: string;
}

interface WalletTransaction {
  id: number;
  user_name: string;
  user_email: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

const AdminWallet = () => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'wallets' | 'transactions'>('wallets');
  const [editingWallet, setEditingWallet] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'wallets') {
        const res = await api.get('/admin/wallets');
        setWallets(res.data);
      } else {
        const res = await api.get('/admin/wallet/transactions');
        setTransactions(res.data);
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = async (walletId: number) => {
    const amount = parseFloat(adjustAmount);
    if (!amount || amount <= 0 || !adjustReason) return;

    setProcessing(true);
    try {
      await api.post('/admin/wallets/adjust-balance', {
        walletId,
        amount,
        type: adjustType,
        reason: adjustReason
      });
      setMessage({ type: 'success', text: 'Balance adjusted successfully!' });
      setEditingWallet(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to adjust balance' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredWallets = wallets.filter(w => 
    w.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => 
    t.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/app/admin" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Wallet Management</h1>
            <p className="text-slate-500 text-sm">Monitor user balances and transactions</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('wallets')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'wallets' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            User Wallets
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Transactions
          </button>
        </div>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all">
              <Filter size={16} /> Filter
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'wallets' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">User</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Balance</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Last Updated</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading wallets...</td></tr>
                ) : filteredWallets.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">No wallets found</td></tr>
                ) : (
                  filteredWallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-900">{wallet.user_name}</div>
                        <div className="text-xs text-slate-500">{wallet.user_email}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-lg font-black text-slate-900">₹{(wallet.balance || 0).toLocaleString()}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {safeFormat(wallet.updated_at, 'dd/MM/yyyy, hh:mm a')}
                      </td>
                      <td className="p-4 text-right">
                        {editingWallet === wallet.id ? (
                          <div className="flex flex-col gap-2 items-end">
                            <div className="flex gap-2">
                              <select 
                                value={adjustType}
                                onChange={(e) => setAdjustType(e.target.value as 'credit' | 'debit')}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                              >
                                <option value="credit">Credit (+)</option>
                                <option value="debit">Debit (-)</option>
                              </select>
                              <input 
                                type="number"
                                placeholder="Amount"
                                value={adjustAmount}
                                onChange={(e) => setAdjustAmount(e.target.value)}
                                className="w-24 text-xs border border-slate-200 rounded-lg px-2 py-1"
                              />
                            </div>
                            <input 
                              type="text"
                              placeholder="Reason/Description"
                              value={adjustReason}
                              onChange={(e) => setAdjustReason(e.target.value)}
                              className="w-48 text-xs border border-slate-200 rounded-lg px-2 py-1"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAdjustBalance(wallet.id)}
                                disabled={processing}
                                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <Save size={14} />
                              </button>
                              <button 
                                onClick={() => setEditingWallet(null)}
                                className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setEditingWallet(wallet.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            title="Adjust Balance"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">User</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Type</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Amount</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Description</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Date</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading transactions...</td></tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No transactions found</td></tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-900">{t.user_name}</div>
                        <div className="text-xs text-slate-500">{t.user_email}</div>
                      </td>
                      <td className="p-4">
                        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                          t.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.type === 'credit' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          {t.type}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`text-sm font-bold ${
                          t.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.type === 'credit' ? '+' : '-'} ₹{(t.amount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{t.description}</td>
                      <td className="p-4 text-sm text-slate-500">
                        {safeFormat(t.created_at, 'dd/MM/yyyy, hh:mm a')}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminWallet;
