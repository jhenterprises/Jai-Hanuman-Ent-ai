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
  const flattenObject = (obj: any, prefix = ''): any => {
    return Object.keys(obj).reduce((acc: any, k) => {
      const pre = prefix.length ? prefix + ' ' : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const flatFormData = flattenObject(formData);
  const standardFields = [
    'fullName', 'givenName', 'surname', 'dob', 'gender', 'mobile', 'email', 
    'houseNo', 'street', 'village', 'district', 'state', 'pincode',
    'fatherName', 'parentName', 'aadhaarNumber', 'panType', 'passportType',
    'serviceType', 'updateType', 'constituency', 'assemblyArea', 'placeOfBirth', 'maritalStatus'
  ];
  const dynamicFields = Object.keys(flatFormData).filter(key => 
    !standardFields.includes(key) && flatFormData[key] !== undefined && flatFormData[key] !== null && flatFormData[key] !== ''
  );

  // These styles are applied to ensure html2canvas can render the receipt perfectly
  // and avoid oklch color crashes from Tailwind 4.
  const receiptStyles = {
    backgroundColor: '#ffffff',
    color: '#1e293b',
    borderColor: '#e2e8f0',
  };

  return (
    <div 
      id={id} 
      style={{ ...receiptStyles, width: '595pt', minHeight: '842pt', padding: '40pt' }}
      className="bg-white text-slate-900 mx-auto shadow-none pdf-safe"
    >
      {/* Header Section */}
      <div 
        style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #2563eb', padding: '16pt' }}
        className="flex flex-col items-center text-center space-y-2"
      >
        <div style={{ backgroundColor: '#ffffff', width: '40pt', height: '40pt' }} className="rounded-lg shadow-sm flex items-center justify-center p-1 border border-slate-200">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
            alt="Emblem" 
            style={{ width: '24pt', height: '24pt' }}
            crossOrigin="anonymous" 
          />
        </div>
        <div>
          <h1 style={{ color: '#0f172a', fontSize: '16pt' }} className="font-black tracking-tight uppercase">JH Digital Seva Kendra</h1>
          <p style={{ color: '#2563eb', fontSize: '9pt' }} className="font-bold tracking-[0.05em] uppercase mt-0.5">Application Acknowledgement</p>
        </div>
        <div style={{ marginTop: '12pt', color: '#0f172a', fontSize: '18pt' }} className="font-black tracking-tight border-2 border-dashed border-blue-600 p-3">
          Ref No: {application.reference_number}
        </div>
      </div>

      <div style={{ padding: '24pt 0' }} className="space-y-6">
        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24pt' }}>
          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <h3 style={{ color: '#2563eb', borderBottom: '1px solid #f1f5f9', fontSize: '9pt' }} className="font-black uppercase tracking-widest flex items-center gap-2 pb-1">
              <User size={10} /> Applicant Details
            </h3>
            <div className="space-y-2">
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
            <h3 style={{ color: '#2563eb', borderBottom: '1px solid #f1f5f9', fontSize: '9pt' }} className="font-black uppercase tracking-widest flex items-center gap-2 pb-1">
              <MapPin size={10} /> Address & Status
            </h3>
            <div className="space-y-2">
              {fullAddress && <DetailRow label="Full Address" value={fullAddress} />}
              <DetailRow label="Aadhaar Number" value={formData.aadhaarNumber} />
              <DetailRow label="Application Status" value={application.status} highlight />
              <DetailRow label="Payment Status" value={application.payment_status || 'Pending'} highlight color={application.payment_status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'} />
            </div>
          </div>
        </div>

        {/* Service Specific Details */}
        {(formData.panType || formData.passportType || formData.serviceType || formData.updateType || formData.constituency) && (
          <div className="space-y-4">
            <h3 style={{ color: '#2563eb', borderBottom: '1px solid #f1f5f9', fontSize: '9pt' }} className="font-black uppercase tracking-widest flex items-center gap-2 pb-1">
              <Activity size={10} /> Service Specific Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8pt' }}>
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
            <h3 style={{ color: '#2563eb', borderBottom: '1px solid #f1f5f9', fontSize: '9pt' }} className="font-black uppercase tracking-widest flex items-center gap-2 pb-1">
              <FileText size={10} /> Application Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8pt' }}>
              {dynamicFields.map(key => (
                <DetailRow 
                  key={key} 
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} 
                  value={flatFormData[key]} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '12pt', borderRadius: '16pt' }} className="space-y-3">
          <h3 style={{ color: '#64748b', fontSize: '9pt' }} className="font-black uppercase tracking-widest flex items-center gap-2">
            <FileText size={10} /> Submitted Documents
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8pt' }}>
            {application.documents && application.documents.length > 0 ? (
              application.documents.map((doc: any) => (
                <div key={doc.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '6pt' }} className="flex items-center gap-2 rounded-lg">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span style={{ color: '#334155', fontSize: '8pt' }} className="font-bold truncate">{doc.file_name}</span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '8pt' }} className="text-slate-400 italic">No documents uploaded.</p>
            )}
          </div>
        </div>

        {/* Footer Section */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="gap-6">
          <div className="space-y-0.5">
            <p style={{ color: '#0f172a', fontSize: '10pt' }} className="font-black">JH Digital Seva Kendra</p>
            <p style={{ color: '#64748b', fontSize: '7pt' }} className="uppercase tracking-widest font-bold">Authorized Service Center</p>
            <p style={{ color: '#94a3b8', fontSize: '6pt' }} className="italic mt-1">This is a computer-generated acknowledgement and does not require a physical signature.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4pt' }}>
            <div style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '4pt 12pt', borderRadius: '99pt', fontSize: '7pt' }} className="font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
              <Shield size={10} /> Verified Center
            </div>
            <p style={{ color: '#94a3b8', fontSize: '6pt' }} className="font-bold uppercase tracking-tighter">Digital Signature Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, highlight = false, color = "" }: { label: string, value: string, highlight?: boolean, color?: string }) => (
  <div className="flex flex-col">
    <span style={{ color: '#64748b' }} className="text-[9px] uppercase tracking-widest font-bold mb-0.5">{label}</span>
    <span 
      style={{ color: highlight ? (color ? (color.includes('emerald') ? '#059669' : color.includes('amber') ? '#d97706' : '#2563eb') : '#2563eb') : '#0f172a' }}
      className={`text-sm font-bold ${highlight ? 'uppercase tracking-wide' : ''}`}
    >
      {value || 'N/A'}
    </span>
  </div>
);

export default AcknowledgementReceipt;
