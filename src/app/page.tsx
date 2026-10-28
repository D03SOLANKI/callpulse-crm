'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import OwnerDashboard from '@/components/OwnerDashboard';
import EmployeeDashboard from '@/components/EmployeeDashboard';
import LoginPage from '@/components/LoginPage';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load active user session
  const loadInitialData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();

      setCurrentUser(meData.user || null);
    } catch (err) {
      console.error('Failed to load user session:', err);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Loading CallPulse CRM...</p>
        </div>
      </div>
    );
  }

  // If logged out or unauthenticated, show the Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={setCurrentUser} />;
  }

  const isOwner = currentUser?.role === 'OWNER';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isOwner ? (
          <OwnerDashboard />
        ) : (
          <EmployeeDashboard currentUser={currentUser} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        CallPulse Outbound CRM & Performance Management • Enterprise Data Isolation Active
      </footer>
    </div>
  );
}
