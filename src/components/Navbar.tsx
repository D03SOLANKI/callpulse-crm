'use client';

import React from 'react';
import { PhoneCall, Shield, User, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser: any;
  allUsers?: any[];
  onSwitchUser?: (userId: string) => void;
  onLogout: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  const isOwner = currentUser?.role === 'OWNER';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">CallPulse</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  CRM
                </span>
              </div>
              <p className="text-xs text-slate-500">Outbound Performance Management</p>
            </div>
          </div>

          {/* User Profile & Logout Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Current Active Badge */}
            <div className="flex items-center space-x-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm ${
                  isOwner ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {isOwner ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {currentUser?.name || 'Loading...'}
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {isOwner ? '👑 Owner / Admin' : `📞 Caller (${currentUser?.targetDaily || 150} calls goal)`}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
