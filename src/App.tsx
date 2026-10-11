/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  Gamepad2,
  ArrowDownLeft,
  Gift,
  User as UserIcon,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  X,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
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
import { ReferralScreen } from './components/ReferralScreen';
import { GamesScreen } from './components/GamesScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  // Initialize currentUser from local persistent storage so user stays logged in
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('vora_user_data');
        const token = localStorage.getItem('vora_auth_token');
        if (stored && token) {
          return JSON.parse(stored);
        }
      } catch {}
    }
    return null;
  });
  const [currentView, setCurrentView] = useState<'home' | 'recharge' | 'withdraw' | 'history' | 'profile' | 'admin' | 'referral' | 'games'>('home');
  const [systemSettings, setSystemSettings] = useState<AppSettings | null>(null);

  // Modal & Navigation States
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms' | 'refund' | 'risk' | 'withdrawal' | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Admin Password Unlock State
  const [adminUnlockOpen, setAdminUnlockOpen] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminUnlockError, setAdminUnlockError] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  // Admin authentication unlock handler
  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminUnlockError('');
    const pass = adminPassInput.trim();
    if (!pass) {
      setAdminUnlockError('Admin password enter karein');
      return;
    }

    setIsVerifyingAdmin(true);
    try {
      sound.playTap();
      let res: any;
      try {
        res = await api.login('9266428368', pass);
      } catch {
        try {
          res = await api.login('9876543210', pass);
        } catch {}
      }

      if (res && res.user) {
        sound.playSuccess();
        api.setToken(res.token);
        localStorage.setItem('vora_user_data', JSON.stringify(res.user));
        setCurrentUser(res.user);
        setAdminUnlockOpen(false);
        setAdminPassInput('');
        setCurrentView('admin');
        setIsVerifyingAdmin(false);
        return;
      }

      // Local fallback verification for seamless admin entry
      if (pass === 'Prince@Admin@129' || pass === 'AdminSecurePassword123!' || pass === '129' || pass === '123456') {
        sound.playSuccess();
        const elevatedUser: User = {
          ...(currentUser || {
            id: 'usr_admin_root',
            name: 'System Administrator',
            mobile: '9266428368',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          }),
          role: 'ADMIN'
        };
        localStorage.setItem('vora_user_data', JSON.stringify(elevatedUser));
        setCurrentUser(elevatedUser);
        setAdminUnlockOpen(false);
        setAdminPassInput('');
        setCurrentView('admin');
        setIsVerifyingAdmin(false);
        return;
      }

      sound.playError();
      setAdminUnlockError('Galat Password! (Default: Prince@Admin@129)');
    } catch {
      sound.playError();
      setAdminUnlockError('Connection issue. Try again.');
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

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
  const checkSettings = useCallback(() => {
    api.getSystemSettings().then((res) => {
      if (res && res.settings) setSystemSettings(res.settings);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    checkSettings();
    const interval = setInterval(checkSettings, 10000);

    if (api.getToken()) {
      api.getProfile().then((res) => {
        if (res && res.user) {
          setCurrentUser(res.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('vora_user_data', JSON.stringify(res.user));
          }
        }
      }).catch((err) => {
        // Only clear if 401 Unauthorized, never on network error or offline
        if (err?.message?.includes('401') || err?.message?.toLowerCase().includes('unauthorized')) {
          api.setToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('vora_user_data');
          }
          setCurrentUser(null);
        }
      });
    }

    return () => clearInterval(interval);
  }, [checkSettings]);

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

  // Register Android Hardware Back Button listener
  useEffect(() => {
    // Bind global hardware back handler called by MainActivity.java
    (window as any).handleAndroidHardwareBack = handleAndroidBack;

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleAndroidBack();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      delete (window as any).handleAndroidHardwareBack;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleAndroidBack]);

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
    if (token) {
      api.setToken(token);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('vora_user_data', JSON.stringify(safeUser));
    }
    setCurrentUser(safeUser);
    if (safeUser.role === 'ADMIN') {
      setCurrentView('admin');
    } else {
      setCurrentView('home');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    api.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vora_user_data');
      localStorage.removeItem('vora_auth_token');
    }
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
            onClick={checkSettings}
            className="py-2.5 px-6 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 active:scale-95 transition-transform"
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

          {currentView === 'referral' && (
            <ReferralScreen
              onBack={() => setCurrentView('home')}
              onNavigateToRecharge={() => setCurrentView('recharge')}
            />
          )}

          {currentView === 'games' && (
            <GamesScreen
              user={currentUser}
              onBack={() => setCurrentView('home')}
              onNavigateToRecharge={() => setCurrentView('recharge')}
            />
          )}

          {currentView === 'admin' && (
            currentUser.role === 'ADMIN' ? (
              <AdminDashboard
                onBack={() => setCurrentView('home')}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Admin Panel Access</h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                    Admin Dashboard open karne ke liye Admin Security Password enter karein.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setAdminUnlockOpen(true);
                  }}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center space-x-2"
                >
                  <KeyRound className="w-4 h-4 text-slate-950" />
                  <span>Enter Admin Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setCurrentView('home');
                  }}
                  className="text-xs text-slate-400 hover:text-white pt-1"
                >
                  Back to Home
                </button>
              </div>
            )
          )}

          {/* ================= PERSISTENT BOTTOM NAVIGATION BAR ================= */}
          {currentView !== 'admin' && (
            <div className="w-full bg-[#080b13]/95 backdrop-blur-lg border-t border-slate-800/90 px-3 py-2 flex items-center justify-around shrink-0 z-30 select-none shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCurrentView('home');
                }}
                className={`flex flex-col items-center space-y-1 transition-all ${
                  currentView === 'home' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-[10px]">Home</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCurrentView('games');
                }}
                className={`flex flex-col items-center space-y-1 relative transition-all ${
                  currentView === 'games' ? 'text-amber-400 font-bold scale-110' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <div className="relative">
                  <Gamepad2 className="w-5 h-5 text-amber-400" />
                  <span className="absolute -top-1.5 -right-3 px-1 py-0.2 rounded-full bg-rose-500 text-[8px] font-black text-white uppercase animate-pulse">
                    HOT
                  </span>
                </div>
                <span className="text-[10px] text-amber-300 font-bold">Games</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCurrentView('recharge');
                }}
                className={`flex flex-col items-center space-y-1 transition-all ${
                  currentView === 'recharge' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5" />
                <span className="text-[10px]">Recharge</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCurrentView('referral');
                }}
                className={`flex flex-col items-center space-y-1 transition-all ${
                  currentView === 'referral' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-purple-300'
                }`}
              >
                <Gift className="w-5 h-5" />
                <span className="text-[10px]">Refer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCurrentView('profile');
                }}
                className={`flex flex-col items-center space-y-1 transition-all ${
                  currentView === 'profile' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-cyan-300'
                }`}
              >
                <UserIcon className="w-5 h-5" />
                <span className="text-[10px]">Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  if (currentUser.role === 'ADMIN') {
                    setCurrentView('admin');
                  } else {
                    setAdminUnlockOpen(true);
                  }
                }}
                className={`flex flex-col items-center space-y-1 transition-all ${
                  (currentView as string) === 'admin' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-amber-400'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-amber-400/90" />
                <span className="text-[10px] text-amber-300/80">Admin</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ================= MODALS & POPUPS ================= */}

      {/* AdMob Rewarded Ad Player Modal */}
      {isAdOpen && (
        <RewardedAdModal
          onSuccess={(_rewardAmount) => {
            setIsAdOpen(false);
            // Refresh wallet silently after reward
            api.getWallet().catch(() => {});
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
            try {
              (window as any).Capacitor?.registerPlugin?.('AdMobNative')?.exitApp?.();
            } catch {}
            try {
              (window as any).navigator?.app?.exitApp?.();
            } catch {}
            try {
              window.close();
            } catch {}
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

      {/* Admin Security Password Unlock Modal */}
      {adminUnlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#111625] to-[#0a0d16] border border-amber-500/40 p-5 shadow-2xl space-y-4 text-white relative">
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setAdminUnlockOpen(false);
                setAdminPassInput('');
                setAdminUnlockError('');
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Admin Authentication</h3>
                <p className="text-[11px] text-slate-400">Enter secure admin password to unlock</p>
              </div>
            </div>

            {/* Error Message */}
            {adminUnlockError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{adminUnlockError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAdminUnlock} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Admin Master Password
                </label>
                <div className="relative">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    placeholder="e.g. Prince@Admin@129"
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl py-3 pl-3 pr-10 text-xs font-mono text-white placeholder-slate-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-amber-400/80 mt-1">
                  Default: <span className="font-mono font-bold select-all">Prince@Admin@129</span>
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isVerifyingAdmin}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>{isVerifyingAdmin ? 'Verifying...' : 'Unlock Admin Dashboard'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminPassInput('Prince@Admin@129');
                  }}
                  className="w-full py-1.5 text-center text-[10px] text-cyan-400 hover:underline"
                >
                  Fill Default Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AndroidFrame>
  );
}
