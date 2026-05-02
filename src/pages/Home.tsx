import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowRight, ShieldCheck, Zap, Globe as GlobeIcon, FileText, 
  Fingerprint, CreditCard, UserCheck, Rocket, Cpu, 
  CheckCircle2, Upload, Search, Activity, Database
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useConfig } from '../context/ConfigContext';
import ModernButton from '../components/ModernButton';
import GlassCard from '../components/GlassCard';
import TypingText from '../components/TypingText';
import AnimatedCounter from '../components/AnimatedCounter';

const Home = () => {
  const { config } = useConfig();
  const [services, setServices] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Real-time listener for popular services
    const q = query(
      collection(db, 'services'),
      where('isPopular', '==', true),
      where('enabled', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          service_id: doc.id,
          ...data,
          name: data.name || data.service_name || 'Unnamed Service',
          description: data.description || 'No description available',
          url: data.url || data.service_url || '',
          icon: data.icon || 'fa-file',
        };
      }).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('Real-time popular services:', servicesData);
      setServices(servicesData);
    }, (error) => {
      console.error('Error fetching popular services:', error);
    });

    return () => unsubscribe();
  }, []);

  const getServiceKey = (name: string) => {
    if (!name) return 'general';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('aadhaar')) return 'aadhaar';
    if (lowerName.includes('pan')) return 'pan';
    if (lowerName.includes('passport')) return 'passport';
    if (lowerName.includes('voter')) return 'voterid';
    return 'general';
  };

  const getApplyUrl = (service: any) => {
    const key = getServiceKey(service.name);
    const urlParam = (key && key !== 'general') ? key : encodeURIComponent(service.name);
    return `/app/user/apply/${urlParam}`;
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-blue-500/30 transition-colors duration-500 overflow-hidden">
      {/* Optimized Background Gradients instead of heavy Particles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 dark:bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 dark:bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[30%] right-[5%] w-[20%] h-[20%] bg-cyan-400/10 dark:bg-cyan-400/5 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-32 pb-20 space-y-32">
        
        {/* HERO SECTION */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          {/* TEXT */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest"
            >
              <Cpu size={14} className="animate-pulse" />
              AI-Powered Governance
            </motion.div>

            <div className="space-y-4">
              <motion.h1
                className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.9]"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Next-Gen <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 dark:from-blue-400 dark:via-cyan-400 dark:to-purple-500 animate-gradient-slow">
                  Digital Governance
                </span>
              </motion.h1>

              <div className="h-8">
                <TypingText 
                  text="AI-powered services, real-time tracking, and secure digital processing." 
                  className="text-blue-600/80 dark:text-blue-400/80 font-mono text-sm md:text-lg tracking-widest uppercase"
                />
              </div>
            </div>

            <motion.p
              className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Experience the future of citizen services. Seamlessly apply for Aadhaar, PAN, Passport and more with our AI-driven automated processing engine.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <ModernButton 
                text="Get Started" 
                icon={Rocket} 
                onClick={() => navigate('/register')}
                gradient="blue-gradient"
                className="ripple-effect"
              />
              <Link to="/track" className="px-8 py-4 glass text-slate-900 dark:text-white font-bold rounded-[12px] hover:bg-black/5 dark:hover:bg-white/10 transition-all shadow-lg border-black/5 dark:border-white/5 flex items-center gap-2 group">
                Track Status
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {/* VISUAL ALTERNATIVE TO 3D GLOBE */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative h-[400px] md:h-[600px] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-blue-500/10 blur-[120px] rounded-full" />
            
            {/* Optimized Visual placeholder for heavy 3D Globe */}
            <div className="relative w-72 h-72 md:w-[450px] md:h-[450px] rounded-full border border-blue-500/20 flex items-center justify-center">
              <div className="absolute inset-4 rounded-full border border-blue-500/10 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-12 rounded-full border border-blue-500/5 animate-[spin_15s_linear_infinite_reverse]" />
              <div className="w-48 h-48 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-3xl border border-white/10 flex items-center justify-center group overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                <GlobeIcon size={120} className="text-white/80 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent pointer-events-none" />
              </div>
            </div>
            
            {/* Floating Service Icons */}
            <div className="absolute inset-0 pointer-events-none">
              {[
                { Icon: Fingerprint, delay: 0, pos: 'top-10 left-10 md:top-20 md:left-20' },
                { Icon: CreditCard, delay: 1, pos: 'bottom-20 right-10 md:bottom-32 md:right-20' },
                { Icon: GlobeIcon, delay: 2, pos: 'top-32 right-12 md:top-40 md:right-32' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0 }}
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 4, repeat: Infinity, delay: item.delay }}
                  className={`absolute ${item.pos} p-4 glass rounded-2xl text-blue-600 dark:text-blue-400 shadow-2xl border-black/5 dark:border-white/10`}
                >
                  <item.Icon size={24} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* STATS SECTION */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Services", value: 50, suffix: "+" },
            { label: "Users", value: 1000000, suffix: "+" },
            { label: "Uptime", value: 99.9, suffix: "%" },
            { label: "Security", value: 256, suffix: " AES" },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="bg-white/40 dark:bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-black/5 dark:border-white/10 shadow-2xl space-y-2"
            >
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={item.value} suffix={item.suffix} />
              </h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{item.label}</p>
            </motion.div>
          ))}
        </section>

        {/* SERVICES SECTION */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Popular <span className="text-blue-600 dark:text-blue-500">Services</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Access government services with a single click. Our 3D-accelerated interface makes navigation intuitive and fast.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.length > 0 ? (
              services.map((service, i) => (
                <GlassCard key={service.service_id} className="p-8 flex flex-col h-full group">
                    <div className="w-14 h-14 blue-gradient rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 group-hover:rotate-12 transition-transform duration-500">
                      {service.icon?.startsWith('fa-') ? (
                        <i className={`fas ${service.icon} text-white text-2xl`}></i>
                      ) : (
                        <>
                          {service.name.includes('Aadhaar') && <Fingerprint className="text-white" size={28} />}
                          {service.name.includes('PAN') && <CreditCard className="text-white" size={28} />}
                          {service.name.includes('Voter') && <UserCheck className="text-white" size={28} />}
                          {service.name.includes('Passport') && <GlobeIcon className="text-white" size={28} />}
                          {!['Aadhaar', 'PAN', 'Voter', 'Passport'].some(k => service.name.includes(k)) && <FileText className="text-white" size={28} />}
                        </>
                      )}
                    </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{service.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 line-clamp-2 flex-grow">{service.description}</p>
                  
                  {service.application_type === 'external' && service.url ? (
                    <a 
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 glass-dark rounded-xl text-center text-xs font-bold text-white hover:bg-blue-600 transition-all ripple-effect border-white/5"
                    >
                      Apply Now
                    </a>
                  ) : (
                    <Link 
                      to={getApplyUrl(service)}
                      className="w-full py-4 glass-dark rounded-xl text-center text-xs font-bold text-white hover:bg-blue-600 transition-all ripple-effect border-white/5"
                    >
                      Apply Now
                    </Link>
                  )}
                </GlassCard>
              ))
            ) : (
              [
                { name: "Aadhaar", icon: Fingerprint },
                { name: "PAN Card", icon: CreditCard },
                { name: "Passport", icon: GlobeIcon },
                { name: "Ration Card", icon: FileText },
                { name: "Income Tax", icon: FileText },
                { name: "Voter ID", icon: UserCheck },
              ].map((service, i) => (
                <GlassCard key={i} className="p-8 flex flex-col h-full group">
                  <div className="w-14 h-14 blue-gradient rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 group-hover:rotate-12 transition-transform duration-500">
                    <service.icon className="text-white" size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{service.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-grow">Apply for {service.name} with our automated processing engine.</p>
                  <Link 
                    to={getApplyUrl(service)}
                    className="w-full py-4 glass-dark rounded-xl text-center text-xs font-bold text-white hover:bg-blue-600 transition-all ripple-effect border-white/5"
                  >
                    Apply Now
                  </Link>
                </GlassCard>
              ))
            )}
          </div>
        </section>

        {/* AI FEATURES SECTION */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700 dark:from-cyan-400 dark:to-blue-600">Features</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Our neural engine powers the next generation of digital governance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "OCR Document Scan", icon: Search, desc: "Automated data extraction with neural vision." },
              { title: "DigiLocker Integration", icon: Database, desc: "Securely fetch documents from your digital vault." },
              { title: "Real-time Tracking", icon: Activity, desc: "Instant updates on your application status." },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="bg-white/40 dark:bg-white/5 backdrop-blur-lg p-8 rounded-2xl border border-black/5 dark:border-white/10 shadow-2xl group"
              >
                <div className="w-12 h-12 rounded-xl glass flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:blue-gradient group-hover:text-white transition-all mb-6">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="relative py-20">
          <GlassCard className="p-12 md:p-20 text-center space-y-8 overflow-hidden" hover={false}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full" />
            
            <h2 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              Ready to experience <br />
              <span className="text-blue-600 dark:text-blue-500">Digital Freedom?</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-lg">
              Join over 1 million citizens who have already transitioned to our next-gen digital governance platform.
            </p>
            <div className="flex justify-center gap-4">
              <ModernButton 
                text="Create Account" 
                icon={UserCheck} 
                onClick={() => navigate('/register')}
                gradient="blue-gradient"
                className="ripple-effect"
              />
            </div>
          </GlassCard>
        </section>

      </div>
    </div>
  );
};

export default Home;
