import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { Shield, LogOut, User, Menu, ArrowRight } from 'lucide-react';
import ModernButton from './ModernButton';

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
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-white p-1 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform overflow-hidden">
            <img src={config.logo_url || "https://firebasestorage.googleapis.com/v0/b/ais-dev-nkao4wgl3qoklcmykae3vf.appspot.com/o/artifacts%2Finput_file_1.png?alt=media"} alt="JH Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">JH Digital <span className="text-accent">Seva Kendra</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">Jharkhand Government Portal</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-slate-300 hover:text-accent transition-colors">Home</Link>
          {user ? (
            <>
              {user.role === 'user' && <Link to="/app/user/dashboard" className="text-sm font-medium text-slate-300 hover:text-accent transition-colors">My Applications</Link>}
              {user.role === 'staff' && <Link to="/app/staff/dashboard" className="text-sm font-medium text-slate-300 hover:text-accent transition-colors">Staff Portal</Link>}
              {user.role === 'admin' && <Link to="/app/admin-dashboard" className="text-sm font-medium text-slate-300 hover:text-accent transition-colors">Admin Panel</Link>}
              
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white">{user.name}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white">Sign In</Link>
              <ModernButton 
                text="Register" 
                icon={ArrowRight} 
                onClick={() => navigate('/register')}
                gradient="gold-gradient"
                className="!px-5 !py-2 !text-sm"
              />
            </div>
          )}
        </div>

        <button className="md:hidden text-white">
          <Menu size={24} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
