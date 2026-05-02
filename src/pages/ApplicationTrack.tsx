import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useConfig } from '../context/ConfigContext';
import { motion } from 'motion/react';
import { CheckCircle, Clock, ArrowLeft, Shield, Download } from 'lucide-react';
import { safeFormat } from '../utils/dateUtils';

const ApplicationTrack = () => {
  const { config } = useConfig();
  const { id } = useParams();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApp = async () => {
      if (!id) return;
      try {
        const appRef = doc(db, 'applications', id);
        const appSnap = await getDoc(appRef);
        if (appSnap.exists()) {
          setApp({ id: appSnap.id, ...appSnap.data() });
        } else {
          console.error('Application not found in Firestore');
        }
      } catch (err) {
        console.error('Error fetching application from Firestore:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [id]);

  if (loading) return <div className="h-screen flex items-center justify-center">Tracking Application...</div>;
  if (!app) return <div className="text-center py-20 text-white">Application not found.</div>;

  const steps = [
    { label: 'Submitted', date: app.created_at, status: 'completed' },
    { label: 'Verification', date: app.updated_at, status: app.status === 'Pending' ? 'current' : 'completed' },
    { label: 'Processing', date: null, status: app.status === 'Processing' ? 'current' : app.status === 'Approved' ? 'completed' : 'pending' },
    { label: 'Final Approval', date: null, status: app.status === 'Approved' ? 'completed' : 'pending' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <Link to="/app/user/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
        <ArrowLeft size={18} /> Back to Dashboard
      </Link>

      <div className="glass rounded-[3rem] p-12 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white p-1 rounded-2xl flex items-center justify-center shadow-xl border border-slate-200">
              <img src={config.logo_url || "/logo.svg"} alt="JH Logo" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-white capitalize">{app.service_type}</h1>
              <p className="text-slate-500 font-mono text-sm tracking-tight">Reference ID: {app.reference_number}</p>
            </div>
          </div>
          <div className={`px-6 py-2 rounded-2xl text-sm font-black uppercase tracking-widest border ${
            app.status === 'Approved' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' :
            app.status === 'Rejected' ? 'text-red-400 border-red-400/20 bg-red-400/5' :
            'text-amber-400 border-amber-400/20 bg-amber-400/5'
          }`}>
            {app.status}
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="relative space-y-12">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/5" />
          
          {steps.map((step, i) => (
            <div key={i} className="relative flex gap-10 items-start">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 ${
                step.status === 'completed' ? 'blue-gradient text-white' :
                step.status === 'current' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-slate-900 border border-white/5 text-slate-600'
              }`}>
                {step.status === 'completed' ? <CheckCircle size={24} /> : <Clock size={24} />}
              </div>
              <div className="space-y-1 pt-2">
                <h4 className={`font-bold ${step.status === 'pending' ? 'text-slate-600' : 'text-white'}`}>{step.label}</h4>
                {step.date && <p className="text-xs text-slate-500">{safeFormat(step.date, 'dd/MM/yyyy, hh:mm a')}</p>}
                {!step.date && step.status !== 'pending' && <p className="text-xs text-slate-500 italic">In progress...</p>}
              </div>
            </div>
          ))}
        </div>

        {app.status === 'Approved' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 glass rounded-[2rem] bg-emerald-500/5 border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                <Shield size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Document Ready</h3>
                <p className="text-slate-500 text-sm">Your verified document is ready for download.</p>
              </div>
            </div>
            <button className="px-8 py-4 blue-gradient text-white font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-500/20">
              <Download size={20} /> Download PDF
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ApplicationTrack;
