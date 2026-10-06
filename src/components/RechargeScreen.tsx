import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  QrCode,
  X,
  History
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { UpiDeposit } from '../types';

interface RechargeScreenProps {
  onBack: () => void;
  onSuccessDone: () => void;
}

export const RechargeScreen: React.FC<RechargeScreenProps> = ({ onBack, onSuccessDone }) => {
  const [amount, setAmount] = useState<string>('500');
  const [chips, setChips] = useState<number[]>([100, 250, 500, 1000, 2000, 5000, 10000]);
  const [minRecharge, setMinRecharge] = useState<number>(100);
  const [maxRecharge, setMaxRecharge] = useState<number>(100000);
  const [upiId, setUpiId] = useState<string>('9266428368-i638-2@ibl');
  const [payeeName, setPayeeName] = useState<string>('Vora Earning');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Submitted modal popup: 5 mins - 1 hour verification notification
  const [submittedPopup, setSubmittedPopup] = useState<{
    amount: number;
    utr: string;
  } | null>(null);

  // History view toggle
  const [showHistory, setShowHistory] = useState(false);
  const [myDeposits, setMyDeposits] = useState<UpiDeposit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Fetch dynamic system settings
    api.getSystemSettings().then((res) => {
      if (res && res.settings) {
        if (res.settings.minRechargeAmount) setMinRecharge(res.settings.minRechargeAmount);
        if (res.settings.maxRechargeAmount) setMaxRecharge(res.settings.maxRechargeAmount);
        if (res.settings.quickRechargeChips && res.settings.quickRechargeChips.length) {
          setChips(res.settings.quickRechargeChips);
        }
        if (res.settings.upiId) setUpiId(res.settings.upiId);
        if (res.settings.upiPayeeName) setPayeeName(res.settings.upiPayeeName);
      }
    }).catch(() => {});
  }, []);

  const loadHistory = () => {
    setLoadingHistory(true);
    api.getMyUpiDeposits()
      .then((res) => {
        setMyDeposits(res.deposits || []);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  };

  // Generate dynamic UPI Intent & QR String
  const currentNum = Math.max(1, Number(amount) || 100);
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${currentNum}&cu=INR&tn=Recharge`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiIntentUrl)}&margin=8`;

  const handleCopyUpi = () => {
    sound.playTap();
    navigator.clipboard.writeText(upiId).then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }).catch(() => {
      // Fallback
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    });
  };

  const handleOpenUpiApp = () => {
    sound.playTap();
    window.location.href = upiIntentUrl;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot size should be less than 5MB');
      return;
    }

    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num = Number(amount);
    if (isNaN(num) || num < minRecharge || num > maxRecharge) {
      setError(`Recharge amount must be between ₹${minRecharge} and ₹${maxRecharge}`);
      sound.playError();
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setError('Please enter a valid 12-digit UPI UTR / Transaction Reference Number');
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      sound.playTap();
      const res = await api.submitUpiDeposit(num, cleanUtr, screenshotBase64);

      if (res && res.success) {
        sound.playSuccess();
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
        } catch {}
        setSubmittedPopup({
          amount: num,
          utr: cleanUtr
        });
        setUtrNumber('');
        setScreenshotBase64('');
        setScreenshotName('');
      } else {
        throw new Error('Failed to submit recharge proof');
      }
    } catch (err: any) {
      sound.playError();
      setError(err.message || 'Error submitting payment proof. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full min-h-full flex flex-col p-4 bg-[#07090e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              sound.playTap();
              onBack();
            }}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-white">UPI QR Recharge</h2>
            <p className="text-[11px] text-slate-400">Scan & Pay via any UPI App</p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playTap();
            setShowHistory(!showHistory);
            if (!showHistory) loadHistory();
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            showHistory
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{showHistory ? 'Payment Form' : 'My Requests'}</span>
        </button>
      </div>

      {/* History View */}
      {showHistory ? (
        <div className="space-y-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recent UPI Recharge Requests
            </h3>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
              Loading your payment records...
            </div>
          ) : myDeposits.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No recharge requests found yet. Submit your first UPI payment proof!
            </div>
          ) : (
            myDeposits.map((dep) => (
              <div
                key={dep.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base font-extrabold text-white">
                      ₹{dep.amount.toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        dep.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : dep.status === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {dep.status === 'APPROVED' ? 'Approved' : dep.status === 'REJECTED' ? 'Rejected' : 'Under Review'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(dep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>UTR: {dep.utr}</span>
                  <span>{new Date(dep.createdAt).toLocaleDateString()}</span>
                </div>

                {dep.status === 'PENDING' && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-amber-400/90 pt-1 border-t border-slate-800/80">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Verifying within 5 minutes to 1 hour</span>
                  </div>
                )}

                {dep.status === 'APPROVED' && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 pt-1 border-t border-slate-800/80">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Credited to wallet balance</span>
                  </div>
                )}

                {dep.status === 'REJECTED' && (
                  <div className="text-[11px] text-rose-400 pt-1 border-t border-slate-800/80">
                    Reason: {dep.rejectionReason || 'Invalid UTR or screenshot mismatch'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Main Payment & Submission Form */
        <div className="space-y-4 overflow-y-auto pb-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Selection */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Recharge Amount
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Min: ₹{minRecharge} • Max: ₹{maxRecharge}
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
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

            {/* Quick Chips */}
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
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ₹{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code & UPI Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/30 text-center shadow-xl space-y-4">
            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <QrCode className="w-4 h-4" />
              <span>Scan QR with Any UPI App</span>
            </div>

            {/* QR Image Container */}
            <div className="w-56 h-56 mx-auto p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-slate-800">
              <img
                src={qrCodeUrl}
                alt="UPI Payment QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-medium">
                QR Code scan hote hi <span className="font-bold text-emerald-400 font-mono">₹{currentNum}</span> automatic fill ho jayega.
              </p>
              <p className="text-[11px] text-slate-500">
                PhonePe, Google Pay, Paytm, BHIM, Cred sabhi UPI apps supported hain.
              </p>
            </div>

            {/* UPI ID Copy Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="text-left font-mono truncate mr-2">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Official UPI VPA</span>
                <span className="font-bold text-white text-xs select-all">{upiId}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-all ${
                  copiedUpi
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Open UPI App Button */}
            <button
              type="button"
              onClick={handleOpenUpiApp}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center justify-center space-x-2 active:scale-98 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Pay Directly via UPI App (PhonePe / GPay)</span>
            </button>
          </div>

          {/* Form: UTR & Screenshot */}
          <form onSubmit={handleSubmitDeposit} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-white border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Payment Proof Submission</span>
            </div>

            {/* UTR Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-300">
                12-Digit UPI Reference / UTR Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                placeholder="e.g. 428912345678"
                maxLength={20}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-500">
                Payment karne ke baad apne UPI app se 12-digit UTR No. copy karke yahan daalein.
              </p>
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-300">
                Payment Screenshot (Photo)
              </label>
              
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {screenshotBase64 ? (
                  <div className="flex items-center space-x-3 w-full">
                    <img
                      src={screenshotBase64}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                    />
                    <div className="flex-1 truncate text-left">
                      <p className="text-xs font-semibold text-emerald-400 truncate">{screenshotName || 'Screenshot selected'}</p>
                      <p className="text-[10px] text-slate-400">Click to change photo</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setScreenshotBase64('');
                        setScreenshotName('');
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-500 mb-1" />
                    <span className="text-xs text-slate-300 font-semibold">Upload Payment Screenshot</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, JPEG (Max 5MB)</span>
                  </>
                )}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 active:scale-98 transition-all disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Payment for Verification</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Verification Notice Popup Modal (5 Minutes - 1 Hour) */}
      {submittedPopup && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 text-center shadow-2xl animate-scaleUp space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">Recharge Submitted!</h3>
              <p className="text-xs text-emerald-400 font-semibold mt-1">Payment Proof Received</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-left space-y-2.5">
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                ⏱️ <span className="font-bold text-white">5 Minutes se 1 Hour</span> ke andar aapka payment check karke wallet me balance automatic add ho jayega.
              </p>

              <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recharge Amount:</span>
                  <span className="font-bold text-emerald-400">₹{submittedPopup.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">UTR / Ref:</span>
                  <span className="text-slate-300">{submittedPopup.utr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-amber-400 font-bold uppercase">Pending Verification</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSubmittedPopup(null);
                  onSuccessDone();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-transform"
              >
                Return to Home
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSubmittedPopup(null);
                  setShowHistory(true);
                  loadHistory();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs hover:text-white"
              >
                View My Recharge Requests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
