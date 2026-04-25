import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, History, CreditCard, IndianRupee, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { safeFormat } from '../utils/dateUtils';
import { getRazorpayKey } from '../utils/razorpayUtils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_id: string;
  status: string;
  created_at: string;
}

interface WalletData {
  balance: number;
}

const Wallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      // Fetch balance from Firestore
      if (user?.uid) {
        const walletSnap = await getDocs(query(collection(db, 'wallets'), where('user_id', '==', user.uid)));
        if (!walletSnap.empty) {
          setWallet({ balance: walletSnap.docs[0].data().balance || 0 });
        }
      }

      // Fetch transactions from API
      try {
        const transRes = await api.get('/wallet/transactions');
        setTransactions(transRes.data);
      } catch (transErr: any) {
        console.error('Failed to fetch transactions:', transErr);
        if (transErr.message?.includes('HTML')) {
          // Silent fail
        }
      }
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setProcessing(true);
    try {
      const res = await api.post('/wallet/add-money', { amount: numAmount });
      const order = res.data;

      const options = {
        key: getRazorpayKey(),
        amount: order.amount,
        currency: order.currency,
        name: 'Digital Services Portal',
        description: 'Add money to wallet',
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await api.post('/wallet/verify-payment', {
              ...response,
              amount: numAmount
            });
            setMessage({ type: 'success', text: 'Money added successfully!' });
            setShowAddMoney(false);
            setAmount('');
            fetchWalletData();
          } catch (err) {
            setMessage({ type: 'error', text: 'Payment verification failed' });
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#3b82f6',
        },
      };

      if (!(window as any).Razorpay) {
        setMessage({ type: 'error', text: 'Razorpay SDK failed to load. Please check your internet connection.' });
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Add money failed:', err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || 'Failed to initiate payment';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setProcessing(false);
    }
  };

  const totalCredits = transactions
    .filter(t => t.type === 'credit' && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit' && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">My Wallet</h1>
          <p className="text-slate-400">Manage your balance and view transactions</p>
        </div>
        <button
          onClick={() => setShowAddMoney(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 blue-gradient text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Add Money
        </button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </motion.div>
      )}

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ y: -5 }}
          className="glass p-8 rounded-[2.5rem] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
          <div className="relative space-y-4">
            <div className="w-12 h-12 blue-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <WalletIcon className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Current Balance</p>
              <h2 className="text-4xl font-black text-white flex items-center gap-1">
                <IndianRupee size={28} className="text-blue-500" />
                {(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="glass p-8 rounded-[2.5rem] relative overflow-hidden group"
        >
          <div className="relative space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Credits</p>
              <h2 className="text-3xl font-black text-white flex items-center gap-1">
                <IndianRupee size={24} className="text-emerald-400" />
                {(totalCredits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="glass p-8 rounded-[2.5rem] relative overflow-hidden group"
        >
          <div className="relative space-y-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
              <TrendingDown className="text-red-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Debits</p>
              <h2 className="text-3xl font-black text-white flex items-center gap-1">
                <IndianRupee size={24} className="text-red-400" />
                {(totalDebits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Transaction History */}
      <div className="glass rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <History className="text-slate-400" size={20} />
            </div>
            <h3 className="text-xl font-black text-white">Transaction History</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Transaction ID</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Date</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Description</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Amount</th>
                <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-4">
                      <span className="text-sm font-mono text-slate-400">#{t.id.toString().padStart(6, '0')}</span>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-sm text-slate-300">{safeFormat(t.created_at, 'dd MMM yyyy, hh:mm a')}</span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          t.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {t.type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <span className="text-sm text-white font-medium">{t.description}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`text-sm font-bold ${
                        t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {t.type === 'credit' ? '+' : '-'} ₹{(t.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        t.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        t.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass max-w-md w-full p-8 rounded-[2.5rem] relative"
          >
            <button
              onClick={() => setShowAddMoney(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <AlertCircle size={24} className="rotate-45" />
            </button>

            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 blue-gradient rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
                <CreditCard className="text-white" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Add Money</h3>
                <p className="text-slate-400">Enter amount to add to your wallet</p>
              </div>
            </div>

            <form onSubmit={handleAddMoney} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Amount (INR)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-xl font-bold focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className="py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/5 transition-colors"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={processing || !amount}
                className="w-full py-4 blue-gradient text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Proceed to Pay'}
              </button>

              <div className="flex items-center justify-center gap-4 opacity-50 grayscale">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" alt="UPI" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-4" />
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
