import React, { useEffect, useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Sparkles,
  Swords,
  TrendingUp,
  ShieldCheck,
  Bell,
  Tv,
  ChevronRight,
  Globe,
  Volume2,
  VolumeX,
  X,
  Gift,
  Gamepad2,
  Flame,
  Zap,
  CheckCircle2,
  Dices,
  Target
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { i18n } from '../services/i18n';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { User, WalletSummary } from '../types';

interface HomeScreenProps {
  user: User;
  onNavigate: (view: 'recharge' | 'withdraw' | 'history' | 'profile' | 'notifications' | 'admin' | 'referral' | 'games') => void;
  onWatchAd: () => void;
}

// Rotating Google AdMob Banner Ads (Real-Brand Dynamic AdMob Banners)
const BANNER_ADS = [
  { brand: 'Swiggy', text: 'Order food in 30 mins! 60% OFF your first order 🍕', cta: 'ORDER NOW', color: '#FC8019', bg: 'from-orange-950/80 via-slate-900 to-slate-950', link: 'https://swiggy.com' },
  { brand: 'Amazon', text: 'Great Indian Festival — Up to 80% OFF! Shop Now 🛒', cta: 'SHOP NOW', color: '#FF9900', bg: 'from-amber-950/80 via-slate-900 to-slate-950', link: 'https://amazon.in' },
  { brand: 'Flipkart', text: 'Big Billion Days — Unbeatable deals on Smartphones 📱', cta: 'EXPLORE', color: '#2874F0', bg: 'from-blue-950/80 via-slate-900 to-slate-950', link: 'https://flipkart.com' },
  { brand: 'Zepto', text: '10-Minute Instant Grocery Delivery! ₹100 Cashback 🛍️', cta: 'GET APP', color: '#8B5CF6', bg: 'from-purple-950/80 via-slate-900 to-slate-950', link: 'https://zepto.in' },
  { brand: 'Zomato', text: 'Top Rated Restaurants Near You 🍱 Use Code: ZOMATO50', cta: 'ORDER', color: '#E23744', bg: 'from-red-950/80 via-slate-900 to-slate-950', link: 'https://zomato.com' },
  { brand: 'Paytm', text: 'Fast UPI Payments & Cashback Rewards! 💳', cta: 'PAY NOW', color: '#00B9F1', bg: 'from-cyan-950/80 via-slate-900 to-slate-950', link: 'https://paytm.com' },
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
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const ad = BANNER_ADS[idx];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-md">
      {/* Top AdMob Header Tag */}
      <div className="flex items-center justify-between px-2.5 py-0.5 bg-slate-950/90 border-b border-slate-800/60 text-[9px] text-slate-400">
        <div className="flex items-center space-x-1">
          <span className="px-1 py-[1px] rounded bg-amber-500/20 text-amber-400 font-extrabold text-[8px] tracking-wider border border-amber-500/30">
            Ad
          </span>
          <span className="font-semibold text-slate-300">Ads by Google</span>
        </div>
        <div className="flex items-center space-x-1 text-[8px] text-slate-500">
          <span className="hover:underline cursor-pointer">AdMob ca-app-pub-3940...</span>
          <span className="text-slate-600">ℹ️</span>
        </div>
      </div>

      {/* Main Banner Content */}
      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => sound.playTap()}
        className={`p-3 bg-gradient-to-r ${ad.bg} flex items-center justify-between transition-all duration-300 cursor-pointer block ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-98'
        }`}
      >
        <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-lg text-white font-sans"
            style={{ background: ad.color }}
          >
            {ad.brand[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-xs tracking-tight text-white">{ad.brand}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300 font-mono">Verified Ad</span>
            </div>
            <p className="text-[11px] text-slate-200 truncate font-medium mt-0.5">{ad.text}</p>
          </div>
        </div>

        <div
          className="px-3 py-1.5 rounded-lg text-slate-950 font-black text-[10px] tracking-wider shrink-0 shadow-md transform active:scale-95 transition-all flex items-center space-x-1"
          style={{ background: ad.color }}
        >
          <span>{ad.cta}</span>
        </div>
      </a>
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

  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Mandatory First Recharge Paywall State
  const [showRechargeRequiredModal, setShowRechargeRequiredModal] = useState<boolean>(false);
  const [rechargeModalMessage, setRechargeModalMessage] = useState<string>('');
  const [minRecharge, setMinRecharge] = useState<number>(100);

  // Check if first recharge is done
  const isFirstRechargeDone = (wallet.totalDeposited || 0) > 0 || (wallet.availableBalance || 0) >= minRecharge;

  // Gated Ad Watcher
  const handleWatchAdGated = () => {
    sound.playTap();
    if (!isFirstRechargeDone) {
      setRechargeModalMessage('Bina pehla recharge kiye Ads dekhna aur extra rewards earn karna allow nahi hai. Earning unlock karne ke liye pehle wallet recharge karein.');
      setShowRechargeRequiredModal(true);
      return;
    }
    onWatchAd();
  };

  // Load wallet & notifications data
  const refreshData = async () => {
    try {
      const [walletRes, notifsRes, sysRes] = await Promise.all([
        api.getWallet(),
        api.getNotifications(),
        api.getSystemSettings().catch(() => null)
      ]);
      setWallet(walletRes);

      if (sysRes?.settings?.minRechargeAmount) {
        setMinRecharge(sysRes.settings.minRechargeAmount);
      }

      const unread = notifsRes.notifications.filter(n => !n.read).length;
      setUnreadNotifsCount(unread);
    } catch {
      // Handled by global offline handler
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 8000); // Poll every 8s
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

          {/* Notifications */}
          <button
            onClick={() => {
              sound.playTap();
              onNavigate('notifications');
            }}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white relative"
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

          {wallet.pendingBalance > 0 && (
            <p className="text-[11px] text-amber-400 mt-1 font-medium">
              ₹{wallet.pendingBalance.toLocaleString('en-IN')} in processing withdrawal
            </p>
          )}

          {/* Quick Action 4-Grid Buttons (Recharge, Withdraw, Games, History) */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('recharge');
              }}
              className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex flex-col items-center justify-center space-y-1 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>{i18n.t('recharge')}</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onNavigate('withdraw');
              }}
              className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex flex-col items-center justify-center space-y-1 border border-slate-700/60 active:scale-95 transition-all"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>{i18n.t('withdraw')}</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onNavigate('games');
              }}
              className="py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs flex flex-col items-center justify-center space-y-1 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Games</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onNavigate('history');
              }}
              className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-xs flex flex-col items-center justify-center space-y-1 border border-slate-800 active:scale-95 transition-all"
            >
              <History className="w-4 h-4 text-cyan-400" />
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

      {/* ===================== PRIMARY GAME ARENA HUB CARD (REPLACES MINING) ===================== */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#120f26] via-[#0e1424] to-[#070b14] border-2 border-amber-500/30 p-5 shadow-2xl shadow-purple-950/40 space-y-4">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-amber-500/10 via-purple-500/15 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black font-mono text-[9px] tracking-wider animate-pulse flex items-center space-x-1">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>HOT • 5 LIVE GAMES</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold font-mono text-[9px]">
                91% BOT ARENA
              </span>
            </div>
            <h2 className="text-lg font-black text-white tracking-tight mt-1">
              1v1 Battle & Arcade Arena 🎮
            </h2>
            <p className="text-xs text-purple-200/90 leading-relaxed max-w-xs">
              2 Games 2-Player (1v1 vs Smart Bot) + 3 Single Player Games! Entry <span className="font-bold text-amber-400">₹0.50</span> se <span className="font-bold text-amber-400">₹20,000</span> tak.
            </p>
          </div>

          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 p-[2px] shadow-lg shadow-amber-500/20 shrink-0">
            <div className="w-full h-full bg-[#0a0e1a] rounded-[14px] flex items-center justify-center text-2xl">
              <Swords className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>

        {/* High-payout teaser chip */}
        <div className="relative z-10 bg-slate-950/80 rounded-2xl p-3 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Winning Payout</span>
              <span className="font-bold text-white text-xs">50 पैसे लगाए तो ₹0.80 मिले</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payout Multiplier</span>
            <span className="font-bold text-emerald-400 text-xs">1.60x Instant Cash</span>
          </div>
        </div>

        {/* 5 Games Quick Carousel Cards */}
        <div className="relative z-10 grid grid-cols-5 gap-1.5">
          {[
            { id: 'ludo', name: 'Ludo', icon: '🎲', tag: '2P vs Bot', color: 'from-blue-600/20 to-cyan-600/20 border-cyan-500/30' },
            { id: 'carrom', name: 'Carrom', icon: '🎯', tag: '2P vs Bot', color: 'from-amber-600/20 to-orange-600/20 border-amber-500/30' },
            { id: 'fruit_ninja', name: 'Fruit', icon: '🍉', tag: 'Single', color: 'from-rose-600/20 to-red-600/20 border-rose-500/30' },
            { id: 'knife_hit', name: 'Knife', icon: '🗡️', tag: 'Single', color: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/30' },
            { id: 'candy_match', name: 'Candy', icon: '🍬', tag: 'Single', color: 'from-purple-600/20 to-pink-600/20 border-purple-500/30' }
          ].map((gm) => (
            <div
              key={gm.id}
              onClick={() => {
                sound.playTap();
                onNavigate('games');
              }}
              className={`p-2 rounded-xl bg-gradient-to-b ${gm.color} border text-center cursor-pointer hover:scale-105 active:scale-95 transition-transform flex flex-col items-center justify-center`}
            >
              <span className="text-xl">{gm.icon}</span>
              <span className="text-[10px] font-bold text-white mt-0.5 truncate w-full">{gm.name}</span>
              <span className="text-[8px] font-mono text-slate-300 font-semibold mt-0.5">{gm.tag}</span>
            </div>
          ))}
        </div>

        {/* Main CTA Button: Go to Games Page */}
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            onNavigate('games');
          }}
          className="relative z-10 w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <Gamepad2 className="w-5 h-5 text-slate-950" />
          <span>PLAY GAMES & WIN CASH (5 GAMES)</span>
          <ChevronRight className="w-4 h-4 text-slate-950 stroke-[3]" />
        </button>
      </div>

      {/* ===================== REFER & EARN BANNER CARD ===================== */}
      <div
        onClick={() => {
          sound.playTap();
          onNavigate('referral');
        }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/30 p-3.5 shadow-lg shadow-purple-950/30 cursor-pointer active:scale-[0.98] transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-purple-600 p-[1.5px] shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Refer & Earn Program</h4>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                  1% Comm.
                </span>
              </div>
              <p className="text-[11px] text-purple-200 mt-0.5">
                Invite friends & earn ₹50 + 1% on every recharge!
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-300 shrink-0" />
        </div>
      </div>

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
                {rechargeModalMessage || 'Platform par earning start karne ke liye aur Games & Daily Ads activate karne ke liye sabse pehle wallet recharge complete karein.'}
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
                <span>Play 1v1 Games & Win Instant Cash</span>
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
                <span>Abhi Recharge Karein (₹{minRecharge} se start)</span>
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
