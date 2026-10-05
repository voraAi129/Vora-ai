import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  HelpCircle,
  History,
  Info,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { User, WalletSummary, WithdrawalRecord } from '../types';

interface WithdrawalScreenProps {
  user: User;
  onBack: () => void;
  onSuccess: () => void;
}

const QUICK_WITHDRAWAL_AMOUNTS = [200, 500, 1000, 2000, 5000];

export const WithdrawalScreen: React.FC<WithdrawalScreenProps> = ({ user, onBack, onSuccess }) => {
  const [tab, setTab] = useState<'request' | 'history'>('request');
  const [mode, setMode] = useState<'bank' | 'upi'>(
    user.bankDetails?.upiId && !user.bankDetails?.accountNumber ? 'upi' : 'bank'
  );

  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [minWithdrawal, setMinWithdrawal] = useState<number>(200);
  const [maxWithdrawal, setMaxWithdrawal] = useState<number>(25000);
  const [feePercentage, setFeePercentage] = useState<number>(0);

  // Form fields prefilled from user bank details
  const [amount, setAmount] = useState<string>('500');
  const [accountHolderName, setAccountHolderName] = useState<string>(
    user.bankDetails?.accountHolderName || user.name || ''
  );
  const [accountNumber, setAccountNumber] = useState<string>(
    user.bankDetails?.accountNumber || ''
  );
  const [ifsc, setIfsc] = useState<string>(user.bankDetails?.ifsc || '');
  const [upiId, setUpiId] = useState<string>(user.bankDetails?.upiId || '');

  // History list
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);

  // Confirmation modal state
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRecord, setSuccessRecord] = useState<WithdrawalRecord | null>(null);

  // Load balance, limits, and existing bank details
  useEffect(() => {
    Promise.all([
      api.getWallet(),
      api.getSystemSettings(),
      api.getWithdrawalHistory(),
      api.getProfile().catch(() => null)
    ])
      .then(([wRes, sRes, hRes, pRes]) => {
        setAvailableBalance(wRes.availableBalance);
        if (sRes.settings) {
          if (sRes.settings.minWithdrawalAmount) setMinWithdrawal(sRes.settings.minWithdrawalAmount);
          if (sRes.settings.maxWithdrawalAmount) setMaxWithdrawal(sRes.settings.maxWithdrawalAmount);
          if (sRes.settings.withdrawalFeePercentage !== undefined)
            setFeePercentage(sRes.settings.withdrawalFeePercentage);
        }
        setWithdrawals(hRes.withdrawals);

        // Preload fresh bank details from profile if available
        if (pRes?.user?.bankDetails) {
          const bd = pRes.user.bankDetails;
          if (bd.accountHolderName) setAccountHolderName(bd.accountHolderName);
          if (bd.accountNumber) setAccountNumber(bd.accountNumber);
          if (bd.ifsc) setIfsc(bd.ifsc);
          if (bd.upiId) setUpiId(bd.upiId);
          if (bd.upiId && !bd.accountNumber) setMode('upi');
        }
      })
      .catch(() => {});
  }, []);

  // Calculated numbers
  const numAmount = Number(amount || 0);
  const fee = Math.round((numAmount * feePercentage) / 100);
  const netAmount = Math.max(0, numAmount - fee);

  const pendingWithdrawalsCount = withdrawals.filter(
    (w) => w.status === 'REQUESTED' || w.status === 'PROCESSING'
  ).length;

  const handleSubmitRequest = async () => {
    setError(null);

    if (isNaN(numAmount) || numAmount < minWithdrawal || numAmount > maxWithdrawal) {
      setError(`Withdrawal amount must be between ₹${minWithdrawal.toLocaleString('en-IN')} and ₹${maxWithdrawal.toLocaleString('en-IN')}`);
      sound.playError();
      return;
    }

    if (numAmount > availableBalance) {
      setError(`Insufficient available balance. You have ₹${availableBalance.toLocaleString('en-IN')}, requested ₹${numAmount.toLocaleString('en-IN')}`);
      sound.playError();
      return;
    }

    if (!accountHolderName.trim()) {
      setError('Account holder name is required');
      sound.playError();
      return;
    }

    if (mode === 'bank') {
      if (!accountNumber.trim() || accountNumber.length < 8) {
        setError('Please enter a valid bank account number (minimum 8 digits)');
        sound.playError();
        return;
      }
      if (!ifsc.trim() || ifsc.length < 6) {
        setError('Please enter a valid IFSC code (e.g. HDFC0001234)');
        sound.playError();
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. name@okhdfcbank)');
        sound.playError();
        return;
      }
    }

    sound.playTap();
    setIsConfirming(true);
  };

  const handleConfirmWithdrawal = async () => {
    try {
      setLoading(true);
      setError(null);
      sound.playTap();

      const res = await api.createWithdrawal({
        amount: numAmount,
        accountHolderName: accountHolderName.trim(),
        bankAccountNumber: mode === 'bank' ? accountNumber.trim() : undefined,
        ifsc: mode === 'bank' ? ifsc.trim().toUpperCase() : undefined,
        upiId: mode === 'upi' ? upiId.trim() : undefined
      });

      setIsConfirming(false);
      setSuccessRecord(res.withdrawal);
      setAvailableBalance(res.walletBalance);
      sound.playSuccess();

      // Refresh history
      const hRes = await api.getWithdrawalHistory();
      setWithdrawals(hRes.withdrawals);
    } catch (err: any) {
      sound.playError();
      setIsConfirming(false);
      setError(err.message || 'Withdrawal request failed. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: WithdrawalRecord['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Completed
          </span>
        );
      case 'PROCESSING':
      case 'UNDER_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Processing
          </span>
        );
      case 'REQUESTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Requested
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 w-full min-h-full flex flex-col p-4 bg-[#07090e] text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
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
            <h2 className="text-base font-bold">Withdraw Funds</h2>
            <p className="text-[11px] text-slate-400">Secure Direct Bank & UPI Payout</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-0.5 rounded-lg bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              sound.playTap();
              setTab('request');
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              tab === 'request' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            Request
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setTab('history');
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center space-x-1 ${
              tab === 'history' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            <span>History</span>
            {pendingWithdrawalsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Available Balance Pill */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 mb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center space-x-1">
            <Wallet className="w-3 h-3 text-emerald-400" />
            <span>Available for Payout</span>
          </span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-right text-[10px] text-slate-500">
          <span>Daily Limit: ₹{maxWithdrawal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Active Pending Request Notification */}
      {pendingWithdrawalsCount > 0 && tab === 'request' && (
        <div
          onClick={() => {
            sound.playTap();
            setTab('history');
          }}
          className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-all text-xs"
        >
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <p className="font-semibold text-amber-300">
                {pendingWithdrawalsCount} Payout Request{pendingWithdrawalsCount > 1 ? 's' : ''} in Review
              </p>
              <p className="text-[10px] text-amber-400/80">Click to view status in Payout History</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </div>
      )}

      {/* TAB 1: WITHDRAWAL REQUEST FORM */}
      {tab === 'request' && (
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          {successRecord ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/30 text-center my-auto animate-scaleUp space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-white">Withdrawal Requested!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your request for ₹{successRecord.amount} has been logged and submitted for processing.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reference ID:</span>
                  <span className="text-slate-200">{successRecord.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Payout:</span>
                  <span className="text-emerald-400 font-bold">₹{successRecord.netAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-amber-400 font-bold">UNDER REVIEW</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    sound.playTap();
                    setSuccessRecord(null);
                    setTab('history');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                >
                  <History className="w-4 h-4" />
                  <span>Track in Payout History</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      sound.playTap();
                      setSuccessRecord(null);
                    }}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
                  >
                    New Request
                  </button>
                  <button
                    onClick={() => {
                      sound.playTap();
                      onSuccess();
                    }}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-emerald-500/30 transition-colors"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start space-x-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Amount Input */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Withdrawal Amount (₹)
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold font-mono text-emerald-400">₹</span>
                  <input
                    type="number"
                    min={minWithdrawal}
                    max={maxWithdrawal}
                    step={1}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    placeholder="500"
                    className="w-full text-2xl font-mono font-bold bg-transparent border-none text-white focus:outline-none"
                    required
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex space-x-1.5 pt-1">
                  {QUICK_WITHDRAWAL_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setAmount(amt.toString());
                        setError(null);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                        Number(amount) === amt
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      const maxVal = Math.min(maxWithdrawal, Math.floor(availableBalance));
                      setAmount(maxVal.toString());
                      setError(null);
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-cyan-400 border border-slate-700 hover:border-cyan-400"
                  >
                    Max
                  </button>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>Min: ₹{minWithdrawal.toLocaleString('en-IN')}</span>
                  <span>Max: ₹{maxWithdrawal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payout Channel Tabs */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Payout Method
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setMode('bank');
                      setError(null);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                      mode === 'bank'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Bank Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setMode('upi');
                      setError(null);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                      mode === 'upi'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI ID</span>
                  </button>
                </div>
              </div>

              {/* Form inputs */}
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name as in Bank"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                {mode === 'bank' ? (
                  <>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter full bank account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC0001234"
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white uppercase focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                      UPI ID Handle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. yourname@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Fee & Net Amount Breakdown */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Withdrawal:</span>
                  <span className="font-mono text-white font-semibold">₹{numAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Processing Fee ({feePercentage}%):</span>
                  <span className="font-mono text-slate-300">₹{fee}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-white font-bold">
                  <span>Net Payout Amount:</span>
                  <span className="font-mono text-emerald-400 text-sm">₹{netAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmitRequest}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 active:scale-95 transition-all"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Confirm & Request Payout</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WITHDRAWAL HISTORY */}
      {tab === 'history' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {withdrawals.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No withdrawal requests yet</p>
            </div>
          ) : (
            withdrawals.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-white">₹{w.amount}</span>
                    {getStatusBadge(w.status)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(w.requestedAt).toLocaleDateString()} at{' '}
                    {new Date(w.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Destination: {w.upiId || w.bankAccountNumber}
                  </p>
                  {w.adminNote && (
                    <p className="text-[10px] text-amber-400/90 mt-0.5">Note: {w.adminNote}</p>
                  )}
                  {w.payoutReferenceId && (
                    <p className="text-[9px] text-emerald-400 font-mono">Ref: {w.payoutReferenceId}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Net Payout</span>
                  <span className="font-mono font-semibold text-emerald-400 text-xs">
                    ₹{w.netAmount}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirming && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl animate-scaleUp">
            <h3 className="text-sm font-bold text-white mb-2">Confirm Payout Request</h3>
            <p className="text-xs text-slate-300 mb-4">
              Are you sure you want to withdraw ₹{numAmount} to the specified account?
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Account Holder:</span>
                <span className="font-bold text-white">{accountHolderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Destination:</span>
                <span className="font-mono text-cyan-300">
                  {mode === 'bank'
                    ? `••••${accountNumber.slice(-4)} (${ifsc})`
                    : upiId}
                </span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                <span className="text-slate-400">Net Credited:</span>
                <span className="text-emerald-400 font-mono">₹{netAmount}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdrawal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 flex items-center justify-center space-x-1 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
              >
                {loading ? (
                  <Clock className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <span>Confirm Payout</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
