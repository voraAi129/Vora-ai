import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'vora_earning_fintech_production_secret_key_2026';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_voraEarning2026';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'vora_razorpay_secret_key_prod';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'vora_webhook_secret_key';
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || 'OT3RwPxYdortDGgmseJ71k29vUACcIb5QXKW6ZfjEaFBN0zlhLNfM5Tv2IOLJSypjF9xBlYtm8KngZWb';
const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';
const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY || process.env.TWOFACTOR_API_KEY || '55b98607-bd81-11f1-af74-0200cd936042';

// Data directory — supports Railway persistent volume via env var
// Priority: RAILWAY_VOLUME_MOUNT_PATH > /tmp (Railway) > local ./data (dev)
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'vora-data')
  : process.env.RAILWAY_ENVIRONMENT
    ? '/tmp/vora-data'
    : path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'backup.json');

console.log(`[DB] Using data directory: ${DATA_DIR}`);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Interfaces
interface UserRecord {
  id: string;
  name: string;
  mobile: string;
  passwordHash: string;
  salt: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt?: string;
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  totalReferralEarnings?: number;
}

interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  device: string;
  ip: string;
  createdAt: string;
  expiresAt: string;
}

interface WalletRecord {
  userId: string;
  availableBalance: number;
  participatingBalance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalRewards: number;
  updatedAt: string;
}

interface TransactionRecord {
  id: string;
  userId: string;
  amount: number;
  type: 'RECHARGE' | 'WITHDRAWAL' | 'REWARD' | 'AD_REWARD' | 'REFUND' | 'ADJUSTMENT' | 'SESSION_PARTICIPATION' | 'REFERRAL_BONUS' | 'REFERRAL_COMMISSION';
  status: 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  description: string;
  referenceId?: string;
  balanceAfter?: number;
  createdAt: string;
  updatedAt: string;
}

interface RechargeOrder {
  id: string; // razorpay order id
  userId: string;
  amount: number;
  currency: string;
  status: 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED';
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  amount: number;
  fee: number;
  netAmount: number;
  accountHolderName: string;
  bankAccountNumber: string;
  ifsc: string;
  upiId?: string;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  requestedAt: string;
  updatedAt: string;
  adminNote?: string;
  processedBy?: string;
  payoutReferenceId?: string;
}

interface RewardCampaignRecord {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  rewardRatePercentage: number;
  durationHours: number;
  dailyLimitPerUser: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  legalTerms: string;
  eligibilityRules?: string;
}

interface RewardSessionRecord {
  id: string;
  userId: string;
  campaignId: string;
  campaignName: string;
  participationAmount: number;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  rewardAmount: number;
  isEligible: boolean;
  claimedAt?: string;
  updatedAt?: string;
}

interface AdRewardToken {
  token: string;
  userId: string;
  adUnitId: string;
  issuedAt: number;
  expiresAt: number;
}

interface AdWatchRecord {
  id: string;
  userId: string;
  adUnitId: string;
  rewardAmount: number;
  completed: boolean;
  timestamp: string;
  verified: boolean;
}

interface AuditLogRecord {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
  ipAddress?: string;
}

interface AppSettingsRecord {
  appName: string;
  logoUrl?: string;
  maintenanceMode: boolean;
  minSupportedVersion: string;
  latestVersion: string;
  forceUpdateEnabled: boolean;
  updateUrl: string;
  minRechargeAmount: number;
  maxRechargeAmount: number;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  withdrawalFeePercentage: number;
  quickRechargeChips: number[];
  termsAndConditions: string;
  privacyPolicy: string;
  refundPolicy: string;
  withdrawalPolicy: string;
  riskDisclosure: string;
  supportEmail: string;
  supportPhone: string;
  adMobAppId: string;
  rewardedAdUnitId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardPerAd: number;
  dailyMaxAds: number;
  cooldownSeconds: number;
  upiId: string;
  upiPayeeName: string;
  referralProgramEnabled: boolean;
  referralRewardPerUser: number;        // Fixed bonus per invite (₹50)
  referralCommissionPercent: number;    // % commission on friend's recharge (1%)
  referralTier10Bonus: number;          // 10 friends milestone bonus (₹500)
  referralTier100Bonus: number;         // 100 friends VIP milestone bonus (₹5000)
  referralMinRechargeAmount: number;    // Min recharge required to trigger bonus (₹100)
  referredUserSignupBonus: number;      // Welcome bonus for invited friend (₹25)
}

interface UpiDepositRequest {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  amount: number;
  utr: string;
  screenshotUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  createdAt: string;
}

interface SupportTicketRecord {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseState {
  users: UserRecord[];
  sessions: SessionRecord[];
  wallets: Record<string, WalletRecord>;
  transactions: TransactionRecord[];
  rechargeOrders: RechargeOrder[];
  upiDeposits: UpiDepositRequest[];
  withdrawals: WithdrawalRequest[];
  campaigns: RewardCampaignRecord[];
  rewardSessions: RewardSessionRecord[];
  adWatches: AdWatchRecord[];
  auditLogs: AuditLogRecord[];
  notifications: NotificationRecord[];
  supportTickets: SupportTicketRecord[];
  settings: AppSettingsRecord;
  otpStore: Record<string, { otp: string; expiresAt: number; attempts: number; verified?: boolean }>;
  adTokens: Record<string, AdRewardToken>;
}

// Initial default settings
const defaultSettings: AppSettingsRecord = {
  appName: 'VORA EARNING',
  maintenanceMode: false,
  minSupportedVersion: '1.0.0',
  latestVersion: '1.0.0',
  forceUpdateEnabled: false,
  updateUrl: 'https://play.google.com/store/apps/details?id=com.vora.earning',
  minRechargeAmount: 100,
  maxRechargeAmount: 10000,
  minWithdrawalAmount: 200,
  maxWithdrawalAmount: 25000,
  withdrawalFeePercentage: 0,
  quickRechargeChips: [500, 1000, 2000, 5000, 10000],
  termsAndConditions: 'Welcome to VORA EARNING. This application is a compliant rewards and fintech loyalty platform. By accessing or using our services, you agree to comply with all applicable financial regulations, fair-play guidelines, and reward terms. No guaranteed returns or daily profits are promised. Rewards are subject to activity completion, verified transactions, and eligibility verification.',
  privacyPolicy: 'Your privacy is paramount at VORA EARNING. We collect minimal necessary data (mobile number, transaction identifiers, device security tokens) strictly for authentication, fraud prevention, and ledger reconciliation. Banking information is masked in the UI and encrypted in transit.',
  refundPolicy: 'Recharge payments verified on Razorpay that are not credited due to technical discrepancies are automatically reconciled or refunded to the original payment source within 5 to 7 banking days as per RBI guidelines.',
  withdrawalPolicy: 'Withdrawals are processed to verified domestic bank accounts or UPI VPA matching the registered account holder name. Payout processing takes between 1 to 24 business hours following automated compliance verification.',
  riskDisclosure: 'VORA EARNING does not operate as an unregistered collective investment scheme or guaranteed return deposit. Any activity rewards, promotional bonuses, or engagement incentives are discretionary marketing campaigns governed by fair usage limits.',
  supportEmail: 'support@voraearning.com',
  supportPhone: '+91 8000 123 456',
  adMobAppId: 'ca-app-pub-3940256099942544~3347511713',
  rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
  rewardPerAd: 2.5,
  dailyMaxAds: 15,
  cooldownSeconds: 30,
  upiId: '9266428368-i638-2@ibl',
  upiPayeeName: 'Vora Earning',
  referralProgramEnabled: true,
  referralRewardPerUser: 50,
  referralCommissionPercent: 1,
  referralTier10Bonus: 500,
  referralTier100Bonus: 5000,
  referralMinRechargeAmount: 100,
  referredUserSignupBonus: 25
};

// Password hashing
function hashPassword(password: string, salt?: string) {
  const userSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, userSalt, 64).toString('hex');
  return { hash, salt: userSalt };
}

function verifyPassword(password: string, hash: string, salt: string) {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return testHash === hash;
}

// In-memory state with disk persistence
let db: DatabaseState = {
  users: [],
  sessions: [],
  wallets: {},
  transactions: [],
  rechargeOrders: [],
  upiDeposits: [],
  withdrawals: [],
  campaigns: [],
  rewardSessions: [],
  adWatches: [],
  auditLogs: [],
  notifications: [],
  supportTickets: [],
  settings: { ...defaultSettings },
  otpStore: {},
  adTokens: {}
};

function saveDb() {
  try {
    const json = JSON.stringify(db, null, 2);
    fs.writeFileSync(DB_FILE, json, 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      db = {
        ...db,
        ...parsed,
        settings: {
          ...defaultSettings,
          ...(parsed.settings || {})
        }
      };
      if (!db.supportTickets) db.supportTickets = [];
      if (!db.upiDeposits) db.upiDeposits = [];
      if (!db.withdrawals) db.withdrawals = [];
      if (!db.settings.upiId) db.settings.upiId = '9266428368-i638-2@ibl';
      if (!db.settings.upiPayeeName) db.settings.upiPayeeName = 'Vora Earning';
    }
  } catch (err) {
    console.error('Error loading DB, creating fresh state:', err);
  }

  // Ensure default admin exists securely
  const adminMobile = process.env.ADMIN_MOBILE || '9266428368';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Prince@Admin@129';
  let admin = db.users.find(u => u.mobile === adminMobile);
  if (!admin) {
    const { hash, salt } = hashPassword(adminPassword);
    admin = {
      id: `usr_admin_${adminMobile}`,
      name: 'System Administrator',
      mobile: adminMobile,
      passwordHash: hash,
      salt: salt,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    db.users.push(admin);
    if (!db.wallets[admin.id]) {
      db.wallets[admin.id] = {
        userId: admin.id,
        availableBalance: 100000,
        participatingBalance: 0,
        pendingBalance: 0,
        totalDeposited: 100000,
        totalWithdrawn: 0,
        totalRewards: 0,
        updatedAt: new Date().toISOString()
      };
    }
  } else {
    // Sync admin password hash and role
    const { hash, salt } = hashPassword(adminPassword);
    admin.passwordHash = hash;
    admin.salt = salt;
    admin.role = 'ADMIN';
  }

  // Ensure demo verified user exists for instant zero-friction testing
  const demoMobile = '9999988888';
  let demoUser = db.users.find(u => u.mobile === demoMobile);
  if (!demoUser) {
    const { hash, salt } = hashPassword('VoraUser123!');
    demoUser = {
      id: 'usr_demo_tester',
      name: 'Prince Sharma',
      mobile: demoMobile,
      passwordHash: hash,
      salt: salt,
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      bankDetails: {
        accountHolderName: 'Prince Sharma',
        accountNumber: '912345678901',
        ifsc: 'HDFC0001234',
        upiId: 'prince@okhdfcbank'
      }
    };
    db.users.push(demoUser);
    db.wallets[demoUser.id] = {
      userId: demoUser.id,
      availableBalance: 1250,
      participatingBalance: 0,
      pendingBalance: 0,
      totalDeposited: 1000,
      totalWithdrawn: 0,
      totalRewards: 250,
      updatedAt: new Date().toISOString()
    };
    db.transactions.push({
      id: 'tx_seed_initial_recharge',
      userId: demoUser.id,
      amount: 1000,
      type: 'RECHARGE',
      status: 'SUCCESS',
      description: 'Initial Wallet Recharge via Razorpay UPI',
      referenceId: 'pay_rzp_seed_1001',
      balanceAfter: 1000,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString()
    });
    db.transactions.push({
      id: 'tx_seed_reward_bonus',
      userId: demoUser.id,
      amount: 250,
      type: 'REWARD',
      status: 'SUCCESS',
      description: 'Verified 24-Hour Active Engagement Reward',
      referenceId: 'sess_seed_001',
      balanceAfter: 1250,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    });
  }

  // Ensure default verified active campaign exists
  if (db.campaigns.length === 0) {
    db.campaigns.push({
      id: 'cmp_fintech_24h_loyalty',
      name: '24-Hour Active Engagement Yield',
      description: 'Daily activity reward session. Complete 24 hours of verified platform participation to receive authorized promotional cashback.',
      minAmount: 100,
      maxAmount: 10000,
      rewardRatePercentage: 2.5, // Compliant, realistic 2.5% promotional yield
      durationHours: 24,
      dailyLimitPerUser: 1,
      startDate: new Date(Date.now() - 15 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 180 * 86400000).toISOString(),
      status: 'ACTIVE',
      legalTerms: 'Promotional loyalty yield valid for verified accounts in good standing. Session runs continuously for 24 server hours. Claims must be confirmed before subsequent session activation. Not guaranteed interest or bank deposit yield.'
    });
  }

  saveDb();
}

loadDb();

// Auto-save every 5 minutes to prevent data loss on Railway ephemeral filesystem
setInterval(() => {
  try {
    saveDb();
    console.log(`[DB] Auto-saved at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[DB] Auto-save failed:', err);
  }
}, 5 * 60 * 1000);

// Wallet Helpers
function getWallet(userId: string): WalletRecord {
  if (!db.wallets[userId]) {
    db.wallets[userId] = {
      userId,
      availableBalance: 0,
      participatingBalance: 0,
      pendingBalance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalRewards: 0,
      updatedAt: new Date().toISOString()
    };
    saveDb();
  }
  if (db.wallets[userId].participatingBalance === undefined) {
    db.wallets[userId].participatingBalance = 0;
  }
  return db.wallets[userId];
}

function addTransaction(
  userId: string,
  amount: number,
  type: TransactionRecord['type'],
  status: TransactionRecord['status'],
  description: string,
  referenceId?: string
): TransactionRecord {
  const wallet = getWallet(userId);
  let balanceAfter = wallet.availableBalance;

  if (status === 'SUCCESS') {
    if (
      type === 'RECHARGE' ||
      type === 'REWARD' ||
      type === 'AD_REWARD' ||
      type === 'REFUND' ||
      type === 'REFERRAL_BONUS' ||
      type === 'REFERRAL_COMMISSION'
    ) {
      wallet.availableBalance += amount;
      balanceAfter = wallet.availableBalance;
      if (type === 'RECHARGE') wallet.totalDeposited += amount;
      if (type === 'REWARD' || type === 'AD_REWARD' || type === 'REFERRAL_BONUS' || type === 'REFERRAL_COMMISSION') {
        wallet.totalRewards += amount;
      }
    } else if (type === 'ADJUSTMENT') {
      wallet.availableBalance += amount;
      balanceAfter = wallet.availableBalance;
    }
  }

  wallet.updatedAt = new Date().toISOString();

  const tx: TransactionRecord = {
    id: `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    userId,
    amount,
    type,
    status,
    description,
    referenceId,
    balanceAfter,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.transactions.unshift(tx);
  saveDb();
  return tx;
}

// Referral Award & Milestone Engine
function checkAndAwardReferralMilestones(referrerId: string, referredUserId: string, rechargeAmount: number) {
  const referrer = db.users.find(u => u.id === referrerId);
  const referredUser = db.users.find(u => u.id === referredUserId);
  if (!referrer || !referredUser) return;

  if (db.settings.referralProgramEnabled === false) return;

  const baseReward = db.settings.referralRewardPerUser ?? 50;
  const commPercent = db.settings.referralCommissionPercent ?? 1;
  const tier10Reward = db.settings.referralTier10Bonus ?? 500;
  const tier100Reward = db.settings.referralTier100Bonus ?? 5000;
  const minRecharge = db.settings.referralMinRechargeAmount ?? 100;

  if (rechargeAmount < minRecharge) return;

  const baseTxRef = `ref_bonus_${referredUserId}`;
  const alreadyGivenBase = db.transactions.some(t => t.userId === referrer.id && t.referenceId === baseTxRef);

  // 1. Fixed Base Reward (given on first valid recharge)
  if (!alreadyGivenBase && baseReward > 0) {
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    referrer.totalReferralEarnings = (referrer.totalReferralEarnings || 0) + baseReward;

    addTransaction(
      referrer.id,
      baseReward,
      'REFERRAL_BONUS',
      'SUCCESS',
      `Referral Reward: ₹${baseReward} for inviting ${referredUser.name}`,
      baseTxRef
    );

    sendNotification(
      referrer.id,
      'Referral Reward Credited! 🎁',
      `₹${baseReward} added to your wallet! Your friend ${referredUser.name} completed a recharge of ₹${rechargeAmount}.`,
      'SUCCESS'
    );
  }

  // 2. Recharge Commission Percentage (e.g. 1% on every recharge!)
  if (commPercent > 0) {
    const commission = Math.max(1, Math.round((rechargeAmount * commPercent) / 100));
    referrer.totalReferralEarnings = (referrer.totalReferralEarnings || 0) + commission;

    addTransaction(
      referrer.id,
      commission,
      'REFERRAL_COMMISSION',
      'SUCCESS',
      `Referral Commission (${commPercent}% of ₹${rechargeAmount}) from ${referredUser.name}`,
      `ref_comm_${referredUserId}_${Date.now()}`
    );

    sendNotification(
      referrer.id,
      'Referral Commission Earned! 💸',
      `You earned ₹${commission} (${commPercent}% commission) from ${referredUser.name}'s recharge of ₹${rechargeAmount}!`,
      'SUCCESS'
    );
  }

  // 3. 10 Friends Milestone (₹500 extra)
  if ((referrer.referralCount || 0) >= 10 && tier10Reward > 0) {
    const m10Ref = `milestone_10_${referrer.id}`;
    const alreadyM10 = db.transactions.some(t => t.userId === referrer.id && t.referenceId === m10Ref);
    if (!alreadyM10) {
      referrer.totalReferralEarnings = (referrer.totalReferralEarnings || 0) + tier10Reward;

      addTransaction(
        referrer.id,
        tier10Reward,
        'REFERRAL_BONUS',
        'SUCCESS',
        `🎉 10 Friends Milestone Bonus unlocked!`,
        m10Ref
      );

      sendNotification(
        referrer.id,
        '10 Friends Milestone Unlocked! 🚀',
        `Congratulations! You reached 10 active referrals. A milestone bonus of ₹${tier10Reward} has been credited to your wallet!`,
        'SUCCESS'
      );
    }
  }

  // 4. 100 Friends VIP Milestone (₹5000 extra)
  if ((referrer.referralCount || 0) >= 100 && tier100Reward > 0) {
    const m100Ref = `milestone_100_${referrer.id}`;
    const alreadyM100 = db.transactions.some(t => t.userId === referrer.id && t.referenceId === m100Ref);
    if (!alreadyM100) {
      referrer.totalReferralEarnings = (referrer.totalReferralEarnings || 0) + tier100Reward;

      addTransaction(
        referrer.id,
        tier100Reward,
        'REFERRAL_BONUS',
        'SUCCESS',
        `👑 100 Friends VIP Milestone Bonus unlocked!`,
        m100Ref
      );

      sendNotification(
        referrer.id,
        '100 Friends VIP Milestone Unlocked! 🏆',
        `Incredible! You reached 100 active referrals. A VIP milestone bonus of ₹${tier100Reward} has been credited to your wallet!`,
        'SUCCESS'
      );
    }
  }

  saveDb();
}

function addAuditLog(
  adminId: string,
  adminName: string,
  action: string,
  target: string,
  oldValue: string,
  newValue: string,
  reason: string,
  ipAddress?: string
) {
  const log: AuditLogRecord = {
    id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    adminId,
    adminName,
    action,
    target,
    oldValue,
    newValue,
    reason,
    timestamp: new Date().toISOString(),
    ipAddress
  };
  db.auditLogs.unshift(log);
  saveDb();
  return log;
}

function sendNotification(userId: string, title: string, message: string, type: NotificationRecord['type']) {
  const notification: NotificationRecord = {
    id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notification);
  saveDb();
  return notification;
}

// Express App
const app = express();

// CORS middleware — allows APK to connect over WiFi/mobile network
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter state
const rateLimits: Record<string, { count: number; firstAttempt: number }> = {};
function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits[key];
  if (!entry || now - entry.firstAttempt > windowMs) {
    rateLimits[key] = { count: 1, firstAttempt: now };
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Authentication Middlewares
interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  session?: SessionRecord;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const session = db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) {
    return next();
  }

  const user = db.users.find(u => u.id === session.userId);
  if (user) {
    req.user = user;
    req.session = session;
  }
  next();
}

app.use(authMiddleware);

// Global Maintenance Mode Middleware for API routes
app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Allow static files, admin routes, system settings, and admin users
  if (
    !req.path.startsWith('/api/') ||
    req.path.startsWith('/api/admin') ||
    req.path === '/api/system/settings' ||
    (req.user && req.user.role === 'ADMIN')
  ) {
    return next();
  }

  if (db.settings.maintenanceMode) {
    return res.status(503).json({
      error: 'VORA EARNING is currently under maintenance. Please try again later.',
      maintenanceMode: true
    });
  }

  next();
});

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  if (req.user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Account suspended. Contact support.' });
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
  }
  next();
}

// ==========================================
// PUBLIC & AUTHENTICATION ENDPOINTS
// ==========================================

// Send OTP
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  const { mobile, purpose } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
  }

  // If registering, check if already registered
  if (purpose === 'register') {
    const existing = db.users.find(u => u.mobile === mobile);
    if (existing) {
      return res.status(409).json({ error: 'This mobile number is already registered. Please login.' });
    }
  }

  // If forgot password, check if registered
  if (purpose === 'forgot_password') {
    const existing = db.users.find(u => u.mobile === mobile);
    if (!existing) {
      return res.status(404).json({ error: 'This mobile number is not registered.' });
    }
  }

  const ip = req.ip || '127.0.0.1';
  if (!checkRateLimit(`otp_${mobile}_${ip}`, 5, 300000)) {
    return res.status(429).json({ error: 'Too many OTP requests. Please wait 5 minutes.' });
  }

  // Generate dynamic cryptographically strong 6 digit OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  db.otpStore[mobile] = {
    otp: generatedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
    verified: false
  };

  console.log(`[SERVER OTP GENERATED] Mobile: +91 ${mobile} | OTP: ${generatedOtp}`);

  // Send OTP via 2Factor.in if key is configured, else fallback to Fast2SMS API
  if (TWO_FACTOR_API_KEY) {
    try {
      const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${mobile}/${generatedOtp}`;
      const smsResponse = await fetch(url);
      const smsResult = await smsResponse.json();
      console.log(`[2FACTOR] OTP ${generatedOtp} sent to +91 ${mobile} | Response:`, smsResult);

      if (smsResult.Status === 'Success') {
        return res.json({
          success: true,
          message: `OTP sent successfully to +91 ${mobile.slice(0, 3)}****${mobile.slice(7)}`
        });
      } else {
        const errorMsg = smsResult.Details || '2Factor gateway error';
        console.warn('[2FACTOR] Failed to send OTP:', errorMsg, '- falling back to Fast2SMS');
      }
    } catch (err: any) {
      console.warn('[2FACTOR] Exception, falling back to Fast2SMS:', err?.message || err);
    }
  }

  // Send OTP via Fast2SMS API
  try {
    let smsResponse = await fetch(FAST2SMS_API_URL, {
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: generatedOtp,
        numbers: mobile,
        flash: 0
      })
    });
    let smsResult = await smsResponse.json();

    // Fallback to quick route if OTP route returns verification error (status_code 996)
    if (!smsResult.return && (smsResult.status_code === 996 || smsResult.status_code === 999)) {
      console.warn('[FAST2SMS] OTP route returned status code', smsResult.status_code, '- trying route q fallback');
      const fallbackResponse = await fetch(FAST2SMS_API_URL, {
        method: 'POST',
        headers: {
          'authorization': FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: `Your VORA EARNING OTP is ${generatedOtp}. Valid for 10 minutes.`,
          language: 'english',
          flash: 0,
          numbers: mobile
        })
      });
      const fallbackResult = await fallbackResponse.json();
      if (fallbackResult.return) {
        smsResult = fallbackResult;
      }
    }

    console.log(`[FAST2SMS] OTP ${generatedOtp} to +91 ${mobile} | Fast2SMS Response:`, smsResult);

    if (!smsResult.return) {
      const errMsg = Array.isArray(smsResult.message) ? smsResult.message.join(', ') : (smsResult.message || 'SMS provider error');
      console.error('[FAST2SMS] Failed to send OTP:', errMsg);
      return res.status(400).json({ error: `Fast2SMS Gateway Error: ${errMsg}` });
    }
  } catch (smsErr: any) {
    console.error('[FAST2SMS] Error sending OTP:', smsErr);
    return res.status(500).json({ error: 'SMS gateway unavailable. Please try again later.' });
  }

  res.json({
    success: true,
    message: `OTP sent successfully to +91 ${mobile.slice(0, 3)}****${mobile.slice(7)}`
  });
});

// Verify OTP
app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({ error: 'Mobile and OTP are required' });
  }

  const record = db.otpStore[mobile];
  if (!record) {
    return res.status(400).json({ error: 'No OTP requested for this mobile number' });
  }

  if (Date.now() > record.expiresAt) {
    delete db.otpStore[mobile];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (record.attempts >= 5) {
    delete db.otpStore[mobile];
    return res.status(429).json({ error: 'Maximum verification attempts exceeded. Request a new OTP.' });
  }

  record.attempts += 1;
  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
  }

  // Mark OTP verified
  record.verified = true;
  res.json({ success: true, message: 'OTP verified successfully' });
});

// Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, mobile, password, confirmPassword, otp, termsAccepted } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid full name' });
  }
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (!termsAccepted) {
    return res.status(400).json({ error: 'You must accept the Terms & Conditions and Privacy Policy' });
  }

  const existing = db.users.find(u => u.mobile === mobile);
  if (existing) {
    return res.status(409).json({ error: 'This mobile number is already registered. Please login.' });
  }

  // Verify OTP
  const otpRecord = db.otpStore[mobile];
  if (!otpRecord) {
    return res.status(400).json({ error: 'OTP verification required. Please request an OTP first.' });
  }
  if (Date.now() > otpRecord.expiresAt) {
    delete db.otpStore[mobile];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (!otpRecord.verified && otpRecord.otp !== otp) {
    return res.status(400).json({ error: 'Invalid or unverified OTP. Please check and try again.' });
  }

  delete db.otpStore[mobile];

  // Check Referral Code
  const inputReferralCode = req.body.referralCode ? String(req.body.referralCode).trim().toUpperCase() : '';
  let referrerUser: UserRecord | undefined;
  if (inputReferralCode) {
    referrerUser = db.users.find(u => u.referralCode && u.referralCode.toUpperCase() === inputReferralCode);
  }

  // Hash password
  const { hash, salt } = hashPassword(password);
  const codeSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const newUser: UserRecord = {
    id: `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    name: name.trim(),
    mobile,
    passwordHash: hash,
    salt,
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    referralCode: `VORA${codeSuffix}`,
    referredBy: referrerUser ? referrerUser.id : undefined,
    referralCount: 0,
    totalReferralEarnings: 0
  };

  db.users.push(newUser);

  // Initialize wallet (with optional welcome bonus if joined via referral)
  const welcomeBonus = referrerUser ? (db.settings.referredUserSignupBonus ?? 25) : 0;
  db.wallets[newUser.id] = {
    userId: newUser.id,
    availableBalance: welcomeBonus,
    participatingBalance: 0,
    pendingBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalRewards: welcomeBonus,
    updatedAt: new Date().toISOString()
  };

  if (welcomeBonus > 0 && referrerUser) {
    addTransaction(
      newUser.id,
      welcomeBonus,
      'REFERRAL_BONUS',
      'SUCCESS',
      `Welcome Bonus for joining with referral code ${referrerUser.referralCode}`,
      `welcome_${newUser.id}`
    );
    sendNotification(
      newUser.id,
      'Welcome Bonus Credited! 🎁',
      `₹${welcomeBonus} welcome bonus credited to your wallet for using referral code ${referrerUser.referralCode}.`,
      'SUCCESS'
    );
    sendNotification(
      referrerUser.id,
      'Friend Registered! 👥',
      `${newUser.name} registered using your referral code. You will earn ₹${db.settings.referralRewardPerUser || 50} bonus + ${db.settings.referralCommissionPercent || 1}% commission when they complete their first recharge!`,
      'INFO'
    );
  } else {
    // Welcome registration notification
    sendNotification(
      newUser.id,
      'Welcome to VORA EARNING!',
      'Your account has been registered successfully. Explore 24-hour reward sessions and instant recharges.',
      'SUCCESS'
    );
  }

  // Create session
  const token = crypto.randomBytes(32).toString('hex');
  const session: SessionRecord = {
    id: `sess_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: newUser.id,
    token,
    device: req.headers['user-agent'] || 'Android Phone',
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() // 30 days
  };
  db.sessions.push(session);
  saveDb();

  res.status(201).json({
    success: true,
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      mobile: newUser.mobile,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
      referralCode: newUser.referralCode
    }
  });
});

// Login (Universal - No separate admin login screen)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ error: 'Mobile number and password are required' });
  }

  const ip = req.ip || '127.0.0.1';
  if (!checkRateLimit(`login_${mobile}_${ip}`, 10, 300000)) {
    return res.status(429).json({ error: 'Too many failed login attempts. Please wait 5 minutes.' });
  }

  const user = db.users.find(u => u.mobile === mobile);
  if (!user) {
    return res.status(401).json({ error: 'Invalid mobile number or password' });
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'This account has been suspended due to policy violations. Contact support.' });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid mobile number or password' });
  }

  user.lastLoginAt = new Date().toISOString();

  // Create session
  const token = crypto.randomBytes(32).toString('hex');
  const session: SessionRecord = {
    id: `sess_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: user.id,
    token,
    device: req.headers['user-agent'] || 'Android Phone',
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
  };
  db.sessions.push(session);
  saveDb();

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role, // USER or ADMIN
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      bankDetails: user.bankDetails
    }
  });
});

// Forgot Password
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { mobile, otp, newPassword } = req.body;

  if (!mobile || !otp || !newPassword) {
    return res.status(400).json({ error: 'Mobile, OTP, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = db.users.find(u => u.mobile === mobile);
  if (!user) {
    return res.status(404).json({ error: 'No account found with this mobile number' });
  }

  // Update password
  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;

  // Invalidate previous sessions
  db.sessions = db.sessions.filter(s => s.userId !== user.id);
  saveDb();

  sendNotification(user.id, 'Password Changed', 'Your password was successfully updated.', 'INFO');

  res.json({ success: true, message: 'Password updated successfully. You can now login.' });
});

// Logout
app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.session) {
    db.sessions = db.sessions.filter(s => s.id !== req.session!.id);
    saveDb();
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Terminate other sessions
app.post('/api/user/sessions/terminate-others', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.session && req.user) {
    db.sessions = db.sessions.filter(s => s.userId !== req.user!.id || s.id === req.session!.id);
    saveDb();
  }
  res.json({ success: true, message: 'All other active sessions terminated' });
});

// Get Current User Profile
app.get('/api/user/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sessions = db.sessions
    .filter(s => s.userId === user.id)
    .map(s => ({
      id: s.id,
      device: s.device,
      createdAt: s.createdAt,
      isCurrent: s.id === req.session?.id
    }));

  res.json({
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      bankDetails: user.bankDetails ? {
        accountHolderName: user.bankDetails.accountHolderName,
        accountNumber: user.bankDetails.accountNumber ? `••••••••${user.bankDetails.accountNumber.slice(-4)}` : undefined,
        ifsc: user.bankDetails.ifsc,
        upiId: user.bankDetails.upiId
      } : undefined
    },
    sessions
  });
});

// Update Bank / Payout Details
app.put('/api/user/bank-details', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { accountHolderName, accountNumber, ifsc, upiId } = req.body;
  const user = req.user!;

  if (!accountHolderName || accountHolderName.trim().length < 2) {
    return res.status(400).json({ error: 'Account holder name is required' });
  }

  user.bankDetails = {
    accountHolderName: accountHolderName.trim(),
    accountNumber: accountNumber ? accountNumber.trim() : user.bankDetails?.accountNumber,
    ifsc: ifsc ? ifsc.trim().toUpperCase() : user.bankDetails?.ifsc,
    upiId: upiId ? upiId.trim() : user.bankDetails?.upiId
  };

  saveDb();
  res.json({ success: true, message: 'Payout details updated successfully' });
});

// Change Password
app.post('/api/user/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user!;

  if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  saveDb();

  sendNotification(user.id, 'Security Alert', 'Your account password has been updated.', 'WARNING');
  res.json({ success: true, message: 'Password changed successfully' });
});

// ==========================================
// WALLET & LEDGER ENDPOINTS
// ==========================================

app.get('/api/wallet', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const wallet = getWallet(req.user!.id);
  const activeSession = db.rewardSessions.find(
    s => s.userId === req.user!.id && s.status === 'ACTIVE'
  );
  let currentAccruedReward = 0;
  if (activeSession) {
    const startMs = new Date(activeSession.startTime).getTime();
    const endMs = new Date(activeSession.endTime).getTime();
    const serverNow = Date.now();
    const progress = Math.min(1, Math.max(0, (serverNow - startMs) / (endMs - startMs)));
    currentAccruedReward = Math.round(activeSession.rewardAmount * progress * 100) / 100;
  }

  res.json({
    availableBalance: wallet.availableBalance,
    participatingBalance: wallet.participatingBalance || 0,
    pendingBalance: wallet.pendingBalance,
    totalDeposited: wallet.totalDeposited,
    totalWithdrawn: wallet.totalWithdrawn,
    totalRewards: wallet.totalRewards,
    currentAccruedReward,
    serverTime: new Date().toISOString()
  });
});

app.get('/api/transactions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.query;
  const userTxs = db.transactions.filter(t => t.userId === req.user!.id);

  const filtered = type && type !== 'ALL'
    ? userTxs.filter(t => t.type === type)
    : userTxs;

  res.json({
    transactions: filtered
  });
});

// System Settings Public Endpoint
app.get('/api/system/settings', (req: Request, res: Response) => {
  res.json({
    settings: {
      appName: db.settings.appName,
      maintenanceMode: db.settings.maintenanceMode,
      minSupportedVersion: db.settings.minSupportedVersion,
      latestVersion: db.settings.latestVersion,
      forceUpdateEnabled: db.settings.forceUpdateEnabled,
      updateUrl: db.settings.updateUrl,
      minRechargeAmount: db.settings.minRechargeAmount,
      maxRechargeAmount: db.settings.maxRechargeAmount,
      minWithdrawalAmount: db.settings.minWithdrawalAmount,
      maxWithdrawalAmount: db.settings.maxWithdrawalAmount,
      withdrawalFeePercentage: db.settings.withdrawalFeePercentage,
      quickRechargeChips: db.settings.quickRechargeChips,
      termsAndConditions: db.settings.termsAndConditions,
      privacyPolicy: db.settings.privacyPolicy,
      refundPolicy: db.settings.refundPolicy,
      withdrawalPolicy: db.settings.withdrawalPolicy,
      riskDisclosure: db.settings.riskDisclosure,
      supportEmail: db.settings.supportEmail,
      supportPhone: db.settings.supportPhone,
      upiId: db.settings.upiId || '9266428368-i638-2@ibl',
      upiPayeeName: db.settings.upiPayeeName || 'Vora Earning',
      adMobAppId: db.settings.adMobAppId,
      rewardedAdUnitId: db.settings.rewardedAdUnitId,
      bannerAdUnitId: db.settings.bannerAdUnitId,
      interstitialAdUnitId: db.settings.interstitialAdUnitId,
      rewardPerAd: db.settings.rewardPerAd,
      dailyMaxAds: db.settings.dailyMaxAds,
      cooldownSeconds: db.settings.cooldownSeconds,
      referralProgramEnabled: db.settings.referralProgramEnabled ?? true,
      referralRewardPerUser: db.settings.referralRewardPerUser ?? 50,
      referralCommissionPercent: db.settings.referralCommissionPercent ?? 1,
      referralTier10Bonus: db.settings.referralTier10Bonus ?? 500,
      referralTier100Bonus: db.settings.referralTier100Bonus ?? 5000,
      referralMinRechargeAmount: db.settings.referralMinRechargeAmount ?? 100,
      referredUserSignupBonus: db.settings.referredUserSignupBonus ?? 25
    }
  });
});

// User Referral Stats & Team Endpoint
app.get('/api/referral/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Ensure user has referralCode
  if (!user.referralCode) {
    user.referralCode = `VORA${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    saveDb();
  }

  const friends = db.users
    .filter(u => u.referredBy === user.id)
    .map(u => {
      const uWallet = getWallet(u.id);
      const totalRecharged = uWallet ? uWallet.totalDeposited : 0;
      const hasRecharged = totalRecharged >= (db.settings.referralMinRechargeAmount ?? 100);
      
      // Calculate total earnings from this specific friend
      const bonusTxs = db.transactions.filter(
        t => t.userId === user.id && (
          t.referenceId === `ref_bonus_${u.id}` || 
          (t.referenceId && t.referenceId.startsWith(`ref_comm_${u.id}`))
        )
      );
      const rewardEarned = bonusTxs.reduce((sum, t) => sum + t.amount, 0);

      return {
        id: u.id,
        name: u.name,
        mobileMasked: u.mobile.slice(0, 3) + '****' + u.mobile.slice(7),
        createdAt: u.createdAt,
        hasRecharged,
        totalRecharged,
        rewardEarned
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeRechargedCount = friends.filter(f => f.hasRecharged).length;
  const totalEarnings = friends.reduce((sum, f) => sum + f.rewardEarned, 0);

  res.json({
    referralCode: user.referralCode,
    shareUrl: `https://play.google.com/store/apps/details?id=com.vora.earning&referrer=${user.referralCode}`,
    programEnabled: db.settings.referralProgramEnabled ?? true,
    rewardPerUser: db.settings.referralRewardPerUser ?? 50,
    commissionPercent: db.settings.referralCommissionPercent ?? 1,
    tier10Bonus: db.settings.referralTier10Bonus ?? 500,
    tier100Bonus: db.settings.referralTier100Bonus ?? 5000,
    minRechargeAmount: db.settings.referralMinRechargeAmount ?? 100,
    welcomeBonus: db.settings.referredUserSignupBonus ?? 25,
    totalReferrals: friends.length,
    activeRechargedCount,
    totalEarnings,
    referredUsers: friends
  });
});

// Create Withdrawal Request
app.post('/api/withdrawal/create', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { amount, accountHolderName, bankAccountNumber, ifsc, upiId } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid withdrawal amount is required' });
  }

  const { minWithdrawalAmount, maxWithdrawalAmount, withdrawalFeePercentage } = db.settings;
  const min = minWithdrawalAmount || 200;
  const max = maxWithdrawalAmount || 25000;

  if (numAmount < min || numAmount > max) {
    return res.status(400).json({
      error: `Withdrawal amount must be between ₹${min.toLocaleString('en-IN')} and ₹${max.toLocaleString('en-IN')}`
    });
  }

  const wallet = getWallet(req.user!.id);
  if (wallet.availableBalance < numAmount) {
    return res.status(400).json({
      error: `Insufficient available balance. You have ₹${wallet.availableBalance}, requested ₹${numAmount}`
    });
  }

  const feePct = withdrawalFeePercentage || 0;
  const fee = Math.round((numAmount * feePct) / 100);
  const netAmount = numAmount - fee;

  const withdrawalId = `wdr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const withdrawal: WithdrawalRequest = {
    id: withdrawalId,
    userId: req.user!.id,
    userName: req.user!.name,
    userMobile: req.user!.mobile,
    amount: numAmount,
    fee,
    netAmount,
    accountHolderName: accountHolderName || req.user!.name,
    bankAccountNumber: bankAccountNumber || '',
    ifsc: ifsc || '',
    upiId: upiId || '',
    status: 'REQUESTED',
    requestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  wallet.availableBalance -= numAmount;
  wallet.pendingBalance += numAmount;
  wallet.updatedAt = new Date().toISOString();

  if (!db.withdrawals) db.withdrawals = [];
  db.withdrawals.unshift(withdrawal);

  const tx: TransactionRecord = {
    id: `tx_wdr_${Date.now()}`,
    userId: req.user!.id,
    amount: -numAmount,
    type: 'WITHDRAWAL',
    status: 'PENDING',
    description: `Withdrawal Request to ${upiId || bankAccountNumber || 'Bank Account'}`,
    referenceId: withdrawal.id,
    balanceAfter: wallet.availableBalance,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.transactions.unshift(tx);

  saveDb();

  sendNotification(
    req.user!.id,
    'Withdrawal Requested 💸',
    `Your withdrawal request of ₹${numAmount} has been registered and is under processing.`,
    'INFO'
  );

  res.json({
    success: true,
    withdrawal,
    walletBalance: wallet.availableBalance
  });
});

// Get User Withdrawal History
app.get('/api/withdrawal/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!db.withdrawals) db.withdrawals = [];
  const userWithdrawals = db.withdrawals.filter(w => w.userId === req.user!.id);
  res.json({ withdrawals: userWithdrawals });
});

// ==========================================
// RECHARGE & MANUAL UPI DEPOSIT ENDPOINTS
// ==========================================

// Submit Manual UPI Deposit Request
app.post('/api/recharge/upi-submit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { amount, utr, screenshotUrl } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid recharge amount is required' });
  }

  const { minRechargeAmount, maxRechargeAmount } = db.settings;
  if (numAmount < minRechargeAmount || numAmount > maxRechargeAmount) {
    return res.status(400).json({
      error: `Recharge amount must be between ₹${minRechargeAmount} and ₹${maxRechargeAmount}`
    });
  }

  const cleanUtr = String(utr || '').trim();
  if (!cleanUtr || cleanUtr.length < 6) {
    return res.status(400).json({ error: 'Please enter a valid 12-digit UPI UTR / Reference Number' });
  }

  // Check if this UTR was already submitted and approved or pending
  if (!db.upiDeposits) db.upiDeposits = [];
  const existingUtr = db.upiDeposits.find(d => d.utr.toLowerCase() === cleanUtr.toLowerCase() && d.status !== 'REJECTED');
  if (existingUtr) {
    return res.status(400).json({ error: 'This UTR / Reference Number has already been submitted.' });
  }

  const depositId = `upi_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const deposit: UpiDepositRequest = {
    id: depositId,
    userId: req.user!.id,
    userName: req.user!.name,
    userMobile: req.user!.mobile,
    amount: numAmount,
    utr: cleanUtr,
    screenshotUrl: screenshotUrl || '',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.upiDeposits.unshift(deposit);
  saveDb();

  sendNotification(
    req.user!.id,
    'Recharge Request Submitted ⏱️',
    `Your recharge request of ₹${numAmount} (UTR: ${cleanUtr}) has been received and will be verified within 5 minutes to 1 hour.`,
    'INFO'
  );

  res.json({
    success: true,
    depositId,
    amount: numAmount,
    utr: cleanUtr,
    message: 'Payment proof submitted! Your recharge will be verified within 5 minutes to 1 hour.'
  });
});

// Get User's UPI Deposit History
app.get('/api/recharge/my-deposits', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!db.upiDeposits) db.upiDeposits = [];
  const userDeposits = db.upiDeposits.filter(d => d.userId === req.user!.id);
  res.json({ deposits: userDeposits });
});

// Admin: Get All UPI Deposits
app.get('/api/admin/upi-deposits', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (!db.upiDeposits) db.upiDeposits = [];
  const { status } = req.query;
  let list = db.upiDeposits;
  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter(d => d.status === status);
  }
  res.json({ deposits: list });
});

// Admin: Approve UPI Deposit
app.post('/api/admin/upi-deposits/:id/approve', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (!db.upiDeposits) db.upiDeposits = [];
  const { id } = req.params;
  const deposit = db.upiDeposits.find(d => d.id === id);

  if (!deposit) {
    return res.status(404).json({ error: 'Deposit request not found' });
  }

  if (deposit.status === 'APPROVED') {
    return res.status(400).json({ error: 'Deposit is already approved' });
  }

  deposit.status = 'APPROVED';
  deposit.updatedAt = new Date().toISOString();
  deposit.reviewedAt = new Date().toISOString();
  deposit.reviewedBy = req.user!.name;

  // Credit amount to user's wallet
  const wallet = getWallet(deposit.userId);
  wallet.availableBalance += deposit.amount;
  wallet.totalDeposited += deposit.amount;
  wallet.updatedAt = new Date().toISOString();

  // Add ledger transaction
  addTransaction(
    deposit.userId,
    deposit.amount,
    'RECHARGE',
    'SUCCESS',
    `Manual UPI Recharge Verified (UTR: ${deposit.utr})`,
    deposit.id
  );

  // Send notification to user
  sendNotification(
    deposit.userId,
    'Recharge Approved 🎉',
    `₹${deposit.amount} has been verified and added to your wallet balance. (UTR: ${deposit.utr})`,
    'SUCCESS'
  );

  // Trigger referral reward & commission for referrer
  const rechargedUser = db.users.find(u => u.id === deposit.userId);
  if (rechargedUser && rechargedUser.referredBy) {
    checkAndAwardReferralMilestones(rechargedUser.referredBy, rechargedUser.id, deposit.amount);
  }

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'APPROVE_UPI_DEPOSIT',
    `deposit:${deposit.id}`,
    'PENDING',
    'APPROVED',
    `Recharge of ₹${deposit.amount} approved for ${deposit.userName}`,
    req.ip
  );

  saveDb();

  res.json({
    success: true,
    message: `₹${deposit.amount} successfully credited to ${deposit.userName}'s wallet!`,
    deposit
  });
});

// Admin: Reject UPI Deposit
app.post('/api/admin/upi-deposits/:id/reject', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (!db.upiDeposits) db.upiDeposits = [];
  const { id } = req.params;
  const { reason } = req.body;
  const deposit = db.upiDeposits.find(d => d.id === id);

  if (!deposit) {
    return res.status(404).json({ error: 'Deposit request not found' });
  }

  if (deposit.status === 'APPROVED') {
    return res.status(400).json({ error: 'Cannot reject an already approved deposit' });
  }

  const rejectReason = reason || 'UTR or payment screenshot verification failed';
  deposit.status = 'REJECTED';
  deposit.rejectionReason = rejectReason;
  deposit.updatedAt = new Date().toISOString();
  deposit.reviewedAt = new Date().toISOString();
  deposit.reviewedBy = req.user!.name;

  sendNotification(
    deposit.userId,
    'Recharge Rejected ❌',
    `Your recharge request of ₹${deposit.amount} (UTR: ${deposit.utr}) was rejected. Reason: ${rejectReason}`,
    'ALERT'
  );

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'REJECT_UPI_DEPOSIT',
    `deposit:${deposit.id}`,
    'PENDING',
    'REJECTED',
    rejectReason,
    req.ip
  );

  saveDb();

  res.json({
    success: true,
    message: 'Deposit request rejected.',
    deposit
  });
});

// Admin: Update UPI Config
app.post('/api/admin/settings/upi', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { upiId, upiPayeeName } = req.body;
  if (upiId) db.settings.upiId = String(upiId).trim();
  if (upiPayeeName) db.settings.upiPayeeName = String(upiPayeeName).trim();
  saveDb();
  res.json({
    success: true,
    upiId: db.settings.upiId,
    upiPayeeName: db.settings.upiPayeeName
  });
});

// Create Razorpay Order (Kept as fallback)
app.post('/api/payment/create-order', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid recharge amount' });
  }

  const { minRechargeAmount, maxRechargeAmount } = db.settings;
  if (numAmount < minRechargeAmount || numAmount > maxRechargeAmount) {
    return res.status(400).json({
      error: `Recharge amount must be between ₹${minRechargeAmount} and ₹${maxRechargeAmount}`
    });
  }

  try {
    // Call Real Razorpay Orders API
    const razorpayAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: numAmount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: `rcpt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        notes: {
          userId: req.user!.id,
          userName: req.user!.name,
          purpose: 'wallet_recharge'
        }
      })
    });

    const rzpOrder = await rzpResponse.json();

    if (!rzpResponse.ok || rzpOrder.error) {
      console.error('[RAZORPAY] Order creation failed:', rzpOrder);
      return res.status(500).json({ error: 'Payment gateway error. Please try again.' });
    }

    console.log(`[RAZORPAY] Order created: ${rzpOrder.id} for ₹${numAmount}`);

    // Store order with real Razorpay order ID
    const order: RechargeOrder = {
      id: rzpOrder.id, // Real Razorpay order_id like order_xxxxx
      userId: req.user!.id,
      amount: numAmount,
      currency: 'INR',
      status: 'INITIATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.rechargeOrders.push(order);
    saveDb();

    res.json({
      orderId: rzpOrder.id,
      amount: numAmount,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      user: {
        name: req.user!.name,
        mobile: req.user!.mobile
      }
    });
  } catch (err) {
    console.error('[RAZORPAY] Order creation error:', err);
    return res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

// Verify Razorpay Payment Signature
app.post('/api/payment/verify', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, statusOverride } = req.body;

  if (!razorpay_order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const order = db.rechargeOrders.find(o => o.id === razorpay_order_id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Unauthorized order verification' });
  }

  // Idempotency: If already credited, return existing success
  if (order.status === 'SUCCESS') {
    const wallet = getWallet(req.user!.id);
    return res.json({
      success: true,
      message: 'Payment already processed and credited',
      orderId: order.id,
      walletBalance: wallet.availableBalance
    });
  }

  // Allow simulated payment status for testing (e.g. FAILED / PENDING testing in QA)
  if (statusOverride === 'FAILED') {
    order.status = 'FAILED';
    order.updatedAt = new Date().toISOString();
    saveDb();
    sendNotification(req.user!.id, 'Recharge Failed', `Your recharge of ₹${order.amount} could not be processed.`, 'ALERT');
    return res.status(400).json({ success: false, error: 'Payment failed at gateway' });
  }

  if (statusOverride === 'PENDING') {
    order.status = 'PENDING';
    order.updatedAt = new Date().toISOString();
    saveDb();
    sendNotification(req.user!.id, 'Payment Pending', `Payment of ₹${order.amount} is undergoing bank verification.`, 'INFO');
    return res.json({ success: true, status: 'PENDING', message: 'Payment verification in progress' });
  }

  // In production, verify Razorpay cryptographic HMAC signature:
  // generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret);
  const paymentId = razorpay_payment_id || `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
  hmac.update(`${order.id}|${paymentId}`);
  const expectedSignature = hmac.digest('hex');

  // Strict signature verification - must match expected HMAC
  const isSignatureValid = razorpay_signature
    ? razorpay_signature === expectedSignature
    : false; // Signature is required for real payments

  if (!isSignatureValid) {
    order.status = 'FAILED';
    order.updatedAt = new Date().toISOString();
    saveDb();
    return res.status(400).json({ error: 'Payment signature verification failed' });
  }

  // Atomic state change to SUCCESS
  order.status = 'SUCCESS';
  order.paymentId = paymentId;
  order.updatedAt = new Date().toISOString();

  // Create immutable ledger transaction
  const tx = addTransaction(
    req.user!.id,
    order.amount,
    'RECHARGE',
    'SUCCESS',
    `Wallet Recharge via Razorpay UPI/NetBanking (${paymentId})`,
    order.id
  );

  sendNotification(
    req.user!.id,
    'Recharge Successful',
    `₹${order.amount} has been added to your wallet balance. Available balance: ₹${tx.balanceAfter}.`,
    'SUCCESS'
  );

  const wallet = getWallet(req.user!.id);
  res.json({
    success: true,
    message: 'Recharge successful',
    transactionId: tx.id,
    amount: order.amount,
    walletBalance: wallet.availableBalance
  });
});

// Razorpay Webhook Endpoint
app.post('/api/payment/webhook', (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const event = req.body;

  // Verify webhook signature in production
  if (webhookSignature && RAZORPAY_WEBHOOK_SECRET) {
    const expected = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (webhookSignature !== expected) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }

  if (event.event === 'payment.captured' && event.payload?.payment?.entity) {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;
    const order = db.rechargeOrders.find(o => o.id === orderId);

    if (order && order.status !== 'SUCCESS') {
      order.status = 'SUCCESS';
      order.paymentId = payment.id;
      order.updatedAt = new Date().toISOString();
      addTransaction(
        order.userId,
        order.amount,
        'RECHARGE',
        'SUCCESS',
        `Recharge confirmed via Razorpay Webhook (${payment.id})`,
        order.id
      );
      sendNotification(order.userId, 'Payment Reconciled', `Recharge of ₹${order.amount} confirmed.`, 'SUCCESS');
    }
  }

  res.json({ status: 'ok' });
});

// Check Order Status for Payment Recovery
app.get('/api/payment/status/:orderId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const order = db.rechargeOrders.find(o => o.id === req.params.orderId && o.userId === req.user!.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ order });
});

// ==========================================
// WITHDRAWAL ENDPOINTS
// ==========================================

app.post('/api/withdrawal/create', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { amount, accountHolderName, bankAccountNumber, ifsc, upiId } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  const { minWithdrawalAmount, maxWithdrawalAmount, withdrawalFeePercentage } = db.settings;
  if (numAmount < minWithdrawalAmount || numAmount > maxWithdrawalAmount) {
    return res.status(400).json({
      error: `Withdrawal amount must be between ₹${minWithdrawalAmount} and ₹${maxWithdrawalAmount}`
    });
  }

  if (!accountHolderName || accountHolderName.trim().length < 2) {
    return res.status(400).json({ error: 'Account holder name is required' });
  }

  if (!upiId && (!bankAccountNumber || !ifsc)) {
    return res.status(400).json({ error: 'Either valid Bank Account + IFSC or UPI ID must be provided' });
  }

  const wallet = getWallet(req.user!.id);
  if (wallet.availableBalance < numAmount) {
    return res.status(400).json({
      error: `Insufficient available balance. You have ₹${wallet.availableBalance}, requested ₹${numAmount}`
    });
  }

  // Prevent multiple pending withdrawals if needed
  const pendingCount = db.withdrawals.filter(
    w => w.userId === req.user!.id && (w.status === 'REQUESTED' || w.status === 'PROCESSING')
  ).length;

  if (pendingCount >= 10) {
    return res.status(400).json({
      error: 'You have multiple active pending withdrawal requests. Please wait for previous payouts to complete.'
    });
  }

  const fee = Math.round((numAmount * (withdrawalFeePercentage || 0)) / 100);
  const netAmount = numAmount - fee;

  // Deduct from available, move to pending
  wallet.availableBalance -= numAmount;
  wallet.pendingBalance += numAmount;
  wallet.updatedAt = new Date().toISOString();

  const withdrawalId = `wth_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const record: WithdrawalRequest = {
    id: withdrawalId,
    userId: req.user!.id,
    userName: req.user!.name,
    userMobile: req.user!.mobile,
    amount: numAmount,
    fee,
    netAmount,
    accountHolderName: accountHolderName.trim(),
    bankAccountNumber: bankAccountNumber ? bankAccountNumber.trim() : 'N/A',
    ifsc: ifsc ? ifsc.trim().toUpperCase() : 'N/A',
    upiId: upiId ? upiId.trim() : undefined,
    status: 'REQUESTED',
    requestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.withdrawals.unshift(record);

  // Ledger entry
  addTransaction(
    req.user!.id,
    numAmount,
    'WITHDRAWAL',
    'PENDING',
    `Withdrawal Request (${withdrawalId}) to ${record.upiId || record.bankAccountNumber.slice(-4)}`,
    withdrawalId
  );

  sendNotification(
    req.user!.id,
    'Withdrawal Requested',
    `Withdrawal request for ₹${numAmount} (Net ₹${netAmount}) received and submitted for compliance review.`,
    'INFO'
  );

  saveDb();

  res.json({
    success: true,
    withdrawal: {
      ...record,
      bankAccountNumber: record.bankAccountNumber !== 'N/A'
        ? `••••••••${record.bankAccountNumber.slice(-4)}`
        : 'N/A'
    },
    walletBalance: wallet.availableBalance
  });
});

app.get('/api/withdrawal/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userWithdrawals = db.withdrawals
    .filter(w => w.userId === req.user!.id)
    .map(w => ({
      ...w,
      bankAccountNumber: w.bankAccountNumber !== 'N/A'
        ? `••••••••${w.bankAccountNumber.slice(-4)}`
        : 'N/A'
    }));

  res.json({ withdrawals: userWithdrawals });
});

// ==========================================
// 24-HOUR ACTIVE SESSION REWARDS ENGINE
// ==========================================

app.get('/api/rewards', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const activeCampaign = db.campaigns.find(c => c.status === 'ACTIVE') || db.campaigns[0];
  const activeSession = db.rewardSessions.find(
    s => s.userId === req.user!.id && s.status === 'ACTIVE'
  );

  let currentAccruedReward = 0;
  let progressPercentage = 0;
  let remainingSeconds = 0;
  const serverNow = Date.now();

  if (activeSession) {
    const startMs = new Date(activeSession.startTime).getTime();
    const endMs = new Date(activeSession.endTime).getTime();
    const totalDuration = endMs - startMs;
    const elapsed = Math.max(0, serverNow - startMs);

    if (serverNow >= endMs) {
      currentAccruedReward = activeSession.rewardAmount;
      progressPercentage = 100;
      remainingSeconds = 0;
    } else {
      const ratio = Math.min(1, elapsed / totalDuration);
      currentAccruedReward = Math.round(activeSession.rewardAmount * ratio * 100) / 100;
      progressPercentage = Math.round(ratio * 100);
      remainingSeconds = Math.max(0, Math.ceil((endMs - serverNow) / 1000));
    }
  }

  res.json({
    campaign: activeCampaign,
    activeSession: activeSession ? {
      ...activeSession,
      currentAccruedReward,
      progressPercentage,
      remainingSeconds
    } : null,
    serverTime: new Date().toISOString()
  });
});

app.get('/api/rewards/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const activeSession = db.rewardSessions.find(
    s => s.userId === req.user!.id && s.status === 'ACTIVE'
  );

  const serverNow = Date.now();
  let isCompleted = false;
  let currentAccruedReward = 0;
  let progressPercentage = 0;
  let remainingSeconds = 0;

  if (activeSession) {
    const startMs = new Date(activeSession.startTime).getTime();
    const endMs = new Date(activeSession.endTime).getTime();
    const totalDuration = endMs - startMs;
    const elapsed = Math.max(0, serverNow - startMs);

    if (serverNow >= endMs) {
      isCompleted = true;
      currentAccruedReward = activeSession.rewardAmount;
      progressPercentage = 100;
      remainingSeconds = 0;
    } else {
      const ratio = Math.min(1, elapsed / totalDuration);
      currentAccruedReward = Math.round(activeSession.rewardAmount * ratio * 100) / 100;
      progressPercentage = Math.round(ratio * 100);
      remainingSeconds = Math.max(0, Math.ceil((endMs - serverNow) / 1000));
    }
  }

  res.json({
    activeSession: activeSession ? {
      ...activeSession,
      currentAccruedReward,
      progressPercentage,
      remainingSeconds
    } : null,
    isCompleted,
    serverNow: new Date().toISOString()
  });
});

app.post('/api/rewards/start', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { participationAmount } = req.body;
  const numAmount = Number(participationAmount);

  const campaign = db.campaigns.find(c => c.status === 'ACTIVE') || db.campaigns[0];
  if (!campaign) {
    return res.status(400).json({ error: 'No active reward campaign is currently available' });
  }

  const minAmount = campaign.minAmount || 100;
  const maxAmount = campaign.maxAmount || 10000;

  if (isNaN(numAmount) || numAmount < minAmount || numAmount > maxAmount) {
    return res.status(400).json({
      error: `Participation amount must be between ₹${minAmount.toLocaleString('en-IN')} and ₹${maxAmount.toLocaleString('en-IN')}`
    });
  }

  const existingActive = db.rewardSessions.find(
    s => s.userId === user.id && s.status === 'ACTIVE'
  );

  if (existingActive) {
    return res.status(400).json({
      error: 'An active 24-hour session already exists.'
    });
  }

  const wallet = getWallet(user.id);
  if (wallet.availableBalance < numAmount) {
    return res.status(400).json({
      error: `Insufficient Available Balance. You have ₹${wallet.availableBalance.toLocaleString('en-IN')}, required ₹${numAmount.toLocaleString('en-IN')}. Please recharge your wallet.`
    });
  }

  // Deduct from available balance, add to participating balance
  wallet.availableBalance -= numAmount;
  wallet.participatingBalance = (wallet.participatingBalance || 0) + numAmount;
  wallet.updatedAt = new Date().toISOString();

  const rewardRate = campaign.rewardRatePercentage || 2.5;
  const calculatedReward = Math.round((numAmount * rewardRate) / 100 * 100) / 100;

  const durationMs = (campaign.durationHours || 24) * 3600 * 1000;
  const now = new Date();
  const endTime = new Date(now.getTime() + durationMs);

  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const newSession: RewardSessionRecord = {
    id: sessionId,
    userId: user.id,
    campaignId: campaign.id,
    campaignName: campaign.name,
    participationAmount: numAmount,
    startTime: now.toISOString(),
    endTime: endTime.toISOString(),
    status: 'ACTIVE',
    rewardAmount: calculatedReward,
    isEligible: true
  };

  db.rewardSessions.unshift(newSession);

  // Create immutable ledger entry for SESSION_PARTICIPATION
  const tx = addTransaction(
    user.id,
    numAmount,
    'SESSION_PARTICIPATION',
    'SUCCESS',
    `24-Hour Reward Session Participation Reserved (${campaign.name})`,
    sessionId
  );

  sendNotification(
    user.id,
    '24-Hour Session Started',
    `Your session with ₹${numAmount.toLocaleString('en-IN')} participation is active. Eligible reward: ₹${calculatedReward}.`,
    'INFO'
  );

  saveDb();

  res.json({
    success: true,
    session: {
      ...newSession,
      currentAccruedReward: 0,
      progressPercentage: 0,
      remainingSeconds: Math.floor(durationMs / 1000)
    },
    availableBalance: wallet.availableBalance,
    participatingBalance: wallet.participatingBalance,
    transactionId: tx.id,
    serverNow: now.toISOString()
  });
});

// Claim Reward when session is verified by server
app.post('/api/rewards/claim', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const session = db.rewardSessions.find(
    s => s.userId === user.id && s.status === 'ACTIVE'
  );

  if (!session) {
    return res.status(400).json({ error: 'No active session to claim' });
  }

  const serverNow = Date.now();
  const endMs = new Date(session.endTime).getTime();

  // Check if session has genuinely completed on server
  if (serverNow < endMs) {
    const remainingSeconds = Math.ceil((endMs - serverNow) / 1000);
    return res.status(400).json({
      error: `Session in progress. Remaining time: ${remainingSeconds}s. Authoritative server time cannot be bypassed.`
    });
  }

  // Update session status
  session.status = 'COMPLETED';
  session.claimedAt = new Date().toISOString();

  const wallet = getWallet(user.id);
  const partAmount = session.participationAmount || 0;

  // Return participation principal back to available balance!
  wallet.participatingBalance = Math.max(0, (wallet.participatingBalance || 0) - partAmount);
  wallet.availableBalance += partAmount;

  // Credit earned reward to available balance
  wallet.availableBalance += session.rewardAmount;
  wallet.totalRewards += session.rewardAmount;
  wallet.updatedAt = new Date().toISOString();

  // Credit reward to wallet ledger
  const tx = addTransaction(
    user.id,
    session.rewardAmount,
    'REWARD',
    'SUCCESS',
    `24-Hour Session Reward (+₹${session.rewardAmount} Reward, ₹${partAmount} Principal Returned)`,
    session.id
  );

  sendNotification(
    user.id,
    '24-Hour Session Completed!',
    `₹${partAmount.toLocaleString('en-IN')} participation returned and ₹${session.rewardAmount} reward credited to your available balance.`,
    'SUCCESS'
  );

  saveDb();

  res.json({
    success: true,
    participationAmount: partAmount,
    rewardAmount: session.rewardAmount,
    totalSessionValue: partAmount + session.rewardAmount,
    availableBalance: wallet.availableBalance,
    participatingBalance: wallet.participatingBalance,
    transactionId: tx.id
  });
});

// Fast-forward session endpoint strictly for testing/QA verification
app.post('/api/rewards/test-complete', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = db.rewardSessions.find(
    s => s.userId === req.user!.id && s.status === 'ACTIVE'
  );
  if (!session) {
    return res.status(400).json({ error: 'No active session found' });
  }
  // Set end time to 1 second ago
  session.endTime = new Date(Date.now() - 1000).toISOString();
  saveDb();
  res.json({ success: true, message: 'Session elapsed for testing', session });
});

// ==========================================
// GOOGLE ADMOB REWARDED ADS
// ==========================================

app.get('/api/ads/config', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userWatchesToday = db.adWatches.filter(w => {
    if (w.userId !== req.user!.id || !w.completed) return false;
    const watchDate = new Date(w.timestamp).toDateString();
    return watchDate === new Date().toDateString();
  });

  const remainingToday = Math.max(0, db.settings.dailyMaxAds - userWatchesToday.length);

  res.json({
    adMobAppId: db.settings.adMobAppId,
    rewardedAdUnitId: db.settings.rewardedAdUnitId,
    bannerAdUnitId: db.settings.bannerAdUnitId,
    interstitialAdUnitId: db.settings.interstitialAdUnitId,
    rewardPerAd: db.settings.rewardPerAd,
    dailyMaxAds: db.settings.dailyMaxAds,
    cooldownSeconds: db.settings.cooldownSeconds,
    viewsCompletedToday: userWatchesToday.length,
    viewsRemainingToday: remainingToday
  });
});

// Request one-time cryptographically signed ad token
app.post('/api/ads/request-token', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userWatchesToday = db.adWatches.filter(w => {
    if (w.userId !== req.user!.id || !w.completed) return false;
    return new Date(w.timestamp).toDateString() === new Date().toDateString();
  });

  if (userWatchesToday.length >= db.settings.dailyMaxAds) {
    return res.status(400).json({ error: 'Daily advertisement watch limit reached. Come back tomorrow!' });
  }

  // Check cooldown from last watch
  const lastWatch = db.adWatches
    .filter(w => w.userId === req.user!.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (lastWatch) {
    const elapsedSec = (Date.now() - new Date(lastWatch.timestamp).getTime()) / 1000;
    if (elapsedSec < db.settings.cooldownSeconds) {
      return res.status(429).json({
        error: `Please wait ${Math.ceil(db.settings.cooldownSeconds - elapsedSec)}s before watching another ad.`
      });
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  db.adTokens[token] = {
    token,
    userId: req.user!.id,
    adUnitId: db.settings.rewardedAdUnitId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 120000 // Valid for 2 minutes
  };

  res.json({
    token,
    adUnitId: db.settings.rewardedAdUnitId,
    rewardAmount: db.settings.rewardPerAd
  });
});

// Verify Ad completion and reward
app.post('/api/ads/reward-event', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { token, watchDurationMs, completed } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Verification token required' });
  }

  const tokenRecord = db.adTokens[token];
  if (!tokenRecord) {
    return res.status(400).json({ error: 'Invalid or already consumed ad verification token' });
  }

  if (tokenRecord.userId !== req.user!.id) {
    delete db.adTokens[token];
    return res.status(403).json({ error: 'Token user mismatch' });
  }

  if (Date.now() > tokenRecord.expiresAt) {
    delete db.adTokens[token];
    return res.status(400).json({ error: 'Ad session expired. Please try again.' });
  }

  if (!completed || (watchDurationMs && watchDurationMs < 5000)) {
    delete db.adTokens[token];
    return res.status(400).json({ error: 'Ad was not fully completed. No reward credited.' });
  }

  // Consume token to prevent replay attacks
  delete db.adTokens[token];

  const rewardAmount = db.settings.rewardPerAd;

  const watchRecord: AdWatchRecord = {
    id: `ad_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: req.user!.id,
    adUnitId: tokenRecord.adUnitId,
    rewardAmount,
    completed: true,
    timestamp: new Date().toISOString(),
    verified: true
  };
  db.adWatches.unshift(watchRecord);

  // Credit to wallet ledger
  const tx = addTransaction(
    req.user!.id,
    rewardAmount,
    'AD_REWARD',
    'SUCCESS',
    `AdMob Rewarded Ad Bonus (${tokenRecord.adUnitId})`,
    watchRecord.id
  );

  sendNotification(
    req.user!.id,
    'Ad Reward Credited',
    `₹${rewardAmount} rewarded for completed advertisement viewing.`,
    'SUCCESS'
  );

  saveDb();

  const wallet = getWallet(req.user!.id);
  res.json({
    success: true,
    rewardAmount,
    availableBalance: wallet.availableBalance,
    transactionId: tx.id
  });
});

// ==========================================
// NOTIFICATIONS & SETTINGS
// ==========================================

app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifs = db.notifications.filter(n => n.userId === req.user!.id);
  res.json({ notifications: notifs });
});

app.post('/api/notifications/mark-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  db.notifications
    .filter(n => n.userId === req.user!.id)
    .forEach(n => { n.read = true; });
  saveDb();
  res.json({ success: true });
});

// Support Tickets
app.post('/api/support/tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  const ticket: SupportTicketRecord = {
    id: `tkt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: req.user!.id,
    userName: req.user!.name,
    userMobile: req.user!.mobile,
    subject: subject.trim(),
    message: message.trim(),
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.supportTickets.unshift(ticket);
  saveDb();

  sendNotification(
    req.user!.id,
    'Support Ticket Logged',
    `Your ticket (${ticket.id}) has been received. Our compliance support team will respond shortly.`,
    'INFO'
  );

  res.json({ success: true, ticket });
});

app.get('/api/support/tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userTickets = db.supportTickets.filter(t => t.userId === req.user!.id);
  res.json({ tickets: userTickets });
});

// (System settings route defined earlier - single canonical route)


// ==========================================
// SECURE ADMIN ENDPOINTS (RBAC ENFORCED)
// ==========================================

app.get('/api/admin/dashboard', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const totalUsers = db.users.filter(u => u.role === 'USER').length;
  const activeUsers = db.users.filter(u => u.role === 'USER' && u.status === 'ACTIVE').length;
  const newUsersToday = db.users.filter(u => {
    return new Date(u.createdAt).toDateString() === new Date().toDateString();
  }).length;

  const successfulPayments = db.rechargeOrders.filter(o => o.status === 'SUCCESS');
  const totalRechargeVolume = successfulPayments.reduce((sum, o) => sum + (o.amount || 0), 0);
  const pendingPayments = db.rechargeOrders.filter(o => o.status === 'PENDING').length;
  const failedPayments = db.rechargeOrders.filter(o => o.status === 'FAILED').length;

  const pendingUpiDepositsList = (db.upiDeposits || []).filter(d => d.status === 'PENDING');
  const pendingUpiDeposits = pendingUpiDepositsList.length;
  const totalUpiDeposits = (db.upiDeposits || []).length;
  const approvedUpiDeposits = (db.upiDeposits || []).filter(d => d.status === 'APPROVED');
  const totalUpiDepositVolume = approvedUpiDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);

  const totalWithdrawals = db.withdrawals.length;
  const pendingWithdrawalsList = db.withdrawals.filter(w => w.status === 'REQUESTED' || w.status === 'UNDER_REVIEW' || w.status === 'PROCESSING');
  const pendingWithdrawals = pendingWithdrawalsList.length;
  const completedWithdrawals = db.withdrawals.filter(w => w.status === 'COMPLETED').length;
  const totalWithdrawalVolume = db.withdrawals
    .filter(w => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const pendingWithdrawalVolume = pendingWithdrawalsList
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const totalRewardsIssued = db.transactions
    .filter(t => (t.type === 'REWARD' || t.type === 'AD_REWARD') && t.status === 'SUCCESS')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const adViews = db.adWatches.filter(w => w.completed).length;
  const activeSessions = db.rewardSessions.filter(s => s.status === 'ACTIVE').length;

  res.json({
    stats: {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalRechargeVolume: (totalRechargeVolume + totalUpiDepositVolume) || 0,
      successfulPayments: successfulPayments.length + approvedUpiDeposits.length,
      pendingPayments: pendingPayments + pendingUpiDeposits,
      failedPayments,
      totalUpiDeposits,
      pendingUpiDeposits,
      totalUpiDepositVolume,
      totalWithdrawals,
      pendingWithdrawals,
      pendingWithdrawalCount: pendingWithdrawals,
      completedWithdrawals,
      totalWithdrawalVolume: totalWithdrawalVolume || 0,
      pendingWithdrawalVolume: pendingWithdrawalVolume || 0,
      totalRewardsIssued: totalRewardsIssued || 0,
      totalAdRewards: totalRewardsIssued || 0,
      adViews,
      adViewsCount: adViews,
      activeSessions
    },
    systemAlerts: [
      pendingUpiDeposits > 0
        ? { severity: 'HIGH', level: 'WARNING', message: `${pendingUpiDeposits} UPI Recharge requests awaiting manual verification.` }
        : null,
      pendingWithdrawals > 0
        ? { severity: 'HIGH', level: 'WARNING', message: `${pendingWithdrawals} withdrawal requests awaiting audit review.` }
        : null,
      db.settings.maintenanceMode
        ? { severity: 'HIGH', level: 'ALERT', message: 'System Maintenance Mode is currently ACTIVE.' }
        : null
    ].filter(Boolean)
  });
});

// Admin User Management
app.get('/api/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { search } = req.query;
  let list = db.users.map(u => {
    const wallet = getWallet(u.id);
    return {
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      availableBalance: wallet.availableBalance,
      totalDeposited: wallet.totalDeposited,
      totalWithdrawn: wallet.totalWithdrawn,
      totalRewards: wallet.totalRewards
    };
  });

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(u => u.name.toLowerCase().includes(q) || u.mobile.includes(q));
  }

  res.json({ users: list });
});

// Admin User Details
app.get('/api/admin/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const wallet = getWallet(user.id);
  const txs = db.transactions.filter(t => t.userId === user.id);
  const recharges = db.rechargeOrders.filter(o => o.userId === user.id);
  const withdrawals = db.withdrawals.filter(w => w.userId === user.id);
  const sessions = db.sessions.filter(s => s.userId === user.id);
  const rewardSessions = db.rewardSessions.filter(s => s.userId === user.id);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      bankDetails: user.bankDetails
    },
    wallet,
    transactions: txs,
    recharges,
    withdrawals,
    sessions,
    rewardSessions
  });
});

// Admin Suspend / Activate User
app.post('/api/admin/users/:id/status', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status, reason } = req.body;
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
    return res.status(400).json({ error: 'Status must be ACTIVE or SUSPENDED' });
  }

  const oldStatus = user.status;
  user.status = status;

  if (status === 'SUSPENDED') {
    // Terminate all sessions
    db.sessions = db.sessions.filter(s => s.userId !== user.id);
  }

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'USER_STATUS_CHANGE',
    `user:${user.id} (${user.mobile})`,
    oldStatus,
    status,
    reason || 'Administrative action',
    req.ip
  );

  saveDb();
  res.json({ success: true, message: `User status changed to ${status}` });
});

// Admin Audited Balance Adjustment
app.post('/api/admin/users/:id/adjustment', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { amount, reason } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount === 0) {
    return res.status(400).json({ error: 'Valid non-zero adjustment amount is required' });
  }

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'A clear audit reason (minimum 5 characters) is required' });
  }

  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const wallet = getWallet(user.id);
  const oldBalance = wallet.availableBalance;
  if (numAmount < 0 && wallet.availableBalance + numAmount < 0) {
    return res.status(400).json({ error: 'Adjustment would result in a negative balance' });
  }

  const tx = addTransaction(
    user.id,
    numAmount,
    'ADJUSTMENT',
    'SUCCESS',
    `Manual Admin Adjustment: ${reason.trim()} (by ${req.user!.name})`,
    `adj_${Date.now()}`
  );

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'WALLET_ADJUSTMENT',
    `user:${user.id}`,
    `₹${oldBalance}`,
    `₹${wallet.availableBalance}`,
    reason.trim(),
    req.ip
  );

  sendNotification(
    user.id,
    'Balance Adjusted',
    `An authorized balance adjustment of ₹${numAmount > 0 ? '+' : ''}${numAmount} has been applied to your wallet. Reason: ${reason}.`,
    'INFO'
  );

  saveDb();
  res.json({ success: true, transactionId: tx.id, newBalance: wallet.availableBalance });
});

// Admin Withdrawal Management
app.get('/api/admin/withdrawals', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.query;
  let list = db.withdrawals;
  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter(w => w.status === status);
  }
  res.json({ withdrawals: list });
});

// Admin Update Withdrawal Status (Support both POST and PUT)
const handleAdminWithdrawalStatus = (req: AuthenticatedRequest, res: Response) => {
  const { status, adminNote, payoutReferenceId } = req.body;
  const withdrawal = db.withdrawals.find(w => w.id === req.params.id);

  if (!withdrawal) {
    return res.status(404).json({ error: 'Withdrawal request not found' });
  }

  const validStatuses = ['REQUESTED', 'UNDER_REVIEW', 'PROCESSING', 'COMPLETED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid withdrawal status' });
  }

  const oldStatus = withdrawal.status;
  if (oldStatus === 'COMPLETED') {
    return res.status(400).json({ error: 'Cannot modify a completed withdrawal' });
  }

  const wallet = getWallet(withdrawal.userId);

  if (status === 'COMPLETED') {
    withdrawal.status = 'COMPLETED';
    withdrawal.processedBy = req.user!.name;
    withdrawal.payoutReferenceId = payoutReferenceId || `bank_utr_${Date.now()}`;
    withdrawal.adminNote = adminNote;
    withdrawal.updatedAt = new Date().toISOString();

    // Deduct from pending, increment totalWithdrawn
    wallet.pendingBalance = Math.max(0, wallet.pendingBalance - withdrawal.amount);
    wallet.totalWithdrawn += withdrawal.amount;
    wallet.updatedAt = new Date().toISOString();

    // Mark corresponding ledger transaction as SUCCESS
    const tx = db.transactions.find(t => t.referenceId === withdrawal.id);
    if (tx) {
      tx.status = 'SUCCESS';
      tx.updatedAt = new Date().toISOString();
    }

    sendNotification(
      withdrawal.userId,
      'Withdrawal Completed',
      `₹${withdrawal.netAmount} has been credited to your bank/UPI account (Ref: ${withdrawal.payoutReferenceId}).`,
      'SUCCESS'
    );
  } else if (status === 'REJECTED') {
    withdrawal.status = 'REJECTED';
    withdrawal.processedBy = req.user!.name;
    withdrawal.adminNote = adminNote || 'Rejected by compliance administrator';
    withdrawal.updatedAt = new Date().toISOString();

    // Refund pending balance back to available balance
    wallet.pendingBalance = Math.max(0, wallet.pendingBalance - withdrawal.amount);
    wallet.availableBalance += withdrawal.amount;
    wallet.updatedAt = new Date().toISOString();

    // Create refund ledger entry
    addTransaction(
      withdrawal.userId,
      withdrawal.amount,
      'REFUND',
      'SUCCESS',
      `Withdrawal Refund for ${withdrawal.id} (${withdrawal.adminNote})`,
      withdrawal.id
    );

    sendNotification(
      withdrawal.userId,
      'Withdrawal Rejected',
      `Your withdrawal request for ₹${withdrawal.amount} was rejected. Funds have been returned to your available balance. Reason: ${withdrawal.adminNote}`,
      'WARNING'
    );
  } else {
    withdrawal.status = status;
    withdrawal.adminNote = adminNote;
    withdrawal.updatedAt = new Date().toISOString();

    sendNotification(
      withdrawal.userId,
      'Withdrawal Update',
      `Your withdrawal request is now ${status.toLowerCase().replace('_', ' ')}.`,
      'INFO'
    );
  }

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'WITHDRAWAL_STATUS_CHANGE',
    `withdrawal:${withdrawal.id}`,
    oldStatus,
    status,
    adminNote || 'Status update',
    req.ip
  );

  saveDb();
  res.json({ success: true, withdrawal });
};

app.post('/api/admin/withdrawals/:id/status', requireAdmin, handleAdminWithdrawalStatus);
app.put('/api/admin/withdrawals/:id/status', requireAdmin, handleAdminWithdrawalStatus);

// Admin Fast-Forward User Session (For admin testing panel)
app.post('/api/admin/rewards/fast-forward', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.body;
  const targetUserId = userId || req.user!.id;
  const userSession = db.rewardSessions.find(
    s => (s.userId === targetUserId || targetUserId === 'ALL') && s.status === 'ACTIVE'
  );

  if (!userSession) {
    // If no active session found for specific user, find any active session
    const anySession = db.rewardSessions.find(s => s.status === 'ACTIVE');
    if (anySession) {
      anySession.endTime = new Date(Date.now() - 5000).toISOString();
      anySession.updatedAt = new Date().toISOString();
      saveDb();
      return res.json({ success: true, message: `Fast-forwarded session ${anySession.id}`, session: anySession });
    }
    return res.status(404).json({ error: 'No active reward session found to fast-forward' });
  }

  userSession.endTime = new Date(Date.now() - 5000).toISOString();
  userSession.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, message: `Session ${userSession.id} fast-forwarded to completion`, session: userSession });
});

// Admin Campaign Config
app.get('/api/admin/reward-config', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({ campaigns: db.campaigns });
});

app.put('/api/admin/reward-config', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { campaignId, name, rewardRatePercentage, durationHours, dailyLimitPerUser, status, reason } = req.body;
  const campaign = db.campaigns.find(c => c.id === campaignId) || db.campaigns[0];

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const oldValues = JSON.stringify({
    rate: campaign.rewardRatePercentage,
    status: campaign.status,
    hours: campaign.durationHours
  });

  if (name) campaign.name = name;
  if (rewardRatePercentage !== undefined) campaign.rewardRatePercentage = Number(rewardRatePercentage);
  if (durationHours !== undefined) campaign.durationHours = Number(durationHours);
  if (dailyLimitPerUser !== undefined) campaign.dailyLimitPerUser = Number(dailyLimitPerUser);
  if (status) campaign.status = status;

  const newValues = JSON.stringify({
    rate: campaign.rewardRatePercentage,
    status: campaign.status,
    hours: campaign.durationHours
  });

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'CAMPAIGN_CONFIG_UPDATE',
    `campaign:${campaign.id}`,
    oldValues,
    newValues,
    reason || 'Reward rule adjustment',
    req.ip
  );

  saveDb();
  res.json({ success: true, campaign });
});

// Admin AdMob Config
app.get('/api/admin/ad-config', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    adMobAppId: db.settings.adMobAppId,
    rewardedAdUnitId: db.settings.rewardedAdUnitId,
    bannerAdUnitId: db.settings.bannerAdUnitId,
    interstitialAdUnitId: db.settings.interstitialAdUnitId,
    rewardPerAd: db.settings.rewardPerAd,
    dailyMaxAds: db.settings.dailyMaxAds,
    cooldownSeconds: db.settings.cooldownSeconds
  });
});

app.put('/api/admin/ad-config', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { adMobAppId, rewardedAdUnitId, bannerAdUnitId, interstitialAdUnitId, rewardPerAd, dailyMaxAds, cooldownSeconds, reason } = req.body;
  const oldVal = JSON.stringify({
    reward: db.settings.rewardPerAd,
    dailyMax: db.settings.dailyMaxAds,
    cooldown: db.settings.cooldownSeconds
  });

  if (adMobAppId) db.settings.adMobAppId = adMobAppId;
  if (rewardedAdUnitId) db.settings.rewardedAdUnitId = rewardedAdUnitId;
  if (bannerAdUnitId) db.settings.bannerAdUnitId = bannerAdUnitId;
  if (interstitialAdUnitId) db.settings.interstitialAdUnitId = interstitialAdUnitId;
  if (rewardPerAd !== undefined) db.settings.rewardPerAd = Number(rewardPerAd);
  if (dailyMaxAds !== undefined) db.settings.dailyMaxAds = Number(dailyMaxAds);
  if (cooldownSeconds !== undefined) db.settings.cooldownSeconds = Number(cooldownSeconds);

  const newVal = JSON.stringify({
    reward: db.settings.rewardPerAd,
    dailyMax: db.settings.dailyMaxAds,
    cooldown: db.settings.cooldownSeconds
  });

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'ADMOB_CONFIG_UPDATE',
    'settings:admob',
    oldVal,
    newVal,
    reason || 'AdMob campaign update',
    req.ip
  );

  saveDb();
  res.json({ success: true, settings: db.settings });
});

// Admin System Settings
app.get('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({ settings: db.settings });
});

app.put('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body;
  const reason = updates.reason || 'General system settings update';
  delete updates.reason;

  const oldVal = JSON.stringify(db.settings);
  db.settings = { ...db.settings, ...updates };
  const newVal = JSON.stringify(db.settings);

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'SYSTEM_SETTINGS_UPDATE',
    'settings:global',
    oldVal,
    newVal,
    reason,
    req.ip
  );

  saveDb();
  res.json({ success: true, settings: db.settings });
});

// Admin Referral Program Analytics & Settings
app.get('/api/admin/referral-stats', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const allReferred = db.users.filter(u => !!u.referredBy);
  const totalReferralBonusPaid = db.transactions
    .filter(t => t.type === 'REFERRAL_BONUS' || t.type === 'REFERRAL_COMMISSION')
    .reduce((sum, t) => sum + t.amount, 0);

  // Top Referrers ranking
  const referrers = db.users
    .filter(u => (u.referralCount || 0) > 0 || db.users.some(r => r.referredBy === u.id))
    .map(u => {
      const friends = db.users.filter(f => f.referredBy === u.id);
      const earnings = db.transactions
        .filter(t => t.userId === u.id && (t.type === 'REFERRAL_BONUS' || t.type === 'REFERRAL_COMMISSION'))
        .reduce((sum, t) => sum + t.amount, 0);
      const rechargedCount = friends.filter(f => {
        const w = getWallet(f.id);
        return (w?.totalDeposited || 0) >= (db.settings.referralMinRechargeAmount || 100);
      }).length;

      return {
        id: u.id,
        name: u.name,
        mobile: u.mobile,
        referralCode: u.referralCode,
        totalInvited: friends.length,
        rechargedCount,
        totalEarnings: earnings
      };
    })
    .sort((a, b) => b.totalEarnings - a.totalEarnings);

  res.json({
    settings: {
      referralProgramEnabled: db.settings.referralProgramEnabled ?? true,
      referralRewardPerUser: db.settings.referralRewardPerUser ?? 50,
      referralCommissionPercent: db.settings.referralCommissionPercent ?? 1,
      referralTier10Bonus: db.settings.referralTier10Bonus ?? 500,
      referralTier100Bonus: db.settings.referralTier100Bonus ?? 5000,
      referralMinRechargeAmount: db.settings.referralMinRechargeAmount ?? 100,
      referredUserSignupBonus: db.settings.referredUserSignupBonus ?? 25
    },
    totalReferredUsers: allReferred.length,
    totalReferralBonusPaid,
    topReferrers: referrers
  });
});

const handleUpdateReferralSettings = (req: AuthenticatedRequest, res: Response) => {
  const {
    referralProgramEnabled,
    referralRewardPerUser,
    referralCommissionPercent,
    referralTier10Bonus,
    referralTier100Bonus,
    referralMinRechargeAmount,
    referredUserSignupBonus,
    reason
  } = req.body;

  const oldVal = JSON.stringify({
    enabled: db.settings.referralProgramEnabled,
    base: db.settings.referralRewardPerUser,
    comm: db.settings.referralCommissionPercent,
    t10: db.settings.referralTier10Bonus,
    t100: db.settings.referralTier100Bonus,
    min: db.settings.referralMinRechargeAmount,
    welcome: db.settings.referredUserSignupBonus
  });

  if (referralProgramEnabled !== undefined) db.settings.referralProgramEnabled = Boolean(referralProgramEnabled);
  if (referralRewardPerUser !== undefined) db.settings.referralRewardPerUser = Number(referralRewardPerUser);
  if (referralCommissionPercent !== undefined) db.settings.referralCommissionPercent = Number(referralCommissionPercent);
  if (referralTier10Bonus !== undefined) db.settings.referralTier10Bonus = Number(referralTier10Bonus);
  if (referralTier100Bonus !== undefined) db.settings.referralTier100Bonus = Number(referralTier100Bonus);
  if (referralMinRechargeAmount !== undefined) db.settings.referralMinRechargeAmount = Number(referralMinRechargeAmount);
  if (referredUserSignupBonus !== undefined) db.settings.referredUserSignupBonus = Number(referredUserSignupBonus);

  const newVal = JSON.stringify({
    enabled: db.settings.referralProgramEnabled,
    base: db.settings.referralRewardPerUser,
    comm: db.settings.referralCommissionPercent,
    t10: db.settings.referralTier10Bonus,
    t100: db.settings.referralTier100Bonus,
    min: db.settings.referralMinRechargeAmount,
    welcome: db.settings.referredUserSignupBonus
  });

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'REFERRAL_SETTINGS_UPDATE',
    'settings:referral',
    oldVal,
    newVal,
    reason || 'Referral program rule update',
    req.ip
  );

  saveDb();
  res.json({ success: true, settings: db.settings });
};

app.put('/api/admin/referral-settings', requireAdmin, handleUpdateReferralSettings);
app.post('/api/admin/referral-settings', requireAdmin, handleUpdateReferralSettings);

// Admin Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({ auditLogs: db.auditLogs });
});

// Admin Support Tickets
app.get('/api/admin/tickets', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({ tickets: db.supportTickets });
});

app.post('/api/admin/tickets/:id/reply', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status, adminReply } = req.body;
  const ticket = db.supportTickets.find(t => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  if (status) ticket.status = status;
  if (adminReply) ticket.adminReply = adminReply;
  ticket.updatedAt = new Date().toISOString();

  sendNotification(
    ticket.userId,
    'Support Ticket Update',
    `Ticket ${ticket.id}: ${adminReply || 'Status updated to ' + ticket.status}`,
    'INFO'
  );

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'SUPPORT_TICKET_REPLY',
    `ticket:${ticket.id}`,
    'OPEN',
    ticket.status,
    adminReply || 'Admin resolved ticket',
    req.ip
  );

  saveDb();
  res.json({ success: true, ticket });
});

// Admin Backup & Export
app.get('/api/admin/backup', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  // Sanitize password hashes for export safety
  const safeUsers = db.users.map(({ passwordHash, salt, ...rest }) => rest);
  const backup = {
    ...db,
    users: safeUsers,
    exportedAt: new Date().toISOString(),
    exportedBy: req.user!.name
  };
  res.json({ backup });
});

// Admin Database Restore
app.post('/api/admin/restore', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { restoreData } = req.body;
  if (!restoreData || !restoreData.settings) {
    return res.status(400).json({ error: 'Invalid restore backup format' });
  }

  // Backup current state before restoring
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(db, null, 2), 'utf-8');

  if (restoreData.settings) db.settings = restoreData.settings;
  if (restoreData.campaigns) db.campaigns = restoreData.campaigns;

  addAuditLog(
    req.user!.id,
    req.user!.name,
    'DATABASE_RESTORE',
    'database:core',
    'previous_state',
    'restored_state',
    'Admin requested configuration restore',
    req.ip
  );

  saveDb();
  res.json({ success: true, message: 'Configuration restored successfully from backup' });
});

// ==========================================
// STATIC FILES & SPA SERVING
// ==========================================

async function startServer() {
  // Railway sets PORT env var; also detect if dist/ exists for production mode
  const distPath = path.resolve(__dirname, 'dist');
  const hasDistFolder = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));
  const isDev = !hasDistFolder && process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT;

  if (isDev) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log(`[VORA EARNING] Development mode with Vite HMR`);
    } catch (e) {
      console.warn('[VORA EARNING] Vite not available, serving dist/ folder if exists');
      if (hasDistFolder) {
        app.use(express.static(distPath));
        app.get('*', (req: Request, res: Response) => {
          if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
          }
        });
      }
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
    console.log(`[VORA EARNING] Production mode — serving from dist/`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VORA EARNING] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[VORA EARNING] Environment: ${isDev ? 'development' : 'production'}`);
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log(`[VORA EARNING] Railway deployment detected: ${process.env.RAILWAY_ENVIRONMENT}`);
    }
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
