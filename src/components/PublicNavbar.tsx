import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import ModernButton from './ModernButton';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { config } = useConfig();

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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-header-bg/80 backdrop-blur-lg border-b border-slate-800 py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          {config.logo ? (
            <img src={config.logo} alt={config.portal_name} className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-gold-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
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
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-blue-400 ${location.pathname === link.path ? 'text-blue-400' : 'text-slate-300'}`}
            >
              {link.name}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-4">
              <ModernButton 
                text="Dashboard" 
                icon={LayoutDashboard} 
                onClick={() => navigate(dashboardPath)}
                gradient="gold-gradient"
                className="!px-6 !py-2.5 !text-sm"
              />
              <button 
                onClick={() => {
                  logout();
                  navigate('/login?loggedOut=true');
                }}
                className="text-slate-300 hover:text-red-400 transition-colors p-2"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <ModernButton 
              text="Login" 
              icon={ArrowRight} 
              onClick={() => navigate('/login')}
              gradient="blue-gradient"
              className="!px-6 !py-2.5 !text-sm"
            />
          )}
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white">
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-900 border-b border-slate-800 p-6 space-y-4 animate-fade-in">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              onClick={() => setIsOpen(false)}
              className="block text-lg font-medium text-slate-300 hover:text-blue-400"
            >
              {link.name}
            </Link>
          ))}
          {user ? (
            <div className="space-y-4">
              <ModernButton 
                text="Go to Dashboard" 
                icon={LayoutDashboard} 
                onClick={() => { setIsOpen(false); navigate(dashboardPath); }}
                gradient="gold-gradient"
                className="w-full"
              />
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                  navigate('/login?loggedOut=true');
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-red-400 font-medium border border-red-500/20 hover:bg-red-500/10 transition-colors"
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
              className="w-full"
            />
          )}
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
