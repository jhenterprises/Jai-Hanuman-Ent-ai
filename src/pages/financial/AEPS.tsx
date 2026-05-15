import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fingerprint, Landmark, CreditCard, ArrowRight,
  ShieldCheck, Loader2, CheckCircle2, AlertCircle,
  Smartphone, ArrowLeft, History, Info, Scan
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../../context/WalletContext';
import { useServiceControl } from '../../context/ServiceControlContext';
import ServiceUnavailable from '../../components/ServiceUnavailable';
import GlassCard from '../../components/GlassCard';
import { toast } from 'react-hot-toast';

const BANKS = [
  "State Bank of India", "Punjab National Bank", "Bank of Baroda",
  "Canara Bank", "Union Bank of India", "HDFC Bank", "ICICI Bank",
  "Axis Bank", "Kotak Mahindra Bank", "IndusInd Bank", "Bank of India",
  "Central Bank of India", "Indian Bank", "Indian Overseas Bank",
  "UCO Bank", "Punjab & Sind Bank", "IDBI Bank", "Yes Bank"
].sort();

const AEPS_TYPES = [
  { id: 'withdrawal', name: 'Cash Withdrawal', icon: <Landmark />, desc: 'Withdraw cash from bank account' },
  { id: 'balance', name: 'Balance Enquiry', icon: <SearchIcon />, desc: 'Check your current bank balance' },
  { id: 'statement', name: 'Mini Statement', icon: <History />, desc: 'Last 10 bank transactions' },
  { id: 'aay_pay', name: 'Aadhaar Pay', icon: <CreditCard />, desc: 'Merchant payment via Aadhaar' },
];

function SearchIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>; }

const AEPS = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { balance } = useWallet();
  const { getServiceStatus, loading: controlLoading } = useServiceControl();
  const [activeType, setActiveType] = useState(params.get('type') === 'pay' ? 'pay' : 'withdrawal');

  const aepsStatus = getServiceStatus('aeps');
  const payStatus = getServiceStatus('aadhaarPay');
  const currentStatus = activeType === 'pay' ? payStatus : aepsStatus;

  if (controlLoading) return null;
  if (currentStatus && (!currentStatus.isLive || currentStatus.maintenanceMode || currentStatus.comingSoon)) {
    return <ServiceUnavailable 
      type={currentStatus.comingSoon ? 'coming-soon' : (currentStatus.maintenanceMode ? 'maintenance' : 'disabled')} 
      serviceName={currentStatus.serviceName} 
    />;
  }
  const [aadhaar, setAadhaar] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showCapture, setShowCapture] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCapture = () => {
    setIsCapturing(true);
    setTxStatus('idle');
    setErrorMessage('');
    // Simulate fingerprint capture process
    setTimeout(() => {
      setIsCapturing(false);
      setShowCapture(false);
      processTransaction();
    }, 3000);
  };

  const processTransaction = async () => {
    setTxStatus('processing');
    try {
      // Simulation call
      await new Promise(r => setTimeout(r, 1500));
      setTxStatus('confirming');
      await new Promise(r => setTimeout(r, 2000));
      
      setTxStatus('success');
      setAadhaar('');
      setAmount('');
    } catch (err) {
      setTxStatus('error');
      setErrorMessage('Transaction failed at bank end. Server busy.');
    } finally {
      // We don't set txStatus back to idle immediately so user sees the result
      setTimeout(() => {
        if (txStatus === 'success') setTxStatus('idle');
      }, 5000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/app/financial/hub')} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white">AEPS <span className="text-blue-500">Banking</span></h1>
            <p className="text-slate-500">Aadhaar Enabled Payment System for banking at your doorstep.</p>
          </div>
        </div>
        <div className="p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
           <ShieldCheck className="text-emerald-500" size={24} />
           <div className="text-left">
              <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Security Level</p>
              <p className="text-sm font-bold text-white">Biometric Secured</p>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {AEPS_TYPES.map(type => (
            <button 
              key={type.id}
              onClick={() => { setActiveType(type.id); setTxStatus('idle'); }}
              className={`w-full p-6 rounded-3xl text-left transition-all border flex flex-col gap-4 ${activeType === type.id ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-600/20' : 'bg-slate-900/50 text-slate-400 border-white/5 hover:border-white/20'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeType === type.id ? 'bg-white/20' : 'bg-white/5'}`}>
                 {type.icon}
              </div>
              <div>
                <h3 className="font-bold">{type.name}</h3>
                <p className={`text-xs ${activeType === type.id ? 'text-white/60' : 'text-slate-600'}`}>{type.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-8">
          <GlassCard className="p-10 border-white/5 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Aadhaar Number (VID)</label>
                     <div className="relative group">
                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                          type="text" required placeholder="XXXX-XXXX-XXXX"
                          value={aadhaar} onChange={e => setAadhaar(e.target.value)}
                          className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold h-14"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Bank</label>
                     <div className="relative group">
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <select 
                          required value={bank} onChange={e => setBank(e.target.value)}
                          className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold h-14 appearance-none cursor-pointer"
                        >
                          <option value="">Choose Bank</option>
                          {BANKS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                     </div>
                  </div>

                  {activeType === 'withdrawal' && (
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Withdrawal Amount</label>
                       <div className="relative group">
                          <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                          <input 
                            type="number" required placeholder="0.00"
                            value={amount} onChange={e => setAmount(e.target.value)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black text-xl h-14"
                          />
                       </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowCapture(true)}
                    disabled={!aadhaar || !bank || (activeType === 'withdrawal' && !amount)}
                    className="w-full py-5 blue-gradient text-white font-black rounded-3xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <Scan size={24} /> Proceed to Scan Finger
                  </button>
               </div>

               <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 bg-blue-500/10 rounded-[2rem] flex items-center justify-center text-blue-400">
                     <Fingerprint size={48} />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-lg font-bold text-white">Biometric Device Connected</h4>
                     <p className="text-xs text-slate-500 leading-relaxed">Mantra MFS100 device detected. Ensure the fingerprint sensor is clean before scanning.</p>
                  </div>
                  <div className="flex gap-2">
                     <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Ready</span>
                     <span className="px-3 py-1 bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/5">V 1.0.2</span>
                  </div>
               </div>
            </div>

            {txStatus !== 'idle' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={`mt-10 p-5 rounded-2xl flex items-center gap-4 transition-all ${
                  txStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  txStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}
              >
                {txStatus === 'success' && <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" />}
                {txStatus === 'error' && <AlertCircle size={24} />}
                {(txStatus === 'processing' || txStatus === 'confirming') && <Loader2 size={24} className="animate-spin" />}
                <div>
                   <p className="font-bold text-sm">
                      {txStatus === 'processing' && 'Validating Aadhaar & Biometrics...'}
                      {txStatus === 'confirming' && 'Communication with Issuer Bank...'}
                      {txStatus === 'success' && 'Transaction Successful!'}
                      {txStatus === 'error' && 'Transaction Failed'}
                   </p>
                   <p className="text-[11px] opacity-70">
                      {txStatus === 'success' && `Receipt generated: AEPS${Date.now()}`}
                      {txStatus === 'error' && (errorMessage || 'Internal bank server error')}
                      {txStatus === 'confirming' && 'Please wait while we verify with NPCI switch.'}
                   </p>
                </div>
              </motion.div>
            )}
          </GlassCard>

          <div className="grid md:grid-cols-2 gap-6">
             <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-amber-500/5">
                <div className="flex items-center gap-3 mb-4">
                   <Info className="text-amber-500" size={20} />
                   <h3 className="font-black text-white uppercase tracking-widest text-xs">Aadhaar Security Tips</h3>
                </div>
                <ul className="space-y-3">
                   <li className="text-[11px] text-slate-400 flex gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1 shrink-0" />
                      Never share your biometrics with unauthorized individuals.
                   </li>
                   <li className="text-[11px] text-slate-400 flex gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1 shrink-0" />
                      Check the transaction amount on the screen before providing thumb impression.
                   </li>
                </ul>
             </div>
             <div className="glass p-8 rounded-[2.5rem] border-white/5">
                <h3 className="font-black text-white uppercase tracking-widest text-xs mb-4">Bank Status</h3>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-xs text-white font-bold">NPCI Gateway</span>
                   </div>
                   <span className="text-[10px] text-emerald-500 font-bold">NORMAL</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Biometric Integration Simulation Modal */}
      <AnimatePresence>
        {showCapture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass max-w-lg w-full p-12 rounded-[3.5rem] border-white/10 relative overflow-hidden"
            >
               {isCapturing && (
                 <motion.div 
                   initial={{ y: -100 }} 
                   animate={{ y: 200 }} 
                   transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                   className="absolute inset-x-0 h-1 bg-blue-500/50 blur-[30px] z-0" 
                 />
               )}

               <div className="text-center space-y-8 relative z-10">
                  <div className="w-32 h-32 bg-slate-900 rounded-[2.5rem] mx-auto flex items-center justify-center text-blue-500 border border-white/5 relative">
                     {isCapturing ? (
                       <Loader2 size={64} className="animate-spin text-blue-400" />
                     ) : (
                       <Fingerprint size={64} className="text-blue-500" />
                     )}
                     <div className="absolute inset-0 border-2 border-blue-500 rounded-[2.5rem] animate-ping opacity-20 scale-110" />
                  </div>

                  <div className="space-y-3">
                     <h3 className="text-3xl font-black text-white tracking-tight">
                        {isCapturing ? 'Analyzing Biometrics...' : 'Place Your Thumb'}
                     </h3>
                     <p className="text-slate-500 max-w-sm mx-auto">
                        {isCapturing ? 'Verifying with UIDAI CIDR. Please do not move your finger.' : 'Keep your finger steady on the MFS100 scanner when the red light glows.'}
                     </p>
                  </div>

                  {!isCapturing && (
                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setShowCapture(false)} className="flex-1 py-4 glass text-white font-bold rounded-2xl hover:bg-white/5 transition-all">Cancel</button>
                       <button 
                         onClick={startCapture}
                         className="flex-[2] py-4 blue-gradient text-white font-black rounded-2xl shadow-xl shadow-blue-500/20"
                       >
                         Scan Now
                       </button>
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AEPS;
function IndianRupee(props: any) { return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>; }
