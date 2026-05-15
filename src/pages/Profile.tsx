import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, storage, auth } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { User, Lock, Phone, Camera, Save, Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';

const ProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile(data);
            setName(data.name || '');
            setPhone(data.phone || '');
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load profile data');
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPG, PNG, WEBP)');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      toast.success('Photo selected. Click "Save Profile" to upload.');
    }
  };

  const updateProfile = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error('Phone number must be 10 digits');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Updating profile...');
    try {
      let photoURL = profile.photoURL;
      if (photoFile && user) {
        const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}.jpg`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }

      const updateData: any = { 
        name,
        phone, 
        photoURL,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user!.uid), updateData, { merge: true });
      setProfile({ ...profile, ...updateData });
      setPhotoFile(null);
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Update failed. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!password) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    const toastId = toast.loading('Updating password...');
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;
    
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    try {
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast.success('Password updated successfully!', { id: toastId });
      setPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      let msg = 'Password update failed. Check your current password.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect current password.';
      }
      toast.error(msg, { id: toastId });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!profile) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 space-y-4">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Syncing profile...</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-3xl mx-auto space-y-8 pb-32"
    >
      <header className="space-y-1">
        <h1 className="text-4xl font-black text-white tracking-tight">Account <span className="text-blue-500">Settings</span></h1>
        <p className="text-slate-500">Manage your profile information and security.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <GlassCard className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/5 ring-4 ring-blue-500/20 group-hover:ring-blue-500/50 transition-all shadow-2xl relative">
                <img 
                  src={photoPreview || profile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <label className="absolute bottom-1 right-1 p-2.5 bg-blue-600 rounded-2xl cursor-pointer hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 border border-white/20">
                <Camera size={16} className="text-white" />
                <input type="file" onChange={handlePhotoChange} className="hidden" accept="image/jpeg,image/png,image/webp" />
              </label>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight">{profile.name}</h2>
              <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
                <Mail size={14} /> {profile.email}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20 mt-4">
                {profile.role} account
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8 space-y-6 bg-red-500/5 border-red-500/10">
            <h3 className="text-lg font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={18} /> Account Status
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your account is currently active and verified. If you wish to deactivate or delete your account, please contact JH Portal support.
            </p>
          </GlassCard>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <GlassCard className="p-8 space-y-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                <User size={20} />
              </div>
              Personal Information
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 ring-blue-500 transition-all font-bold placeholder:text-slate-600" 
                    placeholder="Enter full name" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
                <div className="relative group">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 ring-blue-500 transition-all font-bold placeholder:text-slate-600" 
                    placeholder="10-digit mobile number" 
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={updateProfile} 
                disabled={loading} 
                className="w-full flex items-center justify-center gap-3 py-5 blue-gradient text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 disabled:grayscale transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save Profile Changes
              </motion.button>
            </div>
          </GlassCard>

          <GlassCard className="p-8 space-y-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                <Lock size={20} />
              </div>
              Security & Password
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 ring-amber-500 transition-all font-bold" 
                  placeholder="••••••••" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:ring-2 ring-amber-500 transition-all font-bold" 
                  placeholder="Min 6 characters" 
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handlePasswordChange} 
                disabled={passwordLoading}
                className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-white/10"
              >
                {passwordLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Update Password'}
              </motion.button>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileSettings;
