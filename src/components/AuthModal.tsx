import React, { useState } from 'react';
import {
  Lock,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
  ArrowRight,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { User } from '../types';

interface AuthModalProps {
  onAuthSuccess: (user: User, token: string) => void;
  onOpenLegal: (tab: 'terms' | 'privacy') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess, onOpenLegal }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // OTP Verification state
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otpHint, setOtpHint] = useState<string | null>(null);

  // Forgot Password modal
  const [isForgotModal, setIsForgotModal] = useState(false);
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');

  // Loading & error feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!/^\d{10}$/.test(loginMobile.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      sound.playError();
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password');
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      const res = await api.login(loginMobile.trim(), loginPassword);
      if (!res || !res.user || !res.token) {
        throw new Error('Invalid mobile number or password');
      }
      sound.playSuccess();
      onAuthSuccess(res.user, res.token);
    } catch (err: any) {
      sound.playError();
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of Register: Validate & Send OTP
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (regName.trim().length < 2) {
      setError('Please enter your full legal name');
      sound.playError();
      return;
    }
    if (!/^\d{10}$/.test(regMobile.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      sound.playError();
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      sound.playError();
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      sound.playError();
      return;
    }
    if (!termsAccepted) {
      setError('Please agree to the Terms of Service & Privacy Policy');
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      sound.playTap();
      const otpRes = await api.sendOtp(regMobile.trim(), 'register');
      setOtpStep(true);
      setOtpCountdown(60);
      setSuccessMsg(otpRes.message || `OTP sent to +91 ${regMobile.trim().slice(0, 3)}****${regMobile.trim().slice(7)}`);

      // Start countdown
      const interval = setInterval(() => {
        setOtpCountdown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      sound.playError();
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of Register: Verify OTP & Complete Account Creation
  const handleVerifyOtpAndRegister = async () => {
    setError(null);
    if (!otpValue || otpValue.length < 4) {
      setError('Please enter the 6-digit OTP received');
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      sound.playTap();
      await api.verifyOtp(regMobile.trim(), otpValue.trim());

      // Finalize registration on backend
      const res = await api.register({
        name: regName.trim(),
        mobile: regMobile.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
        otp: otpValue.trim(),
        termsAccepted
      });

      if (!res || !res.user || !res.token) {
        throw new Error('Registration failed. Please try again.');
      }

      sound.playSuccess();
      onAuthSuccess(res.user, res.token);
    } catch (err: any) {
      sound.playError();
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password flow
  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(forgotMobile.trim())) {
      setError('Please enter your 10-digit registered mobile number');
      sound.playError();
      return;
    }
    try {
      setLoading(true);
      const res = await api.sendOtp(forgotMobile.trim(), 'forgot_password');
      setForgotStep('reset');
      setSuccessMsg(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp) {
      setError('Please enter OTP');
      return;
    }
    if (forgotNewPass.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      await api.forgotPassword(forgotMobile.trim(), forgotOtp.trim(), forgotNewPass);
      sound.playSuccess();
      setSuccessMsg('Password reset successfully! Please login with your new password.');
      setIsForgotModal(false);
      setTab('login');
      setLoginMobile(forgotMobile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full min-h-full flex flex-col justify-between p-6 bg-[#07090e] text-white">
      {/* Top Brand Banner */}
      <div className="pt-4 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-amber-400 p-[2px] shadow-lg shadow-emerald-500/20 mb-3">
          <div className="w-full h-full bg-[#0c1017] rounded-[14px] flex items-center justify-center">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans']">
          VORA <span className="text-emerald-400">EARNING</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Compliant Financial Rewards & Ledger Gateway
        </p>

        {/* Tab Switcher (ONLY LOGIN and REGISTER — strictly NO "Admin Login" text on public UI) */}
        <div className="w-full max-w-sm grid grid-cols-2 p-1 mt-6 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setTab('login');
              setError(null);
              setOtpStep(false);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setTab('register');
              setError(null);
              setOtpStep(false);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            REGISTER
          </button>
        </div>
      </div>

      {/* Form Section */}
      <div className="w-full max-w-sm mx-auto my-4 flex-1 flex flex-col justify-center">
        {/* Error / Success Feedback Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-xs text-rose-300 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-2 text-xs text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================== LOGIN FORM ===================== */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Mobile Number
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center space-x-1.5 text-slate-400 border-r border-slate-700 pr-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={loginMobile}
                  onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-3 pl-20 pr-4 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setIsForgotModal(true);
                    setForgotStep('request');
                    setForgotMobile(loginMobile);
                    setError(null);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400">
                  <Lock className="w-4 h-4 text-emerald-400" />
                </div>
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>


          </form>
        )}

        {/* ===================== REGISTER FORM ===================== */}
        {tab === 'register' && !otpStep && (
          <form onSubmit={handleInitiateRegister} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400">
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Mobile Number
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center space-x-1.5 text-slate-400 border-r border-slate-700 pr-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-2.5 pl-20 pr-4 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400">
                  <Lock className="w-4 h-4 text-emerald-400" />
                </div>
                <input
                  type={showRegPass ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-2.5 pl-11 pr-11 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPass(!showRegPass)}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                </div>
                <input
                  type={showRegPass ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Terms & Privacy checkbox */}
            <div className="flex items-start space-x-2 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-400 leading-tight">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="text-emerald-400 underline hover:text-emerald-300"
                >
                  Terms & Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="text-emerald-400 underline hover:text-emerald-300"
                >
                  Privacy Policy
                </button>
                . No misleading profit claims.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>Verify Mobile with OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ===================== OTP VERIFICATION STEP ===================== */}
        {tab === 'register' && otpStep && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Enter 6-digit OTP sent to:</span>
              <span className="text-sm font-mono font-bold text-emerald-400">+91 {regMobile}</span>
              <p className="text-[11px] text-slate-500 mt-2">Check your SMS inbox. OTP valid for 10 minutes.</p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                placeholder="• • • • • •"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 rounded-xl bg-slate-900 border border-emerald-500/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 px-1">
              <span>{otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Did not receive code?'}</span>
              <button
                type="button"
                disabled={otpCountdown > 0 || loading}
                onClick={async () => {
                  try {
                    sound.playTap();
                    const res = await api.sendOtp(regMobile, 'register');
                    setOtpCountdown(60);
                    setSuccessMsg('OTP resent successfully. Check your SMS.');
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
                className="text-emerald-400 font-semibold disabled:opacity-40 disabled:hover:text-emerald-400 hover:text-emerald-300"
              >
                Resend OTP
              </button>
            </div>

            <button
              type="button"
              onClick={handleVerifyOtpAndRegister}
              disabled={loading || otpValue.length < 4}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <span>Confirm & Create Account</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setOtpStep(false);
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 mt-2"
            >
              ← Edit Registration Details
            </button>
          </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      {isForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl animate-scaleUp">
            <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your registered mobile number to receive a verification OTP.
            </p>

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotRequestOtp} className="space-y-3">
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={forgotMobile}
                  onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm font-mono text-white"
                  required
                />
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModal(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-slate-950"
                  >
                    Send OTP
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotResetPassword} className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-mono text-white"
                  required
                />
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white"
                  required
                />
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModal(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-slate-950"
                  >
                    Reset & Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-slate-600 leading-tight">
          By continuing you confirm you are 18+ years old. Legitimate rewards engine strictly governed by platform terms.
        </p>
      </div>
    </div>
  );
};
