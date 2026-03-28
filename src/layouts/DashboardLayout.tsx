import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { useConfig } from '../context/ConfigContext';
import AIChatbot from '../components/AIChatbot';
import api from '../services/api';
import { safeFormat } from '../utils/dateUtils';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Briefcase, 
  LogOut, 
  Menu,
  X,
  Settings,
  Wallet as WalletIcon,
  MessageSquare,
  Sun,
  Moon,
  Home,
  Bell,
  Link as LinkIcon,
  CheckCircle2,
  Clock
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    if (!auth.currentUser) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login?loggedOut=true');
  };

  const navItems = [
    { path: user?.role === 'user' ? '/app/user/dashboard' : (user?.role === 'admin' ? '/app/admin-dashboard' : '/app/dashboard'), label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'staff', 'user'] },
    { path: '/app/wallet', label: 'My Wallet', icon: <WalletIcon size={20} />, roles: ['admin', 'staff', 'user'] },
    { path: user?.role === 'user' ? '/app/user/applications' : (user?.role === 'staff' ? '/app/staff/applications' : '/app/applications'), label: user?.role === 'user' ? 'My Applications' : 'User Applications', icon: <FileText size={20} />, roles: ['admin', 'staff', 'user'] },
    { path: user?.role === 'admin' ? '/app/services' : (user?.role === 'staff' ? '/app/staff/apply-service' : '/app/services'), label: 'Apply for Services', icon: <Briefcase size={20} />, roles: ['admin', 'staff', 'user'] },
    { path: '/app/ledger', label: 'Ledger', icon: <FileText size={20} />, roles: ['admin', 'staff'] },
    { path: '/app/users', label: 'Users List', icon: <Users size={20} />, roles: ['admin', 'staff'] },
    { path: '/app/staff-management', label: 'Staff Management', icon: <Users size={20} />, roles: ['admin'] },
    { path: '/app/admin/wallets', label: 'Wallet Management', icon: <WalletIcon size={20} />, roles: ['admin'] },
    { path: '/app/recycle-bin', label: 'Recycle Bin', icon: <LogOut size={20} className="rotate-180" />, roles: ['admin'] },
    { path: '/app/settings/portal', label: 'Portal Config', icon: <Settings size={20} />, roles: ['admin'] },
    { path: '/app/settings', label: 'Settings', icon: <Settings size={20} />, roles: ['admin', 'staff', 'user'] },
    { path: '/', label: 'Public Site', icon: <Home size={20} />, roles: ['admin', 'staff', 'user'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role || 'user'));
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-800/80 backdrop-blur-xl border-r border-slate-700/50
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700/50">
          <Link to="/app" className="flex items-center gap-2">
            {config.logo ? (
              <img src={config.logo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-gold-500 flex items-center justify-center font-bold text-white shadow-lg shadow-gold-500/20">
                {config.portal_name ? config.portal_name.substring(0, 2).toUpperCase() : 'JH'}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-gold-400">
                {config.portal_name ? config.portal_name.split(' ')[0] : 'Digital'} {config.portal_name ? config.portal_name.split(' ')[1] : 'Seva'}
              </span>
              <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-gold-500/80">
                {config.portal_name ? config.portal_name.split(' ').slice(2).join(' ') : 'Kendra'}
              </span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}
                `}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center font-bold text-sm">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-800/40 backdrop-blur-md border-b border-slate-700/50 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 flex justify-end items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700/50 relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-800">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in z-50">
                  <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                    <h3 className="text-sm font-bold text-white">Notifications</h3>
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {(!notifications || notifications.length === 0) ? (
                      <div className="p-8 text-center">
                        <Bell size={32} className="text-slate-700 mx-auto mb-2 opacity-20" />
                        <p className="text-slate-500 text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => markAsRead(n.id)}
                          className={`p-4 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700 transition-colors ${!n.is_read ? 'bg-blue-500/5' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                              <FileText size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-tight mb-1 ${!n.is_read ? 'text-slate-200 font-semibold' : 'text-slate-400'}`}>
                                {n.message}
                              </p>
                              <p className="text-[10px] text-slate-500">{safeFormat(n.created_at, 'dd/MM/yyyy, hh:mm a')}</p>
                            </div>
                            {!n.is_read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={toggleTheme}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700/50"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700/50">
              <Settings size={20} />
            </button>
            <button 
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-full hover:bg-red-500/10 flex items-center gap-2"
              title="Logout"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline text-sm font-medium">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto relative">
            <Outlet />
          </div>
        </main>
      </div>
      <AIChatbot />
    </div>
  );
};

export default DashboardLayout;
