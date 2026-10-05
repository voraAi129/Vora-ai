/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { sound } from './services/audio';
import { User, AppSettings } from './types';

// Components
import { SplashScreen } from './components/SplashScreen';
import { AndroidFrame } from './components/AndroidFrame';
import { AuthModal } from './components/AuthModal';
import { HomeScreen } from './components/HomeScreen';
import { RechargeScreen } from './components/RechargeScreen';
import { WithdrawalScreen } from './components/WithdrawalScreen';
import { TransactionHistoryScreen } from './components/TransactionHistoryScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { RewardedAdModal } from './components/RewardedAdModal';
import { LegalModal } from './components/LegalModal';
import { SupportModal } from './components/SupportModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { OfflineModal } from './components/OfflineModal';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'recharge' | 'withdraw' | 'history' | 'profile' | 'admin'>('home');
  const [systemSettings, setSystemSettings] = useState<AppSettings | null>(null);

  // Modals
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | 'refund' | 'withdrawal' | 'risk' | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Network connection monitor
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    api.setOfflineHandler(() => setIsOffline(true));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check stored auth session and system settings
  useEffect(() => {
    api.getSystemSettings().then((res) => {
      if (res.settings) setSystemSettings(res.settings);
    }).catch(() => {});

    if (api.getToken()) {
      api.getProfile().then((res) => {
        if (res.user) {
          setCurrentUser(res.user);
        }
      }).catch(() => {
        api.setToken(null);
      });
    }
  }, []);

  // Back button handler
  const handleAndroidBack = useCallback(() => {
    if (isExitConfirmOpen) {
      setIsExitConfirmOpen(false);
      return;
    }
    if (isAdOpen) {
      // Handled inside ad modal
      return;
    }
    if (legalTab) {
      setLegalTab(null);
      return;
    }
    if (isSupportOpen) {
      setIsSupportOpen(false);
      return;
    }
    if (isNotifsOpen) {
      setIsNotifsOpen(false);
      return;
    }

    if (currentView !== 'home') {
      sound.playTap();
      setCurrentView('home');
    } else {
      // On root screen: trigger exit confirmation dialog
      sound.playTap();
      setIsExitConfirmOpen(true);
    }
  }, [currentView, isExitConfirmOpen, isAdOpen, legalTab, isSupportOpen, isNotifsOpen]);

  // Auth success handler
  const handleAuthSuccess = (user: User, token: string) => {
    const safeUser: User = user ? {
      ...user,
      role: user.role || 'USER'
    } : {
      id: 'usr_default',
      name: 'Vora User',
      mobile: '',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    setCurrentUser(safeUser);
    if (safeUser.role === 'ADMIN') {
      setCurrentView('admin');
    } else {
      setCurrentView('home');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentView('home');
  };

  // 1. Splash Screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Check Maintenance Mode
  const isMaintenanceActive = Boolean(systemSettings?.maintenanceMode && currentUser?.role !== 'ADMIN');

  return (
    <AndroidFrame
      onBackPress={handleAndroidBack}
      canGoBack={currentView !== 'home'}
    >
      {/* Maintenance Mode Overlay for regular users */}
      {isMaintenanceActive ? (
        <div className="flex-1 w-full min-h-full flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <span className="text-2xl font-bold font-mono">⚠️</span>
          </div>
          <h2 className="text-xl font-bold">VORA EARNING is under maintenance</h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            We are upgrading financial ledger pipelines for improved security. Please check back shortly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="py-2.5 px-6 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200"
          >
            Check Again
          </button>
        </div>
      ) : !currentUser ? (
        /* 2. Authentication View (Login / Register without public admin login label) */
        <AuthModal
          onAuthSuccess={handleAuthSuccess}
          onOpenLegal={(tab) => setLegalTab(tab)}
        />
      ) : (
        /* 3. Main Authenticated Application Views */
        <>
          {currentView === 'home' && (
            <HomeScreen
              user={currentUser}
              onNavigate={(v) => {
                if (v === 'notifications') setIsNotifsOpen(true);
                else setCurrentView(v as any);
              }}
              onWatchAd={() => setIsAdOpen(true)}
            />
          )}

          {currentView === 'recharge' && (
            <RechargeScreen
              onBack={() => setCurrentView('home')}
              onSuccessDone={() => setCurrentView('home')}
            />
          )}

          {currentView === 'withdraw' && (
            <WithdrawalScreen
              user={currentUser}
              onBack={() => setCurrentView('home')}
              onSuccess={() => setCurrentView('home')}
            />
          )}

          {currentView === 'history' && (
            <TransactionHistoryScreen
              onBack={() => setCurrentView('home')}
            />
          )}

          {currentView === 'profile' && (
            <ProfileScreen
              user={currentUser}
              onBack={() => setCurrentView('home')}
              onLogout={handleLogout}
              onOpenLegal={(tab) => setLegalTab(tab)}
              onOpenSupport={() => setIsSupportOpen(true)}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'admin' && (
            currentUser.role === 'ADMIN' ? (
              <AdminDashboard
                onBack={() => setCurrentView('home')}
              />
            ) : (
              // Non-admin user trying to access admin — silently redirect home
              (() => { setCurrentView('home'); return null; })()
            )
          )}
        </>
      )}

      {/* ================= MODALS & POPUPS ================= */}

      {/* AdMob Rewarded Ad Player Modal */}
      {isAdOpen && (
        <RewardedAdModal
          onSuccess={() => {
            setIsAdOpen(false);
          }}
          onClose={() => setIsAdOpen(false)}
        />
      )}

      {/* Legal & Policy Screen Modal */}
      {legalTab && (
        <LegalModal
          initialTab={legalTab}
          onClose={() => setLegalTab(null)}
        />
      )}

      {/* Help & Support Modal */}
      {isSupportOpen && (
        <SupportModal
          onClose={() => setIsSupportOpen(false)}
        />
      )}

      {/* Notifications Modal */}
      {isNotifsOpen && (
        <NotificationsModal
          onClose={() => setIsNotifsOpen(false)}
        />
      )}

      {/* Android Back Exit Confirmation Dialog */}
      {isExitConfirmOpen && (
        <ExitConfirmModal
          onConfirm={() => {
            setIsExitConfirmOpen(false);
            window.location.reload();
          }}
          onCancel={() => setIsExitConfirmOpen(false)}
        />
      )}

      {/* Network Connection Error Modal */}
      {isOffline && (
        <OfflineModal
          onRetry={() => {
            if (navigator.onLine) {
              setIsOffline(false);
            } else {
              sound.playError();
            }
          }}
          onClose={() => setIsOffline(false)}
        />
      )}
    </AndroidFrame>
  );
}
