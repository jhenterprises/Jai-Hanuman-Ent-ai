import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { 
  IndianRupee, 
  Users, 
  Briefcase, 
  TrendingUp,
  Activity,
  Sparkles,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  MessageSquare,
  ExternalLink,
  Eye
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, inProgress: 0 });
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/analytics').then(res => setAnalytics(res.data)).catch(console.error);
    } else if (user?.role === 'user') {
      api.get('/applications').then(res => {
        const apps = res.data;
        setUserApplications(apps.slice(0, 5));
        setStats({
          total: apps.length,
          approved: apps.filter((a: any) => a.status.toLowerCase() === 'approved' || a.status.toLowerCase() === 'completed').length,
          inProgress: apps.filter((a: any) => ['submitted', 'under review', 'processing', 'documents required'].includes(a.status.toLowerCase())).length
        });
      }).catch(console.error);
    }
  }, [user]);

  const generateAIInsight = async () => {
    if (!analytics) return;
    setIsGeneratingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const prompt = `Analyze this business data for JH Digital Seva Kendra and provide a brief, professional 3-sentence insight on performance and potential areas for growth:
      Total Revenue: ₹${analytics.totalRevenue}
      Total Transactions: ${analytics.totalTransactions}
      Total Users: ${analytics.totalUsers}
      Total Staff: ${analytics.totalStaff}
      Total Applications: ${analytics.totalApplications}
      Approval Rate: ${analytics.approvalRate}%
      Top Services: ${analytics.topServices.map((s: any) => `${s.service_name} (${s.count} uses)`).join(', ')}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiInsight(response.text as string);
    } catch (error) {
      console.error('AI Error:', error);
      setAiInsight('Failed to generate insights. Please try again later.');
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  if (user?.role === 'user') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome, {user.name}!</h1>
            <p className="text-slate-400 mt-1">Manage your digital service applications and track their progress.</p>
          </div>
          <Link 
            to="/app/services" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25"
          >
            <Briefcase size={20} /> New Application
          </Link>
        </div>

        {/* User Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
              <FileText size={24} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
            <div className="text-sm text-slate-400 font-medium mb-2">My Applications</div>
            <Link to="/app/applications" className="text-xs text-blue-400 font-bold hover:text-blue-300 flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle size={24} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.approved}</div>
            <div className="text-sm text-slate-400 font-medium mb-1">Approved</div>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Ready for download</div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 mb-4">
              <Clock size={24} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.inProgress}</div>
            <div className="text-sm text-slate-400 font-medium mb-1">In Progress</div>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Under review</div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
              <MessageSquare size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">Support</div>
            <Link to="/app/support" className="text-sm text-purple-400 font-bold hover:text-purple-300 flex items-center gap-1">
              Get Help <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-700/50 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-blue-400" /> My Applications
              </h2>
              <Link to="/app/applications" className="text-sm text-blue-400 hover:underline">View All</Link>
            </div>
            <div className="overflow-x-auto -mx-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-700/30 border-b border-slate-700/50">
                    <th className="p-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">Ref Number</th>
                    <th className="p-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">Service</th>
                    <th className="p-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">Date</th>
                    <th className="p-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="p-4 text-slate-300 font-semibold text-xs uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userApplications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">No applications found.</td>
                    </tr>
                  ) : (
                    userApplications.map((app) => (
                      <tr key={app.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="p-4">
                          <div className="text-slate-200 font-bold font-mono text-xs">{app.reference_number}</div>
                        </td>
                        <td className="p-4 text-slate-300 capitalize text-sm">{app.service_type}</td>
                        <td className="p-4 text-slate-400 text-xs">{new Date(app.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            app.status.toLowerCase() === 'approved' || app.status.toLowerCase() === 'completed' ? 'text-green-400 border-green-500/20 bg-green-500/5' :
                            app.status.toLowerCase() === 'rejected' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                            'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link 
                              to={`/app/user/applications?id=${app.id}`} 
                              className="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1"
                            >
                              <Eye size={14} /> View
                            </Link>
                            <Link 
                              to={`/track?ref=${app.reference_number}`} 
                              className="text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1"
                            >
                              <Activity size={14} /> Track
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Sparkles size={160} />
            </div>
            <h3 className="text-xl font-bold mb-2">Need Assistance?</h3>
            <p className="text-blue-100 text-sm mb-6 leading-relaxed">Our AI assistant and support team are available 24/7 to help you with your digital service needs.</p>
            <Link 
              to="/app/support" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'staff') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Staff Portal</h1>
            <p className="text-slate-400 mt-1">Manage your daily ledger entries and customer services.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/app/ledger" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all border border-slate-700"
            >
              <FileText size={20} /> Daily Ledger
            </Link>
            <Link 
              to="/app/applications" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/25"
            >
              <Activity size={20} /> Manage Applications
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-lg">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Assigned Tasks</div>
            <div className="text-3xl font-bold text-white">0</div>
            <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-0"></div>
            </div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-lg">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Review</div>
            <div className="text-3xl font-bold text-white">0</div>
            <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 w-0"></div>
            </div>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-lg">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Completed Today</div>
            <div className="text-3xl font-bold text-white">0</div>
            <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-0"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <button 
          onClick={generateAIInsight}
          disabled={isGeneratingInsight || !analytics}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
        >
          {isGeneratingInsight ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          <span>AI Insights</span>
        </button>
      </div>

      {/* AI Insight Box */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 backdrop-blur-xl rounded-3xl p-6 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-cyan-300"></div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-1">
              <Sparkles size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">AI Performance Analysis</h3>
              <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                <ReactMarkdown>{aiInsight}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Applications" 
          value={analytics?.totalApplications || 0} 
          icon={<FileText className="text-blue-400" size={24} />} 
        />
        <StatCard 
          title="Pending Applications" 
          value={analytics?.pendingApplications || 0} 
          icon={<Clock className="text-yellow-400" size={24} />} 
        />
        <StatCard 
          title="Approved Applications" 
          value={analytics?.approvedApplications || 0} 
          icon={<CheckCircle className="text-green-400" size={24} />} 
        />
        <StatCard 
          title="Rejected Applications" 
          value={analytics?.rejectedApplications || 0} 
          icon={<XCircle className="text-red-400" size={24} />} 
        />
        <StatCard 
          title="Total Revenue" 
          value={`₹${analytics?.totalRevenue || 0}`} 
          icon={<IndianRupee className="text-emerald-400" size={24} />} 
        />
        <StatCard 
          title="Today's Revenue" 
          value={`₹${analytics?.todayRevenue || 0}`} 
          icon={<TrendingUp className="text-cyan-400" size={24} />} 
        />
        <StatCard 
          title="Active Staff" 
          value={analytics?.totalStaff || 0} 
          icon={<Users className="text-purple-400" size={24} />} 
        />
        <StatCard 
          title="Approval Rate" 
          value={`${analytics?.approvalRate || 0}%`} 
          icon={<Activity className="text-pink-400" size={24} />} 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue</h3>
          {analytics?.monthlyRevenue && (
            <Line 
              data={{
                labels: analytics.monthlyRevenue.map((d: any) => d.month).reverse(),
                datasets: [{
                  label: 'Revenue (₹)',
                  data: analytics.monthlyRevenue.map((d: any) => d.revenue).reverse(),
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          )}
        </div>

        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Service Distribution</h3>
          {analytics?.serviceApplications && (
            <div className="h-64 flex justify-center">
              <Pie 
                data={{
                  labels: analytics.serviceApplications.map((d: any) => d.service_type),
                  datasets: [{
                    data: analytics.serviceApplications.map((d: any) => d.count),
                    backgroundColor: [
                      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
                    ],
                    borderWidth: 0
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { position: 'right', labels: { color: '#cbd5e1' } } 
                  }
                }}
              />
            </div>
          )}
        </div>
        
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Applications</h3>
          {analytics?.serviceApplications && (
            <Bar 
              data={{
                labels: analytics.serviceApplications.map((d: any) => d.service_type),
                datasets: [{
                  label: 'Applications',
                  data: analytics.serviceApplications.map((d: any) => d.count),
                  backgroundColor: '#8b5cf6',
                  borderRadius: 6
                }]
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          )}
        </div>

        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Staff Performance Ranking</h3>
          {analytics?.staffPerformance && (
            <Bar 
              data={{
                labels: analytics.staffPerformance.map((d: any) => d.name),
                datasets: [{
                  label: 'Processed Applications',
                  data: analytics.staffPerformance.map((d: any) => d.processed),
                  backgroundColor: '#10b981',
                  borderRadius: 6
                }]
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-lg overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-700/30 border-b border-slate-700/50">
                <th className="p-4 text-slate-300 font-semibold">User</th>
                <th className="p-4 text-slate-300 font-semibold">Service</th>
                <th className="p-4 text-slate-300 font-semibold">Action</th>
                <th className="p-4 text-slate-300 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.recentActivity?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No recent activity found.
                  </td>
                </tr>
              ) : (
                analytics?.recentActivity?.map((log: any) => (
                  <tr key={log.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 text-slate-200 font-medium">{log.user_name}</td>
                    <td className="p-4 text-slate-300">{log.service_type || 'System'}</td>
                    <td className="p-4 text-slate-400">{log.action}</td>
                    <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
  <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-lg flex items-center gap-4 transition-transform hover:-translate-y-1">
    <div className="w-14 h-14 rounded-2xl bg-slate-700/50 flex items-center justify-center border border-slate-600/50">
      {icon}
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-white mt-1">{value}</h4>
    </div>
  </div>
);

export default Dashboard;
