import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useConfig } from '../context/ConfigContext';
import { motion } from 'motion/react';
import { Mail, AlertCircle, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

const ForgotPassword = () => {
  const { config } = useConfig();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [debugLink, setDebugLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await sendPasswordResetEmail(auth, email);
      setStatus('success');
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      console.error('Reset error:', err);
      setStatus('error');
      let errMsg = 'Failed to send reset link.';
      if (err.code === 'auth/user-not-found') errMsg = 'No user found with this email.';
      if (err.code === 'auth/invalid-email') errMsg = 'Please enter a valid email address.';
      setMessage(errMsg);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[2.5rem] p-8 md:p-10 space-y-8 relative"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/10 overflow-hidden border border-slate-200 dark:border-white/10">
            <img src={config.logo_url || "/logo.svg"} alt="JH Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Reset Password</h2>
          <p className="text-slate-600 dark:text-slate-500">Enter your registered email or phone to receive a reset link</p>
        </div>

        {status === 'success' ? (
          <div className="space-y-6">
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={48} />
              <div className="space-y-2">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Check Your Email</h3>
                <p className="text-emerald-600 dark:text-emerald-400/80 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {debugLink && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Debug Mode (Dev Only)</p>
                <a 
                  href={debugLink} 
                  className="text-sm text-blue-300 hover:underline break-all block"
                >
                  {debugLink}
                </a>
              </div>
            )}

            <Link 
              to="/login" 
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} /> Back to Login
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
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email or Phone</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="name@example.com"
                  disabled={status === 'loading'}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-4 blue-gradient text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {status === 'loading' ? 'Sending Link...' : 'Send Reset Link'}
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

export default ForgotPassword;
