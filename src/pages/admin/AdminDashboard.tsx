import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
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
import { useAuth } from '../../context/AuthContext';
import { safeFormat } from '../../utils/dateUtils';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`;
  });
  const [showMonthModal, setShowMonthModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // 1. Add from record keys
    if (stats?.monthlyStats) {
      Object.keys(stats.monthlyStats).forEach(m => monthsSet.add(m));
    }
    
    // 2. Add last 12 calendar months to guarantee presence
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthsSet.add(`${yyyy}-${mm}`);
    }
    
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [stats?.monthlyStats]);

  useEffect(() => {
    // 1. Live Clock Interval
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 2. Real-time Status via Snapshots
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const activeDocs = snap.docs.filter((doc: any) => !doc.data().deleted_at);
      setStats((prev: any) => {
        const newStats = { ...(prev || { overview: {} }) };
        if (!newStats.overview) newStats.overview = {};
        
        const totalUsers = activeDocs.filter((doc: any) => (doc.data().role || 'user') === 'user').length;
        const totalStaff = activeDocs.filter((doc: any) => doc.data().role === 'staff').length;
        const totalAdmins = activeDocs.filter((doc: any) => doc.data().role === 'admin').length;
        
        newStats.overview.totalUsers = totalUsers;
        newStats.overview.totalStaff = totalStaff;
        newStats.overview.totalAdmins = totalAdmins;
        
        newStats.userBreakdown = [
          { name: 'Admin', value: totalAdmins, color: '#f59e0b' },
          { name: 'Staff', value: totalStaff, color: '#3b82f6' },
          { name: 'User', value: totalUsers, color: '#10b981' }
        ];
        return newStats;
      });
      setLoading(false);
    }, (err) => setError('Users: ' + err.message));

    const unsubApps = onSnapshot(collection(db, 'applications'), (snap) => {
      const activeApps = snap.docs.filter((doc: any) => !doc.data().deleted_at);
      const pendingStatuses = ['Submitted', 'Under Review', 'Processing', 'Documents Required', 'Pending'];
      const approvedStatuses = ['Approved', 'Completed'];
      
      let pending = 0;
      let approved = 0;
      let rejected = 0;
      const statusMap = new Map();
      const dailyAppsMap = new Map();
      const servicesMap = new Map();
      const staffPerfMap = new Map();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      activeApps.forEach((doc: any) => {
        const data = doc.data();
        const status = data.status || 'Unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
        
        if (pendingStatuses.includes(status)) pending++;
        if (approvedStatuses.includes(status)) approved++;
        if (status === 'Rejected') rejected++;
        
        const createdAt = (data.created_at && typeof data.created_at.toDate === 'function') ? data.created_at.toDate() : (data.created_at ? new Date(data.created_at) : null);
        if (createdAt && createdAt >= sevenDaysAgo) {
          const date = createdAt.toISOString().split('T')[0];
          dailyAppsMap.set(date, (dailyAppsMap.get(date) || 0) + 1);
        }

        const name = data.service_name || 'General';
        servicesMap.set(name, (servicesMap.get(name) || 0) + 1);

        if (data.assignedTo) {
          const staffId = data.assignedTo;
          const staffName = data.assignedToName || 'Unknown';
          if (!staffPerfMap.has(staffId)) {
            staffPerfMap.set(staffId, { staff_name: staffName, assigned: 0, completed: 0, pending: 0 });
          }
          const perf = staffPerfMap.get(staffId);
          perf.assigned++;
          if (data.status === 'Completed' || data.status === 'Approved') {
            perf.completed++;
          } else {
            perf.pending++;
          }
        }
      });

      const recentApplications = activeApps
        .sort((a: any, b: any) => {
          const timeA = a.data().created_at && typeof a.data().created_at.toDate === 'function' ? a.data().created_at.toDate().getTime() : (a.data().created_at ? new Date(a.data().created_at).getTime() : 0);
          const timeB = b.data().created_at && typeof b.data().created_at.toDate === 'function' ? b.data().created_at.toDate().getTime() : (b.data().created_at ? new Date(b.data().created_at).getTime() : 0);
          return timeB - timeA;
        })
        .slice(0, 5)
        .map((doc: any) => ({ id: doc.id, ...doc.data() }));

      const systemNotifications: any[] = [];
      if (pending > 0) {
        systemNotifications.push({
          message: `There are ${pending} pending applications waiting for review.`,
          created_at: new Date().toISOString(),
          is_read: false
        });
      }

      setStats((prev: any) => ({
        ...prev,
        overview: {
          ...(prev?.overview || {}),
          totalApplications: activeApps.length,
          pendingApplications: pending,
          approvedApplications: approved,
          rejectedApplications: rejected
        },
        appsByStatus: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
        dailyApps: Array.from(dailyAppsMap.entries()).map(([date, count]) => ({ date, count })).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        recentApplications,
        topServices: Array.from(servicesMap.entries()).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 5),
        staffPerformance: Array.from(staffPerfMap.values()),
        systemNotifications
      }));
    }, (err) => setError('Apps: ' + err.message));

    const unsubLedger = onSnapshot(collection(db, 'ledger'), (snap) => {
      const activeLedger = snap.docs.filter((doc: any) => !doc.data().deleted_at);
      let totalRev = 0;
      let serviceRev = 0;
      
      const monthlyDataMap: Record<string, { serviceRevenue: number; totalRevenue: number; count: number }> = {};

      activeLedger.forEach((doc: any) => {
        const data = doc.data();
        const principle = parseFloat(data.principle_amount || data.amount || 0) || 0;
        const profit = parseFloat(data.profit_amount || data.profit || data.fee || 0) || 0;
        const sType = data.serviceType || data.service_type || data.type || '';
        const isDebit = sType === 'Cash Withdrawal' || sType === 'Withdrawal' || data.type === 'withdrawal';
        
        let itemTotal = 0;
        let itemService = 0;
        if (!isDebit) {
          itemTotal = principle + profit;
          itemService = profit;
        } else {
          itemTotal = profit;
          itemService = profit;
        }

        totalRev += itemTotal;
        serviceRev += itemService;

        // Group by month
        let monthStr = '';
        if (data.date_string && typeof data.date_string === 'string' && data.date_string.includes('-')) {
          monthStr = data.date_string.substring(0, 7); // YYYY-MM
        } else {
          const createdAt = (data.created_at && typeof data.created_at.toDate === 'function') ? data.created_at.toDate() : (data.created_at ? new Date(data.created_at) : null);
          if (createdAt) {
            const mm = String(createdAt.getMonth() + 1).padStart(2, '0');
            monthStr = `${createdAt.getFullYear()}-${mm}`;
          } else {
            const today = new Date();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            monthStr = `${today.getFullYear()}-${mm}`;
          }
        }

        if (!monthlyDataMap[monthStr]) {
          monthlyDataMap[monthStr] = { serviceRevenue: 0, totalRevenue: 0, count: 0 };
        }
        monthlyDataMap[monthStr].serviceRevenue += itemService;
        monthlyDataMap[monthStr].totalRevenue += itemTotal;
        monthlyDataMap[monthStr].count += 1;
      });

      setStats((prev: any) => ({
        ...prev,
        overview: {
          ...(prev?.overview || {}),
          totalRevenue: totalRev,
          serviceRevenue: serviceRev
        },
        monthlyStats: monthlyDataMap
      }));
    }, (err) => setError('Ledger: ' + err.message));

    const unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(10)), (snap) => {
      setStats((prev: any) => ({
        ...prev,
        adminLogs: snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      }));
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (!(event.target as Element).closest('.action-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(clockInterval);
      unsubUsers();
      unsubApps();
      unsubLedger();
      unsubLogs();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login?loggedOut=true');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 max-w-md text-center">
          <p className="font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { 
    overview = {}, 
    appsByStatus = [], 
    dailyApps = [], 
    recentApplications = [], 
    topServices = [], 
    staffPerformance = [], 
    adminLogs = [],
    systemNotifications = []
  } = stats || {};

  const formatMonthKey = (key: string) => {
    if (!key || !key.includes('-')) return key;
    const [year, month] = key.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const mIndex = parseInt(month, 10) - 1;
    return `${monthNames[mIndex] || month} ${year}`;
  };

  const currentMonthStats = stats?.monthlyStats?.[activeMonth] || { serviceRevenue: 0, totalRevenue: 0, count: 0 };

  const statCards = [
    { title: 'Total Users', value: overview.totalUsers || 0, icon: <Users size={24} />, color: 'bg-blue-500', trend: 'Active' },
    { title: 'Total Staff', value: overview.totalStaff || 0, icon: <UserCheck size={24} />, color: 'bg-indigo-500', trend: 'Active' },
    { title: 'Total Applications', value: overview.totalApplications || 0, icon: <FileText size={24} />, color: 'bg-purple-500', trend: 'All-time' },
    { title: 'Pending Applications', value: overview.pendingApplications || 0, icon: <Clock size={24} />, color: 'bg-amber-500', trend: 'Needs attention' },
    { title: 'Approved Applications', value: overview.approvedApplications || 0, icon: <CheckCircle size={24} />, color: 'bg-emerald-500', trend: 'Completed' },
    { title: 'Rejected Applications', value: overview.rejectedApplications || 0, icon: <XCircle size={24} />, color: 'bg-rose-500', trend: 'Action required' },
    { 
      title: `Service Revenue (${formatMonthKey(activeMonth)})`, 
      value: `₹${(currentMonthStats.serviceRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: <IndianRupee size={24} />, 
      color: 'bg-blue-600', 
      trend: `${currentMonthStats.count} txns`,
      isClickable: true,
      onClick: () => setShowMonthModal(true)
    },
    { 
      title: `Total Revenue (${formatMonthKey(activeMonth)})`, 
      value: `₹${(currentMonthStats.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: <IndianRupee size={24} />, 
      color: 'bg-amber-400', 
      trend: 'Month-wise',
      isClickable: true,
      onClick: () => setShowMonthModal(true)
    },
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
          <p className="text-slate-500 text-sm mt-1">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {currentTime.toLocaleTimeString('en-IN')}
          </p>
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
        {statCards.map((card: any, idx) => {
          const isClickable = !!card.isClickable;
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={isClickable ? card.onClick : undefined}
              className={`bg-white p-5 rounded-2xl shadow-sm border transition-all flex flex-col justify-between ${
                isClickable 
                  ? 'border-blue-200 hover:border-blue-500 hover:shadow-md cursor-pointer active:scale-[0.99] group' 
                  : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl text-white ${card.color} shadow-sm transition-transform ${isClickable ? 'group-hover:scale-110' : ''}`}>
                  {card.icon}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isClickable ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-slate-100 text-slate-500'}`}>
                  {card.trend}
                </span>
              </div>
              <div>
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  {card.title}
                  {isClickable && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  )}
                </h3>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
              </div>
            </motion.div>
          );
        })}
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
                  {appsByStatus?.map((entry: any, index: number) => (
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
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Completed By</th>
                  <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No recent applications</td>
                  </tr>
                ) : (
                  recentApplications?.map((app: any) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-xs font-medium text-slate-900">{app.reference_number}</td>
                      <td className="p-4 text-sm text-slate-700">{app.user_name}</td>
                      <td className="p-4 text-sm text-slate-700 capitalize">{(app.service_name || app.name || app.service_type || '').replace(/-/g, ' ')}</td>
                      <td className="p-4 text-sm text-slate-500">{safeFormat(app.created_at, 'dd/MM/yyyy')}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-700">{app.completed_by_name || app.staff_name || <span className="text-slate-400 italic">N/A</span>}</td>
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
        <div id="staff-performance-card" className="bg-white rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 overflow-hidden flex flex-col justify-between">
          <div>
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
                    staffPerformance?.slice(0, 5).map((staff: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-medium text-slate-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {staff.staff_name.charAt(0)}
                          </div>
                          <span className="truncate max-w-[80px] block" title={staff.staff_name}>{staff.staff_name}</span>
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
        </div>

        {/* Users by Role Doughnut Chart Card */}
        <div id="users-by-role-card" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-6">Users by Role</h3>
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.userBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(stats?.userBreakdown || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-slate-800">
                  {((stats?.overview?.totalUsers || 0) + (stats?.overview?.totalStaff || 0) + (stats?.overview?.totalAdmins || 0))}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 mt-4">
            {(stats?.userBreakdown || []).map((item: any, idx: number) => {
              const total = ((stats?.overview?.totalUsers || 0) + (stats?.overview?.totalStaff || 0) + (stats?.overview?.totalAdmins || 0)) || 1;
              const pct = ((item.value / total) * 100).toFixed(0);
              return (
                <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-none">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-950">{item.value}</span>
                    <span className="text-xs text-slate-400 font-medium">({pct}%)</span>
                  </div>
                </div>
              );
            })}
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
            {systemNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No recent notifications</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {systemNotifications?.map((notif: any, idx: number) => (
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
                {adminLogs?.map((log: any, idx: number) => (
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

      {/* Month-wise Revenue Breakdown Modal */}
      <AnimatePresence>
        {showMonthModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Revenue Breakdown</h3>
                  <p className="text-sm text-slate-500 mt-1">Select a month to filter Dashboard overview stats</p>
                </div>
                <button 
                  onClick={() => setShowMonthModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Monthly List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {availableMonths.map((mStr) => {
                  const mStats = stats?.monthlyStats?.[mStr] || { serviceRevenue: 0, totalRevenue: 0, count: 0 };
                  const isActive = activeMonth === mStr;
                  const isCurrent = (() => {
                    const now = new Date();
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    return `${now.getFullYear()}-${mm}` === mStr;
                  })();

                  return (
                    <div 
                      key={mStr}
                      onClick={() => {
                        setActiveMonth(mStr);
                        setShowMonthModal(false);
                        toast.success(`Flipped dashboard statistics to ${formatMonthKey(mStr)}`);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                        isActive 
                          ? 'border-blue-500 bg-blue-50/20 shadow-sm' 
                          : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{formatMonthKey(mStr)}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase">Current</span>
                          )}
                          {isActive && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">Viewing</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Activity size={12} /> {mStats.count} Ledger transactions logged
                        </p>
                      </div>

                      <div className="flex md:flex-col items-end gap-x-4 gap-y-1 w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block">Service Revenue</span>
                          <span className="text-sm font-extrabold text-blue-600">
                            ₹{(mStats.serviceRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right ml-auto md:ml-0">
                          <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block">Total Revenue</span>
                          <span className="text-sm font-bold text-slate-700">
                            ₹{(mStats.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Close Button Panel */}
              <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0 gap-3">
                {activeMonth !== (() => {
                  const today = new Date();
                  const mm = String(today.getMonth() + 1).padStart(2, '0');
                  return `${today.getFullYear()}-${mm}`;
                })() && (
                  <button
                    onClick={() => {
                      const today = new Date();
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      setActiveMonth(`${today.getFullYear()}-${mm}`);
                      setShowMonthModal(false);
                      toast.success("Reset dashboard stats to current month");
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-all text-xs uppercase"
                  >
                    Reset Current Month
                  </button>
                )}
                <button
                  onClick={() => setShowMonthModal(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all text-xs uppercase"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
