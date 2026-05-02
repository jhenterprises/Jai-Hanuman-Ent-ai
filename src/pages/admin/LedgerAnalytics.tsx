import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { TrendingUp, Users as UsersIcon, DollarSign, ArrowDownRight, ArrowUpRight, Search, Calendar } from 'lucide-react';

const LedgerAnalytics = () => {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'ledger'),
        where('date_string', '>=', dateRange.from),
        where('date_string', '<=', dateRange.to),
        orderBy('date_string', 'asc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLedger(data);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, 'ledger');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let withdrawals = 0;
    
    ledger.forEach(item => {
      const p = (item.profit_amount || 0);
      profit += p;

      if (item.type === 'credit' || item.type === 'deposit') {
        revenue += (item.principle_amount || 0);
      } else if (item.type === 'debit' || item.type === 'withdrawal') {
        withdrawals += Math.abs(item.total_amount || 0);
      }
    });

    return {
      revenue,
      profit,
      withdrawals,
      netBalance: revenue + profit - withdrawals
    };
  }, [ledger]);

  const chartData = useMemo(() => {
    const grouped: any = {};
    ledger.forEach(item => {
      const date = item.date_string;
      if (!grouped[date]) {
        grouped[date] = { date, revenue: 0, profit: 0, entries: 0 };
      }
      
      const p = (item.profit_amount || 0);
      grouped[date].profit += p;

      if (item.type === 'credit' || item.type === 'deposit') {
        grouped[date].revenue += (item.principle_amount || 0);
      }
      grouped[date].entries += 1;
    });
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [ledger]);

  const staffReport = useMemo(() => {
    const report: any = {};
    ledger.forEach(item => {
      const name = item.staff_name || 'Generic';
      if (!report[name]) {
        report[name] = { name, entries: 0, revenue: 0, profit: 0 };
      }
      report[name].entries += 1;
      
      const p = (item.profit_amount || 0);
      report[name].profit += p;

      if (item.type === 'credit' || item.type === 'deposit') {
        report[name].revenue += (item.principle_amount || 0);
      }
    });
    return Object.values(report).sort((a: any, b: any) => b.profit - a.profit);
  }, [ledger]);

  const paymentReport = useMemo(() => {
    const report: any = {};
    ledger.forEach(item => {
      const mode = item.payment_mode || 'Cash';
      if (!report[mode]) {
        report[mode] = { mode, entries: 0, revenue: 0, profit: 0, withdrawals: 0 };
      }
      report[mode].entries += 1;
      
      const p = (item.profit_amount || 0);
      report[mode].profit += p;

      if (item.type === 'credit' || item.type === 'deposit') {
        report[mode].revenue += (item.principle_amount || 0);
      } else {
        report[mode].withdrawals += Math.abs(item.total_amount || 0);
      }
    });
    return Object.values(report).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [ledger]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Ledger Analytics</h1>
          <p className="text-slate-400">Review business performance and staff activity.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-2xl border border-slate-700">
           <div className="flex items-center px-3 text-slate-400 border-r border-slate-700">
             <Calendar size={16} className="mr-2" />
             <span className="text-sm font-medium">Filter Range</span>
           </div>
           <input 
             type="date" 
             value={dateRange.from} 
             onChange={e => setDateRange({...dateRange, from: e.target.value})} 
             className="bg-transparent text-white border-0 text-sm focus:ring-0" 
           />
           <span className="text-slate-600">to</span>
           <input 
             type="date" 
             value={dateRange.to} 
             onChange={e => setDateRange({...dateRange, to: e.target.value})} 
             className="bg-transparent text-white border-0 text-sm focus:ring-0" 
           />
           <button 
             onClick={fetchData} 
             className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all"
           >
             Apply
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Principal (Revenue)" 
          value={`₹${stats.revenue.toLocaleString()}`} 
          icon={<DollarSign className="text-blue-400" />} 
          trend={12} 
        />
        <SummaryCard 
          title="Total Profit" 
          value={`₹${stats.profit.toLocaleString()}`} 
          icon={<TrendingUp className="text-green-400" />} 
          trend={8} 
        />
        <SummaryCard 
          title="Total Withdrawals" 
          value={`₹${stats.withdrawals.toLocaleString()}`} 
          icon={<ArrowDownRight className="text-red-400" />} 
          isNegative 
        />
        <SummaryCard 
          title="Net Balance" 
          value={`₹${stats.netBalance.toLocaleString()}`} 
          icon={<ArrowUpRight className="text-indigo-400" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6">Revenue & Profit Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} name="Principal" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProf)" strokeWidth={3} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6">Staff Performance Report</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-bold">Staff Name</th>
                  <th className="pb-4 font-bold text-center">Entries</th>
                  <th className="pb-4 font-bold text-right">Revenue</th>
                  <th className="pb-4 font-bold text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {staffReport.map((staff: any) => (
                  <tr key={staff.name} className="hover:bg-slate-700/20">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
                          {staff.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-200">{staff.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-center text-sm text-slate-400 font-mono">{staff.entries}</td>
                    <td className="py-4 text-right text-sm text-slate-400 font-mono">₹{staff.revenue.toLocaleString()}</td>
                    <td className="py-4 text-right text-sm font-bold text-green-400 font-mono">₹{staff.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-6">Payment Mode Split</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-bold">Mode</th>
                  <th className="pb-4 font-bold text-center">Entries</th>
                  <th className="pb-4 font-bold text-right">Revenue</th>
                  <th className="pb-4 font-bold text-right">Profit</th>
                  <th className="pb-4 font-bold text-right text-red-400">Withdrawals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {paymentReport.map((pay: any) => (
                  <tr key={pay.mode} className="hover:bg-slate-700/20">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          pay.mode === 'Cash' ? 'bg-orange-500/10 text-orange-400' : 
                          pay.mode === 'PhonePe' ? 'bg-purple-500/10 text-purple-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {pay.mode === 'GPay' ? 'GP' : pay.mode.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-200">{pay.mode}</span>
                      </div>
                    </td>
                    <td className="py-4 text-center text-sm text-slate-400 font-mono">{pay.entries}</td>
                    <td className="py-4 text-right text-sm text-slate-400 font-mono">₹{pay.revenue.toLocaleString()}</td>
                    <td className="py-4 text-right text-sm font-bold text-green-400 font-mono">₹{pay.profit.toLocaleString()}</td>
                    <td className="py-4 text-right text-sm text-red-400/80 font-mono">₹{pay.withdrawals.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon, trend, isNegative }: any) => (
  <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-900 rounded-2xl border border-slate-700">
        {icon}
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isNegative ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
          {isNegative ? '-' : '+'}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-white mt-1 font-mono">{value}</p>
    </div>
  </div>
);

export default LedgerAnalytics;
