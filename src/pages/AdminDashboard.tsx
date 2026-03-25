import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { Users, FileText, TrendingUp, DollarSign, Activity, PieChart, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  const chartData = [
    { name: 'Mon', apps: 45, rev: 1200 },
    { name: 'Tue', apps: 52, rev: 1500 },
    { name: 'Wed', apps: 38, rev: 900 },
    { name: 'Thu', apps: 65, rev: 2100 },
    { name: 'Fri', apps: 48, rev: 1400 },
    { name: 'Sat', apps: 24, rev: 600 },
    { name: 'Sun', apps: 18, rev: 400 },
  ];

  if (loading) return <div className="h-screen flex items-center justify-center">Loading Analytics...</div>;
  if (!stats) return <div className="h-screen flex items-center justify-center text-red-500">Failed to load analytics. Please try again later.</div>;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl sm:text-4xl font-black text-white">Admin Control Center</h1>
        <p className="text-sm sm:text-base text-slate-500">Real-time platform analytics and management.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Citizens', value: stats.totalUsers.count, icon: Users, color: 'blue' },
          { label: 'Applications', value: stats.totalApplications.count, icon: FileText, color: 'amber' },
          { label: 'Pending Tasks', value: stats.pendingApps.count, icon: Activity, color: 'emerald' },
          { label: 'Total Revenue', value: `₹${stats.revenue.total || 0}`, icon: DollarSign, color: 'purple' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-[2rem] p-8 relative overflow-hidden group"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${s.color}-500/10 rounded-full blur-2xl group-hover:bg-${s.color}-500/20 transition-colors`} />
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-2xl bg-${s.color}-500/20 flex items-center justify-center text-${s.color}-400`}>
                <s.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                <TrendingUp size={14} /> +12%
              </div>
            </div>
            <div className="text-3xl font-black text-white mb-1">{s.value}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="glass rounded-[2.5rem] p-10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <PieChart size={20} className="text-blue-400" /> Application Volume
            </h3>
            <button className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-1">
              View Report <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="apps" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-[2.5rem] p-10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign size={20} className="text-amber-400" /> Revenue Growth
            </h3>
            <button className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-1">
              View Report <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="rev" fill="#fbbf24" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
