import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage, auth } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { User, Lock, Phone, Camera, Save, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const ProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
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
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(data);
          setName(data.name);
          setPhone(data.phone || '');
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be < 2MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    try {
      let photoURL = profile.photoURL;
      if (photoFile && user) {
        const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }

      const updateData: any = { phone, photoURL };
      if (profile.role === 'admin') {
        updateData.name = name;
      }

      await updateDoc(doc(db, 'users', user!.uid), updateData);
      setProfile({ ...profile, ...updateData });
      alert('Profile updated');
    } catch (err) {
      console.error(err);
      alert('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    try {
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      alert('Password updated');
      setPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      alert('Password update failed. Check your current password.');
    }
  };

  if (!profile) return <div className="text-white text-center py-20"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <h1 className="text-4xl font-black text-white">Profile Settings</h1>
      
      <GlassCard className="p-8 space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img src={photoPreview || profile.photoURL || '/default-avatar.png'} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-slate-700" />
            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-500 transition-all">
              <Camera size={16} className="text-white" />
              <input type="file" onChange={handlePhotoChange} className="hidden" accept="image/*" />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{profile.name}</h2>
            <p className="text-blue-400 font-bold text-xs uppercase tracking-widest">{profile.role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <input disabled={profile.role !== 'admin'} value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 ring-blue-500" placeholder="Name" />
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 ring-blue-500" placeholder="Phone (10 digits)" />
          <button onClick={updateProfile} disabled={loading} className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save Profile
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-8 space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Lock /> Change Password</h3>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" placeholder="Current Password" />
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none" placeholder="New Password (min 6 chars)" />
        <button onClick={handlePasswordChange} className="w-full py-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-all">Update Password</button>
      </GlassCard>
    </div>
  );
};

export default ProfileSettings;
