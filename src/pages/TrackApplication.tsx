import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useConfig } from '../context/ConfigContext';
import ModernButton from '../components/ModernButton';
import { downloadPDF } from '../utils/pdfGenerator';
import AcknowledgementReceipt from '../components/AcknowledgementReceipt';
import { safeFormat } from '../utils/dateUtils';
import { Search, FileText, CheckCircle, Clock, XCircle, Download, Calendar, User, Activity, AlertTriangle } from 'lucide-react';

const TrackApplication = () => {
  const location = useLocation();
  const { ref: urlRef } = useParams();
  const { config } = useConfig();
  const [refNumber, setRefNumber] = useState('');
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (urlRef) {
      setRefNumber(urlRef);
      fetchStatus(urlRef);
    } else {
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref');
      if (ref) {
        setRefNumber(ref);
        fetchStatus(ref);
      }
    }
  }, [location, urlRef]);

  const fetchStatus = async (ref: string) => {
    if (!ref) {
      setError('Please enter a valid reference number or mobile number.');
      return;
    }
    setLoading(true);
    setError('');
    setApplication(null);

    try {
      // First try by reference_number
      const q1 = query(collection(db, 'applications'), where('reference_number', '==', ref), limit(1));
      let querySnapshot = await getDocs(q1);

      // If not found, try by mobile number (user_phone)
      if (querySnapshot.empty) {
        const q2 = query(collection(db, 'applications'), where('user_phone', '==', ref), limit(5));
        querySnapshot = await getDocs(q2);
      }

      if (querySnapshot.empty) {
        setError('Application not found. Please check your Reference Number or Mobile Number.');
        setLoading(false);
        return;
      }

      const appData = {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data(),
        updates: querySnapshot.docs[0].data().updates || []
      };
      
      setApplication(appData);
    } catch (err: any) {
      console.error('Tracking error:', err);
      setError('An error occurred while tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNumber) return;
    fetchStatus(refNumber);
  };

  const handleDownloadPDF = async () => {
    if (!application) return;
    try {
      // Small delay to ensure styles are applied
      setTimeout(async () => {
        await downloadPDF('receipt-track', `Acknowledgement_${application.reference_number}`);
      }, 100);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'approved') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (s === 'rejected') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (s === 'processing' || s === 'under review') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (s === 'documents required') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  };

  const getStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'approved') return <CheckCircle size={18} />;
    if (s === 'rejected') return <XCircle size={18} />;
    return <Clock size={18} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-x-hidden transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {config.enable_track_application === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-orange-500/10 text-orange-600 dark:text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Tracking Disabled</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              The application tracking feature is currently disabled by the administrator. 
              Please contact support if you need assistance with your application status.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">Track Your Application</h1>
              <p className="text-slate-600 dark:text-slate-400">Enter your Reference Number or Registered Mobile Number to check status.</p>
            </div>

            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 lg:p-12 border border-slate-200 dark:border-slate-800 shadow-2xl mb-12">
              <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="Reference Number (e.g. JHDSK-20260306-0045) or Mobile" 
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <ModernButton 
                  text="Track Status" 
                  icon={Search} 
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  gradient="blue-gradient"
                  className="w-full md:w-auto"
                />
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
                  <XCircle size={18} />
                  {error}
                </div>
              )}
            </div>

            {application && (
              <div className="space-y-8 animate-fade-in">
                {/* Summary Card */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Reference Number</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{application.reference_number}</div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl border font-bold flex items-center gap-2 ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)}
                      {(application.status || '').toUpperCase()}
                    </div>
                    <div className="flex gap-2">
                      <ModernButton 
                        text="Download Acknowledgement" 
                        icon={Download} 
                        onClick={handleDownloadPDF}
                        gradient="blue-gradient"
                        className="text-xs py-2 px-4"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Service Type</div>
                        <div className="text-slate-900 dark:text-white font-semibold capitalize">{application.service_type}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Submission Date</div>
                        <div className="text-slate-900 dark:text-white font-semibold">{safeFormat(application.created_at, 'dd/MM/yyyy')}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Assigned Staff</div>
                        <div className="text-slate-900 dark:text-white font-semibold">{application.staff_name || 'Not assigned yet'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="grid grid-cols-1 gap-8">
                  {/* Timeline */}
                  <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2">
                      <Activity size={20} className="text-blue-600 dark:text-blue-400" /> Status Timeline
                    </h3>
                    <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {application.updates.map((update: any, idx: number) => (
                        <div key={update.id} className="relative pl-12">
                          <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center z-10 ${idx === application.updates.length - 1 ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-bold text-slate-900 dark:text-white">{update.status}</div>
                              <div className="text-xs text-slate-500">{safeFormat(update.updated_at, 'dd/MM/yyyy, hh:mm a')}</div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">{update.comment}</p>
                            <div className="text-[10px] text-slate-500 dark:text-slate-600 mt-1 uppercase tracking-widest font-bold">Updated by {update.updated_by_name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                      <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                      Application Details
                    </h3>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
                      <AcknowledgementReceipt application={application} id="receipt-track" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrackApplication;
