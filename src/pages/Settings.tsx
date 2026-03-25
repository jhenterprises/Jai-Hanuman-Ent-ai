import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, Shield, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const allModules = [
    { name: 'Digital Services Control', icon: <Briefcase size={24} />, path: '/app/settings/services', roles: ['admin'] },
    { name: 'Users Management', icon: <Users size={24} />, path: '/app/settings/users', roles: ['admin'] },
    { name: 'Staff Management', icon: <Users size={24} />, path: '/app/settings/staff', roles: ['admin'] },
    { name: 'System Permissions', icon: <Shield size={24} />, path: '/app/settings/permissions', roles: ['admin'] },
    { name: 'Security Controls', icon: <Shield size={24} />, path: '/app/settings/security', roles: ['admin'] },
    { name: 'Portal Configuration', icon: <SettingsIcon size={24} />, path: '/app/settings/portal', roles: ['admin'] },
  ];

  const modules = allModules.filter(m => m.roles.includes(user?.role || ''));

  if (modules.length === 0) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
        <p className="text-slate-400">You do not have permission to access any settings modules.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(module => (
          <button
            key={module.name}
            onClick={() => navigate(module.path)}
            className="bg-slate-800/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-lg hover:border-blue-500/50 transition-all flex flex-col items-center gap-4 text-center"
          >
            <div className="p-4 rounded-full bg-blue-500/20 text-blue-400">
              {module.icon}
            </div>
            <h2 className="text-xl font-bold text-white">{module.name}</h2>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Settings;
