import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Shield, Save, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';

const SecurityControls = () => {
  const { refreshConfig } = useConfig();
  const { user } = useAuth();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'settings', 'portal');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching security config:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to save configuration.');
      return;
    }
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'portal'), config, { merge: true });
      await refreshConfig();
      alert('Security settings updated successfully');
    } catch (err: any) {
      console.error('Error updating security config:', err);
      alert(err.message || 'Failed to update security settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
          <Shield size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Security Controls</h1>
          <p className="text-slate-400">Manage system-wide security policies and access controls</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Authentication Settings */}
        <div className="bg-slate-800/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
            <Lock className="text-blue-400" size={20} />
            <h2 className="text-xl font-bold text-white">Authentication Policies</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-blue-500/30 transition-colors">
                <span className="text-slate-200 font-medium">Allow User Registration</span>
                <input
                  type="checkbox"
                  checked={config.enable_user_registration}
                  onChange={(e) => setConfig({ ...config, enable_user_registration: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-blue-500/30 transition-colors">
                <span className="text-slate-200 font-medium">Enable User Login</span>
                <input
                  type="checkbox"
                  checked={config.enable_user_login}
                  onChange={(e) => setConfig({ ...config, enable_user_login: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-blue-500/30 transition-colors">
                <span className="text-slate-200 font-medium">Enable Staff Login</span>
                <input
                  type="checkbox"
                  checked={config.enable_staff_login}
                  onChange={(e) => setConfig({ ...config, enable_staff_login: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-blue-500/30 transition-colors">
                <span className="text-slate-200 font-medium">Enable Admin Login</span>
                <input
                  type="checkbox"
                  checked={config.enable_admin_login}
                  onChange={(e) => setConfig({ ...config, enable_admin_login: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Session & Advanced Security */}
        <div className="bg-slate-800/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
            <AlertTriangle className="text-amber-400" size={20} />
            <h2 className="text-xl font-bold text-white">Session & Advanced Security</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Session Timeout (minutes)</label>
              <input
                type="number"
                value={config.session_timeout}
                onChange={(e) => setConfig({ ...config, session_timeout: parseInt(e.target.value) })}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <p className="text-xs text-slate-500">Users will be automatically logged out after this period of inactivity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-blue-500/30 transition-colors">
                <div className="flex flex-col">
                  <span className="text-slate-200 font-medium">Enable CAPTCHA</span>
                  <span className="text-xs text-slate-500">Protect login and registration from bots</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enable_captcha}
                  onChange={(e) => setConfig({ ...config, enable_captcha: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-blue-500/30 transition-colors">
                <div className="flex flex-col">
                  <span className="text-slate-200 font-medium">Enable 2FA / OTP</span>
                  <span className="text-xs text-slate-500">Require one-time password for login</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enable_otp}
                  onChange={(e) => setConfig({ ...config, enable_otp: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={20} />
            )}
            Save Security Policies
          </button>
        </div>
      </form>
    </div>
  );
};

export default SecurityControls;
