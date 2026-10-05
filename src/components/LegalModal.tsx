import React, { useState } from 'react';
import { X, ShieldCheck, FileText, AlertTriangle, Scale } from 'lucide-react';
import { sound } from '../services/audio';

interface LegalModalProps {
  initialTab?: 'terms' | 'privacy' | 'refund' | 'withdrawal' | 'risk';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ initialTab = 'terms', onClose }) => {
  const [tab, setTab] = useState<'terms' | 'privacy' | 'refund' | 'withdrawal' | 'risk'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-md h-[560px] bg-slate-900 border border-slate-700 rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-scaleUp text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Legal, Compliance & Disclosure
            </span>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex space-x-1 p-2 bg-slate-950/60 overflow-x-auto scrollbar-none border-b border-slate-800/80">
          {[
            { id: 'terms', label: 'Terms' },
            { id: 'privacy', label: 'Privacy' },
            { id: 'refund', label: 'Refunds' },
            { id: 'withdrawal', label: 'Withdrawals' },
            { id: 'risk', label: 'Risk Disclosure' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                sound.playTap();
                setTab(item.id as any);
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab === item.id
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 text-xs text-slate-300 leading-relaxed space-y-3 font-normal">
          {tab === 'terms' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Terms & Conditions</h3>
              <p>
                1. Acceptance of Terms: By downloading, accessing, or utilizing the VORA EARNING application, you agree to be bound by these Terms and applicable Indian financial and cyber laws.
              </p>
              <p>
                2. Eligibility: Users must be 18 years of age or older, possess a valid domestic phone number, and pass OTP authentication. One person is strictly permitted only one account.
              </p>
              <p>
                3. Promotional Rewards: All earning opportunities, loyalty campaigns, and 24-hour participation bonuses are discretionary promotional marketing events. Rewards are credited solely upon verified completion authenticated by our server ledger.
              </p>
              <p>
                4. Fair Use: Emulators, automated scripts, ad-blocking software, clock manipulation, or exploitation of bugs are strictly prohibited and warrant immediate termination.
              </p>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Privacy Policy</h3>
              <p>
                1. Minimal Data Collection: VORA EARNING collects your mobile number, legal name, device session identifiers, and payout coordinates (Bank IFSC or UPI ID).
              </p>
              <p>
                2. Security & Encryption: Financial communications utilize TLS 1.3 encryption. Passwords undergo cryptographically secure salted scrypt hashing. We never store plain-text passwords.
              </p>
              <p>
                3. Third Parties: Payment processing is handled directly by Razorpay under RBI guidelines. Ad viewing metrics are verified via official Google AdMob SDK endpoints.
              </p>
              <p>
                4. Right to Deletion: You retain the right to submit an account purge request at any time through the Security Center.
              </p>
            </div>
          )}

          {tab === 'refund' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Refund & Payment Policy</h3>
              <p>
                1. Razorpay Gateway Orders: Any recharge transaction debited from your bank or UPI account that fails to reflect on your VORA EARNING ledger due to technical latency is automatically reconciled via webhooks.
              </p>
              <p>
                2. Settlement & Payout Timeline: If an order fails verification or encounters unresolved gateway anomalies, refunds are returned to the source banking instrument within 5 to 7 business days.
              </p>
            </div>
          )}

          {tab === 'withdrawal' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Withdrawal & Payout Rules</h3>
              <p>
                1. Account Matching: Withdrawal payouts are disbursed exclusively to Indian bank accounts or UPI VPAs in the registered account holder&apos;s name.
              </p>
              <p>
                2. Payout Limits: Configurable minimum withdrawal is ₹200 and maximum is ₹25,000 per transaction to ensure security and prevent unauthorized laundering.
              </p>
              <p>
                3. Audit & Verification: All payouts undergo automated risk scoring and administrative compliance review before UTR disbursement.
              </p>
            </div>
          )}

          {tab === 'risk' && (
            <div className="space-y-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center space-x-2 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-sm">Responsible Use & Risk Disclosure</span>
              </div>
              <p className="text-amber-200">
                CRITICAL NOTICE: VORA EARNING does not operate as an investment fund, collective deposit scheme, or high-yield guaranteed income program.
              </p>
              <p className="text-slate-300">
                We make NO representations or warranties of “guaranteed 20% daily returns”, “risk-free investment”, or passive wealth accumulation. Earnings represent marketing incentives, loyalty engagement credits, and advertiser rewards. Users must exercise responsible discretion.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            I Acknowledge & Understand
          </button>
        </div>
      </div>
    </div>
  );
};
