import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, Shield, Settings as SettingsIcon, LayoutDashboard } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();

  const modules = [
    { name: 'Digital Services Control', icon: <Briefcase size={24} />, path: '/app/settings/services' },
    { name: 'Users Management', icon: <Users size={24} />, path: '/app/settings/users' },
    { name: 'Staff Management', icon: <Users size={24} />, path: '/app/settings/staff' },
    { name: 'System Permissions', icon: <Shield size={24} />, path: '/app/settings/permissions' },
    { name: 'Security Controls', icon: <Shield size={24} />, path: '/app/settings/security' },
    { name: 'Portal Configuration', icon: <SettingsIcon size={24} />, path: '/app/settings/portal' },
  ];

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
