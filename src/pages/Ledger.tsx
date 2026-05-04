import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, Trash2, Edit2, CheckCircle, XCircle, Download, FileText, Printer, Search, Sparkles, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Ledger = () => {
  const { config } = useConfig();
  const [ledger, setLedger] = useState<any[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ 
    from: new Date().toISOString().split('T')[0], 
    to: new Date().toISOString().split('T')[0] 
  });
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  
  // Dynamic form state
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const { user } = useAuth();

  // Fetch dynamic field configurations
  useEffect(() => {
    const q = query(
      collection(db, 'ledger_config'),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const configs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFieldConfigs(configs);
      
      // Initialize dynamic data with defaults if needed
      const initialData: Record<string, any> = {};
      configs.forEach((field: any) => {
        if (field.type === 'select') {
          initialData[field.key] = field.options?.[0] || '';
        } else if (field.type === 'number') {
          initialData[field.key] = '';
        } else if (field.type === 'date') {
          initialData[field.key] = new Date().toISOString().split('T')[0];
        } else {
          initialData[field.key] = '';
        }
      });
      setDynamicData(initialData);
      setLoadingConfigs(false);
    });

    return () => unsubscribe();
  }, []);

  const playSuccessSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'ledger'), 
        where('date_string', '>=', dateRange.from),
        where('date_string', '<=', dateRange.to),
        orderBy('created_at', 'asc')
      );
      
      const [snapshot] = await Promise.all([getDocs(q)]);
      
      const ledgerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLedger(ledgerData);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, 'ledger');
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  const ledgerWithBalance = useMemo(() => {
    let balance = 0;
    return ledger.map(item => {
      const total = item.total_amount || 0;
      balance += total;
      return { ...item, runningBalance: balance };
    }).reverse(); // Reverse back for display (newest first)
  }, [ledger]);

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    
    // Map dynamic data or legacy data
    const editableData: Record<string, any> = { ...entry.data };
    
    // For legacy entries or if fields are not in 'data'
    fieldConfigs.forEach(field => {
      if (editableData[field.key] === undefined && entry[field.key] !== undefined) {
        editableData[field.key] = entry[field.key];
      }
    });

    setDynamicData(editableData);
    setShowAdd(true);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validation for required fields
    const missingFields = fieldConfigs
      .filter(f => f.required && !dynamicData[f.key])
      .map(f => f.label);

    if (missingFields.length > 0) {
      toast.error(`Required fields missing: ${missingFields.join(', ')}`);
      return;
    }

    setIsSaving(true);

    const savePromise = (async () => {
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      
      // Calculate Total from dynamic fields
      // Look for principle_amount, amount, or fee
      const principle = parseFloat(dynamicData.principle_amount || dynamicData.amount || 0) || 0;
      const profit = parseFloat(dynamicData.profit_amount || dynamicData.profit || dynamicData.fee || 0) || 0;
      const serviceType = dynamicData.service_type || dynamicData.type || '';
      
      const isDebit = serviceType === 'Cash Withdrawal' || serviceType === 'Withdrawal';
      
      let total = 0;
      if (isDebit) {
        total = -principle;
      } else {
        total = principle + profit;
      }

      // Get daily serial number
      const qDaily = query(collection(db, 'ledger'), where('date_string', '==', dateString));
      const dailySnapshot = await getDocs(qDaily);
      const newSerialNumber = dailySnapshot.size + 1;

      const entryData = {
        serial_number: newSerialNumber,
        userId: user?.uid,
        staff_id: user?.uid || 'unknown',
        staff_name: user?.name || 'Unknown Staff',
        createdAt: serverTimestamp(),
        created_at: serverTimestamp(), // Backward compat
        date_string: dateString,
        data: dynamicData,
        // Promote some fields to top-level for existing query logic/display
        customer_name: dynamicData.customer_name || 'N/A',
        service_name: dynamicData.service_name || dynamicData.service || 'N/A',
        service_type: serviceType || 'Service',
        principle_amount: principle,
        profit_amount: profit,
        total_amount: total,
        payment_mode: dynamicData.payment_mode || 'Cash',
        type: isDebit ? 'withdrawal' : 'deposit'
      };

      const docRef = await addDoc(collection(db, 'ledger'), entryData);
      
      // Success Cleanup
      playSuccessSound();
      setSuccessData({ id: docRef.id, ...entryData, created_at: Timestamp.now() });
      setShowAdd(false);
      
      // Reset form
      const initialData: Record<string, any> = {};
      fieldConfigs.forEach((field: any) => {
        if (field.type === 'select') initialData[field.key] = field.options?.[0] || '';
        else if (field.type === 'date') initialData[field.key] = new Date().toISOString().split('T')[0];
        else initialData[field.key] = '';
      });
      setDynamicData(initialData);
      
      // Instant Refresh
      await fetchData();
      return "Saved!";
    })();

    toast.promise(savePromise, {
      loading: 'Saving transaction...',
      success: '✅ Successfully saved your record',
      error: '❌ Failed to save entry'
    });

    try {
      await savePromise;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'ledger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setDynamicData(prev => {
      const newData = { ...prev, [key]: value };
      
      // Autofill logic: If service_type changes, update service_name too
      if (key === 'service_type') {
        newData.service_name = value;
      }
      
      return newData;
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    
    setIsSaving(true);
    try {
      const principle = parseFloat(dynamicData.principle_amount || dynamicData.amount || 0) || 0;
      const profit = parseFloat(dynamicData.profit_amount || dynamicData.profit || dynamicData.fee || 0) || 0;
      const serviceType = dynamicData.service_type || dynamicData.type || '';
      const isDebit = serviceType === 'Cash Withdrawal' || serviceType === 'Withdrawal';
      
      await updateDoc(doc(db, 'ledger', editingEntry.id), {
        data: dynamicData,
        customer_name: dynamicData.customer_name || 'N/A',
        service_name: dynamicData.service_name || dynamicData.service || 'N/A',
        service_type: serviceType || 'Service',
        principle_amount: principle,
        profit_amount: profit,
        total_amount: isDebit ? -principle : (principle + profit),
        payment_mode: dynamicData.payment_mode || 'Cash',
        type: isDebit ? 'withdrawal' : 'deposit',
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      setShowAdd(false);
      setEditingEntry(null);
      
      // Reset form
      const initialData: Record<string, any> = {};
      fieldConfigs.forEach((field: any) => {
        if (field.type === 'select') initialData[field.key] = field.options?.[0] || '';
        else if (field.type === 'date') initialData[field.key] = new Date().toISOString().split('T')[0];
        else initialData[field.key] = '';
      });
      setDynamicData(initialData);

      fetchData();
      toast.success('Successfully updated record');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'ledger');
      toast.error('Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, col: string) => {
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, col, id));
      await fetchData();
      toast.success('Successfully deleted tracking record');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Failed to delete record. Please check permissions.');
      handleFirestoreError(err, OperationType.DELETE, col);
    }
  };

  const exportToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ledger');

    // Define columns
    worksheet.columns = [
      { header: 'SN', key: 'sn', width: 5 },
      { header: 'Date & Time', key: 'date', width: 25 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Service', key: 'service', width: 25 },
      { header: 'Principal', key: 'principal', width: 15 },
      { header: 'Profit', key: 'profit', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Mode', key: 'mode', width: 12 },
      { header: 'Staff', key: 'staff', width: 15 }
    ];

    // Style Header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // slate-800
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add Data Rows
    filtered.forEach(item => {
      worksheet.addRow({
        sn: item.serial_number,
        date: item.created_at?.toDate()?.toLocaleString() || '',
        customer: item.customer_name,
        service: item.service_name,
        principal: item.principle_amount,
        profit: item.profit_amount,
        total: item.total_amount,
        balance: item.runningBalance,
        mode: item.payment_mode,
        staff: item.staff_name
      });
    });

    // Add Total Row
    if (filtered.length > 0) {
      const totalPrincipal = filtered.reduce((sum, item) => sum + Math.abs(item.principle_amount || 0), 0);
      const totalProfit = filtered.reduce((sum, item) => sum + (item.profit_amount || 0), 0);
      const totalAmount = filtered.reduce((sum, item) => sum + (item.total_amount || 0), 0);
      const finalBalance = filtered[filtered.length - 1].runningBalance;

      const totalRow = worksheet.addRow({
        sn: '',
        date: 'GRAND TOTAL',
        customer: '',
        service: '',
        principal: totalPrincipal,
        profit: totalProfit,
        total: totalAmount,
        balance: finalBalance,
        mode: '',
        staff: ''
      });

      // Style Total Row
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // slate-100
      };
      
      // Add Spacer
      worksheet.addRow({});
      
      // Add Split Header
      const splitHeader = worksheet.addRow({ date: 'PAYMENT MODE SPLIT' });
      splitHeader.font = { bold: true };
      splitHeader.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCBD5E1' } // slate-300
      };

      // Calculate Split
      const splitStats: Record<string, { total: number, profit: number }> = {};
      filtered.forEach(item => {
        const mode = item.payment_mode || 'Cash';
        if (!splitStats[mode]) splitStats[mode] = { total: 0, profit: 0 };
        splitStats[mode].total += (item.total_amount || 0);
        splitStats[mode].profit += (item.profit_amount || 0);
      });

      Object.entries(splitStats).forEach(([mode, stats]) => {
        const row = worksheet.addRow([
          '', // SN
          mode, // Date/Mode
          `Profit: ₹${stats.profit.toLocaleString()}`, // Customer
          `Net: ₹${stats.total.toLocaleString()}`, // Service
        ]);
        row.getCell(2).font = { bold: true };
      });
    }

    // Border for all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Ledger_${dateRange.from}_to_${dateRange.to}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Ledger Report (${dateRange.from} to ${dateRange.to})`, 14, 15);
    
    const tableColumn = ["SN", "Date", "Customer", "Service", "Principal", "Profit", "Total", "Balance"];
    const tableRows = filtered.map(item => [
      item.serial_number,
      item.created_at?.toDate()?.toLocaleDateString() || '',
      item.customer_name,
      item.service_name,
      item.principle_amount,
      item.profit_amount,
      item.total_amount,
      item.runningBalance
    ]);

    // Calculate Totals for Footer
    const totalPrincipal = filtered.reduce((sum, item) => sum + Math.abs(item.principle_amount || 0), 0);
    const totalProfit = filtered.reduce((sum, item) => sum + (item.profit_amount || 0), 0);
    const totalAmount = filtered.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    const finalBalance = filtered.length > 0 ? filtered[filtered.length - 1].runningBalance : 0;

    const footerRow = [
      "", 
      "TOTAL", 
      "", 
      "", 
      `Rs.${totalPrincipal.toLocaleString()}`, 
      `Rs.${totalProfit.toLocaleString()}`, 
      `Rs.${totalAmount.toLocaleString()}`, 
      `Rs.${finalBalance.toLocaleString()}`
    ];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      foot: [footerRow],
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85] }, // slate-700 equivalent
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } // slate-100/900 equivalent
    });

    // Add Payment Split Table
    const splitStats: Record<string, { total: number, profit: number }> = {};
    filtered.forEach(item => {
      const mode = item.payment_mode || 'Cash';
      if (!splitStats[mode]) splitStats[mode] = { total: 0, profit: 0 };
      splitStats[mode].total += (item.total_amount || 0);
      splitStats[mode].profit += (item.profit_amount || 0);
    });

    const splitRows = Object.entries(splitStats).map(([mode, stats]) => [
      mode,
      `Rs.${stats.profit.toLocaleString()}`,
      `Rs.${stats.total.toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [['Payment Mode', 'Total Profit', 'Net Balance']],
      body: splitRows,
      startY: (doc as any).lastAutoTable.finalY + 10,
      margin: { left: 100 }, // Align to the right
      tableWidth: 80,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`Ledger_${dateRange.from}_to_${dateRange.to}.pdf`);
  };

  const printInvoice = async (item: any) => {
    const docInvoice = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 160] // Adjusted height for footer
    });

    const pageWidth = 80;
    const centerX = pageWidth / 2;
    let currentY = 12;

    // Company Logo Helper
    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        if (url.startsWith('http')) {
          img.crossOrigin = "anonymous";
        }
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = url;
      });
    };

    const logoUrl = config.logo_url || "/logo.svg";
    
    try {
      const img = await loadImage(logoUrl);
      
      // CRITICAL FIX: Convert image to a controlled JPEG via canvas to avoid signature errors
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "#FFFFFF"; // Ensure white background for non-transparent areas
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        docInvoice.addImage(imgData, 'JPEG', centerX - 15, 5, 30, 12);
      }
      currentY = 22;
    } catch (e) {
      console.error("Logo failed to add to PDF", e);
      docInvoice.setFont("helvetica", "bold");
      docInvoice.setFontSize(16);
      docInvoice.text("JH", centerX, currentY, { align: 'center' });
      currentY += 6;
    }

    docInvoice.setFont("helvetica", "bold");
    docInvoice.setFontSize(10);
    const portalName = config.portal_name?.toUpperCase() || "JH DIGITAL SEVA KENDRA";
    docInvoice.text(portalName, centerX, currentY, { align: 'center' });
    
    currentY += 4;
    docInvoice.setFontSize(8);
    docInvoice.setFont("helvetica", "normal");
    docInvoice.text("--------------------------------------------------", centerX, currentY, { align: 'center' });
    
    currentY += 6;
    docInvoice.setFontSize(9);
    docInvoice.setFont("helvetica", "bold");
    docInvoice.text(`INVOICE: #${item.serial_number}`, centerX, currentY, { align: 'center' });
    
    currentY += 5;
    docInvoice.setFont("helvetica", "normal");
    docInvoice.setFontSize(8);
    const dateStr = item.created_at?.toDate()?.toLocaleString() || new Date().toLocaleString();
    docInvoice.text(`Date & Time: ${dateStr}`, centerX, currentY, { align: 'center' });
    
    currentY += 7;
    docInvoice.text("--------------------------------------------------", centerX, currentY, { align: 'center' });
    
    // Details Section
    currentY += 6;
    docInvoice.setFont("helvetica", "bold");
    docInvoice.text("CUSTOMER DETAILS", centerX, currentY, { align: 'center' });
    currentY += 4;
    docInvoice.setFont("helvetica", "normal");
    docInvoice.text(`${item.customer_name}`, centerX, currentY, { align: 'center' });
    
    currentY += 8;
    docInvoice.setFont("helvetica", "bold");
    docInvoice.text("SERVICE PROVIDED", centerX, currentY, { align: 'center' });
    currentY += 4;
    docInvoice.setFont("helvetica", "normal");
    docInvoice.text(`${item.service_name}`, centerX, currentY, { align: 'center' });
    
    currentY += 8;
    docInvoice.setFont("helvetica", "bold");
    docInvoice.text("AMOUNT", centerX, currentY, { align: 'center' });
    currentY += 4;
    docInvoice.setFont("helvetica", "normal");
    docInvoice.text(`Rs. ${Math.abs(item.principle_amount || 0).toLocaleString()}`, centerX, currentY, { align: 'center' });

    currentY += 8;
    docInvoice.text("--------------------------------------------------", centerX, currentY, { align: 'center' });
    
    // Total Section
    currentY += 6;
    docInvoice.setFontSize(11);
    docInvoice.setFont("helvetica", "bold");
    docInvoice.text(`TOTAL: Rs. ${Math.abs(item.total_amount || 0).toLocaleString()}`, centerX, currentY, { align: 'center' });
    
    currentY += 5;
    docInvoice.setFontSize(8);
    docInvoice.setFont("helvetica", "normal");
    docInvoice.text(`Payment Mode: ${item.payment_mode}`, centerX, currentY, { align: 'center' });
    
    currentY += 8;
    docInvoice.text("--------------------------------------------------", centerX, currentY, { align: 'center' });
    
    // Footer Section
    currentY += 6;
    docInvoice.setFont("helvetica", "bold");
    docInvoice.text("SUCCESSFULLY COMPLETED", centerX, currentY, { align: 'center' });
    currentY += 4;
    docInvoice.setFont("helvetica", "normal");
    docInvoice.text("VISIT AGAIN", centerX, currentY, { align: 'center' });
    
    currentY += 8;
    docInvoice.setFontSize(7);
    docInvoice.text(`Staff: ${item.staff_name}`, centerX, currentY, { align: 'center' });
    
    window.open(docInvoice.output('bloburl'), '_blank');
  };

  const filtered = ledgerWithBalance.filter(l => 
    (l.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.service_name || '').toLowerCase().includes(search.toLowerCase())
  );
  
  const dailyTotalBalance = ledger.reduce((sum, item) => sum + (item.total_amount || 0), 0);

  const paymentTotals = useMemo(() => {
    const totals: Record<string, number> = { 'Cash': 0, 'PhonePe': 0, 'GPay': 0 };
    ledger.forEach(item => {
      const mode = item.payment_mode || 'Cash';
      if (!(mode in totals)) totals[mode] = 0;
      totals[mode] += (item.total_amount || 0);
    });
    return totals;
  }, [ledger]);

  return (
    <div className="space-y-6 pb-10">
      <Toaster position="top-right" />
      
      <AnimatePresence>
        {successData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles size={120} className="text-blue-500" />
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle2 size={48} className="animate-bounce" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-white">Record Saved!</h3>
                  <p className="text-slate-400">Transaction ID: #{successData.id.slice(0, 8)}</p>
                </div>

                <div className="w-full bg-slate-800/50 rounded-2xl p-4 space-y-2 text-left border border-slate-700/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Customer</span>
                    <span className="text-white font-medium">{successData.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Service</span>
                    <span className="text-white font-medium">{successData.service_name}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2 mt-2">
                    <span className="text-slate-400">Total</span>
                    <span className="text-green-400">₹{Math.abs(successData.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => printInvoice(successData)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                  >
                    <Printer size={18} /> Print
                  </button>
                  <button 
                    onClick={() => setSuccessData(null)}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Professional Ledger</h1>
          <p className="text-slate-400">Complete financial tracking for your digital services.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-slate-800 rounded-2xl p-1 border border-slate-700">
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="px-3 py-2 bg-transparent text-white border-0 focus:ring-0 text-sm" />
            <span className="text-slate-500 px-2">to</span>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="px-3 py-2 bg-transparent text-white border-0 focus:ring-0 text-sm" />
            <button onClick={fetchData} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors ml-2">Search</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-xl transition-all text-sm font-medium">
              <Download size={18} /> Excel
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl transition-all text-sm font-medium">
              <FileText size={18} /> PDF
            </button>
            <button onClick={() => { setShowAdd(true); setEditingEntry(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 text-sm font-medium">
              <Plus size={18} /> Add Entry
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
          <p className="text-slate-400 text-sm mb-1">Period Balance</p>
          <p className={`text-3xl font-bold ${dailyTotalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ₹{dailyTotalBalance.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl overflow-hidden">
          <p className="text-slate-400 text-sm mb-3">Balance Split</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-orange-400 font-bold uppercase">Cash</p>
              <p className="text-lg font-bold text-white">₹{paymentTotals['Cash']?.toLocaleString() || 0}</p>
            </div>
            <div className="flex-1 border-x border-slate-700 px-4">
              <p className="text-[10px] text-purple-400 font-bold uppercase">PhonePe</p>
              <p className="text-lg font-bold text-white">₹{paymentTotals['PhonePe']?.toLocaleString() || 0}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-blue-400 font-bold uppercase">GPay</p>
              <p className="text-lg font-bold text-white">₹{paymentTotals['GPay']?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search custom or service..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-full px-6 bg-slate-800 border border-slate-700 rounded-3xl text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
        </div>
      </div>

      {showAdd && (
        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">{editingEntry ? 'Edit Transaction' : 'Record New Transaction'}</h2>
            <button onClick={() => { setShowAdd(false); setEditingEntry(null); }} className="text-slate-400 hover:text-white p-2">
              <XCircle size={24} />
            </button>
          </div>
          <form onSubmit={editingEntry ? handleUpdate : handleSaveEntry} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fieldConfigs.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center justify-between">
                  {field.label}
                  {field.required && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Required</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select 
                    value={dynamicData[field.key] || ''} 
                    onChange={e => handleFieldChange(field.key, e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required={field.required}
                  >
                    {field.options?.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <input 
                    type="date" 
                    value={dynamicData[field.key] || ''} 
                    onChange={e => handleFieldChange(field.key, e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    required={field.required}
                  />
                ) : (
                  <div className="relative">
                    {field.type === 'number' && <span className="absolute left-4 top-3.5 text-slate-500">₹</span>}
                    <input 
                      type={field.type}
                      step={field.type === 'number' ? '0.01' : undefined}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                      value={dynamicData[field.key] || ''} 
                      onChange={e => handleFieldChange(field.key, e.target.value)} 
                      className={`w-full ${field.type === 'number' ? 'pl-8' : 'px-4'} py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none`} 
                      required={field.required}
                    />
                  </div>
                )}
              </div>
            ))}
            
            <div className="lg:col-span-3 flex justify-end gap-3 mt-4">
              <button 
                type="button" 
                onClick={() => { setShowAdd(false); setEditingEntry(null); }} 
                className="px-6 py-3 text-slate-400 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSaving} 
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (editingEntry ? 'Update Transaction' : 'Save Transaction')}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-700/50 sticky top-0 backdrop-blur-md z-10">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600">SN</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600">Date & Time</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600">Customer</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600">Service</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600 text-right">Principal</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600 text-right">Profit</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600 text-right">Total</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600 text-right">Balance</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.map((item, index) => (
                <tr key={item.id} className={`${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-700/10'} hover:bg-slate-700/20 transition-colors group`}>
                  <td className="p-4 text-sm font-mono text-slate-500 ">{item.serial_number}</td>
                  <td className="p-4 text-xs text-slate-400">
                    {item.created_at?.toDate()?.toLocaleDateString()}<br/>
                    <span className="text-slate-600">{item.created_at?.toDate()?.toLocaleTimeString()}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-slate-200">{item.customer_name}</span>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{item.payment_mode}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-400">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 mr-2 uppercase">{item.service_type}</span>
                    {item.service_name}
                  </td>
                  <td className="p-4 text-sm text-slate-400 text-right font-mono">₹{Math.abs(item.principle_amount || 0).toLocaleString()}</td>
                  <td className="p-4 text-sm text-green-400/80 text-right font-mono">₹{(item.profit_amount || 0).toLocaleString()}</td>
                  <td className={`p-4 text-sm font-bold text-right font-mono ${item.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'}`}>
                    {item.type === 'withdrawal' ? '-' : '+'}₹{Math.abs(item.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm font-bold text-right font-mono text-blue-400 underline decoration-blue-500/30">
                    ₹{item.runningBalance?.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          const details = Object.entries(item.data || {})
                            .map(([key, val]) => `${key}: ${val}`)
                            .join('\n');
                          alert(`Custom Fields:\n${details || 'No custom fields'}`);
                        }} 
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors" 
                        title="View Details"
                      >
                        <Search size={16} />
                      </button>
                      <button onClick={() => printInvoice(item)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors" title="Print Invoice">
                        <Printer size={16} />
                      </button>
                      <button onClick={() => handleEdit(item)} className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      {(user?.role === 'admin' || user?.uid === item.staff_id) && (
                        <button 
                          onClick={() => handleDelete(item.id, 'ledger')} 
                          className="p-2 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all active:scale-90" 
                          title="Delete Action"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr className="bg-slate-900/50 font-bold border-t-2 border-slate-700">
                  <td colSpan={4} className="p-4 text-right text-slate-200">TOTAL</td>
                  <td className="p-4 text-sm text-slate-200 text-right font-mono">₹{filtered.reduce((sum, item) => sum + Math.abs(item.principle_amount || 0), 0).toLocaleString()}</td>
                  <td className="p-4 text-sm text-green-400 text-right font-mono">₹{filtered.reduce((sum, item) => sum + (item.profit_amount || 0), 0).toLocaleString()}</td>
                  <td className="p-4 text-sm text-slate-200 text-right font-mono">₹{filtered.reduce((sum, item) => sum + (item.total_amount || 0), 0).toLocaleString()}</td>
                  <td className="p-4 text-sm text-blue-400 text-right font-mono">₹{filtered[filtered.length - 1].runningBalance.toLocaleString()}</td>
                  <td className="p-4"></td>
                </tr>
              )}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-20 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="text-slate-700" size={48} />
                      <p className="text-xl font-medium">No transactions found for the selected range</p>
                      <p className="text-sm">Try adjusting your filters or record a new transaction.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Ledger;
