import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Save } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';

const PortalConfig = () => {
  const { refreshConfig } = useConfig();
  const { user } = useAuth();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);

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
      console.error('Error fetching portal config:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to save configuration.');
      return;
    }
    
    try {
      await setDoc(doc(db, 'settings', 'portal'), config, { merge: true });
      await refreshConfig();
      alert('Configuration updated successfully');
    } catch (err: any) {
      console.error('Error updating portal config:', err);
      alert(err.message || 'Failed to update configuration');
    }
  };

  if (loading) return <div className="text-white">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-white">Portal Configuration</h1>
      <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-lg space-y-8">
        
        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Portal Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Portal Name" value={config.portal_name || ''} onChange={e => setConfig({...config, portal_name: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            <input type="text" placeholder="Organization Name" value={config.organization_name || ''} onChange={e => setConfig({...config, organization_name: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            <input type="email" placeholder="Contact Email" value={config.contact_email || ''} onChange={e => setConfig({...config, contact_email: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            <input type="text" placeholder="Contact Phone" value={config.contact_phone || ''} onChange={e => setConfig({...config, contact_phone: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            <input type="text" placeholder="Tagline" value={config.tagline || ''} onChange={e => setConfig({...config, tagline: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            <input type="text" placeholder="Office Address" value={config.office_address || ''} onChange={e => setConfig({...config, office_address: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Website Appearance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="color" title="Primary Theme Color" value={config.theme_color || '#2563eb'} onChange={e => setConfig({...config, theme_color: e.target.value})} className="w-full h-10 bg-slate-900/50 border border-slate-700 rounded-xl" />
            <input type="color" title="Secondary Color" value={config.secondary_color || '#64748b'} onChange={e => setConfig({...config, secondary_color: e.target.value})} className="w-full h-10 bg-slate-900/50 border border-slate-700 rounded-xl" />
            <input type="color" title="Header Background Color" value={config.header_bg_color || '#0f172a'} onChange={e => setConfig({...config, header_bg_color: e.target.value})} className="w-full h-10 bg-slate-900/50 border border-slate-700 rounded-xl" />
          </div>
          <input type="text" placeholder="Footer Text" value={config.footer_text || ''} onChange={e => setConfig({...config, footer_text: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
          <label className="flex items-center gap-2 text-white">
            <input type="checkbox" checked={!!config.enable_animations} onChange={e => setConfig({...config, enable_animations: e.target.checked})} className="w-4 h-4" />
            Enable Animations
          </label>
        </section>

        {/* Homepage Settings */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Homepage Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Banner Title" value={config.banner_title || ''} onChange={e => setConfig({...config, banner_title: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            <input type="text" placeholder="Banner Subtitle" value={config.banner_subtitle || ''} onChange={e => setConfig({...config, banner_subtitle: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            <input type="text" placeholder="Services Section Title" value={config.services_title || ''} onChange={e => setConfig({...config, services_title: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
          </div>
          <textarea placeholder="About Section Content" value={config.about_content || ''} onChange={e => setConfig({...config, about_content: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white h-32" />
        </section>

        {/* Login Page Configuration */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Login Page Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Login Page Title" value={config.login_title || ''} onChange={e => setConfig({...config, login_title: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.enable_user_registration} onChange={e => setConfig({...config, enable_user_registration: e.target.checked})} className="w-4 h-4" />
              Enable User Registration
            </label>
          </div>
        </section>

        {/* Portal Access Control */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Portal Access Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.enable_user_login} onChange={e => setConfig({...config, enable_user_login: e.target.checked})} className="w-4 h-4" />
              Enable User Login
            </label>
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.enable_staff_login} onChange={e => setConfig({...config, enable_staff_login: e.target.checked})} className="w-4 h-4" />
              Enable Staff Login
            </label>
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.enable_admin_login} onChange={e => setConfig({...config, enable_admin_login: e.target.checked})} className="w-4 h-4" />
              Enable Admin Login
            </label>
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.enable_service_applications} onChange={e => setConfig({...config, enable_service_applications: e.target.checked})} className="w-4 h-4" />
              Enable Service Applications
            </label>
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.enable_track_application} onChange={e => setConfig({...config, enable_track_application: e.target.checked})} className="w-4 h-4" />
              Enable Track Application Page
            </label>
          </div>
        </section>

        {/* File Upload Settings */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">File Upload Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-slate-400">Max File Size (MB)</label>
              <input type="number" value={config.max_file_size || 5} onChange={e => setConfig({...config, max_file_size: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-400">Allowed File Types (comma separated)</label>
              <input type="text" value={config.allowed_file_types || 'pdf,jpg,png'} onChange={e => setConfig({...config, allowed_file_types: e.target.value})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Notification Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.email_notifications} onChange={e => setConfig({...config, email_notifications: e.target.checked})} className="w-4 h-4" />
              Email Notifications
            </label>
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.sms_notifications} onChange={e => setConfig({...config, sms_notifications: e.target.checked})} className="w-4 h-4" />
              SMS Notifications
            </label>
            <label className="flex items-center gap-2 text-white">
              <input type="checkbox" checked={!!config.status_alerts} onChange={e => setConfig({...config, status_alerts: e.target.checked})} className="w-4 h-4" />
              Application Status Alerts
            </label>
          </div>
        </section>

        {/* Security Settings */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2">Security Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-slate-400">Session Timeout (minutes)</label>
              <input type="number" value={config.session_timeout || 30} onChange={e => setConfig({...config, session_timeout: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white" />
            </div>
            <div className="flex flex-col gap-4 justify-center">
              <label className="flex items-center gap-2 text-white">
                <input type="checkbox" checked={!!config.enable_captcha} onChange={e => setConfig({...config, enable_captcha: e.target.checked})} className="w-4 h-4" />
                Enable CAPTCHA for login
              </label>
              <label className="flex items-center gap-2 text-white">
                <input type="checkbox" checked={!!config.enable_otp} onChange={e => setConfig({...config, enable_otp: e.target.checked})} className="w-4 h-4" />
                Enable OTP verification
              </label>
            </div>
          </div>
        </section>

        <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">
          <Save size={20} />
          Save All Configuration
        </button>
      </form>
    </div>
  );
};

export default PortalConfig;
