import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { Shield, LogOut, User, Menu, ArrowRight, Settings } from 'lucide-react';
import ModernButton from './ModernButton';
import { motion, AnimatePresence } from 'motion/react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10 px-6 py-4">
      <div className="container mx-auto flex justify-between items-center">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white p-1 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:rotate-6 transition-transform overflow-hidden">
              <img src={config.logo_url || "/logo.svg"} alt="JH Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">JH Digital <span className="text-accent text-blue-400">Seva Kendra</span></h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Jharkhand Government Portal</p>
            </div>
          </Link>
        </motion.div>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-colors">Home</Link>
          {user ? (
            <>
              {user.role === 'user' && <Link to="/app/user/dashboard" className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-colors">Dashboard</Link>}
              {user.role === 'staff' && <Link to="/app/staff/dashboard" className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-colors">Staff Portal</Link>}
              {user.role === 'admin' && <Link to="/app/admin-dashboard" className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-colors">Admin Panel</Link>}
              
              <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-white/5 border border-white/5 pl-1 pr-4 py-1 rounded-2xl"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 overflow-hidden border border-blue-500/20">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white uppercase tracking-tight">{user.name.split(' ')[0]}</span>
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{user.role}</span>
                  </div>
                </motion.div>
                
                <div className="flex items-center gap-1">
                  <Link 
                    to="/app/profile"
                    className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    title="Profile Settings"
                  >
                    <Settings size={18} />
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white">Sign In</Link>
              <ModernButton 
                text="Register" 
                icon={ArrowRight} 
                onClick={() => navigate('/register')}
                gradient="gold-gradient"
                className="!px-6 !py-2.5 !text-[11px]"
              />
            </div>
          )}
        </div>

        <button className="md:hidden text-white p-2 glass border-white/10 rounded-xl">
          <Menu size={24} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
