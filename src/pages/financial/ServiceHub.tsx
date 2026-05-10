import React from 'react';
import { motion } from 'motion/react';
import { 
  Smartphone, Tv, Zap, Droplets, Flame, 
  Wifi, CreditCard, Send, Fingerprint, 
  ArrowRight, Landmark, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';

const ServiceHub = () => {
  const navigate = useNavigate();

  const categories = [
    {
      title: "Recharge Services",
      description: "Quick recharges for all major operators",
      icon: <Smartphone className="text-blue-400" />,
      services: [
        { name: "Mobile Recharge", icon: <Smartphone size={20} />, path: "/app/financial/recharge", desc: "Jio, Airtel, VI, BSNL" },
        { name: "DTH Recharge", icon: <Tv size={20} />, path: "/app/financial/recharge?type=dth", desc: "Tata Play, Airtel, Dish TV" },
      ]
    },
    {
      title: "Bill Payments",
      description: "Pay all your utility bills securely",
      icon: <Zap className="text-amber-400" />,
      services: [
        { name: "Electricity", icon: <Zap size={20} />, path: "/app/financial/bill-pay", desc: "All state electricity boards" },
        { name: "Water", icon: <Droplets size={20} />, path: "/app/financial/bill-pay?cat=water", desc: "Municipal & water boards" },
        { name: "Gas", icon: <Flame size={20} />, path: "/app/financial/bill-pay?cat=gas", desc: "Piped gas & LPG cylinders" },
        { name: "Broadband", icon: <Wifi size={20} />, path: "/app/financial/bill-pay?cat=broadband", desc: "Postpaid & Fiber" },
      ]
    },
    {
      title: "Banking & DMT",
      description: "Secure money transfers and banking",
      icon: <Send className="text-emerald-400" />,
      services: [
        { name: "Money Transfer", icon: <Send size={20} />, path: "/app/financial/dmt", desc: "IMPS/NEFT to any bank" },
        { name: "AEPS Banking", icon: <Fingerprint size={20} />, path: "/app/financial/aeps", desc: "Cash withdrawal by Aadhaar" },
        { name: "Aadhaar Pay", icon: <CreditCard size={20} />, path: "/app/financial/aeps?type=pay", desc: "Pay using Aadhaar biometric" },
      ]
    }
  ];

  return (
    <div className="space-y-10 pb-20">
      <header className="space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight">Financial <span className="text-blue-500">Hub</span></h1>
        <p className="text-slate-500">Secure digital financial services powered by BBPS and AEPS.</p>
      </header>

      <div className="grid gap-12">
        {categories.map((cat, idx) => (
          <section key={idx} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                {cat.icon}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{cat.title}</h2>
                <p className="text-slate-500 text-sm">{cat.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cat.services.map((service, sIdx) => (
                <GlassCard 
                  key={sIdx} 
                  className="p-6 group cursor-pointer hover:border-blue-500/30 transition-all border-white/5"
                  onClick={() => navigate(service.path)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                      {service.icon}
                    </div>
                    <ArrowRight size={18} className="text-slate-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{service.name}</h3>
                  <p className="text-xs text-slate-500">{service.desc}</p>
                </GlassCard>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 p-8 glass rounded-[2.5rem] border-white/5 bg-blue-600/5">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400">
            <ShieldCheck size={32} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight">Enterprise-Grade Security</h3>
            <p className="text-slate-400 text-sm">All transactions are secured with 256-bit encryption and verified through NPCI and RBI regulated gateways.</p>
          </div>
          <div className="flex gap-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" alt="UPI" className="h-6 opacity-40 grayscale group-hover:grayscale-0 transition-all" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Bharat_Bill_Pay_logo.svg/1200px-Bharat_Bill_Pay_logo.svg.png" alt="BBPS" className="h-6 opacity-40 grayscale group-hover:grayscale-0 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceHub;
