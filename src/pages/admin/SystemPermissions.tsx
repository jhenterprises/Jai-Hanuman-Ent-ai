import React from 'react';
import { Shield, Check, X, Info } from 'lucide-react';

const SystemPermissions = () => {
  const roles = [
    {
      name: 'Admin',
      description: 'Full system access, including configuration and user management.',
      permissions: [
        { name: 'Manage Users', status: true },
        { name: 'Manage Staff', status: true },
        { name: 'System Configuration', status: true },
        { name: 'Service Management', status: true },
        { name: 'View Analytics', status: true },
        { name: 'Process Applications', status: true },
        { name: 'Access Ledger', status: true },
        { name: 'Support Management', status: true },
      ]
    },
    {
      name: 'Staff',
      description: 'Can process applications, view users, and manage ledger entries.',
      permissions: [
        { name: 'Manage Users', status: false },
        { name: 'Manage Staff', status: false },
        { name: 'System Configuration', status: false },
        { name: 'Service Management', status: false },
        { name: 'View Analytics', status: false },
        { name: 'Process Applications', status: true },
        { name: 'Access Ledger', status: true },
        { name: 'Support Management', status: true },
      ]
    },
    {
      name: 'User',
      description: 'Standard citizen access to apply for services and track applications.',
      permissions: [
        { name: 'Manage Users', status: false },
        { name: 'Manage Staff', status: false },
        { name: 'System Configuration', status: false },
        { name: 'Service Management', status: false },
        { name: 'View Analytics', status: false },
        { name: 'Process Applications', status: false },
        { name: 'Access Ledger', status: false },
        { name: 'Support Management', status: false },
        { name: 'Apply for Services', status: true },
        { name: 'Track Applications', status: true },
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
          <Shield size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">System Permissions</h1>
          <p className="text-slate-400">Review role-based access control (RBAC) policies</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.name} className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-800/40 border-b border-slate-700/50">
              <h2 className="text-2xl font-bold text-white mb-2">{role.name}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{role.description}</p>
            </div>
            
            <div className="p-6 flex-1 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Permissions Matrix</h3>
              <div className="space-y-3">
                {role.permissions.map((perm) => (
                  <div key={perm.name} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                    <span className="text-sm text-slate-300">{perm.name}</span>
                    {perm.status ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check size={14} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                        <X size={14} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-900/40 border-t border-slate-700/50">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 italic">
                <Info size={12} />
                <span>Permissions are currently hardcoded in the system core.</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex gap-4">
        <AlertTriangle className="text-amber-500 shrink-0" size={24} />
        <div>
          <h4 className="text-amber-500 font-bold mb-1">Security Notice</h4>
          <p className="text-sm text-amber-200/70">
            Role permissions are enforced at both the API level and the Frontend routing level. 
            Modifying these policies requires a system update to ensure data integrity across all modules.
          </p>
        </div>
      </div>
    </div>
  );
};

const AlertTriangle = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

export default SystemPermissions;
