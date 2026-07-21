import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { motion } from 'motion/react';
import { Lock, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Login = ({ type = 'user' }: { type?: 'user' | 'admin' }) => {
  const { config } = useConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { loginWithGoogle, loginWithEmail, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isLoggedOut = new URLSearchParams(location.search).get('loggedOut') === 'true';
  const logoutInitiated = React.useRef(false);

  // Check role after login
  useEffect(() => {
    if (user && !logoutInitiated.current) {
      if (type === 'admin' && user.role !== 'admin') {
        logoutInitiated.current = true;
        toast.error('Access denied. Admin privileges required.');
        logout();
      } else {
        const defaultPath = user.role === 'admin' ? '/app/admin-dashboard' : (user.role === 'staff' ? '/app/dashboard' : '/app');
        const from = location.state?.from?.pathname || defaultPath;
        navigate(from, { replace: true });
      }
    }
  }, [user, type, navigate, logout, location]);

  const handleGoogleLogin = async () => {
    if (loading) return;
    const toastId = toast.loading('Connecting to Google...');
    try {
      setLoading(true);
      await loginWithGoogle();
      toast.success('Signed in successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Google login error:', err);
      let errorMsg = err.message || 'Google login failed';
      if (err.code === 'auth/popup-blocked') {
        errorMsg = 'Popup blocked by browser. Please allow popups.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Login popup was closed.';
      }
      toast.error(errorMsg, { id: toastId });
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
      // Navigation is handled in useEffect when user object updates
    } catch (err: any) {
      console.error('Email login error:', err);
      toast.error(err.message || 'Login failed. Please check credentials.', { id: toastId });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-[#0f172a] rounded-3xl overflow-hidden border border-slate-200 dark:border-[#1e293b] shadow-xl dark:shadow-[0_0_50px_rgba(59,130,246,0.1)]"
      >
        {/* Left Panel */}
        <div className="bg-gradient-to-br from-blue-50/50 via-white to-white dark:from-blue-900/40 dark:via-[#0f172a] dark:to-[#0f172a] p-10 flex flex-col justify-center relative overflow-hidden hidden md:flex border-r border-slate-100 dark:border-[#1e293b]/50">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-500/10 blur-[100px] rounded-full"></div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 w-fit pr-6 pl-2 py-2 rounded-2xl border border-slate-150 dark:border-white/10 backdrop-blur-sm shadow-xl">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg p-2">
                <img src={config.logo_url || "/logo.svg"} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">JH Digital Seva</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-800 dark:text-white leading-[1.1] tracking-tight">
                {type === 'admin' ? (
                  <>Boss Portal <br/> Access.</>
                ) : (
                  <>Digital seva <br/> made simple.</>
                )}
              </h1>
              <p className="text-slate-600 dark:text-[#cbd5e1] text-base lg:text-lg leading-relaxed max-w-sm">
                {type === 'admin' 
                  ? 'Manage the entire platform, users, wallets, and system configurations securely.'
                  : 'Manage wallet, print services, Aadhaar, PAN, DL and vehicle workflows from one clean dashboard.'}
              </p>
            </div>

            <div className="space-y-3 pt-4">
              {(type === 'admin' 
                ? ['Full system control', 'Detailed analytics & ledger', 'Staff management']
                : ['Secure user access', 'Wallet and transaction tracking', 'Fast service dashboard']
              ).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-50 dark:bg-[#1e293b]/30 border border-slate-200 dark:border-[#334155]/30 rounded-2xl p-4 backdrop-blur-sm transition-colors hover:bg-slate-100 dark:hover:bg-[#1e293b]/50">
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-[#334155]/50 border border-slate-200 dark:border-[#475569] flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-[2px]"></div>
                  </div>
                  <span className="text-slate-700 dark:text-[#e2e8f0] font-medium text-sm lg:text-base">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="bg-white dark:bg-[#0f172a] p-8 md:p-12 flex flex-col justify-center relative">
          
          {isLoggedOut && (
            <div className="absolute top-4 left-4 right-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
              <AlertCircle size={16} />
              You have been successfully signed out.
            </div>
          )}

          <div className="space-y-8 w-full max-w-sm mx-auto">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
                {type === 'admin' ? 'Welcome back Boss' : 'Welcome back user'}
              </h2>
              <p className="text-slate-500 dark:text-[#94a3b8] text-sm">
                Sign in to continue to your {type === 'admin' ? 'Admin ' : ''}JH Digital Seva dashboard.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-[#cbd5e1]">
                  Email ID / Mobile Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1e293b]/50 border border-slate-200 dark:border-[#334155] rounded-xl px-4 py-3.5 text-slate-800 dark:text-[#ffffff] placeholder:text-slate-400 dark:placeholder:text-[#64748b] focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#1e293b] transition-all text-sm"
                  placeholder="Enter Email ID or Mobile No."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-[#cbd5e1]">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1e293b]/50 border border-slate-200 dark:border-[#334155] rounded-xl px-4 py-3.5 pr-12 text-slate-800 dark:text-[#ffffff] placeholder:text-slate-400 dark:placeholder:text-[#64748b] focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#1e293b] transition-all text-sm"
                    placeholder="Enter Password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-850 dark:hover:text-[#cbd5e1] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1">
                <button 
                  type="button" 
                  onClick={() => setRememberMe(!rememberMe)} 
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border ${rememberMe ? 'bg-slate-300 border-slate-300 dark:bg-[#e2e8f0] dark:border-[#e2e8f0]' : 'bg-slate-100 border-slate-300 dark:bg-[#1e293b] dark:border-[#475569]'}`}
                >
                  <div className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full transition-transform ${rememberMe ? 'translate-x-5 bg-blue-600 dark:bg-[#0f172a]' : 'bg-slate-400 dark:bg-[#94a3b8]'}`}></div>
                </button>
                <span className="text-sm text-slate-600 dark:text-[#e2e8f0]">Remember me</span>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-4 ${type === 'admin' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]' : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]'} text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 hover:scale-[1.01] active:scale-[0.99]`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">Signing In...</span>
                ) : (
                  <>
                    <Lock size={16} className="text-white" /> Sign in
                  </>
                )}
              </button>
              
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#1e293b] dark:hover:bg-[#334155] border border-slate-200 dark:border-[#334155] rounded-xl text-slate-700 dark:text-[#ffffff] font-medium flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Sign in with Google
              </button>
            </form>

            <div className="pt-6 border-t border-slate-100 dark:border-[#1e293b] flex flex-col items-center gap-6">
              {type === 'user' && (
                <div className="flex items-center justify-center gap-3 w-full">
                  <span className="text-slate-500 dark:text-[#94a3b8] text-sm">New to JH Digital Seva?</span>
                  <Link 
                    to="/register" 
                    className="bg-slate-50 hover:bg-slate-100 dark:bg-[#1e293b] dark:hover:bg-[#334155] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#ffffff] px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    Create account
                  </Link>
                </div>
              )}
              
              <div className="flex flex-col items-center justify-center gap-3">
                {type === 'admin' && (
                  <Link to="/login" className="text-slate-500 hover:text-slate-800 dark:text-[#64748b] dark:hover:text-[#ffffff] text-sm transition-colors font-medium">
                    User Login
                  </Link>
                )}
                <Link to="/" className="text-slate-400 hover:text-slate-700 dark:text-[#475569] dark:hover:text-[#94a3b8] text-xs transition-colors flex items-center gap-1">
                  <ArrowLeft size={12}/> Back to Webpage
                </Link>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;


