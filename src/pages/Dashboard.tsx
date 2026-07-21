import React, { useEffect, useState, useMemo } from 'react';
import { 
  collection, query, where, getDocs, orderBy, onSnapshot, doc, setDoc 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, ArrowRight, Plus, Download, Calendar, 
  Loader2, Wallet, ArrowUpRight, History, Activity,
  CheckCircle2, Clock, AlertCircle,
  Smartphone, Zap, Send, Fingerprint, User,
  Tv, Droplets, Flame, Wifi, CreditCard, UserCheck, Database,
  Sliders, Eye, EyeOff, Palette, Check, PlusCircle, Trash2,
  ChevronDown, ChevronUp, Bell, Sparkles, MessageCircle, RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { downloadPDF } from '../utils/pdfGenerator';
import AcknowledgementReceipt from '../components/AcknowledgementReceipt';
import { safeFormat } from '../utils/dateUtils';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import ServiceCard from '../components/ServiceCard';
import AnimatedCounter from '../components/AnimatedCounter';
import { useServiceControl } from '../context/ServiceControlContext';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Default layout configuration
const DEFAULT_DASHBOARD_CONFIG = {
  enabledSections: {
    welcome: true,
    announcements: true,
    stats: true,
    quickActions: true,
    services: true,
    recentActivity: true,
    charts: true
  },
  themeColor: 'blue', // 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate'
  announcements: [
    '🔥 New Services Available: PAN Services and Food Licensing are now fully functional!',
    '🔧 Scheduled Maintenance: Server updates scheduled for this Sunday between 02:00 AM and 04:00 AM.',
    '✨ Digital Seva: Apply online for PAN, Aadhaar and other essential digital services with zero hassle.',
    '🔔 Important Notice: Validate and link your Aadhaar card to your mobile for frictionless processing.'
  ],
  userCardOrder: [
    'totalApplications',
    'pendingApplications',
    'approvedApplications',
    'rejectedApplications',
    'documentsUploaded',
    'walletBalance',
    'lastLoginTime',
    'recentActivity'
  ],
  staffCardOrder: [
    'assignedApplications',
    'pendingVerification',
    'approvedToday',
    'rejectedToday',
    'todayCollection',
    'todayWithdrawal',
    'todayProfit',
    'todayClosingBalance',
    'todayLedger',
    'attendance',
    'performanceScore'
  ],
  customWidgets: [] as any[]
};

const COLOR_THEMES: Record<string, {
  name: string;
  glow: string;
  border: string;
  gradient: string;
  text: string;
  borderHover: string;
  bgBubble: string;
}> = {
  blue: {
    name: 'Sapphire Blue',
    glow: 'bg-blue-500/10 hover:bg-blue-500/15',
    border: 'border-blue-500/20',
    borderHover: 'hover:border-blue-500/50',
    gradient: 'from-blue-600 to-indigo-600',
    text: 'text-blue-600 dark:text-blue-400',
    bgBubble: 'bg-blue-500/20 text-blue-300'
  },
  emerald: {
    name: 'Emerald Mint',
    glow: 'bg-emerald-500/10 hover:bg-emerald-500/15',
    border: 'border-emerald-500/20',
    borderHover: 'hover:border-emerald-500/50',
    gradient: 'from-emerald-600 to-teal-600',
    text: 'text-emerald-600 dark:text-emerald-400',
    bgBubble: 'bg-emerald-500/20 text-emerald-300'
  },
  violet: {
    name: 'Cosmic Violet',
    glow: 'bg-violet-500/10 hover:bg-violet-500/15',
    border: 'border-violet-500/20',
    borderHover: 'hover:border-violet-500/50',
    gradient: 'from-violet-600 to-fuchsia-600',
    text: 'text-violet-600 dark:text-violet-400',
    bgBubble: 'bg-violet-500/20 text-violet-300'
  },
  amber: {
    name: 'Sunset Amber',
    glow: 'bg-amber-500/10 hover:bg-amber-500/15',
    border: 'border-amber-500/20',
    borderHover: 'hover:border-amber-500/50',
    gradient: 'from-amber-500 to-orange-500',
    text: 'text-amber-600 dark:text-amber-400',
    bgBubble: 'bg-amber-500/20 text-amber-300'
  },
  rose: {
    name: 'Rose Crimson',
    glow: 'bg-rose-500/10 hover:bg-rose-500/15',
    border: 'border-rose-500/20',
    borderHover: 'hover:border-rose-500/50',
    gradient: 'from-rose-600 to-pink-600',
    text: 'text-rose-600 dark:text-rose-400',
    bgBubble: 'bg-rose-500/20 text-rose-300'
  },
  slate: {
    name: 'Carbon Mono',
    glow: 'bg-slate-500/10 hover:bg-slate-500/15',
    border: 'border-slate-500/20',
    borderHover: 'hover:border-slate-500/50',
    gradient: 'from-slate-600 to-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    bgBubble: 'bg-slate-500/20 text-slate-200'
  }
};

const Dashboard = () => {
  const { user: currentUser } = useAuth();
  const { config: portalConfig } = useConfig();
  const { balance: walletBalance } = useWallet();
  const { theme } = useTheme();
  const { services, loading: servicesLoading } = useServiceControl();
  const navigate = useNavigate();

  // Dashboard configuration loaded dynamically from firestore settings/dashboard
  const [dashboardConfig, setDashboardConfig] = useState<typeof DEFAULT_DASHBOARD_CONFIG>(DEFAULT_DASHBOARD_CONFIG);
  
  // Real-time metrics
  const [applications, setApplications] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState('Not Marked');
  const [todayCollection, setTodayCollection] = useState(0);
  const [todayWithdrawal, setTodayWithdrawal] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [todayClosingBalance, setTodayClosingBalance] = useState(0);
  const [todayLedgerCount, setTodayLedgerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [perspective, setPerspective] = useState<'citizen' | 'operator'>('citizen');
  const [isAdminPanelExpanded, setIsAdminPanelExpanded] = useState(false);
  const [newNoticeInput, setNewNoticeInput] = useState('');
  const [newWidget, setNewWidget] = useState({ title: '', value: '', icon: 'Activity', color: 'blue' });

  const activeTheme = useMemo(() => {
    return COLOR_THEMES[dashboardConfig?.themeColor || 'blue'] || COLOR_THEMES.blue;
  }, [dashboardConfig?.themeColor]);

  // Set default perspective based on role
  useEffect(() => {
    if (currentUser?.role === 'staff' || currentUser?.role === 'admin') {
      setPerspective('operator');
    } else {
      setPerspective('citizen');
    }
  }, [currentUser]);

  // Live Clock Trigger
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Dashboard Configuration Listener (Reactive settings/dashboard)
  useEffect(() => {
    const docRef = doc(db, 'settings', 'dashboard');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        const mergedStaffCardOrder = [...new Set([...(data.staffCardOrder || []), ...DEFAULT_DASHBOARD_CONFIG.staffCardOrder])];
        setDashboardConfig({
          ...DEFAULT_DASHBOARD_CONFIG,
          ...data,
          staffCardOrder: mergedStaffCardOrder
        });
      } else {
        // Safe bootstrap initialization if not exists
        if (currentUser?.role === 'admin') {
          setDoc(docRef, DEFAULT_DASHBOARD_CONFIG);
        }
        setDashboardConfig(DEFAULT_DASHBOARD_CONFIG);
      }
    }, (error) => {
      console.warn("Could not read real-time dashboard config, using defaults:", error);
      setDashboardConfig(DEFAULT_DASHBOARD_CONFIG);
    });

    return () => unsub();
  }, [currentUser]);

  // 2. Applications Snapshot Listener (Reactive count and listings)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    let appQuery;
    if (currentUser?.role === 'staff' || currentUser?.role === 'admin') {
      // For operators, fetch all applications inside the portal to aggregate statistics
      appQuery = query(collection(db, 'applications'), orderBy('created_at', 'desc'));
    } else {
      // For citizens, secure standard client-side sandbox query
      appQuery = query(
        collection(db, 'applications'),
        where('userId', '==', user.uid),
        orderBy('created_at', 'desc')
      );
    }

    const unsubApps = onSnapshot(appQuery, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(apps);
      setLoading(false);
    }, (error) => {
      console.error("Error with application stream listener:", error);
      setLoading(false);
    });

    // Active application drafts listener
    let draftsQuery;
    if (currentUser?.role === 'staff' || currentUser?.role === 'admin') {
      draftsQuery = query(collection(db, 'application_drafts'));
    } else {
      draftsQuery = query(
        collection(db, 'application_drafts'),
        where('user_id', '==', user.uid)
      );
    }

    const unsubDrafts = onSnapshot(draftsQuery, (snapshot) => {
      const liveDrafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrafts(liveDrafts);
    }, (error) => {
      console.error("Error with drafts stream listener:", error);
    });

    return () => {
      unsubApps();
      unsubDrafts();
    };
  }, [currentUser]);

  // 3. Files (Uploaded Documents) Listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fileQuery = query(collection(db, 'documents'), where('ownerId', '==', user.uid));
    const unsubFiles = onSnapshot(fileQuery, (snapshot) => {
      setTotalDocs(snapshot.size);
    }, (error) => {
      console.error("Error with files stream listener:", error);
    });

    return () => unsubFiles();
  }, []);

  // 4. Ledger (Collection statistics today) Listener
  useEffect(() => {
    if (currentUser?.role !== 'staff' && currentUser?.role !== 'admin') return;

    const ledgerQuery = collection(db, 'ledger');
    const unsubLedger = onSnapshot(ledgerQuery, (snapshot) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const ledgerEntries = snapshot.docs
        .map(doc => doc.data())
        .filter((e: any) => e.date_string === todayStr && !e.deleted_at);

      let coll = 0;
      let wdraw = 0;
      let prof = 0;

      ledgerEntries.forEach((e: any) => {
        const principle = parseFloat(e.principle_amount || e.amount || 0) || 0;
        const profit = parseFloat(e.profit_amount || e.profit || e.fee || 0) || 0;
        const sType = e.serviceType || e.service_type || e.type || '';
        const isDebit = sType === 'Cash Withdrawal' || sType === 'Withdrawal' || e.type === 'withdrawal';
        
        const totalAmt = e.total_amount !== undefined ? parseFloat(e.total_amount) : (principle + profit);
        if (isDebit) {
          wdraw += Math.abs(totalAmt);
        } else {
          coll += Math.abs(totalAmt);
        }
        prof += profit;
      });

      // Daily closing balance from sorted snapshots
      const sortedDocs = snapshot.docs
        .filter((d: any) => !d.data().deleted_at)
        .sort((a: any, b: any) => {
          const timeA = a.data().created_at && typeof a.data().created_at.toDate === 'function' ? a.data().created_at.toDate().getTime() : (a.data().created_at ? new Date(a.data().created_at).getTime() : 0);
          const timeB = b.data().created_at && typeof b.data().created_at.toDate === 'function' ? b.data().created_at.toDate().getTime() : (b.data().created_at ? new Date(b.data().created_at).getTime() : 0);
          return timeB - timeA;
        });
      const latest = sortedDocs[0]?.data();
      const closingBal = latest ? (latest.runningBalance || latest.balance || 0) : 0;

      setTodayCollection(coll);
      setTodayWithdrawal(wdraw);
      setTodayProfit(prof);
      setTodayClosingBalance(closingBal);
      setTodayLedgerCount(ledgerEntries.length);
    }, (error) => {
      console.error("Error with ledger stream listener:", error);
    });

    return () => unsubLedger();
  }, [currentUser]);

  // 5. Staff Attendance Today Checker
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || (currentUser?.role !== 'staff' && currentUser?.role !== 'admin')) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const attQuery = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('date', '==', todayStr)
    );

    const unsubAtt = onSnapshot(attQuery, (snapshot) => {
      if (!snapshot.empty) {
        setAttendanceStatus(snapshot.docs[0].data().status || 'Present');
      } else {
        setAttendanceStatus('Not Marked');
      }
    }, (error) => {
      console.error("Error with attendance stream listener:", error);
    });

    return () => unsubAtt();
  }, [currentUser]);

  // Download PDF Acknowledgement Recipe helper
  const handleDownload = async (app: any) => {
    setDownloadingId(app.id);
    try {
      setTimeout(async () => {
        await downloadPDF(`receipt-dash-${app.id}`, `Acknowledgement_${app.reference_number}`);
        setDownloadingId(null);
      }, 500);
    } catch (err) {
      console.error('Receipt download crashed:', err);
      setDownloadingId(null);
    }
  };

  // Helper getters
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Completed': 
        return <CheckCircle2 size={16} />;
      case 'Rejected': 
        return <AlertCircle size={16} />;
      case 'Processing': 
        return <Activity size={16} className="animate-pulse" />;
      default: 
        return <Clock size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Completed': 
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Rejected': 
        return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'Processing': 
        return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
      default: 
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    }
  };

  // Dynamic Recent Activity Timeline Builder
  const timelineActivities = useMemo(() => {
    const list: any[] = [];
    applications.forEach(app => {
      const submitDate = app.created_at?.toDate ? app.created_at.toDate() : (app.created_at ? new Date(app.created_at) : null);
      if (submitDate) {
        list.push({
          id: `${app.id}_submit`,
          type: 'Application Submitted',
          service: app.service_name || app.service_type,
          ref: app.reference_number,
          date: submitDate,
          status: 'Submitted',
          statusClass: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
          desc: `Submitted for processing by JH citizen platform`
        });
      }

      if (app.status === 'Approved' || app.status === 'Completed') {
        const updateDate = app.updated_at?.toDate ? app.updated_at.toDate() : (app.updated_at ? new Date(app.updated_at) : submitDate);
        list.push({
          id: `${app.id}_approved`,
          type: 'Application Approved',
          service: app.service_name || app.service_type,
          ref: app.reference_number,
          date: updateDate || new Date(),
          status: 'Approved',
          statusClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
          desc: `Approved and digital certificate generated`
        });
      } else if (app.status === 'Rejected') {
        const updateDate = app.updated_at?.toDate ? app.updated_at.toDate() : (app.updated_at ? new Date(app.updated_at) : submitDate);
        list.push({
          id: `${app.id}_rejected`,
          type: 'Application Rejected',
          service: app.service_name || app.service_type,
          ref: app.reference_number,
          date: updateDate || new Date(),
          status: 'Rejected',
          statusClass: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
          desc: `Rejected: Incomplete credentials (contact support team)`
        });
      }
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
  }, [applications]);

  // Charts data processing
  const monthlyApplicationsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = Array(12).fill(0);
    applications.forEach(a => {
      const d = a.created_at?.toDate ? a.created_at.toDate() : (a.created_at ? new Date(a.created_at) : null);
      if (d) counts[d.getMonth()]++;
    });
    return months.map((month, idx) => ({ name: month, applications: counts[idx] }));
  }, [applications]);

  const dailyApplicationsData = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      const dateStr = d.toISOString().split('T')[0];
      const count = applications.filter(a => {
        const created = a.created_at?.toDate ? a.created_at.toDate() : (a.created_at ? new Date(a.created_at) : null);
        return created && created.toISOString().split('T')[0] === dateStr;
      }).length;
      list.push({ name: label, count });
    }
    return list;
  }, [applications]);

  const topServicesData = useMemo(() => {
    const frequencies: Record<string, number> = {};
    applications.forEach(a => {
      const sName = a.service_name || a.service_type || 'General';
      frequencies[sName] = (frequencies[sName] || 0) + 1;
    });
    return Object.entries(frequencies)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [applications]);

  const monthlyPerformanceScoreData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const totalAssigned = applications.filter(a => a.assignedTo === currentUser?.uid).length;
    const totalCompleted = applications.filter(a => a.assignedTo === currentUser?.uid && (a.status === 'Completed' || a.status === 'Approved')).length;
    const currentScore = totalAssigned === 0 ? 94 : Math.round((totalCompleted / totalAssigned) * 100);
    return months.map((m, idx) => ({
      name: m,
      score: Math.min(100, Math.max(70, currentScore - (5 - idx) * 2 + Math.floor(Math.sin(idx) * 3)))
    }));
  }, [applications, currentUser]);

  // Calculated stats card values
  const userStats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(a => ['Pending', 'Submitted', 'Processing', 'Under Review'].includes(a.status)).length;
    const approved = applications.filter(a => ['Approved', 'Completed'].includes(a.status)).length;
    const rejected = applications.filter(a => a.status === 'Rejected').length;
    const creationTimeStr = auth.currentUser?.metadata?.creationTime;
    const creationTime = creationTimeStr ? new Date(creationTimeStr) : new Date();
    const uploadTime = safeFormat(creationTime, 'dd MMM yyyy');

    return {
      totalApplications: { title: 'Total Handled', value: total, icon: <FileText size={20} />, text: 'Filed apps', color: 'bg-blue-500' },
      pendingApplications: { title: 'Pending Approval', value: pending, icon: <Clock size={20} className="animate-spin-slow" />, text: 'Verification pending', color: 'bg-amber-500' },
      approvedApplications: { title: 'Approved Licences', value: approved, icon: <CheckCircle2 size={20} />, text: 'Processed/Completed', color: 'bg-emerald-500' },
      rejectedApplications: { title: 'Rejected Submissions', value: rejected, icon: <AlertCircle size={20} />, text: 'Failed audit', color: 'bg-rose-500' },
      documentsUploaded: { title: 'Vault Documents', value: totalDocs, icon: <Database size={20} />, text: 'Uploaded secure credentials', color: 'bg-fuchsia-500' },
      walletBalance: { title: 'Wallet Vault', value: walletBalance, icon: <Wallet size={20} />, text: 'Instant payouts ready', color: 'bg-indigo-500', isCurrency: true },
      lastLoginTime: { title: 'Active Session', value: uploadTime, icon: <UserCheck size={20} />, text: 'Account registration', color: 'bg-slate-500', isString: true },
      recentActivity: { title: 'Activity (30d)', value: timelineActivities.length, icon: <Activity size={20} />, text: 'Historic triggers recorded', color: 'bg-cyan-500' }
    } as Record<string, { title: string; value: any; icon: React.ReactNode; text: string; color: string; isCurrency?: boolean; isString?: boolean; isPercent?: boolean }>;
  }, [applications, totalDocs, walletBalance, currentUser, timelineActivities]);

  const staffStats = useMemo(() => {
    const assigned = applications.filter(a => a.assignedTo === currentUser?.uid || a.assigned_to === currentUser?.uid).length;
    const totalPending = applications.filter(a => ['Pending', 'Submitted', 'Processing', 'Under Review'].includes(a.status)).length;
    const completedToday = applications.filter(a => {
      if (a.status !== 'Approved' && a.status !== 'Completed') return false;
      const tDate = a.updated_at?.toDate ? a.updated_at.toDate() : (a.updated_at ? new Date(a.updated_at) : null);
      return tDate && tDate.toDateString() === new Date().toDateString();
    }).length;
    const rejectedToday = applications.filter(a => {
      if (a.status !== 'Rejected') return false;
      const tDate = a.updated_at?.toDate ? a.updated_at.toDate() : (a.updated_at ? new Date(a.updated_at) : null);
      return tDate && tDate.toDateString() === new Date().toDateString();
    }).length;

    const assignedCount = applications.filter(a => a.assignedTo === currentUser?.uid).length;
    const completedCount = applications.filter(a => a.assignedTo === currentUser?.uid && (a.status === 'Completed' || a.status === 'Approved')).length;
    const performanceScore = assignedCount === 0 ? 94 : Math.round((completedCount / assignedCount) * 100);

    return {
      assignedApplications: { title: 'My Cases Assigned', value: assigned, icon: <UserCheck size={20} />, text: 'Awaiting your action', color: 'bg-violet-500' },
      pendingVerification: { title: 'System Backlog', value: totalPending, icon: <Clock size={20} />, text: 'Platform unverified', color: 'bg-amber-500' },
      approvedToday: { title: 'Approved Today', value: completedToday, icon: <CheckCircle2 size={20} />, text: 'Granted licenses today', color: 'bg-emerald-500' },
      rejectedToday: { title: 'Rejected Today', value: rejectedToday, icon: <AlertCircle size={20} />, text: 'Refused licenses today', color: 'bg-rose-500' },
      todayCollection: { title: 'Collection Today', value: todayCollection, icon: <Wallet size={20} />, text: 'Service fees taken', color: 'bg-blue-500', isCurrency: true },
      todayWithdrawal: { title: 'Withdrawal Today', value: todayWithdrawal, icon: <Wallet size={20} />, text: 'Outbound debits', color: 'bg-rose-500', isCurrency: true },
      todayProfit: { title: 'Profit Today', value: todayProfit, icon: <Activity size={20} />, text: 'Net fees today', color: 'bg-emerald-500', isCurrency: true },
      todayClosingBalance: { title: 'Closing Pool', value: todayClosingBalance, icon: <Wallet size={20} />, text: 'Daily closing estimate', color: 'bg-indigo-500', isCurrency: true },
      todayLedger: { title: 'Ledger Logs (Today)', value: todayLedgerCount, icon: <FileText size={20} />, text: 'Ledger entries created', color: 'bg-orange-500' },
      attendance: { title: 'Attendance Today', value: attendanceStatus, icon: <Calendar size={20} />, text: 'Roster status today', color: 'bg-teal-500', isString: true },
      performanceScore: { title: 'Performance index', value: performanceScore, icon: <Activity size={20} />, text: 'Efficiency ratio', color: 'bg-indigo-500', isPercent: true }
    } as Record<string, { title: string; value: any; icon: React.ReactNode; text: string; color: string; isCurrency?: boolean; isString?: boolean; isPercent?: boolean }>;
  }, [applications, todayCollection, todayWithdrawal, todayProfit, todayClosingBalance, todayLedgerCount, attendanceStatus, currentUser]);

  // Admin Config Updates in Firestore
  const updateDashboardConfig = async (newConfig: typeof dashboardConfig) => {
    try {
      await setDoc(doc(db, 'settings', 'dashboard'), newConfig);
      setDashboardConfig(newConfig);
    } catch (e) {
      console.error("Failed to update dashboard configuration:", e);
    }
  };

  const handleToggleSection = (section: keyof typeof dashboardConfig.enabledSections) => {
    const updated = {
      ...dashboardConfig,
      enabledSections: {
        ...dashboardConfig.enabledSections,
        [section]: !dashboardConfig.enabledSections[section]
      }
    };
    updateDashboardConfig(updated);
  };

  const handleThemeColorSelect = (color: string) => {
    const updated = { ...dashboardConfig, themeColor: color };
    updateDashboardConfig(updated);
  };

  const handleReorder = (cardKey: string, dir: 'up' | 'down', listType: 'user' | 'staff') => {
    const orderList = listType === 'user' ? [...dashboardConfig.userCardOrder] : [...dashboardConfig.staffCardOrder];
    const idx = orderList.indexOf(cardKey);
    if (idx === -1) return;

    if (dir === 'up' && idx > 0) {
      const temp = orderList[idx];
      orderList[idx] = orderList[idx - 1];
      orderList[idx - 1] = temp;
    } else if (dir === 'down' && idx < orderList.length - 1) {
      const temp = orderList[idx];
      orderList[idx] = orderList[idx + 1];
      orderList[idx + 1] = temp;
    }

    const updated = {
      ...dashboardConfig,
      [listType === 'user' ? 'userCardOrder' : 'staffCardOrder']: orderList
    };
    updateDashboardConfig(updated);
  };

  const handleAddNotice = () => {
    if (!newNoticeInput.trim()) return;
    const notices = [...(dashboardConfig.announcements || [])];
    notices.push(newNoticeInput.trim());
    const updated = { ...dashboardConfig, announcements: notices };
    updateDashboardConfig(updated);
    setNewNoticeInput('');
  };

  const handleDeleteNotice = (idx: number) => {
    const notices = [...(dashboardConfig.announcements || [])];
    notices.splice(idx, 1);
    const updated = { ...dashboardConfig, announcements: notices };
    updateDashboardConfig(updated);
  };

  const handleAddCustomWidget = () => {
    if (!newWidget.title || !newWidget.value) return;
    const widgets = [...(dashboardConfig.customWidgets || [])];
    widgets.push({
      ...newWidget,
      id: `widget_${Date.now()}`
    });
    const updated = { ...dashboardConfig, customWidgets: widgets };
    updateDashboardConfig(updated);
    setNewWidget({ title: '', value: '', icon: 'Activity', color: 'blue' });
  };

  const handleDeleteCustomWidget = (id: string) => {
    const widgets = (dashboardConfig.customWidgets || []).filter((w: any) => w.id !== id);
    const updated = { ...dashboardConfig, customWidgets: widgets };
    updateDashboardConfig(updated);
  };

  // Open Chat Trigger Helpers
  const triggerLiveChat = () => {
    window.dispatchEvent(new CustomEvent('nz-open-live-chat'));
  };

  const triggerAIChat = () => {
    window.dispatchEvent(new CustomEvent('nz-open-ai-chat'));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`space-y-8 pb-20 text-slate-900 dark:text-slate-100 min-h-screen relative`}
    >
      {/* Decorative ambient glowing circles */}
      <div className={`absolute top-0 right-1/4 w-96 h-96 rounded-full blur-[140px] opacity-[0.06] transition-colors duration-1000 ${activeTheme.glow}`} />
      <div className={`absolute -bottom-40 left-10 w-80 h-80 rounded-full blur-[120px] opacity-[0.04] transition-colors duration-1000 ${activeTheme.glow}`} />

      {/* Style element for Pause-On-Hover css scrolling marquee */}
      <style>
        {`
          @keyframes scrollingNotice {
            0% { transform: translateX(5%) }
            100% { transform: translateX(-105%) }
          }
          .animate-marquee-notice {
            animation: scrollingNotice 45s linear infinite;
          }
          .animate-marquee-notice:hover {
            animation-play-state: paused;
          }
          .animate-spin-slow {
            animation: spin 8s linear infinite;
          }
        `}
      </style>

      {/* ========================================================
          WELCOME HEADER SECTION
          ======================================================== */}
      {dashboardConfig.enabledSections.welcome && (
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
          <div className="flex items-center gap-5 relative z-10">
            <div className={`w-20 h-20 rounded-[2rem] p-1 border-2 relative group overflow-hidden bg-slate-100 dark:bg-black/45 border-slate-200 dark:border-white/10 ${activeTheme.borderHover} transition-all`}>
              <img 
                src={currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.name || 'Citizen'}`} 
                alt="Account profile avatar" 
                className="w-full h-full object-cover rounded-[1.7rem] shadow-xl hover:scale-115 transition-transform duration-300"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Hello, <span className={`${activeTheme.text}`}>{currentUser?.name?.split(' ')[0] || 'Citizen'}</span>
                </h1>
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border shadow-inner ${
                  currentUser?.role === 'admin' ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' :
                  currentUser?.role === 'staff' ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' :
                  'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {currentUser?.role || 'Citizen'}
                </span>
                
                {currentUser?.role !== 'user' && (
                  <span className="text-yellow-600 dark:text-yellow-500 text-[10px] bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">
                    Staff Verified
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5 border-r border-slate-200 dark:border-white/10 pr-4">
                  <Calendar size={13} className={`${activeTheme.text}`} /> 
                  {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="text-sky-500 dark:text-sky-400 animate-pulse" /> 
                  <span className="font-semibold text-sky-600 dark:text-sky-300 min-w-[70px]">{currentTime.toLocaleTimeString('en-IN')}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto relative z-10">
            {/* Operator View Perspective Switcher */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
              <div className="flex p-1.5 bg-slate-100 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 w-full sm:w-auto shadow-inner">
                <button
                  onClick={() => setPerspective('citizen')}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    perspective === 'citizen' ? `${activeTheme.gradient} text-white shadow-lg` : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <User size={13} /> Citizen Perspective
                </button>
                <button
                  onClick={() => setPerspective('operator')}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    perspective === 'operator' ? `${activeTheme.gradient} text-white shadow-lg` : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Sliders size={13} /> Operator Metrics
                </button>
              </div>
            )}
            
            {/* Quick Action Link */}
            <Link 
              to="/app/services" 
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 rounded-2xl text-xs uppercase tracking-widest text-white font-black hover:transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg transition-transform ${activeTheme.gradient}`}
            >
              <PlusCircle size={15} /> Apply Portal Service
            </Link>

            {/* Admin configurations layout activator */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setIsAdminPanelExpanded(!isAdminPanelExpanded)}
                className={`w-full sm:w-auto px-5 py-3.5 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs tracking-widest uppercase font-black flex items-center justify-center gap-2 text-slate-800 dark:text-indigo-300 transition-all shadow-md`}
              >
                <Palette size={15} />
                {isAdminPanelExpanded ? 'Close Settings' : 'Customize Board'}
                {isAdminPanelExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </header>
      )}

      {/* ========================================================
          ADMIN REAL-TIME DASHBOARD SETTINGS DRAWER (COLLAPSIBLE)
          ======================================================== */}
      <AnimatePresence>
        {currentUser?.role === 'admin' && isAdminPanelExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-8 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-indigo-500/20 rounded-3xl space-y-8 shadow-3xl text-slate-900 dark:text-white">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/5 pb-4">
                <Palette className="text-indigo-500 dark:text-indigo-400" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard Live Customizer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customize cards arrangement, layout color preset and scrolling notices. Reflected live on all screens.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Theme Color selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-full" /> Dynamic Theme Preset
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(COLOR_THEMES).map(([colorKey, spec]) => (
                      <button
                        key={colorKey}
                        onClick={() => handleThemeColorSelect(colorKey)}
                        className={`p-3 text-left rounded-xl border text-xs font-bold capitalize transition-all flex items-center justify-between ${
                          dashboardConfig.themeColor === colorKey 
                            ? `${spec.glow} ${spec.border} border-2 text-slate-900 dark:text-white font-extrabold` 
                            : 'bg-white dark:bg-black/25 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                      >
                        {spec.name}
                        {dashboardConfig.themeColor === colorKey && <Check size={12} className={spec.text} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Section toggles */}
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-full" /> Enable/Disable Sections
                  </h4>
                  <div className="space-y-2 bg-slate-100 dark:bg-black/25 p-4 rounded-2xl border border-slate-200 dark:border-white/5 max-h-[180px] overflow-y-auto">
                    {Object.entries(dashboardConfig.enabledSections || {}).map(([sec, enabled]) => (
                      <label key={sec} className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white cursor-pointer py-1">
                        <span className="capitalize">{sec.replace(/([A-Z])/g, ' $1')}</span>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleToggleSection(sec as any)}
                          className="w-4 h-4 bg-white dark:bg-slate-800 border-slate-300 dark:border-white/10 rounded focus:ring-0 checked:bg-blue-600 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Reorder Cards Configurator */}
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-amber-500 rounded-full" /> card order ({perspective === 'operator' ? 'Operator' : 'Citizen'} view)
                  </h4>
                  <div className="bg-slate-100 dark:bg-black/25 p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2 max-h-[180px] overflow-y-auto">
                    {(perspective === 'operator' ? dashboardConfig.staffCardOrder : dashboardConfig.userCardOrder).map((cKey, index, arr) => {
                      const spec = perspective === 'operator' ? staffStats[cKey] : userStats[cKey];
                      if (!spec) return null;
                      return (
                        <div key={cKey} className="flex items-center justify-between bg-white dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <span className="truncate max-w-[120px]">{spec.title}</span>
                          <div className="flex items-center gap-1">
                            <button
                              disabled={index === 0}
                              onClick={() => handleReorder(cKey, 'up', perspective === 'operator' ? 'staff' : 'user')}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              disabled={index === arr.length - 1}
                              onClick={() => handleReorder(cKey, 'down', perspective === 'operator' ? 'staff' : 'user')}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Announcements Manager */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-200 dark:border-white/5 pt-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-cyan-500 rounded-full" /> Scrolling announcements
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add system maintenance, offers or announcements..."
                      value={newNoticeInput}
                      onChange={(e) => setNewNoticeInput(e.target.value)}
                      className="flex-1 bg-white dark:bg-black/45 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleAddNotice}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {(dashboardConfig.announcements || []).map((note, noteIdx) => (
                      <div key={noteIdx} className="flex justify-between items-center text-xs bg-white dark:bg-white/5 rounded-xl px-3 py-2 border border-slate-200 dark:border-white/5">
                        <span className="truncate pr-4 text-slate-600 dark:text-slate-300 font-medium">{note}</span>
                        <button
                          onClick={() => handleDeleteNotice(noteIdx)}
                          className="text-rose-500 hover:text-rose-600 p-1 hover:bg-rose-500/10 rounded-md transition-all shrink-0"
                          title="Delete notice"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom widgets builder */}
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-fuchsia-500 rounded-full" /> Add Custom dashboard card
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Card Title (e.g., Target Files)"
                      value={newWidget.title}
                      onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                      className="bg-white dark:bg-black/45 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Display Value (e.g., 94, ₹2,300)"
                      value={newWidget.value}
                      onChange={(e) => setNewWidget({ ...newWidget, value: e.target.value })}
                      className="bg-white dark:bg-black/45 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={newWidget.icon}
                      onChange={(e) => setNewWidget({ ...newWidget, icon: e.target.value })}
                      className="bg-white dark:bg-black/45 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value="Activity" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Activity Heartbeat</option>
                      <option value="FileText" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">File Tracker</option>
                      <option value="Wallet" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Digital Wallet</option>
                      <option value="Users" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Users Team</option>
                      <option value="CheckCircle2" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Approved Status</option>
                    </select>
                    <select
                      value={newWidget.color}
                      onChange={(e) => setNewWidget({ ...newWidget, color: e.target.value })}
                      className="bg-white dark:bg-black/45 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value="blue" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Sapphire Blue</option>
                      <option value="emerald" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Emerald Mint</option>
                      <option value="violet" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Cosmic Violet</option>
                      <option value="amber" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Sunset Amber</option>
                      <option value="rose" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Rose Crimson</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddCustomWidget}
                    className="w-full py-2.5 bg-fuchsia-600 hover:bg-fuchsia-750 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Plus size={14} /> Deploy Custom Card
                  </button>

                  <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                    {(dashboardConfig.customWidgets || []).map((cw: any) => (
                      <div key={cw.id} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-white/5 text-[10px] font-black text-slate-700 dark:text-slate-300">
                        <span>{cw.title}</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{cw.value}</span>
                        <button
                          onClick={() => handleDeleteCustomWidget(cw.id)}
                          className="text-rose-500 font-bold ml-1 hover:text-rose-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          ANNOUNCEMENT ROLLING MARQUEE BAR
          ======================================================== */}
      {dashboardConfig.enabledSections.announcements && (dashboardConfig.announcements || []).length > 0 && (
        <section className="bg-gradient-to-r from-red-600/10 to-orange-500/10 border border-orange-500/15 rounded-3xl p-4 flex items-center gap-4 shadow-xl overflow-hidden relative">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl text-white text-[10px] uppercase font-black tracking-widest shadow-lg relative z-10 shrink-0">
            <Bell size={13} className="animate-bounce" /> NOTICE BAR
          </div>
          
          <div className="flex-1 overflow-hidden relative z-10 select-none">
            <div className="flex whitespace-nowrap animate-marquee-notice hover:cursor-grab active:cursor-grabbing">
              <span className="text-xs font-bold text-orange-900 dark:text-orange-200 tracking-wide inline-flex gap-12 pr-12">
                {(dashboardConfig.announcements || []).map((notice, idx) => (
                  <span key={idx} className="flex items-center gap-2">
                    <span className="text-red-500">•</span> {notice}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          DASHBOARD STATISTICS BENTO-GRID
          ======================================================== */}
      {dashboardConfig.enabledSections.stats && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${activeTheme.glow} rounded-2xl flex items-center justify-center ${activeTheme.text} border border-slate-200 dark:border-white/5`}>
                <Sliders size={18} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Highlights <span className={activeTheme.text}>& Assets</span>
              </h2>
            </div>
            
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
              {perspective === 'operator' ? 'Administrative view' : 'Citizen view'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* 1. Dynamic Card order renderer based on custom order */}
            {(perspective === 'operator' ? dashboardConfig.staffCardOrder : dashboardConfig.userCardOrder).map((cardKey) => {
              const cardSpec = perspective === 'operator' ? staffStats[cardKey] : userStats[cardKey];
              if (!cardSpec) return null;
              
              const isNumeric = typeof cardSpec.value === 'number';
              const displayVal = specToDisplay(cardSpec);

              return (
                <GlassCard 
                  key={cardKey} 
                  className={`p-6 border-slate-200 dark:border-white/5 relative flex flex-col justify-between overflow-hidden shadow-2xl group transition-all duration-300 min-h-[145px] bg-slate-50/50 dark:bg-black/20 ${activeTheme.borderHover}`}
                >
                  {/* Neon border focus accent */}
                  <div className={`absolute top-0 left-0 w-1 h-full bg-slate-500/50 group-hover:w-1.5 transition-all ${cardSpec.color.replace('bg-', 'bg-')}`} />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${cardSpec.color}/10 border border-slate-200/50 dark:border-white/5 ${cardSpec.color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform duration-300`}>
                      {cardSpec.icon}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest mb-1 leading-tight flex items-center gap-1.5">
                      {cardSpec.title}
                    </h3>

                    <div className="flex items-baseline gap-1.5 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {isNumeric ? (
                        <AnimatedCounter 
                          value={cardSpec.value} 
                          suffix={cardSpec.isPercent ? '%' : ''}
                          className="font-black text-slate-900 dark:text-white" 
                        />
                      ) : (
                        <span>{displayVal}</span>
                      )}
                      
                      {cardSpec.isCurrency && <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">INR</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">{cardSpec.text}</p>
                  </div>
                </GlassCard>
              );
            })}

            {/* Custom Widgets injection */}
            {(dashboardConfig.customWidgets || []).map((cw: any) => {
              const isNum = !isNaN(parseFloat(cw.value)) && isFinite(cw.value);
              const numericalVal = isNum ? parseFloat(cw.value) : 0;
              const themeSpec = COLOR_THEMES[cw.color || 'blue'] || COLOR_THEMES.blue;

              return (
                <GlassCard 
                  key={cw.id} 
                  className={`p-6 border-slate-200 dark:border-white/5 relative flex flex-col justify-between overflow-hidden shadow-2xl group transition-all duration-300 min-h-[145px] bg-slate-50/50 dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/20`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full transition-all ${themeSpec.bgBubble.replace('text-', 'bg-')}`} />
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 ${themeSpec.text}`}>
                      <Activity size={20} />
                    </div>
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteCustomWidget(cw.id)}
                        className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 bg-rose-500/5 px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest mb-1 leading-tight">
                      {cw.title}
                    </h3>
                    <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {isNum ? (
                        <AnimatedCounter value={numericalVal} className="font-black text-slate-900 dark:text-white" />
                      ) : (
                        <span>{cw.value}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">Custom administrative widget</p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================
          LARGE GRADIENT QUICK ACTIONS PANELS
          ======================================================== */}
      {dashboardConfig.enabledSections.quickActions && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${activeTheme.glow} rounded-2xl flex items-center justify-center ${activeTheme.text} border border-slate-200 dark:border-white/5`}>
              <Zap size={18} />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Action <span className={activeTheme.text}>Center</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {/* Apply Service */}
            <Link to="/app/services" className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-600/25 dark:to-blue-900/40 hover:from-blue-100 dark:hover:from-blue-600/35 dark:hover:to-blue-900/50 border border-blue-200 dark:border-blue-500/20 hover:border-blue-400 dark:hover:border-blue-500/50 rounded-3xl flex flex-col items-center justify-between gap-4 text-center group transition-all duration-300 shadow-xl hover:-translate-y-1 active:translate-y-0 relative overflow-hidden min-h-[140px]">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Plus size={24} />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Apply Service</span>
                <span className="block text-[9px] text-blue-600 dark:text-blue-300 mt-1">Submit digital filings</span>
              </div>
            </Link>

            {/* Upload Documents */}
            <Link to="/app/documents" className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-600/25 dark:to-indigo-900/40 hover:from-indigo-100 dark:hover:from-indigo-600/35 dark:hover:to-indigo-900/50 border border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-400 dark:hover:border-indigo-500/50 rounded-3xl flex flex-col items-center justify-between gap-4 text-center group transition-all duration-300 shadow-xl hover:-translate-y-1 active:translate-y-0 relative overflow-hidden min-h-[140px]">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Database size={24} />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Upload Vault</span>
                <span className="block text-[9px] text-indigo-600 dark:text-indigo-300 mt-1">Credentials and papers</span>
              </div>
            </Link>

            {/* View Applications */}
            <Link 
              to={currentUser?.role === 'user' ? '/app/user/applications' : '/app/applications'} 
              className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-600/25 dark:to-emerald-900/40 hover:from-emerald-100 dark:hover:from-emerald-600/35 dark:hover:to-emerald-900/50 border border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-3xl flex flex-col items-center justify-between gap-4 text-center group transition-all duration-300 shadow-xl hover:-translate-y-1 active:translate-y-0 relative overflow-hidden min-h-[140px]"
            >
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FileText size={24} />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Applications</span>
                <span className="block text-[9px] text-emerald-600 dark:text-emerald-300 mt-1">Review active states</span>
              </div>
            </Link>

            {/* Ledger Entry (Only if staff or admin) */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'staff') ? (
              <Link to="/app/ledger" className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-600/25 dark:to-amber-900/40 hover:from-amber-100 dark:hover:from-amber-600/35 dark:hover:to-amber-900/50 border border-amber-200 dark:border-amber-500/20 hover:border-amber-400 dark:hover:border-amber-500/50 rounded-3xl flex flex-col items-center justify-between gap-4 text-center group transition-all duration-300 shadow-xl hover:-translate-y-1 active:translate-y-0 relative overflow-hidden min-h-[140px]">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Database size={24} />
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Ledger log</span>
                  <span className="block text-[9px] text-amber-600 dark:text-amber-300 mt-1">Audit log transactions</span>
                </div>
              </Link>
            ) : (
              <div className="p-5 bg-slate-100 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5 rounded-3xl flex flex-col items-center justify-between gap-4 opacity-50 select-none grayscale text-center min-h-[140px]">
                <div className="w-12 h-12 bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-2xl flex items-center justify-center">
                  <Database size={24} />
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ledger Restricted</span>
                  <span className="block text-[9px] text-slate-500 mt-1">Staff access only</span>
                </div>
              </div>
            )}

            {/* Support Ticket */}
            <Link 
              to={currentUser?.role === 'user' ? '/app/user/support' : '/app/support'} 
              className="p-5 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-600/25 dark:to-violet-900/40 hover:from-violet-100 dark:hover:from-violet-600/35 dark:hover:to-violet-900/50 border border-violet-200 dark:border-violet-500/20 hover:border-violet-400 dark:hover:border-violet-500/50 rounded-3xl flex flex-col items-center justify-between gap-4 text-center group transition-all duration-300 shadow-xl hover:-translate-y-1 active:translate-y-0 relative overflow-hidden min-h-[140px]"
            >
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <PlusCircle size={24} />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Tickets</span>
                <span className="block text-[9px] text-violet-600 dark:text-violet-300 mt-1">Query or complaints</span>
              </div>
            </Link>

            {/* Live Support human chat */}
            <button 
              onClick={triggerLiveChat}
              className="p-5 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-600/25 dark:to-rose-900/40 hover:from-rose-100 dark:hover:from-rose-600/35 dark:hover:to-rose-900/50 border border-rose-200 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500/50 rounded-3xl flex flex-col items-center justify-between gap-4 text-center group transition-all duration-300 shadow-xl hover:-translate-y-1 active:translate-y-0 relative overflow-hidden min-h-[140px]"
            >
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <MessageCircle size={24} />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Human Support</span>
                <span className="block text-[9px] text-rose-600 dark:text-rose-300 mt-1">Official Live Chat chat</span>
              </div>
            </button>

            {/* AI Assistant Chat */}
            <button 
              onClick={triggerAIChat}
              className="p-5 bg-gradient-to-br from-fuchsia-50 to-fuchsia-100/50 dark:from-fuchsia-600/25 dark:to-fuchsia-900/40 hover:from-fuchsia-100 dark:hover:from-fuchsia-600/35 dark:hover:to-fuchsia-900/50 border border-fuchsia-200 dark:border-fuchsia-500/20 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/50 rounded-3xl flex flex-col items-center justify-between gap-4 text-center group transition-all duration-300 shadow-xl hover:-translate-y-1 active:translate-y-0 relative overflow-hidden min-h-[140px]"
            >
              <div className="w-12 h-12 bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Sparkles size={24} className="text-fuchsia-600 dark:text-fuchsia-300" />
              </div>
              <div>
                <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">AI Copilot</span>
                <span className="block text-[9px] text-fuchsia-600 dark:text-fuchsia-200 mt-1">Smart agent support</span>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ========================================================
          FINTECH DATA ANALYTICAL CHARTS (RECHARTS)
          ======================================================== */}
      {dashboardConfig.enabledSections.charts && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${activeTheme.glow} rounded-2xl flex items-center justify-center ${activeTheme.text} border border-slate-200 dark:border-white/5`}>
                <Activity size={18} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Analytical <span className={activeTheme.text}>Insights</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {perspective === 'operator' ? (
              <>
                {/* 1. Daily Application Backlog Loads */}
                <div className="bg-white/60 dark:bg-black/25 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Weekly Process Demand</h3>
                    <p className="text-[10px] text-slate-500 font-medium mb-6">Service filing activities recorded over past 7 days</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyApplicationsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                        <Tooltip 
                          cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                            color: theme === 'dark' ? '#ffffff' : '#0f172a',
                            borderRadius: '12px', 
                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' 
                          }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Operations Performance rating */}
                <div className="bg-white/60 dark:bg-black/25 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">My Performance Rating</h3>
                    <p className="text-[10px] text-slate-500 font-medium mb-6">Aggregate case response and processing index over time</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyPerformanceScoreData}>
                        <defs>
                          <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c084fc" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                            color: theme === 'dark' ? '#ffffff' : '#0f172a',
                            borderRadius: '12px', 
                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' 
                          }}
                        />
                        <Area type="monotone" dataKey="score" stroke="#c084fc" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Service Usage Analytics ratio */}
                <div className="bg-white/60 dark:bg-black/25 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Demand Density Ratio</h3>
                    <p className="text-[10px] text-slate-500 font-medium mb-6">Service types requested most by registered citizens</p>
                  </div>
                  <div className="h-64 relative">
                    {topServicesData.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 italic">No usage logged yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topServicesData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: 9, fontWeight: 'bold' }} width={80} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                              color: theme === 'dark' ? '#ffffff' : '#0f172a',
                              borderRadius: '12px', 
                              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' 
                            }}
                          />
                          <Bar dataKey="value" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Citizen user overview Area Chart */}
                <div className="bg-white/60 dark:bg-black/25 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 shadow-2xl lg:col-span-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">My Digital Fillings Curve</h3>
                    <p className="text-[10px] text-slate-500 font-medium mb-6">Total services filed by you grouped month-of-year</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyApplicationsData}>
                        <defs>
                          <linearGradient id="appliedColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={activeTheme.text.includes('text-blue-600') ? '#3b82f6' : '#22c55e'} stopOpacity={0.25}/>
                            <stop offset="95%" stopColor={activeTheme.text.includes('text-blue-600') ? '#3b82f6' : '#22c55e'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                            color: theme === 'dark' ? '#ffffff' : '#0f172a',
                            borderRadius: '12px', 
                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' 
                          }}
                        />
                        <Area type="monotone" dataKey="applications" stroke={activeTheme.text.includes('text-blue-600') ? '#3b82f6' : '#22c55e'} strokeWidth={3} fillOpacity={1} fill="url(#appliedColor)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ========================================================
          ACTIVE DRAFTS / RETRY JOURNEYS LIST
          ======================================================== */}
      <AnimatePresence>
        {drafts.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 dark:text-amber-400 border border-amber-500/15">
                <History size={18} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Awaiting <span className="text-amber-500 dark:text-amber-400">Drafts</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.slice(0, 3).map((draft) => (
                <GlassCard key={draft.id} className="p-6 border-amber-500/10 hover:border-amber-500/35 relative flex flex-col justify-between group h-full bg-slate-50/40 dark:bg-black/10">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-bl-2xl border-l border-b border-amber-500/20">
                    Draft
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-slate-200/50 dark:bg-white/5 px-2 py-0.5 rounded">ID: DFT-{draft.id?.substring(0, 6)}</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">{draft.service_name}</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{draft.service_type}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/5 text-[10px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={11} /> Saved {safeFormat(draft.created_at || new Date(), 'dd MMM yyyy')}</span>
                    <Link
                      to={`/app/user/apply/${draft.service_type?.toLowerCase().replace(/\s+/g, '-')}?draftId=${draft.id}`}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                    >
                      Resume <ArrowRight size={12} />
                    </Link>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ========================================================
            ACTIVE / SUBMITTED APPLICATIONS GRID
            ======================================================== */}
        <section className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${activeTheme.glow} rounded-2xl flex items-center justify-center ${activeTheme.text} border border-slate-200 dark:border-white/5`}>
                <FileText size={18} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Active <span className={activeTheme.text}>Filing Logs</span>
              </h2>
            </div>
            
            <Link 
              to={currentUser?.role === 'user' ? '/app/user/applications' : '/app/applications'} 
              className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
            >
              Expand logs
            </Link>
          </div>

          {applications.length === 0 ? (
            <GlassCard className="p-16 text-center space-y-6 bg-slate-50/50 dark:bg-black/10 border-slate-200/50 dark:border-white/5" hover={false}>
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-[1.8rem] flex items-center justify-center mx-auto text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-white/5">
                <FileText size={32} strokeWidth={1} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">No Active filings recorded</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">Submit a service registration journey to see it tracked in real-time on our platform.</p>
              </div>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applications.slice(0, 4).map((app) => (
                <GlassCard key={app.id} className={`p-6 flex flex-col justify-between h-full group hover:border-slate-400 dark:hover:border-slate-500/30 relative overflow-hidden bg-slate-50/60 dark:bg-black/15 border-slate-200/50 dark:border-white/5`}>
                  {downloadingId === app.id && (
                    <div className="absolute left-[-9999px] top-0 overflow-hidden" style={{ width: '800px' }}>
                      <AcknowledgementReceipt application={app} id={`receipt-dash-${app.id}`} />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-10 h-10 ${activeTheme.glow} rounded-xl flex items-center justify-center text-slate-700 dark:text-white border border-slate-200 dark:border-white/5 group-hover:rotate-3 transition-transform shrink-0`}>
                      <FileText size={20} />
                    </div>
                    
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                      {app.status || 'Submitted'}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5 mb-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {app.service_name || app.service_type || 'Custom Service'}
                    </h3>
                    <div className="flex items-center gap-2 text-[8px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest bg-slate-200/50 dark:bg-white/5 inline-flex px-2 py-0.5 rounded">
                      <span className="text-slate-600 dark:text-slate-500 font-bold">REF:</span> {app.reference_number || 'N/A'}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Date Filed</span>
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">{safeFormat(app.created_at, 'dd MMM yyyy')}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Duty Paid</span>
                      <span className={`px-2 py-0.5 rounded font-black uppercase tracking-wide text-[9px] ${
                        app.payment_status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-red-600 dark:text-red-400 bg-red-500/10'
                      }`}>
                        {app.payment_status || 'Unpaid'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-200 dark:border-white/5">
                    <Link 
                      to={`/track/${app.reference_number}`}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white flex items-center justify-center gap-1.5 transition-all"
                    >
                      Audit track <ArrowRight size={13} />
                    </Link>
                    <button 
                      onClick={() => handleDownload(app)}
                      disabled={downloadingId === app.id}
                      className="w-11 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl text-blue-600 dark:text-blue-400 flex items-center justify-center disabled:opacity-50 transition-all cursor-pointer shrink-0"
                      title="Download receipt"
                    >
                      {downloadingId === app.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================
            REAL-TIME RECENT ACTIVITY TIMELINE AUDIT
            ======================================================== */}
        {dashboardConfig.enabledSections.recentActivity && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${activeTheme.glow} rounded-2xl flex items-center justify-center ${activeTheme.text} border border-slate-200 dark:border-white/5`}>
                <History size={18} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Activity <span className={activeTheme.text}>Timeline</span>
              </h2>
            </div>

            <GlassCard className="p-6 bg-slate-50/50 dark:bg-black/15 border-slate-200/50 dark:border-white/5 rounded-3xl" hover={false}>
              {timelineActivities.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-xs">No historic activity available</div>
              ) : (
                <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-white/5">
                  {timelineActivities.map((act) => (
                    <div key={act.id} className="flex gap-4 relative items-start group">
                      <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center border shrink-0 z-10 transition-transform group-hover:scale-110 duration-200 ${
                        act.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        act.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                        'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      }`}>
                        <Activity size={12} />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">{act.type}</p>
                          <span className="text-[8px] text-slate-500 font-bold shrink-0">{safeFormat(act.date, "hh:mm a")}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1">{act.service}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[8px] text-slate-500 font-mono">REF: {act.ref}</span>
                          <span className={`text-[7px] px-2 py-0.5 rounded font-black uppercase tracking-widest border ${act.statusClass}`}>
                            {act.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </section>
        )}
      </div>
    </motion.div>
  );
};

// Inner helper definitions to unpack stats value representations
function specToDisplay(spec: any) {
  if (spec.isCurrency) {
    return '₹' + Number(spec.value).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  if (spec.isPercent) {
    return spec.value + '%';
  }
  return spec.value;
}

// Icons and colors map referenced by services section
const ICON_MAP: Record<string, any> = {
  wallet: Wallet,
  pan: FileText,
  aadhaarService: UserCheck,
};

const COLOR_MAP: Record<string, string> = {
  wallet: 'bg-slate-600',
  pan: 'bg-rose-600',
  aadhaarService: 'bg-teal-600',
};

// Mock definition block mapping lock status icons
const LockCircle = ({ size = 20, className = "" }) => (
  <span className={className}>
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <rect x="9" y="11" width="6" height="5" rx="1" />
      <path d="M12 11V9a2 2 0 0 1 4 0" />
    </svg>
  </span>
);

export default Dashboard;
