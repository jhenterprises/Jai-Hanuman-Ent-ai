import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, Tv, Search, IndianRupee, Clock, 
  ArrowRight, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, ArrowLeft, History as HistoryIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../../context/WalletContext';
import GlassCard from '../../components/GlassCard';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const OPERATORS = {
  mobile: [
    { id: 'jio', name: 'Jio', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Reliance_Jio_Logo.svg' },
    { id: 'airtel', name: 'Airtel', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Airtel_logo.svg' },
    { id: 'vi', name: 'VI', icon: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0b/Vi_logo.svg/1200px-Vi_logo.svg.png' },
    { id: 'bsnl', name: 'BSNL', icon: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/BSNL_logo.svg/1200px-BSNL_logo.svg.png' },
    { id: 'mtnl', name: 'MTNL', icon: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/MTNL_Logo.svg/1200px-MTNL_Logo.svg.png' },
  ],
  dth: [
    { id: 'tata_play', name: 'Tata Play', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Tata_Play_Logo.svg/2560px-Tata_Play_Logo.svg.png' },
    { id: 'airtel_dth', name: 'Airtel Digital TV', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Airtel_logo.svg' },
    { id: 'dish_tv', name: 'Dish TV', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Dish_TV_logo.svg/1200px-Dish_TV_logo.svg.png' },
    { id: 'videocon', name: 'Videocon d2h', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Videocon_d2h_logo.png' },
    { id: 'sun_direct', name: 'Sun Direct', icon: 'https://upload.wikimedia.org/wikipedia/en/e/ed/SUN_Direct_Logo.jpg' },
    { id: 'dth_nepal', name: 'DTH Nepal', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/No_image_available.svg/2048px-No_image_available.svg.png' },
  ]
};

const Recharge = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { balance, deductBalance } = useWallet();
  const [activeTab, setActiveTab] = useState<'mobile' | 'dth'>(params.get('type') === 'dth' ? 'dth' : 'mobile');
  
  const [mobile, setMobile] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [operator, setOperator] = useState('');
  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(
        collection(db, 'financial_transactions'),
        where('userId', '==', user.uid),
        where('type', '==', 'recharge'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    
    if (numAmount > balance) {
      setTxStatus('error');
      setErrorMessage('Insufficient wallet balance. Please add funds.');
      return;
    }

    setTxStatus('processing');
    setErrorMessage('');

    try {
      // Simulate "Processing" state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTxStatus('confirming');
      
      // Simulate API call to backend
      const response = await fetch('/api/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          number: activeTab === 'mobile' ? mobile : customerId,
          operator,
          amount: numAmount
        })
      }).then(r => r.json());

      if (response.success) {
        await deductBalance(numAmount, `${activeTab === 'mobile' ? 'Mobile' : 'DTH'} Recharge for ${activeTab === 'mobile' ? mobile : customerId}`, {
          type: 'recharge',
          status: 'success',
          operator,
          number: activeTab === 'mobile' ? mobile : customerId,
          refNo: response.refNo || `REC${Date.now()}`
        });

        setTxStatus('success');
        setMobile('');
        setCustomerId('');
        setAmount('');
        setOperator('');
        fetchHistory();
        
        // Hide success message after 5 seconds
        setTimeout(() => setTxStatus('idle'), 5000);
      } else {
        throw new Error(response.message || 'Recharge failed at operator end.');
      }
    } catch (err: any) {
      setTxStatus('error');
      setErrorMessage(err.message || 'Transaction failed. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/financial/hub')}
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white">{activeTab === 'mobile' ? 'Mobile' : 'DTH'} <span className="text-blue-500">Recharge</span></h1>
            <p className="text-slate-500">Fast and secure recharges for all operators.</p>
          </div>
        </div>
        <div className="glass px-6 py-3 rounded-2xl border-white/5">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Wallet Balance</p>
           <p className="text-xl font-black text-white">₹{balance.toLocaleString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 w-fit">
            <button 
              onClick={() => setActiveTab('mobile')}
              className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'mobile' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <Smartphone size={16} /> Mobile
            </button>
            <button 
              onClick={() => setActiveTab('dth')}
              className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'dth' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <Tv size={16} /> DTH
            </button>
          </div>

          <GlassCard className="p-8 border-white/5 shadow-2xl">
            <form onSubmit={handleRecharge} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    {activeTab === 'mobile' ? 'Mobile Number' : 'Customer ID'}
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                      {activeTab === 'mobile' ? <Smartphone size={20} /> : <Tv size={20} />}
                    </div>
                    <input 
                      type="text"
                      required
                      placeholder={activeTab === 'mobile' ? "Enter 10 digit number" : "Enter customer/VC number"}
                      value={activeTab === 'mobile' ? mobile : customerId}
                      onChange={(e) => activeTab === 'mobile' ? setMobile(e.target.value) : setCustomerId(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-lg focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Operator</label>
                  <select 
                    required
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold text-lg focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Operator</option>
                    {OPERATORS[activeTab].map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Enter Amount</label>
                  <div className="relative group">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                      type="number"
                      required
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-lg focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3 flex flex-col justify-end">
                   <div className="grid grid-cols-3 gap-2">
                     {[199, 299, 666].map(val => (
                       <button 
                         key={val}
                         type="button"
                         onClick={() => setAmount(val.toString())}
                         className="py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs border border-white/5 transition-all"
                       >
                         ₹{val}
                       </button>
                     ))}
                   </div>
                </div>
              </div>

              {txStatus !== 'idle' && (
                <div className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                  txStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  txStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {txStatus === 'success' && <CheckCircle2 size={18} className="animate-bounce" />}
                  {txStatus === 'error' && <AlertCircle size={18} />}
                  {(txStatus === 'processing' || txStatus === 'confirming') && <Loader2 size={18} className="animate-spin" />}
                  <span className="text-sm font-medium">
                    {txStatus === 'processing' && 'Processing transaction details...'}
                    {txStatus === 'confirming' && 'Awaiting operator confirmation...'}
                    {txStatus === 'success' && 'Recharge successful! Funds deducted.'}
                    {txStatus === 'error' && (errorMessage || 'Transaction failed.')}
                  </span>
                </div>
              )}

              <button 
                type="submit"
                disabled={txStatus === 'processing' || txStatus === 'confirming' || !amount || !operator || (activeTab === 'mobile' ? !mobile : !customerId)}
                className="w-full py-5 blue-gradient text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale"
              >
                {(txStatus === 'processing' || txStatus === 'confirming') ? <Loader2 className="animate-spin" /> : <IndianRupee size={20} />}
                {txStatus === 'processing' ? 'Processing...' : txStatus === 'confirming' ? 'Confirming...' : 'Recharge Now'}
              </button>
            </form>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <HistoryIcon className="text-blue-400" size={18} />
              <h3 className="font-black text-white uppercase tracking-widest text-xs">Recent Transactions</h3>
            </div>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-center py-8 text-slate-600 text-sm italic">No recent recharges</p>
              ) : (
                history.map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        {tx.details?.number?.length > 10 ? <Tv size={14} /> : <Smartphone size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{tx.operator?.toUpperCase()} - {tx.number}</p>
                        <p className="text-[10px] text-slate-500">{new Date(tx.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-white">₹{tx.amount}</p>
                       <p className={`text-[9px] font-bold uppercase tracking-tighter ${tx.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{tx.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4">
            <h3 className="font-black text-white uppercase tracking-widest text-xs">Select Provider</h3>
            <div className="grid grid-cols-2 gap-3">
              {OPERATORS[activeTab].map(op => (
                <button 
                  key={op.id}
                  onClick={() => setOperator(op.id)}
                  className={`p-4 rounded-2xl bg-slate-950/50 border transition-all flex flex-col items-center gap-2 ${operator === op.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:border-white/20'}`}
                >
                  <img src={op.icon} alt={op.name} className="h-8 w-auto object-contain" />
                  <span className="text-[10px] font-black text-slate-300 group-hover:text-white uppercase tracking-widest">{op.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recharge;
