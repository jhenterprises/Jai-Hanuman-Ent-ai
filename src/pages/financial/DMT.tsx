import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, UserPlus, CreditCard, Landmark, 
  ArrowRight, CheckCircle2, AlertCircle, 
  Loader2, ArrowLeft, History as HistoryIcon, Search,
  ShieldCheck, Smartphone, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../../context/WalletContext';
import GlassCard from '../../components/GlassCard';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';

const DMT = () => {
  const navigate = useNavigate();
  const { balance, deductBalance } = useWallet();
  const [activeStep, setActiveStep] = useState<'beneficiaries' | 'transfer' | 'add'>('beneficiaries');
  
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [selectedBene, setSelectedBene] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [transferMode, setTransferMode] = useState('IMPS');
  
  const [newBene, setNewBene] = useState({ name: '', accountNumber: '', ifsc: '', bank: '', phone: '' });
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const fetchBeneficiaries = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, 'beneficiaries'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setBeneficiaries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching beneficiaries:", err);
    }
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxStatus('processing');
    setErrorMessage('');
    const user = auth.currentUser;
    try {
        // Simulation verification
        const check = await fetch('/api/dmt-verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ accountNumber: newBene.accountNumber, ifsc: newBene.ifsc })
        }).then(r => r.json());

        if (check.success) {
            await addDoc(collection(db, 'beneficiaries'), {
                ...newBene,
                name: check.accountHolderName, // Use verified name
                userId: user?.uid,
                createdAt: serverTimestamp()
            });
            setTxStatus('success');
            setNewBene({ name: '', accountNumber: '', ifsc: '', bank: '', phone: '' });
            setTimeout(() => {
              setActiveStep('beneficiaries');
              setTxStatus('idle');
            }, 1500);
            fetchBeneficiaries();
        } else {
          throw new Error('Could not verify account.');
        }
    } catch (err) {
        setTxStatus('error');
        setErrorMessage('Verification failed. Please check details.');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount > balance) {
        setTxStatus('error');
        setErrorMessage('Insufficient wallet balance.');
        return;
    }

    setTxStatus('processing');
    setErrorMessage('');
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTxStatus('confirming');

        const response = await fetch('/api/dmt-transfer', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ amount: numAmount, beneficiaryName: selectedBene.name, mode: transferMode })
        }).then(r => r.json());

        if (response.success) {
            await deductBalance(numAmount, `DMT to ${selectedBene.name} (${selectedBene.accountNumber})`, {
                type: 'dmt',
                status: 'success',
                mode: transferMode,
                beneficiaryId: selectedBene.id,
                refNo: response.refNo
            });
            setTxStatus('success');
            setTimeout(() => {
              setActiveStep('beneficiaries');
              setTxStatus('idle');
              setAmount('');
              setSelectedBene(null);
            }, 2000);
        } else {
          throw new Error(response.message || 'Transfer failed.');
        }
    } catch (err: any) {
        setTxStatus('error');
        setErrorMessage(err.message || 'Transfer failed.');
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
            <h1 className="text-3xl font-black text-white">Money <span className="text-emerald-500">Transfer</span></h1>
            <p className="text-slate-500">Send money instantly to any bank account in India.</p>
          </div>
        </div>
        <div className="glass px-6 py-3 rounded-2xl border-white/5">
           <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Available Limit</p>
           <p className="text-xl font-black text-white">₹{balance.toLocaleString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {activeStep === 'beneficiaries' && (
             <GlassCard className="p-8 border-white/5">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-black text-white">My Beneficiaries</h3>
                   <button 
                     onClick={() => setActiveStep('add')}
                     className="px-4 py-2 bg-emerald-600/10 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                   >
                     <UserPlus size={16} /> Add Beneficiary
                   </button>
                </div>

                <div className="grid gap-4">
                   {beneficiaries.length === 0 ? (
                     <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                        <UserPlus size={40} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-500 text-sm">Add your first beneficiary to start transfers</p>
                     </div>
                   ) : (
                     beneficiaries.map(bene => (
                       <button 
                         key={bene.id}
                         onClick={() => { setSelectedBene(bene); setActiveStep('transfer'); }}
                         className="flex items-center justify-between p-6 bg-slate-900/50 border border-white/5 rounded-3xl hover:border-emerald-500/30 transition-all group"
                       >
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                               <Landmark size={24} />
                            </div>
                            <div className="text-left">
                               <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{bene.name}</h4>
                               <p className="text-xs text-slate-500 font-mono">{bene.bank} • {bene.accountNumber}</p>
                            </div>
                         </div>
                         <ArrowRight size={20} className="text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                       </button>
                     ))
                   )}
                </div>
             </GlassCard>
           )}

           {activeStep === 'add' && (
             <GlassCard className="p-8 border-white/5">
                <div className="flex items-center gap-3 mb-8">
                   <button onClick={() => setActiveStep('beneficiaries')} className="text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
                   <h3 className="text-xl font-black text-white">Add New Beneficiary</h3>
                </div>
                <form onSubmit={handleAddBeneficiary} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                         <input 
                           type="text" required placeholder="Enter bank account number"
                           value={newBene.accountNumber} onChange={e => setNewBene({...newBene, accountNumber: e.target.value})}
                           className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold h-14"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                         <input 
                           type="text" required placeholder="e.g. SBIN0001234"
                           value={newBene.ifsc} onChange={e => setNewBene({...newBene, ifsc: e.target.value})}
                           className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold h-14"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                         <select 
                           required value={newBene.bank} onChange={e => setNewBene({...newBene, bank: e.target.value})}
                           className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold h-14 appearance-none"
                         >
                            <option value="">Select Bank</option>
                            <option value="SBI">State Bank of India</option>
                            <option value="HDFC">HDFC Bank</option>
                            <option value="ICICI">ICICI Bank</option>
                            <option value="AXIS">Axis Bank</option>
                            <option value="KOTAK">Kotak Mahindra Bank</option>
                            <option value="PNB">Punjab National Bank</option>
                            <option value="BOB">Bank of Baroda</option>
                            <option value="CANARA">Canara Bank</option>
                            <option value="UNION">Union Bank of India</option>
                            <option value="IDBI">IDBI Bank</option>
                            <option value="INDUSIND">IndusInd Bank</option>
                            <option value="YES">YES Bank</option>
                            <option value="BOI">Bank of India</option>
                            <option value="CBI">Central Bank of India</option>
                            <option value="IOB">Indian Overseas Bank</option>
                            <option value="BANDHAN">Bandhan Bank</option>
                            <option value="IDFC">IDFC First Bank</option>
                            <option value="UCO">UCO Bank</option>
                            <option value="BOM">Bank of Maharashtra</option>
                            <option value="FEDERAL">Federal Bank</option>
                            <option value="SOUTH">South Indian Bank</option>
                            <option value="KARNATAKA">Karnataka Bank</option>
                            <option value="RBL">RBL Bank</option>
                            <option value="HSBC">HSBC Bank</option>
                            <option value="STANDARD">Standard Chartered</option>
                            <option value="IPPB">India Post Payments Bank (IPPB)</option>
                            <option value="AIRTEL">Airtel Payments Bank</option>
                            <option value="PAYTM">Paytm Payments Bank</option>
                            <option value="JIO">Jio Payments Bank</option>
                            <option value="AU">AU Small Finance Bank</option>
                            <option value="EQUITS">Equitas Small Finance Bank</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                         <input 
                           type="text" required placeholder="Receiver's mobile"
                           value={newBene.phone} onChange={e => setNewBene({...newBene, phone: e.target.value})}
                           className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold h-14"
                         />
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
                         {txStatus === 'processing' && 'Verifying account with bank...'}
                         {txStatus === 'confirming' && 'Registering beneficiary...'}
                         {txStatus === 'success' && 'Beneficiary added! Loading list...'}
                         {txStatus === 'error' && (errorMessage || 'Verification failed.')}
                       </span>
                     </div>
                   )}
                   <button 
                     type="submit" disabled={txStatus === 'processing' || txStatus === 'confirming'}
                     className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                   >
                     {(txStatus === 'processing' || txStatus === 'confirming') ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                     {txStatus === 'processing' ? 'Verifying...' : txStatus === 'confirming' ? 'Finalizing...' : 'Verify & Add Beneficiary'}
                   </button>
                </form>
             </GlassCard>
           )}

           {activeStep === 'transfer' && selectedBene && (
             <GlassCard className="p-8 border-white/5">
                <div className="flex items-center gap-3 mb-8">
                   <button onClick={() => setActiveStep('beneficiaries')} className="text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
                   <h3 className="text-xl font-black text-white">Transfer Money</h3>
                </div>

                <div className="p-6 bg-emerald-600/5 border border-emerald-500/10 rounded-3xl mb-8 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                         <Landmark size={28} />
                      </div>
                      <div>
                         <h4 className="text-2xl font-black text-white leading-tight">{selectedBene.name}</h4>
                         <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">{selectedBene.bank} • {selectedBene.accountNumber}</p>
                      </div>
                   </div>
                   <div className="hidden md:block">
                      <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest text-right">IFSC</p>
                      <p className="text-white font-bold font-mono">{selectedBene.ifsc}</p>
                   </div>
                </div>

                <form onSubmit={handleTransfer} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Amount to Transfer</label>
                         <div className="relative group">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                            <input 
                              type="number" required placeholder="0.00"
                              value={amount} onChange={e => setAmount(e.target.value)}
                              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-white text-2xl font-black h-16 focus:border-emerald-500 transition-all outline-none"
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Transfer Mode</label>
                         <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-white/10 h-16">
                            <button 
                              type="button" 
                              onClick={() => setTransferMode('IMPS')}
                              className={`flex-1 rounded-[1.25rem] text-sm font-black transition-all ${transferMode === 'IMPS' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                              IMPS (Instant)
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setTransferMode('NEFT')}
                              className={`flex-1 rounded-[1.25rem] text-sm font-black transition-all ${transferMode === 'NEFT' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                              NEFT (2-4 hrs)
                            </button>
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
                          {txStatus === 'processing' && 'Initiating secure tunnel...'}
                          {txStatus === 'confirming' && 'Awaiting bank internal confirmation...'}
                          {txStatus === 'success' && 'Transfer complete! Updating wallet...'}
                          {txStatus === 'error' && (errorMessage || 'Transaction failed.')}
                        </span>
                      </div>
                    )}

                   <button 
                     type="submit" disabled={txStatus === 'processing' || txStatus === 'confirming' || !amount}
                     className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                   >
                     {(txStatus === 'processing' || txStatus === 'confirming') ? <Loader2 className="animate-spin" /> : <Send size={22} />}
                     {txStatus === 'processing' ? 'Processing...' : txStatus === 'confirming' ? 'Sending...' : `Transfer ₹${parseFloat(amount || '0').toLocaleString()} Now`}
                   </button>
                </form>
             </GlassCard>
           )}
        </div>

        <div className="space-y-6">
           <GlassCard className="p-8 border-white/5 bg-blue-600/5">
              <h3 className="font-black text-white uppercase tracking-widest text-xs mb-4">Quick Tips</h3>
              <div className="space-y-4">
                 <div className="flex gap-4">
                    <ShieldCheck className="text-blue-400 shrink-0" size={20} />
                    <p className="text-xs text-slate-400 leading-relaxed">Always verify the account holder name before initiating large transfers.</p>
                 </div>
                 <div className="flex gap-4">
                    <Clock className="text-amber-400 shrink-0" size={20} />
                    <p className="text-xs text-slate-400 leading-relaxed">IMPS is available 24/7/365. NEFT follows bank working hours.</p>
                 </div>
                 <div className="flex gap-4">
                    <Smartphone className="text-purple-400 shrink-0" size={20} />
                    <p className="text-xs text-slate-400 leading-relaxed">Daily transfer limit is ₹25,000 per sender for DMT.</p>
                 </div>
              </div>
           </GlassCard>

           <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
              <div className="flex items-center gap-3">
                 <HistoryIcon className="text-emerald-500" size={20} />
                 <h3 className="font-black text-white uppercase tracking-widest text-xs">Recent History</h3>
              </div>
              <div className="text-center py-8">
                 <p className="text-xs text-slate-600 italic">Fetch history from financial_transactions</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DMT;
