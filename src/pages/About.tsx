import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Smartphone, Globe, Users, Shield, Zap, Clock } from 'lucide-react';

const About = () => {
  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-20 pb-12 md:pt-32 md:pb-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 leading-tight">
            About JH Digital Seva Kendra
          </h1>
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 px-4">
            We are dedicated to bridging the digital divide and providing seamless access to essential government and financial services.
          </p>
        </div>
      </header>

      {/* Mission Section */}
      <section className="py-12 md:py-24 border-y border-slate-200 dark:border-slate-800/50 bg-slate-100/50 dark:bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-6 text-slate-900 dark:text-white">Our Mission</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base md:text-lg mb-6 leading-relaxed">
                Our mission is to empower citizens by providing a one-stop digital platform for all their service needs. We aim to simplify complex government processes and make them accessible to everyone, regardless of their location or technical expertise.
              </p>
              <div className="space-y-4">
                {[
                  'Accessibility for all citizens',
                  'Transparency in every process',
                  'Speed and efficiency in delivery'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-500 shrink-0">
                      <CheckCircle size={14} className="sm:size-4" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200 text-sm md:text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative order-1 md:order-2">
              <div className="absolute inset-0 bg-blue-600/20 blur-3xl -z-10" />
              <img 
                src="https://picsum.photos/seed/digital-seva/800/600" 
                alt="Digital Seva" 
                className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Our Core Values</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-xs sm:text-sm md:text-base px-4">The principles that guide us in serving our community every day.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Shield, title: 'Integrity', desc: 'We maintain the highest standards of honesty and transparency in all our dealings.' },
              { icon: Zap, title: 'Innovation', desc: 'We constantly strive to improve our platform and services using the latest technology.' },
              { icon: Users, title: 'Community', desc: 'We are committed to the well-being and progress of the community we serve.' },
            ].map((value, idx) => (
              <div key={idx} className="p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                  <value.icon size={24} className="sm:size-7" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 text-slate-900 dark:text-white">{value.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm md:text-base leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
