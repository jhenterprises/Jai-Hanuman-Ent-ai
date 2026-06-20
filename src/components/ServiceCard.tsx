import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, Lock, Clock, Construction } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from './GlassCard';
import { ServiceControl } from '../context/ServiceControlContext';

interface ServiceCardProps {
  service: ServiceControl;
  icon: LucideIcon;
  color: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, icon: Icon, color }) => {
  const isAvailable = service.isLive && !service.maintenanceMode && !service.comingSoon;

  const getStatusBadge = () => {
    if (service.comingSoon) {
      return (
        <div className="absolute top-4 right-4 px-2 py-1 bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-amber-500/20 flex items-center gap-1">
          <Clock size={10} /> Coming Soon
        </div>
      );
    }
    if (service.maintenanceMode) {
      return (
        <div className="absolute top-4 right-4 px-2 py-1 bg-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-500/20 flex items-center gap-1">
          <Construction size={10} /> Maintenance
        </div>
      );
    }
    if (!service.isLive) {
      return (
        <div className="absolute top-4 right-4 px-2 py-1 bg-slate-500/20 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-500/20 flex items-center gap-1">
          <Lock size={10} /> Disabled
        </div>
      );
    }
    return (
      <div className="absolute top-4 right-4 px-2 py-1 bg-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20 flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
      </div>
    );
  };

  const CardContent = (
    <GlassCard className={`p-6 flex flex-col items-center gap-4 transition-all relative overflow-hidden group h-full ${!isAvailable ? 'opacity-70 grayscale' : 'hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10'}`}>
      {getStatusBadge()}
      
      <motion.div 
        whileHover={isAvailable ? { y: -5, scale: 1.1, rotate: 5 } : {}}
        className={`w-16 h-16 ${color}/10 rounded-2xl flex items-center justify-center ${color.replace('bg-', 'text-')} border border-white/5 group-hover:border-white/10 transition-all shadow-xl`}
      >
        <Icon size={32} strokeWidth={2.5} />
      </motion.div>
      
      <div className="text-center space-y-1">
        <h3 className="text-sm font-black text-white uppercase tracking-tight">{service.serviceName}</h3>
        {service.bannerMessage && (
          <p className="text-[10px] text-slate-400 font-medium leading-tight max-w-[120px] mx-auto">
            {service.bannerMessage}
          </p>
        )}
      </div>

      {!isAvailable && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-slate-950/80 border border-white/10 px-3 py-2 rounded-xl text-center">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">
              {service.comingSoon ? 'Opening Soon' : (service.maintenanceMode ? 'Fixing Up' : 'Offline')}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );

  if (isAvailable) {
    const getPath = () => {
      switch (service.serviceKey) {
        case 'pan': return '/app/user/apply/pan';
        case 'aadhaarService': return '/app/user/apply/aadhaarservice';
        default: return `/app/user/apply/${service.serviceKey.toLowerCase()}`;
      }
    };
    
    return (
      <Link to={getPath()}>
        {CardContent}
      </Link>
    );
  }

  return <div>{CardContent}</div>;
};

export default ServiceCard;
