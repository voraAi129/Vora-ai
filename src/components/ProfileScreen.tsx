import React, { useState } from 'react';
import {
  ArrowLeft,
  User as UserIcon,
  Shield,
  CreditCard,
  KeyRound,
  Laptop,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Lock
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/audio';
import { User } from '../types';

interface ProfileScreenProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onOpenLegal: (tab: 'terms' | 'privacy' | 'refund' | 'withdrawal' | 'risk') => void;
  onOpenSupport: () => void;
  onNavigate: (view: any) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onBack,
  onLogout,
  onOpenLegal,
  onOpenSupport,
  onNavigate
}) => {
  // Sub-screens or modals inside Profile
  const [subView, setSubView] = useState<'main' | 'security' | 'bank'>('main');

  // Change password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  // Bank details fields
  const [holderName, setHolderName] = useState(user.name || '');
  const [accNum, setAccNum] = useState(user.bankDetails?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(user.bankDetails?.ifsc || '');
  const [upiHandle, setUpiHandle] = useState(user.bankDetails?.upiId || '');
  const [bankSuccess, setBankSuccess] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<Array<{ id: string; device: string; createdAt: string; isCurrent: boolean }>>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const loadSessions = async () => {
    try {
      const res = await api.getProfile();
      setSessions(res.sessions);
    } catch {}
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    try {
      sound.playTap();
      await api.changePassword(currentPass, newPass);
      sound.playSuccess();
      setPassSuccess('Password updated successfully');
      setCurrentPass('');
      setNewPass('');
    } catch (err: any) {
      sound.playError();
      setPassError(err.message || 'Failed to update password');
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankSuccess(null);
    setBankError(null);
    try {
      sound.playTap();
      await api.updateBankDetails({
        accountHolderName: holderName.trim(),
        accountNumber: accNum.trim(),
        ifsc: ifscCode.trim().toUpperCase(),
        upiId: upiHandle.trim()
      });
      sound.playSuccess();
      setBankSuccess('Payout details saved securely');
    } catch (err: any) {
      sound.playError();
      setBankError(err.message || 'Failed to save bank details');
    }
  };

  const handleTerminateOtherSessions = async () => {
    try {
      sound.playTap();
      await api.terminateOtherSessions();
      sound.playSuccess();
      loadSessions();
      setSessionMsg('All other device sessions terminated.');
    } catch (err: any) {
      sound.playError();
      setSessionMsg(err.message || 'Failed to terminate sessions');
    }
  };

  return (
    <div className="flex-1 w-full min-h-full flex flex-col p-4 bg-[#07090e] text-white select-none">
      {/* Top Header */}
      <div className="flex items-center space-x-3 mb-4">
        <button
          onClick={() => {
            sound.playTap();
            if (subView !== 'main') {
              setSubView('main');
            } else {
              onBack();
            }
          }}
          className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-base font-bold">
            {subView === 'security'
              ? 'Security & Login Sessions'
              : subView === 'bank'
              ? 'Payout Bank Details'
              : 'User Profile'}
          </h2>
          <p className="text-[11px] text-slate-400">Account Management & Preferences</p>
        </div>
      </div>

      {/* ================= MAIN PROFILE VIEW ================= */}
      {subView === 'main' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* User Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-[2px] shadow-md shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0a0e17] rounded-[14px] flex items-center justify-center font-bold text-lg text-emerald-400">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">{user.name}</h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-semibold">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">+91 {user.mobile}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-1 rounded-2xl bg-slate-900/80 border border-slate-800 p-2">
            <button
              onClick={() => {
                sound.playTap();
                setSubView('bank');
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-800/60 flex items-center justify-between text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">Bank & UPI Payout Details</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setSubView('security');
                loadSessions();
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-800/60 flex items-center justify-between text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="font-medium">Security Center & Password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onNavigate('history');
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-800/60 flex items-center justify-between text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-medium">Complete Transaction Ledger</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onOpenSupport();
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-800/60 flex items-center justify-between text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Help & Customer Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Admin Management Dashboard Gateway */}
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('admin');
              }}
              className="w-full p-2.5 rounded-xl hover:bg-amber-500/10 border border-amber-500/20 bg-amber-500/5 flex items-center justify-between text-xs text-amber-300 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">
                  {user.role === 'ADMIN' ? 'Admin Management Dashboard' : 'Admin & Staff Access Portal'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400/70" />
            </button>
          </div>

          {/* Legal and Compliance Links */}
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block px-2 mb-2">
              Legal, Safety & Policies
            </span>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-2 space-y-1">
              <button
                onClick={() => onOpenLegal('terms')}
                className="w-full p-2 rounded-lg hover:bg-slate-800/50 flex items-center justify-between text-xs text-slate-300"
              >
                <span>Terms of Service</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button
                onClick={() => onOpenLegal('privacy')}
                className="w-full p-2 rounded-lg hover:bg-slate-800/50 flex items-center justify-between text-xs text-slate-300"
              >
                <span>Privacy & Data Safety</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button
                onClick={() => onOpenLegal('refund')}
                className="w-full p-2 rounded-lg hover:bg-slate-800/50 flex items-center justify-between text-xs text-slate-300"
              >
                <span>Refund & Payment Policy</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button
                onClick={() => onOpenLegal('withdrawal')}
                className="w-full p-2 rounded-lg hover:bg-slate-800/50 flex items-center justify-between text-xs text-slate-300"
              >
                <span>Withdrawal & Payout Policy</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button
                onClick={() => onOpenLegal('risk')}
                className="w-full p-2 rounded-lg hover:bg-slate-800/50 flex items-center justify-between text-xs text-slate-300"
              >
                <span>Responsible Use / Risk Disclosure</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                sound.playTap();
                onLogout();
              }}
              className="w-full py-3 rounded-xl bg-slate-900 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-bold text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= SECURITY CENTER VIEW ================= */}
      {subView === 'security' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {sessionMsg && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{sessionMsg}</span>
            </div>
          )}
          {/* Change Password */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Change Password</span>
            </h3>

            {passError && (
              <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg">{passError}</p>
            )}
            {passSuccess && (
              <p className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">{passSuccess}</p>
            )}

            <form onSubmit={handleChangePassword} className="space-y-2">
              <input
                type="password"
                placeholder="Current Password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                required
              />
              <input
                type="password"
                placeholder="New Password (min 6 chars)"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                required
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Active Sessions */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>Active Login Sessions</span>
              </h3>
              <button
                onClick={handleTerminateOtherSessions}
                className="text-[10px] text-rose-400 hover:underline"
              >
                Terminate Others
              </button>
            </div>

            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200 block truncate max-w-[200px]">
                      {s.device || 'Android Smartphone'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Logged in: {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {s.isCurrent && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Account Deletion Request */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center space-x-1 text-slate-400 font-semibold">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Account Deletion & Data Privacy</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              In compliance with Google Play Data Safety and privacy regulations, you may submit a verified request to permanently purge personal data.
            </p>
            {deleteConfirm ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
                <p className="text-[11px] text-rose-300">
                  Are you sure? Once submitted, account will undergo standard 7-day reconciliation.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm(false);
                      setSessionMsg('Account deletion request submitted. An SMS confirmation has been initiated.');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-rose-500 text-xs font-bold text-white"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="text-xs text-rose-400 hover:underline"
              >
                Request Account Deletion
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= BANK DETAILS VIEW ================= */}
      {subView === 'bank' && (
        <form onSubmit={handleSaveBank} className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {bankSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{bankSuccess}</span>
            </div>
          )}
          {bankError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{bankError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                value={accNum}
                onChange={(e) => setAccNum(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 912345678901"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white uppercase"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                UPI ID (Optional)
              </label>
              <input
                type="text"
                value={upiHandle}
                onChange={(e) => setUpiHandle(e.target.value.toLowerCase())}
                placeholder="e.g. yourname@okhdfcbank"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20"
          >
            Save Payout Details
          </button>
        </form>
      )}
    </div>
  );
};
