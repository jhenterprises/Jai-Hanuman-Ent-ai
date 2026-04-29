import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useConfig } from '../context/ConfigContext';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const { config } = useConfig();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!oobCode) {
      setStatus('error');
      setMessage('Invalid or missing reset link.');
    }
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    setStatus('loading');
    try {
      if (!oobCode) throw new Error('Missing code');
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
      setMessage('Your password has been successfully reset.');
    } catch (err: any) {
      console.error('Reset error:', err);
      setStatus('error');
      let errMsg = 'Failed to reset password. The link may be expired or used.';
      if (err.code === 'auth/expired-action-code') errMsg = 'The reset link has expired.';
      if (err.code === 'auth/invalid-action-code') errMsg = 'The reset link is invalid.';
      setMessage(errMsg);
    }
  };

  if (!oobCode && status !== 'success') {
    return (
      <div className="max-w-md mx-auto mt-12 px-4">
        <div className="glass rounded-[2.5rem] p-10 text-center space-y-6">
          <AlertCircle className="text-red-500 dark:text-red-400 mx-auto" size={48} />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Invalid Link</h2>
          <p className="text-slate-600 dark:text-slate-500">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="inline-block py-3 px-6 blue-gradient text-white font-bold rounded-xl">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[2.5rem] p-8 md:p-10 space-y-8 relative"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/10 overflow-hidden border border-slate-200 dark:border-white/10">
            <img src={config.logo_url || "https://firebasestorage.googleapis.com/v0/b/ais-dev-nkao4wgl3qoklcmykae3vf.appspot.com/o/artifacts%2Finput_file_1.png?alt=media"} alt="JH Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">New Password</h2>
          <p className="text-slate-600 dark:text-slate-500">Set a strong password for your account</p>
        </div>

        {status === 'success' ? (
          <div className="space-y-6">
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={48} />
              <div className="space-y-2">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Success!</h3>
                <p className="text-emerald-600 dark:text-emerald-400/80 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
            <Link 
              to="/login" 
              className="w-full py-4 blue-gradient text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                <AlertCircle size={18} />
                {message}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-12 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  disabled={status === 'loading'}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-12 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  disabled={status === 'loading'}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-4 blue-gradient text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {status === 'loading' ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="text-center">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
