import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, getDocs, updateDoc, doc, query, where, 
  orderBy, setDoc, serverTimestamp, limit, onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle, XCircle, Eye, Clock, User, 
  FileText, LogIn, LogOut, Calendar, TrendingUp,
  Activity, Briefcase
} from 'lucide-react';
import { safeFormat } from '../utils/dateUtils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' or 'attendance'

  useEffect(() => {
    if (!user) return;

    // Real-time Applications
    const qApps = query(collection(db, 'applications'), orderBy('created_at', 'desc'));
    const unsubscribeApps = onSnapshot(qApps, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(apps);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching applications:', err);
      setLoading(false);
    });

    // Today's Attendance Sync
    const today = format(new Date(), 'yyyy-MM-dd');
    const qToday = query(
      collection(db, 'attendance'), 
      where('userId', '==', user.uid), 
      where('date', '==', today), 
      limit(1)
    );
    
    const unsubscribeToday = onSnapshot(qToday, (snapshot) => {
      if (!snapshot.empty) {
        setTodayAttendance(snapshot.docs[0].data());
      } else {
        // Just auto-mark login if it doesn't exist yet (this only happens once a day)
        checkAttendance();
      }
    });

    // History History Sync
    const qHistory = query(
      collection(db, 'attendance'), 
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(10)
    );
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      setAttendanceHistory(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubscribeApps();
      unsubscribeToday();
      unsubscribeHistory();
    };
  }, [user]);

  const checkAttendance = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const attendanceId = `${user.uid}_${today}`;
    
    try {
      const snap = await getDocs(query(collection(db, 'attendance'), where('userId', '==', user.uid), where('date', '==', today), limit(1)));
      
      if (snap.empty) {
        const newRecord = {
          userId: user.uid,
          staff_name: user.name,
          staff_id: (user as any).staff_id || 'N/A',
          date: today,
          loginTime: new Date().toISOString(),
          logoutTime: null,
          totalHours: 0,
          status: 'Present'
        };
        await setDoc(doc(db, 'attendance', attendanceId), newRecord);
      }
    } catch (err) {
      console.error('Error auto-marking attendance:', err);
    }
  };

  const handleLogout = async () => {
    if (!user || !todayAttendance) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const attendanceId = `${user.uid}_${today}`;
    
    try {
      const logoutTime = new Date().toISOString();
      const loginTime = new Date(todayAttendance.loginTime);
      const hours = (new Date(logoutTime).getTime() - loginTime.getTime()) / (1000 * 60 * 60);
      
      await updateDoc(doc(db, 'attendance', attendanceId), {
        logoutTime,
        totalHours: Number(hours.toFixed(2))
      });
      
      setTodayAttendance({ ...todayAttendance, logoutTime, totalHours: hours });
      alert('Logout time recorded successfully. Have a great day!');
    } catch (err) {
      console.error('Error recording logout:', err);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'applications'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(apps);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const appRef = doc(db, 'applications', id);
      await updateDoc(appRef, { status, updated_at: new Date().toISOString() });
      fetchApplications();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filteredApps = applications.filter(app => app.status === filter);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white p-1 rounded-2xl flex items-center justify-center shadow-xl border border-slate-200">
            <img src={config.logo_url || "/logo.svg"} alt="JH Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Staff Portal</h1>
            <p className="text-slate-500">Welcome, {(user as any).staff_id || user?.name}</p>
          </div>
        </div>
        <div className="flex bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
          <button 
            onClick={() => setActiveTab('applications')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'applications' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
          >
            <FileText size={16} />
            Applications
          </button>
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'attendance' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-500 hover:text-white'}`}
          >
            <Clock size={16} />
            Attendance
          </button>
        </div>
      </header>

      {activeTab === 'attendance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Status */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-600/20 transition-all duration-500" />
              <h2 className="text-xl font-black text-white mb-6">Today's Shift</h2>
              
              <div className="space-y-6 relative">
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                      <LogIn size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Login Time</p>
                      <p className="text-white font-bold">{todayAttendance?.loginTime ? format(new Date(todayAttendance.loginTime), 'hh:mm a') : 'Not Logged In'}</p>
                    </div>
                  </div>
                  <CheckCircle size={20} className="text-emerald-500" />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
                      <LogOut size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Logout Time</p>
                      <p className="text-white font-bold">{todayAttendance?.logoutTime ? format(new Date(todayAttendance.logoutTime), 'hh:mm a') : 'Shift Active'}</p>
                    </div>
                  </div>
                  {!todayAttendance?.logoutTime ? (
                    <button 
                      onClick={handleLogout}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20"
                    >
                      Clock Out
                    </button>
                  ) : <CheckCircle size={20} className="text-rose-500" />}
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Total Working Hours</span>
                    <span className="text-lg font-black text-white">{todayAttendance?.totalHours || 0} hrs</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-1000" 
                      style={{ width: `${Math.min((todayAttendance?.totalHours || 0) / 8 * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-center">Your daily goal is 8 hours</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center">
                <Calendar className="mx-auto text-emerald-400 mb-2" />
                <p className="text-xs text-slate-400">Days Present</p>
                <p className="text-2xl font-black text-white">{attendanceHistory.length}</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-6 text-center">
                <TrendingUp className="mx-auto text-blue-400 mb-2" />
                <p className="text-xs text-slate-400">Avg Hours</p>
                <p className="text-2xl font-black text-white">
                  {(attendanceHistory.reduce((acc, h) => acc + (h.totalHours || 0), 0) / (attendanceHistory.length || 1)).toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <Activity className="text-blue-500" /> Recent Attendance
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-8 py-4">Date</th>
                      <th className="px-8 py-4">Clock In</th>
                      <th className="px-8 py-4">Clock Out</th>
                      <th className="px-8 py-4">Duration</th>
                      <th className="px-8 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {attendanceHistory.map((h, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-8 py-4 text-sm font-bold text-white">{format(new Date(h.date), 'dd MMM, yyyy')}</td>
                        <td className="px-8 py-4 text-xs text-slate-400">{format(new Date(h.loginTime), 'hh:mm a')}</td>
                        <td className="px-8 py-4 text-xs text-slate-400">{h.logoutTime ? format(new Date(h.logoutTime), 'hh:mm a') : '--'}</td>
                        <td className="px-8 py-4 text-xs font-mono text-blue-400">{h.totalHours || 0} hrs</td>
                        <td className="px-8 py-4 text-right">
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-black uppercase">
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {attendanceHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-12 text-center text-slate-500 italic">No attendance history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex glass p-1 rounded-2xl w-fit mb-6">
            {['Pending', 'Processing', 'Approved', 'Rejected'].map(s => (
              <button 
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === s ? 'blue-gradient text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>
          {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 glass rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="glass rounded-[2.5rem] overflow-hidden border border-white/5">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-8 py-5">Application</th>
                <th className="px-8 py-5">Citizen</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Payment</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 blue-gradient rounded-xl flex items-center justify-center text-white">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{app.service_name || app.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{app.reference_number || `#${app.id.toString().substring(0, 8)}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <User size={14} />
                      </div>
                      <div>
                        <div className="text-sm text-slate-300 font-medium">{app.user_name || app.customer_name}</div>
                        <div className="text-[9px] text-slate-500">{app.user_email || app.userEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-400">
                    {safeFormat(app.created_at, 'dd/MM/yyyy')}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${app.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {app.payment_status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/app/applications?id=${app.id}`)}
                        className="p-2 glass rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors" 
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {app.status === 'Pending' && (
                        <button 
                          onClick={() => updateStatus(app.id, 'Processing')}
                          className="p-2 glass rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors" 
                          title="Start Processing"
                        >
                          <Clock size={18} />
                        </button>
                      )}
                      {app.status === 'Processing' && (
                        <>
                          <button 
                            onClick={() => updateStatus(app.id, 'Approved')}
                            className="p-2 glass rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors" 
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => updateStatus(app.id, 'Rejected')}
                            className="p-2 glass rounded-lg text-red-400 hover:bg-red-500/20 transition-colors" 
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApps.length === 0 && (
            <div className="py-20 text-center text-slate-500 italic">
              No applications found in this category.
            </div>
          )}
        </div>
      )}
    </>
  )}
</div>
);
};

export default StaffDashboard;
