import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { Lock, Mail, User, Phone, ArrowLeft, AlertTriangle } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { config } = useConfig();
  const navigate = useNavigate();

  useEffect(() => {
    if (config && config.enable_user_registration === 0) {
      setError('User registration is currently disabled by the administrator.');
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.enable_user_registration === 0) return;
    try {
      await api.post('/auth/register', { name, email, phone, password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
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
      <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-gold-500 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)] border border-gold-400/20 overflow-hidden">
            {config.logo ? (
              <img src={config.logo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <span className="text-3xl font-bold text-white">{config.portal_name ? config.portal_name.substring(0, 2).toUpperCase() : 'JH'}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-gold-400 to-blue-400 bg-[length:200%_auto] animate-gradient">
            {config.portal_name || 'Join Digital Seva'}
          </h1>
          <p className="text-slate-400 mt-2 font-medium">{config.tagline || 'Create your official account'}</p>
        </div>

        {error && (
          <div className={`border px-4 py-3 rounded-xl mb-6 text-sm text-center flex items-center justify-center gap-2 ${config.enable_user_registration === 0 ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {config.enable_user_registration === 0 && <AlertTriangle size={16} />}
            {error}
          </div>
        )}

        {config.enable_user_registration !== 0 ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Full Name"
                required
              />
            </div>

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
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Phone Number"
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
              Register
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Back to Login
            </Link>
          </div>
        )}

        <p className="mt-8 text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
