import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserCheck, FileText, Clock, CheckCircle, XCircle, 
  IndianRupee, Activity, Plus, FileSpreadsheet, Server, Database,
  ArrowRight, ShieldCheck, Download, Search, Bell, ChevronDown,
  User, Settings, Key, LogOut, MoreVertical, Edit, Check, X
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { safeFormat } from '../../utils/dateUtils';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStats();
    // Poll every 30 seconds for real-time feel
    const interval = setInterval(fetchStats, 30000);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      // Close action menus if clicking outside
      if (!(event.target as Element).closest('.action-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/dashboard-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login?loggedOut=true');
  };

  if (loading || !stats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { overview, appsByStatus, dailyApps, recentApplications, topServices, staffPerformance, adminLogs } = stats;

  const statCards = [
    { title: 'Total Users', value: overview.totalUsers, icon: <Users size={24} />, color: 'bg-blue-500', trend: '+12% this week' },
    { title: 'Total Staff', value: overview.totalStaff, icon: <UserCheck size={24} />, color: 'bg-indigo-500', trend: 'Active' },
    { title: 'Total Applications', value: overview.totalApplications, icon: <FileText size={24} />, color: 'bg-purple-500', trend: '+5% today' },
    { title: 'Pending Applications', value: overview.pendingApplications, icon: <Clock size={24} />, color: 'bg-amber-500', trend: 'Needs attention' },
    { title: 'Approved Applications', value: overview.approvedApplications, icon: <CheckCircle size={24} />, color: 'bg-emerald-500', trend: 'Completed' },
    { title: 'Rejected Applications', value: overview.rejectedApplications, icon: <XCircle size={24} />, color: 'bg-rose-500', trend: 'Action required' },
    { title: 'Service Revenue', value: `₹${(overview.serviceRevenue || 0).toLocaleString()}`, icon: <IndianRupee size={24} />, color: 'bg-blue-600', trend: 'From Paid Services' },
    { title: 'Total Revenue', value: `₹${(overview.totalRevenue || 0).toLocaleString()}`, icon: <IndianRupee size={24} />, color: 'bg-amber-400', trend: '+15% this month' },
  ];

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s === 'rejected') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (s === 'processing' || s === 'under review') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s === 'documents required') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Dashboard Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {new Date().toLocaleTimeString('en-IN')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search applications, users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Notification Bell */}
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 pr-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
                <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link to="/app/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                        <User size={16} className="text-slate-400" /> Profile
                      </Link>
                      <Link to="/app/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                        <Settings size={16} className="text-slate-400" /> Settings
                      </Link>
                      <Link to="/app/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                        <Key size={16} className="text-slate-400" /> Change Password
                      </Link>
                    </div>
                    <div className="p-2 border-t border-slate-100">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-left"
                      >
                        <LogOut size={16} className="text-red-400" /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl text-white ${card.color} shadow-sm`}>
                {card.icon}
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{card.trend}</span>
            </div>
            <div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Analytics - Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Applications by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={appsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {appsByStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Applications - Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Daily Applications (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyApps}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Recent Applications</h3>
            <Link to="/app/applications" className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">ID</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">User</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Service</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Date</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Status</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No recent applications</td>
                  </tr>
                ) : (
                  recentApplications.map((app: any) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-xs font-medium text-slate-900">{app.reference_number}</td>
                      <td className="p-4 text-sm text-slate-700">{app.user_name}</td>
                      <td className="p-4 text-sm text-slate-700 capitalize">{(app.service_name || app.service_type || '').replace(/-/g, ' ')}</td>
                      <td className="p-4 text-sm text-slate-500">{safeFormat(app.created_at, 'dd/MM/yyyy')}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="relative inline-block text-left action-menu-container">
                          <button 
                            onClick={() => setOpenActionMenuId(openActionMenuId === app.id ? null : app.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          <AnimatePresence>
                            {openActionMenuId === app.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-20"
                              >
                                <div className="p-1">
                                  <button 
                                    onClick={() => navigate(`/app/applications?id=${app.id}`)}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                  >
                                    <FileText size={14} /> View Details
                                  </button>
                                  <button 
                                    onClick={() => navigate(`/app/applications?id=${app.id}&action=approve`)}
                                    className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                                  >
                                    <Check size={14} /> Approve
                                  </button>
                                  <button 
                                    onClick={() => navigate(`/app/applications?id=${app.id}&action=reject`)}
                                    className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                  <button 
                                    onClick={() => navigate(`/app/applications?id=${app.id}&action=assign`)}
                                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                                  >
                                    <UserCheck size={14} /> Assign Staff
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Service Usage Analytics */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top Services</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topServices} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Performance Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Staff Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Staff Name</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider text-center">Assigned</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider text-center">Completed</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider text-center">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No staff data available</td>
                  </tr>
                ) : (
                  staffPerformance.map((staff: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {staff.staff_name.charAt(0)}
                        </div>
                        {staff.staff_name}
                      </td>
                      <td className="p-4 text-sm text-slate-700 text-center">{staff.assigned}</td>
                      <td className="p-4 text-sm text-emerald-600 font-medium text-center">{staff.completed || 0}</td>
                      <td className="p-4 text-sm text-amber-600 font-medium text-center">{staff.pending || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Action Panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/app/services" className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors text-center group">
              <Plus size={20} className="text-slate-400 group-hover:text-blue-600" />
              <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">Add Service</span>
            </Link>
            <Link to="/app/staff-management" className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors text-center group">
              <UserCheck size={20} className="text-slate-400 group-hover:text-blue-600" />
              <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">Add Staff</span>
            </Link>
            <Link to="/app/applications" className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors text-center group">
              <FileText size={20} className="text-slate-400 group-hover:text-blue-600" />
              <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">Applications</span>
            </Link>
            <Link to="/app/settings/services" className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors text-center group">
              <Settings size={20} className="text-slate-400 group-hover:text-blue-600" />
              <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">Manage Forms</span>
            </Link>
            <Link to="/app/admin/payments" className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors text-center group">
              <IndianRupee size={20} className="text-slate-400 group-hover:text-blue-600" />
              <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">Service Payments</span>
            </Link>
            <Link to="/app/ledger" className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors text-center group col-span-2">
              <FileSpreadsheet size={20} className="text-slate-400 group-hover:text-blue-600" />
              <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700">View Reports</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">System Notifications</h3>
          </div>
          <div className="p-0">
            {(!stats.systemNotifications || stats.systemNotifications.length === 0) ? (
              <div className="p-8 text-center text-slate-500">No recent notifications</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.systemNotifications.map((notif: any, idx: number) => (
                  <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Bell size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.is_read ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>{notif.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{safeFormat(notif.created_at, 'dd/MM/yyyy, hh:mm a')}</p>
                    </div>
                    {!notif.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin Activity Logs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Recent Admin Activity</h3>
          </div>
          <div className="p-0">
            {adminLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No recent activity</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {adminLogs.map((log: any, idx: number) => (
                  <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-900"><span className="font-medium">{log.admin_name}</span> {log.action}</p>
                      <p className="text-xs text-slate-500 mt-1">{safeFormat(log.timestamp, 'dd/MM/yyyy, hh:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
