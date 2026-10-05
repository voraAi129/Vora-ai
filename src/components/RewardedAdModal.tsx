import React, { useState, useEffect } from 'react';
import {
  X,
  Tv,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Shield,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { sound } from '../services/audio';

interface RewardedAdModalProps {
  onSuccess: (rewardAmount: number) => void;
  onClose: () => void;
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

  // Request ad token & simulate AdMob SDK loader
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setPhase('loading');
        // Fetch one-time challenge token from backend
        const tokenRes = await api.requestAdToken();
        if (!isMounted) return;
        setAdToken(tokenRes.token);
        setRewardAmount(tokenRes.rewardAmount);

        // Realistic SDK load time
        setTimeout(() => {
          if (!isMounted) return;
          setPhase('playing');
          setWatchStartTime(Date.now());
        }, 1800);
      } catch (err: any) {
        if (!isMounted) return;
        setPhase('error');
        setErrorMessage(err.message || 'Advertisement unavailable. Please try again later.');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Ad playback timer countdown
  useEffect(() => {
    if (phase !== 'playing') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
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

  // Complete ad and send backend cryptographic verification
  const handleAdCompleted = async () => {
    if (!adToken) return;
    try {
      const durationMs = Date.now() - watchStartTime;
      const res = await api.reportAdReward(adToken, durationMs, true);
      sound.playRewardChime();
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
      } catch {}
      setPhase('completed');
      setTimeout(() => {
        onSuccess(res.rewardAmount);
      }, 1500);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm rounded-3xl bg-[#080d18] border border-slate-700/80 overflow-hidden shadow-2xl relative animate-scaleUp text-white flex flex-col">
        {/* PHASE 1: AD MOB LOADING POPUP */}
        {phase === 'loading' && (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
                <Tv className="w-8 h-8 text-amber-400" />
              </div>
              <RefreshCw className="w-5 h-5 text-amber-400 absolute -bottom-1 -right-1 animate-spin" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Please wait…</h3>
              <p className="text-xs text-slate-400 mt-1">Loading advertisement…</p>
            </div>

            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 pt-2 font-mono">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Google AdMob Rewarded Video SDK</span>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="text-xs text-slate-500 hover:text-slate-300 pt-2"
            >
              Cancel
            </button>
          </div>
        )}

        {/* PHASE 2: REAL AD PLAYBACK */}
        {phase === 'playing' && (
          <div className="relative w-full h-[450px] bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-between p-4">
            {/* Top Bar inside Ad */}
            <div className="flex items-center justify-between z-20">
              <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-mono font-bold text-amber-400">
                  Reward in {countdown}s
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleAttemptClose}
                  className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Ad Content Visual */}
            <div className="my-auto text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-amber-400 p-[2px] mx-auto mb-4 shadow-xl shadow-cyan-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                  <Play className="w-8 h-8 text-cyan-400 fill-cyan-400/20" />
                </div>
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-bold block mb-1">
                SPONSORED PARTNER
              </span>
              <h4 className="text-lg font-extrabold text-white">
                Next-Generation Fintech Ecosystem
              </h4>
              <p className="text-xs text-slate-300 mt-2 max-w-[240px] mx-auto leading-relaxed">
                Watch the full sponsor demonstration to qualify for the platform loyalty token.
              </p>
            </div>

            {/* Bottom Progress Bar */}
            <div className="z-20">
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5 font-mono">
                <span>AdMob Verification Guard</span>
                <span className="text-emerald-400 font-bold">Reward: ₹{rewardAmount}</span>
              </div>
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${Math.round(((15 - countdown) / 15) * 100)}%` }}
                />
              </div>
            </div>

            {/* Early Close Warning Modal */}
            {showExitWarning && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <h4 className="text-sm font-bold text-white">Close Early?</h4>
                <p className="text-xs text-slate-300 mt-1 mb-4">
                  If you close before the timer ends, you will NOT receive the ₹{rewardAmount} reward.
                </p>
                <div className="w-full flex space-x-2">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setShowExitWarning(false);
                      onClose();
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-rose-400"
                  >
                    Close Without Reward
                  </button>
                  <button
                    onClick={() => {
                      sound.playTap();
                      setShowExitWarning(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-slate-950"
                  >
                    Resume Ad
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE 3: COMPLETED */}
        {phase === 'completed' && (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 animate-scaleUp">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Reward Earned!</h3>
            <p className="text-xs text-slate-300">
              ₹{rewardAmount} has been credited to your verified wallet ledger.
            </p>
          </div>
        )}

        {/* PHASE 4: ERROR / UNAVAILABLE */}
        {phase === 'error' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Advertisement Unavailable</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {errorMessage || 'Please try again later or check your network connection.'}
              </p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  setPhase('loading');
                  api.requestAdToken().then((r) => {
                    setAdToken(r.token);
                    setRewardAmount(r.rewardAmount);
                    setTimeout(() => {
                      setPhase('playing');
                      setCountdown(15);
                      setWatchStartTime(Date.now());
                    }, 1200);
                  }).catch((e) => {
                    setPhase('error');
                    setErrorMessage(e.message);
                  });
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950"
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
