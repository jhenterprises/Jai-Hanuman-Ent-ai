import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, Trash2, Edit2, CheckCircle, XCircle, Download, FileText, Printer, Search, Sparkles, Receipt, CheckCircle2, AlertCircle, ArrowUpDown, TrendingUp, Layers, PieChart, Eye, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Ledger = () => {
  const { config } = useConfig();
  const { theme } = useTheme();
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
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allConfigs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const configs = allConfigs.filter((f: any) => f.isActive === true);
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
        where('date_string', '<=', dateRange.to)
      );
      
      const [snapshot] = await Promise.all([getDocs(q)]);
      
      const ledgerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Sort records chronologically in-memory to bypass composite index constraints
      ledgerData.sort((a, b) => {
        const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return timeA - timeB;
      });
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
      if (key === 'service_type' || key === 'serviceType') {
        newData.service_name = value;
        newData.serviceName = value;
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

  const handleDelete = async (id: any, col: any) => {
    // Robustly extract ID and collection
    let targetId = '';
    if (typeof id === 'string') {
      targetId = id;
    } else if (id && typeof id === 'object' && id.id) {
      targetId = String(id.id);
    } else {
      targetId = String(id);
    }
    
    targetId = targetId.trim();
    const targetCol = String(col || 'ledger').trim();
    
    if (!targetId || targetId === '[object Object]' || targetId === 'undefined') {
      console.error('Invalid ID in Ledger handleDelete:', id);
      toast.error('Invalid record ID');
      return;
    }

    const ledgerItem = ledger.find(l => l.id === targetId);
    if (!ledgerItem) {
      toast.error('Ledger entry not found');
      return;
    }

    if (!window.confirm(`Are you sure you want to move this ledger entry to the Recycle Bin?`)) return;
    
    const fullPath = `${targetCol}/${targetId}`;
    
    try {
      console.log('Soft-deleting entry to Recycle Bin:', fullPath);
      
      // Construct recycle bin document matching our schema
      const recycleData = {
        ...ledgerItem,
        original_id: targetId,
        type: 'ledger',
        deleted_at: serverTimestamp(),
        // Map ledger fields to standard Recycle Bin display properties
        name: ledgerItem.customer_name || ledgerItem.customer || ledgerItem.particulars || 'Ledger Entry',
        service_name: ledgerItem.service_name || ledgerItem.service_type || ledgerItem.service || 'Financial Entry',
        reference_number: ledgerItem.reference_number || targetId.slice(0, 8)
      };

      // Delete non-serializable fields if any
      delete recycleData.id;
      delete recycleData.created_at;
      delete recycleData.updated_at;

      // Add to recycle bin first
      await addDoc(collection(db, 'recycle_bin'), recycleData);

      // Now delete from original ledger collection
      await deleteDoc(doc(db, targetCol, targetId));
      await fetchData();
      toast.success('Ledger entry moved to Recycle Bin successfully');
    } catch (err: any) {
      console.error('Delete error at', fullPath, ':', err);
      toast.error('Failed to move record to Recycle Bin. Please check permissions.');
      handleFirestoreError(err, OperationType.DELETE, fullPath);
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
        date: item.created_at && typeof item.created_at.toDate === 'function' ? item.created_at.toDate().toLocaleString() : (item.created_at ? new Date(item.created_at).toLocaleString() : ''),
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
      item.created_at && typeof item.created_at.toDate === 'function' ? item.created_at.toDate().toLocaleDateString() : (item.created_at ? new Date(item.created_at).toLocaleDateString() : ''),
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
    const dateStr = item.created_at && typeof item.created_at.toDate === 'function' ? item.created_at.toDate().toLocaleString() : (item.created_at ? new Date(item.created_at).toLocaleString() : new Date().toLocaleString());
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles size={120} className="text-blue-500" />
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle2 size={48} className="animate-bounce" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Record Saved!</h3>
                  <p className="text-slate-500 dark:text-slate-400">Transaction ID: #{successData.id.slice(0, 8)}</p>
                </div>

                <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2 text-left border border-slate-200 dark:border-slate-700/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Customer</span>
                    <span className="text-slate-800 dark:text-white font-medium">{successData.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Service</span>
                    <span className="text-slate-800 dark:text-white font-medium">{successData.service_name}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-750 pt-2 mt-2">
                    <span className="text-slate-600 dark:text-slate-400">Total</span>
                    <span className="text-green-600 dark:text-green-400">₹{Math.abs(successData.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => printInvoice(successData)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold transition-all"
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-full flex items-center justify-center shrink-0 shadow-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Professional Ledger ✨</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 pl-13">Complete financial tracking for your digital services.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl p-1 shadow-inner">
            <div className="flex items-center text-slate-400 px-3 py-1.5"><Calendar size={14} className="mr-2"/></div>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="bg-transparent text-slate-800 dark:text-slate-300 border-0 focus:ring-0 text-sm outline-none [color-scheme:light] dark:[color-scheme:dark]" />
            <span className="text-slate-500 px-3 text-sm">to</span>
            <div className="flex items-center text-slate-400 px-3 py-1.5"><Calendar size={14} className="mr-2"/></div>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="bg-transparent text-slate-800 dark:text-slate-300 border-0 focus:ring-0 text-sm outline-none [color-scheme:light] dark:[color-scheme:dark]" />
            <button onClick={fetchData} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors ml-2 shadow-[inset_0_1px_rgba(255,255,255,0.1)]">Search</button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={exportToExcel} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-[#052e16]/40 hover:bg-emerald-100 dark:hover:bg-[#052e16]/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-lg transition-all text-sm font-medium">
              <Download size={16} /> Excel
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-[#450a0a]/40 hover:bg-rose-100 dark:hover:bg-[#450a0a]/60 text-rose-700 dark:text-red-500 border border-rose-200 dark:border-red-900/50 rounded-lg transition-all text-sm font-medium">
              <FileText size={16} /> PDF
            </button>
            <button onClick={() => { setShowAdd(true); setEditingEntry(null); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 rounded-lg text-sm font-medium transition-all ml-2">
              <Plus size={16} /> Add Entry
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Period Balance Card */}
        <div className="lg:col-span-4 bg-gradient-to-br from-indigo-50/80 dark:from-indigo-600/30 via-white dark:via-slate-800 to-slate-50/80 dark:to-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-indigo-500/20 shadow-xl dark:shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
            <Sparkles size={120} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="relative z-10 flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <Receipt className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">Period Balance</p>
          </div>
          <div className="relative z-10">
            <p className={`text-5xl font-black ${dailyTotalBalance >= 0 ? 'text-green-600 dark:text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-red-600 dark:text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
               ₹{dailyTotalBalance.toLocaleString()}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">This is your closing balance for the selected period</p>
          </div>
        </div>

        {/* Balance Split Card */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-xl p-6 rounded-[2rem] overflow-hidden flex flex-col justify-between min-h-[160px]">
          <p className="text-slate-700 dark:text-slate-300 font-medium mb-4">Balance Split</p>
          <div className="flex items-center gap-6">
            {/* Visual Donut representation */}
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="transparent" stroke={theme === 'dark' ? '#1E293B' : '#F1F5F9'} strokeWidth="4" />
                {(() => {
                  const absCash = Math.abs(paymentTotals['Cash'] || 0);
                  const absPhonePe = Math.abs(paymentTotals['PhonePe'] || 0);
                  const absGPay = Math.abs(paymentTotals['GPay'] || 0);
                  const totalAbs = absCash + absPhonePe + absGPay || 1;
                  
                  const cashPct = (absCash / totalAbs) * 100;
                  const phonePePct = (absPhonePe / totalAbs) * 100;
                  const gPayPct = (absGPay / totalAbs) * 100;

                  return (
                    <>
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#22C55E" strokeWidth="4" strokeDasharray={`${cashPct} 100`} />
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#A855F7" strokeWidth="4" strokeDasharray={`${phonePePct} 100`} strokeDashoffset={`-${cashPct}`} />
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#3B82F6" strokeWidth="4" strokeDasharray={`${gPayPct} 100`} strokeDashoffset={`-${cashPct + phonePePct}`} />
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Cash</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">₹{paymentTotals['Cash']?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">PhonePe</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">₹{paymentTotals['PhonePe']?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">GPay</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">₹{paymentTotals['GPay']?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Search Card */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-xl p-6 rounded-[2rem] overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center gap-2 mb-4 text-slate-700 dark:text-slate-300 font-medium">
            <Search size={18} className="text-blue-600 dark:text-blue-400" />
            <p>Quick Search</p>
          </div>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Search custom or service..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
            />
            <div className="flex gap-2">
              <select className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2 py-2 outline-none">
                <option>All Services</option>
              </select>
              <select className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2 py-2 outline-none">
                <option>All Types</option>
              </select>
              <select className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2 py-2 outline-none">
                <option>All Payments</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingEntry ? 'Edit Transaction' : 'Record New Transaction'}</h2>
            <button onClick={() => { setShowAdd(false); setEditingEntry(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2">
              <XCircle size={24} />
            </button>
          </div>
          <form onSubmit={editingEntry ? handleUpdate : handleSaveEntry} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fieldConfigs.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  {field.label}
                  {field.required && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Required</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select 
                    value={dynamicData[field.key] || ''} 
                    onChange={e => handleFieldChange(field.key, e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:light] dark:[color-scheme:dark]" 
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
                      className={`w-full ${field.type === 'number' ? 'pl-8' : 'px-4'} py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none`} 
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
                className="px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
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
      
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 backdrop-blur-md z-10">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"># SN</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">📅 DATE & TIME</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">👤 CUSTOMER</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">💼 SERVICE</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap">🪙 PRINCIPAL</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap">📈 PROFIT</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap">📄 TOTAL</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap">👝 BALANCE</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap">⚙️ ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
              {filtered.map((item, index) => {
                const isWithdrawal = item.type === 'withdrawal';
                return (
                  <tr key={item.id} className={`${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/50 dark:bg-slate-800/30'} hover:bg-slate-100/60 dark:hover:bg-slate-700/40 transition-colors group`}>
                    <td className="p-4 text-sm font-mono text-slate-600 dark:text-slate-300">{item.serial_number}</td>
                    <td className="p-4 text-xs text-slate-600 dark:text-slate-300">
                      {item.created_at && typeof item.created_at.toDate === 'function' ? item.created_at.toDate().toLocaleDateString() : (item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A')}<br/>
                      <span className="text-slate-400 dark:text-slate-500">{item.created_at && typeof item.created_at.toDate === 'function' ? item.created_at.toDate().toLocaleTimeString() : (item.created_at ? new Date(item.created_at).toLocaleTimeString() : '')}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">{item.customer_name}</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider">{item.payment_mode}</span>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                          ${item.service_type?.toLowerCase().includes('withdrawal') 
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-500/20' 
                            : item.service_type?.toLowerCase().includes('transfer')
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'}`}>
                          {item.service_type || 'OTHERS'}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">{item.service_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300 text-right font-mono">₹{Math.abs(item.principle_amount || 0).toLocaleString()}</td>
                    <td className="p-4 text-sm text-green-600 dark:text-green-400 text-right font-mono">₹{(item.profit_amount || 0).toLocaleString()}</td>
                    <td className={`p-4 text-sm font-bold text-right font-mono ${isWithdrawal ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {isWithdrawal ? '-' : '+'}₹{Math.abs(item.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-bold text-right font-mono text-blue-600 dark:text-blue-400">
                      ₹{item.runningBalance?.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          onClick={() => {
                            const details = Object.entries(item.data || {})
                              .map(([key, val]) => `${key}: ${val}`)
                              .join('\n');
                            alert(`Custom Fields:\n${details || 'No custom fields'}`);
                          }} 
                          className="p-2 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-600 hover:text-white rounded-lg transition-colors" 
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleEdit(item)} className="p-2 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-600 hover:text-white rounded-lg transition-colors" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        {(user?.role === 'admin' || user?.uid === item.staff_id) && (
                          <button 
                            onClick={() => handleDelete(item.id, 'ledger')} 
                            className="p-2 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/30 bg-rose-50 dark:bg-red-900/10 hover:bg-red-600 hover:text-white rounded-lg transition-all active:scale-90" 
                            title="Delete Action"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length > 0 && (
                <tr className="bg-slate-50 dark:bg-slate-900/50 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                  <td colSpan={4} className="p-4 text-right text-slate-800 dark:text-slate-200">TOTAL</td>
                  <td className="p-4 text-sm text-slate-800 dark:text-slate-200 text-right font-mono">₹{filtered.reduce((sum, item) => sum + Math.abs(item.principle_amount || 0), 0).toLocaleString()}</td>
                  <td className="p-4 text-sm text-green-600 dark:text-green-400 text-right font-mono">₹{filtered.reduce((sum, item) => sum + (item.profit_amount || 0), 0).toLocaleString()}</td>
                  <td className="p-4 text-sm text-slate-800 dark:text-slate-200 text-right font-mono">₹{filtered.reduce((sum, item) => sum + (item.total_amount || 0), 0).toLocaleString()}</td>
                  <td className="p-4 text-sm text-blue-600 dark:text-blue-400 text-right font-mono">₹{filtered[filtered.length - 1].runningBalance.toLocaleString()}</td>
                  <td className="p-4"></td>
                </tr>
              )}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="text-slate-300 dark:text-slate-700" size={48} />
                      <p className="text-xl font-medium text-slate-700 dark:text-slate-300">No transactions found for the selected range</p>
                      <p className="text-sm">Try adjusting your filters or record a new transaction.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination placeholder matching the design */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm">
          <p>Showing 1 to {filtered.length} of {filtered.length} entries</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">&larr;</button>
            <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">&rarr;</button>
            <select className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1 outline-none ml-4">
              <option>10 / page</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Entries */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-xl p-6 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center border border-purple-100 dark:border-purple-500/30 shrink-0">
            <ArrowUpDown className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Entries</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{filtered.length}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase mt-1">In selected period</p>
          </div>
        </div>

        {/* Total Principal */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-xl p-6 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/30 shrink-0">
            <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={24} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Principal</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{filtered.reduce((sum, item) => sum + Math.abs(item.principle_amount || 0), 0).toLocaleString()}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase mt-1">Total amount processed</p>
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-xl p-6 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center border border-orange-100 dark:border-orange-500/30 shrink-0">
            <Layers className="text-orange-600 dark:text-orange-400" size={24} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Profit</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">₹{filtered.reduce((sum, item) => sum + (item.profit_amount || 0), 0).toLocaleString()}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase mt-1">Total earnings</p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-xl p-6 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center border border-blue-100 dark:border-blue-500/30 shrink-0">
            <PieChart className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {filtered.length > 0 ? Math.round((filtered.filter(item => (item.profit_amount || 0) > 0).length / filtered.length) * 100) : 100}%
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase mt-1">Profitable transactions</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Ledger;
