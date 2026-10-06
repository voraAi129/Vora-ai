import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  CheckCircle,
  Gift,
  Users,
  Award,
  TrendingUp,
  Clock,
  Check,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { api } from '../services/api';
import { ReferralStats } from '../types';

interface ReferralScreenProps {
  onBack?: () => void;
  onNavigateToRecharge?: () => void;
}

export const ReferralScreen: React.FC<ReferralScreenProps> = ({ onBack }) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'friends' | 'rules'>('overview');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getReferralStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load referral stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const referralCode = stats?.referralCode || 'VORA8368';
  const shareMessage = `🔥 Join Vora AI Earning App & get ₹${stats?.welcomeBonus || 25} Welcome Bonus instantly! 💰\n\nUse my Referral Code: *${referralCode}*\n\nDownload App Now: https://vora-earning-production.up.railway.app/download/app-release.apk`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const url = stats?.shareUrl || `https://vora-earning-production.up.railway.app/download/app-release.apk?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vora AI Earning App - Invite & Earn',
          text: shareMessage,
          url: 'https://vora-earning-production.up.railway.app/download/app-release.apk'
        });
      } catch {
        handleCopyCode();
      }
    } else {
      handleWhatsAppShare();
    }
  };

  const totalInvited = stats?.totalReferrals || 0;
  const activeRecharged = stats?.activeRechargedCount || 0;
  const totalEarnings = stats?.totalEarnings || 0;

  // Milestone Progress
  const nextMilestone = activeRecharged < 1 ? 1 : activeRecharged < 10 ? 10 : 100;
  const progressPercent = Math.min(100, Math.round((activeRecharged / nextMilestone) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              Refer & Earn Program
            </h1>
            <p className="text-xs text-slate-400">Invite friends & earn on every recharge!</p>
          </div>
        </div>
        <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-semibold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          {stats?.commissionPercent || 1}% Comm.
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Hero Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 border border-purple-500/30 p-5 shadow-2xl shadow-purple-950/50">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-amber-400/20 border border-amber-400/40 rounded-full text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Gift className="w-3 h-3" /> Double Reward System
              </span>
              <span className="text-xs text-purple-200">Recharge Verified</span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-snug">
                Earn ₹{stats?.rewardPerUser || 50} + {stats?.commissionPercent || 1}% Lifetime Commission
              </h2>
              <p className="text-xs text-purple-200 mt-1">
                Jab bhi aapka friend ₹{stats?.minRechargeAmount || 100}+ ka recharge karega, aapko turant bonus + lifetime commission milega!
              </p>
            </div>

            {/* Referral Code Box */}
            <div className="bg-slate-950/70 border border-purple-400/30 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-inner">
              <div>
                <p className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">Aapka Referral Code</p>
                <p className="text-xl font-black text-amber-400 tracking-wider font-mono">{referralCode}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-purple-600/30"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleWhatsAppShare}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp Share
              </button>
              <button
                onClick={handleNativeShare}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                Share Link
              </button>
            </div>
          </div>
        </div>

        {/* 3 Metric Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center">
            <Users className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
            <p className="text-[11px] text-slate-400">Total Invited</p>
            <p className="text-lg font-bold text-white mt-0.5">{totalInvited}</p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center">
            <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[11px] text-slate-400">Recharged (Active)</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">{activeRecharged}</p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center">
            <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-[11px] text-slate-400">Total Earned</p>
            <p className="text-lg font-bold text-amber-400 mt-0.5">₹{totalEarnings.toFixed(1)}</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Milestones & Rewards
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'friends'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Friends ({stats?.referredUsers?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'rules'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            How it Works
          </button>
        </div>

        {/* TAB 1: MILESTONES & REWARDS */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Progress Bar Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  Next Milestone Target: <span className="text-amber-400 font-bold">{nextMilestone} Recharges</span>
                </span>
                <span className="text-purple-300 font-bold">{activeRecharged}/{nextMilestone} ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Tier Cards Grid */}
            <div className="space-y-2.5">
              {/* Tier 1: 1 Person */}
              <div className={`p-4 rounded-2xl border transition-all ${
                activeRecharged >= 1
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                  : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      activeRecharged >= 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      1👥
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white">Tier 1: 1st Friend Recharge</h3>
                        {activeRecharged >= 1 && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                            Unlocked ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        ₹{stats?.rewardPerUser || 50} Instant Bonus + {stats?.commissionPercent || 1}% Commission
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-black text-amber-400">+₹{stats?.rewardPerUser || 50}</span>
                </div>
              </div>

              {/* Tier 2: 10 People Milestone */}
              <div className={`p-4 rounded-2xl border transition-all ${
                activeRecharged >= 10
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                  : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      activeRecharged >= 10 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      10🔥
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white">Tier 2: 10 Friends Milestone</h3>
                        {activeRecharged >= 10 ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                            Unlocked ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-semibold rounded-full">
                            {10 - activeRecharged} left
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Extra Lump-Sum Milestone Bonus of ₹{stats?.tier10Bonus || 500}
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-black text-amber-400">+₹{stats?.tier10Bonus || 500}</span>
                </div>
              </div>

              {/* Tier 3: 100 People VIP Milestone */}
              <div className={`p-4 rounded-2xl border transition-all ${
                activeRecharged >= 100
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                  : 'bg-gradient-to-r from-amber-950/10 via-slate-900/80 to-slate-900/80 border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                      100👑
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-amber-300">Tier 3: 100 Friends VIP Jackpot</h3>
                        {activeRecharged >= 100 ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                            Unlocked ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-semibold rounded-full border border-amber-500/20">
                            VIP Club
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mega Milestone Bonus of ₹{stats?.tier100Bonus || 5000} directly to wallet
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-amber-400">+₹{stats?.tier100Bonus || 5000}</span>
                </div>
              </div>

              {/* Continuous 1% Recharge Commission */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Lifetime {stats?.commissionPercent || 1}% Commission</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Every single time your friend recharges, you get {stats?.commissionPercent || 1}% instantly!
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-400">UNLIMITED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY REFERRED FRIENDS */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {stats?.referredUsers && stats.referredUsers.length > 0 ? (
              stats.referredUsers.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm">
                      {friend.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{friend.name}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span>{friend.mobileMasked}</span>
                        <span>•</span>
                        <span>{new Date(friend.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {friend.hasRecharged ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <Check className="w-3 h-3" /> Recharged (₹{friend.totalRecharged})
                        </span>
                        <p className="text-xs font-bold text-amber-400 mt-0.5">
                          +₹{friend.rewardEarned.toFixed(1)} earned
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Recharge Pending
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Awaiting min ₹{stats?.minRechargeAmount || 100}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-3">
                <Users className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-300">No Friends Invited Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Share your referral link on WhatsApp or social media. Earn ₹{stats?.rewardPerUser || 50} as soon as they recharge!
                </p>
                <button
                  onClick={handleWhatsAppShare}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-950/50"
                >
                  <Share2 className="w-4 h-4" /> Share on WhatsApp Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HOW IT WORKS / RULES */}
        {activeTab === 'rules' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Referral Terms & Rules (Niyam)
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/50">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white">Share Referral Code</p>
                  <p className="text-slate-400 mt-0.5">
                    Apne dost ko apna referral code ya direct app link bhejein. Register karte time referral code daalna zaroori hai.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/50">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white">Welcome Bonus for Friend</p>
                  <p className="text-slate-400 mt-0.5">
                    Aapke link se join karne par aapke friend ko ₹{stats?.welcomeBonus || 25} ka Welcome Bonus milega.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold text-amber-300">Reward Kab Milega? (Recharge Condition)</p>
                  <p className="text-slate-300 mt-0.5">
                    Bonus tabhi credit hoga jab aapka friend minimum ₹{stats?.minRechargeAmount || 100} ka recharge karega. Fake account creation se bachne ke liye ye rule hai.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/50">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  4
                </div>
                <div>
                  <p className="font-semibold text-white">1% Lifetime Commission & Milestone Bonanza</p>
                  <p className="text-slate-400 mt-0.5">
                    1 dost par ₹{stats?.rewardPerUser || 50}, 10 dost complete hone par extra ₹{stats?.tier10Bonus || 500}, aur 100 dost complete hone par mega ₹{stats?.tier100Bonus || 5000} VIP bonus milega. Saath hi har recharge par {stats?.commissionPercent || 1}% commission hamesha milega!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
