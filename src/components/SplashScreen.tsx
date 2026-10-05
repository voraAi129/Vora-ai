import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { sound } from '../services/audio';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [phaseText, setPhaseText] = useState('Initializing secure environment...');

  useEffect(() => {
    sound.playSplashChord();

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        if (next === 25) setPhaseText('Connecting to encrypted ledger...');
        if (next === 55) setPhaseText('Synchronizing financial server clock...');
        if (next === 85) setPhaseText('Finalizing security protocols...');
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            sound.playTap();
            onFinish();
          }, 300);
          return 100;
        }
        return next;
      });
    }, 48); // ~5000ms total (100 steps * 48ms + buffer)

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#07090e] flex flex-col items-center justify-between p-6 select-none overflow-hidden text-white">
      {/* Background Animated Gradients & Glowing Shaders */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[120px]" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Top Security Status Pill */}
      <div className="relative z-10 pt-8 flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-emerald-500/30 backdrop-blur-md shadow-lg shadow-emerald-950/20">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[11px] font-mono tracking-wider text-emerald-400 uppercase font-semibold">
          256-Bit Ledger Guard Active
        </span>
      </div>

      {/* Center Cinematic 3D Logo & Branding */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto">
        {/* Outer Glowing Holographic Ring */}
        <div className="relative w-28 h-28 flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-amber-400 p-[2px] shadow-2xl shadow-emerald-500/30 animate-[spin_8s_linear_infinite]">
            <div className="w-full h-full bg-[#07090e] rounded-[22px]" />
          </div>

          {/* 3D Shield Glass Card */}
          <div className="relative z-10 w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-950/95 border border-white/20 backdrop-blur-xl flex flex-col items-center justify-center shadow-inner group">
            <div className="relative">
              <Zap className="w-10 h-10 text-emerald-400 fill-emerald-400/20 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
              <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-2 animate-bounce" />
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-300">VORA</span>
            </div>
          </div>
        </div>

        {/* Title Typography */}
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent font-['Plus_Jakarta_Sans']">
          VORA <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">EARNING</span>
        </h1>
        <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide max-w-[260px]">
          Next-Gen Compliant Digital Rewards & Fintech Loyalty Engine
        </p>
      </div>

      {/* Bottom Loading Progress Indicator */}
      <div className="relative z-10 w-full max-w-xs mb-8 flex flex-col items-center">
        <div className="w-full flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
          <span className="text-[11px] text-slate-400">{phaseText}</span>
          <span className="text-[11px] font-bold text-emerald-400">{progress}%</span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5 p-[1px]">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-300 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button for quick review */}
        <button
          onClick={() => {
            sound.playTap();
            onFinish();
          }}
          className="mt-5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider font-semibold py-1 px-3 rounded hover:bg-slate-900/50"
        >
          Skip Intro
        </button>

        <div className="mt-4 flex items-center space-x-1.5 text-[10px] text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>ISO 27001 & RBI Payout Standards Compliant</span>
        </div>
      </div>
    </div>
  );
};
