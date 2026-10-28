'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Building,
  Mail,
  Calendar,
  Clock,
  User,
  History,
  CheckCircle2,
  Clock3,
  ThumbsDown,
  PhoneMissed,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface LeadHistoryModalProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LeadHistoryModal({ leadId, isOpen, onClose }: LeadHistoryModalProps) {
  const [lead, setLead] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && leadId) {
      setLoading(true);
      fetch(`/api/calls?leadId=${leadId}`)
        .then((res) => res.json())
        .then((data) => {
          setCalls(data.calls || []);
        })
        .catch(console.error);

      fetch(`/api/leads?search=${leadId}`)
        .then((res) => res.json())
        .then((data) => {
          const found = data.leads?.find((l: any) => l.id === leadId);
          if (found) setLead(found);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, leadId]);

  if (!isOpen || !leadId) return null;

  const getRemarkBadge = (remark: string) => {
    switch (remark) {
      case 'INTERESTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Interested
          </span>
        );
      case 'CALL_BACK_LATER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" /> Call Back Later
          </span>
        );
      case 'FOLLOW_UP':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
            <Calendar className="w-3 h-3 mr-1" /> Follow-Up Required
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Converted
          </span>
        );
      case 'NO_ANSWER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            <PhoneMissed className="w-3 h-3 mr-1" /> No Answer
          </span>
        );
      case 'NOT_INTERESTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <ThumbsDown className="w-3 h-3 mr-1" /> Not Interested
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800">
            {remark}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Lead Interaction History</h2>
              <p className="text-xs text-slate-300">Complete chronological audit trail</p>
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

        {/* Lead Details Summary */}
        {lead && (
          <div className="bg-slate-50 border-b border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{lead.name}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                  {lead.company && (
                    <span className="flex items-center">
                      <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {lead.company}
                    </span>
                  )}
                  <span className="flex items-center font-semibold text-blue-600">
                    <Phone className="w-3.5 h-3.5 mr-1" />
                    {lead.phone}
                  </span>
                  {lead.email && (
                    <span className="flex items-center">
                      <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {lead.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                  Status: {lead.status}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                  Calls Made: {lead._count?.callLogs || calls.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* History Timeline */}
        <div className="p-6 max-h-[460px] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading call history...</div>
          ) : calls.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No calls logged yet</p>
              <p className="text-xs text-slate-500 mt-1">This lead has not been contacted yet.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {calls.map((call) => (
                <div key={call.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm" />

                  <div className="bg-slate-50 hover:bg-slate-100/80 transition-colors p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {getRemarkBadge(call.remark)}
                        <span className="text-xs font-semibold text-slate-700 flex items-center">
                          <User className="w-3 h-3 mr-1 text-slate-400" />
                          {call.employee?.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center">
                        <Clock3 className="w-3 h-3 mr-1 text-slate-400" />
                        {new Date(call.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    {call.notes && (
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">
                        {call.notes}
                      </p>
                    )}

                    {/* Meta items */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      {call.durationSeconds > 0 && (
                        <span>Duration: {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s</span>
                      )}
                      {call.followUpDate && (
                        <span className="text-blue-600 font-semibold flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Follow-up Scheduled: {new Date(call.followUpDate).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
