package com.vora.earning;

import android.util.Log;
import androidx.annotation.NonNull;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.OnUserEarnedRewardListener;
import com.google.android.gms.ads.rewarded.RewardItem;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

@CapacitorPlugin(name = "AdMobNative")
public class AdMobPlugin extends Plugin {
    private static final String TAG = "AdMobNative";
    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;
    private boolean isAdLoading = false;

    @Override
    public void load() {
        super.load();
        try {
            MobileAds.initialize(getContext(), initializationStatus -> {
                Log.d(TAG, "Google AdMob Native SDK Initialized Successfully");
            });
        } catch (Exception e) {
            Log.e(TAG, "Error initializing AdMob: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("platform", "android");
        call.resolve(ret);
    }

    @PluginMethod
    public void showRewardedAd(PluginCall call) {
        String adUnitId = call.getString("adUnitId", "ca-app-pub-3940256099942544/5224354917");
        if (getActivity() == null) {
            call.reject("Activity context unavailable");
            return;
        }

        getActivity().runOnUiThread(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            Log.d(TAG, "Loading Rewarded Ad: " + adUnitId);

            RewardedAd.load(getActivity(), adUnitId, adRequest, new RewardedAdLoadCallback() {
                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    Log.e(TAG, "Rewarded ad failed to load: " + loadAdError.getMessage());
                    call.reject("AdMob failed to load ad: " + loadAdError.getMessage());
                }

                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    rewardedAd = ad;
                    Log.d(TAG, "Rewarded ad loaded successfully, presenting to user");

                    rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            rewardedAd = null;
                            Log.d(TAG, "Rewarded ad dismissed");
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                            rewardedAd = null;
                            Log.e(TAG, "Failed to show rewarded ad: " + adError.getMessage());
                            call.reject("Failed to display ad: " + adError.getMessage());
                        }
                    });

                    rewardedAd.show(getActivity(), new OnUserEarnedRewardListener() {
                        @Override
                        public void onUserEarnedReward(@NonNull RewardItem rewardItem) {
                            Log.d(TAG, "User earned reward: " + rewardItem.getAmount() + " (" + rewardItem.getType() + ")");
                            JSObject ret = new JSObject();
                            ret.put("rewarded", true);
                            ret.put("amount", rewardItem.getAmount());
                            ret.put("type", rewardItem.getType());
                            call.resolve(ret);
                        }
                    });
                }
            });
        });
    }

    @PluginMethod
    public void showInterstitialAd(PluginCall call) {
        String adUnitId = call.getString("adUnitId", "ca-app-pub-3940256099942544/1033173712");
        if (getActivity() == null) {
            call.reject("Activity context unavailable");
            return;
        }

        getActivity().runOnUiThread(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            InterstitialAd.load(getActivity(), adUnitId, adRequest, new InterstitialAdLoadCallback() {
                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    call.reject("Interstitial ad failed to load: " + loadAdError.getMessage());
                }

                @Override
                public void onAdLoaded(@NonNull InterstitialAd ad) {
                    interstitialAd = ad;
                    interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            interstitialAd = null;
                            JSObject ret = new JSObject();
                            ret.put("dismissed", true);
                            call.resolve(ret);
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                            interstitialAd = null;
                            call.reject("Failed to show interstitial: " + adError.getMessage());
                        }
                    });
                    interstitialAd.show(getActivity());
                }
            });
        });
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().finishAffinity();
                System.exit(0);
            } catch (Exception e) {
                Log.e(TAG, "Error exiting app: " + e.getMessage());
            }
        });
        call.resolve();
    }
}
