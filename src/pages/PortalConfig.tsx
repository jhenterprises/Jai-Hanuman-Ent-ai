import React, { useState, useRef } from 'react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Settings, Palette, Layout, Type, Image as ImageIcon, Globe, Save, Loader2, CheckCircle2, AlertCircle, Upload, Trash2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

const PortalConfig = () => {
  const { config, refreshConfig } = useConfig();
  const { user } = useAuth();
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const val = type === 'number' ? parseInt(value) : value;
    setFormData({ ...formData, [name]: val });
  };

  const handleToggle = (name: string) => {
    setFormData({ ...formData, [name]: formData[name] === 1 ? 0 : 1 });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      setError('Invalid file type. Only PNG, JPG, and SVG are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds 2MB limit.');
      return;
    }

    setIsUploadingLogo(true);
    setError(null);
    try {
      const storageRef = ref(storage, 'branding/logo.png');
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const newConfig = { ...formData, logo_url: url };
      setFormData(newConfig);
      
      // Auto-save the new logo URL to Firestore
      await setDoc(doc(db, 'settings', 'portal'), { logo_url: url }, { merge: true });
      await refreshConfig();
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setError('Failed to upload logo: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Remove current logo?')) return;
    try {
      setIsSaving(true);
      const newConfig = { ...formData, logo_url: '' };
      setFormData(newConfig);
      await setDoc(doc(db, 'settings', 'portal'), { logo_url: '' }, { merge: true });
      await refreshConfig();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError('Failed to remove logo: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to save configuration.');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
      await setDoc(doc(db, 'settings', 'portal'), formData, { merge: true });
      await refreshConfig();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating config:', err);
      setError(err.message || 'Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'branding', label: 'Company Branding', icon: ImageIcon },
    { id: 'general', label: 'General Info', icon: Settings },
    { id: 'theme', label: 'Theme & Colors', icon: Palette },
    { id: 'layout', label: 'Layout Elements', icon: Layout },
    { id: 'features', label: 'System Features', icon: Globe },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Settings className="text-blue-500" /> Portal Configuration
          </h1>
          <p className="text-slate-500">Full control over website branding, theme, and features.</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSaving || isUploadingLogo}
          className="px-8 py-4 gold-gradient text-slate-900 font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-amber-500/20 disabled:opacity-50"
        >
          {(isSaving || isUploadingLogo) ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saveSuccess ? 'Settings Saved!' : 'Save Changes'}
        </button>
      </header>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {saveSuccess && (
         <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-400 text-sm">
         <CheckCircle2 size={18} />
         ✅ Settings updated successfully
       </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 glass rounded-[2.5rem] p-10">
          <form onSubmit={handleSubmit} className="space-y-10">
            {activeTab === 'branding' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 border-b border-slate-700 pb-2">Logo Upload</h3>
                    <p className="text-sm text-slate-400 mb-6">Upload your company logo. Displayed on Navbar, Invoices, and Login page. (Max 2MB. PNG, JPG, SVG allowed)</p>
                    
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="w-48 h-48 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <div className="text-slate-500 flex flex-col items-center gap-2">
                            <ImageIcon size={48} />
                            <span className="text-xs font-medium">No Logo</span>
                          </div>
                        )}
                        {isUploadingLogo && (
                          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg, image/svg+xml"
                          onChange={handleLogoUpload}
                          ref={fileInputRef}
                          className="hidden" 
                          id="logo-upload"
                        />
                        <label 
                          htmlFor="logo-upload"
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg cursor-pointer transition-all"
                        >
                          <Upload size={18} /> Upload New Logo
                        </label>
                        
                        {formData.logo_url && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all border border-red-500/20"
                          >
                            <Trash2 size={18} /> Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Portal Name</label>
                    <input 
                      type="text" 
                      name="portal_name"
                      value={formData.portal_name}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tagline</label>
                    <input 
                      type="text" 
                      name="tagline"
                      value={formData.tagline}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contact Email</label>
                    <input 
                      type="email" 
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contact Phone</label>
                    <input 
                      type="text" 
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Office Address</label>
                  <textarea 
                    name="office_address"
                    value={formData.office_address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Primary Color</label>
                    <div className="flex gap-4">
                      <input 
                        type="color" 
                        name="primary_color"
                        value={formData.primary_color}
                        onChange={handleInputChange}
                        className="w-16 h-16 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        name="primary_color"
                        value={formData.primary_color}
                        onChange={handleInputChange}
                        className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Secondary Color</label>
                    <div className="flex gap-4">
                      <input 
                        type="color" 
                        name="secondary_color"
                        value={formData.secondary_color}
                        onChange={handleInputChange}
                        className="w-16 h-16 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        name="secondary_color"
                        value={formData.secondary_color}
                        onChange={handleInputChange}
                        className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'layout' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Grid Columns (Desktop)</label>
                    <select 
                      name="grid_columns"
                      value={formData.grid_columns || 4}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value={2}>2 Columns</option>
                      <option value={3}>3 Columns</option>
                      <option value={4}>4 Columns</option>
                      <option value={5}>5 Columns</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {[
                  { id: 'enable_registration', label: 'Allow User Registration', desc: 'Enable or disable new user signups.' },
                  { id: 'enable_service_applications', label: 'Allow Service Applications', desc: 'Enable or disable applying for new services.' },
                  { id: 'enable_track_application', label: 'Allow Application Tracking', desc: 'Enable or disable the public tracking page.' },
                  { id: 'enable_notifications', label: 'Enable System Notifications', desc: 'Enable or disable real-time user notifications.' },
                  { id: 'enable_support_tickets', label: 'Enable Support System', desc: 'Enable or disable the help desk / support tickets.' },
                ].map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-6 glass rounded-2xl border border-white/5">
                    <div>
                      <h4 className="font-bold text-white">{feature.label}</h4>
                      <p className="text-sm text-slate-500">{feature.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle(feature.id)}
                      className={`w-14 h-8 rounded-full transition-all relative ${
                        formData[feature.id] === 1 ? 'bg-blue-600' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                        formData[feature.id] === 1 ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PortalConfig;
