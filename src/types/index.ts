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
}

export type TransactionType =
  | 'RECHARGE'
  | 'WITHDRAWAL'
  | 'REWARD'
  | 'AD_REWARD'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'SESSION_PARTICIPATION';

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
