import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Droplets, Flame, Wifi, Search, 
  IndianRupee, Clock, ArrowRight, CheckCircle2, 
  AlertCircle, Loader2, CreditCard, ArrowLeft,
  Calendar, User
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../../context/WalletContext';
import GlassCard from '../../components/GlassCard';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const CATEGORIES = [
  { id: 'electricity', name: 'Electricity', icon: <Zap /> },
  { id: 'water', name: 'Water', icon: <Droplets /> },
  { id: 'gas', name: 'Gas', icon: <Flame /> },
  { id: 'broadband', name: 'Broadband', icon: <Wifi /> },
];

const BillPay = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { balance, deductBalance } = useWallet();
  const [activeCat, setActiveCat] = useState(params.get('cat') || 'electricity');
  
  const [consumerId, setConsumerId] = useState('');
  const [provider, setProvider] = useState('');
  const [bill, setBill] = useState<any>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, [activeCat]);

  const fetchHistory = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(
        collection(db, 'financial_transactions'),
        where('userId', '==', user.uid),
        where('type', '==', 'bill_pay'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const fetchBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxStatus('processing');
    setErrorMessage('');
    setBill(null);

    try {
      const response = await fetch('/api/bill-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: activeCat, consumerId, provider })
      }).then(r => r.json());

      if (response.success) {
        setBill(response);
        setTxStatus('idle');
      } else {
        throw new Error(response.message || 'Unable to fetch bill details.');
      }
    } catch (err: any) {
      setTxStatus('error');
      setErrorMessage(err.message || 'Error fetching bill details.');
    }
  };

  const handlePay = async () => {
    if (!bill) return;
    if (bill.billAmount > balance) {
      setTxStatus('error');
      setErrorMessage('Insufficient wallet balance.');
      return;
    }

    setTxStatus('processing');
    setErrorMessage('');
    try {
      await new Promise(r => setTimeout(r, 1200));
      setTxStatus('confirming');
      
      const response = await fetch('/api/bill-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: bill.billId, amount: bill.billAmount })
      }).then(r => r.json());

      if (response.success) {
        await deductBalance(bill.billAmount, `${activeCat.toUpperCase()} Bill Payment for ${consumerId}`, {
          type: 'bill_pay',
          status: 'success',
          category: activeCat,
          consumerId,
          billId: bill.billId,
          refNo: response.refNo
        });

        setTxStatus('success');
        setBill(null);
        setConsumerId('');
        fetchHistory();
        
        setTimeout(() => setTxStatus('idle'), 5000);
      } else {
        throw new Error(response.message || 'Payment failed.');
      }
    } catch (err: any) {
      setTxStatus('error');
      setErrorMessage(err.message || 'Transaction failed.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/app/financial/hub')} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white">Bill <span className="text-amber-500">Payments</span></h1>
            <p className="text-slate-500">Fast and secure utility bill payments via BBPS.</p>
          </div>
        </div>
        <div className="glass px-6 py-3 rounded-2xl border-white/5">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Wallet Balance</p>
           <p className="text-xl font-black text-white">₹{balance.toLocaleString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
           <h3 className="font-black text-white uppercase tracking-widest text-xs px-2">Categories</h3>
           <div className="grid gap-2">
             {CATEGORIES.map(cat => (
               <button 
                 key={cat.id}
                 onClick={() => { setActiveCat(cat.id); setBill(null); setTxStatus('idle'); }}
                 className={`p-4 rounded-2xl flex items-center gap-4 transition-all border ${activeCat === cat.id ? 'bg-amber-600 text-white border-amber-500 shadow-xl shadow-amber-600/20' : 'bg-slate-900/50 text-slate-400 border-white/5 hover:border-white/20'}`}
               >
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeCat === cat.id ? 'bg-white/20' : 'bg-white/5'}`}>
                   {cat.icon}
                 </div>
                 <span className="font-bold">{cat.name}</span>
               </button>
             ))}
           </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <GlassCard className="p-8 border-white/5">
            {!bill ? (
              <form onSubmit={fetchBill} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Consumer Number</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                      <input 
                        type="text" required placeholder="Enter consumer ID"
                        value={consumerId} onChange={e => setConsumerId(e.target.value)}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Board / Provider</label>
                    <select 
                      required value={provider} onChange={e => setProvider(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold h-14 appearance-none cursor-pointer"
                    >
                      <option value="">Select Provider</option>
                      {activeCat === 'electricity' && (
                        <>
                          <option value="bescom">BESCOM - Bangalore</option>
                          <option value="msedcl">Mahavitaran (MSEDCL)</option>
                          <option value="tpddl">Tata Power DDL - Delhi</option>
                          <option value="apspcl">APSPCL (Andhra Pradesh)</option>
                          <option value="uppcl">UPPCL (Uttar Pradesh)</option>
                          <option value="cesc">CESC - West Bengal</option>
                          <option value="tangedco">TANGEDCO - Tamil Nadu</option>
                        </>
                      )}
                      {activeCat === 'water' && (
                        <>
                          <option value="djb">Delhi Jal Board</option>
                          <option value="bwssb">BWSSB - Bangalore</option>
                          <option value="mcgm">MCGM - Mumbai</option>
                          <option value="hmws">HMWS&SB - Hyderabad</option>
                        </>
                      )}
                      {activeCat === 'gas' && (
                        <>
                          <option value="igl">Indraprastha Gas (IGL)</option>
                          <option value="mgl">Mahanagar Gas (MGL)</option>
                          <option value="adani">Adani Gas</option>
                          <option value="hpcl">HP Gas (LPG)</option>
                        </>
                      )}
                      {activeCat === 'broadband' && (
                        <>
                          <option value="airtel">Airtel Xstream Fiber</option>
                          <option value="jio">JioFiber</option>
                          <option value="act">ACT Fibernet</option>
                          <option value="bsnl">BSNL Broadband</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" disabled={txStatus === 'processing' || !consumerId || !provider}
                  className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                  {txStatus === 'processing' ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                  {txStatus === 'processing' ? 'Fetching Bill Details...' : 'Fetch Bill'}
                </button>
              </form>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                 <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex gap-4">
                       <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                          <User size={28} />
                       </div>
                       <div>
                          <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Customer Name</p>
                          <h3 className="text-2xl font-black text-white">{bill.customerName}</h3>
                          <p className="text-xs text-slate-400">Bill ID: {bill.billId}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Amount Due</p>
                       <h3 className="text-3xl font-black text-emerald-400">₹{bill.billAmount.toLocaleString()}</h3>
                       <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-1">
                         <Calendar size={12} /> Due Date: {bill.dueDate}
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => setBill(null)}
                      className="flex-1 py-4 glass text-white font-bold rounded-2xl hover:bg-white/5 transition-all"
                    >
                      Change Details
                    </button>
                    <button 
                      onClick={handlePay} disabled={txStatus === 'processing' || txStatus === 'confirming'}
                      className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {(txStatus === 'processing' || txStatus === 'confirming') ? <Loader2 className="animate-spin" /> : <CreditCard size={20} />}
                      {txStatus === 'processing' ? 'Processing...' : txStatus === 'confirming' ? 'Sending...' : 'Pay Bill Now'}
                    </button>
                 </div>
              </motion.div>
            )}

            {txStatus !== 'idle' && (
              <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 transition-all ${
                txStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                txStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}>
                {txStatus === 'success' ? <CheckCircle2 size={18} /> : txStatus === 'error' ? <AlertCircle size={18} /> : <Loader2 size={18} className="animate-spin" />}
                <span className="text-sm font-medium">
                   {txStatus === 'processing' && 'Fetching data from biller...'}
                   {txStatus === 'confirming' && 'Confirming payment with BBPS...'}
                   {txStatus === 'success' && 'Bill payment successful! Receipt ID: ' + Date.now()}
                   {txStatus === 'error' && (errorMessage || 'Payment failed.')}
                </span>
              </div>
            )}
          </GlassCard>

          <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Clock className="text-amber-500" size={20} />
                   <h3 className="font-black text-white uppercase tracking-widest text-xs">Recent Payments</h3>
                </div>
             </div>
             <div className="grid gap-3">
                {history.length === 0 ? (
                  <p className="text-center py-8 text-slate-600 text-sm italic">No recent payments</p>
                ) : (
                  history.map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-amber-500/30 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                             <Zap size={18} />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white">{tx.consumerId}</p>
                             <p className="text-[10px] text-slate-500">{new Date(tx.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-white">₹{tx.amount}</p>
                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">SUCCESS</p>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPay;
