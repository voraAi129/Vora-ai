import React, { useEffect, useState, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Clock,
  Sparkles,
  Play,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Bell,
  Tv,
  ExternalLink,
  ChevronRight,
  Award,
  Globe,
  Volume2,
  VolumeX,
  AlertCircle,
  X,
  Lock,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { i18n } from '../services/i18n';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { User, WalletSummary, RewardSession, RewardCampaign } from '../types';

interface HomeScreenProps {
  user: User;
  onNavigate: (view: 'recharge' | 'withdraw' | 'history' | 'profile' | 'notifications' | 'admin') => void;
  onWatchAd: () => void;
}

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000, 10000];

// Rotating real-brand Google AdMob style banner ads
const BANNER_ADS = [
  { brand: 'Swiggy', text: 'Order food in 30 mins! 60% OFF your first order 🍕', color: '#FC8019', bg: 'from-orange-950/60 to-slate-950' },
  { brand: 'Amazon', text: 'Great Indian Sale — Up to 80% OFF! Shop Now 🛒', color: '#FF9900', bg: 'from-yellow-950/60 to-slate-950' },
  { brand: 'Flipkart', text: 'Big Billion Days — Best deals on Electronics 📱', color: '#2874F0', bg: 'from-blue-950/60 to-slate-950' },
  { brand: 'Zepto', text: 'Groceries delivered in 10 minutes! ₹50 OFF 🛍️', color: '#8B5CF6', bg: 'from-purple-950/60 to-slate-950' },
  { brand: 'Zomato', text: 'Order from top restaurants near you 🍱 Use ZOMATO50', color: '#E23744', bg: 'from-red-950/60 to-slate-950' },
  { brand: 'Paytm', text: 'Pay bills & earn cashback! ₹25 bonus on first pay 💳', color: '#00B9F1', bg: 'from-cyan-950/60 to-slate-950' },
];

const BannerAd: React.FC = () => {
  const [idx, setIdx] = useState(Math.floor(Math.random() * BANNER_ADS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % BANNER_ADS.length);
        setVisible(true);
      }, 350);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const ad = BANNER_ADS[idx];
  return (
    <div className={`p-2.5 rounded-xl bg-gradient-to-r ${ad.bg} border border-slate-800/80 flex items-center justify-between text-xs transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0" style={{ background: ad.color + '25', color: ad.color }}>
          AD
        </span>
        <span className="font-bold text-[10px] shrink-0" style={{ color: ad.color }}>{ad.brand}</span>
        <span className="text-[10px] text-slate-300 truncate">{ad.text}</span>
      </div>
      <span className="text-[8px] text-slate-600 font-mono shrink-0 ml-1">Google</span>
    </div>
  );
};


export const HomeScreen: React.FC<HomeScreenProps> = ({ user, onNavigate, onWatchAd }) => {
  const [lang, setLang] = useState(i18n.getLanguage());
  const [muted, setMuted] = useState(sound.getMuted());

  useEffect(() => {
    return i18n.subscribe(() => setLang(i18n.getLanguage()));
  }, []);

  const [wallet, setWallet] = useState<WalletSummary>({
    availableBalance: 0,
    participatingBalance: 0,
    pendingBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalRewards: 0
  });

  const animatedAvailable = useAnimatedCounter(wallet.availableBalance);
  const animatedEarned = useAnimatedCounter(wallet.totalRewards);
  const animatedDeposited = useAnimatedCounter(wallet.totalDeposited);
  const animatedWithdrawn = useAnimatedCounter(wallet.totalWithdrawn);
  const animatedParticipating = useAnimatedCounter(wallet.participatingBalance || 0);

  const [campaign, setCampaign] = useState<RewardCampaign | null>(null);
  const [session, setSession] = useState<RewardSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Server clock synchronization offset (ms)
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [serverNowMs, setServerNowMs] = useState<number>(Date.now());

  // Participation Amount selection
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customInput, setCustomInput] = useState<string>('1000');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Accrued real-time reward calculation state
  const [liveAccruedReward, setLiveAccruedReward] = useState<number>(0);
  const animatedAccruedReward = useAnimatedCounter(liveAccruedReward, 400);

  // Mandatory First Recharge Paywall State
  const [showRechargeRequiredModal, setShowRechargeRequiredModal] = useState<boolean>(false);
  const [rechargeModalMessage, setRechargeModalMessage] = useState<string>('');

  // Check if first recharge is required
  const isFirstRechargeDone = (wallet.totalDeposited || 0) > 0 || (wallet.availableBalance || 0) >= 100;

  // Gated Ad Watcher
  const handleWatchAdGated = () => {
    sound.playTap();
    if (!isFirstRechargeDone) {
      setRechargeModalMessage('Bina pehla recharge kiye Ads dekhna aur rewards earn karna allow nahi hai. Earning unlock karne ke liye pehle wallet recharge karein.');
      setShowRechargeRequiredModal(true);
      return;
    }
    onWatchAd();
  };

  // Load wallet & session data
  const refreshData = async () => {
    try {
      const [walletRes, rewardsRes, notifsRes] = await Promise.all([
        api.getWallet(),
        api.getRewards(),
        api.getNotifications()
      ]);
      setWallet(walletRes);

      if (rewardsRes.serverTime) {
        const offset = new Date(rewardsRes.serverTime).getTime() - Date.now();
        setServerTimeOffset(offset);
      }

      if (rewardsRes.campaign) setCampaign(rewardsRes.campaign);
      if (rewardsRes.activeSession) {
        setSession(rewardsRes.activeSession);
      } else {
        setSession(null);
      }
      const unread = notifsRes.notifications.filter(n => !n.read).length;
      setUnreadNotifsCount(unread);
    } catch {
      // Handled by global offline handler
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Auto-prompt AdMob ad every 2 minutes (for users with first recharge done)
  useEffect(() => {
    const adInterval = setInterval(() => {
      if (isFirstRechargeDone) {
        onWatchAd();
      }
    }, 2 * 60 * 1000); // 2 minutes (120000ms)
    return () => clearInterval(adInterval);
  }, [onWatchAd, isFirstRechargeDone]);

  // Update serverNowMs every second synced with server offset
  useEffect(() => {
    const timer = setInterval(() => {
      setServerNowMs(Date.now() + serverTimeOffset);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  // Compute countdown and live accrued reward based strictly on server time
  const { remainingSeconds, progressPercentage, isCompleted, formattedCountdown } = useMemo(() => {
    if (!session || session.status !== 'ACTIVE') {
      return {
        remainingSeconds: null,
        progressPercentage: 0,
        isCompleted: false,
        formattedCountdown: '00:00:00'
      };
    }

    const startMs = new Date(session.startTime).getTime();
    const endMs = new Date(session.endTime).getTime();
    const totalDuration = Math.max(1, endMs - startMs);
    const elapsed = Math.max(0, serverNowMs - startMs);

    const remaining = Math.max(0, Math.floor((endMs - serverNowMs) / 1000));
    const completed = serverNowMs >= endMs || remaining <= 0;

    let progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    if (completed) progress = 100;

    const hrs = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    const formatted = [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');

    return {
      remainingSeconds: remaining,
      progressPercentage: progress,
      isCompleted: completed,
      formattedCountdown: formatted
    };
  }, [session, serverNowMs]);

  // Accrue live reward smoothly according to authoritative backend formula
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE') {
      setLiveAccruedReward(0);
      return;
    }

    const startMs = new Date(session.startTime).getTime();
    const endMs = new Date(session.endTime).getTime();
    const totalDuration = Math.max(1, endMs - startMs);
    const elapsed = Math.max(0, serverNowMs - startMs);

    if (serverNowMs >= endMs) {
      setLiveAccruedReward(session.rewardAmount);
    } else {
      const ratio = Math.min(1, Math.max(0, elapsed / totalDuration));
      const calculated = Math.round(session.rewardAmount * ratio * 100) / 100;
      setLiveAccruedReward(calculated);
    }
  }, [session, serverNowMs]);

  // Handle Amount Input Change
  const handleAmountChange = (val: number) => {
    sound.playTap();
    setSelectedAmount(val);
    setCustomInput(val.toString());
    setErrorMessage(null);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomInput(valStr);
    const num = Number(valStr);
    if (!isNaN(num) && num > 0) {
      setSelectedAmount(num);
    }
    setErrorMessage(null);
  };

  // Start 24h session after confirmation
  const handleConfirmAndStart = async () => {
    try {
      setIsSessionLoading(true);
      sound.playTap();
      const res = await api.startRewardSession(selectedAmount);
      setSession(res.session);
      setShowConfirmModal(false);
      sound.playSuccess();
      refreshData();
    } catch (err: any) {
      sound.playError();
      setErrorMessage(err.message || 'Could not start session');
      setShowConfirmModal(false);
    } finally {
      setIsSessionLoading(false);
    }
  };

  // Claim reward
  const handleClaimReward = async () => {
    try {
      setClaiming(true);
      sound.playTap();
      await api.claimReward();
      sound.playRewardChime();
      try {
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
      } catch (e) {
        console.warn('Confetti animation skipped', e);
      }
      setSession(null);
      refreshData();
    } catch (err: any) {
      sound.playError();
      setErrorMessage(err.message || 'Could not claim reward');
    } finally {
      setClaiming(false);
    }
  };

  // Min and max limits from campaign or fallback
  const minLimit = campaign?.minAmount || 100;
  const maxLimit = campaign?.maxAmount || 10000;
  const rewardRate = campaign?.rewardRatePercentage || 2.5;
  const calculatedEstimatedReward = Math.round(((selectedAmount * rewardRate) / 100) * 100) / 100;

  const hasInsufficientBalance = wallet.availableBalance < selectedAmount;

  // SVG Radial Progress parameters
  const circleRadius = 54;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (progressPercentage / 100) * circleCircumference;

  return (
    <div className="flex-1 w-full min-h-full flex flex-col p-4 space-y-4 pb-20 text-white select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-[1.5px] shadow-md shadow-emerald-500/20">
            <div className="w-full h-full bg-[#0a0e17] rounded-[10px] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-extrabold tracking-tight">VORA EARNING</h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Hello, {user.name.split(' ')[0]}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Language Switcher */}
          <button
            onClick={() => {
              sound.playTap();
              i18n.setLanguage(lang === 'en' ? 'hi' : 'en');
            }}
            title="Toggle English / हिन्दी"
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-cyan-400 hover:border-cyan-500/50 flex items-center space-x-1"
          >
            <Globe className="w-3 h-3 text-cyan-400" />
            <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const newMuted = !muted;
              sound.setMuted(newMuted);
              setMuted(newMuted);
              if (!newMuted) sound.playTap();
            }}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Admin Switcher (Only visible to authenticated ADMIN role) */}
          {user.role === 'ADMIN' && (
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('admin');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-400 font-semibold flex items-center space-x-1 hover:bg-amber-500/20 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{i18n.t('adminPortal')}</span>
            </button>
          )}

          {/* Notification Bell */}
          <button
            onClick={() => {
              sound.playTap();
              onNavigate('notifications');
            }}
            className="relative w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Profile Shortcut */}
          <button
            onClick={() => {
              sound.playTap();
              onNavigate('profile');
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-emerald-400 font-bold text-xs"
          >
            {user.name.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      {/* ===================== AVAILABLE BALANCE CARD ===================== */}
      <div className="relative w-full rounded-2xl overflow-hidden p-5 bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl shadow-black/40">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center space-x-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{i18n.t('availableBalance')}</span>
            </span>
            <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{i18n.t('ledgerVerified')}</span>
            </div>
          </div>

          {/* Big Balance Display with Animated Counter */}
          <div className="mt-2.5 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-emerald-400">₹</span>
            <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
              {animatedAvailable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Reserved Session Balance Badge if active */}
          {(wallet.participatingBalance || 0) > 0 && (
            <div className="mt-1 flex items-center space-x-1.5 text-[11px] text-cyan-300 font-medium bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg w-fit">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>
                ₹{Math.round(animatedParticipating).toLocaleString('en-IN')} {i18n.t('reservedInSession')}
              </span>
            </div>
          )}

          {wallet.pendingBalance > 0 && (
            <p className="text-[11px] text-amber-400 mt-1 font-medium">
              ₹{wallet.pendingBalance.toLocaleString('en-IN')} in processing withdrawal
            </p>
          )}

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('recharge');
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>{i18n.t('recharge')}</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onNavigate('withdraw');
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-700/60 active:scale-95 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>{i18n.t('withdraw')}</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onNavigate('history');
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-800 active:scale-95 transition-all"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>{i18n.t('history')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== FINANCIAL METRICS ROW ===================== */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">{i18n.t('totalEarned')}</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1">
            ₹{Math.round(animatedEarned).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">{i18n.t('totalDeposited')}</span>
          <span className="text-sm font-bold font-mono text-cyan-400 mt-1">
            ₹{Math.round(animatedDeposited).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">{i18n.t('totalWithdrawn')}</span>
          <span className="text-sm font-bold font-mono text-slate-200 mt-1">
            ₹{Math.round(animatedWithdrawn).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* ===================== 24-HOUR REWARD / EARNING SESSION CARD ===================== */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900 to-[#0c1322] border border-cyan-500/25 p-5 shadow-xl relative overflow-hidden">
        {/* Top Glow & Badge */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {i18n.t('startSession')}
            </h3>
          </div>
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border flex items-center space-x-1.5 ${
              session?.status === 'ACTIVE'
                ? isCompleted
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
            }`}
          >
            {session?.status === 'ACTIVE' && (
              <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            )}
            <span>{session?.status === 'ACTIVE' ? (isCompleted ? i18n.t('completed') : 'ACTIVE') : i18n.t('ready')}</span>
          </span>
        </div>

        {/* Dynamic Content: Active Session vs Participation Amount Selector */}
        {session && session.status === 'ACTIVE' ? (
          /* ===================== ACTIVE SESSION UI ===================== */
          <div className="space-y-4">
            {/* Top Meta: Participation Amount & Timing */}
            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{i18n.t('participation')}</span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  ₹{(session.participationAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="border-x border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{i18n.t('started')}</span>
                <span className="text-[11px] font-mono text-slate-300">
                  {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{i18n.t('ends')}</span>
                <span className="text-[11px] font-mono text-slate-300">
                  {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Circular / Radial Progress Indicator */}
            <div className="flex flex-col items-center justify-center py-2 relative">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
                  {/* Background Track */}
                  <circle
                    cx="70"
                    cy="70"
                    r={circleRadius}
                    className="stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Animated Gradient Stroke */}
                  <defs>
                    <linearGradient id="sessionProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="70"
                    cy="70"
                    r={circleRadius}
                    stroke="url(#sessionProgressGrad)"
                    strokeWidth="10"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                  />
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {progressPercentage}%
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 mt-0.5">
                    {isCompleted ? i18n.t('completed') : 'IN PROGRESS'}
                  </span>
                </div>
              </div>

              {/* Time Remaining Digital Monospace Counter */}
              <div className="mt-3 flex flex-col items-center text-center">
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Clock className={`w-3.5 h-3.5 text-cyan-400 ${!isCompleted ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                  <span className="font-semibold uppercase tracking-wider text-[11px]">{i18n.t('remainingTime')}</span>
                </div>
                <div className="text-xl font-mono font-extrabold text-cyan-300 tracking-widest mt-0.5">
                  {formattedCountdown}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                  {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} next day
                </div>
              </div>
            </div>

            {/* REAL-TIME ACCRUED REWARD CARD */}
            <div className="rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-cyan-950/40 border border-emerald-500/25 p-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span>{i18n.t('currentReward')}</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Live authoritative accrual (Max ₹{session.rewardAmount.toFixed(2)})
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold font-mono text-emerald-400">
                    ₹{animatedAccruedReward.toFixed(2)}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Rate: {rewardRate}% / 24h
                  </span>
                </div>
              </div>
            </div>

            {/* Completion / Claim Button */}
            {isCompleted ? (
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleClaimReward}
                  disabled={claiming}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center space-x-2 active:scale-95 transition-all"
                >
                  <Award className="w-5 h-5 text-slate-950" />
                  <span>
                    Claim ₹{session.rewardAmount.toFixed(2)} + Return ₹{(session.participationAmount || 0).toLocaleString('en-IN')}
                  </span>
                </button>
                <p className="text-[10px] text-center text-emerald-400 font-medium">
                  24-Hour session successfully verified by server ledger.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
                  <span>Server-authoritative timer</span>
                </span>
                <span className="text-[10px] text-emerald-400/90 font-mono font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Session Active</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          /* ===================== PARTICIPATION AMOUNT / ADD MONEY SETUP ===================== */
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Participate in the 24-hour reward campaign. Your participation amount is securely reserved in the wallet ledger and returned along with promotional rewards upon verified session completion.
            </p>

            {/* Promotional Yield Rate Banner */}
            <div className="flex items-center justify-between text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Promotional Loyalty Yield</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {rewardRate}% / 24-Hours
              </span>
            </div>

            {/* ADD MONEY / PARTICIPATION AMOUNT SECTION */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{i18n.t('participationAmount')}</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Limit: ₹{minLimit.toLocaleString('en-IN')} - ₹{maxLimit.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_AMOUNTS.map((amt) => {
                  const isSelected = selectedAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleAmountChange(amt)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition-all border ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  );
                })}
              </div>

              {/* Custom Input Field */}
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  min={minLimit}
                  max={maxLimit}
                  value={customInput}
                  onChange={handleCustomInputChange}
                  placeholder="Enter participation amount"
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2.5 pl-8 pr-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              {/* Expected Returns Summary */}
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Selected Participation:</span>
                  <span className="font-mono font-bold text-white">₹{selectedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Estimated Reward ({rewardRate}%):</span>
                  <span className="font-mono font-bold text-emerald-400">+₹{calculatedEstimatedReward.toFixed(2)}</span>
                </div>
                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-slate-300 font-semibold">
                  <span>Total Value at Completion:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    ₹{(selectedAmount + calculatedEstimatedReward).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Balance Validation & Action Button */}
            {hasInsufficientBalance ? (
              <div className="space-y-2 pt-1">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold">{i18n.t('insufficientBalance')}</p>
                      <p className="text-[10px] text-amber-400/80">
                        Available: ₹{wallet.availableBalance.toLocaleString('en-IN')} • Required: ₹{selectedAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    onNavigate('recharge');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{i18n.t('rechargeNow')}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  if (selectedAmount < minLimit || selectedAmount > maxLimit) {
                    setErrorMessage(`Amount must be between ₹${minLimit} and ₹${maxLimit}`);
                    return;
                  }
                  setShowConfirmModal(true);
                }}
                disabled={isSessionLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{i18n.t('start24hSession')}</span>
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2.5">
          <span>Authoritative server time protected against clock tampering</span>
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>

      {/* ===================== CONFIRMATION POPUP MODAL ===================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b101b] border border-cyan-500/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {i18n.t('confirmStartSession')}
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Ledger Details Table */}
            <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/90 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>{i18n.t('participationAmount')}:</span>
                <span className="font-mono font-bold text-white">₹{selectedAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>{i18n.t('availableBalance')}:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹{wallet.availableBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-cyan-400">
                <span>{i18n.t('amountReserved')}:</span>
                <span className="font-mono font-bold">
                  ₹{selectedAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold text-slate-200">
                <span>{i18n.t('remainingAvailable')}:</span>
                <span className="font-mono text-cyan-300">
                  ₹{Math.max(0, wallet.availableBalance - selectedAmount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 pt-1">
                <span>Estimated Reward (24h):</span>
                <span className="font-mono font-bold">+₹{calculatedEstimatedReward.toFixed(2)}</span>
              </div>
            </div>

            {/* Ledger Compliance Note */}
            <p className="text-[10px] text-slate-400 leading-normal bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              ₹{selectedAmount.toLocaleString('en-IN')} will be reserved in your wallet ledger as{' '}
              <span className="font-mono text-cyan-300">SESSION_PARTICIPATION</span>. Your principal balance will be returned alongside accrued rewards upon session completion.
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setShowConfirmModal(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs active:scale-95 transition-all"
              >
                {i18n.t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmAndStart}
                disabled={isSessionLoading}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
              >
                {isSessionLoading ? (
                  <Clock className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{i18n.t('confirmAndStart')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ADMOB REWARDED ADS CARD ===================== */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-[#121929] border border-slate-800 p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Tv className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="text-xs font-bold text-white">{i18n.t('dailyRewardedAd')}</h4>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-semibold">
                AdMob
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {i18n.t('earnPerAd')}
            </p>
          </div>
        </div>

        <button
          onClick={handleWatchAdGated}
          className="py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center space-x-1 shrink-0 active:scale-95 transition-all"
        >
          <span>{i18n.t('watchAd')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ===================== ADMOB BANNER ADVERTISEMENT ===================== */}
      <BannerAd />


      {/* ===================== FIRST RECHARGE REQUIRED MODAL ===================== */}
      {showRechargeRequiredModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-[#111928] via-[#0d1320] to-[#070b13] border-2 border-amber-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl shadow-amber-500/20 text-center space-y-4 relative">
            <button
              onClick={() => setShowRechargeRequiredModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/60"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-400 p-[2px] shadow-lg shadow-amber-500/30">
              <div className="w-full h-full bg-[#0d1320] rounded-[22px] flex items-center justify-center">
                <ArrowDownLeft className="w-8 h-8 text-amber-400 animate-bounce" />
              </div>
            </div>

            <div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 uppercase tracking-wider font-mono">
                Mandatory Activation
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                Pehle Recharge Karein
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1.5 px-2">
                {rechargeModalMessage || 'Platform par earning start karne ke liye aur Real Ads & Daily Yield activate karne ke liye sabse pehle wallet recharge complete karein.'}
              </p>
            </div>

            {/* Benefits Box */}
            <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Secure Instant UPI & Razorpay</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unlock Real Daily Ads & 2.5% Daily Rewards</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant Withdrawal to Bank Account / UPI</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setShowRechargeRequiredModal(false);
                  onNavigate('recharge');
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <ArrowDownLeft className="w-5 h-5 text-slate-950 stroke-[3]" />
                <span>Abhi Recharge Karein (₹100 se start)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRechargeRequiredModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 font-medium py-1"
              >
                Baad mein karein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
