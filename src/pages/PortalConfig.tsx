import React, { useState, useRef } from 'react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Settings, Palette, Layout, Type, Image as ImageIcon, Globe, Save, Loader2, CheckCircle2, AlertCircle, Upload, Trash2, IdCard, Search, User } from 'lucide-react';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getBlob } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import html2canvas from 'html2canvas';

const PortalConfig = () => {
  const { config, refreshConfig } = useConfig();
  const { user } = useAuth();
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<string | null>(null);
  const [pvcTitle, setPvcTitle] = useState(config.pvc_title || 'JH Digital Seva Kendra');
  const [pvcFooter, setPvcFooter] = useState(config.pvc_footer || 'OFFICIAL IDENTITY CARD');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const staffPhotoInputRef = useRef<HTMLInputElement>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', 'in', ['staff', 'admin']));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((u: any) => !u.is_deleted);
      setStaffMembers(list);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'identity') {
      fetchStaff();
    }
  }, [activeTab]);

  const handleDownloadPVC = async (member: any) => {
    setIsDownloading(true);
    
    // Function to convert image to base64 to avoid CORS issues with html2canvas
    const getBase64Image = async (url: string) => {
      try {
        // Use our server-side proxy to bypass CORS
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy failed: ${response.statusText}`);
        const blob = await response.blob();

        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('Image proxy failed, trying direct Firebase SDK fallback:', err);
        try {
          let blob: Blob;
          // Try Firebase Storage SDK if it's a storage URL
          if (url.includes('firebasestorage.googleapis.com')) {
            try {
              const storageRef = ref(storage, url);
              blob = await getBlob(storageRef);
            } catch (storageErr) {
              const response = await fetch(url);
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              blob = await response.blob();
            }
          } else {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            blob = await response.blob();
          }

          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fallbackErr) {
          console.error('All methods failed to convert image to base64:', fallbackErr);
          return url; // Fallback to original URL
        }
      }
    };

    // Create a temporary container for the ID card
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    // Get the photo URL - if it's external, try base64 to ensure capture
    let photoUrl = member.photo_url;
    if (photoUrl && photoUrl.startsWith('http')) {
      photoUrl = await getBase64Image(photoUrl);
    }

    // Render the ID card layout
    const initials = (member.name || 'Staff').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    
    const idCardHtml = `
      <div id="pvc-id-card" style="width: 325px; height: 512px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-radius: 20px; position: relative; font-family: sans-serif; overflow: hidden; color: white; border: 4px solid #3b82f6;">
        <!-- Header -->
        <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; text-align: center; border-bottom: 1px solid rgba(59, 130, 246, 0.3);">
          <div style="font-weight: 800; font-size: 16px; letter-spacing: 1px; color: #3b82f6;">${pvcTitle}</div>
          <div style="font-weight: 400; font-size: 12px; opacity: 0.8;">${formData.tagline || 'SEVA KENDRA'}</div>
        </div>

        <!-- Photo -->
        <div style="display: flex; justify-content: center; margin-top: 25px;">
          <div style="width: 140px; height: 140px; border-radius: 24px; border: 4px solid #3b82f6; overflow: hidden; background: #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 800; color: #3b82f6;">
            ${photoUrl ? 
              `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />` : 
              `<span>${initials}</span>`
            }
          </div>
        </div>

        <!-- Details -->
        <div style="padding: 30px 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${member.name}</h2>
          <p style="margin: 8px 0 0 0; color: #3b82f6; font-weight: 700; font-size: 12px; letter-spacing: 2px;">${member.role?.toUpperCase()} MEMBER</p>
          
          <div style="margin-top: 30px; display: flex; flex-direction: column; gap: 12px; text-align: left; padding: 0 15px;">
            <div style="display: flex; gap: 10px;">
              <span style="color: #64748b; font-size: 10px; font-weight: 700; min-width: 60px;">ID NO:</span>
              <span style="font-size: 11px; font-family: monospace; font-weight: 700; color: #f8fafc;">${member.staff_id || 'N/A'}</span>
            </div>
            <div style="display: flex; gap: 10px;">
              <span style="color: #64748b; font-size: 10px; font-weight: 700; min-width: 60px;">PHONE:</span>
              <span style="font-size: 11px; font-weight: 600; color: #f8fafc;">${member.phone || 'N/A'}</span>
            </div>
            <div style="display: flex; gap: 10px;">
              <span style="color: #64748b; font-size: 10px; font-weight: 700; min-width: 60px;">EMAIL:</span>
              <span style="font-size: 11px; font-weight: 600; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${member.email}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 15px; background: #3b82f6; text-align: center;">
          <div style="font-size: 8px; font-weight: 800; letter-spacing: 1px;">${pvcFooter}</div>
        </div>
      </div>
    `;

    container.innerHTML = idCardHtml;
    const cardElement = document.getElementById('pvc-id-card');
    
    if (cardElement) {
      try {
        const canvas = await html2canvas(cardElement, {
          scale: 4, // Higher quality
          useCORS: true,
          backgroundColor: null,
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `StaffID_${member.name}.png`;
        link.href = imgData;
        link.click();
      } catch (err) {
        console.error('Error generating ID card:', err);
        alert('Failed to generate ID card. Please try again.');
      }
    }

    document.body.removeChild(container);
    setIsDownloading(false);
  };

  const handleStaffPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStaffId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be less than 2MB');
      return;
    }

    setIsUploadingPhoto(selectedStaffId);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `staff_photos/${Date.now()}_${selectedStaffId}.${fileExt}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // Update Firestore
      await setDoc(doc(db, 'users', selectedStaffId), { photo_url: url }, { merge: true });
      
      // Refresh list
      await fetchStaff();
      alert('Photo updated successfully!');
    } catch (err: any) {
      console.error('Staff photo upload failed:', err);
      alert('Failed to upload photo: ' + err.message);
    } finally {
      setIsUploadingPhoto(null);
      setSelectedStaffId(null);
      if (staffPhotoInputRef.current) staffPhotoInputRef.current.value = '';
    }
  };

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
      const fileExt = file.name.split('.').pop() || 'png';
      const storageRef = ref(storage, `branding/logo.${fileExt}`);
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
    { id: 'identity', label: 'Staff Identity', icon: IdCard },
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

            {activeTab === 'identity' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Configuration Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white mb-2 border-b border-slate-700 pb-2">PVC ID Card Configuration</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Card Header Title</label>
                        <input 
                          type="text" 
                          value={pvcTitle}
                          onChange={(e) => {
                            setPvcTitle(e.target.value);
                            setFormData({...formData, pvc_title: e.target.value});
                          }}
                          placeholder="e.g. JH Digital Seva Kendra"
                          className="w-full px-6 py-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Card Footer Text</label>
                        <input 
                          type="text" 
                          value={pvcFooter}
                          onChange={(e) => {
                            setPvcFooter(e.target.value);
                            setFormData({...formData, pvc_footer: e.target.value});
                          }}
                          placeholder="e.g. OFFICIAL IDENTITY CARD"
                          className="w-full px-6 py-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-900/30 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Live Card Preview</p>
                    <div className="scale-75 origin-center">
                      <div style={{ width: '325px', height: '512px', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', borderRadius: '20px', position: 'relative', fontFamily: 'sans-serif', overflow: 'hidden', color: 'white', border: '4px solid #3b82f6' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', textAlign: 'center', borderBottom: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '1px', color: '#3b82f6' }}>{pvcTitle || 'COMPANY NAME'}</div>
                          <div style={{ fontWeight: '400', fontSize: '12px', opacity: 0.8 }}>{formData.tagline || 'SEVA KENDRA'}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px' }}>
                          <div style={{ width: '140px', height: '140px', borderRadius: '24px', border: '4px solid #3b82f6', overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: '800', color: '#3b82f6' }}>
                            <span>JD</span>
                          </div>
                        </div>
                        <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SAMPLE NAME</h2>
                          <p style={{ margin: '8px 0 0 0', color: '#3b82f6', fontWeight: '700', fontSize: '12px', letterSpacing: '2px' }}>POSITION</p>
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '15px', background: '#3b82f6', textAlign: 'center' }}>
                          <div style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '1px' }}>{pvcFooter || 'OFFICIAL IDENTITY'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-800">
                  <h3 className="text-xl font-bold text-white mb-2 pb-2">PVC ID Card Generator</h3>
                  <p className="text-sm text-slate-400">Search for an existing staff member to generate and download their official PVC ID card.</p>
                  
                  <div className="relative mt-6 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      placeholder="Search staff by name or ID..."
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={staffPhotoInputRef}
                      onChange={handleStaffPhotoUpload}
                    />
                    {staffMembers
                      .filter(s => s.name?.toLowerCase().includes(staffSearch.toLowerCase()) || s.staff_id?.toLowerCase().includes(staffSearch.toLowerCase()))
                      .map(member => (
                        <div key={member.id} className="p-6 glass rounded-3xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-500/5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative">
                              {isUploadingPhoto === member.id ? (
                                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                                  <Loader2 className="animate-spin text-blue-500" size={20} />
                                </div>
                              ) : member.photo_url ? (
                                <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={24} className="text-slate-600" />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStaffId(member.id);
                                  staffPhotoInputRef.current?.click();
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              >
                                <Upload size={16} className="text-white" />
                              </button>
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-lg">{member.name}</h4>
                              <p className="text-xs text-blue-500 font-mono font-bold tracking-wider">{member.staff_id || 'NO ID SET'}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadPVC(member)}
                            disabled={isDownloading}
                            className="flex items-center gap-2 px-4 py-3 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 font-bold text-sm min-w-[140px] justify-center"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <IdCard size={18} />
                                <span>Download Card</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                  </div>

                  {staffMembers.length === 0 && (
                    <div className="text-center py-20 p-10 bg-slate-900/20 rounded-[2.5rem] border border-dashed border-slate-800">
                      <p className="text-slate-500">No active staff found. Manage your staff in the Staff Management section.</p>
                    </div>
                  )}
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
