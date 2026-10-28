'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  PhoneCall,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
  Plus,
  RefreshCw,
  Search,
  Building,
  UserCheck,
  User,
  UserPlus,
  FileSpreadsheet,
  ArrowRightLeft,
  ChevronRight,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Phone,
  UploadCloud,
  FolderUp,
  Timer,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import CallLogModal from './CallLogModal';
import LeadHistoryModal from './LeadHistoryModal';
import ExcelImportModal from './ExcelImportModal';
import CallLogsAuditTable from './CallLogsAuditTable';

const REMARK_COLORS: Record<string, string> = {
  INTERESTED: '#10b981', // green
  CALL_BACK_LATER: '#f59e0b', // amber
  FOLLOW_UP: '#3b82f6', // blue
  CONVERTED: '#8b5cf6', // purple
  NO_ANSWER: '#64748b', // slate
  NOT_INTERESTED: '#f43f5e', // rose
  WRONG_NUMBER: '#1e293b', // dark
};

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
};

const formatTotalTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

export default function OwnerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View Tabs
  const [mainOwnerTab, setMainOwnerTab] = useState<'dashboard' | 'call_logs' | 'leads'>('dashboard');

  // Filters
  const [selectedCallerFilter, setSelectedCallerFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showReassignModal, setShowReassignModal] = useState<boolean>(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<any>(null);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<string | null>(null);
  const [uploadTargetCallerId, setUploadTargetCallerId] = useState<string | undefined>(undefined);
  const [showAddCallerModal, setShowAddCallerModal] = useState<boolean>(false);
  const [newCaller, setNewCaller] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Password@123',
    targetDaily: 150,
  });
  const [callerModalError, setCallerModalError] = useState<string>('');
  const [callerModalLoading, setCallerModalLoading] = useState<boolean>(false);

  // Form states
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    company: '',
    email: '',
    priority: 'MEDIUM',
    notes: '',
    assignedToId: '',
  });

  const [reassignTargetEmp, setReassignTargetEmp] = useState<string>('');
  const [reassignSourceEmp, setReassignSourceEmp] = useState<string>('');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/stats/owner');
      const statsData = await statsRes.json();
      setStats(statsData);

      const empRes = await fetch('/api/employees');
      const empData = await empRes.json();
      setEmployees(empData.employees || []);

      const callerQuery = selectedCallerFilter !== 'ALL' ? `&assignedToId=${selectedCallerFilter}` : '';
      const statusQuery = selectedStatusFilter !== 'ALL' ? `&status=${selectedStatusFilter}` : '';
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : '';

      const leadsRes = await fetch(`/api/leads?${callerQuery}${statusQuery}${searchQuery}`);
      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads || []);
    } catch (err) {
      console.error('Failed to load owner dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedCallerFilter, selectedStatusFilter, search]);

  // Handle Create Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) return;

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        setShowAddLeadModal(false);
        setNewLead({
          name: '',
          phone: '',
          company: '',
          email: '',
          priority: 'MEDIUM',
          notes: '',
          assignedToId: '',
        });
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create Caller / Employee
  const handleCreateCaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaller.name || !newCaller.email) return;

    setCallerModalLoading(true);
    setCallerModalError('');

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCaller),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create caller');
      }

      setShowAddCallerModal(false);
      setNewCaller({
        name: '',
        email: '',
        phone: '',
        password: 'Password@123',
        targetDaily: 150,
      });
      fetchAllData();
    } catch (err: any) {
      setCallerModalError(err.message);
    } finally {
      setCallerModalLoading(false);
    }
  };

  // Handle Round Robin Auto-Assign
  const handleAutoDistributeUnassigned = async () => {
    try {
      const res = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ROUND_ROBIN' }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Reassign
  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignSourceEmp || !reassignTargetEmp) return;

    try {
      // Find leads belonging to source employee
      const leadsToMove = leads
        .filter((l) => l.assignedToId === reassignSourceEmp)
        .map((l) => l.id);

      if (leadsToMove.length === 0) {
        alert('No leads found for selected source employee.');
        return;
      }

      const res = await fetch('/api/leads/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SPECIFIC',
          leadIds: leadsToMove,
          targetEmployeeId: reassignTargetEmp,
        }),
      });

      if (res.ok) {
        setShowReassignModal(false);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Prepare chart data
  const chartData = (stats?.employeeLeaderboard || []).map((emp: any) => ({
    name: emp.name.split(' ')[0], // First name
    CallsToday: emp.callsToday,
    Target: emp.targetDaily,
    Connected: emp.connectedCalls,
    Interested: emp.interestedToday,
    Converted: emp.convertedToday,
  }));

  const pieData = Object.entries(stats?.remarkDistribution || {})
    .filter(([_, value]) => (value as number) > 0)
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' '),
      value: value as number,
      key,
    }));

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Owner Command Center</span>
              <span>•</span>
              <span>{employees.length}-Caller Live Oversight</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Sales & Calling Intelligence</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Track real-time productivity across all {employees.length} employees, compare conversion rates, prevent
              missed follow-ups, and distribute lead flow.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddCallerModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Caller</span>
            </button>

            <button
              onClick={() => setShowAddLeadModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Excel / CSV</span>
            </button>

            <button
              onClick={handleAutoDistributeUnassigned}
              title="Evenly distribute unassigned leads to all 4 callers (25% each)"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Auto-Distribute (25% each)</span>
            </button>

            <a
              href="/api/reports/daily?format=csv"
              download
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Daily Report (CSV)</span>
            </a>

            <button
              onClick={fetchAllData}
              aria-label="Refresh dashboard data"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
              title="Refresh Live Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setMainOwnerTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
            mainOwnerTab === 'dashboard'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Team Dashboard & Leaderboard</span>
        </button>

        <button
          onClick={() => setMainOwnerTab('call_logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
            mainOwnerTab === 'call_logs'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call Remarks, Outcomes & Duration Audit</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ml-1 ${
              mainOwnerTab === 'call_logs'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            Live Records
          </span>
        </button>

        <button
          onClick={() => setMainOwnerTab('leads')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
            mainOwnerTab === 'leads'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Lead Database & File Allocation ({leads.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: Team Dashboard & Leaderboard                     */}
      {/* ======================================================== */}
      {mainOwnerTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Total Calls Today */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Team Calls Today</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {stats?.summary?.totalCallsToday || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Across all 4 callers</p>
            </div>

            {/* Connected Calls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase">Connected Calls</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {stats?.summary?.connectedCallsToday || 0}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                {stats?.summary?.totalCallsToday > 0
                  ? `${Math.round(
                      (stats.summary.connectedCallsToday / stats.summary.totalCallsToday) * 100
                    )}% connection rate`
                  : '0% rate'}
              </p>
            </div>

            {/* Total Talk Time (Requested by User) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 uppercase">Team Talk Time</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Timer className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {formatTotalTime(stats?.summary?.totalTalkTimeSeconds || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Total call duration today</p>
            </div>

            {/* Interested Leads */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 uppercase">Warm / Interested</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {stats?.summary?.interestedLeads || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Qualified in pipeline</p>
            </div>

            {/* Converted Deals */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 uppercase">Converted Deals</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-900 mt-2">
                {stats?.summary?.convertedLeads || 0}
              </div>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Total closed deals</p>
            </div>

            {/* Overdue Follow-ups Alert */}
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-600 uppercase">Team Overdue</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">
                {stats?.summary?.overdueFollowUps || 0}
              </div>
              <p className="text-[11px] text-rose-600 mt-0.5">
                {stats?.summary?.overdueFollowUps > 0
                  ? '⚠️ Requires manager attention!'
                  : 'Zero backlog! All caught up.'}
              </p>
            </div>
          </div>

          {/* Employee Comparative Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Employee Performance & Productivity Leaderboard</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live side-by-side comparison of active sales callers for today
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddCallerModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Caller</span>
                </button>
                <button
                  onClick={() => setShowReassignModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Reassign Leads Between Reps</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Caller</th>
                    <th className="py-3 px-4">Today's Calls / Target</th>
                    <th className="py-3 px-4">Target %</th>
                    <th className="py-3 px-4">Connected %</th>
                    <th className="py-3 px-4">Total Talk Time</th>
                    <th className="py-3 px-4">Interested</th>
                    <th className="py-3 px-4">Converted</th>
                    <th className="py-3 px-4">Assigned Leads</th>
                    <th className="py-3 px-4">Overdue Follow-ups</th>
                    <th className="py-3 px-4 text-right">Quick Filter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(stats?.employeeLeaderboard || []).map((emp: any) => {
                    const targetPct = Math.min(
                      100,
                      Math.round((emp.callsToday / emp.targetDaily) * 100)
                    );

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                          <div className="text-[11px] text-slate-500">{emp.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          <span className="text-blue-600 font-bold">{emp.callsToday}</span> /{' '}
                          {emp.targetDaily}
                        </td>
                        <td className="py-3.5 px-4 min-w-[120px]">
                          <div className="flex items-center space-x-2">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  targetPct >= 75
                                    ? 'bg-emerald-500'
                                    : targetPct >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${targetPct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">
                              {targetPct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-emerald-700">
                            {emp.connectedCalls} ({emp.connectionRate}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                          {formatTotalTime(emp.totalTalkTimeSeconds || 0)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                            {emp.interestedToday}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold">
                            {emp.convertedToday}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {emp.totalAssignedLeads}
                        </td>
                        <td className="py-3.5 px-4">
                          {emp.overdueFollowUps > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold animate-pulse">
                              ⚠️ {emp.overdueFollowUps} Overdue
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">✓ Clean</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setUploadTargetCallerId(emp.id);
                              setShowImportModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors inline-flex items-center space-x-1"
                            title={`Upload Excel file specifically for ${emp.name}`}
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            <span>Upload File</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCallerFilter(emp.id);
                              setMainOwnerTab('leads');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            View Leads →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calls by Employee Bar Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Calls Today vs Daily Target by Caller</span>
                </h3>
                <span className="text-[11px] text-slate-500">Live Team Comparison</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="CallsToday" fill="#2563eb" radius={[4, 4, 0, 0]} name="Calls Made" />
                    <Bar dataKey="Connected" fill="#10b981" radius={[4, 4, 0, 0]} name="Connected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Remark Breakdown Pie Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <PieChartIcon className="w-4 h-4 text-indigo-600" />
                  <span>Call Outcomes & Remarks Breakdown Today</span>
                </h3>
                <span className="text-[11px] text-slate-500">Outcome Distribution</span>
              </div>
              <div className="h-64">
                {pieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No calls recorded today yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={REMARK_COLORS[entry.key] || '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Live Activity Stream */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Real-Time Calling Activity Feed</span>
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(stats?.recentActivity || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No calls logged today yet.</p>
              ) : (
                (stats?.recentActivity || []).map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 flex items-center">
                          <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {act.employee?.name}
                        </span>
                        <span className="text-slate-400">called</span>
                        <span className="font-bold text-blue-700">{act.lead?.name}</span>
                        {act.lead?.phone && (
                          <span className="text-slate-500 font-mono text-[11px]">({act.lead.phone})</span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: REMARK_COLORS[act.remark] || '#64748b' }}
                        >
                          {act.remark}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white text-slate-700 border border-slate-200 shadow-sm">
                          <Timer className="w-3 h-3 mr-1 text-slate-400" />
                          {formatDuration(act.durationSeconds || 0)}
                        </span>
                      </div>

                      {act.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 max-w-2xl">
                          "{act.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(act.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        onClick={() => setSelectedLeadForHistory(act.leadId)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                      >
                        View History
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: Call Remarks, Outcomes & Duration Audit         */}
      {/* ======================================================== */}
      {mainOwnerTab === 'call_logs' && (
        <CallLogsAuditTable employees={employees} isOwnerView={true} />
      )}

      {/* ======================================================== */}
      {/* VIEW 3: Lead Database & File Allocation                  */}
      {/* ======================================================== */}
      {mainOwnerTab === 'leads' && (
        <div className="space-y-6">
          {/* 4-Caller Excel File Allocation Center (Direct File Assignment per Caller) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FolderUp className="w-5 h-5 text-emerald-600" />
                  <span>Caller Lead Allocation & Excel File Assignment</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload separate Excel lead databases (e.g. 2,000 leads each) and assign directly to each caller
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddCallerModal(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add New Caller</span>
                </button>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {(stats?.employeeLeaderboard || []).length} Dedicated Calling Queues
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(stats?.employeeLeaderboard || []).map((emp: any, idx: number) => (
                <div
                  key={emp.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        Caller {idx + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {emp.callsToday} / {emp.targetDaily} calls
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 pt-1">{emp.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate">{emp.email}</p>
                    <div className="pt-2 text-xs">
                      <span className="text-slate-500">Current Database: </span>
                      <span className="font-bold text-slate-900">{emp.totalAssignedLeads.toLocaleString()} leads</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadTargetCallerId(emp.id);
                      setShowImportModal(true);
                    }}
                    className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload Excel for {emp.name.split(' ')[0]}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Lead Pool Management Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Lead Database & Assignment</h2>
                  <p className="text-xs text-slate-500">
                    Search, filter by employee, monitor follow-up urgency, and review call histories
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedCallerFilter !== 'ALL' && (
                    <button
                      onClick={() => setSelectedCallerFilter('ALL')}
                      className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                    >
                      Showing {employees.find((e) => e.id === selectedCallerFilter)?.name || 'Caller'} • Reset to All
                    </button>
                  )}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Filtered Leads: {leads.length}
                  </span>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Filter by Caller */}
                <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
                  <span className="text-slate-500 font-medium">Caller:</span>
                  <select
                    value={selectedCallerFilter}
                    onChange={(e) => setSelectedCallerFilter(e.target.value)}
                    aria-label="Filter leads by assigned caller"
                    className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Callers</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Status */}
                <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    aria-label="Filter leads by status"
                    className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="NEW">New (Uncalled)</option>
                    <option value="FOLLOW_UP">Follow-Up Required</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="CONVERTED">Converted (Won)</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                  <input
                    type="text"
                    placeholder="Search leads by name, phone, or company..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Lead Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Lead Name & Company</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Assigned Caller</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Calls Made</th>
                    <th className="py-3 px-4">Follow-up Schedule</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">No leads in database</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Click "+ Add Lead" or "Upload Excel / CSV" to add leads to your database.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                    const isOverdue =
                      lead.status === 'FOLLOW_UP' &&
                      lead.nextFollowUpDate &&
                      new Date(lead.nextFollowUpDate) < new Date();

                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{lead.name}</div>
                          {lead.company && (
                            <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                              <Building className="w-3 h-3 mr-1 text-slate-400" />
                              {lead.company}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`tel:${lead.phone}`}
                            className="font-semibold text-blue-600 hover:underline flex items-center"
                          >
                            <Phone className="w-3 h-3 mr-1" />
                            {lead.phone}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          {lead.assignedTo ? (
                            <span className="font-semibold text-slate-800 flex items-center">
                              <UserCheck className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {lead.assignedTo.name}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              lead.status === 'CONVERTED'
                                ? 'bg-purple-100 text-purple-700'
                                : lead.status === 'INTERESTED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : lead.status === 'FOLLOW_UP'
                                ? 'bg-blue-100 text-blue-700'
                                : lead.status === 'NEW'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {lead._count?.callLogs || lead.callCount} calls
                        </td>
                        <td className="py-3 px-4">
                          {lead.nextFollowUpDate ? (
                            <span
                              className={`font-semibold flex items-center ${
                                isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-600'
                              }`}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {isOverdue && '⚠️ '}
                              {new Date(lead.nextFollowUpDate).toLocaleString(undefined, {
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
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedLeadForHistory(lead.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            Full History
                          </button>
                          <button
                            onClick={() => setSelectedLeadForCall(lead)}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                          >
                            Log Call
                          </button>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Lead */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Company Name</label>
                <input
                  type="text"
                  value={newLead.company}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Assign To Caller</label>
                <select
                  value={newLead.assignedToId}
                  onChange={(e) => setNewLead({ ...newLead, assignedToId: e.target.value })}
                  aria-label="Assign to caller"
                  className="w-full text-xs p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Leave Unassigned (Pool)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Excel & CSV Import Studio */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setUploadTargetCallerId(undefined);
        }}
        onSuccess={fetchAllData}
        employees={employees}
        defaultEmployeeId={uploadTargetCallerId}
      />

      {/* Modal: Bulk Reassign */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reassign Leads Between Callers</h3>
            <p className="text-xs text-slate-500">
              Quickly move leads from one caller to another (e.g. if an employee is on leave or lagging behind).
            </p>
            <form onSubmit={handleReassign} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">From Caller</label>
                <select
                  value={reassignSourceEmp}
                  onChange={(e) => setReassignSourceEmp(e.target.value)}
                  required
                  aria-label="Source caller to reassign from"
                  className="w-full text-xs p-2.5 border rounded-lg outline-none"
                >
                  <option value="">Select Source Caller</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">To Caller</label>
                <select
                  value={reassignTargetEmp}
                  onChange={(e) => setReassignTargetEmp(e.target.value)}
                  required
                  aria-label="Target caller to reassign to"
                  className="w-full text-xs p-2.5 border rounded-lg outline-none"
                >
                  <option value="">Select Target Caller</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg"
                >
                  Transfer Leads
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals for Call Log & History */}
      <CallLogModal
        lead={selectedLeadForCall}
        employeeId={employees[0]?.id || ''}
        isOpen={!!selectedLeadForCall}
        onClose={() => setSelectedLeadForCall(null)}
        onSaved={fetchAllData}
      />

      <LeadHistoryModal
        leadId={selectedLeadForHistory}
        isOpen={!!selectedLeadForHistory}
        onClose={() => setSelectedLeadForHistory(null)}
      />

      {/* Modal: Add New Caller / Employee */}
      {showAddCallerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <span>Add New Calling Employee</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register a new caller. They can immediately log in with their email and password.
                </p>
              </div>
            </div>

            {callerModalError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                {callerModalError}
              </div>
            )}

            <form onSubmit={handleCreateCaller} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kavita Patel"
                  value={newCaller.name}
                  onChange={(e) => setNewCaller({ ...newCaller, name: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Corporate / Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kavitapatel@gmail.com"
                  value={newCaller.email}
                  onChange={(e) => setNewCaller({ ...newCaller, email: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98999 11223"
                  value={newCaller.phone}
                  onChange={(e) => setNewCaller({ ...newCaller, phone: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Login Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCaller.password}
                    onChange={(e) => setNewCaller({ ...newCaller, password: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Share with caller</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Daily Call Target
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newCaller.targetDaily}
                    onChange={(e) =>
                      setNewCaller({ ...newCaller, targetDaily: parseInt(e.target.value) || 150 })
                    }
                    className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Calls per day</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCallerModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={callerModalLoading}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {callerModalLoading ? <span>Saving...</span> : <span>Create Caller Account</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
