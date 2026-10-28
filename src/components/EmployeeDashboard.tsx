'use client';

import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Clock,
  Calendar,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Search,
  Filter,
  History,
  Building,
  Target,
  TrendingUp,
  User,
  ArrowRight,
} from 'lucide-react';
import CallLogModal from './CallLogModal';
import LeadHistoryModal from './LeadHistoryModal';
import CallLogsAuditTable from './CallLogsAuditTable';

interface EmployeeDashboardProps {
  currentUser: any;
}

export default function EmployeeDashboard({ currentUser }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'fresh' | 'all' | 'logs'>('today');
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals state
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<any>(null);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    try {
      // Fetch stats
      const statsRes = await fetch(`/api/stats/employee?employeeId=${currentUser.id}`);
      const statsData = await statsRes.json();
      setStats(statsData.metrics);

      // Fetch leads based on active tab
      const tabParam = activeTab === 'all' ? '' : `&tab=${activeTab}`;
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const leadsRes = await fetch(
        `/api/leads?assignedToId=${currentUser.id}${tabParam}${searchParam}`
      );
      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads || []);
    } catch (error) {
      console.error('Error fetching employee dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser?.id, activeTab, search]);

  const handleCallSuccess = () => {
    fetchDashboardData();
  };

  const overdueCount = stats?.overdueCount || 0;
  const dueTodayCount = stats?.dueTodayCount || 0;
  const freshCount = stats?.freshCount || 0;

  return (
    <div className="space-y-6">
      {/* Employee Top Greeting & Target Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Employee Workstation</span>
              <span>•</span>
              <span>Ready for Calling</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Welcome, {currentUser?.name}</h1>
            <p className="text-sm text-blue-100 mt-1">
              Clear your high-priority follow-ups and log every call remark in real time.
            </p>
          </div>

          {/* Daily Progress Gauge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl min-w-[280px]">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="flex items-center">
                <Target className="w-4 h-4 mr-1.5 text-blue-300" /> Today's Call Goal
              </span>
              <span className="font-mono text-sm font-bold text-white">
                {stats?.callsToday || 0} / {stats?.targetDaily || 150}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stats?.targetPercentage || 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-blue-200 mt-2">
              <span>{stats?.targetPercentage || 0}% achieved</span>
              <span>Connected: {stats?.connectedCalls || 0} ({stats?.connectionRate || 0}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overdue Card */}
        <div
          onClick={() => setActiveTab('overdue')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Overdue Calls</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-2">{overdueCount}</div>
          <p className="text-[11px] text-rose-600 mt-0.5">Missed past follow-ups (Call first!)</p>
        </div>

        {/* Due Today Card */}
        <div
          onClick={() => setActiveTab('today')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'today'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Due Today</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">{dueTodayCount}</div>
          <p className="text-[11px] text-amber-600 mt-0.5">Scheduled for today</p>
        </div>

        {/* Fresh Leads Card */}
        <div
          onClick={() => setActiveTab('fresh')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'fresh'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Fresh Leads</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2">{freshCount}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Uncontacted leads in queue</p>
        </div>

        {/* Converted Total Card */}
        <div
          onClick={() => setActiveTab('all')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'all'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400'
              : 'bg-white border-slate-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase">Converted Deals</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-900 mt-2">{stats?.convertedTotal || 0}</div>
          <p className="text-[11px] text-purple-600 mt-0.5">Total closed / won deals</p>
        </div>
      </div>

      {/* Main Calling Queue Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs & Search */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                activeTab === 'today'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Today's Follow-ups</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'today' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {dueTodayCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                activeTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overdue</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'overdue' ? 'bg-rose-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {overdueCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('fresh')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                activeTab === 'fresh'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fresh Leads</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'fresh' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {freshCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>All My Leads ({stats?.totalAssigned || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>My Call Logs & Remarks ({stats?.callsToday || 0})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, phone, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content: Either My Call Logs Table or Lead Queue Cards */}
        {activeTab === 'logs' ? (
          <div className="p-4">
            <CallLogsAuditTable
              employees={[]}
              initialEmployeeId={currentUser?.id}
              isOwnerView={false}
            />
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading leads queue...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'overdue'
                ? 'No Overdue Follow-ups! Great job staying ahead.'
                : activeTab === 'today'
                ? "All caught up on today's scheduled follow-ups!"
                : 'No leads found matching criteria.'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Switch to "Fresh Leads" or "All My Leads" to continue calling.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const isOverdue =
                lead.status === 'FOLLOW_UP' &&
                lead.nextFollowUpDate &&
                new Date(lead.nextFollowUpDate) < new Date();

              return (
                <div
                  key={lead.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Lead Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-900 text-sm">{lead.name}</span>
                      {lead.company && (
                        <span className="text-xs text-slate-500 flex items-center">
                          <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {lead.company}
                        </span>
                      )}
                      {/* Priority pill */}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          lead.priority === 'HIGH'
                            ? 'bg-rose-100 text-rose-700'
                            : lead.priority === 'LOW'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {lead.priority}
                      </span>
                      {/* Status pill */}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {lead.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <a
                        href={`tel:${lead.phone}`}
                        className="font-bold text-blue-600 hover:underline flex items-center"
                      >
                        <Phone className="w-3.5 h-3.5 mr-1" />
                        {lead.phone}
                      </a>

                      {lead.callCount > 0 && (
                        <span className="text-slate-400">
                          {lead.callCount} previous {lead.callCount === 1 ? 'call' : 'calls'}
                        </span>
                      )}

                      {lead.nextFollowUpDate && (
                        <span
                          className={`font-semibold flex items-center ${
                            isOverdue ? 'text-rose-600' : 'text-amber-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {isOverdue ? '⚠️ Overdue: ' : 'Scheduled: '}
                          {new Date(lead.nextFollowUpDate).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    {lead.notes && (
                      <p className="text-xs text-slate-600 line-clamp-1 italic">
                        "{lead.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => setSelectedLeadForHistory(lead.id)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>

                    <button
                      onClick={() => setSelectedLeadForCall(lead)}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Log Call</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CallLogModal
        lead={selectedLeadForCall}
        employeeId={currentUser?.id}
        isOpen={!!selectedLeadForCall}
        onClose={() => setSelectedLeadForCall(null)}
        onSaved={handleCallSuccess}
      />

      <LeadHistoryModal
        leadId={selectedLeadForHistory}
        isOpen={!!selectedLeadForHistory}
        onClose={() => setSelectedLeadForHistory(null)}
      />
    </div>
  );
}
