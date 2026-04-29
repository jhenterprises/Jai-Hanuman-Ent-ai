import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import ModernButton from '../components/ModernButton';
import { Upload, File, X, CheckCircle2, AlertCircle, User, AlertTriangle, Download, Shield, Activity, ArrowLeft, Loader2, Printer, QrCode, Send, Rocket, Wallet as WalletIcon } from 'lucide-react';
import { downloadPDF } from '../utils/pdfGenerator';
import AcknowledgementReceipt from '../components/AcknowledgementReceipt';
import { getRazorpayKey } from '../utils/razorpayUtils';

const SERVICE_CONFIGS: Record<string, any> = {
  aadhaar: {
    title: 'Aadhaar Service',
    authority: 'Unique Identification Authority of India (UIDAI)',
    description: 'Apply for New Aadhaar or Update existing Aadhaar details.',
    sections: [
      {
        id: 'personal',
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { name: 'parentName', label: 'Father / Mother / Spouse Name', type: 'text', required: true },
        ]
      },
      {
        id: 'address',
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'houseNo', label: 'House Number', type: 'text', required: true },
          { name: 'street', label: 'Street / Area', type: 'text', required: true },
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true, pattern: '^[0-9]{6}$' },
        ]
      },
      {
        id: 'identity',
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, pattern: '^[0-9]{10}$' },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
          { name: 'aadhaarNumber', label: 'Aadhaar Number (for update)', type: 'text', required: false },
        ]
      },
      {
        id: 'service',
        title: 'SECTION 4 – Service Details',
        fields: [
          { name: 'serviceType', label: 'Service Type', type: 'select', options: ['New Enrollment', 'Update Details', 'Download e-Aadhaar'], required: true },
          { name: 'updateType', label: 'Update Type (if applicable)', type: 'select', options: ['Name', 'Address', 'DOB', 'Mobile', 'Biometrics'], required: false },
        ]
      }
    ],
    documents: ['Photo', 'Identity Proof', 'Address Proof', 'Age Proof']
  },
  pan: {
    title: 'PAN Card Service',
    authority: 'Income Tax Department, Govt of India',
    description: 'Application for Permanent Account Number (PAN).',
    sections: [
      {
        id: 'personal',
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { name: 'fatherName', label: 'Father\'s Name', type: 'text', required: true },
        ]
      },
      {
        id: 'address',
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'houseNo', label: 'House Number', type: 'text', required: true },
          { name: 'street', label: 'Street / Area', type: 'text', required: true },
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true, pattern: '^[0-9]{6}$' },
        ]
      },
      {
        id: 'identity',
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, pattern: '^[0-9]{10}$' },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
          { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true },
        ]
      },
      {
        id: 'service',
        title: 'SECTION 4 – Service Details',
        fields: [
          { name: 'panType', label: 'PAN Application Type', type: 'select', options: ['New PAN - Indian Citizen', 'New PAN - Foreign Citizen', 'Correction in Existing PAN'], required: true },
        ]
      }
    ],
    documents: ['Photo', 'Identity Proof', 'Address Proof', 'Age Proof']
  },
  voterid: {
    title: 'Voter ID Service',
    authority: 'Election Commission of India',
    description: 'Form 6 - Application for inclusion of name in electoral roll.',
    sections: [
      {
        id: 'personal',
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { name: 'parentName', label: 'Father / Mother / Spouse Name', type: 'text', required: true },
        ]
      },
      {
        id: 'address',
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'houseNo', label: 'House Number', type: 'text', required: true },
          { name: 'street', label: 'Street / Area', type: 'text', required: true },
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true, pattern: '^[0-9]{6}$' },
        ]
      },
      {
        id: 'identity',
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, pattern: '^[0-9]{10}$' },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
          { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: false },
        ]
      },
      {
        id: 'election',
        title: 'SECTION 4 – Election Details',
        fields: [
          { name: 'constituency', label: 'Constituency', type: 'text', required: true },
          { name: 'assemblyArea', label: 'Assembly Area', type: 'text', required: true },
          { name: 'previousVoterId', label: 'Previous Voter ID (optional)', type: 'text', required: false },
        ]
      }
    ],
    documents: ['Photo', 'Age Proof', 'Address Proof', 'Identity Proof']
  },
  passport: {
    title: 'Passport Service',
    authority: 'Ministry of External Affairs, Govt of India',
    description: 'Application for Fresh Passport or Re-issue of Passport.',
    sections: [
      {
        id: 'personal',
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'givenName', label: 'Given Name', type: 'text', required: true },
          { name: 'surname', label: 'Surname', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'placeOfBirth', label: 'Place of Birth', type: 'text', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
          { name: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'], required: true },
        ]
      },
      {
        id: 'address',
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'houseNo', label: 'House Number', type: 'text', required: true },
          { name: 'street', label: 'Street / Area', type: 'text', required: true },
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true, pattern: '^[0-9]{6}$' },
        ]
      },
      {
        id: 'identity',
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, pattern: '^[0-9]{10}$' },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
          { name: 'aadhaarNumber', label: 'Aadhaar Number', type: 'text', required: true },
        ]
      },
      {
        id: 'service',
        title: 'SECTION 4 – Service Details',
        fields: [
          { name: 'passportType', label: 'Application Type', type: 'select', options: ['Fresh Passport', 'Re-issue of Passport'], required: true },
          { name: 'validityRequired', label: 'Validity Required', type: 'select', options: ['10 Years', '5 Years', 'Up to 18 years of age'], required: true },
        ]
      }
    ],
    documents: ['Photo', 'Identity Proof', 'Address Proof', 'Age Proof']
  },
  general: {
    title: 'General Service Application',
    authority: 'Digital Services Portal',
    description: 'Application for various other government services.',
    sections: [
      {
        id: 'personal',
        title: 'SECTION 1 – Applicant Personal Details',
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
        ]
      },
      {
        id: 'address',
        title: 'SECTION 2 – Address Details',
        fields: [
          { name: 'village', label: 'Village / City', type: 'text', required: true },
          { name: 'district', label: 'District', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'text', required: true },
          { name: 'pincode', label: 'Pincode', type: 'text', required: true, pattern: '^[0-9]{6}$' },
        ]
      },
      {
        id: 'identity',
        title: 'SECTION 3 – Identity Details',
        fields: [
          { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, pattern: '^[0-9]{10}$' },
          { name: 'email', label: 'Email ID', type: 'email', required: true },
        ]
      },
      {
        id: 'service',
        title: 'SECTION 4 – Service Details',
        fields: [
          { name: 'serviceName', label: 'Service Name', type: 'text', required: true },
          { name: 'details', label: 'Application Details', type: 'textarea', required: true },
        ]
      }
    ],
    documents: ['Photo', 'Identity Proof', 'Supporting Document']
  }
};

const ApplyService = () => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { config: portalConfig } = useConfig();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [draftDocuments, setDraftDocuments] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [declaration, setDeclaration] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [submittedApp, setSubmittedApp] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [serviceFee, setServiceFee] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{ paid: boolean; payment_id: number | null }>({ paid: false, payment_id: null });
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dynamicConfig, setDynamicConfig] = useState<any>(null);

  useEffect(() => {
    checkServiceStatus();
    const params = new URLSearchParams(location.search);
    const dId = params.get('draftId');
    if (dId) {
      loadDraft(dId);
    }
  }, [serviceType, user, location.search]);

  const loadDraft = async (id: string) => {
    try {
      const draftSnap = await getDoc(doc(db, 'application_drafts', id));
      if (!draftSnap.exists()) return;
      const draft = draftSnap.data();
      setDraftId(draftSnap.id as any);
      setFormData(draft.form_data || {});
      if (draft.documents) {
        setDraftDocuments(draft.documents);
      }
    } catch (err) {
      console.error('Error loading draft:', err);
    }
  };

  const fetchPaymentStatus = async (serviceId: string | number) => {
    // In serverless, we check for a success payment in ledger or applications
    try {
      const q = query(collection(db, 'ledger'), 
        where('user_id', '==', user?.uid || ''), 
        where('service_id', '==', String(serviceId)),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(q);
      setPaymentStatus({ paid: !snapshot.empty, payment_id: snapshot.empty ? null : snapshot.docs[0].id as any });
    } catch (err) {
      console.error('Error fetching payment status:', err);
    }
  };

  const checkServiceStatus = async () => {
    try {
      if (portalConfig.enable_service_applications === 0) {
        setError('Service applications are currently disabled by the administrator.');
        setIsChecking(false);
        return;
      }

      // Fetch wallet balance if user is logged in
      if (user) {
        try {
          const walletSnap = await getDocs(query(collection(db, 'wallets'), where('user_id', '==', user?.uid || '')));
          if (!walletSnap.empty) {
            setWalletBalance(walletSnap.docs[0].data().balance || 0);
          } else {
            setWalletBalance(0);
          }
        } catch (err) {
          console.error('Error fetching wallet balance:', err);
        }
      }

      console.log('Fetching services from Firestore for ApplyService...');
      const querySnapshot = await getDocs(collection(db, 'services'));
      const services = querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          service_id: doc.id,
          ...data,
          name: data.name || data.service_name || 'Unnamed Service',
        };
      });
      
      const decodedType = decodeURIComponent(serviceType || '').toLowerCase();
      
      const currentService = services.find((s: any) => {
        if (!s.name) return false;
        const name = s.name.toLowerCase();
        return name === decodedType || 
               name.includes(decodedType) || 
               decodedType.includes(name) || 
               name.replace(/\s+/g, '-') === decodedType ||
               s.id === serviceType;
      });

      if (!currentService) {
        setError('Service not found.');
        setIsChecking(false);
        return;
      }

      setServiceDetails(currentService);
      if (currentService.form_schema) {
        setDynamicConfig(currentService.form_schema);
      } else {
        const hardcoded = SERVICE_CONFIGS[serviceType as keyof typeof SERVICE_CONFIGS];
        if (hardcoded) setDynamicConfig(hardcoded);
      }
      setServiceFee(currentService.service_price || currentService.fee || 0);
      fetchPaymentStatus(currentService.id);
      
      setPaymentStatus({ paid: true, payment_id: null }); // Default for free/internal if not strictly enforced

      // In a real serverless app, dynamic forms would be stored in the service document or subcollection
      // For now, if it's one of the hardcoded ones, we use that.
      // Otherwise, we look for 'service_inputs' collection which we implemented in Services.tsx
      if (!SERVICE_CONFIGS[serviceType || '']) {
        if (!currentService.service_id) {
          console.warn('Service has no service_id attached.');
          return;
        }
        const inputsSnap = await getDocs(query(collection(db, 'service_inputs'), where('service_id', '==', currentService.service_id)));
        if (!inputsSnap.empty) {
          const customFields = inputsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const sectionsMap: Record<string, any[]> = {
            'Service Details': []
          };
          
          customFields.forEach((field: any) => {
            sectionsMap['Service Details'].push({
              name: field.input_label.replace(/\s+/g, '_').toLowerCase(),
              label: field.input_label,
              type: field.input_type,
              required: field.required,
              placeholder: field.placeholder || ''
            });
          });

          const dynamicSections = Object.keys(sectionsMap).map((sectionName, index) => ({
            id: `section_${index}`,
            title: `SECTION ${index + 1} – ${sectionName}`,
            fields: sectionsMap[sectionName]
          }));

          setDynamicConfig({
            title: currentService.name,
            authority: 'Digital Services Portal',
            description: currentService.description,
            sections: dynamicSections,
            documents: ['Identity Proof', 'Supporting Document']
          });
        }
      }
    } catch (err) {
      console.error('Error checking service status:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleWalletPayment = async () => {
    if (!serviceDetails || !user) return;
    
    if (walletBalance === null || walletBalance < serviceDetails.service_price) {
      alert('Insufficient wallet balance. Please add money to your wallet.');
      return;
    }

    if (!window.confirm(`Are you sure you want to pay ₹${serviceDetails.service_price} from your wallet?`)) {
      return;
    }

    try {
      setIsChecking(true);
      
      const ledgerRef = collection(db, 'ledger');
      const ledgerDoc = await addDoc(ledgerRef, {
        user_id: user?.uid || '',
        amount: -serviceDetails.service_price,
        type: 'debit',
        description: `Wallet Payment for ${serviceDetails.name}`,
        service_id: serviceDetails.service_id,
        created_at: serverTimestamp(),
        status: 'completed'
      });

      const walletSnap = await getDocs(query(collection(db, 'wallets'), where('user_id', '==', user?.uid || '')));
      if (!walletSnap.empty) {
        const walletDoc = walletSnap.docs[0];
        await updateDoc(doc(db, 'wallets', walletDoc.id), {
          balance: (walletDoc.data().balance || 0) - serviceDetails.service_price,
          updated_at: serverTimestamp()
        });
        setWalletBalance((walletDoc.data().balance || 0) - serviceDetails.service_price);
      }

      setPaymentStatus({ paid: true, payment_id: ledgerDoc.id as any });
      alert('Payment successful using wallet!');
    } catch (err: any) {
      console.error('Wallet Payment Error:', err);
      alert('Failed to process wallet payment. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleProceedToPayment = async () => {
    alert('Online payment via Razorpay is simulated in this serverless version. In a production app, use Firebase Cloud Functions to verify payments securely.');
    setPaymentStatus({ paid: true, payment_id: 'SIMULATED_PAYMENT' as any });
  };

  const config = dynamicConfig || (serviceType ? (SERVICE_CONFIGS[serviceType] || SERVICE_CONFIGS.general) : null);

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

  const validateField = (name: string, value: string) => {
    if (!config) return;
    
    let fieldConfig: any = null;
    for (const section of config.sections) {
      const field = section.fields.find((f: any) => f.name === name);
      if (field) {
        fieldConfig = field;
        break;
      }
    }

    if (!fieldConfig) return;

    let error = '';
    if (fieldConfig.type === 'file_upload') {
      const hasDraftDoc = draftDocuments.some(d => d.originalname && d.originalname.startsWith(`${name}_`));
      if (fieldConfig.required && !files[name] && !hasDraftDoc) {
        error = `${fieldConfig.label} is required`;
      }
    } else {
      if (fieldConfig.required && !value.trim()) {
        error = `${fieldConfig.label} is required`;
      } else if (fieldConfig.pattern && value && !new RegExp(fieldConfig.pattern).test(value)) {
        error = `Invalid ${fieldConfig.label} format`;
      } else if (fieldConfig.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
        error = 'Invalid email address';
      } else if (fieldConfig.type === 'tel' && value && !/^\d{10}$/.test(value)) {
        error = 'Mobile number must be 10 digits';
      }
    }

    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!allowedTypes.includes(ext)) {
        alert('Invalid file format. Only PDF, JPG, PNG are allowed.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }

      setFiles(prev => ({ ...prev, [docType]: file }));
      validateField(docType, file.name);
      
      // Simulate progress
      setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setUploadProgress(prev => ({ ...prev, [docType]: progress }));
        if (progress >= 100) clearInterval(interval);
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const errors: Record<string, string> = {};
    config.sections.forEach((section: any) => {
      section.fields.forEach((field: any) => {
        // Skip validation if the field is hidden by a condition
        if (field.conditionField && field.conditionValue) {
          if (formData[field.conditionField] !== field.conditionValue) {
            return;
          }
        }

        if (field.type === 'file_upload') {
          const hasDraftDoc = draftDocuments.some(d => d.originalname && d.originalname.startsWith(`${field.name}_`));
          if (field.required && !files[field.name] && !hasDraftDoc) {
            errors[field.name] = `${field.label} is required`;
          }
          return;
        }

        const value = formData[field.name] || '';
        let error = '';
        if (field.required && !value.trim()) {
          error = `${field.label} is required`;
        } else if (field.pattern && value && !new RegExp(field.pattern).test(value)) {
          error = `Invalid ${field.label} format`;
        } else if (field.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
          error = 'Invalid email address';
        } else if (field.type === 'tel' && value && !/^\d{10}$/.test(value)) {
          error = 'Mobile number must be 10 digits';
        }
        if (error) errors[field.name] = error;
      });
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the errors in the form before submitting.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate documents
    const missingDocs = (config.documents || []).filter((doc: string) => {
      const hasDraftDoc = draftDocuments.some(d => d.originalname && d.originalname.startsWith(`${doc}_`));
      return !files[doc] && !hasDraftDoc;
    });
    if (missingDocs.length > 0) {
      setError(`Please upload all required documents: ${missingDocs.join(', ')}`);
      return;
    }

    if (!declaration) {
      alert('Please accept the declaration before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Ensure user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('You must be logged in to submit an application.');
        setIsSubmitting(false);
        return;
      }

      // Filter out hidden fields from formData
      const filteredFormData: Record<string, string> = {};
      config.sections.forEach((section: any) => {
        section.fields.forEach((field: any) => {
          if (field.conditionField && field.conditionValue) {
            if (formData[field.conditionField] !== field.conditionValue) {
              return; // Skip hidden field
            }
          }
          if (formData[field.name] !== undefined && formData[field.name] !== null) {
            filteredFormData[field.name] = formData[field.name];
          }
        });
      });

      const serviceName = serviceDetails?.name || serviceDetails?.service_name || serviceType || 'general';

      // Upload files to Firebase Storage
      const uploadedDocuments: any[] = [];
      try {
        for (const [type, file] of Object.entries(files)) {
          const storageRef = ref(storage, `applications/${user?.uid}/${Date.now()}_${type}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          uploadedDocuments.push({
            id: Math.random().toString(36).substr(2, 9),
            file_name: file.name,
            file_url: url,
            document_type: type,
            uploaded_at: new Date().toISOString()
          });
        }
      } catch (uploadErr: any) {
        console.error('File upload failed:', uploadErr);
        if (uploadErr.code === 'storage/retry-limit-exceeded' || uploadErr.code === 'storage/unauthorized') {
          setError('Failed to upload files. Please check your internet connection or contact support if the issue persists (Storage Rules may need to be updated).');
        } else {
          setError(`File upload error: ${uploadErr.message}`);
        }
        setIsSubmitting(false);
        return;
      }

      // Generate a reference number
      const referenceNumber = `APP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Staff/Admin Wallet Deduction check
      if ((user?.role === 'staff' || user?.role === 'admin') && serviceFee && serviceFee > 0) {
        if (!window.confirm(`A service fee of ₹${serviceFee} will be deducted from your wallet. Continue?`)) {
          setIsSubmitting(false);
          return;
        }
        
        try {
          // In serverless, we'd need to update ledger and wallet balance
          const ledgerRef = collection(db, 'ledger');
          await addDoc(ledgerRef, {
            user_id: user?.uid,
            amount: -serviceFee,
            type: 'debit',
            description: `Service Fee for ${serviceName} (${referenceNumber})`,
            service_id: serviceDetails.service_id,
            created_at: serverTimestamp(),
            status: 'completed'
          });

          const walletSnap = await getDocs(query(collection(db, 'wallets'), where('user_id', '==', user?.uid || '')));
          if (!walletSnap.empty) {
            const walletDoc = walletSnap.docs[0];
            await updateDoc(doc(db, 'wallets', walletDoc.id), {
              balance: (walletDoc.data().balance || 0) - serviceFee,
              updated_at: serverTimestamp()
            });
          }
        } catch (walletErr: any) {
          setError('Failed to deduct from wallet. Please ensure you have sufficient balance.');
          setIsSubmitting(false);
          return;
        }
      }

      // Save application to Firestore
      const userId = currentUser.uid;
      if (!userId) {
        throw new Error('User ID is missing. Please try logging out and in again.');
      }

      const applicationData: any = {
        userId: String(userId),
        userEmail: String(user?.email || currentUser.email || 'No Email'),
        user_name: String(user?.name || currentUser.displayName || 'Unknown'),
        user_email: String(user?.email || currentUser.email || 'No Email'),
        user_phone: String(user?.phone || 'No Phone'),
        service_id: String(serviceDetails?.service_id || '0'),
        service_name: String(serviceName),
        service_type: String(serviceName),
        form_data: filteredFormData || {},
        documents: uploadedDocuments || [],
        status: 'Pending',
        assignedTo: '',
        assignedToName: '',
        payment_status: serviceDetails?.payment_required ? 'Pending' : 'Free',
        reference_number: String(referenceNumber),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      // Final safety check: remove any remaining undefined or null values
      const finalData: Record<string, any> = {};
      Object.keys(applicationData).forEach(key => {
        if (applicationData[key] !== undefined && applicationData[key] !== null) {
          finalData[key] = applicationData[key];
        }
      });

      console.log('Final Application Data for Firestore:', {
        ...finalData,
        userId: finalData.userId // Ensure we see this in logs
      });

      const docRef = await addDoc(collection(db, 'applications'), finalData);
      
      // If payment is required, we still show the payment step but now we have a Firestore ID
      if (serviceDetails?.payment_required && serviceDetails?.service_price > 0 && !paymentStatus.paid && user?.role === 'user') {
        setDraftId(docRef.id as any); // Using Firestore ID as draft ID
        setShowPaymentStep(true);
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSubmittedApp({ ...applicationData, id: docRef.id });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeWithWallet = async () => {
    if (!draftId || !serviceDetails) return;
    
    if (walletBalance === null || walletBalance < serviceDetails.service_price) {
      alert('Insufficient wallet balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Log transaction in ledger
      const ledgerRef = collection(db, 'ledger');
      const ledgerDoc = await addDoc(ledgerRef, {
        user_id: user?.uid,
        amount: -serviceDetails.service_price,
        type: 'debit',
        description: `Application Fee for ${serviceDetails.service_name}`,
        service_id: serviceDetails.service_id,
        created_at: serverTimestamp(),
        status: 'completed'
      });

      // 2. Update wallet balance
      const walletSnap = await getDocs(query(collection(db, 'wallets'), where('user_id', '==', user?.uid || '')));
      if (!walletSnap.empty) {
        const walletDoc = walletSnap.docs[0];
        await updateDoc(doc(db, 'wallets', walletDoc.id), {
          balance: (walletDoc.data().balance || 0) - serviceDetails.service_price,
          updated_at: serverTimestamp()
        });
      }
      
      // 3. Update Firestore application status
      const appRef = doc(db, 'applications', draftId.toString());
      await updateDoc(appRef, {
        payment_status: 'Paid',
        payment_id: ledgerDoc.id,
        updated_at: serverTimestamp()
      });
      
      const updatedDoc = await getDoc(appRef);
      setSubmittedApp({ ...updatedDoc.data(), id: updatedDoc.id });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Finalization error:', err);
      setError(err.message || 'Payment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeWithRazorpay = async () => {
    alert('Online payment via Razorpay is simulated in this serverless version.');
    if (!draftId || !serviceDetails) return;
    
    try {
      setIsSubmitting(true);
      // Finalize in Firestore
      const appRef = doc(db, 'applications', draftId.toString());
      await updateDoc(appRef, {
        payment_status: 'Paid',
        payment_id: 'SIMULATED_RAZORPAY_' + Date.now(),
        updated_at: serverTimestamp()
      });
      
      const updatedDoc = await getDoc(appRef);
      setSubmittedApp({ ...updatedDoc.data(), id: updatedDoc.id });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Finalize error:', err);
      alert('Failed to finalize application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!submittedApp) return;
    setIsGeneratingPDF(true);
    // Small delay to ensure styles are applied
    setTimeout(async () => {
      await downloadPDF('receipt-apply', `Acknowledgement_${submittedApp.reference_number}`);
      setIsGeneratingPDF(false);
    }, 100);
  };

  const handlePrint = () => {
    window.print();
  };

  if (showPaymentStep && !success) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="glass rounded-[3rem] p-12 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -z-10"></div>
          
          <div className="text-center space-y-4 mb-12">
            <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <WalletIcon className="text-blue-400 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white">Complete Payment</h2>
            <p className="text-slate-400">Your application is saved as a draft. Please complete the payment to submit it.</p>
          </div>

          <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Service</span>
              <span className="text-white font-bold">{serviceDetails?.service_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Application Fee</span>
              <span className="text-2xl font-black text-white">₹{serviceDetails?.service_price}</span>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <h3 className="text-white font-bold text-lg mb-4">Select Payment Method</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleFinalizeWithWallet}
                disabled={isSubmitting || (walletBalance || 0) < (serviceDetails?.service_price || 0)}
                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                  (walletBalance || 0) >= (serviceDetails?.service_price || 0)
                    ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-white'
                    : 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed text-slate-500'
                }`}
              >
                <WalletIcon size={32} />
                <div className="text-center">
                  <div className="font-bold">Pay from Wallet</div>
                  <div className="text-[10px] opacity-60">Balance: ₹{walletBalance || 0}</div>
                </div>
              </button>

              <button
                onClick={handleFinalizeWithRazorpay}
                disabled={isSubmitting}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all flex flex-col items-center gap-3"
              >
                <QrCode size={32} />
                <div className="text-center">
                  <div className="font-bold">UPI / Cards</div>
                  <div className="text-[10px] opacity-60">Razorpay Secure</div>
                </div>
              </button>
            </div>

            {(walletBalance || 0) < (serviceDetails?.service_price || 0) && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3 mt-4">
                <AlertTriangle className="text-orange-500 shrink-0" size={18} />
                <p className="text-xs text-orange-200/80">
                  Insufficient wallet balance. You can pay using UPI/Cards or <Link to="/app/wallet" className="text-orange-500 font-bold hover:underline">add money</Link> to your wallet.
                </p>
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
            <button
              onClick={() => setShowPaymentStep(false)}
              className="text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-all"
            >
              <ArrowLeft size={18} /> Back to Form
            </button>
            {isSubmitting && (
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Loader2 className="animate-spin" size={18} /> Processing...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (success && submittedApp) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <AcknowledgementReceipt application={submittedApp} id="receipt-apply" />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 no-print">
          <ModernButton 
            text="Download Receipt" 
            icon={Download} 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            loading={isGeneratingPDF}
            gradient="blue-gradient"
            className="w-full sm:w-auto"
          />
          <button 
            onClick={handlePrint}
            className="px-8 py-4 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Printer size={20} /> Print Receipt
          </button>
          <ModernButton 
            text="Track Application" 
            icon={Activity} 
            onClick={() => navigate(`/track/${submittedApp.reference_number}`)}
            gradient="blue-gold-gradient"
            className="w-full sm:w-auto"
          />
          <button 
            onClick={() => navigate('/app/user/dashboard')}
            className="px-8 py-4 text-slate-500 font-bold hover:text-white transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 bg-white p-1 rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
          <img src={config.logo_url || "https://firebasestorage.googleapis.com/v0/b/ais-dev-nkao4wgl3qoklcmykae3vf.appspot.com/o/artifacts%2Finput_file_1.png?alt=media"} alt="JH Logo" className="w-full h-full object-contain" />
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-slate-900">{config.title}</h1>
          <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mt-1">{config.authority}</p>
          <p className="text-slate-500 mt-2 text-sm">{config.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {config.sections.map((section: any, sIdx: number) => (
            <div key={section.id} className={`p-8 ${sIdx !== 0 ? 'border-t border-slate-100' : ''}`}>
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">{sIdx + 1}</span>
                {section.title}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map((field: any) => {
                  if (field.conditionField && field.conditionValue) {
                    if (formData[field.conditionField] !== field.conditionValue) {
                      return null;
                    }
                  }
                  
                  return (
                    <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'select' || field.type === 'dropdown' ? (
                        <select
                          name={field.name}
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:ring-4 transition-all ${
                            fieldErrors[field.name] 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' 
                              : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                          }`}
                        >
                          <option value="">Select an option</option>
                          {field.options && field.options.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          name={field.name}
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={handleInputChange}
                          rows={3}
                          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:ring-4 transition-all ${
                            fieldErrors[field.name] 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' 
                              : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                          }`}
                        />
                      ) : field.type === 'file_upload' ? (
                        <div className="relative">
                          <input 
                            type="file" 
                            id={`field-file-${field.name}`}
                            name={field.name}
                            required={field.required}
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, field.name)}
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                          <label 
                            htmlFor={`field-file-${field.name}`}
                            className={`flex items-center justify-center w-full py-3 bg-slate-50 border border-dashed rounded-xl cursor-pointer hover:bg-slate-100 transition-all text-sm text-slate-500 gap-2 ${
                              fieldErrors[field.name] ? 'border-red-500' : 'border-slate-300'
                            }`}
                          >
                            <Upload size={16} /> {files[field.name] ? files[field.name].name : draftDocuments.some(d => d.originalname && d.originalname.startsWith(`${field.name}_`)) ? 'File previously uploaded (click to replace)' : 'Upload File'}
                          </label>
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:ring-4 transition-all ${
                            fieldErrors[field.name] 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' 
                              : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                          }`}
                        />
                      )}
                      {fieldErrors[field.name] && (
                        <p className="mt-1.5 text-xs font-bold text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                          <AlertCircle size={12} /> {fieldErrors[field.name]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* SECTION 5 - Document Upload */}
          {config.documents && config.documents.length > 0 && (
            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">{config.sections.length + 1}</span>
                SECTION {config.sections.length + 1} – Document Upload
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {config.documents.map((doc: string) => {
                  const hasDraftDoc = draftDocuments.some(d => d.originalname && d.originalname.startsWith(`${doc}_`));
                  return (
                  <div key={doc} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-bold text-slate-700">{doc} *</label>
                      {(files[doc] || hasDraftDoc) && <CheckCircle2 className="text-green-500" size={18} />}
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="file" 
                        id={`file-${doc}`}
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, doc)}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <label 
                        htmlFor={`file-${doc}`}
                        className="flex items-center justify-center w-full py-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-100 transition-all text-sm text-slate-500 gap-2"
                      >
                        <Upload size={16} /> {files[doc] ? 'Change File' : hasDraftDoc ? 'File previously uploaded (click to replace)' : 'Upload File'}
                      </label>
                    </div>
                    
                    {files[doc] && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="truncate max-w-[150px]">{files[doc].name}</span>
                          <span>{uploadProgress[doc] || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-300" 
                            style={{ width: `${uploadProgress[doc] || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
              <p className="mt-6 text-xs text-slate-500 italic">Accepted formats: PDF, JPG, PNG. Maximum size: 5MB per file.</p>
            </div>
          )}

          {/* SECTION 6 - Declaration */}
          <div className="p-8 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">
                {config.sections.length + (config.documents && config.documents.length > 0 ? 2 : 1)}
              </span>
              SECTION {config.sections.length + (config.documents && config.documents.length > 0 ? 2 : 1)} – Declaration
            </h2>
            
            <label className="flex gap-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-all">
              <input 
                type="checkbox" 
                checked={declaration}
                onChange={(e) => setDeclaration(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 leading-relaxed">
                I hereby declare that the information provided is correct and true to the best of my knowledge. 
                I understand that any false information may lead to the rejection of my application or legal action.
              </span>
            </label>
          </div>

          {/* Wallet Balance & Fee Info */}
          {serviceFee !== null && serviceFee > 0 && (
            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600/10 rounded-2xl">
                    <WalletIcon className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Wallet Balance</p>
                    <p className="text-2xl font-black text-slate-900">₹{walletBalance?.toLocaleString() || '0'}</p>
                  </div>
                </div>
                
                <div className="h-12 w-px bg-slate-200 hidden md:block" />

                <div className="text-center md:text-right">
                  <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Service Fee</p>
                  <p className="text-2xl font-black text-red-600">₹{(serviceFee || 0).toLocaleString()}</p>
                </div>
              </div>
              
              {walletBalance !== null && walletBalance < serviceFee ? (
                <div className="mt-6 flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle size={24} />
                  <div className="flex-1">
                    <p className="text-sm font-bold">Insufficient Balance</p>
                    <p className="text-xs opacity-80">You need ₹{((serviceFee || 0) - (walletBalance || 0)).toLocaleString()} more to apply for this service.</p>
                  </div>
                  <ModernButton 
                    text="Add Money" 
                    onClick={() => navigate('/app/wallet')}
                    className="!py-2 !px-4 text-xs"
                    gradient="red-gradient"
                  />
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
                  <CheckCircle2 size={24} />
                  <p className="text-sm font-bold">Balance sufficient for this application.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
          <button
            type="button"
            className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
          >
            Save Draft
          </button>
          <ModernButton 
            text="Submit Application" 
            icon={Rocket} 
            type="submit"
            disabled={isSubmitting || !declaration}
            loading={isSubmitting}
            gradient="blue-gold-gradient"
            className="w-full sm:w-auto !px-12"
          />
        </div>
      </form>
    </div>
  );
};

export default ApplyService;
