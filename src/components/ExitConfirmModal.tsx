import React from 'react';
import { AlertCircle } from 'lucide-react';
import { sound } from '../services/audio';

interface ExitConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl animate-scaleUp text-white text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-amber-400" />
        </div>
        <h3 className="text-base font-bold text-white">Exit VORA EARNING?</h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Are you sure you want to exit the application?
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              sound.playTap();
              onCancel();
            }}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            NO
          </button>
          <button
            onClick={() => {
              sound.playTap();
              onConfirm();
            }}
            className="py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-xs font-bold text-white shadow-md shadow-rose-500/20 transition-all"
          >
            YES
          </button>
        </div>
      </div>
    </div>
  );
};
