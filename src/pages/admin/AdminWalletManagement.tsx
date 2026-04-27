import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  collection, getDocs, query, where, doc, 
  addDoc, updateDoc, serverTimestamp, getDoc,
  orderBy, limit
} from 'firebase/firestore';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Plus, 
  Minus, 
  History, 
  TrendingUp, 
  Users, 
  CreditCard,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  Download
} from 'lucide-react';
import { safeFormat } from '../../utils/dateUtils';
import ModernButton from '../../components/ModernButton';

const AdminWalletManagement = () => {
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wallets' | 'transactions' | 'analytics'>('wallets');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'wallets') {
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersMap = new Map();
        usersSnap.docs.forEach(d => usersMap.set(d.id, d.data()));

        const walletsList = walletsSnap.docs.map(doc => {
          const data = doc.data();
          const userData = usersMap.get(data.user_id) || {};
          return {
            wallet_id: doc.id,
            ...data,
            name: userData.name || 'Unknown',
            email: userData.email || 'No Email',
            role: userData.role || 'user'
          };
        });
        setWallets(walletsList);
      } else if (activeTab === 'transactions') {
        const transSnap = await getDocs(query(collection(db, 'ledger'), orderBy('created_at', 'desc'), limit(100)));
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersMap = new Map();
        usersSnap.docs.forEach(d => usersMap.set(d.id, d.data()));

        const transList = transSnap.docs.map(doc => {
          const data = doc.data();
          const userData = usersMap.get(data.user_id) || {};
          return {
            transaction_id: doc.id,
            ...data,
            name: userData.name || 'Unknown',
            email: userData.email || 'No Email'
          };
        });
        setTransactions(transList);
      } else if (activeTab === 'analytics') {
        // Simple client-side analytics since we're serverless
        const transSnap = await getDocs(collection(db, 'ledger'));
        const transactions = transSnap.docs.map(d => d.data());
        
        const totalRevenue = transactions
          .filter(t => t.type === 'debit' && t.status === 'completed')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
          
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const totalWalletBalance = walletsSnap.docs.reduce((sum, d) => sum + (d.data().balance || 0), 0);
        
        setAnalytics({
          totalRevenue,
          totalWalletBalance,
          dailyTransactions: transactions.filter(t => {
            const date = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at);
            return date.toDateString() === new Date().toDateString();
          }).length,
          topPayingUsers: [] // Would need more complex grouping
        });
      }
    } catch (err: any) {
      console.error('Error fetching admin wallet data:', err);
      handleFirestoreError(err, OperationType.LIST, activeTab);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !adjustAmount) return;

    setIsAdjusting(true);
    try {
      const amount = parseFloat(adjustAmount);
      const type = adjustType === 'add' ? 'credit' : 'debit';
      
      // 1. Log in ledger
      await addDoc(collection(db, 'ledger'), {
        user_id: selectedWallet.user_id,
        amount: type === 'credit' ? amount : -amount,
        type,
        description: adjustDescription || `Admin manual ${adjustType}`,
        status: 'completed',
        created_at: serverTimestamp()
      });

      // 2. Update wallet
      const walletRef = doc(db, 'wallets', selectedWallet.wallet_id);
      const newBalance = type === 'credit' 
        ? (selectedWallet.balance || 0) + amount 
        : (selectedWallet.balance || 0) - amount;
        
      await updateDoc(walletRef, {
        balance: newBalance,
        updated_at: serverTimestamp()
      });

      setMessage({ type: 'success', text: 'Balance adjusted successfully' });
      setShowAdjustModal(false);
      fetchData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `wallets/${selectedWallet.wallet_id}`);
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredWallets = wallets.filter(w => 
    w.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.transaction_id?.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Wallet Management</h1>
          <p className="text-slate-500 font-medium">Monitor and manage all user wallets and transactions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchData()}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            <History size={20} />
          </button>
          <ModernButton 
            text="Export Report" 
            icon={Download} 
            onClick={() => {}}
            gradient="blue-gradient"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'wallets', label: 'All Wallets', icon: Wallet },
          { id: 'transactions', label: 'Transactions', icon: History },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      {activeTab !== 'analytics' && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all">
            <Filter size={20} /> Filter
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-slate-500 font-bold">Loading data...</p>
        </div>
      ) : (
        <>
          {activeTab === 'wallets' && (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-bottom border-slate-200">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWallets.map((wallet) => (
                      <tr key={wallet.wallet_id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                              {wallet.name?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{wallet.name}</p>
                              <p className="text-xs text-slate-500">{wallet.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            wallet.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                            wallet.role === 'staff' ? 'bg-blue-100 text-blue-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {wallet.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          ₹{(wallet.balance || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {safeFormat(wallet.updated_at, 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setSelectedWallet(wallet);
                              setShowAdjustModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Adjust Balance"
                          >
                            <CreditCard size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-bottom border-slate-200">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.transaction_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">#{tx.transaction_id}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{tx.name}</p>
                          <p className="text-xs text-slate-500">{tx.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1 font-black text-xs uppercase tracking-wider ${
                            tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'credit' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            {tx.type}
                          </div>
                        </td>
                        <td className={`px-6 py-4 font-black ${
                          tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            tx.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                            tx.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {safeFormat(tx.created_at, 'MMM dd, HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Revenue', value: `₹${(analytics.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'emerald' },
                  { label: 'Total Wallet Balance', value: `₹${(analytics.totalWalletBalance || 0).toLocaleString()}`, icon: Wallet, color: 'blue' },
                  { label: 'Daily Transactions', value: analytics.dailyTransactions || 0, icon: History, color: 'amber' },
                  { label: 'Active Users', value: (analytics.topPayingUsers || []).length, icon: Users, color: 'purple' },
                ].map((stat, i) => (
                  <div key={`stat-${i}`} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <div className={`w-12 h-12 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl flex items-center justify-center mb-4`}>
                      <stat.icon size={24} />
                    </div>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Top Users */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6">Top Paying Users</h3>
                <div className="space-y-6">
                  {(analytics.topPayingUsers || []).map((user: any, i: number) => (
                    <div key={`user-${user.user_id || i}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-900">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Total Spent</p>
                        <p className="text-lg font-black text-blue-600">₹{(user.total_spent || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && selectedWallet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Adjust Balance</h3>
                  <p className="text-sm text-slate-500 font-medium">For {selectedWallet.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdjustModal(false)}
                className="p-2 hover:bg-white rounded-xl text-slate-400 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="p-8 space-y-6">
              <div className="flex p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${
                    adjustType === 'add' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Plus size={18} /> Add
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${
                    adjustType === 'deduct' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Minus size={18} /> Deduct
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 uppercase tracking-wider">Amount (₹)</label>
                <input 
                  type="number" 
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 uppercase tracking-wider">Description</label>
                <textarea 
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="Reason for adjustment..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium min-h-[100px]"
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  This action will immediately update the user's wallet balance and record a manual transaction in their history.
                </p>
              </div>

              <ModernButton 
                text={isAdjusting ? 'Processing...' : `Confirm ${adjustType === 'add' ? 'Addition' : 'Deduction'}`}
                icon={adjustType === 'add' ? Plus : Minus}
                type="submit"
                loading={isAdjusting}
                disabled={isAdjusting}
                gradient={adjustType === 'add' ? 'emerald-gradient' : 'red-gradient'}
                className="w-full"
              />
            </form>
          </div>
        </div>
      )}

      {/* Success/Error Message */}
      {message && (
        <div className="fixed bottom-8 right-8 z-[70] animate-in slide-in-from-right-4 duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <p className="font-bold">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-4 p-1 hover:bg-white/50 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWalletManagement;
