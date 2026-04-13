import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import api from '../services/api';
import { motion } from 'framer-motion';
import { FileText, ArrowRight, Plus, Download, Calendar, Loader2, Wallet, ArrowUpRight, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadPDF } from '../utils/pdfGenerator';
import AcknowledgementReceipt from '../components/AcknowledgementReceipt';
import { safeFormat } from '../utils/dateUtils';

import { useConfig } from '../context/ConfigContext';

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

        // Fetch from Firestore
        const q = query(
          collection(db, 'applications'),
          where('userId', '==', user.uid),
          orderBy('created_at', 'desc')
        );
        const appSnap = await getDocs(q);
        const apps = appSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplications(apps);

        // Fetch wallet from Firestore
        const walletDoc = await getDocs(query(collection(db, 'wallets'), where('user_id', '==', user.uid)));
        if (!walletDoc.empty) {
          setWalletBalance(walletDoc.docs[0].data().balance || 0);
        }

        // Fetch drafts from API
        try {
          const draftRes = await api.get('/application-drafts');
          setDrafts(draftRes.data);
        } catch (draftErr: any) {
          console.error('Error fetching drafts:', draftErr);
          if (draftErr.message?.includes('HTML')) {
            // Silent fail
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
      // Delay to ensure hidden receipt is rendered and styles are applied
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
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">My Applications</h1>
          <p className="text-sm sm:text-base text-slate-500">Track and manage your government service requests.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Link to="/app/wallet" className="px-6 py-3 glass border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
            <Wallet size={18} /> Wallet: ₹{(walletBalance || 0).toLocaleString()}
          </Link>
          <Link to="/" className="px-6 py-3 gold-gradient text-slate-900 font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
            <Plus size={20} /> New Application
          </Link>
        </div>
      </header>

      {/* Wallet Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 glass rounded-[2rem] p-8 flex flex-col justify-between bg-blue-600/10 border-blue-500/20">
          <div>
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4">
              <Wallet size={24} />
            </div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Available Balance</h3>
            <p className="text-4xl font-black text-white mt-1">₹{(walletBalance || 0).toLocaleString()}</p>
          </div>
          <div className="flex gap-2 mt-6">
            <Link to="/app/wallet" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
              <ArrowUpRight size={14} /> Add Money
            </Link>
            <Link to="/app/wallet" className="flex-1 py-3 glass text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
              <History size={14} /> History
            </Link>
          </div>
        </div>
        
        <div className="md:col-span-2 glass rounded-[2rem] p-8 flex flex-col justify-center bg-amber-500/5 border-amber-500/10">
          <h3 className="text-xl font-bold text-white mb-2">Welcome to Digital Services Portal</h3>
          <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
            Use your wallet for instant service payments. No need to enter card details every time. 
            Add money once and enjoy a seamless application experience.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 font-medium">Trusted by 10,000+ users across India</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 glass rounded-[2rem] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Drafts Section */}
          {drafts.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                  <History size={20} />
                </div>
                <h2 className="text-2xl font-bold text-white">My Drafts</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drafts.map((draft, i) => (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass rounded-[2rem] p-6 border-orange-500/10 hover:border-orange-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                        <FileText size={20} />
                      </div>
                      <span className="px-3 py-1 bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-orange-500/20">
                        Draft
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{draft.service_name}</h3>
                    <p className="text-xs text-slate-500 mb-6">Saved on {safeFormat(draft.created_at, 'dd MMM yyyy')}</p>
                    <Link
                      to={`/app/user/apply/${draft.service_type.toLowerCase().replace(/\s+/g, '-')}?draftId=${draft.id}`}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                    >
                      Resume Application <ArrowRight size={14} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Applications Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                <FileText size={20} />
              </div>
              <h2 className="text-2xl font-bold text-white">My Applications</h2>
            </div>
            {applications.length === 0 ? (
              <div className="glass rounded-[3rem] p-20 text-center space-y-6">
                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-600">
                  <FileText size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">No applications yet</h3>
                  <p className="text-slate-500">Start by applying for a service from the home page.</p>
                </div>
                <Link to="/" className="inline-block text-accent font-bold hover:underline">Browse Services &rarr;</Link>
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${config.grid_columns || 3} gap-6`}>
                {applications.map((app, i) => (
                  <motion.div 
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass rounded-[2rem] p-8 space-y-6 relative overflow-hidden group flex flex-col h-full"
                  >
                    {downloadingId === app.id && (
                      <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
                        <AcknowledgementReceipt application={app} id={`receipt-dash-${app.id}`} />
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 blue-gradient rounded-xl flex items-center justify-center text-white">
                        <FileText size={24} />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{app.service_name || app.service_type}</h3>
                      <p className="text-xs text-slate-500 font-mono">REF: {app.reference_number}</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Submitted On</span>
                        <span className="text-slate-300 font-bold">{safeFormat(app.created_at, 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Payment</span>
                        <span className={`font-bold ${app.payment_status === 'Paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {app.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link 
                        to={`/track/${app.reference_number}`}
                        className="flex-1 py-3 glass rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 group-hover:bg-white/10 transition-all"
                      >
                        Track Status <ArrowRight size={14} />
                      </Link>
                      <button 
                        onClick={() => handleDownload(app)}
                        disabled={downloadingId === app.id}
                        className="p-3 glass rounded-xl text-blue-400 hover:bg-blue-400/10 transition-all disabled:opacity-50"
                        title="Download Acknowledgement"
                      >
                        {downloadingId === app.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
