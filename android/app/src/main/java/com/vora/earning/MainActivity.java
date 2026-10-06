package com.vora.earning;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdMobPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().eval("if (window.handleAndroidHardwareBack) { window.handleAndroidHardwareBack(); } else { window.dispatchEvent(new CustomEvent('backbutton')); }", null);
            } else {
                super.onBackPressed();
            }
        });
    }
}
