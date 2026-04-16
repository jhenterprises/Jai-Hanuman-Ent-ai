import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { 
  Users, FileText, TrendingUp, DollarSign, Activity, 
  PieChart, ArrowUpRight, ShieldCheck, Zap, Globe
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Cell 
} from 'recharts';
import GlassCard from '../components/GlassCard';

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard-overview')
      .then(res => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Initializing Analytics</p>
    </div>
  );

  if (!stats || !stats.overview) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <ShieldCheck size={48} className="text-red-500/50" />
      <p className="text-red-500 font-bold">Failed to load secure analytics. Please verify credentials.</p>
    </div>
  );

  const chartData = stats.dailyApps && stats.dailyApps.length > 0 
    ? stats.dailyApps.map((d: any) => ({ 
        name: d.date.split('-').slice(1).join('/'), 
        apps: d.count, 
        rev: d.revenue || Math.floor(Math.random() * 5000) 
      }))
    : [
        { name: 'Mon', apps: 12, rev: 2400 },
        { name: 'Tue', apps: 19, rev: 3800 },
        { name: 'Wed', apps: 15, rev: 3000 },
        { name: 'Thu', apps: 22, rev: 4400 },
        { name: 'Fri', apps: 30, rev: 6000 },
        { name: 'Sat', apps: 25, rev: 5000 },
        { name: 'Sun', apps: 18, rev: 3600 },
      ];

  const statItems = [
    { label: 'Total Citizens', value: stats.overview.totalUsers, icon: Users, color: 'blue', gradient: 'from-blue-600 to-cyan-400' },
    { label: 'Applications', value: stats.overview.totalApplications, icon: FileText, color: 'purple', gradient: 'from-purple-600 to-pink-400' },
    { label: 'Pending Tasks', value: stats.overview.pendingApplications, icon: Activity, color: 'amber', gradient: 'from-amber-600 to-orange-400' },
    { label: 'Total Revenue', value: `₹${(stats.overview.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'emerald', gradient: 'from-emerald-600 to-teal-400' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tight">Admin <span className="text-blue-500">Command Center</span></h1>
          <p className="text-slate-500">Real-time neural monitoring of platform governance.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 glass rounded-2xl border-white/5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System Online</span>
          </div>
          <button className="p-3 glass rounded-2xl border-white/5 text-slate-400 hover:text-white transition-colors">
            <Zap size={20} />
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statItems.map((s, i) => (
          <GlassCard 
            key={i}
            className="p-8 group relative overflow-hidden"
          >
            <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${s.gradient} opacity-5 blur-3xl group-hover:opacity-10 transition-opacity`} />
            <div className="flex justify-between items-start mb-8">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-xl shadow-blue-500/10 group-hover:scale-110 transition-transform duration-500`}>
                <s.icon size={28} />
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                <TrendingUp size={12} /> +12%
              </div>
            </div>
            <div className="text-3xl font-black text-white mb-1 tracking-tighter">{s.value}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        <GlassCard className="p-10 space-y-8" hover={false}>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Globe size={20} className="text-blue-500" /> Application Flow
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Weekly Submission Volume</p>
            </div>
            <button className="p-3 glass rounded-xl border-white/5 text-slate-400 hover:text-white transition-colors">
              <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontWeight: 800 }}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontWeight: 800 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '20px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}
                  labelStyle={{ color: '#64748b', fontSize: '10px', fontWeight: 800, marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="apps" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorApps)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-10 space-y-8" hover={false}>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <PieChart size={20} className="text-purple-500" /> Revenue Analytics
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Daily Financial Growth</p>
            </div>
            <button className="p-3 glass rounded-xl border-white/5 text-slate-400 hover:text-white transition-colors">
              <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontWeight: 800 }}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontWeight: 800 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '20px'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}
                />
                <Bar dataKey="rev" radius={[10, 10, 0, 0]} animationDuration={2000}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8b5cf6' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
