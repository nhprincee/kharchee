# Kharchee Android UPI Notification Listener & Capacitor Integration Guide

## 1. Current Architecture Audit & Web Sandbox Reality

- **Current Project Stack**: React 19 + TypeScript + Vite SPA + Express (`server.ts`).
- **Web / PWA Limitation**: Standard web browsers and installed PWAs run inside a strict OS security sandbox. They **cannot** automatically read notifications from Google Pay, PhonePe, Paytm, or BHIM in the background.
- **Legitimate Android Solution**: Wrapping Kharchee with **Capacitor** (`@capacitor/core`, `@capacitor/android`) and adding a native Kotlin `NotificationListenerService` (`android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`) that runs **only** after the user explicitly enables **Notification Access** for Kharchee in Android system settings.
- **No Shortcuts or Unsafe Permissions**:
  - Does **not** use `AccessibilityService`.
  - Does **not** request `READ_SMS` or `RECEIVE_SMS`.
  - Does **not** intercept, automate, or block UPI payments.
  - Never collects UPI PINs, banking passwords, or OTPs.
  - Parses notification text **100% on-device** and never sends raw notification content to Gemini or any remote server.
  - Alerts occur **after** a supported payment app posts a readable debit confirmation notification.

---

## 2. Supported Payment Apps Allowlist

Only notifications posted by the following Android package names are inspected:

| App Name | Android Package Name | Expected Notification Pattern |
| :--- | :--- | :--- |
| **Google Pay (GPay)** | `com.google.android.apps.nbu.paisa.user` | `"Paid ₹40 to Sharma Chai..."` |
| **PhonePe** | `com.phonepe.app` | `"Paid ₹320 to SWIGGY..."` / `"Money sent"` |
| **Paytm** | `net.one97.paytm` | `"Paid Rs. 699 to Myntra..."` |
| **BHIM UPI** | `in.org.npci.upiapp` | `"INR 140.00 debited via BHIM UPI to..."` |

*Note: Not every UPI app or bank app is supported, and notifications must be enabled inside the payment app itself.*

---

## 3. Native Kotlin `NotificationListenerService` Implementation

When you generate the `/android` project via Capacitor, create the following two Kotlin files under `android/app/src/main/java/com/kharchee/app/upi/`:

### 3.1 `UpiNotificationListenerService.kt`

```kotlin
package com.kharchee.app.upi

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.localbroadcastmanager.content.LocalBroadcastManager

class UpiNotificationListenerService : NotificationListenerService() {

    companion object {
        const val ACTION_UPI_PAYMENT_NOTIFICATION = "com.kharchee.app.UPI_PAYMENT_NOTIFICATION"

        // Strict allowlist of supported UPI payment apps
        val SUPPORTED_PACKAGES = setOf(
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                        // PhonePe
            "net.one97.paytm",                        // Paytm
            "in.org.npci.upiapp"                      // BHIM UPI
        )

        // Sensitive keywords that must be immediately ignored on-device
        private val SENSITIVE_IGNORE_REGEX = Regex(
            "\\b(otp|one time password|verification code|upi pin|mpin|enter pin|passcode|password|cvv|do not share)\\b",
            RegexOption.IGNORE_CASE
        )

        // Non-debit / request / failed keywords to ignore
        private val NON_DEBIT_IGNORE_REGEX = Regex(
            "\\b(failed|declined|unsuccessful|pending|requested|collect request|approve payment|scratch card|cashback offer|received|credited|refunded)\\b",
            RegexOption.IGNORE_CASE
        )

        // Positive outbound payment verbs
        private val DEBIT_VERB_REGEX = Regex(
            "\\b(paid|sent|debited|spent|transferred|payment of)\\b",
            RegexOption.IGNORE_CASE
        )

        // Conservative INR amount pattern
        private val AMOUNT_REGEX = Regex(
            "(?:rs\\.?|inr|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)",
            RegexOption.IGNORE_CASE
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return

        // 1. Ignore all non-allowlisted apps immediately
        if (!SUPPORTED_PACKAGES.contains(pkg)) return

        // Ignore ongoing/progress notifications
        if (sbn.isOngoing) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: text

        val combined = "$title $bigText".trim()
        if (combined.length < 6) return

        // 2. Privacy Guard: Never inspect OTPs, PIN prompts, or passwords
        if (SENSITIVE_IGNORE_REGEX.containsMatchIn(combined)) return

        // 3. Conservatively require outbound payment verb and exclude requests/credits/failures
        if (NON_DEBIT_IGNORE_REGEX.containsMatchIn(combined) && !DEBIT_VERB_REGEX.containsMatchIn(combined)) return
        if (!DEBIT_VERB_REGEX.containsMatchIn(combined)) return
        if (!AMOUNT_REGEX.containsMatchIn(combined)) return

        // 4. Broadcast sanitized notification fields locally within the app process
        val intent = Intent(ACTION_UPI_PAYMENT_NOTIFICATION).apply {
            putExtra("packageName", pkg)
            putExtra("title", title)
            putExtra("text", bigText)
            putExtra("timestampIso", java.time.Instant.ofEpochMilli(sbn.postTime).toString())
        }
        LocalBroadcastManager.getInstance(applicationContext).sendBroadcast(intent)
    }
}
```

### 3.2 WebView JavaScript Bridge in `MainActivity.kt`

In `MainActivity.kt`, expose the lightweight `window.KharcheeAndroidBridge` interface and forward `ACTION_UPI_PAYMENT_NOTIFICATION` broadcasts into the WebView as `kharchee:upi-notification` DOM events:

```kotlin
package com.kharchee.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.provider.Settings
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationManagerCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.getcapacitor.BridgeActivity
import com.kharchee.app.upi.UpiNotificationListenerService
import org.json.JSONObject

class MainActivity : BridgeActivity() {

    private val upiReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != UpiNotificationListenerService.ACTION_UPI_PAYMENT_NOTIFICATION) return
            val payload = JSONObject().apply {
                put("packageName", intent.getStringExtra("packageName") ?: "")
                put("title", intent.getStringExtra("title") ?: "")
                put("text", intent.getStringExtra("text") ?: "")
                put("timestampIso", intent.getStringExtra("timestampIso") ?: "")
            }
            val js = "window.dispatchEvent(new CustomEvent('kharchee:upi-notification', { detail: $payload }));"
            bridge?.webView?.post {
                bridge?.webView?.evaluateJavascript(js, null)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bridge?.webView?.addJavascriptInterface(KharcheeJSBridge(this), "KharcheeAndroidBridge")
        LocalBroadcastManager.getInstance(this).registerReceiver(
            upiReceiver,
            IntentFilter(UpiNotificationListenerService.ACTION_UPI_PAYMENT_NOTIFICATION)
        )
    }

    override fun onDestroy() {
        LocalBroadcastManager.getInstance(this).unregisterReceiver(upiReceiver)
        super.onDestroy()
    }

    class KharcheeJSBridge(private val context: Context) {
        @JavascriptInterface
        fun isNativeAndroid(): Boolean = true

        @JavascriptInterface
        fun isNotificationAccessGranted(): Boolean {
            val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
            return enabledPackages.contains(context.packageName)
        }

        @JavascriptInterface
        fun openNotificationAccessSettings() {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }
}
```

### 3.3 `AndroidManifest.xml` Service Registration

Add the following `<service>` inside `<application>` in `android/app/src/main/AndroidManifest.xml`:

```xml
<service
    android:name=".upi.UpiNotificationListenerService"
    android:label="Kharchee UPI Spending Alert Guard"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
</service>
```

---

## 4. Exact Steps to Build & Test the Android APK

1. **Install Capacitor CLI & Android Platform** (in your local checkout):
   ```bash
   npm install @capacitor/core @capacitor/android
   npm install -D @capacitor/cli
   ```
2. **Build the Kharchee Production Web Bundle**:
   ```bash
   npm run build
   ```
3. **Add & Sync the Android Native Project**:
   ```bash
   npx cap add android
   npx cap sync android
   ```
4. **Add the Kotlin Files & Manifest Entry**:
   - Place `UpiNotificationListenerService.kt` and update `MainActivity.kt` + `AndroidManifest.xml` as shown in Section 3.
5. **Run & Test on an Android Device**:
   ```bash
   npx cap open android
   ```
   - Build and install the debug APK on your phone from Android Studio.
   - Open Kharchee → tap **UPI Guard** in the top bar → enable **Explicit User Consent & Monitoring Toggle** → tap **Open Android Notification Access** and toggle on **Kharchee**.
   - Make a real UPI payment (or send a test notification) and verify that Kharchee parses it on-device, prevents duplicate alerts, checks your real remaining budget, and lets you edit or undo any false detection.
