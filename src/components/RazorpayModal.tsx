import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Smartphone,
  Shield,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock
} from 'lucide-react';
import { sound } from '../services/audio';

interface RazorpayModalProps {
  orderId: string;
  amount: number;
  userName: string;
  userMobile: string;
  onSuccess: (paymentId: string, signature: string) => void;
  onFailure: (reason: string) => void;
  onClose: () => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  orderId,
  amount,
  userName,
  userMobile,
  onSuccess,
  onFailure,
  onClose
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [processing, setProcessing] = useState(false);
  const [upiId, setUpiId] = useState(`${userMobile}@upi`);
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8910');

  const handlePay = (simulatedStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'SUCCESS') => {
    sound.playTap();
    setProcessing(true);

    setTimeout(() => {
      setProcessing(false);
      if (simulatedStatus === 'SUCCESS') {
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        // Simulated signature (verified on backend)
        const signature = `sig_${Date.now()}_sha256_${Math.random().toString(36).substring(2, 10)}`;
        sound.playSuccess();
        onSuccess(paymentId, signature);
      } else if (simulatedStatus === 'PENDING') {
        onFailure('PENDING');
      } else {
        sound.playError();
        onFailure('Payment declined by issuing bank');
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div className="w-full max-w-sm bg-[#0c1322] border-t sm:border border-slate-700/80 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl animate-slideUp text-white">
        {/* Header with Razorpay Branding */}
        <div className="bg-[#0b1933] p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
              <span className="font-extrabold text-white text-xs font-mono">R</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold tracking-tight text-white">Razorpay Secure Checkout</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">256-BIT</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Order: {orderId.slice(0, 18)}...</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 flex items-center justify-between border-b border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Paying To</span>
            <p className="text-xs font-bold text-white">VORA EARNING TECHNOLOGIES</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Amount</span>
            <p className="text-xl font-bold font-mono text-emerald-400">₹{amount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="p-4 space-y-3">
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
            Select Payment Mode
          </span>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setSelectedMethod('upi');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center text-xs transition-all ${
                selectedMethod === 'upi'
                  ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400'
              }`}
            >
              <Smartphone className="w-4 h-4 mb-1 text-emerald-400" />
              <span>UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setSelectedMethod('card');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center text-xs transition-all ${
                selectedMethod === 'card'
                  ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400'
              }`}
            >
              <CreditCard className="w-4 h-4 mb-1 text-cyan-400" />
              <span>Cards</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setSelectedMethod('netbanking');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center text-xs transition-all ${
                selectedMethod === 'netbanking'
                  ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400'
              }`}
            >
              <QrCode className="w-4 h-4 mb-1 text-amber-400" />
              <span>NetBanking</span>
            </button>
          </div>

          {/* Method Details */}
          {selectedMethod === 'upi' && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium">UPI VPA Handle:</span>
                <span className="font-mono text-emerald-400 font-bold">{upiId}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Google Pay, PhonePe, Paytm, and BHIM UPI verified gateway request.
              </p>
            </div>
          )}

          {selectedMethod === 'card' && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium">Card:</span>
                <span className="font-mono text-cyan-400">{cardNumber}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Visa, MasterCard, RuPay with 3D Secure OTP verification.
              </p>
            </div>
          )}

          {selectedMethod === 'netbanking' && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              Direct settlement supported for SBI, HDFC, ICICI, Axis, and Kotak.
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => handlePay('SUCCESS')}
            disabled={processing}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-60"
          >
            {processing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ₹{amount.toLocaleString('en-IN')} via Razorpay</span>
              </>
            )}
          </button>

          {/* Diagnostic simulation triggers for payment testing */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Gateway Testing Simulator:</span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handlePay('PENDING')}
                className="text-amber-400 hover:underline"
              >
                [Simulate Pending]
              </button>
              <button
                type="button"
                onClick={() => handlePay('FAILED')}
                className="text-rose-400 hover:underline"
              >
                [Simulate Failed]
              </button>
            </div>
          </div>
        </div>

        {/* Razorpay Footer */}
        <div className="p-3 bg-slate-950 text-center text-[10px] text-slate-500 flex items-center justify-center space-x-1 border-t border-slate-800">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>Secured by Razorpay Payments India Pvt Ltd</span>
        </div>
      </div>
    </div>
  );
};
