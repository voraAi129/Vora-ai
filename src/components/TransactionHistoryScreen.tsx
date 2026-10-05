import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Tv,
  RotateCcw,
  SlidersHorizontal,
  History,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { WalletTransaction } from '../types';

interface TransactionHistoryScreenProps {
  onBack: () => void;
}

export const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions(activeTab);
  }, [activeTab]);

  const loadTransactions = async (tab: string) => {
    try {
      setLoading(true);
      const res = await api.getTransactions(tab === 'ALL' ? undefined : tab);
      setTransactions(res.transactions);
    } catch {
      // Offline or error
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'RECHARGE':
        return <ArrowDownLeft className="w-4 h-4 text-cyan-400" />;
      case 'WITHDRAWAL':
        return <ArrowUpRight className="w-4 h-4 text-amber-400" />;
      case 'REWARD':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'AD_REWARD':
        return <Tv className="w-4 h-4 text-purple-400" />;
      case 'REFUND':
        return <RotateCcw className="w-4 h-4 text-blue-400" />;
      case 'SESSION_PARTICIPATION':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'ADJUSTMENT':
        return <SlidersHorizontal className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getStatusBadge = (status: WalletTransaction['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Success</span>
          </span>
        );
      case 'PENDING':
      case 'INITIATED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-bold text-amber-400">
            <Clock className="w-3 h-3 animate-spin" />
            <span>Pending</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-bold text-rose-400">
            <XCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-bold text-blue-400">
            <span>Refunded</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 w-full min-h-full flex flex-col p-4 bg-[#07090e] text-white select-none">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
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
          <h2 className="text-base font-bold">Transaction Ledger</h2>
          <p className="text-[11px] text-slate-400">Cryptographically Recorded Activity</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'RECHARGE', label: 'Recharge' },
          { id: 'WITHDRAWAL', label: 'Withdrawal' },
          { id: 'REWARD', label: 'Reward' },
          { id: 'SESSION_PARTICIPATION', label: 'Sessions' },
          { id: 'AD_REWARD', label: 'Ad Bonus' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              sound.playTap();
              setActiveTab(item.id);
            }}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === item.id
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="text-center py-20 text-slate-500 text-xs">
            Loading immutable ledger...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No transactions found in this category</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(tx.type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {tx.description}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(tx.createdAt).toLocaleDateString()} at{' '}
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                      TX: {tx.id}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm">
                    {tx.type === 'WITHDRAWAL' ? (
                      <span className="text-amber-400">-₹{tx.amount}</span>
                    ) : tx.type === 'SESSION_PARTICIPATION' ? (
                      <span className="text-cyan-400">₹{tx.amount} (Reserved)</span>
                    ) : (
                      <span className="text-emerald-400">+₹{tx.amount}</span>
                    )}
                  </div>
                  <div className="mt-1 flex justify-end">
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
