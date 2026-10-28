'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Building,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ThumbsDown,
  PhoneMissed,
  Timer,
  Play,
  Square,
  MessageSquare,
} from 'lucide-react';

interface CallLogModalProps {
  lead: any;
  employeeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const REMARK_OPTIONS = [
  {
    id: 'INTERESTED',
    label: 'Interested',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
    selectedColor: 'bg-emerald-600 text-white border-emerald-600',
    icon: CheckCircle2,
    requiresFollowUp: true,
  },
  {
    id: 'CALL_BACK_LATER',
    label: 'Call Back Later',
    color: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
    selectedColor: 'bg-amber-600 text-white border-amber-600',
    icon: Clock,
    requiresFollowUp: true,
  },
  {
    id: 'FOLLOW_UP',
    label: 'Follow-Up Required',
    color: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
    selectedColor: 'bg-blue-600 text-white border-blue-600',
    icon: Calendar,
    requiresFollowUp: true,
  },
  {
    id: 'CONVERTED',
    label: 'Converted / Deal Closed',
    color: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100',
    selectedColor: 'bg-purple-600 text-white border-purple-600',
    icon: CheckCircle2,
    requiresFollowUp: false,
  },
  {
    id: 'NO_ANSWER',
    label: 'No Answer / Busy',
    color: 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100',
    selectedColor: 'bg-slate-600 text-white border-slate-600',
    icon: PhoneMissed,
    requiresFollowUp: false,
  },
  {
    id: 'NOT_INTERESTED',
    label: 'Not Interested',
    color: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
    selectedColor: 'bg-rose-600 text-white border-rose-600',
    icon: ThumbsDown,
    requiresFollowUp: false,
  },
  {
    id: 'WRONG_NUMBER',
    label: 'Wrong / Invalid Number',
    color: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200',
    selectedColor: 'bg-gray-800 text-white border-gray-800',
    icon: AlertCircle,
    requiresFollowUp: false,
  },
];

const QUICK_NOTES = [
  'Interested in pricing proposal',
  'Decision maker busy, requested evening callback',
  'Follow-up scheduled for demo',
  'No budget right now',
  'Ringing, no answer',
  'Contract agreed, sending invoice',
];

export default function CallLogModal({
  lead,
  employeeId,
  isOpen,
  onClose,
  onSaved,
}: CallLogModalProps) {
  const [remark, setRemark] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Default follow-up date to tomorrow at 11 AM
  useEffect(() => {
    if (isOpen) {
      setRemark('');
      setNotes('');
      setDuration(0);
      setIsTimerRunning(true);
      setError('');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFollowUpDate(localIso);
    } else {
      setIsTimerRunning(false);
    }
  }, [isOpen]);

  // Live timer tick
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  if (!isOpen || !lead) return null;

  const currentRemarkObj = REMARK_OPTIONS.find((r) => r.id === remark);
  const needsFollowUp = currentRemarkObj?.requiresFollowUp;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleRemarkSelect = (id: string) => {
    setRemark(id);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remark) {
      setError('Please select a call remark/outcome.');
      return;
    }

    if (needsFollowUp && !followUpDate) {
      setError('Please select a follow-up date and time.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          employeeId,
          remark,
          notes,
          durationSeconds: duration,
          followUpDate: needsFollowUp ? new Date(followUpDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record call');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Log Call Outcome</h2>
              <p className="text-xs text-slate-300">Record call remarks, notes & next actions</p>
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

        {/* Lead Info Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900">{lead.name}</div>
            <div className="flex items-center space-x-3 text-xs text-slate-600 mt-0.5">
              {lead.company && (
                <span className="flex items-center">
                  <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {lead.company}
                </span>
              )}
              <span className="flex items-center font-medium text-blue-600">
                <Phone className="w-3.5 h-3.5 mr-1" />
                <a href={`tel:${lead.phone}`} className="hover:underline">
                  {lead.phone}
                </a>
              </span>
            </div>
          </div>

          {/* Call Timer widget */}
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <Timer className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-sm font-semibold text-slate-800">
              {formatTimer(duration)}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              title={isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
            >
              {isTimerRunning ? <Square className="w-3.5 h-3.5 fill-red-500 text-red-500" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Remark Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Call Remark / Outcome <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REMARK_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = remark === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleRemarkSelect(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected ? item.selectedColor + ' shadow-md scale-[1.02]' : item.color
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follow-up Date/Time (Conditional or standard) */}
          {needsFollowUp && (
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Scheduled Follow-up Date & Time</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-medium text-blue-700">Auto-adds to your queue</span>
              </div>
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required={needsFollowUp}
                aria-label="Scheduled Follow-up Date and Time"
                className="w-full text-xs font-medium bg-white px-3 py-2 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Quick Notes Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Call Remarks & Discussion Notes
              </label>
              <span className="text-[10px] text-slate-400">Click a chip to quick-fill</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_NOTES.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNotes(chip)}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter details of conversation, client requirements, objections, or agreed next steps..."
              className="w-full text-xs text-slate-900 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
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
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving Log...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Call & Complete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
