import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import { Lock, Mail, User, Sun, Moon, ArrowLeft, Home } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDark, setIsDark] = useState(true);
  const { login } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.token, response.data.user);
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black p-4 relative">
      <Link 
        to="/"
        className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors p-3 rounded-full hover:bg-slate-800/50 bg-slate-900/30 backdrop-blur-md border border-slate-700/50 flex items-center gap-2 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium pr-2">Back to Home</span>
      </Link>
      
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-3 rounded-full hover:bg-slate-800/50 bg-slate-900/30 backdrop-blur-md border border-slate-700/50"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={24} /> : <Moon size={24} />}
      </button>
      <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-gold-500 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)] border border-gold-400/20 overflow-hidden">
            {config.login_logo || config.logo ? (
              <img src={config.login_logo || config.logo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <span className="text-3xl font-bold text-white">{config.portal_name ? config.portal_name.substring(0, 2).toUpperCase() : 'JH'}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-gold-400 to-blue-400 bg-[length:200%_auto] animate-gradient">
            {config.login_title || config.portal_name || 'Digital Seva Kendra'}
          </h1>
          <p className="text-slate-400 mt-2 font-medium">{config.tagline || 'Official Service Portal'}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Email address"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all transform hover:-translate-y-0.5"
          >
            Sign In
          </button>
        </form>

        {config.enable_user_registration !== 0 && (
          <p className="mt-8 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Register here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
