import React from 'react';
import { motion } from 'motion/react';
import { 
  Smartphone, Tv, Zap, Droplets, Flame, 
  Wifi, CreditCard, Send, Fingerprint, 
  ArrowRight, Landmark, ShieldCheck, Wallet, FileJson,
  UserCheck, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';
import { useServiceControl } from '../../context/ServiceControlContext';
import ServiceCard from '../../components/ServiceCard';

const ServiceHub = () => {
  const navigate = useNavigate();
  const { services, loading } = useServiceControl();

  const categories = [
    {
      title: "Recharge Services",
      description: "Quick recharges for all major operators",
      icon: <Smartphone className="text-blue-400" />,
      keys: ['mobileRecharge', 'dthRecharge']
    },
    {
      title: "Bill Payments",
      description: "Pay all your utility bills securely",
      icon: <Zap className="text-amber-400" />,
      keys: ['electricityBill', 'waterBill', 'gasBill', 'broadbandBill', 'fastag']
    },
    {
      title: "Banking & DMT",
      description: "Secure money transfers and banking",
      icon: <Send className="text-emerald-400" />,
      keys: ['dmt', 'aeps', 'aadhaarPay']
    },
    {
      title: "Additional Services",
      description: "Government and registration support",
      icon: <FileJson className="text-rose-400" />,
      keys: ['pan', 'aadhaarService', 'wallet']
    }
  ];

  const ICON_MAP: Record<string, any> = {
    mobileRecharge: Smartphone,
    dthRecharge: Tv,
    electricityBill: Zap,
    waterBill: Droplets,
    gasBill: Flame,
    broadbandBill: Wifi,
    dmt: Send,
    aeps: Fingerprint,
    aadhaarPay: CreditCard,
    wallet: Wallet,
    pan: FileJson,
    aadhaarService: UserCheck,
    fastag: Database,
  };

  const COLOR_MAP: Record<string, string> = {
    mobileRecharge: 'bg-blue-600',
    dthRecharge: 'bg-indigo-600',
    electricityBill: 'bg-amber-600',
    waterBill: 'bg-sky-600',
    gasBill: 'bg-orange-600',
    broadbandBill: 'bg-violet-600',
    dmt: 'bg-emerald-600',
    aeps: 'bg-purple-600',
    aadhaarPay: 'bg-pink-600',
    wallet: 'bg-slate-600',
    pan: 'bg-rose-600',
    aadhaarService: 'bg-teal-600',
    fastag: 'bg-cyan-600',
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight">Financial <span className="text-blue-500">Service Hub</span></h1>
        <p className="text-slate-500">Secure digital financial services powered by BBPS and AEPS.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-16">
          {categories.map((cat, idx) => {
            const defaultServices = cat.keys.map(key => {
              const dbSvc = services.find(s => s.serviceKey === key);
              if (dbSvc) return dbSvc;
              return {
                id: key,
                serviceKey: key,
                serviceName: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                isLive: true,
                maintenanceMode: false,
                comingSoon: false,
                order: 99,
                apiStatus: 'connected',
                bannerMessage: '',
                updatedAt: new Date().toISOString()
              } as any;
            });
            const catServices = defaultServices.sort((a, b) => a.order - b.order);

            if (catServices.length === 0) return null;

            return (
              <section key={idx} className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                    {cat.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">{cat.title}</h2>
                    <p className="text-slate-500 text-sm">{cat.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {catServices.sort((a, b) => a.order - b.order).map((service) => (
                    <ServiceCard 
                      key={service.id} 
                      service={service} 
                      icon={ICON_MAP[service.serviceKey] || Smartphone} 
                      color={COLOR_MAP[service.serviceKey] || 'bg-blue-600'} 
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-12 p-8 glass rounded-[2.5rem] border-white/5 bg-blue-600/5">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400">
            <ShieldCheck size={32} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight">Enterprise-Grade Security</h3>
            <p className="text-slate-400 text-sm">All transactions are secured with 256-bit encryption and verified through NPCI and RBI regulated gateways.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-green-500 tracking-wider">UPI</span>
            </div>
            <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
              <span className="font-extrabold text-blue-400 tracking-wider">BBPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceHub;
