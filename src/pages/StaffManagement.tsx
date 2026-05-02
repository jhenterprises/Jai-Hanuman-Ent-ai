import React, { useEffect, useState } from 'react';
import { 
  collection, getDocs, addDoc, updateDoc, doc, query, 
  where, serverTimestamp, setDoc, getDoc, orderBy, onSnapshot, limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Plus, Trash2, Shield, User, Edit2, X, 
  UserMinus, UserCheck, Key, Filter, ChevronLeft, ChevronRight,
  Phone, Mail, Calendar, Info, Briefcase, Activity, DollarSign,
  Download, FileText, CheckCircle2, Clock, MapPin
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null, auth: any) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.uid,
      email: auth?.email,
      emailVerified: auth?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const StaffManagement = () => {
  const { user: currentUser } = useAuth();
  const [activeView, setActiveView] = useState('staff'); // 'staff', 'attendance', 'payroll'
  const [staff, setStaff] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDateFilter, setFromDateFilter] = useState(format(new Date(), 'yyyy-MM-01'));
  const [toDateFilter, setToDateFilter] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Manual Attendance State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState({
    userId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'Full Day'
  });

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    salary_amount: 0,
    staff_id: ''
  });

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    // Real-time Staff
    const qStaff = query(collection(db, 'users'), where('role', 'in', ['staff', 'admin']));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      const staffList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => !u.is_deleted);
      setStaff(staffList);
      setLoading(false);
      
      // Auto mark attendance for active staff
      if (staffList.length > 0) {
        autoMarkAttendance(staffList);
      }
    });

    // Real-time Attendance
    const qAttendance = query(collection(db, 'attendance'), orderBy('date', 'desc'), limit(100));
    const unsubscribeAttendance = onSnapshot(qAttendance, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Real-time Salaries
    const qSalaries = query(collection(db, 'salaries'), orderBy('updated_at', 'desc'), limit(100));
    const unsubscribeSalaries = onSnapshot(qSalaries, (snapshot) => {
      setSalaries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeStaff();
      unsubscribeAttendance();
      unsubscribeSalaries();
    };
  }, []); // Cleanup useEffect dependencies

  const autoMarkAttendance = async (staffList: any[]) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const activeStaff = staffList.filter(s => s.role === 'staff' && s.status === 'active');
    
    for (const s of activeStaff) {
      const attendanceId = `${s.id}_${today}`;
      const attendanceRef = doc(db, 'attendance', attendanceId);
      
      try {
        const docSnap = await getDoc(attendanceRef);
        
        if (!docSnap.exists()) {
          await setDoc(attendanceRef, {
            userId: s.id,
            staff_name: s.name,
            staff_id: s.staff_id || 'N/A',
            date: today,
            status: 'Full Day',
            updated_at: serverTimestamp(),
            isAuto: true
          });
        }
      } catch (err) {
        // Silent fail for auto-mark to not break UI, but log
        console.warn('Auto-mark attendance failed for', s.name, err);
      }
    }
  };

  const generateSalaries = async () => {
    setLoading(true);
    try {
      const staffList = staff.filter(s => s.role === 'staff');
      const start = new Date(fromDateFilter);
      const end = new Date(toDateFilter);
      
      const attendancePath = 'attendance';
      let attendanceSnap;
      try {
        attendanceSnap = await getDocs(query(
          collection(db, attendancePath),
          where('date', '>=', format(start, 'yyyy-MM-dd')),
          where('date', '<=', format(end, 'yyyy-MM-dd'))
        ));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, attendancePath, currentUser);
      }
      
      const attendanceData = attendanceSnap.docs.map(doc => doc.data());
      
      const salaryId = `${format(start, 'yyyyMMdd')}-${format(end, 'yyyyMMdd')}`;

      const salaryPromises = staffList.map(async s => {
        const staffAttendance = attendanceData.filter(a => a.userId === s.id);
        const presentDays = staffAttendance.reduce((acc, current) => {
          if (current.status === 'Full Day') return acc + 1;
          if (current.status === 'Half Day') return acc + 0.5;
          return acc;
        }, 0);
        const totalDays = eachDayOfInterval({ start, end }).length;
        const baseSalary = s.salary_amount || 0;
        const payableSalary = Math.round((baseSalary / totalDays) * presentDays);

        const currentSalaryId = `${s.id}_${salaryId}`;
        const salariesPath = `salaries/${currentSalaryId}`;
        try {
          await setDoc(doc(db, 'salaries', currentSalaryId), {
            userId: s.id,
            staff_name: s.name,
            staff_id: s.staff_id || 'N/A',
            month: salaryId,
            base_salary: baseSalary,
            total_days: totalDays,
            present_days: presentDays,
            payable_salary: payableSalary,
            status: 'Pending',
            updated_at: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, salariesPath, currentUser);
        }
      });
      await Promise.all(salaryPromises);
      alert(`Salaries generated for ${salaryId}`);
    } catch (err) {
      console.error('Error generating salaries:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('{')) {
        const info = JSON.parse(msg);
        alert(`Salary Generation Error: ${info.error} at ${info.path}`);
      } else {
        alert('Error generating salaries. Please check console.');
      }
    } finally {
      setLoading(false);
    }
  };

  const markSalaryPaid = async (salaryId: string) => {
    try {
      await updateDoc(doc(db, 'salaries', salaryId), {
        status: 'Paid',
        paid_at: serverTimestamp()
      });
    } catch (err) {
      console.error('Error marking salary as paid:', err);
    }
  };

  const generateSalarySlip = (s: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('JH Digital Seva Kendra', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Salary Slip', 105, 30, { align: 'center' });
    
    autoTable(doc, {
      body: [
        ['Staff Name', s.staff_name],
        ['Staff ID', s.staff_id],
        ['Month', s.month],
        ['Base Salary', `₹${s.base_salary}`],
        ['Days Present', `${s.present_days}/${s.total_days}`],
        ['Payable', `₹${s.payable_salary}`],
        ['Status', s.status]
      ],
      startY: 40
    });
    
    doc.save(`SalarySlip_${s.staff_name}_${s.month}.pdf`);
  };

  const exportPayrollToExcel = () => {
    const data = salaries.map(s => ({
      'Staff ID': s.staff_id,
      'Name': s.staff_name,
      'Period': s.month,
      'Base Salary': s.base_salary,
      'Days Present': s.present_days,
      'Payable': s.payable_salary,
      'Status': s.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');
    XLSX.writeFile(workbook, `Payroll_${fromDateFilter}_${toDateFilter}.xlsx`);
  };

  const exportPayrollToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Payroll Report - ${fromDateFilter} to ${toDateFilter}`, 14, 15);
    autoTable(doc, {
      head: [['Staff ID', 'Name', 'Base Salary', 'Present', 'Payable', 'Status']],
      body: salaries.map(s => [s.staff_id, s.staff_name, s.base_salary, s.present_days, s.payable_salary, s.status]),
      startY: 20
    });
    doc.save(`Payroll_${fromDateFilter}_${toDateFilter}.pdf`);
  };

  const saveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const attendanceId = selectedAttendanceId || `${attendanceData.userId}_${attendanceData.date}`;
      const staffMember = staff.find(s => s.id === attendanceData.userId);
      
      await setDoc(doc(db, 'attendance', attendanceId), {
        userId: attendanceData.userId,
        staff_name: staffMember?.name || 'Unknown',
        staff_id: staffMember?.staff_id || 'N/A',
        date: attendanceData.date,
        status: attendanceData.status,
        updated_at: serverTimestamp()
      });
      
      setShowAttendanceModal(false);
      setSelectedAttendanceId(null);
      alert('Attendance record saved successfully');
    } catch (err) {
      console.error('Error saving manual attendance:', err);
    }
  };

  const generateStaffId = async () => {
    try {
      const counterRef = doc(db, 'counters', 'staff');
      const docSnap = await getDoc(counterRef);
      let nextVal = 1;
      
      if (docSnap.exists()) {
        nextVal = docSnap.data().value + 1;
        await updateDoc(counterRef, { value: nextVal });
      } else {
        await setDoc(counterRef, { value: nextVal });
      }

      return `JH-STF-${nextVal.toString().padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating staff ID:', err);
      return 'JH-STF-XXX';
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const staffId = formData.staff_id && formData.staff_id.trim() !== '' 
        ? formData.staff_id.trim() 
        : await generateStaffId();
      await addDoc(collection(db, 'users'), {
        ...formData,
        staff_id: staffId,
        role: 'staff',
        status: 'active',
        created_at: serverTimestamp()
      });
      setShowAddModal(false);
      resetForm();
      alert(`Staff created with ID: ${staffId}. Please ask them to log in with ${formData.email}.`);
    } catch (err: any) {
      alert('Failed to create staff member: ' + err.message);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      const staffRef = doc(db, 'users', selectedStaff.id);
      await updateDoc(staffRef, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        salary_amount: Number(formData.salary_amount),
        staff_id: formData.staff_id ? formData.staff_id.trim() : selectedStaff.staff_id || '',
        updated_at: serverTimestamp()
      });
      setShowEditModal(false);
      resetForm();
      alert('Staff member updated successfully');
    } catch (err: any) {
      alert('Failed to update staff member: ' + err.message);
    }
  };

  const handleToggleStatus = async (member: any) => {
    const newStatus = member.status === 'active' ? 'disabled' : 'active';
    try {
      const staffRef = doc(db, 'users', member.id);
      await updateDoc(staffRef, { status: newStatus, updated_at: serverTimestamp() });
      alert(`Staff member ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleResetPassword = async (id: string) => {
    alert('Please use the regular "Forgot Password" flow on the login page. As an admin, you cannot directly set passwords in Firebase client-side.');
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Staff Member',
      message: 'Are you sure you want to remove this staff member? This will move them to the Recycle Bin.',
      onConfirm: async () => {
        try {
          const staffRef = doc(db, 'users', id);
          await updateDoc(staffRef, { is_deleted: true, updated_at: serverTimestamp() });
          
          // Optionally add to recycle_bin collection
          await addDoc(collection(db, 'recycle_bin'), {
            original_id: id,
            type: 'user',
            name: staff.find(s => s.id === id)?.name || 'Unknown',
            deleted_at: serverTimestamp(),
            data: staff.find(s => s.id === id) || {}
          });

          alert('Staff member moved to Recycle Bin');
        } catch (err: any) {
          alert('Failed to remove staff member: ' + err.message);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '', role: 'staff', salary_amount: 0, staff_id: '' });
    setSelectedStaff(null);
  };

  const openEditModal = (member: any) => {
    setSelectedStaff(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      password: '',
      role: 'staff',
      salary_amount: member.salary_amount || 0,
      staff_id: member.staff_id || ''
    });
    setShowEditModal(true);
  };

  // Filtering
  const filtered = staff
    .filter(s => {
      const matchesSearch = 
        s.name?.toLowerCase().includes(search.toLowerCase()) || 
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search);
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const safeFormat = (timestamp: any, formatStr: string) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
      return format(date, formatStr);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/10">
            <Briefcase size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Staff Management</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your team, their access, and performance.</p>
          </div>
        </div>
        <div className="flex bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
          <button 
            onClick={() => setActiveView('staff')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeView === 'staff' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
          >
            <User size={16} />
            Staff List
          </button>
          <button 
            onClick={() => setActiveView('attendance')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeView === 'attendance' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-400 hover:text-white'}`}
          >
            <Activity size={16} />
            Attendance
          </button>
          <button 
            onClick={() => setActiveView('payroll')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeView === 'payroll' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-white'}`}
          >
            <DollarSign size={16} />
            Payroll
          </button>
        </div>
      </div>

      {activeView === 'staff' ? (
        <>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-blue-600/20 font-bold text-sm w-fit"
            >
              <Plus size={20} />
              Add New Staff
            </button>
          </div>
          {/* Filters & Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search staff by name, email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Staff</option>
                <option value="disabled">Disabled Staff</option>
              </select>
            </div>
            <div className="flex items-center justify-end text-slate-500 text-xs font-medium">
              Total Staff: <span className="text-blue-400 ml-1 font-bold">{staff.length}</span>
            </div>
          </div>
          {/* Staff Table */}
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-700/30 border-b border-slate-700/50">
                    <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Staff Member</th>
                    <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Contact</th>
                    <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Status</th>
                    <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Joined</th>
                    <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-slate-400 text-sm font-medium">Loading staff...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-slate-500 italic">
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map(item => (
                      <tr key={item.id} className="hover:bg-slate-700/20 transition-colors group">
                        <td className="p-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500/30 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-blue-500/10">
                                {(item.name || 'S').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-slate-200 font-bold text-sm">{item.name || 'Unknown Staff'}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.staff_id || item.id}</div>
                              </div>
                            </div>
                        </td>
                        <td className="p-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-300 text-xs">
                              <Mail size={12} className="text-slate-500" />
                              {item.email}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                              <Phone size={12} className="text-slate-500" />
                              {item.phone || 'No phone'}
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            item.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {item.status === 'active' ? <UserCheck size={10} /> : <UserMinus size={10} />}
                            {item.status || 'active'}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Calendar size={12} className="text-slate-500" />
                            {safeFormat(item.created_at, 'dd MMM, yyyy')}
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditModal(item)}
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                              title="Edit Staff"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(item)}
                              className={`p-2 transition-all rounded-xl ${
                                item.status === 'active' ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={item.status === 'active' ? 'Disable Staff' : 'Enable Staff'}
                            >
                              {item.status === 'active' ? <UserMinus size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button 
                              onClick={() => handleResetPassword(item.id)}
                              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                              title="Reset Password"
                            >
                              <Key size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                              title="Remove Staff"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-5 border-t border-slate-700/30 flex items-center justify-between bg-slate-800/20">
                <span className="text-xs text-slate-500">
                  Showing <span className="text-slate-300 font-bold">{(page - 1) * itemsPerPage + 1}</span> to <span className="text-slate-300 font-bold">{Math.min(page * itemsPerPage, filtered.length)}</span> of <span className="text-slate-300 font-bold">{filtered.length}</span> staff
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                          page === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900/50 text-slate-500 hover:text-white border border-slate-700/50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : activeView === 'attendance' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-amber-500" /> Staff Attendance
            </h2>
            <button 
              onClick={() => setShowAttendanceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-all shadow-lg shadow-amber-600/20 font-bold text-xs"
            >
              <Plus size={16} />
              Manual Entry
            </button>
          </div>
          
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Staff Member</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {attendance.map((at, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-white">{format(new Date(at.date), 'dd MMM, yyyy')}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                            {at.staff_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{at.staff_name}</div>
                            <div className="text-[10px] text-slate-500">{at.staff_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          at.status === 'Full Day' ? 'bg-emerald-500/10 text-emerald-400' : 
                          at.status === 'Half Day' ? 'bg-amber-500/10 text-amber-400' : 
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {at.status}
                        </span>
                        <button 
                          onClick={() => {
                            setSelectedAttendanceId(at.id);
                            setAttendanceData({
                              userId: at.userId,
                              date: at.date,
                              status: at.status
                            });
                            setShowAttendanceModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 italic">No attendance records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <DollarSign className="text-emerald-500" /> Payroll Management
              </h2>
              <p className="text-slate-500 text-xs mt-1">Review and process monthly salaries based on attendance.</p>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={fromDateFilter}
                onChange={(e) => setFromDateFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
              <input 
                type="date"
                value={toDateFilter}
                onChange={(e) => setToDateFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
              <button 
                onClick={generateSalaries}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg font-bold text-xs disabled:opacity-50"
                disabled={loading}
              >
                <Activity size={16} />
                Generate
              </button>
              <div className="flex gap-1 border-l border-slate-700/50 pl-2">
                <button 
                  onClick={exportPayrollToExcel}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                  title="Export Excel"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={exportPayrollToPDF}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                  title="Export PDF"
                >
                  <FileText size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4">Staff Member</th>
                    <th className="px-6 py-4">Base Salary</th>
                    <th className="px-6 py-4">Attendance</th>
                    <th className="px-6 py-4">Payable</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {salaries.map((s, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                            {s.staff_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{s.staff_name}</div>
                            <div className="text-[10px] text-slate-500">{s.staff_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">₹{s.base_salary}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{s.present_days} / {s.total_days} Days</td>
                      <td className="px-6 py-4 text-sm font-black text-white">₹{s.payable_salary}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          s.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {s.status === 'Pending' && (
                          <button 
                            onClick={() => markSalaryPaid(s.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all"
                          >
                            Mark Paid
                          </button>
                        )}
                        {currentUser?.role === 'admin' && (
                          <button 
                            onClick={() => generateSalarySlip(s)}
                            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-[10px] font-bold transition-all ml-1"
                          >
                            Slip
                          </button>
                        )}
                        {s.status === 'Paid' && (
                          <span className="text-emerald-400 flex items-center justify-end gap-1 text-[10px] font-bold uppercase ml-1">
                            <CheckCircle2 size={14} /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {salaries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 italic">No payroll records for this month. Click "Generate" to create them.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{showAddModal ? 'Add Staff Member' : 'Edit Staff Details'}</h2>
                    <p className="text-slate-400 text-sm mt-1">{showAddModal ? 'Create a new staff account with system access.' : 'Update staff information and credentials.'}</p>
                  </div>
                  <button 
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={showAddModal ? handleAdd : handleEdit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Staff ID (Optional)</label>
                      <input 
                        type="text"
                        value={formData.staff_id || ''} onChange={e => setFormData({...formData, staff_id: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="Leave blank to auto-generate"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text" required
                        value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="Staff Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Email Address</label>
                      <input 
                        type="email" required
                        value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="staff@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Phone Number</label>
                      <input 
                        type="tel" required
                        value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Base Salary (Monthly)</label>
                      <input 
                        type="number" required
                        value={formData.salary_amount || 0} onChange={e => setFormData({...formData, salary_amount: Number(e.target.value)})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="15000"
                      />
                    </div>
                    {showAddModal && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Initial Password</label>
                        <input 
                          type="password" required
                          value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-blue-500 outline-none transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                      className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20"
                    >
                      {showAddModal ? 'Create Staff' : 'Update Staff'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Manual Attendance Modal */}
      <AnimatePresence>
        {showAttendanceModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAttendanceModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Manual Attendance</h2>
                    <p className="text-slate-400 text-sm mt-1">Manually record or correct staff attendance.</p>
                  </div>
                  <button onClick={() => setShowAttendanceModal(false)} className="p-2 text-slate-400 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={saveAttendance} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Staff Member</label>
                      <select 
                        required
                        value={attendanceData.userId} 
                        onChange={e => setAttendanceData({...attendanceData, userId: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-amber-500 outline-none transition-all"
                      >
                        <option value="">Select Staff</option>
                        {staff.filter(s => s.role === 'staff').map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.staff_id})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Date</label>
                      <input 
                        type="date" required
                        value={attendanceData.date} 
                        onChange={e => setAttendanceData({...attendanceData, date: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-amber-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Attendance Status</label>
                      <select 
                        required
                        value={attendanceData.status} 
                        onChange={e => setAttendanceData({...attendanceData, status: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white focus:border-amber-500 outline-none transition-all"
                      >
                        <option value="Full Day">Full Day</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowAttendanceModal(false)} className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-amber-600/20">Save Record</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffManagement;
