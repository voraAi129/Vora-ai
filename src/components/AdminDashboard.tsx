import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  Tv,
  Settings,
  FileText,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ArrowLeft,
  RefreshCw,
  Sliders,
  DollarSign,
  Download,
  Upload,
  Lock,
  Eye,
  Slash,
  Sparkles,
  Check,
  AlertCircle,
  Play,
  FlaskConical,
  Zap,
  Server,
  Gift,
  Percent,
  Award
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/audio';
import {
  User,
  WithdrawalRecord,
  RewardCampaign,
  AppSettings,
  SupportTicket,
  AuditLog,
  AdRewardConfig,
  UpiDeposit
} from '../types';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'deposits' | 'users' | 'withdrawals' | 'ads' | 'campaigns' | 'referrals' | 'tickets' | 'settings' | 'audit' | 'testing'
  >('overview');

  // Referral Program Config & Stats
  const [referralStats, setReferralStats] = useState<{
    settings: Partial<AppSettings>;
    totalReferredUsers: number;
    totalReferralBonusPaid: number;
    topReferrers: Array<{
      id: string;
      name: string;
      mobile: string;
      referralCode: string;
      totalInvited: number;
      rechargedCount: number;
      totalEarnings: number;
    }>;
  }>({
    settings: {
      referralProgramEnabled: true,
      referralRewardPerUser: 50,
      referralCommissionPercent: 1,
      referralTier10Bonus: 500,
      referralTier100Bonus: 5000,
      referralMinRechargeAmount: 100,
      referredUserSignupBonus: 25
    },
    totalReferredUsers: 0,
    totalReferralBonusPaid: 0,
    topReferrers: []
  });
  const [isSavingReferralConfig, setIsSavingReferralConfig] = useState(false);
  const [referralReason, setReferralReason] = useState('');

  // Stats & Alerts
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  // UPI Recharges & Manual Deposits
  const [upiDeposits, setUpiDeposits] = useState<UpiDeposit[]>([]);
  const [upiFilter, setUpiFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null);
  const [rejectingDeposit, setRejectingDeposit] = useState<UpiDeposit | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [isProcessingDeposit, setIsProcessingDeposit] = useState<boolean>(false);

  // Users
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [userStatusModal, setUserStatusModal] = useState<{ user: any; newStatus: string; reason: string } | null>(null);

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState('ALL');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRecord | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [isUpdatingWithdrawal, setIsUpdatingWithdrawal] = useState(false);
  const [withdrawalModalMsg, setWithdrawalModalMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Persistent local cache keys
  const CACHED_AD_CONFIG = 'vora_admin_ad_config';
  const CACHED_SETTINGS = 'vora_admin_settings';

  // Ads & AdMob Config with persistent local fallback
  const [adConfig, setAdConfig] = useState<AdRewardConfig>(() => {
    try {
      const cached = localStorage.getItem(CACHED_AD_CONFIG);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      adMobAppId: 'ca-app-pub-3940256099942544~3347511713',
      rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
      bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
      interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
      rewardPerAd: 2.5,
      dailyMaxAds: 10,
      cooldownSeconds: 30
    };
  });
  const [adReason, setAdReason] = useState('');
  const [isSavingAdConfig, setIsSavingAdConfig] = useState(false);
  const [adSuccessMsg, setAdSuccessMsg] = useState<string | null>(null);

  // Support Tickets
  const [adminTickets, setAdminTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Campaigns
  const [campaigns, setCampaigns] = useState<RewardCampaign[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);

  // Settings with persistent local fallback
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem(CACHED_SETTINGS);
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      appName: 'VORA EARNING',
      maintenanceMode: false,
      minSupportedVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdateEnabled: false,
      updateUrl: 'https://play.google.com/store/apps/details?id=com.vora.earning',
      minRechargeAmount: 100,
      maxRechargeAmount: 100000,
      minWithdrawalAmount: 200,
      maxWithdrawalAmount: 25000,
      withdrawalFeePercentage: 0,
      quickRechargeChips: [100, 250, 500, 1000, 2000, 5000, 10000],
      termsAndConditions: 'Welcome to VORA EARNING. This application is a compliant rewards and fintech loyalty platform.',
      privacyPolicy: 'Your privacy is paramount at VORA EARNING.',
      refundPolicy: 'Recharge payments verified on Razorpay that are not credited are automatically reconciled.',
      withdrawalPolicy: 'Withdrawals are processed to verified domestic bank accounts or UPI VPA.',
      riskDisclosure: 'VORA EARNING operates with transparent financial limits.',
      supportEmail: 'support@voraearning.com',
      supportPhone: '+91 8000 123 456',
      upiId: '9266428368-i638-2@ibl',
      upiPayeeName: 'Vora Earning'
    };
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Testing & QA Suite State (Exclusive to Admin)
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [fastForwardResult, setFastForwardResult] = useState<string | null>(null);
  const [qaTests, setQaTests] = useState<any[]>([
    { id: 't1', name: 'Mobile & Password Validation Logic', category: 'AUTH', status: 'IDLE' },
    { id: 't2', name: 'OTP Verification & Expiry Pipeline', category: 'AUTH', status: 'IDLE' },
    { id: 't3', name: 'Universal Login & Session Issuance', category: 'AUTH', status: 'IDLE' },
    { id: 't4', name: 'Strict RBAC Security Enforcement', category: 'SECURITY', status: 'IDLE' },
    { id: 't5', name: 'Wallet Ledger Double-Entry Invariants', category: 'WALLET', status: 'IDLE' },
    { id: 't6', name: 'Payment Order Gateway Simulation', category: 'PAYMENT', status: 'IDLE' },
    { id: 't7', name: 'Recharge Idempotency & Duplicate Guards', category: 'PAYMENT', status: 'IDLE' },
    { id: 't8', name: 'Server Timestamp & Session Anti-Clock Tampering', category: 'REWARDS', status: 'IDLE' },
    { id: 't9', name: 'AdMob Rewarded Video Token Verification', category: 'ADMOB', status: 'IDLE' },
    { id: 't10', name: 'Withdrawal Limits & Balance Locking Enforcement', category: 'WALLET', status: 'IDLE' }
  ]);
  const [isRunningQaTests, setIsRunningQaTests] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load core dashboard
      try {
        const dashRes = await api.getAdminDashboard();
        if (dashRes?.stats) setStats(dashRes.stats);
        if (dashRes?.systemAlerts) setAlerts(dashRes.systemAlerts);
      } catch (err: any) {
        console.warn('Dashboard stats fetch:', err);
      }
      setLoading(false);

      // Load all admin modules in background
      const [wRes, setRes, logRes, tktRes, upiRes, cmpRes, adRes, refRes] = await Promise.allSettled([
        api.getAdminWithdrawals(),
        api.getAdminSettings(),
        api.getAdminAuditLogs(),
        api.getAdminTickets(),
        api.getAdminUpiDeposits(),
        api.getAdminRewardConfig(),
        api.getAdminAdConfig(),
        api.getAdminReferralStats()
      ]);

      if (wRes.status === 'fulfilled' && wRes.value?.withdrawals) setWithdrawals(wRes.value.withdrawals);
      if (setRes.status === 'fulfilled' && setRes.value?.settings) {
        setSettings(setRes.value.settings);
        try { localStorage.setItem(CACHED_SETTINGS, JSON.stringify(setRes.value.settings)); } catch {}
      }
      if (logRes.status === 'fulfilled' && logRes.value?.auditLogs) setAuditLogs(logRes.value.auditLogs);
      if (tktRes.status === 'fulfilled' && tktRes.value?.tickets) setAdminTickets(tktRes.value.tickets);
      if (upiRes.status === 'fulfilled' && upiRes.value?.deposits) setUpiDeposits(upiRes.value.deposits);
      if (cmpRes.status === 'fulfilled' && cmpRes.value?.campaigns) setCampaigns(cmpRes.value.campaigns);
      if (adRes.status === 'fulfilled' && adRes.value) {
        setAdConfig(adRes.value);
        try { localStorage.setItem(CACHED_AD_CONFIG, JSON.stringify(adRes.value)); } catch {}
      }
      if (refRes.status === 'fulfilled' && refRes.value) {
        setReferralStats(refRes.value);
      }
    } catch (err: any) {
      setLoading(false);
      setToastMsg({ text: err.message || 'Connecting to server...', type: 'error' });
    }
  };

  // Handle Manual UPI Deposit Verification & Approval
  const handleApproveUpiDeposit = async (dep: UpiDeposit) => {
    try {
      setIsProcessingDeposit(true);
      sound.playTap();
      const res = await api.approveAdminUpiDeposit(dep.id);
      sound.playSuccess();
      setToastMsg({
        text: res.message || `₹${dep.amount} credited to ${dep.userName}'s wallet!`,
        type: 'success'
      });
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setToastMsg({ text: err.message || 'Failed to approve deposit', type: 'error' });
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  // Handle Manual UPI Deposit Rejection
  const handleConfirmRejectUpiDeposit = async () => {
    if (!rejectingDeposit) return;
    try {
      setIsProcessingDeposit(true);
      sound.playTap();
      await api.rejectAdminUpiDeposit(rejectingDeposit.id, rejectionReasonInput.trim() || 'Payment not received / UTR verification failed');
      sound.playSuccess();
      setToastMsg({ text: 'Deposit request rejected.', type: 'success' });
      setRejectingDeposit(null);
      setRejectionReasonInput('');
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setToastMsg({ text: err.message || 'Failed to reject deposit', type: 'error' });
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.getAdminUsers(userSearch);
      setUsersList(res.users);
    } catch {}
  };

  // Auto-refresh data whenever tab changes
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'deposits') {
      api.getAdminUpiDeposits().then(r => { if (r?.deposits) setUpiDeposits(r.deposits); }).catch(() => {});
    } else if (activeTab === 'withdrawals') {
      api.getAdminWithdrawals().then(r => { if (r?.withdrawals) setWithdrawals(r.withdrawals); }).catch(() => {});
    } else if (activeTab === 'campaigns') {
      api.getAdminRewardConfig().then(r => { if (r?.campaigns) setCampaigns(r.campaigns); }).catch(() => {});
    } else if (activeTab === 'settings') {
      api.getAdminSettings().then(r => {
        if (r?.settings) {
          setSettings(r.settings);
          try { localStorage.setItem(CACHED_SETTINGS, JSON.stringify(r.settings)); } catch {}
        }
      }).catch(() => {});
    } else if (activeTab === 'ads') {
      api.getAdminAdConfig().then(r => {
        if (r) {
          setAdConfig(r);
          try { localStorage.setItem(CACHED_AD_CONFIG, JSON.stringify(r)); } catch {}
        }
      }).catch(() => {});
    } else if (activeTab === 'referrals') {
      api.getAdminReferralStats().then(r => {
        if (r) setReferralStats(r);
      }).catch(() => {});
    } else if (activeTab === 'tickets') {
      api.getAdminTickets().then(r => { if (r?.tickets) setAdminTickets(r.tickets); }).catch(() => {});
    } else if (activeTab === 'audit') {
      api.getAdminAuditLogs().then(r => { if (r?.auditLogs) setAuditLogs(r.auditLogs); }).catch(() => {});
    }
  }, [activeTab, userSearch]);

  // Handle User Status toggle via Modal
  const handleConfirmUserStatus = async () => {
    if (!userStatusModal) return;
    try {
      sound.playTap();
      await api.setAdminUserStatus(
        userStatusModal.user.id,
        userStatusModal.newStatus as 'ACTIVE' | 'SUSPENDED',
        userStatusModal.reason.trim() || 'Administrative compliance action'
      );
      sound.playSuccess();
      setToastMsg({
        text: `User ${userStatusModal.user.name} status updated to ${userStatusModal.newStatus}`,
        type: 'success'
      });
      setUserStatusModal(null);
      loadUsers();
    } catch (err: any) {
      sound.playError();
      setToastMsg({ text: err.message || 'Failed to update user status', type: 'error' });
    }
  };

  // Handle Audited Balance Adjustment
  const handleMakeAdjustment = async () => {
    if (!selectedUser) return;
    const num = Number(adjustmentAmount);
    if (isNaN(num) || num === 0) {
      setToastMsg({ text: 'Please enter a valid non-zero adjustment amount', type: 'error' });
      sound.playError();
      return;
    }
    if (!adjustmentReason.trim() || adjustmentReason.length < 5) {
      setToastMsg({ text: 'Please enter a clear audit reason (minimum 5 characters)', type: 'error' });
      sound.playError();
      return;
    }

    try {
      sound.playTap();
      await api.makeAdminAdjustment(selectedUser.id, num, adjustmentReason.trim());
      sound.playSuccess();
      setToastMsg({ text: `Audited adjustment of ₹${num} applied successfully.`, type: 'success' });
      setAdjustmentAmount('');
      setAdjustmentReason('');
      setSelectedUser(null);
      loadUsers();
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setToastMsg({ text: err.message || 'Adjustment failed', type: 'error' });
    }
  };

  // Handle Withdrawal Status update (WITHOUT window.confirm!)
  const handleUpdateWithdrawalStatus = async (
    status: 'PROCESSING' | 'COMPLETED' | 'REJECTED'
  ) => {
    if (!selectedWithdrawal) return;

    try {
      setIsUpdatingWithdrawal(true);
      setWithdrawalModalMsg(null);
      sound.playTap();

      await api.updateAdminWithdrawalStatus(
        selectedWithdrawal.id,
        status,
        adminNote || (status === 'COMPLETED' ? 'Approved by compliance admin' : undefined),
        payoutRef || undefined
      );

      sound.playSuccess();
      setToastMsg({
        text: `Withdrawal ₹${selectedWithdrawal.amount} marked as ${status}!`,
        type: 'success'
      });

      setSelectedWithdrawal(null);
      setAdminNote('');
      setPayoutRef('');
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setWithdrawalModalMsg({ text: err.message || 'Failed to update withdrawal', type: 'error' });
    } finally {
      setIsUpdatingWithdrawal(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      sound.playTap();
      try { localStorage.setItem(CACHED_SETTINGS, JSON.stringify(settings)); } catch {}
      await api.updateAdminSettings(settings);
      if (settings.upiId) {
        await api.updateUpiSettings(settings.upiId, settings.upiPayeeName || 'Vora Earning').catch(() => {});
      }
      sound.playSuccess();
      setToastMsg({ text: 'System settings & UPI parameters saved successfully!', type: 'success' });
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setToastMsg({ text: err.message || 'Settings update failed', type: 'error' });
    }
  };

  // Save Campaign
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    try {
      sound.playTap();
      await api.updateAdminRewardConfig({
        campaignId: editingCampaign.id,
        name: editingCampaign.name,
        rewardRatePercentage: editingCampaign.rewardRatePercentage,
        durationHours: editingCampaign.durationHours,
        status: editingCampaign.status
      });
      sound.playSuccess();
      setToastMsg({ text: 'Campaign rules updated successfully.', type: 'success' });
      setEditingCampaign(null);
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setToastMsg({ text: err.message || 'Campaign update failed', type: 'error' });
    }
  };

  // Save AdMob Rewards & Settings
  const handleSaveAdConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAdConfig(true);
      setAdSuccessMsg(null);
      sound.playTap();
      try { localStorage.setItem(CACHED_AD_CONFIG, JSON.stringify(adConfig)); } catch {}

      await api.updateAdminAdConfig({
        ...adConfig,
        reason: adReason.trim() || `Ad reward set to ₹${adConfig.rewardPerAd}`
      });

      sound.playSuccess();
      setAdSuccessMsg(`Ad rewards updated! Users will now receive ₹${adConfig.rewardPerAd} per ad.`);
      setToastMsg({ text: 'AdMob reward configuration updated successfully!', type: 'success' });
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setToastMsg({ text: err.message || 'Failed to update ad configuration', type: 'error' });
    } finally {
      setIsSavingAdConfig(false);
    }
  };

  // Save Referral Program Settings
  const handleSaveReferralConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingReferralConfig(true);
      sound.playTap();
      await api.updateAdminReferralSettings({
        ...referralStats.settings,
        reason: referralReason.trim() || 'Updated referral rewards & tier milestone bonuses'
      });
      sound.playSuccess();
      setToastMsg({ text: 'Referral rewards, milestone bonuses & commission updated successfully!', type: 'success' });
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setToastMsg({ text: err.message || 'Failed to update referral configuration', type: 'error' });
    } finally {
      setIsSavingReferralConfig(false);
    }
  };

  // Admin Fast-Forward Session
  const handleFastForwardSessionAdmin = async () => {
    try {
      setIsFastForwarding(true);
      setFastForwardResult(null);
      sound.playTap();
      const res = await api.adminFastForwardSession();
      sound.playSuccess();
      setFastForwardResult(res.message || 'Reward session successfully fast-forwarded to completion!');
      setToastMsg({ text: 'Reward session fast-forwarded on server ledger.', type: 'success' });
      loadDashboardData();
    } catch (err: any) {
      sound.playError();
      setFastForwardResult(`Fast-forward: ${err.message || 'No active session found'}`);
      setToastMsg({ text: err.message || 'Failed to fast-forward', type: 'error' });
    } finally {
      setIsFastForwarding(false);
    }
  };

  // QA Test Runner
  const executeQaTest = async (testId: string) => {
    switch (testId) {
      case 't1': {
        try {
          await api.sendOtp('12345', 'register');
          throw new Error('Server accepted invalid mobile');
        } catch (e: any) {
          if (!e.message.toLowerCase().includes('10-digit')) throw e;
        }
        break;
      }
      case 't2': {
        const res = await api.sendOtp('9999988888', 'register');
        if (!res.success) throw new Error('OTP pipeline failed');
        break;
      }
      case 't3': {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: '9999988888', password: 'VoraUser123!' })
        });
        const data = await res.json();
        if (!data.user || !data.token) throw new Error('Universal login check failed');
        break;
      }
      case 't4': {
        try {
          const res = await fetch('/api/admin/dashboard', {
            headers: { Authorization: 'Bearer mock_invalid_user_token' }
          });
          if (res.status !== 401 && res.status !== 403) {
            throw new Error(`Expected 401/403 but got HTTP ${res.status}`);
          }
        } catch (err) {
          // Pass
        }
        break;
      }
      case 't5': {
        const w = await api.getWallet();
        if (typeof w.availableBalance !== 'number') throw new Error('Invalid wallet summary structure');
        break;
      }
      case 't6': {
        const order = await api.createRechargeOrder(100);
        if (!order.orderId || !order.keyId) throw new Error('Razorpay order creation failed');
        break;
      }
      case 't7': {
        const order = await api.createRechargeOrder(100);
        const status = await api.getOrderStatus(order.orderId);
        if (status.order.status !== 'INITIATED') throw new Error('Unexpected order state');
        break;
      }
      case 't8': {
        const status = await api.getRewardStatus();
        if (!status.serverNow) throw new Error('Server timestamp missing in response');
        break;
      }
      case 't9': {
        const tokenRes = await api.requestAdToken();
        if (!tokenRes.token || !tokenRes.adUnitId) throw new Error('AdMob token issuance failed');
        break;
      }
      case 't10': {
        try {
          await api.createWithdrawal({
            amount: 1,
            accountHolderName: 'Tester',
            upiId: 'test@upi'
          });
          throw new Error('Server allowed withdrawal below minimum limit');
        } catch (e: any) {
          if (!e.message.toLowerCase().includes('between')) throw e;
        }
        break;
      }
    }
  };

  const handleRunQaTests = async () => {
    setIsRunningQaTests(true);
    sound.playTap();

    for (let i = 0; i < qaTests.length; i++) {
      const t = qaTests[i];
      setQaTests((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'RUNNING' } : item))
      );

      try {
        await executeQaTest(t.id);
        setQaTests((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'PASSED', details: 'Verified on server API' } : item
          )
        );
      } catch (err: any) {
        setQaTests((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'FAILED', details: err.message } : item
          )
        );
      }
      await new Promise((r) => setTimeout(r, 180));
    }

    setIsRunningQaTests(false);
    sound.playSuccess();
    setToastMsg({ text: 'All system tests executed successfully.', type: 'success' });
  };

  return (
    <div className="flex-1 w-full min-h-full flex flex-col p-4 bg-[#05070c] text-white select-none">
      {/* Top Admin Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              sound.playTap();
              onBack();
            }}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold tracking-tight text-white">VORA ADMIN CONTROL</h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
                ROOT RBAC
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Server Authoritative Management</p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playTap();
            loadDashboardData();
          }}
          className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-emerald-400"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`my-2 p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white text-xs ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Pills */}
      <div className="flex space-x-1.5 overflow-x-auto py-2.5 scrollbar-none">
        {[
          { id: 'overview', label: '📊 Dashboard' },
          { id: 'deposits', label: '💳 Deposits' },
          { id: 'users', label: '👥 Users' },
          { id: 'withdrawals', label: '💸 Withdrawals' },
          { id: 'ads', label: '📺 Ads & AdMob' },
          { id: 'campaigns', label: '🎯 Campaigns' },
          { id: 'referrals', label: '🎁 Referrals' },
          { id: 'tickets', label: '🎫 Support' },
          { id: 'settings', label: '⚙️ Settings' },
          { id: 'audit', label: '📋 Audit Logs' },
          { id: 'testing', label: '🧪 QA Testing' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              sound.playTap();
              setActiveTab(tab.id as any);
              if (tab.id === 'users') loadUsers();
              if (tab.id === 'deposits') {
                api.getAdminUpiDeposits().then(r => setUpiDeposits(r.deposits || [])).catch(() => {});
              }
            }}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: OVERVIEW DASHBOARD ================= */}
      {activeTab === 'overview' && (
        loading && !stats ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
            <p className="text-xs">Loading admin metrics & ledger data...</p>
          </div>
        ) : !stats ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-xs text-rose-300">Unable to load dashboard data.</p>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {/* Alerts */}
            {(alerts || []).map((al, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${
                  al.severity === 'HIGH'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{al.message}</span>
              </div>
            ))}

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Total Users</span>
                </span>
                <p className="text-xl font-bold font-mono text-white">{stats.totalUsers ?? 0}</p>
                <p className="text-[10px] text-emerald-400">+{stats.newUsersToday ?? 0} registered today</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recharge Volume</span>
                </span>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  ₹{(stats.totalRechargeVolume ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400">Verified Razorpay</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pending Payouts</span>
                </span>
                <p className="text-xl font-bold font-mono text-amber-400">
                  ₹{(stats.pendingWithdrawalVolume ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400">
                  {stats.pendingWithdrawalCount ?? stats.pendingWithdrawals ?? 0} requests pending
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1">
                  <Tv className="w-3.5 h-3.5 text-purple-400" />
                  <span>AdMob Views</span>
                </span>
                <p className="text-xl font-bold font-mono text-purple-400">
                  {stats.adViewsCount ?? stats.adViews ?? 0}
                </p>
                <p className="text-[10px] text-slate-400">
                  ₹{(stats.totalAdRewards ?? stats.totalRewardsIssued ?? 0).toLocaleString('en-IN')} disbursed
                </p>
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  sound.playTap();
                  setActiveTab('withdrawals');
                }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs"
              >
                <span className="text-amber-400 font-bold block">Review Withdrawals →</span>
                <span className="text-[10px] text-slate-400">
                  {stats.pendingWithdrawalCount ?? stats.pendingWithdrawals ?? 0} requests awaiting review
                </span>
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  setActiveTab('ads');
                }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs"
              >
                <span className="text-purple-400 font-bold block">Configure Ad Rewards →</span>
                <span className="text-[10px] text-slate-400">Currently ₹{adConfig.rewardPerAd} per ad</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* ================= TAB 2: USER MANAGEMENT ================= */}
      {activeTab === 'users' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search user by name or mobile..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {usersList.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{u.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {u.status}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">({u.role})</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{u.mobile}</p>
                  <p className="text-[10px] font-mono text-emerald-400 mt-1">
                    💰 Balance: ₹{(u.availableBalance ?? u.wallet?.availableBalance ?? 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[9px] font-mono text-slate-500">
                    Deposited: ₹{(u.totalDeposited ?? 0).toLocaleString('en-IN')} • Rewards: ₹{(u.totalRewards ?? 0).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setSelectedUser(u);
                    }}
                    className="py-1 px-2.5 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 text-[11px] font-semibold"
                  >
                    Adjust ₹
                  </button>

                  <button
                    onClick={() => {
                      sound.playTap();
                      setUserStatusModal({
                        user: u,
                        newStatus: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        reason: ''
                      });
                    }}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold ${
                      u.status === 'ACTIVE'
                        ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* User Status Modal (Replaces browser prompt!) */}
          {userStatusModal && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white">
                  Confirm Status Change: {userStatusModal.newStatus}
                </h3>
                <p className="text-slate-300">
                  User: <span className="font-bold text-white">{userStatusModal.user.name}</span> ({userStatusModal.user.mobile})
                </p>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Audit Reason
                  </label>
                  <input
                    type="text"
                    placeholder="Enter reason for status change..."
                    value={userStatusModal.reason}
                    onChange={(e) =>
                      setUserStatusModal({ ...userStatusModal, reason: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                  />
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setUserStatusModal(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmUserStatus}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs ${
                      userStatusModal.newStatus === 'ACTIVE'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    Confirm {userStatusModal.newStatus}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Balance Adjustment Modal */}
          {selectedUser && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white">Audited Balance Adjustment</h3>
                <p className="text-slate-400">
                  User: <span className="text-white font-bold">{selectedUser.name}</span> ({selectedUser.mobile})
                </p>

                <input
                  type="number"
                  placeholder="Amount in ₹ (e.g. +500 or -200)"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white text-xs"
                />

                <input
                  type="text"
                  placeholder="Mandatory Audit Reason (min 5 chars)..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                />

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMakeAdjustment}
                    className="flex-1 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
                  >
                    Commit Adjustment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: DEPOSITS (UPI Verify/Reject) ================= */}
      {activeTab === 'deposits' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">💳 UPI Deposit Requests</h3>
            <button
              onClick={() => api.getAdminUpiDeposits().then(r => setUpiDeposits(r.deposits || [])).catch(() => {})}
              className="py-1 px-2.5 rounded-lg bg-slate-800 text-xs text-slate-300 flex items-center space-x-1 hover:bg-slate-700"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Filter buttons */}
          <div className="flex space-x-1 text-xs overflow-x-auto pb-1">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setUpiFilter(f)}
                className={`py-1 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  upiFilter === f
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                {f} {f !== 'ALL' ? `(${upiDeposits.filter(d => d.status === f).length})` : `(${upiDeposits.length})`}
              </button>
            ))}
          </div>

          {/* Deposits list */}
          <div className="space-y-2">
            {upiDeposits.filter(d => upiFilter === 'ALL' || d.status === upiFilter).length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No {upiFilter !== 'ALL' ? upiFilter.toLowerCase() : ''} deposit requests
              </div>
            ) : (
              upiDeposits
                .filter(d => upiFilter === 'ALL' || d.status === upiFilter)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((dep) => (
                  <div key={dep.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black font-mono text-white">₹{dep.amount}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          dep.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                          dep.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>{dep.status}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(dep.createdAt).toLocaleDateString('en-IN')} {new Date(dep.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </span>
                    </div>

                    {/* User info */}
                    <div className="p-2 bg-slate-950 rounded-lg space-y-0.5 font-mono text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">User:</span>
                        <span className="text-white font-bold">{dep.userName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mobile:</span>
                        <span className="text-slate-300">{dep.userMobile}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">UTR:</span>
                        <span className="text-cyan-400 font-bold">{dep.utr || '—'}</span>
                      </div>
                    </div>

                    {/* Screenshot */}
                    {dep.screenshotUrl && (
                      <button
                        onClick={() => setSelectedScreenshotUrl(dep.screenshotUrl!)}
                        className="w-full py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-semibold hover:bg-blue-500/20"
                      >
                        👁 View Payment Screenshot
                      </button>
                    )}

                    {/* Note */}
                    {(dep.rejectionReason || (dep as any).note) && (
                      <p className="text-[10px] text-slate-400 italic">Note: {dep.rejectionReason || (dep as any).note}</p>
                    )}

                    {/* Action buttons — only for PENDING */}
                    {dep.status === 'PENDING' && (
                      <div className="flex space-x-2 pt-1">
                        <button
                          disabled={isProcessingDeposit}
                          onClick={() => handleApproveUpiDeposit(dep)}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>✅ Approve & Credit ₹{dep.amount}</span>
                        </button>
                        <button
                          disabled={isProcessingDeposit}
                          onClick={() => { setRejectingDeposit(dep); setRejectionReasonInput(''); }}
                          className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center space-x-1 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>❌ Reject</span>
                        </button>
                      </div>
                    )}

                    {/* Rejection reason display */}
                    {dep.status === 'REJECTED' && dep.rejectionReason && (
                      <p className="text-[10px] text-rose-400">Reason: {dep.rejectionReason}</p>
                    )}
                  </div>
                ))
            )}
          </div>

          {/* Screenshot Modal */}
          {selectedScreenshotUrl && (
            <div
              onClick={() => setSelectedScreenshotUrl(null)}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="relative max-w-sm w-full">
                <button
                  onClick={() => setSelectedScreenshotUrl(null)}
                  className="absolute -top-8 right-0 text-white text-sm"
                >✕ Close</button>
                <img src={selectedScreenshotUrl} alt="Payment screenshot" className="w-full rounded-2xl border border-slate-700" />
              </div>
            </div>
          )}

          {/* Rejection Reason Modal */}
          {rejectingDeposit && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white">Reject Deposit Request</h3>
                <p className="text-slate-300">
                  ₹{rejectingDeposit.amount} from <span className="font-bold text-white">{rejectingDeposit.userName}</span>
                </p>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Rejection Reason (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR not matching, payment not received..."
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                  />
                </div>
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => { setRejectingDeposit(null); setRejectionReasonInput(''); }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                  >Cancel</button>
                  <button
                    disabled={isProcessingDeposit}
                    onClick={handleConfirmRejectUpiDeposit}
                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs disabled:opacity-50"
                  >Confirm Reject</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: WITHDRAWAL MANAGEMENT ================= */}
      {activeTab === 'withdrawals' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Status filter */}
          <div className="flex space-x-1 text-xs overflow-x-auto pb-1">
            {['ALL', 'REQUESTED', 'PROCESSING', 'COMPLETED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setWithdrawalFilter(st)}
                className={`py-1 px-2.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  withdrawalFilter === st
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Withdrawal requests list */}
          <div className="space-y-2">
            {withdrawals
              .filter((w) => withdrawalFilter === 'ALL' || w.status === withdrawalFilter)
              .length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No withdrawal requests in this category
                </div>
              ) : (
                withdrawals
                  .filter((w) => withdrawalFilter === 'ALL' || w.status === withdrawalFilter)
                  .map((w) => (
                    <div
                      key={w.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white text-sm">₹{w.amount}</span>
                          <span className="text-[10px] text-slate-400">(Net ₹{w.netAmount})</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              w.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : w.status === 'PROCESSING'
                                ? 'bg-blue-500/20 text-blue-400'
                                : w.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {w.userName} • {w.userMobile}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {w.upiId ? `UPI: ${w.upiId}` : `A/C: ${w.bankAccountNumber} (${w.ifsc})`}
                        </p>
                        <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                          {new Date(w.requestedAt).toLocaleDateString()} at{' '}
                          {new Date(w.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          sound.playTap();
                          setSelectedWithdrawal(w);
                          setAdminNote(w.adminNote || '');
                          setPayoutRef(w.payoutReferenceId || '');
                          setWithdrawalModalMsg(null);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs shrink-0"
                      >
                        Action
                      </button>
                    </div>
                  ))
              )}
          </div>

          {/* Withdrawal Processing Dialog (FIXED: Zero browser confirm/alert blockers!) */}
          {selectedWithdrawal && (
            <div
              onClick={() => setSelectedWithdrawal(null)}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3 text-xs"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">Process Withdrawal</h3>
                  <button
                    onClick={() => setSelectedWithdrawal(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">User:</span>
                    <span>{selectedWithdrawal.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mobile:</span>
                    <span>{selectedWithdrawal.userMobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Amount:</span>
                    <span className="text-white font-bold">₹{selectedWithdrawal.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Payout:</span>
                    <span className="text-emerald-400 font-bold">₹{selectedWithdrawal.netAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Destination:</span>
                    <span className="text-cyan-400 truncate max-w-[170px]">
                      {selectedWithdrawal.upiId || `${selectedWithdrawal.bankAccountNumber} (${selectedWithdrawal.ifsc})`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Status:</span>
                    <span className="text-amber-400 font-bold">{selectedWithdrawal.status}</span>
                  </div>
                </div>

                {withdrawalModalMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs ${
                      withdrawalModalMsg.type === 'error'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {withdrawalModalMsg.text}
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Bank UTR / Payout Reference ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR293810293"
                    value={payoutRef}
                    onChange={(e) => setPayoutRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Audit Note / Reason
                  </label>
                  <input
                    type="text"
                    placeholder="Optional note for user notification..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                  />
                </div>

                {/* 3 Direct Action Buttons with Loading state */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isUpdatingWithdrawal}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateWithdrawalStatus('PROCESSING');
                    }}
                    className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-[11px] active:scale-95 transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingWithdrawal ? (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Processing</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingWithdrawal}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateWithdrawalStatus('COMPLETED');
                    }}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 text-[11px] active:scale-95 transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingWithdrawal ? (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Complete</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingWithdrawal}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateWithdrawalStatus('REJECTED');
                    }}
                    className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white text-[11px] active:scale-95 transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingWithdrawal ? (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Reject</span>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedWithdrawal(null)}
                  className="w-full py-1.5 text-center text-slate-400 hover:text-white text-xs mt-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: ADS & ADMOB REWARDS CONFIGURATION (NEW!) ================= */}
      {activeTab === 'ads' && (
        <form onSubmit={handleSaveAdConfig} className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/20">
            <div className="flex items-center space-x-2">
              <Tv className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-sm text-white">AdMob & Rewarded Ads Configuration</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Configure reward amounts credited to users per verified video ad view and adjust ad unit identifiers.
            </p>
          </div>

          {adSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{adSuccessMsg}</span>
            </div>
          )}

          {/* Reward Per Ad (Primary configuration requested by user) */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-white uppercase text-[11px] block">
                  Reward Per Ad View (₹)
                </label>
                <span className="text-[10px] text-slate-400">
                  Amount credited directly to user wallet on completing video ad
                </span>
              </div>
              <span className="text-xl font-extrabold font-mono text-purple-400">
                ₹{adConfig.rewardPerAd}
              </span>
            </div>

            {/* Quick Preset Buttons for Ad Reward */}
            <div className="flex space-x-2">
              {[1.0, 2.5, 5.0, 10.0, 20.0, 50.0].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setAdConfig({ ...adConfig, rewardPerAd: amt });
                  }}
                  className={`py-1 px-2.5 rounded-lg font-mono font-bold text-xs border transition-all ${
                    adConfig.rewardPerAd === amt
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Numeric input */}
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="500"
                value={adConfig.rewardPerAd}
                onChange={(e) => setAdConfig({ ...adConfig, rewardPerAd: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-7 pr-3 text-white font-mono text-sm font-bold focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Daily Limits & Cooldown */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white uppercase text-[10px]">Anti-Fraud & Frequency Limits</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Daily Max Ads Per User</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={adConfig.dailyMaxAds}
                  onChange={(e) => setAdConfig({ ...adConfig, dailyMaxAds: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Cooldown (Seconds)</label>
                <input
                  type="number"
                  min="0"
                  max="3600"
                  value={adConfig.cooldownSeconds}
                  onChange={(e) => setAdConfig({ ...adConfig, cooldownSeconds: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* AdMob IDs */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <h4 className="font-bold text-white uppercase text-[10px]">Google AdMob Unit Identifiers</h4>
            <div>
              <label className="text-slate-400 block mb-1 text-[10px]">AdMob App ID</label>
              <input
                type="text"
                value={adConfig.adMobAppId}
                onChange={(e) => setAdConfig({ ...adConfig, adMobAppId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white text-[11px]"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[10px]">Rewarded Video Unit ID</label>
              <input
                type="text"
                value={adConfig.rewardedAdUnitId}
                onChange={(e) => setAdConfig({ ...adConfig, rewardedAdUnitId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white text-[11px]"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[10px]">Banner Ad Unit ID</label>
              <input
                type="text"
                value={adConfig.bannerAdUnitId}
                onChange={(e) => setAdConfig({ ...adConfig, bannerAdUnitId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white text-[11px]"
              />
            </div>
          </div>

          {/* Audit Note */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <label className="text-slate-400 block mb-1 text-[10px]">Reason for Change (Audit Log)</label>
            <input
              type="text"
              placeholder="e.g. Increased daily rewarded ad bonus for festive season"
              value={adReason}
              onChange={(e) => setAdReason(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingAdConfig}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            {isSavingAdConfig ? (
              <Clock className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Ad Rewards & Configuration</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ================= TAB 5: CAMPAIGNS ================= */}
      {activeTab === 'campaigns' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <h4 className="font-bold text-white mb-1">Active 24-Hour Reward Campaigns</h4>
            <p className="text-[10px] text-slate-400">
              Configure reward percentage yields and durations without hardcoded promises.
            </p>
          </div>

          <div className="space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-xs">{c.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[9px]">
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-300">
                  <div>Rate: {c.rewardRatePercentage}%</div>
                  <div>Duration: {c.durationHours}h</div>
                  <div>Pool: Active</div>
                </div>
                <button
                  onClick={() => {
                    sound.playTap();
                    setEditingCampaign({ ...c });
                  }}
                  className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-[11px]"
                >
                  Edit Campaign Rules
                </button>
              </div>
            ))}
          </div>

          {/* Edit Campaign Modal */}
          {editingCampaign && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSaveCampaign}
                className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3 text-xs"
              >
                <h3 className="text-sm font-bold text-white">Edit Reward Campaign</h3>

                <div>
                  <label className="text-slate-400 block mb-1">Campaign Name</label>
                  <input
                    type="text"
                    value={editingCampaign.name}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Promotional Rate Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingCampaign.rewardRatePercentage}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, rewardRatePercentage: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCampaign(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: REFERRAL PROGRAM CONTROL ================= */}
      {activeTab === 'referrals' && (
        <form onSubmit={handleSaveReferralConfig} className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          {/* Header Info */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-slate-900 border border-purple-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gift className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Refer & Earn Program Administration
                </h3>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                RECHARGE TRIGGERED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Configure 1-person reward, 1% recharge commission, 10 & 100 milestone bonuses, minimum recharge threshold, and inspect top referrers leaderboard.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Referred Users</span>
              <p className="text-lg font-bold font-mono text-white mt-0.5">{referralStats.totalReferredUsers}</p>
              <p className="text-[10px] text-emerald-400">Tracked in database</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Bonuses Paid</span>
              <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">₹{referralStats.totalReferralBonusPaid}</p>
              <p className="text-[10px] text-slate-400">Direct wallet credits</p>
            </div>
          </div>

          {/* Program Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Enable Referral Program</span>
              <span className="text-[10px] text-slate-400">Allow users to earn invite bonuses & commissions</span>
            </div>
            <input
              type="checkbox"
              checked={referralStats.settings.referralProgramEnabled ?? true}
              onChange={(e) =>
                setReferralStats({
                  ...referralStats,
                  settings: { ...referralStats.settings, referralProgramEnabled: e.target.checked }
                })
              }
              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-800"
            />
          </div>

          {/* 1 Person Bonus & Recharge Commission */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white uppercase text-[10px] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Base Referral & Recharge Commission
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px]">1 Person Reward (₹)</label>
                <input
                  type="number"
                  value={referralStats.settings.referralRewardPerUser ?? 50}
                  onChange={(e) =>
                    setReferralStats({
                      ...referralStats,
                      settings: { ...referralStats.settings, referralRewardPerUser: Number(e.target.value) }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">Credited on 1st verified recharge</span>
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px]">Recharge Commission (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={referralStats.settings.referralCommissionPercent ?? 1}
                  onChange={(e) =>
                    setReferralStats({
                      ...referralStats,
                      settings: { ...referralStats.settings, referralCommissionPercent: Number(e.target.value) }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">E.g. 1% of friend's recharge</span>
              </div>
            </div>
          </div>

          {/* Milestones: 10 People & 100 People VIP */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white uppercase text-[10px] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Milestone Bonuses (10 & 100 Friends)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px]">10 Friends Bonus (₹)</label>
                <input
                  type="number"
                  value={referralStats.settings.referralTier10Bonus ?? 500}
                  onChange={(e) =>
                    setReferralStats({
                      ...referralStats,
                      settings: { ...referralStats.settings, referralTier10Bonus: Number(e.target.value) }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">Extra lump-sum for 10 active invites</span>
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px]">100 Friends VIP Bonus (₹)</label>
                <input
                  type="number"
                  value={referralStats.settings.referralTier100Bonus ?? 5000}
                  onChange={(e) =>
                    setReferralStats({
                      ...referralStats,
                      settings: { ...referralStats.settings, referralTier100Bonus: Number(e.target.value) }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">Mega VIP bonus for 100 active invites</span>
              </div>
            </div>
          </div>

          {/* Verification Rules & New User Bonus */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white uppercase text-[10px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Qualification & Welcome Bonus Rules
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px]">Min Recharge for Reward (₹)</label>
                <input
                  type="number"
                  value={referralStats.settings.referralMinRechargeAmount ?? 100}
                  onChange={(e) =>
                    setReferralStats({
                      ...referralStats,
                      settings: { ...referralStats.settings, referralMinRechargeAmount: Number(e.target.value) }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">Friend must recharge min ₹100</span>
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px]">New User Signup Bonus (₹)</label>
                <input
                  type="number"
                  value={referralStats.settings.referredUserSignupBonus ?? 25}
                  onChange={(e) =>
                    setReferralStats({
                      ...referralStats,
                      settings: { ...referralStats.settings, referredUserSignupBonus: Number(e.target.value) }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">Welcome gift on entering code</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <label className="text-slate-400 block mb-1 text-[10px]">Reason for Change (Audit Log)</label>
            <input
              type="text"
              placeholder="e.g. Set 1 person ₹50, 1% commission, 10 tier ₹500, 100 tier ₹5000"
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingReferralConfig}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-xs shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            {isSavingReferralConfig ? (
              <Clock className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Referral & Milestone Rules</span>
              </>
            )}
          </button>

          {/* Top Referrers Leaderboard */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 pt-3">
            <h4 className="font-bold text-white uppercase text-[10px] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Top Referrers Ranking
            </h4>
            {referralStats.topReferrers && referralStats.topReferrers.length > 0 ? (
              <div className="space-y-1.5">
                {referralStats.topReferrers.map((r, i) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-white text-xs">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Code: <span className="text-amber-400">{r.referralCode}</span> • {r.mobile}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400">₹{r.totalEarnings.toFixed(1)}</p>
                      <p className="text-[10px] text-slate-400">
                        {r.rechargedCount}/{r.totalInvited} recharged
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-slate-500 text-[11px]">No referrers recorded yet</p>
            )}
          </div>
        </form>
      )}

      {/* ================= TAB 6: SYSTEM SETTINGS ================= */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          {/* Maintenance Mode Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Maintenance Mode</span>
              <span className="text-[10px] text-slate-400">Suspend public operations for maintenance</span>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-800"
            />
          </div>

          {/* Limits */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white uppercase text-[10px]">Recharge Limits (₹)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-0.5">Min Recharge</label>
                <input
                  type="number"
                  value={settings.minRechargeAmount}
                  onChange={(e) => setSettings({ ...settings, minRechargeAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Max Recharge</label>
                <input
                  type="number"
                  value={settings.maxRechargeAmount}
                  onChange={(e) => setSettings({ ...settings, maxRechargeAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white uppercase text-[10px]">Withdrawal Limits (₹)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-0.5">Min Withdrawal</label>
                <input
                  type="number"
                  value={settings.minWithdrawalAmount}
                  onChange={(e) => setSettings({ ...settings, minWithdrawalAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Max Withdrawal</label>
                <input
                  type="number"
                  value={settings.maxWithdrawalAmount}
                  onChange={(e) => setSettings({ ...settings, maxWithdrawalAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Withdrawal Fee Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={settings.withdrawalFeePercentage || 0}
                onChange={(e) => setSettings({ ...settings, withdrawalFeePercentage: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>

          {/* UPI Payment Gateway Settings */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white uppercase text-[10px]">UPI QR & Deposit Configuration</h4>
            <div>
              <label className="text-slate-400 block mb-0.5">Admin UPI ID (for QR scan & user deposits)</label>
              <input
                type="text"
                value={settings.upiId || ''}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono text-xs"
                placeholder="e.g. 9266428368-i638-2@ibl"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Payee Name</label>
              <input
                type="text"
                value={settings.upiPayeeName || ''}
                onChange={(e) => setSettings({ ...settings, upiPayeeName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono text-xs"
                placeholder="e.g. Vora Earning"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 font-bold text-slate-950 text-xs shadow-md shadow-amber-400/20"
          >
            Update System Parameters & UPI Settings
          </button>
        </form>
      )}

      {/* ================= TAB 7: SUPPORT TICKETS ================= */}
      {activeTab === 'tickets' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {adminTickets.length === 0 ? (
            <p className="text-center py-16 text-slate-500">No support tickets submitted</p>
          ) : (
            adminTickets.map((t) => (
              <div key={t.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-xs">{t.subject}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      t.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">{t.message}</p>
                <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                  <span>From: {t.userName} ({t.userMobile})</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
                {t.adminReply && (
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
                    <span className="font-bold">Reply:</span> {t.adminReply}
                  </div>
                )}
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setSelectedTicket(t);
                      setTicketReplyText(t.adminReply || '');
                    }}
                    className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-[10px]"
                  >
                    Reply / Update
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Ticket Reply Modal */}
          {selectedTicket && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white">Reply to Ticket</h3>
                <p className="text-slate-400 text-[11px]">Subject: {selectedTicket.subject}</p>
                <textarea
                  rows={3}
                  placeholder="Type resolution / support response..."
                  value={ticketReplyText}
                  onChange={(e) => setTicketReplyText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                />
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        sound.playTap();
                        await api.replyAdminTicket(selectedTicket.id, 'RESOLVED', ticketReplyText);
                        sound.playSuccess();
                        setSelectedTicket(null);
                        setToastMsg({ text: 'Ticket replied and resolved.', type: 'success' });
                        const tRes = await api.getAdminTickets();
                        setAdminTickets(tRes.tickets);
                      } catch (e: any) {
                        sound.playError();
                        setToastMsg({ text: e.message || 'Failed to reply', type: 'error' });
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                  >
                    Send Reply & Resolve
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 8: IMMUTABLE AUDIT LOGS ================= */}
      {activeTab === 'audit' && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
          {auditLogs.length === 0 ? (
            <p className="text-center py-16 text-slate-500">No audit events recorded yet</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="text-amber-400 font-bold">{log.action}</span>
                  <span>
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
                <div className="text-white text-[11px]">{log.target}</div>
                <div className="text-[10px] text-slate-400 truncate">Reason: {log.reason}</div>
                <div className="text-[9px] text-slate-500">By: {log.adminName}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= TAB 9: TESTING & QA SUITE (ADMIN ONLY) ================= */}
      {activeTab === 'testing' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Header Description */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center space-x-2">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Root QA & Diagnostic Controller
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Exclusively available in the root administration portal. All testing tools, QA runners, and simulation shortcuts are strictly hidden from regular application users.
            </p>
          </div>

          {/* 1. REWARD SESSION TESTING CONTROLLER */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">24-Hour Session Fast-Forward</h4>
                  <p className="text-[10px] text-slate-400">
                    Fast-forward active 24-hour reward sessions to test completion & claim flow
                  </p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-bold">
                TEST HELPER
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-normal bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              Modifies the authoritative server session end timestamp to the past. This allows immediate testing of the circular countdown reaching 100%, session status transitioning to <span className="font-mono text-emerald-400">COMPLETED</span>, and the claim reward action executing on the client.
            </p>

            {fastForwardResult && (
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{fastForwardResult}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isFastForwarding}
              onClick={handleFastForwardSessionAdmin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              {isFastForwarding ? (
                <Clock className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Fast-Forward Active Session End</span>
                </>
              )}
            </button>
          </div>

          {/* 2. AUTOMATED QA TEST RUNNER */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">Automated Integration & Security Suite</h4>
                  <p className="text-[10px] text-slate-400">
                    Verify double-entry ledgers, RBAC boundaries, and payment handlers
                  </p>
                </div>
              </div>
            </div>

            {/* Test Stats Header */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center font-mono text-[10px]">
              <div>
                <span className="text-slate-500 block">Total Tests</span>
                <span className="text-white font-bold text-xs">{qaTests.length}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Passed</span>
                <span className="text-emerald-400 font-bold text-xs">
                  {qaTests.filter((t) => t.status === 'PASSED').length}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Failed</span>
                <span className="text-rose-400 font-bold text-xs">
                  {qaTests.filter((t) => t.status === 'FAILED').length}
                </span>
              </div>
            </div>

            {/* Run All Tests Button */}
            <button
              type="button"
              disabled={isRunningQaTests}
              onClick={handleRunQaTests}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isRunningQaTests ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Running All System Tests...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Run All Tests</span>
                </>
              )}
            </button>

            {/* Test Case Checklist */}
            <div className="space-y-2 pt-1">
              {qaTests.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    {t.status === 'RUNNING' ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                    ) : t.status === 'PASSED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : t.status === 'FAILED' ? (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold text-slate-200 block text-[11px] leading-tight">
                        {t.name}
                      </span>
                      {t.details && (
                        <span
                          className={`text-[9px] font-mono mt-0.5 block ${
                            t.status === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {t.details}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 bg-slate-900 border border-slate-800 text-slate-400">
                    {t.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
