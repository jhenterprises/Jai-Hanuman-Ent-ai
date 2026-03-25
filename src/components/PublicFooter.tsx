import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const PublicFooter = () => {
  const { config } = useConfig();
  return (
    <footer className="py-20 border-t border-slate-800/50 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              {config.logo ? (
                <img src={config.logo} alt={config.portal_name} className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-gold-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
                  {config.portal_name ? config.portal_name.substring(0, 2).toUpperCase() : 'JH'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight text-white">
                  {config.portal_name ? config.portal_name.split(' ')[0] : 'Digital'} {config.portal_name ? config.portal_name.split(' ')[1] : 'Seva'}
                </span>
                <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-gold-500">
                  {config.portal_name ? config.portal_name.split(' ').slice(2).join(' ') : 'Kendra'}
                </span>
              </div>
            </div>
            <p className="text-slate-400 max-w-sm mb-8">
              {config.tagline || 'Empowering citizens with easy access to digital services. Making government and financial services accessible to everyone through technology and expert assistance.'}
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-400 transition-all">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-400 transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-400 transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-400 transition-all">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-white">Quick Links</h4>
            <ul className="space-y-4 text-slate-400">
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
              <li><Link to="/app/services" className="hover:text-blue-400 transition-colors">Services</Link></li>
              <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-white">Contact Us</h4>
            <ul className="space-y-4 text-slate-400">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-blue-500 shrink-0" />
                <span className="text-sm">{config.office_address || '123 Digital Seva Road, Main Market, Bangalore, Karnataka'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-blue-500 shrink-0" />
                <span className="text-sm">{config.contact_phone || '+91 98765 43210'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-blue-500 shrink-0" />
                <span className="text-sm">{config.contact_email || 'support@jhdigitalsevakendra.com'}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-800/50 text-center text-slate-500 text-sm">
          {config.footer_text || `© ${new Date().getFullYear()} ${config.portal_name || 'JH Digital Seva Kendra'}. All rights reserved.`}
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
