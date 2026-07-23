import React, { useState, useEffect } from 'react';
import { 
  Palette, Image as ImageIcon, Type, Layout, Save, 
  Trash2, Upload, CheckCircle2, Loader2, Download, 
  Settings, User, Phone, MapPin, Globe, CreditCard,
  QrCode, UserCheck, Calendar, Info, Mail, Activity,
  ChevronRight, ChevronLeft, Brush, Monitor, IdCard,
  Briefcase, Search
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const DEFAULT_SETTINGS = {
  front_bg_color: '#1e1b4b',
  front_bg_image: '',
  back_bg_color: '#0f172a',
  back_bg_image: '',
  company_logo: '/logo.png',
  company_name: 'JH DIGITAL SEVA KENDRA',
  company_tagline: 'OFFICIAL IDENTITY CARD',
  text_color: '#ffffff',
  accent_color: '#3b82f6',
  border_color: '#3b82f6',
  header_bg_color: 'rgba(255, 255, 255, 0.05)',
  footer_bg_color: '#3b82f6',
  instructions: '1. This card is non-transferable.\n2. In case of loss, report to head office.\n3. Misuse of this card is a punishable offense.',
  emergency_contact: 'Police Control: 100',
  website: 'www.jhdigitalseva.com',
  signature_url: '',
  card_width: 325,
  card_height: 512,
  enabled_fields: ['staff_id', 'designation', 'phone', 'blood_group', 'joining_date'],
  font_size_name: 20,
  font_size_details: 12
};

const IDCardSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('front'); // 'front', 'back', 'global', 'fields'
  const [staff, setStaff] = useState<any[]>([]);
  const [previewStaff, setPreviewStaff] = useState<any>(null);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

  useEffect(() => {
    fetchSettings();
    fetchStaff();
  }, []);

  const fetchSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'id_card_settings', 'default'));
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'id_card_settings/default');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', 'in', ['staff', 'admin']));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(list);
      if (list.length > 0) setPreviewStaff(list[0]);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'id_card_settings', 'default'), settings);
      alert('ID Card Settings saved successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'id_card_settings/default');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const storageRef = ref(storage, `id_templates/${field}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setSettings(prev => ({ ...prev, [field]: url }));
    } catch (err) {
      alert('Upload failed: ' + err);
    }
  };

  const downloadPDF = async () => {
    const front = document.getElementById('id-card-front');
    const back = document.getElementById('id-card-back');
    if (!front || !back) return;

    try {
      const frontCanvas = await html2canvas(front, { scale: 4, useCORS: true });
      const backCanvas = await html2canvas(back, { scale: 4, useCORS: true });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Card size in mm (approximate conversion)
      const imgWidth = 85.6; 
      const imgHeight = 54; // standard PVC size is usually landscape, but our design is portrait. 
      // Actually standard ID cards are 85.6 x 53.98 mm.
      // If our ratio is 325x512, then if 325 is 54mm, 512 is ~85mm. 
      const h = 85.6;
      const w = 53.98;

      pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 10, 10, w, h);
      pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 10 + w + 10, 10, w, h);
      
      pdf.save(`ID_CARD_${previewStaff?.name || 'STAFF'}.pdf`);
    } catch (err) {
      alert('PDF generation failed: ' + err);
    }
  };

  const downloadCard = async (side: 'front' | 'back') => {
    const elementId = side === 'front' ? 'id-card-front' : 'id-card-back';
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        backgroundColor: null
      });
      const link = document.createElement('a');
      link.download = `ID_CARD_${previewStaff?.name || 'STAFF'}_${side.toUpperCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('Download failed: ' + err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const FrontSide = ({ member }: { member: any }) => (
    <div 
      id="id-card-front"
      className="relative shadow-2xl transition-all duration-500 group"
      style={{ 
        width: `${settings.card_width}px`, 
        height: `${settings.card_height}px`,
        backgroundColor: settings.front_bg_color,
        backgroundImage: settings.front_bg_image ? `url(${settings.front_bg_image})` : 'none',
        backgroundSize: 'cover',
        borderRadius: '24px',
        overflow: 'hidden',
        border: `4px solid ${settings.border_color}33`,
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div 
        className="p-6 text-center border-b"
        style={{ backgroundColor: settings.header_bg_color, borderColor: `${settings.border_color}33` }}
      >
        <div className="flex flex-col items-center gap-2">
          {(settings.company_logo || '/logo.png') && (
            <img src={settings.company_logo || '/logo.png'} alt="Logo" className="h-10 w-10 object-contain mb-1" />
          )}
          <h1 
            style={{ color: settings.accent_color, fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}
            className="uppercase"
          >
            {settings.company_name}
          </h1>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em]" style={{ color: settings.text_color }}>
            {settings.company_tagline}
          </p>
        </div>
      </div>

      {/* Photo Section */}
      <div className="flex justify-center mt-8">
        <div 
          className="w-36 h-36 rounded-3xl border-4 overflow-hidden shadow-xl bg-slate-800 flex items-center justify-center text-5xl font-black"
          style={{ borderColor: settings.accent_color, color: settings.accent_color }}
        >
          {member?.photo_url ? (
            <img src={member.photo_url} className="w-full h-full object-cover" alt="Staff" />
          ) : (
            <span>{member?.name?.[0] || 'S'}</span>
          )}
        </div>
      </div>

      {/* Name & Designation */}
      <div className="px-6 py-6 text-center">
        <h2 
          style={{ color: settings.text_color, fontSize: `${settings.font_size_name}px`, fontWeight: 800 }}
          className="uppercase tracking-tight"
        >
          {member?.name || 'STAFF NAME'}
        </h2>
        <p 
          style={{ color: settings.accent_color, fontSize: '14px', fontWeight: 700 }}
          className="uppercase tracking-[0.15em] mt-1"
        >
          {member?.designation || 'DESIGNATION'}
        </p>
      </div>

      {/* Details List */}
      <div className="px-8 space-y-2.5">
        {settings.enabled_fields.includes('staff_id') && (
          <div className="flex items-center gap-3">
            <CreditCard size={14} style={{ color: settings.accent_color }} />
            <div className="flex-1 border-b border-white/5 pb-1">
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest" style={{ color: settings.text_color }}>Staff ID</p>
              <p style={{ color: settings.text_color, fontSize: `${settings.font_size_details}px`, fontWeight: 600 }}>{member?.staff_id || 'ST-000'}</p>
            </div>
          </div>
        )}
        {settings.enabled_fields.includes('phone') && (
          <div className="flex items-center gap-3">
            <Phone size={14} style={{ color: settings.accent_color }} />
            <div className="flex-1 border-b border-white/5 pb-1">
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest" style={{ color: settings.text_color }}>Mobile No</p>
              <p style={{ color: settings.text_color, fontSize: `${settings.font_size_details}px`, fontWeight: 600 }}>{member?.phone || '88888 88888'}</p>
            </div>
          </div>
        )}
        {settings.enabled_fields.includes('blood_group') && (
          <div className="flex items-center gap-3">
            <Activity size={14} style={{ color: settings.accent_color }} />
            <div className="flex-1 border-b border-white/5 pb-1">
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest" style={{ color: settings.text_color }}>Blood Group</p>
              <p style={{ color: settings.text_color, fontSize: `${settings.font_size_details}px`, fontWeight: 600 }}>{member?.blood_group || 'O+'}</p>
            </div>
          </div>
        )}
        {settings.enabled_fields.includes('joining_date') && (
          <div className="flex items-center gap-3">
            <Calendar size={14} style={{ color: settings.accent_color }} />
            <div className="flex-1">
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest" style={{ color: settings.text_color }}>Joined On</p>
              <p style={{ color: settings.text_color, fontSize: `${settings.font_size_details}px`, fontWeight: 600 }}>{member?.joining_date || '01-01-2026'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Decoration */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-2"
        style={{ backgroundColor: settings.footer_bg_color }}
      />
    </div>
  );

  const BackSide = ({ member }: { member: any }) => (
    <div 
      id="id-card-back"
      className="relative shadow-2xl transition-all duration-500"
      style={{ 
        width: `${settings.card_width}px`, 
        height: `${settings.card_height}px`,
        backgroundColor: settings.back_bg_color,
        backgroundImage: settings.back_bg_image ? `url(${settings.back_bg_image})` : 'none',
        backgroundSize: 'cover',
        borderRadius: '24px',
        overflow: 'hidden',
        border: `4px solid ${settings.border_color}33`,
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div className="p-8 h-full flex flex-col">
        {/* Instructions */}
        <div className="mb-6">
          <h3 style={{ color: settings.accent_color }} className="text-[10px] font-black uppercase tracking-[0.3em] mb-4">Terms & Conditions</h3>
          <div 
            style={{ color: settings.text_color }} 
            className="text-[11px] leading-relaxed opacity-70 whitespace-pre-line font-medium"
          >
            {settings.instructions}
          </div>
        </div>

        {/* Info Rows */}
        <div className="space-y-4 flex-1">
          <div className="flex items-start gap-4">
            <div className="p-1.5 rounded-lg bg-white/5">
              <MapPin size={12} style={{ color: settings.accent_color }} />
            </div>
            <div>
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest" style={{ color: settings.text_color }}>Corporate Address</p>
              <p style={{ color: settings.text_color }} className="text-[10px] font-semibold mt-0.5 leading-tight">
                {member?.address || 'Main Road, Near SBI, Dumka, Jharkhand - 814101'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-1.5 rounded-lg bg-white/5">
              <Globe size={12} style={{ color: settings.accent_color }} />
            </div>
            <div>
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest" style={{ color: settings.text_color }}>Website & Portal</p>
              <p style={{ color: settings.text_color }} className="text-[10px] font-semibold mt-0.5">{settings.website}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-1.5 rounded-lg bg-white/5">
              <Phone size={12} style={{ color: settings.accent_color }} />
            </div>
            <div>
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest" style={{ color: settings.text_color }}>Emergency Help</p>
              <p style={{ color: settings.text_color }} className="text-[10px] font-semibold mt-0.5">{settings.emergency_contact}</p>
            </div>
          </div>
        </div>

        {/* QR and Signature */}
        <div className="flex items-end justify-between pt-6 border-t border-white/10">
          <div className="flex flex-col items-center gap-2">
             <div className="p-3 bg-white rounded-2xl">
               <QRCodeSVG 
                value={JSON.stringify({ 
                  id: member?.staff_id, 
                  name: member?.name, 
                  phone: member?.phone 
                })} 
                size={70} 
                level="L"
              />
             </div>
             <span className="text-[8px] font-bold opacity-30 tracking-tighter" style={{ color: settings.text_color }}>VERIFY IDENTITY</span>
          </div>
          
          <div className="text-right flex flex-col items-end gap-1 pb-1">
            {settings.signature_url ? (
              <img src={settings.signature_url} className="h-14 w-32 object-contain" alt="Signature" />
            ) : (
              <div className="h-14 w-32 flex items-center justify-center border border-dashed border-white/20 rounded-lg text-[9px] font-bold text-white/20 italic">
                Signature Here
              </div>
            )}
            <div className="w-32 h-[1px]" style={{ backgroundColor: `${settings.accent_color}55` }} />
            <p className="text-[9px] font-black tracking-widest uppercase mt-1" style={{ color: settings.text_color }}>Authorized Sign</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-blue-600/20 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-2xl shadow-blue-600/20">
            <IdCard size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">ID Card Designer</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Architect your professional staff identity system.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
            SAVE CONFIGURATION
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Editor Controls */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-white/5 p-2 overflow-hidden shadow-lg">
             <div className="grid grid-cols-4 gap-1 p-1">
               {[
                 { id: 'front', label: 'Front', icon: ImageIcon },
                 { id: 'back', label: 'Back', icon: Layout },
                 { id: 'global', label: 'Global', icon: Palette },
                 { id: 'fields', label: 'Fields', icon: Type },
               ].map(tab => (
                 <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}
                 >
                   <tab.icon size={18} />
                   <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                 </button>
               ))}
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 shadow-xl max-h-[70vh] overflow-y-auto custom-scrollbar">
            {activeTab === 'front' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={16} className="text-blue-500" />
                  Front Design
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Card Background Color</label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="color" 
                        value={settings.front_bg_color}
                        onChange={e => setSettings({...settings, front_bg_color: e.target.value})}
                        className="w-12 h-12 bg-transparent rounded-lg cursor-pointer border-none"
                      />
                      <input 
                        type="text"
                        value={settings.front_bg_color}
                        onChange={e => setSettings({...settings, front_bg_color: e.target.value})}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Front Background Image</label>
                    <div className="relative">
                      <div 
                        className="group relative h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-blue-500/50 overflow-hidden cursor-pointer transition-all flex items-center justify-center bg-slate-50 dark:bg-slate-950"
                        onClick={() => document.getElementById('front-bg-upload')?.click()}
                      >
                        {settings.front_bg_image ? (
                          <>
                            <img src={settings.front_bg_image} className="w-full h-full object-cover opacity-50" />
                            <div className="absolute inset-0 flex items-center justify-center group-hover:bg-slate-950/40">
                              <Upload className="text-white opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                          </>
                        ) : (
                          <div className="text-center space-y-1">
                            <Upload className="mx-auto text-slate-600 mb-1" size={24} />
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Click to upload image</p>
                          </div>
                        )}
                      </div>
                      <input id="front-bg-upload" type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'front_bg_image')} />
                      {settings.front_bg_image && (
                        <button 
                          onClick={() => setSettings({...settings, front_bg_image: ''})}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Company logo</label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-950 overflow-hidden"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        {settings.company_logo ? (
                          <img src={settings.company_logo} className="w-full h-full object-contain p-2" />
                        ) : (
                          <Upload className="text-slate-600" size={18} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 font-bold">1:1 Ratio Recommended</p>
                        <p className="text-[9px] text-slate-600">PNG preferred (Transparency)</p>
                      </div>
                      <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'company_logo')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'back' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Layout size={16} className="text-amber-500" />
                  Back Design
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Back Background Color</label>
                    <input 
                      type="color" 
                      value={settings.back_bg_color}
                      onChange={e => setSettings({...settings, back_bg_color: e.target.value})}
                      className="w-full h-12 bg-transparent rounded-lg cursor-pointer border-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Instructions / Terms</label>
                    <textarea 
                      value={settings.instructions}
                      onChange={e => setSettings({...settings, instructions: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-xs h-32 focus:border-amber-500/50 outline-none transition-all leading-relaxed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Authorized Signature</label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-950 group relative"
                        onClick={() => document.getElementById('signature-upload')?.click()}
                      >
                         {settings.signature_url ? (
                           <img src={settings.signature_url} className="h-full w-full object-contain p-4" />
                         ) : (
                           <div className="text-center">
                             <Brush className="mx-auto text-slate-600 mb-1" size={24} />
                             <p className="text-[9px] text-slate-500 font-bold uppercase">Upload Signature</p>
                           </div>
                         )}
                      </div>
                      <input id="signature-upload" type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'signature_url')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'global' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Palette size={16} className="text-emerald-500" />
                  Global Branding
                </h3>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Organization Name</label>
                    <input 
                      type="text"
                      value={settings.company_name}
                      onChange={e => setSettings({...settings, company_name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-slate-900 dark:text-white font-bold tracking-tight focus:border-emerald-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Card Accent Color</label>
                    <input 
                      type="color" 
                      value={settings.accent_color}
                      onChange={e => setSettings({...settings, accent_color: e.target.value, footer_bg_color: e.target.value, border_color: e.target.value})}
                      className="w-full h-12 bg-transparent rounded-lg cursor-pointer border-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Primary Text Color</label>
                    <input 
                      type="color" 
                      value={settings.text_color}
                      onChange={e => setSettings({...settings, text_color: e.target.value})}
                      className="w-full h-12 bg-transparent rounded-lg cursor-pointer border-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Name Font Size</label>
                      <input 
                        type="number"
                        value={settings.font_size_name}
                        onChange={e => setSettings({...settings, font_size_name: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Detail Font Size</label>
                      <input 
                        type="number"
                        value={settings.font_size_details}
                        onChange={e => setSettings({...settings, font_size_details: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Type size={16} className="text-purple-500" />
                  Staff Field Visibility
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'staff_id', label: 'Staff Member ID', icon: CreditCard },
                    { id: 'designation', label: 'Designation / Post', icon: Briefcase },
                    { id: 'phone', label: 'Mobile Number', icon: Phone },
                    { id: 'blood_group', label: 'Blood Group Info', icon: Activity },
                    { id: 'joining_date', label: 'Joining Date', icon: Calendar },
                    { id: 'email', label: 'Email Address', icon: Mail },
                  ].map(field => (
                    <label key={field.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-950 rounded-2xl border border-slate-200 dark:border-white/5 cursor-pointer group transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl transition-all ${settings.enabled_fields.includes(field.id) ? 'bg-purple-600/20 text-purple-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                          <field.icon size={16} />
                        </div>
                        <span className={`text-sm font-bold ${settings.enabled_fields.includes(field.id) ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{field.label}</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings.enabled_fields.includes(field.id)}
                        onChange={(e) => {
                          const newFields = e.target.checked 
                            ? [...settings.enabled_fields, field.id]
                            : settings.enabled_fields.filter(f => f !== field.id);
                          setSettings({...settings, enabled_fields: newFields});
                        }}
                        className="w-5 h-5 accent-purple-500 rounded bg-slate-800 border-none outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview & Staff Selection */}
        <div className="xl:col-span-8 flex flex-col gap-8 h-full">
           <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[3rem] p-8 lg:p-12 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
              {/* Animated Background Gradients */}
              <div className="absolute top-0 -left-1/4 w-[1000px] h-[1000px] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
              <div className="absolute bottom-0 -right-1/4 w-[1000px] h-[1000px] bg-purple-600/10 blur-[150px] rounded-full animate-pulse delay-700" />
              
              {/* Preview Toggle */}
              <div className="absolute top-10 flex gap-1 p-1 bg-slate-200/80 dark:bg-slate-950/80 rounded-2xl border border-slate-300 dark:border-white/10 backdrop-blur-md z-10">
                <button 
                  onClick={() => setPreviewSide('front')}
                  className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${previewSide === 'front' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Front
                </button>
                <button 
                  onClick={() => setPreviewSide('back')}
                  className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${previewSide === 'back' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Back
                </button>
              </div>

              {/* ID Card Mount with 3D effect */}
              <motion.div 
                key={previewSide}
                initial={{ rotateY: previewSide === 'front' ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                style={{ perspective: '2000px' }}
                className="relative z-0"
              >
                {previewSide === 'front' ? (
                  <FrontSide member={previewStaff} />
                ) : (
                  <BackSide member={previewStaff} />
                )}
              </motion.div>

              <div className="mt-12 flex flex-wrap gap-4 z-10 justify-center">
                <button 
                  onClick={() => downloadCard('front')}
                  className="px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-800 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-white/10 flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Download size={16} /> Front (PNG)
                </button>
                <button 
                  onClick={() => downloadCard('back')}
                  className="px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-800 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-white/10 flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Download size={16} /> Back (PNG)
                </button>
                <button 
                  onClick={downloadPDF}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-500/50 flex items-center gap-2 transition-all hover:scale-105 shadow-xl shadow-emerald-600/20"
                >
                  <Download size={16} /> Download Full ID (PDF)
                </button>
              </div>
           </div>

           {/* Staff Selector */}
           <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 shadow-xl">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Preview Staff Member</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Select a staff member to see how their card looks.</p>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <select 
                    onChange={e => setPreviewStaff(staff.find(s => s.id === e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-slate-900 dark:text-white text-sm font-bold appearance-none focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.staff_id})</option>
                    ))}
                  </select>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default IDCardSettings;
