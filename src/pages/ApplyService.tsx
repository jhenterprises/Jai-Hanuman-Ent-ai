import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { Upload, File, X, CheckCircle2, AlertCircle, User, AlertTriangle } from 'lucide-react';

const SERVICE_CONFIGS: Record<string, any> = {
  aadhaar: {
    title: 'Aadhaar Service',
    description: 'Unique Identification Authority of India',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'address', label: 'Address', type: 'textarea', required: true },
      { name: 'aadhaarNumber', label: 'Aadhaar Number (for update)', type: 'text', required: false },
      { name: 'serviceType', label: 'Service Type', type: 'select', options: ['New', 'Update', 'Download'], required: true },
    ],
    documents: ['Identity Proof', 'Address Proof', 'Photo']
  },
  pan: {
    title: 'PAN Card Service',
    description: 'Income Tax Department',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'fatherName', label: 'Father\'s Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true },
      { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'address', label: 'Address', type: 'textarea', required: true },
      { name: 'panType', label: 'PAN Type', type: 'select', options: ['New', 'Correction'], required: true },
    ],
    documents: ['Aadhaar Copy', 'Photo', 'Signature']
  },
  passport: {
    title: 'Passport Service',
    description: 'Passport Seva',
    fields: [
      { name: 'givenName', label: 'Given Name', type: 'text', required: true },
      { name: 'surname', label: 'Surname', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'placeOfBirth', label: 'Place of Birth', type: 'text', required: true },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { name: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'], required: true },
      { name: 'education', label: 'Education', type: 'text', required: true },
      { name: 'occupation', label: 'Occupation', type: 'text', required: true },
      { name: 'address', label: 'Address', type: 'textarea', required: true },
      { name: 'policeStation', label: 'Police Station', type: 'text', required: true },
      { name: 'emergencyContact', label: 'Emergency Contact', type: 'text', required: true },
    ],
    documents: ['Address Proof', 'Birth Proof', 'Photo']
  },
  voterid: {
    title: 'Voter ID Service',
    description: 'Election Commission of India',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { name: 'address', label: 'Address', type: 'textarea', required: true },
      { name: 'constituency', label: 'Constituency', type: 'text', required: true },
      { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ],
    documents: ['Age Proof', 'Address Proof', 'Photo']
  },
  income: {
    title: 'Income Certificate',
    description: 'Revenue Department Services',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'fatherName', label: 'Father\'s Name', type: 'text', required: true },
      { name: 'annualIncome', label: 'Annual Income', type: 'number', required: true },
      { name: 'purpose', label: 'Purpose', type: 'text', required: true },
      { name: 'address', label: 'Address', type: 'textarea', required: true },
    ],
    documents: ['Income Proof', 'Address Proof', 'Aadhaar Card']
  },
  caste: {
    title: 'Caste Certificate',
    description: 'Revenue Department Services',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'caste', label: 'Caste/Category', type: 'text', required: true },
      { name: 'fatherName', label: 'Father\'s Name', type: 'text', required: true },
      { name: 'address', label: 'Address', type: 'textarea', required: true },
    ],
    documents: ['Caste Proof', 'Address Proof', 'Aadhaar Card']
  },
  birth: {
    title: 'Birth Certificate',
    description: 'Municipal Services',
    fields: [
      { name: 'childName', label: 'Child\'s Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'placeOfBirth', label: 'Place of Birth', type: 'text', required: true },
      { name: 'fatherName', label: 'Father\'s Name', type: 'text', required: true },
      { name: 'motherName', label: 'Mother\'s Name', type: 'text', required: true },
    ],
    documents: ['Hospital Discharge Summary', 'Parent\'s ID Proof']
  },
  scheme: {
    title: 'Govt Scheme Application',
    description: 'State & Central Schemes',
    fields: [
      { name: 'schemeName', label: 'Scheme Name', type: 'text', required: true },
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true },
      { name: 'bankDetails', label: 'Bank A/C & IFSC', type: 'text', required: true },
    ],
    documents: ['Aadhaar Card', 'Bank Passbook', 'Income Certificate']
  },
  loan: {
    title: 'Loan Assistance',
    description: 'Banking & Financial Services',
    fields: [
      { name: 'loanType', label: 'Loan Type', type: 'select', options: ['Personal', 'Business', 'Home', 'Education'], required: true },
      { name: 'amount', label: 'Required Amount', type: 'number', required: true },
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'income', label: 'Monthly Income', type: 'number', required: true },
    ],
    documents: ['Salary Slips/ITR', 'Bank Statement', 'Aadhaar & PAN']
  },
  utility: {
    title: 'Utility Bill Payment',
    description: 'Electricity, Water & Gas',
    fields: [
      { name: 'billType', label: 'Bill Type', type: 'select', options: ['Electricity', 'Water', 'Gas', 'Broadband'], required: true },
      { name: 'consumerNumber', label: 'Consumer Number', type: 'text', required: true },
      { name: 'provider', label: 'Service Provider', type: 'text', required: true },
      { name: 'amount', label: 'Bill Amount', type: 'number', required: true },
    ],
    documents: ['Latest Bill Copy']
  },
  general: {
    title: 'General Service Application',
    description: 'Other Digital Services',
    fields: [
      { name: 'serviceName', label: 'Service Name', type: 'text', required: true },
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'details', label: 'Application Details', type: 'textarea', required: true },
    ],
    documents: ['ID Proof', 'Supporting Document']
  }
};

const ApplyService = () => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config: portalConfig } = useConfig();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkServiceStatus();
  }, [serviceType]);

  const checkServiceStatus = async () => {
    try {
      // Check global application toggle
      if (portalConfig.enable_service_applications === 0) {
        setError('Service applications are currently disabled by the administrator.');
        setIsChecking(false);
        return;
      }

      const res = await api.get('/services');
      const services = res.data;
      const currentService = services.find((s: any) => {
        const name = s.service_name.toLowerCase();
        if (serviceType === 'aadhaar' && name.includes('aadhaar')) return true;
        if (serviceType === 'pan' && name.includes('pan')) return true;
        if (serviceType === 'passport' && name.includes('passport')) return true;
        if (serviceType === 'voterid' && name.includes('voter')) return true;
        if (serviceType === 'income' && name.includes('income')) return true;
        if (serviceType === 'caste' && name.includes('caste')) return true;
        if (serviceType === 'birth' && name.includes('birth')) return true;
        if (serviceType === 'scheme' && name.includes('scheme')) return true;
        if (serviceType === 'loan' && name.includes('loan')) return true;
        if (serviceType === 'utility' && name.includes('bill')) return true;
        if (serviceType === 'general') return true;
        return false;
      });

      if (!currentService || currentService.active_status === 0) {
        setError('This service is currently inactive or unavailable.');
      }
    } catch (err) {
      console.error('Error checking service status:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const config = serviceType ? SERVICE_CONFIGS[serviceType] : null;

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!config) {
    return <div className="text-white bg-slate-800/60 p-8 rounded-3xl border border-slate-700/50 text-center">Service configuration not found.</div>;
  }

  if (error && !success) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-800/60 backdrop-blur-xl rounded-3xl p-12 border border-slate-700/50 shadow-lg text-center space-y-6">
        <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
          {portalConfig.enable_service_applications === 0 ? <AlertTriangle className="text-orange-500 w-10 h-10" /> : <AlertCircle className="text-red-500 w-10 h-10" />}
        </div>
        <h2 className="text-2xl font-bold text-white">{error}</h2>
        <button 
          onClick={() => navigate('/app/services')}
          className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
        >
          Back to Services
        </button>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate files
      const allowedTypes = (portalConfig.allowed_file_types || 'pdf,jpg,png').split(',').map((t: string) => t.trim().toLowerCase());
      const maxSizeMB = portalConfig.max_file_size || 5;
      
      const invalidFiles = selectedFiles.filter(f => {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        const isTypeValid = allowedTypes.includes(ext);
        const isSizeValid = f.size <= maxSizeMB * 1024 * 1024;
        return !isTypeValid || !isSizeValid;
      });
      
      if (invalidFiles.length > 0) {
        setError(`Some files are invalid. Only ${allowedTypes.join(', ').toUpperCase()} under ${maxSizeMB}MB are allowed.`);
        return;
      }
      
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 10)); // Max 10 files
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('service_type', serviceType || 'general');
      data.append('form_data', JSON.stringify(formData));
      
      files.forEach(file => {
        data.append('documents', file);
      });

      await api.post('/applications', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      setTimeout(() => navigate(user?.role === 'user' ? '/app/user/applications' : '/app/applications'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="text-green-500 w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Application Submitted!</h2>
        <p className="text-slate-400 max-w-md">
          Your application has been successfully submitted and is currently pending review. 
          You will be redirected to your applications page shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{config.title}</h1>
          <p className="text-slate-400">{config.description}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Details for Staff */}
          {(user?.role === 'staff' || user?.role === 'admin') && (
            <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <User size={20} />
                <h3 className="font-bold">Customer Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Customer Name *</label>
                  <input 
                    type="text" name="customerName" required
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Mobile Number *</label>
                  <input 
                    type="tel" name="customerPhone" required
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Email Address *</label>
                  <input 
                    type="email" name="customerEmail" required
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Full Address *</label>
                  <input 
                    type="text" name="customerAddress" required
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Note: If the customer has an account with this email/phone, the application will appear in their dashboard.
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {config.fields.map((field: any) => (
              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    name={field.name}
                    required={field.required}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="">Select an option</option>
                    {field.options.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    name={field.name}
                    required={field.required}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Document Upload */}
          <div className="border-t border-slate-700/50 pt-8">
            <h3 className="text-xl font-semibold text-white mb-2">Required Documents</h3>
            <p className="text-sm text-slate-400 mb-6">
              Please upload: {config.documents.join(', ')} (PDF, JPG, PNG up to 5MB)
            </p>
            
            <div className="flex flex-col items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="mb-2 text-sm text-slate-300"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-slate-500">PDF, PNG, JPG (MAX. 5MB)</p>
                </div>
                <input type="file" className="hidden" multiple onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <File className="text-blue-400" size={20} />
                      <span className="text-sm text-slate-300 truncate max-w-[200px] sm:max-w-md">{file.name}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyService;
