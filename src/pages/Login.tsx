import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Login = () => {
  const { config } = useConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle, loginWithGoogleRedirect, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isLoggedOut = new URLSearchParams(location.search).get('loggedOut') === 'true';

  const handleGoogleLogin = async () => {
    if (loading) return;
    const toastId = toast.loading('Connecting to Google...');
    try {
      setLoading(true);
      await loginWithGoogle();
      toast.success('Signed in successfully!', { id: toastId });
      const from = location.state?.from?.pathname || '/app';
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Google login error:', err);
      let errorMsg = err.message || 'Google login failed';
      
      if (err.code === 'auth/popup-blocked') {
        errorMsg = 'Popup blocked by browser. Please allow popups.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Login popup was closed.';
      }
      
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const toastId = toast.loading('Signing you in...');
    try {
      await loginWithEmail(email, password);
      toast.success('Welcome back!', { id: toastId });
      const from = location.state?.from?.pathname || '/app';
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Email login error:', err);
      toast.error(err.message || 'Login failed. Please check credentials.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirect = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await loginWithGoogleRedirect();
    } catch (err: any) {
      console.error('Redirect sign in error:', err);
      toast.error(err.message || 'Redirect login failed');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[2.5rem] p-10 space-y-8 relative"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/10 overflow-hidden border border-slate-200 dark:border-white/10">
            <img src={config.logo_url || "/logo.svg"} alt="JH Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Welcome Back</h2>
          <p className="text-slate-600 dark:text-slate-500">Sign in to your digital citizen account</p>
        </div>

        {isLoggedOut && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-4 text-emerald-400 text-sm text-center"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={18} />
              You have been successfully signed out.
            </div>
            <Link to="/" className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              <ArrowLeft size={18} /> Back to Webpage
            </Link>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
              <Link to="/forgot-password" className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-12 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 blue-gradient text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-500 font-bold tracking-widest">Or continue with</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-slate-200 dark:border-white/5 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            {loading ? 'Connecting...' : 'Sign in with Google'}
          </button>
          
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={handleGoogleRedirect}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-blue-500 underline"
            >
              Having popup issues? Login with Google (Redirect)
            </button>
          </div>
        </form>

        <div className="text-center pt-4 space-y-4">
          <p className="text-slate-500 text-sm">
            Don't have an account? <Link to="/register" className="text-accent font-bold hover:underline">Register Now</Link>
          </p>
          <div className="pt-2">
            <Link to="/" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back to Webpage
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
