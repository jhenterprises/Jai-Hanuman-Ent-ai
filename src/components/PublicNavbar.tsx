import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, LayoutDashboard, LogOut, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useTheme } from '../context/ThemeContext';
import ModernButton from './ModernButton';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Services', path: '/app/services' },
    { name: 'Track Status', path: '/track' },
    { name: 'Contact', path: '/contact' },
  ];

  const dashboardPath = user?.role === 'user' ? '/app/user/dashboard' : '/app/dashboard';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-black/5 dark:border-white/5 py-3' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-12 h-12 bg-white p-1 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/10 group-hover:scale-110 transition-all duration-500 overflow-hidden">
            <img src={config.logo_url || "/logo.svg"} alt="JH Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl leading-tight tracking-tighter text-slate-900 dark:text-white group-hover:text-blue-400 transition-colors">
              {config.portal_name ? config.portal_name.split(' ')[0] : 'Digital'} {config.portal_name ? config.portal_name.split(' ')[1] : 'Seva'}
            </span>
            <span className="font-bold text-[10px] uppercase tracking-[0.3em] text-blue-500/80">
              {config.portal_name ? config.portal_name.split(' ').slice(2).join(' ') : 'Kendra'}
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              className={`relative text-xs font-bold uppercase tracking-widest transition-all hover:text-blue-500 dark:hover:text-white group ${location.pathname === link.path ? 'text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {link.name}
              <span className={`absolute -bottom-2 left-0 h-0.5 bg-blue-500 transition-all duration-300 ${location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full'}`} />
            </Link>
          ))}
          
          <div className="flex items-center gap-4 pl-4 border-l border-black/10 dark:border-white/10">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl glass hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                <ModernButton 
                  text="Dashboard" 
                  icon={LayoutDashboard} 
                  onClick={() => navigate(dashboardPath)}
                  gradient="blue-gradient"
                  className="!px-6 !py-2.5 !text-xs !rounded-xl ripple-effect"
                />
                <button 
                  onClick={() => {
                    logout();
                    navigate('/login?loggedOut=true');
                  }}
                  className="text-slate-400 hover:text-red-400 transition-all p-2 hover:bg-red-500/10 rounded-xl"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <ModernButton 
                text="Login" 
                icon={ArrowRight} 
                onClick={() => navigate('/login')}
                gradient="blue-gradient"
                className="!px-8 !py-3 !text-xs !rounded-xl ripple-effect"
              />
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button 
            onClick={toggleTheme}
            className="p-2 glass rounded-xl text-slate-600 dark:text-slate-400"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => setIsOpen(!isOpen)} className="text-slate-900 dark:text-white p-2 glass rounded-xl">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-4 right-4 mt-4 glass-dark rounded-3xl p-8 space-y-6 border-white/5 shadow-2xl"
          >
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="block text-xl font-black text-white hover:text-blue-400 transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-6 border-t border-white/5">
              {user ? (
                <div className="space-y-4">
                  <ModernButton 
                    text="Go to Dashboard" 
                    icon={LayoutDashboard} 
                    onClick={() => { setIsOpen(false); navigate(dashboardPath); }}
                    gradient="blue-gradient"
                    className="w-full !py-4"
                  />
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                      navigate('/login?loggedOut=true');
                    }}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-red-400 font-bold border border-red-500/20 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={20} />
                    Logout
                  </button>
                </div>
              ) : (
                <ModernButton 
                  text="Login / Register" 
                  icon={ArrowRight} 
                  onClick={() => { setIsOpen(false); navigate('/login'); }}
                  gradient="blue-gradient"
                  className="w-full !py-4"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
