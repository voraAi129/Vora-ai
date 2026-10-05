import React, { useEffect, useState } from 'react';
import { Wifi, BatteryMedium, Signal, Smartphone, Maximize2 } from 'lucide-react';
import { sound } from '../services/audio';

interface AndroidFrameProps {
  children: React.ReactNode;
  onBackPress?: () => void;
  canGoBack?: boolean;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  onBackPress,
  canGoBack
}) => {
  const [isFrameMode, setIsFrameMode] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to browser Back button / popstate for native Android back experience
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (onBackPress) {
        sound.playTap();
        onBackPress();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBackPress]);

  return (
    <div className="w-full min-h-screen bg-[#040609] flex flex-col items-center justify-center relative select-none">
      {/* Viewport Mode Switcher Pill on Desktop */}
      <div className="hidden md:flex fixed top-4 right-4 z-50 items-center space-x-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 px-3 py-1.5 rounded-full text-xs text-slate-300 shadow-xl">
        <button
          onClick={() => {
            sound.playTap();
            setIsFrameMode(!isFrameMode);
          }}
          className="flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          {isFrameMode ? (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen View</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Phone Mockup</span>
            </>
          )}
        </button>
      </div>

      {/* Frame Container */}
      <div
        className={`w-full transition-all duration-300 flex flex-col ${
          isFrameMode
            ? 'max-w-[420px] h-[880px] my-6 rounded-[48px] border-[10px] border-[#181d29] shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-white/10 overflow-hidden relative'
            : 'max-w-md min-h-screen mx-auto relative shadow-2xl'
        }`}
      >
        {/* Android Punch Hole & Speaker Grille (in Frame Mode) */}
        {isFrameMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center space-x-3 pointer-events-none">
            <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0a121e]/80" />
            </div>
            <div className="w-14 h-1 rounded-full bg-slate-800/80" />
          </div>
        )}

        {/* Android Native Status Bar */}
        <div className="w-full h-8 px-6 bg-transparent flex items-center justify-between text-[11px] font-mono font-medium text-slate-300 select-none z-40 shrink-0 pt-1">
          <span>{currentTime || '12:00'}</span>
          <div className="flex items-center space-x-2 text-slate-300">
            <Signal className="w-3.5 h-3.5 text-slate-200" />
            <span className="text-[10px] font-bold text-emerald-400 tracking-tighter">5G</span>
            <Wifi className="w-3.5 h-3.5 text-slate-200" />
            <div className="flex items-center space-x-0.5">
              <span className="text-[10px]">100%</span>
              <BatteryMedium className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Screen View Body */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative bg-[#07090e]">
          {children}
        </div>

        {/* Android Bottom Navigation Pill */}
        <div className="w-full h-6 bg-[#07090e] shrink-0 flex items-center justify-center z-40 pb-1">
          <button
            onClick={() => {
              if (onBackPress) {
                sound.playTap();
                onBackPress();
              }
            }}
            title={canGoBack ? 'Back' : 'Home / Exit'}
            className="w-28 h-1 rounded-full bg-slate-600 hover:bg-emerald-400 transition-colors cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
