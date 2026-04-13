import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Search, Calendar, Filter, CheckCircle, XCircle, Clock, Download, ArrowLeft, Wallet, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { safeFormat } from '../../utils/dateUtils';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [revenueStats, setRevenueStats] = useState<any>(null);

  useEffect(() => {
    fetchPayments();
    fetchRevenue();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await api.get('/admin/payments');
      setPayments(res.data);
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      if (err.message?.includes('HTML')) {
        // Silent fail for HTML responses
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      const res = await api.get('/admin/revenue');
      setRevenueStats(res.data);
    } catch (err: any) {
      console.error('Error fetching revenue stats:', err);
      if (err.message?.includes('HTML')) {
        // Silent fail for HTML responses
      }
    }
  };

  const filteredPayments = payments.filter(p => 
    p.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.razorpay_payment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.razorpay_order_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'failed': return <XCircle size={16} className="text-rose-500" />;
      default: return <Clock size={16} className="text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/app/admin" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Payments</h1>
          <p className="text-slate-500 text-sm">Monitor all digital service transactions</p>
        </div>
      </div>

      {revenueStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-slate-900">₹{(revenueStats.total_revenue || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-1">Total Transactions</p>
            <p className="text-3xl font-bold text-slate-900">{revenueStats.total_payments || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-1">Successful Payments</p>
            <p className="text-3xl font-bold text-emerald-600">{revenueStats.total_payments || 0}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by user, service or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all">
              <Calendar size={16} /> Date Range
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all">
              <Filter size={16} /> Filter
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Transaction ID</th>
                <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">User</th>
                <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Service</th>
                <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Mode</th>
                <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Amount</th>
                <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Date</th>
                <th className="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Loading payments...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">No payments found</td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-xs font-medium text-slate-900">{payment.razorpay_payment_id || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Order: {payment.razorpay_order_id}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-900">{payment.user_name}</div>
                      <div className="text-xs text-slate-500">{payment.user_email}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-700">{payment.service_name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {payment.payment_mode === 'wallet' ? (
                          <div className="p-1 bg-emerald-100 rounded text-emerald-600" title="Wallet Payment">
                            <Wallet size={12} />
                          </div>
                        ) : (
                          <div className="p-1 bg-blue-100 rounded text-blue-600" title="Gateway Payment">
                            <CreditCard size={12} />
                          </div>
                        )}
                        <span className="text-xs font-medium capitalize text-slate-600">{payment.payment_mode || 'gateway'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-900">₹{(payment.amount || 0).toLocaleString()}</td>
                    <td className="p-4 text-sm text-slate-500">{safeFormat(payment.created_at, 'dd/MM/yyyy, hh:mm a')}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(payment.payment_status)}
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          payment.payment_status === 'success' ? 'text-emerald-600' : 
                          payment.payment_status === 'failed' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          {payment.payment_status}
                        </span>
                      </div>
                    </td>
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

export default AdminPayments;
