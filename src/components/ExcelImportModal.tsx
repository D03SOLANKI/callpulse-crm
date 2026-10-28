'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Table,
  Settings2,
  Sparkles,
  UserCheck,
  Users,
  FolderOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees?: any[];
  defaultEmployeeId?: string;
}

const NAME_KEYWORDS = [
  'customer',
  'client',
  'name',
  'lead',
  'prospect',
  'contact person',
  'party',
  'full name',
  'person',
  'account',
];

const PHONE_KEYWORDS = [
  'mobile',
  'phone',
  'contact no',
  'calling',
  'cell',
  'tel',
  'whatsapp',
  'number',
  'mob',
  'ph',
];

const COMPANY_KEYWORDS = [
  'company',
  'organization',
  'firm',
  'business',
  'enterprise',
  'brand',
  'shop',
];

const EMAIL_KEYWORDS = [
  'customer email',
  'email',
  'mail',
  'e-mail',
  'email id',
];

const NOTES_KEYWORDS = [
  'order reference',
  'reference',
  'remarks',
  'remark',
  'notes',
  'note',
  'status',
  'activities',
  'sub state',
  'comment',
  'description',
  'project',
];

export default function ExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
  employees = [],
  defaultEmployeeId,
}: ExcelImportModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [batchName, setBatchName] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Column mapping states
  const [nameCol, setNameCol] = useState<number>(-1);
  const [phoneCol, setPhoneCol] = useState<number>(-1);
  const [companyCol, setCompanyCol] = useState<number>(-1);
  const [emailCol, setEmailCol] = useState<number>(-1);
  const [notesCol, setNotesCol] = useState<number>(-1);

  // Assignment states: 'SPECIFIC' or 'ROUND_ROBIN'
  const [assignmentMode, setAssignmentMode] = useState<'SPECIFIC' | 'ROUND_ROBIN'>(
    defaultEmployeeId ? 'SPECIFIC' : 'SPECIFIC'
  );
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(
    defaultEmployeeId || (employees[0]?.id || '')
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when modal opens or defaultEmployeeId changes
  useEffect(() => {
    if (isOpen) {
      setPastedText('');
      setUploadedFileName('');
      setBatchName('');
      setRawRows([]);
      setHeaders([]);
      setNameCol(-1);
      setPhoneCol(-1);
      setCompanyCol(-1);
      setEmailCol(-1);
      setNotesCol(-1);
      setError('');

      if (defaultEmployeeId) {
        setAssignmentMode('SPECIFIC');
        setTargetEmployeeId(defaultEmployeeId);
      } else if (employees.length > 0 && !targetEmployeeId) {
        setTargetEmployeeId(employees[0].id);
      }
    }
  }, [isOpen, defaultEmployeeId, employees]);

  // Smart column index finder
  const detectBestColumn = (headerList: string[], keywords: string[], excludeIndex: number = -1): number => {
    for (const kw of keywords) {
      const idx = headerList.findIndex((h, i) => {
        if (i === excludeIndex) return false;
        const hl = h.toLowerCase().trim();
        return hl === kw || hl.includes(kw);
      });
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // Process raw grid data from upload or paste
  const processRawGrid = (grid: any[][], fileName?: string) => {
    if (!grid || grid.length === 0) {
      setError('The selected data/file appears to be empty.');
      setRawRows([]);
      setHeaders([]);
      return;
    }

    let headerRowIndex = 0;
    for (let r = 0; r < Math.min(grid.length, 10); r++) {
      const row = grid[r];
      if (!row) continue;
      const filled = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length;
      if (filled >= 2) {
        headerRowIndex = r;
        break;
      }
    }

    const headerRow = grid[headerRowIndex].map((h, i) =>
      h !== undefined && h !== null && String(h).trim() !== ''
        ? String(h).trim()
        : `Column ${i + 1}`
    );

    const dataRows = grid.slice(headerRowIndex + 1);

    setHeaders(headerRow);
    setRawRows(dataRows);

    // Auto-detect columns
    const matchedName = detectBestColumn(headerRow, NAME_KEYWORDS);
    const matchedPhone = detectBestColumn(headerRow, PHONE_KEYWORDS, matchedName);
    const matchedCompany = detectBestColumn(headerRow, COMPANY_KEYWORDS);
    const matchedEmail = detectBestColumn(headerRow, EMAIL_KEYWORDS);
    const matchedNotes = detectBestColumn(headerRow, NOTES_KEYWORDS);

    setNameCol(matchedName !== -1 ? matchedName : 0);
    setPhoneCol(matchedPhone !== -1 ? matchedPhone : matchedName !== 1 ? 1 : 0);
    setCompanyCol(matchedCompany);
    setEmailCol(matchedEmail);
    setNotesCol(matchedNotes);

    if (fileName) {
      setUploadedFileName(fileName);
      if (!batchName) {
        setBatchName(fileName.replace(/\.[^/.]+$/, '')); // clean extension
      }
    }
    setError('');
  };

  // Handle Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });

        let targetSheetName = wb.SheetNames[0];
        for (const sName of wb.SheetNames) {
          const s = wb.Sheets[sName];
          if (s && s['!ref']) {
            targetSheetName = sName;
            break;
          }
        }

        const ws = wb.Sheets[targetSheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        processRawGrid(data, file.name);
      } catch (err: any) {
        setError(`Failed to read file: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle Pasting from Excel
  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    setError('');

    if (!text.trim()) {
      setRawRows([]);
      setHeaders([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const isTab = lines[0].includes('\t');
    const grid = lines.map((line) => {
      if (isTab) {
        return line.split('\t').map((p) => p.trim());
      }
      return line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    });

    processRawGrid(grid, 'Pasted Excel Data');
  };

  // Extract structured leads
  const getExtractedLeads = () => {
    if (rawRows.length === 0 || nameCol === -1 || phoneCol === -1) {
      return [];
    }

    const leads: any[] = [];
    for (const row of rawRows) {
      if (!row || row.length === 0) continue;

      const rawName = row[nameCol];
      const rawPhone = row[phoneCol];

      if (rawName === undefined || rawName === null || rawPhone === undefined || rawPhone === null) {
        continue;
      }

      const name = String(rawName).trim();
      let phone = String(rawPhone).trim().replace(/[\r\n\t]/g, '');

      const company = companyCol !== -1 && row[companyCol] ? String(row[companyCol]).trim() : '';
      const email = emailCol !== -1 && row[emailCol] ? String(row[emailCol]).trim() : '';
      const notes = notesCol !== -1 && row[notesCol] ? String(row[notesCol]).trim() : '';

      if (name && phone && phone !== 'undefined' && phone !== 'null' && phone !== '0') {
        leads.push({
          name,
          phone,
          company: company || (name.length > 25 ? name : null),
          email: email || null,
          notes: notes || null,
        });
      }
    }

    return leads;
  };

  const extractedLeads = getExtractedLeads();
  const selectedCallerObj = employees.find((e) => e.id === targetEmployeeId);

  // Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Customer', 'mobile', 'Customer Email', 'Company', 'Order Reference'],
      ['K KISHORE KUMAR', '9941402233', 'sivaguru@gmail.com', 'Kishore Transport', 'S57843'],
      ['INSTRUCKO INDIA', '9899157234', 'finance@instrucko.com', 'Instrucko India Pvt Ltd', 'S57781'],
      ['VRK BIOTECH', '7350002833', 'sankalp@vrkgroup.net', 'VRK Biotech Pvt Ltd', 'S57842'],
      ['Kiruba', '8056831442', 'vk13850@gmail.com', '', 'S57852'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
    XLSX.writeFile(wb, 'CallPulse_Leads_Template.xlsx');
  };

  // Submit leads
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (extractedLeads.length === 0) {
      setError('Please select valid Name and Phone columns containing lead data.');
      return;
    }

    if (assignmentMode === 'SPECIFIC' && !targetEmployeeId) {
      setError('Please select an employee to assign this Excel file to.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: extractedLeads,
          targetEmployeeId: assignmentMode === 'SPECIFIC' ? targetEmployeeId : undefined,
          autoAssign: assignmentMode === 'ROUND_ROBIN',
          source: batchName || uploadedFileName || 'Excel Batch Import',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import leads');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {selectedCallerObj && assignmentMode === 'SPECIFIC'
                  ? `Upload Excel File for ${selectedCallerObj.name}`
                  : 'Upload & Assign Excel Lead Database'}
              </h2>
              <p className="text-xs text-slate-300">
                Assign this file directly to a specific caller or distribute equally
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Template Link */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activeTab === 'file'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Excel File (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activeTab === 'paste'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste from Excel / Sheets</span>
            </button>
          </div>

          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <Download className="w-3 h-3" />
            <span>Download Template (.xlsx)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TARGET CALLER ASSIGNMENT CARD (Key User Requirement) */}
          <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Assign This File To:</span>
              </span>
              <span className="text-[11px] font-semibold text-blue-700">Choose Assignment Rule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option A: Specific Caller */}
              <label
                className={`flex items-start space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  assignmentMode === 'SPECIFIC'
                    ? 'bg-white border-blue-500 ring-2 ring-blue-400/30 shadow-sm'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="assignMode"
                  value="SPECIFIC"
                  checked={assignmentMode === 'SPECIFIC'}
                  onChange={() => setAssignmentMode('SPECIFIC')}
                  className="mt-0.5 text-blue-600"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900 block">Single Caller</span>
                  <span className="text-[11px] text-slate-500 block">
                    All leads in this file go to 1 caller
                  </span>
                </div>
              </label>

              {/* Option B: Round-Robin across all 4 */}
              <label
                className={`flex items-start space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  assignmentMode === 'ROUND_ROBIN'
                    ? 'bg-white border-blue-500 ring-2 ring-blue-400/30 shadow-sm'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="assignMode"
                  value="ROUND_ROBIN"
                  checked={assignmentMode === 'ROUND_ROBIN'}
                  onChange={() => setAssignmentMode('ROUND_ROBIN')}
                  className="mt-0.5 text-blue-600"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900 block">Split Across 4 Callers</span>
                  <span className="text-[11px] text-slate-500 block">
                    Distribute 25% to each caller
                  </span>
                </div>
              </label>
            </div>

            {/* Caller Selector Dropdown (When Specific is selected) */}
            {assignmentMode === 'SPECIFIC' && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Select Specific Caller:
                </label>
                <select
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-blue-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {employees.map((emp, idx) => (
                    <option key={emp.id} value={emp.id}>
                      Caller {idx + 1}: {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* File / Batch Name Field */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Batch / File Label (Optional):
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. Caller 1 - 2,000 Leads (Nov Batch)"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* TAB 1: File Upload */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {uploadedFileName ? uploadedFileName : 'Click to Browse or Drag & Drop Excel File'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supports up to 5,000+ leads per Excel file (.xlsx, .xls, .csv)
                </p>
              </div>

              {uploadedFileName && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold">{uploadedFileName}</span>
                    <span className="text-[11px] text-slate-400">({rawRows.length} rows detected)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName('');
                      setRawRows([]);
                      setHeaders([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-rose-600 hover:text-rose-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Paste from Excel */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Copy & Paste Cells from Excel
                </label>
                <span className="text-[11px] text-slate-500">
                  Select rows in Excel & press Ctrl+C / Ctrl+V
                </span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => handlePastedTextChange(e.target.value)}
                placeholder={"Customer\tmobile\tCustomer Email\tOrder Reference\nK KISHORE KUMAR\t9941402233\tsivaguru@gmail.com\tS57843\nINSTRUCKO INDIA\t9899157234\tfinance@instrucko.com\tS57781"}
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Column Mapping Section */}
          {headers.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Column Mapping (Auto-Detected)</span>
                </span>
                <span className="text-[11px] text-slate-500">Verify or change mapped columns</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name / Customer Column */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Lead / Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={nameCol}
                    onChange={(e) => setNameCol(parseInt(e.target.value, 10))}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={-1}>-- Select Column --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone / Mobile Column */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Phone / Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={phoneCol}
                    onChange={(e) => setPhoneCol(parseInt(e.target.value, 10))}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={-1}>-- Select Column --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email Column */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <select
                    value={emailCol}
                    onChange={(e) => setEmailCol(parseInt(e.target.value, 10))}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={-1}>-- Not In Sheet --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes / Reference Column */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Notes / Remarks / Reference (Optional)
                  </label>
                  <select
                    value={notesCol}
                    onChange={(e) => setNotesCol(parseInt(e.target.value, 10))}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={-1}>-- Not In Sheet --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Section */}
          {extractedLeads.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {extractedLeads.length} Leads Ready to Assign to{' '}
                    {assignmentMode === 'SPECIFIC' && selectedCallerObj
                      ? selectedCallerObj.name
                      : 'All 4 Callers'}
                  </span>
                </span>
                <span className="text-[11px] text-emerald-700">Previewing first 3 rows</span>
              </div>

              {/* Mini preview table */}
              <div className="overflow-x-auto max-h-36 overflow-y-auto border border-emerald-200 rounded-lg bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-3">Lead / Customer</th>
                      <th className="py-1.5 px-3">Phone</th>
                      <th className="py-1.5 px-3">Email</th>
                      <th className="py-1.5 px-3">Notes / Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedLeads.slice(0, 3).map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-semibold text-slate-900">{l.name}</td>
                        <td className="py-1.5 px-3 text-blue-600 font-mono font-semibold">{l.phone}</td>
                        <td className="py-1.5 px-3 text-slate-600">{l.email || '—'}</td>
                        <td className="py-1.5 px-3 text-slate-500 truncate max-w-[150px]">{l.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || extractedLeads.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Assigning {extractedLeads.length} Leads...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Assign {extractedLeads.length > 0 ? `${extractedLeads.length} Leads` : ''} to{' '}
                    {assignmentMode === 'SPECIFIC' && selectedCallerObj
                      ? selectedCallerObj.name.split(' ')[0]
                      : 'Team'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
