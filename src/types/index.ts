export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface User {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
  deviceInfo?: string;
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

export type TransactionType =
  | 'RECHARGE'
  | 'WITHDRAWAL'
  | 'REWARD'
  | 'AD_REWARD'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'SESSION_PARTICIPATION'
  | 'REFERRAL_COMMISSION'
  | 'REFERRAL_BONUS'
  | 'GAME_ENTRY'
  | 'GAME_WIN'
  | 'GAME_LOSS';

export type TransactionStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED';

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
  balanceAfter?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletSummary {
  availableBalance: number;
  participatingBalance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalRewards: number;
  currentAccruedReward?: number;
}

export type WithdrawalStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface WithdrawalRecord {
  id: string;
  userId: string;
  userName?: string;
  userMobile?: string;
  amount: number;
  fee: number;
  netAmount: number;
  accountHolderName: string;
  bankAccountNumber: string; // Masked on client
  ifsc: string;
  upiId?: string;
  status: WithdrawalStatus;
  requestedAt: string;
  updatedAt: string;
  adminNote?: string;
  processedBy?: string;
  payoutReferenceId?: string;
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';

export interface RewardCampaign {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  rewardRatePercentage: number;
  fixedRewardAmount?: number;
  durationHours: number;
  dailyLimitPerUser: number;
  totalPoolLimit?: number;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  legalTerms: string;
  eligibilityRules?: string;
}

export type RewardSessionStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface RewardSession {
  id: string;
  userId: string;
  campaignId: string;
  campaignName: string;
  participationAmount: number;
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  status: RewardSessionStatus;
  rewardAmount: number;
  currentAccruedReward?: number;
  progressPercentage?: number;
  remainingSeconds?: number;
  isEligible: boolean;
  claimedAt?: string;
  serverNow?: string;
}

export interface AdRewardConfig {
  adMobAppId: string;
  rewardedAdUnitId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardPerAd: number;
  dailyMaxAds: number;
  cooldownSeconds: number;
}

export interface AdWatchEvent {
  id: string;
  userId: string;
  rewardAmount: number;
  completed: boolean;
  timestamp: string;
  verified: boolean;
}

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  createdAt: string;
}

export interface SupportTicket {
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

export interface AuditLog {
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

export interface AppSettings {
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
  upiId?: string;
  upiPayeeName?: string;
  referralProgramEnabled?: boolean;
  referralRewardPerUser?: number;       // Fixed bonus for 1 person (e.g. ₹50)
  referralCommissionPercent?: number;    // % commission on friend's recharge (e.g. 1%)
  referralTier10Bonus?: number;          // Extra bonus for 10 invites (e.g. ₹500)
  referralTier100Bonus?: number;         // Extra VIP bonus for 100 invites (e.g. ₹5,000)
  referralMinRechargeAmount?: number;    // Minimum recharge required to trigger bonus (e.g. ₹100)
  referredUserSignupBonus?: number;      // New user welcome bonus (e.g. ₹25)
}

export type UpiDepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UpiDeposit {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  amount: number;
  utr: string;
  screenshotUrl?: string;
  status: UpiDepositStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface ReferralFriend {
  id: string;
  name: string;
  mobileMasked: string;
  createdAt: string;
  hasRecharged: boolean;
  totalRecharged: number;
  rewardEarned: number;
}

export interface ReferralStats {
  referralCode: string;
  shareUrl: string;
  programEnabled: boolean;
  rewardPerUser: number;
  commissionPercent: number;
  tier10Bonus: number;
  tier100Bonus: number;
  minRechargeAmount: number;
  welcomeBonus: number;
  totalReferrals: number;
  activeRechargedCount: number;
  totalEarnings: number;
  referredUsers: ReferralFriend[];
}

export type GameId = 'ludo' | 'carrom' | 'fruit_ninja' | 'knife_hit' | 'candy_match';

export interface GameConfig {
  id: GameId;
  name: string;
  icon: string;
  category: string;
  description: string;
  enabled: boolean;
  playerMode: '2_PLAYER' | 'SINGLE_PLAYER';
}

export interface GameStakeTier {
  id: string;
  entryFee: number;
  payout: number;
}

export interface GameSettings {
  winRatePercent: number; // default: 9 (Player win rate ~9%, Bot win rate ~91%)
  payoutMultiplier?: number; // default: 1.6 (e.g. ₹0.50 -> ₹0.80)
  games: GameConfig[];
  stakes: GameStakeTier[];
}

export interface GameSession {
  sessionId: string;
  gameId: GameId;
  gameName: string;
  entryFee: number;
  payout: number;
  bot: {
    name: string;
    avatar: string;
  };
  targetResult: 'WON' | 'LOST';
}

export interface GameHistoryItem {
  id: string;
  gameId: GameId;
  gameName: string;
  entryFee: number;
  payout: number;
  result: 'WON' | 'LOST';
  botName: string;
  playerScore: number;
  botScore: number;
  createdAt: string;
}

export const DEFAULT_GAMES: GameConfig[] = [
  {
    id: 'ludo',
    name: 'Ludo Express',
    icon: '🎲',
    category: 'Classic Board',
    description: 'Real-time 1v1 dice sprint vs smart bot (2-Player)',
    enabled: true,
    playerMode: '2_PLAYER'
  },
  {
    id: 'carrom',
    name: 'Carrom Clash',
    icon: '🎯',
    category: 'Physics Striker',
    description: 'Pocket coins & queen vs bot striker master (2-Player)',
    enabled: true,
    playerMode: '2_PLAYER'
  },
  {
    id: 'fruit_ninja',
    name: 'Fruit Slash',
    icon: '🍉',
    category: 'Arcade Blade',
    description: 'Slice juicy fruits & avoid explosive bombs (Single Player)',
    enabled: true,
    playerMode: 'SINGLE_PLAYER'
  },
  {
    id: 'knife_hit',
    name: 'Knife Hit Master',
    icon: '🗡️',
    category: 'Precision Timing',
    description: 'Target rotating logs without hitting blades (Single Player)',
    enabled: true,
    playerMode: 'SINGLE_PLAYER'
  },
  {
    id: 'candy_match',
    name: 'Candy Match 3',
    icon: '🍬',
    category: 'Puzzle Match',
    description: 'Match delicious candies for high score (Single Player)',
    enabled: true,
    playerMode: 'SINGLE_PLAYER'
  }
];

export const DEFAULT_STAKES: GameStakeTier[] = [
  { id: 'tier_0_5', entryFee: 0.50, payout: 0.80 },
  { id: 'tier_1', entryFee: 1.0, payout: 1.60 },
  { id: 'tier_5', entryFee: 5.0, payout: 8.0 },
  { id: 'tier_10', entryFee: 10.0, payout: 16.0 },
  { id: 'tier_50', entryFee: 50.0, payout: 80.0 },
  { id: 'tier_100', entryFee: 100.0, payout: 160.0 },
  { id: 'tier_200', entryFee: 200.0, payout: 320.0 },
  { id: 'tier_500', entryFee: 500.0, payout: 800.0 },
  { id: 'tier_1000', entryFee: 1000.0, payout: 1600.0 },
  { id: 'tier_2000', entryFee: 2000.0, payout: 3200.0 },
  { id: 'tier_5000', entryFee: 5000.0, payout: 8000.0 },
  { id: 'tier_10000', entryFee: 10000.0, payout: 16000.0 },
  { id: 'tier_20000', entryFee: 20000.0, payout: 32000.0 }
];

