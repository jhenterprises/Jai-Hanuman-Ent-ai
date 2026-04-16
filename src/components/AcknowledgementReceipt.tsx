import React from 'react';
import { CheckCircle2, Shield, FileText, User, MapPin, Activity } from 'lucide-react';
import { safeFormat } from '../utils/dateUtils';

interface AcknowledgementReceiptProps {
  application: any;
  id: string; // DOM element ID for PDF capture
}

const AcknowledgementReceipt: React.FC<AcknowledgementReceiptProps> = ({ application, id }) => {
  if (!application) return null;

  const formData = application.form_data || {};
  const submissionDate = safeFormat(application.created_at, 'dd MMMM yyyy, hh:mm a');

  const fullAddress = [
    formData.houseNo,
    formData.street,
    formData.village,
    formData.district,
    formData.state
  ].filter(Boolean).join(', ') + (formData.pincode ? ` - ${formData.pincode}` : '');

  // Get dynamic fields (excluding standard ones we already show)
  const standardFields = [
    'fullName', 'givenName', 'surname', 'dob', 'gender', 'mobile', 'email', 
    'houseNo', 'street', 'village', 'district', 'state', 'pincode',
    'fatherName', 'parentName', 'aadhaarNumber', 'panType', 'passportType',
    'serviceType', 'updateType', 'constituency', 'assemblyArea', 'placeOfBirth', 'maritalStatus'
  ];
  const dynamicFields = Object.keys(formData).filter(key => !standardFields.includes(key));

  return (
    <div id={id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-0 sm:p-8 max-w-4xl mx-auto shadow-2xl border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden transition-colors duration-300">
      {/* Header Section */}
      <div className="border-b-4 border-blue-600 p-8 bg-slate-50 dark:bg-slate-950/50 flex flex-col items-center text-center space-y-4">
        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-md flex items-center justify-center p-3 border border-slate-100 dark:border-slate-700">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem" className="w-full h-full" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">JH Digital Seva Kendra</h1>
          <p className="text-blue-600 dark:text-blue-400 font-bold tracking-[0.2em] text-sm uppercase mt-1">Application Acknowledgement</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Application ID</span>
            <span className="text-lg font-mono font-black text-amber-400">{application.reference_number}</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-widest text-blue-400 dark:text-blue-300 font-bold">Service Type</span>
            <span className="text-lg font-black text-slate-900 dark:text-white capitalize">{(application.service_name || application.service_type || '').replace(/-/g, ' ')}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">Submission Date</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{submissionDate}</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <User size={14} /> Applicant Details
            </h3>
            <div className="space-y-3">
              <DetailRow label="Full Name" value={formData.fullName || `${formData.givenName || ''} ${formData.surname || ''}`.trim() || application.user_name} />
              <DetailRow label="Father/Parent Name" value={formData.fatherName || formData.parentName} />
              <DetailRow label="Date of Birth" value={formData.dob} />
              <DetailRow label="Gender" value={formData.gender} />
              <DetailRow label="Mobile Number" value={formData.mobile || application.user_phone} />
              <DetailRow label="Email ID" value={formData.email || application.user_email} />
            </div>
          </div>

          {/* Section 2: Address & Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <MapPin size={14} /> Address & Status
            </h3>
            <div className="space-y-3">
              {fullAddress && <DetailRow label="Full Address" value={fullAddress} />}
              <DetailRow label="Aadhaar Number" value={formData.aadhaarNumber} />
              <DetailRow label="Application Status" value={application.status} highlight />
              <DetailRow label="Payment Status" value={application.payment_status || 'Pending'} highlight color={application.payment_status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
            </div>
          </div>
        </div>

        {/* Service Specific Details */}
        {(formData.panType || formData.passportType || formData.serviceType || formData.updateType || formData.constituency) && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Activity size={14} /> Service Specific Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {formData.panType && <DetailRow label="PAN Application Type" value={formData.panType} />}
              {formData.passportType && <DetailRow label="Passport Application Type" value={formData.passportType} />}
              {formData.serviceType && <DetailRow label="Service Type" value={formData.serviceType} />}
              {formData.updateType && <DetailRow label="Update Type" value={formData.updateType} />}
              {formData.constituency && <DetailRow label="Constituency" value={formData.constituency} />}
              {formData.assemblyArea && <DetailRow label="Assembly Area" value={formData.assemblyArea} />}
              {formData.placeOfBirth && <DetailRow label="Place of Birth" value={formData.placeOfBirth} />}
              {formData.maritalStatus && <DetailRow label="Marital Status" value={formData.maritalStatus} />}
            </div>
          </div>
        )}

        {/* Dynamic Form Data Section */}
        {dynamicFields.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <FileText size={14} /> Application Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {dynamicFields.map(key => (
                <DetailRow 
                  key={key} 
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ')} 
                  value={formData[key]} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText size={14} /> Submitted Documents
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {application.documents && application.documents.length > 0 ? (
              application.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{doc.file_name}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No documents uploaded.</p>
            )}
          </div>
        </div>

        {/* Footer Section */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left space-y-1">
            <p className="text-sm font-black text-slate-900 dark:text-white">JH Digital Seva Kendra</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Authorized Service Center</p>
            <p className="text-[9px] text-slate-400 italic mt-2">This is a computer-generated acknowledgement and does not require a physical signature.</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="px-6 py-2 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2">
              <Shield size={14} /> Verified Center
            </div>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Digital Signature Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, highlight = false, color = "" }: { label: string, value: string, highlight?: boolean, color?: string }) => (
  <div className="flex flex-col">
    <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-0.5">{label}</span>
    <span className={`text-sm font-bold ${highlight ? (color || 'text-blue-600 dark:text-blue-400') : 'text-slate-900 dark:text-white'} ${highlight ? 'uppercase tracking-wide' : ''}`}>
      {value || 'N/A'}
    </span>
  </div>
);

export default AcknowledgementReceipt;
