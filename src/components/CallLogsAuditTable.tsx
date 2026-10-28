'use client';

import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Clock,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  ThumbsDown,
  PhoneMissed,
  AlertCircle,
  Clock3,
  User,
  Building,
  Download,
  RefreshCw,
  Timer,
  FileText,
} from 'lucide-react';
import LeadHistoryModal from './LeadHistoryModal';

interface CallLogsAuditTableProps {
  employees: any[];
  initialEmployeeId?: string;
  isOwnerView?: boolean;
}

export default function CallLogsAuditTable({
  employees = [],
  initialEmployeeId = 'ALL',
  isOwnerView = true,
}: CallLogsAuditTableProps) {
  const [calls, setCalls] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalDurationSeconds: 0, avgDurationSeconds: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedCaller, setSelectedCaller] = useState<string>(initialEmployeeId);
  const [selectedRemark, setSelectedRemark] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('today');
  const [search, setSearch] = useState<string>('');

  // Selected lead for history modal
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const callerParam = selectedCaller !== 'ALL' ? `&employeeId=${selectedCaller}` : '';
      const remarkParam = selectedRemark !== 'ALL' ? `&remark=${selectedRemark}` : '';
      const dateParam = `&dateRange=${selectedDateRange}`;
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';

      const res = await fetch(`/api/calls?limit=200${callerParam}${remarkParam}${dateParam}${searchParam}`);
      const data = await res.json();
      setCalls(data.calls || []);
      setMetrics(data.metrics || { totalDurationSeconds: 0, avgDurationSeconds: 0 });
    } catch (err) {
      console.error('Failed to load call logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [selectedCaller, selectedRemark, selectedDateRange, search]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const formatTotalTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getRemarkBadge = (remark: string) => {
    switch (remark) {
      case 'INTERESTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Interested
          </span>
        );
      case 'CALL_BACK_LATER':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1" /> Call Back Later
          </span>
        );
      case 'FOLLOW_UP':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Calendar className="w-3.5 h-3.5 mr-1" /> Follow-Up Required
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Converted
          </span>
        );
      case 'NO_ANSWER':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <PhoneMissed className="w-3.5 h-3.5 mr-1" /> No Answer
          </span>
        );
      case 'NOT_INTERESTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Not Interested
          </span>
        );
      case 'WRONG_NUMBER':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Wrong Number
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {remark}
          </span>
        );
    }
  };

  // Export current filtered table to CSV
  const handleExportCsv = () => {
    if (calls.length === 0) return;

    const headers = [
      'Call Date & Time',
      'Caller Name',
      'Lead / Customer Name',
      'Phone Number',
      'Company',
      'Call Outcome',
      'Duration (Seconds)',
      'Duration Formatted',
      'Remarks & Notes',
      'Next Follow-up Date',
    ];

    const rows = calls.map((c) => [
      `"${new Date(c.createdAt).toLocaleString()}"`,
      `"${c.employee?.name || ''}"`,
      `"${c.lead?.name || ''}"`,
      `"${c.lead?.phone || ''}"`,
      `"${c.lead?.company || ''}"`,
      `"${c.remark}"`,
      c.durationSeconds || 0,
      `"${formatDuration(c.durationSeconds)}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${c.followUpDate ? new Date(c.followUpDate).toLocaleString() : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Call_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Audit Banner & Summary Metrics */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Detailed Call Monitoring</span>
              <span>•</span>
              <span>Outcome & Talk-Time Audit</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Call Remarks & Duration Log</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Review full call remarks, outcomes, conversation duration, and scheduled callbacks across all callers
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Calls Recorded</span>
              <span className="text-lg font-black text-white font-mono">{calls.length}</span>
            </div>

            <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">Total Talk Time</span>
              <span className="text-lg font-black text-emerald-300 font-mono">
                {formatTotalTime(metrics.totalDurationSeconds)}
              </span>
            </div>

            <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] text-blue-400 font-bold uppercase block">Avg Duration</span>
              <span className="text-lg font-black text-blue-300 font-mono">
                {formatDuration(metrics.avgDurationSeconds)}
              </span>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={calls.length === 0}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export Audit (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Caller (Owner only) */}
            {isOwnerView && (
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500 font-medium">Caller:</span>
                <select
                  value={selectedCaller}
                  onChange={(e) => setSelectedCaller(e.target.value)}
                  aria-label="Filter calls by employee"
                  className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">All 4 Callers</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Remark / Outcome */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Outcome:</span>
              <select
                value={selectedRemark}
                onChange={(e) => setSelectedRemark(e.target.value)}
                aria-label="Filter calls by outcome"
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Outcomes</option>
                <option value="INTERESTED">Interested</option>
                <option value="CALL_BACK_LATER">Call Back Later</option>
                <option value="FOLLOW_UP">Follow-Up Required</option>
                <option value="CONVERTED">Converted (Closed)</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="WRONG_NUMBER">Wrong Number</option>
              </select>
            </div>

            {/* Filter by Date Range */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Period:</span>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                aria-label="Filter calls by time period"
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Past 7 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex items-center space-x-2 flex-1 max-w-sm min-w-[240px]">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by customer, phone, or remarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchCalls}
              aria-label="Refresh calls list"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                {isOwnerView && <th className="py-3 px-4">Caller</th>}
                <th className="py-3 px-4">Lead / Customer</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Call Outcome</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 min-w-[240px]">Remarks & Discussion Notes</th>
                <th className="py-3 px-4">Next Follow-Up</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isOwnerView ? 9 : 8} className="py-12 text-center text-slate-400 text-xs">
                    Loading call audit records...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={isOwnerView ? 9 : 8} className="py-12 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No call records found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      No calls matching the selected filters were logged for this period.
                    </p>
                  </td>
                </tr>
              ) : (
                calls.map((call) => {
                  const hasDuration = call.durationSeconds > 0;
                  return (
                    <tr key={call.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {new Date(call.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center">
                          <Clock3 className="w-3 h-3 mr-1" />
                          {new Date(call.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Caller (Owner view) */}
                      {isOwnerView && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 flex items-center">
                            <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {call.employee?.name}
                          </div>
                        </td>
                      )}

                      {/* Lead / Customer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {call.lead?.name || 'Unknown Lead'}
                        </div>
                        {call.lead?.company && (
                          <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                            <Building className="w-3 h-3 mr-1 text-slate-400" />
                            {call.lead.company}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <a
                          href={`tel:${call.lead?.phone}`}
                          className="font-semibold text-blue-600 hover:underline flex items-center"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          {call.lead?.phone || '—'}
                        </a>
                      </td>

                      {/* Outcome Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">{getRemarkBadge(call.remark)}</td>

                      {/* Duration */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                            call.durationSeconds >= 60
                              ? 'bg-emerald-100 text-emerald-800'
                              : call.durationSeconds >= 20
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Timer className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          {formatDuration(call.durationSeconds)}
                        </span>
                      </td>

                      {/* Remarks & Notes */}
                      <td className="py-3 px-4">
                        {call.notes ? (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            {call.notes}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic">No notes recorded</span>
                        )}
                      </td>

                      {/* Next Follow-Up */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {call.followUpDate ? (
                          <span className="text-xs font-semibold text-blue-700 flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            {new Date(call.followUpDate).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLeadId(call.leadId)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          Full History
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Lead History Modal */}
      <LeadHistoryModal
        leadId={selectedLeadId}
        isOpen={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </div>
  );
}
