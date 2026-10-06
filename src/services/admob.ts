import { registerPlugin, Capacitor } from '@capacitor/core';

interface AdMobNativePlugin {
  isAvailable(): Promise<{ available: boolean; platform: string }>;
  showRewardedAd(options: { adUnitId: string }): Promise<{ rewarded: boolean; amount: number; type: string }>;
  showInterstitialAd(options: { adUnitId: string }): Promise<{ dismissed: boolean }>;
}

const AdMobNative = registerPlugin<AdMobNativePlugin>('AdMobNative');

export const admobService = {
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  },

  async showNativeRewardedAd(adUnitId: string = 'ca-app-pub-3940256099942544/5224354917'): Promise<{
    rewarded: boolean;
    nativeShown: boolean;
    amount?: number;
  }> {
    if (!Capacitor.isNativePlatform()) {
      return { rewarded: false, nativeShown: false };
    }

    try {
      console.log('[AdMob] Requesting native rewarded ad:', adUnitId);
      const res = await AdMobNative.showRewardedAd({ adUnitId });
      console.log('[AdMob] Native ad completed successfully:', res);
      return {
        rewarded: res?.rewarded ?? true,
        nativeShown: true,
        amount: res?.amount
      };
    } catch (err) {
      console.warn('[AdMob] Native AdMob error or not ready, fallback to in-app player:', err);
      return { rewarded: false, nativeShown: false };
    }
  },

  async showNativeInterstitialAd(adUnitId: string = 'ca-app-pub-3940256099942544/1033173712'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await AdMobNative.showInterstitialAd({ adUnitId });
      return true;
    } catch (err) {
      console.warn('[AdMob] Native interstitial ad error:', err);
      return false;
    }
  }
};
