import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Shield,
  Volume2,
  VolumeX,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { admobService } from '../services/admob';

interface RewardedAdModalProps {
  onSuccess: (rewardAmount: number) => void;
  onClose: () => void;
}

// Realistic rotating ad campaigns – mimics actual Google AdMob ads
const AD_CAMPAIGNS = [
  {
    brand: 'PhonePe',
    tagline: 'India\'s #1 Payment App',
    headline: 'Send Money Instantly — Zero Fees!',
    desc: 'Transfer to any UPI ID or bank account in seconds. 500M+ users trust PhonePe.',
    cta: 'Install Free',
    bg: 'from-[#5f259f] via-[#7b2fb5] to-[#4a1a7a]',
    accent: '#a855f7',
    logo: '₽',
    logoColor: '#fff',
    logoBg: '#5f259f',
    badge: 'AD • Google',
  },
  {
    brand: 'Google Pay',
    tagline: 'Powered by Google',
    headline: 'Pay Smarter with GPay Rewards',
    desc: 'Earn cashback every time you pay. Shop, bill, recharge — all in one safe app.',
    cta: 'Get GPay',
    bg: 'from-[#1a73e8] via-[#185abc] to-[#0d47a1]',
    accent: '#4fc3f7',
    logo: 'G',
    logoColor: '#fff',
    logoBg: '#1a73e8',
    badge: 'AD • Google',
  },
  {
    brand: 'Groww',
    tagline: 'Invest with Confidence',
    headline: 'Start SIP from ₹10 — Grow Wealth!',
    desc: 'Mutual funds, stocks, FD — all in one app. SEBI registered. Join 5 Cr+ investors.',
    cta: 'Invest Now',
    bg: 'from-[#00d09c] via-[#00b386] to-[#007a5c]',
    accent: '#00d09c',
    logo: 'G',
    logoColor: '#fff',
    logoBg: '#00b386',
    badge: 'AD • Google',
  },
  {
    brand: 'CRED',
    tagline: 'Members-Only Rewards',
    headline: 'Pay Credit Card & Earn Coins',
    desc: 'Get exclusive rewards, cashback & offers just for paying your credit card bills on time.',
    cta: 'Join CRED',
    bg: 'from-[#1c1c28] via-[#2d2d40] to-[#111118]',
    accent: '#facc15',
    logo: 'C',
    logoColor: '#facc15',
    logoBg: '#2d2d40',
    badge: 'AD • Google',
  },
  {
    brand: 'Dream11',
    tagline: 'India\'s Biggest Fantasy Platform',
    headline: 'Win ₹1 Crore — Play Fantasy Sports!',
    desc: 'Cricket, Football, Kabaddi & more. Create your team and win real cash every day.',
    cta: 'Play Now',
    bg: 'from-[#d4001a] via-[#b30016] to-[#800010]',
    accent: '#ff4d61',
    logo: 'D',
    logoColor: '#fff',
    logoBg: '#d4001a',
    badge: 'AD • Google',
  },
  {
    brand: 'Meesho',
    tagline: 'Shop at Lowest Prices',
    headline: 'Free Delivery on Your 1st Order!',
    desc: 'Clothes, electronics, home & more — upto 80% off. 1.2 Cr+ sellers. Fast delivery.',
    cta: 'Shop Now',
    bg: 'from-[#9c27b0] via-[#7b1fa2] to-[#4a148c]',
    accent: '#e040fb',
    logo: 'M',
    logoColor: '#fff',
    logoBg: '#9c27b0',
    badge: 'AD • Google',
  },
];

// Pick a random ad on each mount
function pickAd() {
  return AD_CAMPAIGNS[Math.floor(Math.random() * AD_CAMPAIGNS.length)];
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({ onSuccess, onClose }) => {
  const [phase, setPhase] = useState<'loading' | 'playing' | 'completed' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adToken, setAdToken] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number>(2.5);
  const [countdown, setCountdown] = useState<number>(15);
  const [isMuted, setIsMuted] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number>(0);
  const [ad] = useState(pickAd);
  // Animated loading dots
  const [loadDots, setLoadDots] = useState('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Loading dots animation
  useEffect(() => {
    if (phase !== 'loading') return;
    const t = setInterval(() => {
      setLoadDots(d => d.length >= 3 ? '' : d + '.');
    }, 420);
    return () => clearInterval(t);
  }, [phase]);

  // Request ad token & start
  useEffect(() => {
    (async () => {
      try {
        setPhase('loading');
        const tokenRes = await api.requestAdToken();
        if (!isMountedRef.current) return;
        setAdToken(tokenRes.token);
        setRewardAmount(tokenRes.rewardAmount);

        // Native AdMob if inside APK
        if (admobService.isNativePlatform()) {
          const nativeRes = await admobService.showNativeRewardedAd(tokenRes.adUnitId);
          if (!isMountedRef.current) return;

          if (nativeRes.nativeShown) {
            if (nativeRes.rewarded) {
              const res = await api.reportAdReward(tokenRes.token, 15000, true);
              sound.playRewardChime();
              try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } }); } catch {}
              setPhase('completed');
              setTimeout(() => { onSuccess(res.rewardAmount); }, 1200);
            } else {
              setPhase('error');
              setErrorMessage('Ad was closed before the reward completed.');
            }
            return;
          }
        }

        // Web/fallback: show ad UI after simulated load
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setPhase('playing');
          setWatchStartTime(Date.now());
        }, 1800);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setPhase('error');
        setErrorMessage(err.message || 'Advertisement unavailable. Please try again later.');
      }
    })();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAdCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const handleAdCompleted = async () => {
    if (!adToken) return;
    try {
      const durationMs = Date.now() - watchStartTime;
      const res = await api.reportAdReward(adToken, durationMs, true);
      sound.playRewardChime();
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } }); } catch {}
      setPhase('completed');
      setTimeout(() => { onSuccess(res.rewardAmount); }, 1600);
    } catch (err: any) {
      setPhase('error');
      setErrorMessage(err.message || 'Reward verification failed');
    }
  };

  const handleAttemptClose = () => {
    sound.playTap();
    if (phase === 'playing' && countdown > 0) {
      setShowExitWarning(true);
    } else {
      onClose();
    }
  };

  const progressPct = Math.round(((15 - countdown) / 15) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">

        {/* ── PHASE: LOADING ── */}
        {phase === 'loading' && (
          <div className="bg-[#0a0e1a] border border-slate-800 rounded-2xl p-7 text-center flex flex-col items-center space-y-4">
            {/* Google AdMob logo area */}
            <div className="flex items-center space-x-1.5">
              <div className="w-5 h-5 rounded-full bg-[#4285F4]" />
              <div className="w-5 h-5 rounded-full bg-[#EA4335]" />
              <div className="w-5 h-5 rounded-full bg-[#FBBC05]" />
              <div className="w-5 h-5 rounded-full bg-[#34A853]" />
            </div>
            <div className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Google AdMob</div>

            <div className="relative">
              <div className="w-14 h-14 rounded-xl border-2 border-slate-700 bg-slate-800/80 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Loading Ad{loadDots}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Fetching personalized advertisement</p>
            </div>

            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>

            <button
              onClick={() => { sound.playTap(); onClose(); }}
              className="text-xs text-slate-600 hover:text-slate-400 pt-1"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── PHASE: PLAYING (Realistic Ad UI) ── */}
        {phase === 'playing' && (
          <div className={`relative w-full bg-gradient-to-b ${ad.bg} flex flex-col`} style={{ minHeight: 480 }}>

            {/* Top bar — mimics real interstitial ad top bar */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              {/* Skip / Countdown */}
              <div
                className="flex items-center space-x-1.5 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[11px] font-bold text-white font-mono">
                  {countdown > 0 ? `Skip in ${countdown}s` : 'Reward Ready!'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                {/* Mute */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10"
                >
                  {isMuted
                    ? <VolumeX className="w-3.5 h-3.5 text-white/70" />
                    : <Volume2 className="w-3.5 h-3.5 text-white/70" />}
                </button>
                {/* Close */}
                <button
                  onClick={handleAttemptClose}
                  className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10"
                >
                  <X className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>
            </div>

            {/* ──── AD CREATIVE ──── */}
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-3 text-center">
              {/* Brand logo circle */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-2xl border border-white/10"
                style={{ background: ad.logoBg }}
              >
                <span className="text-4xl font-black" style={{ color: ad.logoColor }}>{ad.logo}</span>
              </div>

              {/* Brand name & tagline */}
              <div
                className="text-[10px] font-bold tracking-widest uppercase mb-1"
                style={{ color: ad.accent }}
              >
                {ad.tagline}
              </div>
              <h3 className="text-xl font-extrabold text-white leading-tight mb-2">
                {ad.headline}
              </h3>
              <p className="text-[12px] text-white/70 leading-relaxed max-w-[260px]">
                {ad.desc}
              </p>

              {/* CTA Button (decorative — matches real ad UX) */}
              <button
                className="mt-5 px-7 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 shadow-lg transition-all active:scale-95"
                style={{ background: ad.accent, color: '#0a0a0a' }}
              >
                {ad.cta} <ExternalLink className="inline w-3 h-3 ml-1 opacity-70" />
              </button>
            </div>

            {/* ──── BOTTOM PROGRESS BAR (Google-style) ──── */}
            <div className="px-4 pb-4">
              <div className="flex justify-between items-center text-[10px] text-white/40 mb-1.5 font-mono">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {ad.badge}
                </span>
                <span className="font-bold" style={{ color: ad.accent }}>
                  Earn ₹{rewardAmount} for watching
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progressPct}%`,
                    background: `linear-gradient(90deg, ${ad.accent}, #22c55e)`
                  }}
                />
              </div>
            </div>

            {/* ──── EARLY CLOSE WARNING ──── */}
            {showExitWarning && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center rounded-2xl">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                <h4 className="text-sm font-bold text-white">Skip this ad?</h4>
                <p className="text-xs text-slate-300 mt-1 mb-5 max-w-[220px]">
                  Close before the timer ends and you will <span className="text-red-400 font-bold">NOT</span> receive your ₹{rewardAmount} reward.
                </p>
                <div className="w-full flex space-x-2">
                  <button
                    onClick={() => { sound.playTap(); setShowExitWarning(false); onClose(); }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800/80 text-xs font-semibold text-rose-400 border border-rose-400/20"
                  >
                    Skip (No Reward)
                  </button>
                  <button
                    onClick={() => { sound.playTap(); setShowExitWarning(false); }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-black"
                    style={{ background: ad.accent }}
                  >
                    ▶ Resume Ad
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PHASE: COMPLETED ── */}
        {phase === 'completed' && (
          <div className="bg-[#0a0e1a] border border-emerald-500/30 rounded-2xl p-8 text-center flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
            <h3 className="text-lg font-extrabold text-white">Reward Unlocked! 🎉</h3>
            <p className="text-2xl font-black text-emerald-400">+₹{rewardAmount}</p>
            <p className="text-xs text-slate-400">Credited to your Vora Earning wallet</p>
          </div>
        )}

        {/* ── PHASE: ERROR ── */}
        {phase === 'error' && (
          <div className="bg-[#0a0e1a] border border-slate-800 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ad Unavailable</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {errorMessage || 'Please try again. Check your network connection.'}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => { sound.playTap(); onClose(); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  setPhase('loading');
                  setCountdown(15);
                  api.requestAdToken().then(r => {
                    setAdToken(r.token);
                    setRewardAmount(r.rewardAmount);
                    setTimeout(() => {
                      setPhase('playing');
                      setWatchStartTime(Date.now());
                    }, 1800);
                  }).catch(e => {
                    setPhase('error');
                    setErrorMessage(e.message);
                  });
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
