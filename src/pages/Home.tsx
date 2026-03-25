import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap, Globe, FileText, Fingerprint, CreditCard, UserCheck, Rocket } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useConfig } from '../context/ConfigContext';
import ModernButton from '../components/ModernButton';

const Home = () => {
  const { config } = useConfig();
  const [services, setServices] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/services').then(res => setServices(res.data));
  }, []);

  const getServiceKey = (name: string) => {
    if (!name) return 'general';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('aadhaar')) return 'aadhaar';
    if (lowerName.includes('pan')) return 'pan';
    if (lowerName.includes('passport')) return 'passport';
    if (lowerName.includes('voter')) return 'voterid';
    if (lowerName.includes('income')) return 'income';
    if (lowerName.includes('caste')) return 'caste';
    if (lowerName.includes('birth')) return 'birth';
    if (lowerName.includes('scheme')) return 'scheme';
    if (lowerName.includes('loan')) return 'loan';
    if (lowerName.includes('bill')) return 'utility';
    return 'general';
  };

  const getApplyUrl = (service: any) => {
    const key = getServiceKey(service.service_name);
    const urlParam = (key && key !== 'general') ? key : encodeURIComponent(service.service_name);
    return `/app/user/apply/${urlParam}`;
  };

  return (
    <div className="overflow-x-hidden pt-20 md:pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 md:space-y-32">
        {/* Hero Section */}
        <section className="relative text-center space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest"
        >
          <Zap size={14} />
          Next-Gen Digital Governance
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-white leading-[1.1] px-2"
        >
          JH Digital <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Seva Kendra</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto text-slate-400 text-base sm:text-lg leading-relaxed px-4"
        >
          Empowering citizens with seamless access to government services. 
          AI-driven processing, secure document vaults, and real-time tracking.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center items-center gap-4"
        >
          <ModernButton 
            text="Get Started" 
            icon={Rocket} 
            onClick={() => navigate('/register')}
            gradient="blue-gold-gradient"
          />
          <Link to="/track" className="px-8 py-4 glass text-white font-bold rounded-[12px] hover:bg-white/10 transition-all shadow-lg">
            Track Application
          </Link>
        </motion.div>

        {/* Floating Stats */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 pt-8 md:pt-12">
          {[
            { label: 'Services', value: '50+' },
            { label: 'Users', value: '1M+' },
            { label: 'Uptime', value: '99.9%' },
            { label: 'Security', value: 'AES-256' },
          ].map((stat) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 glass rounded-3xl"
            >
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Services Grid */}
      <section className="space-y-8 md:space-y-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Popular Services</h2>
            <p className="text-slate-500 text-sm md:text-base">Quick access to essential government documents and registrations.</p>
          </div>
          <Link to="/app/services" className="text-accent font-bold flex items-center gap-2 hover:underline shrink-0">
            View All <ArrowRight size={16} />
          </Link>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-${config.grid_columns || 4} gap-4 md:gap-6`}>
          {services.map((service, i) => (
            <motion.div 
              key={service.service_id}
              whileHover={{ y: -5 }}
              className="group p-6 glass rounded-[2rem] hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
            >
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-colors" />
              
              <div className="w-12 h-12 blue-gradient rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 shrink-0">
                {service.service_name.includes('Aadhaar') && <Fingerprint className="text-white" size={24} />}
                {service.service_name.includes('PAN') && <CreditCard className="text-white" size={24} />}
                {service.service_name.includes('Voter') && <UserCheck className="text-white" size={24} />}
                {service.service_name.includes('Passport') && <Globe className="text-white" size={24} />}
                {!['Aadhaar', 'PAN', 'Voter', 'Passport'].some(k => service.service_name.includes(k)) && <FileText className="text-white" size={24} />}
              </div>

              <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{service.service_name}</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-2 flex-grow">{service.description}</p>
              
              <Link 
                to={getApplyUrl(service)}
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 group-hover:text-blue-300 mt-auto"
              >
                Apply Now <ArrowRight size={12} />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="space-y-6 md:space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            AI-Powered <br />
            <span className="text-accent">Document Automation</span>
          </h2>
          <div className="space-y-6">
            {[
              { title: 'Smart OCR Scanning', desc: 'Automatically extract data from your ID cards with 99% accuracy.' },
              { title: 'DigiLocker Integration', desc: 'Fetch verified documents directly from your DigiLocker account.' },
              { title: 'Real-time Tracking', desc: 'Get instant updates via WhatsApp and SMS on your application status.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-accent shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white">{f.title}</h4>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="aspect-square glass rounded-[3rem] p-8 flex items-center justify-center overflow-hidden">
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="w-64 h-64 border-2 border-dashed border-blue-500/30 rounded-full flex items-center justify-center"
             >
                <div className="w-48 h-48 border-2 border-dashed border-amber-500/30 rounded-full" />
             </motion.div>
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 blue-gradient rounded-3xl shadow-2xl shadow-blue-500/50 flex items-center justify-center">
                  <Zap className="text-white" size={48} />
                </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  </div>
);
};

export default Home;
