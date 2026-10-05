import React from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { sound } from '../services/audio';

interface OfflineModalProps {
  onRetry: () => void;
  onClose: () => void;
}

export const OfflineModal: React.FC<OfflineModalProps> = ({ onRetry, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xs rounded-3xl bg-[#0b101c] border border-slate-700 p-6 text-center shadow-2xl animate-scaleUp text-white">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <WifiOff className="w-7 h-7" />
        </div>

        <h3 className="text-base font-bold text-white">No Internet Connection</h3>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Please turn on your internet connection and try again. All financial ledger operations require an active secure server connection.
        </p>

        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            CLOSE
          </button>
          <button
            onClick={() => {
              sound.playTap();
              onRetry();
            }}
            className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
