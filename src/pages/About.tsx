import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Smartphone, Globe, Users, Shield, Zap, Clock } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent -z-10" />
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            About JH Digital Seva Kendra
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            We are dedicated to bridging the digital divide and providing seamless access to essential government and financial services.
          </p>
        </div>
      </header>

      {/* Mission Section */}
      <section className="py-20 border-y border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">Our Mission</h2>
              <p className="text-slate-400 text-lg mb-6">
                Our mission is to empower citizens by providing a one-stop digital platform for all their service needs. We aim to simplify complex government processes and make them accessible to everyone, regardless of their location or technical expertise.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <CheckCircle size={16} />
                  </div>
                  <span className="text-slate-200">Accessibility for all citizens</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <CheckCircle size={16} />
                  </div>
                  <span className="text-slate-200">Transparency in every process</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <CheckCircle size={16} />
                  </div>
                  <span className="text-slate-200">Speed and efficiency in delivery</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/20 blur-3xl -z-10" />
              <img 
                src="https://picsum.photos/seed/digital-seva/800/600" 
                alt="Digital Seva" 
                className="rounded-3xl border border-slate-800 shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">Our Core Values</h2>
            <p className="text-slate-400 max-w-xl mx-auto">The principles that guide us in serving our community every day.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Shield size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Integrity</h3>
              <p className="text-slate-400">We maintain the highest standards of honesty and transparency in all our dealings.</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Innovation</h3>
              <p className="text-slate-400">We constantly strive to improve our platform and services using the latest technology.</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Community</h3>
              <p className="text-slate-400">We are committed to the well-being and progress of the community we serve.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
