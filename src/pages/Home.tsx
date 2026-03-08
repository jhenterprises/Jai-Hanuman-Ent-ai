import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Clock, CheckCircle, Smartphone, Globe, Users } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const Home = () => {
  const { config } = useConfig();
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent -z-10" />
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-fade-in">
            <Zap size={16} />
            <span>{config.tagline || 'Official Digital Seva Portal'}</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            {config.banner_title || config.portal_name || 'JH Digital Seva Kendra'}
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            {config.banner_subtitle || 'Your trusted partner for all government, financial, and digital services. Fast, secure, and reliable assistance at your fingertips.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register" 
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 group"
            >
              Get Started Now
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/app/services" 
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-semibold transition-all border border-slate-700"
            >
              View All Services
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="py-20 border-y border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-blue-500 mb-1">50+</p>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Services</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-blue-500 mb-1">10k+</p>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Happy Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-blue-500 mb-1">99%</p>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Success Rate</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-blue-500 mb-1">24/7</p>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      {config.about_content && (
        <section className="py-20 bg-slate-900/20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-8">{config.services_title || 'About Our Portal'}</h2>
            <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
              {config.about_content}
            </p>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">Why Choose Us?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">We provide a seamless experience for all your digital needs with top-notch security and speed.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Shield size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure & Safe</h3>
              <p className="text-slate-400">Your data is protected with enterprise-grade encryption and secure document handling.</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Clock size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Fast Processing</h3>
              <p className="text-slate-400">We prioritize your applications to ensure the quickest turnaround time possible.</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Expert Assistance</h3>
              <p className="text-slate-400">Our dedicated staff is always ready to help you with any queries or issues.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-blue-600 to-blue-800 p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl shadow-blue-900/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">Ready to get started?</h2>
            <p className="text-blue-100 text-xl mb-10 max-w-xl mx-auto">Join thousands of users who trust JH Digital Seva Kendra for their essential services.</p>
            <Link 
              to="/register" 
              className="px-10 py-5 bg-white text-blue-600 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
