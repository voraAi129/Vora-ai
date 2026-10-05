import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { RazorpayModal } from './RazorpayModal';

interface RechargeScreenProps {
  onBack: () => void;
  onSuccessDone: () => void;
}

export const RechargeScreen: React.FC<RechargeScreenProps> = ({ onBack, onSuccessDone }) => {
  const [amount, setAmount] = useState<string>('500');
  const [chips, setChips] = useState<number[]>([100, 250, 500, 1000, 2000, 5000, 10000]);
  const [minRecharge, setMinRecharge] = useState<number>(100);
  const [maxRecharge, setMaxRecharge] = useState<number>(10000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Razorpay order
  const [activeOrder, setActiveOrder] = useState<{
    orderId: string;
    amount: number;
    userName: string;
    userMobile: string;
    keyId: string;
  } | null>(null);

  // Success / Pending outcome state
  const [successInfo, setSuccessInfo] = useState<{
    txId: string;
    amount: number;
    newBalance: number;
  } | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  useEffect(() => {
    // Fetch system settings for dynamic limits and chips
    api.getSystemSettings().then((res) => {
      if (res.settings) {
        if (res.settings.minRechargeAmount) setMinRecharge(res.settings.minRechargeAmount);
        if (res.settings.maxRechargeAmount) setMaxRecharge(res.settings.maxRechargeAmount);
        if (res.settings.quickRechargeChips && res.settings.quickRechargeChips.length) {
          setChips(res.settings.quickRechargeChips);
        }
      }
    }).catch(() => {});
  }, []);

  const handleInitiateRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);
    setPendingNotice(null);

    const num = Number(amount);
    if (isNaN(num) || num < minRecharge || num > maxRecharge) {
      setError(`Recharge amount must be between ₹${minRecharge} and ₹${maxRecharge}`);
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      sound.playTap();
      const order = await api.createRechargeOrder(num);
      setActiveOrder({
        orderId: order.orderId,
        amount: order.amount,
        userName: order.user?.name || 'Vora User',
        userMobile: order.user?.mobile || '9999988888',
        keyId: order.keyId || 'rzp_test_voraEarning2026'
      });
    } catch (err: any) {
      sound.playError();
      setError(err.message || 'Failed to create payment order');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpaySuccess = async (paymentId: string, signature: string) => {
    if (!activeOrder) return;
    try {
      setLoading(true);
      const res = await api.verifyPayment({
        razorpay_order_id: activeOrder.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      });

      setActiveOrder(null);
      setSuccessInfo({
        txId: res.transactionId || 'tx_' + Date.now(),
        amount: activeOrder.amount,
        newBalance: res.walletBalance
      });
      sound.playSuccess();
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
      } catch {}
    } catch (err: any) {
      sound.playError();
      setError(err.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayFailure = async (reason: string) => {
    if (!activeOrder) return;
    if (reason === 'PENDING') {
      try {
        await api.verifyPayment({
          razorpay_order_id: activeOrder.orderId,
          statusOverride: 'PENDING'
        });
        setActiveOrder(null);
        setPendingNotice('Payment is being verified with your bank. Balance will reflect upon confirmation.');
      } catch {}
    } else {
      setActiveOrder(null);
      setError(reason);
      sound.playError();
    }
  };

  return (
    <div className="flex-1 w-full min-h-full flex flex-col p-4 bg-[#07090e] text-white">
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
          <h2 className="text-base font-bold">Recharge Balance</h2>
          <p className="text-[11px] text-slate-400">Instant UPI & NetBanking Deposit</p>
        </div>
      </div>

      {/* Success View */}
      {successInfo && (
        <div className="my-auto p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/40 text-center animate-scaleUp shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-white">Recharge Successful</h3>
          <p className="text-xs text-slate-400 mt-1">₹{successInfo.amount} credited to your ledger</p>

          <div className="my-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Transaction ID:</span>
              <span className="font-mono text-slate-200">{successInfo.txId.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gateway:</span>
              <span className="font-mono text-blue-400">Razorpay 256-Bit</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400 font-semibold">New Available Balance:</span>
              <span className="font-mono font-bold text-emerald-400">
                ₹{successInfo.newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onSuccessDone();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20"
          >
            Return to Home
          </button>
        </div>
      )}

      {/* Pending Notice View */}
      {pendingNotice && (
        <div className="my-auto p-6 rounded-2xl bg-slate-900 border border-amber-500/40 text-center animate-scaleUp">
          <Clock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Payment Under Verification</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">{pendingNotice}</p>
          <button
            onClick={() => {
              sound.playTap();
              onSuccessDone();
            }}
            className="mt-5 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Okay, Understood
          </button>
        </div>
      )}

      {/* Main Recharge Form */}
      {!successInfo && !pendingNotice && (
        <form onSubmit={handleInitiateRecharge} className="space-y-4 my-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Input */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Enter Recharge Amount
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">₹</span>
              <input
                type="number"
                min={minRecharge}
                max={maxRecharge}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="w-full text-2xl font-mono font-bold bg-transparent border-none text-white focus:outline-none"
                required
              />
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Min: ₹{minRecharge.toLocaleString('en-IN')} • Max: ₹{maxRecharge.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Quick Amount Chips */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Quick Select Amount
            </span>
            <div className="grid grid-cols-4 gap-2">
              {chips.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setAmount(val.toString());
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-mono font-bold border transition-all ${
                    amount === val.toString()
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ₹{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Partner Banner */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">Authorized Gateway</span>
            </div>
            <span className="font-bold text-blue-400 font-mono">RAZORPAY</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 active:scale-98 transition-all disabled:opacity-60"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <>
                <ArrowDownLeft className="w-4 h-4" />
                <span>Proceed to Pay ₹{Number(amount || 0).toLocaleString('en-IN')}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Razorpay Gateway Modal */}
      {activeOrder && (
        <RazorpayModal
          orderId={activeOrder.orderId}
          amount={activeOrder.amount}
          userName={activeOrder.userName}
          userMobile={activeOrder.userMobile}
          keyId={activeOrder.keyId}
          onSuccess={handleRazorpaySuccess}
          onFailure={handleRazorpayFailure}
          onClose={() => setActiveOrder(null)}
        />
      )}
    </div>
  );
};
