import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ArrowRight, Plus, Download, Calendar, 
  Loader2, Wallet, ArrowUpRight, History, Activity,
  CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadPDF } from '../utils/pdfGenerator';
import AcknowledgementReceipt from '../components/AcknowledgementReceipt';
import { safeFormat } from '../utils/dateUtils';
import { useConfig } from '../context/ConfigContext';
import GlassCard from '../components/GlassCard';

const Dashboard = () => {
  const { config } = useConfig();
  const [applications, setApplications] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, 'applications'),
          where('userId', '==', user.uid),
          orderBy('created_at', 'desc')
        );
        const appSnap = await getDocs(q);
        const apps = appSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplications(apps);

        if (user?.uid) {
          const walletDoc = await getDocs(query(collection(db, 'wallets'), where('user_id', '==', user.uid)));
          if (!walletDoc.empty) {
            setWalletBalance(walletDoc.docs[0].data().balance || 0);
          }
        }

        try {
          const draftRes = await api.get('/application-drafts');
          setDrafts(draftRes.data);
        } catch (draftErr: any) {
          console.error('Error fetching drafts:', draftErr);
          if (user?.uid) {
            const draftSnap = await getDocs(query(
              collection(db, 'application_drafts'),
              where('user_id', '==', user.uid)
            ));
            setDrafts(draftSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 size={16} />;
      case 'Rejected': return <AlertCircle size={16} />;
      case 'Processing': return <Activity size={16} className="animate-pulse" />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'Processing': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    }
  };

  const handleDownload = async (app: any) => {
    setDownloadingId(app.id);
    try {
      setTimeout(async () => {
        await downloadPDF(`receipt-dash-${app.id}`, `Acknowledgement_${app.reference_number}`);
        setDownloadingId(null);
      }, 500);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadingId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tight">User <span className="text-blue-500">Dashboard</span></h1>
          <p className="text-slate-500">Manage your applications and digital assets.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Link to="/app/wallet" className="px-6 py-3 glass border-white/5 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all ripple-effect">
            <Wallet size={18} className="text-blue-400" /> ₹{(walletBalance || 0).toLocaleString()}
          </Link>
          <Link to="/" className="px-8 py-3 blue-gradient text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 ripple-effect">
            <Plus size={20} /> New Application
          </Link>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-8 flex flex-col justify-between bg-blue-600/5 border-blue-500/10">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Wallet size={28} />
            </div>
            <div>
              <h3 className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">Wallet Balance</h3>
              <p className="text-4xl font-black text-white mt-1 tracking-tighter">₹{(walletBalance || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <Link to="/app/wallet" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ripple-effect">
              <ArrowUpRight size={14} /> Add Funds
            </Link>
            <Link to="/app/wallet" className="flex-1 py-3 glass text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
              <History size={14} /> History
            </Link>
          </div>
        </GlassCard>
        
        <GlassCard className="md:col-span-2 p-8 flex flex-col justify-center bg-purple-600/5 border-purple-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
          <div className="relative z-10 space-y-4">
            <h3 className="text-2xl font-black text-white tracking-tight">Welcome back, Citizen!</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              Your digital governance portal is ready. Apply for services, track progress, and manage documents with AI-powered efficiency.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-slate-950 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="h-4 w-px bg-white/10" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Verified Platform</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 glass rounded-[2.5rem] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-16">
          {/* Drafts Section */}
          <AnimatePresence>
            {drafts.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <History size={24} />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Pending <span className="text-amber-500">Drafts</span></h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drafts.map((draft, i) => (
                    <GlassCard key={draft.id} className="p-8 border-amber-500/10 hover:border-amber-500/40 group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                          <FileText size={24} />
                        </div>
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">
                          Draft
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{draft.service_name}</h3>
                      <p className="text-xs text-slate-500 mb-8 flex items-center gap-2">
                        <Clock size={12} /> Saved {safeFormat(draft.created_at, 'dd MMM yyyy')}
                      </p>
                      <Link
                        to={`/app/user/apply/${draft.service_type.toLowerCase().replace(/\s+/g, '-')}?draftId=${draft.id}`}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 ripple-effect"
                      >
                        Resume Journey <ArrowRight size={16} />
                      </Link>
                    </GlassCard>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Applications Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                <FileText size={24} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Active <span className="text-blue-500">Applications</span></h2>
            </div>
            
            {applications.length === 0 ? (
              <GlassCard className="p-20 text-center space-y-8" hover={false}>
                <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto text-slate-700 border border-white/5">
                  <FileText size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-white">No active applications</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">Your journey starts here. Apply for a service to see it tracked in real-time.</p>
                </div>
                <Link to="/" className="inline-flex items-center gap-2 text-blue-400 font-black uppercase tracking-widest text-xs hover:text-blue-300 transition-colors">
                  Browse Services <ArrowRight size={16} />
                </Link>
              </GlassCard>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.grid_columns || 3} gap-8`}>
                {applications.map((app, i) => (
                  <GlassCard key={app.id} className="p-8 space-y-8 flex flex-col h-full group">
                    {downloadingId === app.id && (
                      <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
                        <AcknowledgementReceipt application={app} id={`receipt-dash-${app.id}`} />
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="w-14 h-14 blue-gradient rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 group-hover:rotate-6 transition-transform">
                        <FileText size={28} />
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(app.status)}`}>
                        {getStatusIcon(app.status)}
                        {app.status}
                      </div>
                    </div>

                    <div className="flex-grow space-y-2">
                      <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">
                        {app.service_name || app.service_type}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        <span className="px-2 py-0.5 bg-white/5 rounded">REF</span>
                        {app.reference_number}
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                          <Calendar size={14} /> Submitted
                        </div>
                        <span className="text-slate-300 font-black text-xs">{safeFormat(app.created_at, 'dd MMM yyyy')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                          <Wallet size={14} /> Payment
                        </div>
                        <span className={`font-black text-xs px-2 py-0.5 rounded ${app.payment_status === 'Paid' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {app.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Link 
                        to={`/track/${app.reference_number}`}
                        className="flex-1 py-4 glass-dark rounded-2xl text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 hover:bg-blue-600 transition-all ripple-effect border-white/5"
                      >
                        Track <ArrowRight size={16} />
                      </Link>
                      <button 
                        onClick={() => handleDownload(app)}
                        disabled={downloadingId === app.id}
                        className="w-14 h-14 glass-dark rounded-2xl text-blue-400 flex items-center justify-center hover:bg-blue-400/10 transition-all disabled:opacity-50 border-white/5"
                        title="Download Receipt"
                      >
                        {downloadingId === app.id ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </motion.div>
  );
};

export default Dashboard;
