import React from 'react';
import { motion } from 'motion/react';
import { Construction, Clock, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from './GlassCard';

interface ServiceUnavailableProps {
  type: 'maintenance' | 'coming-soon' | 'disabled';
  serviceName: string;
}

const ServiceUnavailable: React.FC<ServiceUnavailableProps> = ({ type, serviceName }) => {
  const config = {
    maintenance: {
      icon: <Construction size={64} className="text-amber-500" />,
      title: 'Under Maintenance',
      desc: `We're currently performing scheduled maintenance on ${serviceName}. We'll be back shortly!`,
      color: 'border-amber-500/20'
    },
    'coming-soon': {
      icon: <Clock size={64} className="text-blue-500" />,
      title: 'Coming Soon',
      desc: `${serviceName} is launching soon. Stay tuned for updates!`,
      color: 'border-blue-500/20'
    },
    disabled: {
      icon: <Lock size={64} className="text-red-500" />,
      title: 'Service Offline',
      desc: `${serviceName} is temporarily unavailable. Please try again later.`,
      color: 'border-red-500/20'
    }
  };

  const active = config[type];

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <GlassCard className={`p-10 text-center space-y-8 ${active.color} border-2`}>
          <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
            {active.icon}
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">
              {active.title}
            </h1>
            <p className="text-slate-500 font-medium">
              {active.desc}
            </p>
          </div>

          <Link 
            to="/app/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/10 transition-all"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default ServiceUnavailable;
