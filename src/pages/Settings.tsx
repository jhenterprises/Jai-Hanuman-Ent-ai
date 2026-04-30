import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Briefcase, Users, Shield, Settings as SettingsIcon, LayoutTemplate, Wallet, FileText, Lock, List, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SettingsLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const allModules = [
    { name: 'Branding & Portal', icon: <SettingsIcon size={20} />, path: '/app/settings/portal', roles: ['admin'] },
    { name: 'User Management', icon: <Users size={20} />, path: '/app/settings/users', roles: ['admin'] },
    { name: 'Staff Management', icon: <Users size={20} />, path: '/app/settings/staff', roles: ['admin'] },
    { name: 'Services Control', icon: <Briefcase size={20} />, path: '/app/settings/services', roles: ['admin'] },
    { name: 'Payment & Pricing', icon: <Wallet size={20} />, path: '/app/admin/payments', roles: ['admin'] },
    { name: 'Ledger Analytics', icon: <FileText size={20} />, path: '/app/admin/ledger-analytics', roles: ['admin'] },
    { name: 'System Permissions', icon: <Lock size={20} />, path: '/app/settings/permissions', roles: ['admin'] },
    { name: 'Security Controls', icon: <Shield size={20} />, path: '/app/settings/security', roles: ['admin'] }
  ];

  const modules = allModules.filter(m => m.roles.includes(user?.role || ''));

  if (modules.length === 0) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <h1 className="text-3xl font-bold text-white mb-4">Admin Control Panel</h1>
        <p className="text-slate-400">You do not have permission to access the control panel.</p>
      </div>
    );
  }

  // If we are exactly on the settings root path, maybe redirect to the first module or show a dashboard.
  // We'll show a quick overview dashboard if on root path.
  const isRoot = location.pathname === '/app/settings';

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto min-h-[80vh]">
      {/* Settings Sidebar */}
      <div className="w-full md:w-72 shrink-0">
        <div className="sticky top-24 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl space-y-2">
          <div className="mb-6 px-4">
             <h2 className="text-2xl font-black text-white">Settings</h2>
             <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mt-1">Control Panel</p>
          </div>
          <div className="space-y-1">
            {modules.map(module => {
              const isActive = location.pathname.startsWith(module.path);
              return (
                <button
                  key={module.name}
                  onClick={() => navigate(module.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-left ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {module.icon}
                  <span className="text-sm">{module.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1">
        {isRoot ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-4xl font-black mb-4">Admin Control Panel</h1>
                  <p className="text-blue-100 max-w-xl text-lg">Centralized command center for managing every aspect of the JH Digital Seva Kendra platform.</p>
                </div>
                <div className="absolute -right-20 -bottom-20 opacity-20 pointer-events-none">
                  <SettingsIcon size={300} className="animate-spin-slow" />
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {modules.map(module => (
                 <button
                   key={module.name}
                   onClick={() => navigate(module.path)}
                   className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-lg hover:border-blue-500/50 hover:bg-slate-800 transition-all flex items-center gap-4 text-left group"
                 >
                   <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all">
                     {module.icon}
                   </div>
                   <div>
                     <h3 className="font-bold text-white text-sm">{module.name}</h3>
                   </div>
                 </button>
               ))}
             </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
};

export default SettingsLayout;
