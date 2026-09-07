# Add project specific ProGuard rules here.
# See http://developer.android.com/guide/developing/tools/proguard.html

# Keep crash-report line numbers, hide original source file name
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ---------------------------------------------------------------------------
# Capacitor bridge / WebView JS interface
# (Capacitor's own consumer rules keep @CapacitorPlugin classes; these are
#  extra safety for the JS bridge and our custom native code.)
# ---------------------------------------------------------------------------
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class * extends android.webkit.WebChromeClient { *; }

# Our custom Capacitor plugins + Activity (referenced via reflection / manifest)
-keep class com.neverjod.app.** { *; }

# ---------------------------------------------------------------------------
# Google Play Billing (ships consumer rules; kept explicitly for safety)
# ---------------------------------------------------------------------------
-keep class com.android.billingclient.api.** { *; }
-dontwarn com.android.billingclient.**

# ---------------------------------------------------------------------------
# @capgo/capacitor-social-login transitive deps
# androidbrowserhelper (TWA/Custom Tabs fallback for Google Sign-In) uses
# reflection; keep it so the OAuth fallback path never breaks.
# ---------------------------------------------------------------------------
-keep class com.google.androidbrowserhelper.** { *; }
-dontwarn com.google.androidbrowserhelper.**

# Optional social-login providers that are NOT bundled in this build
-dontwarn com.facebook.**
-dontwarn com.twitter.**

# okhttp / okio (used by social-login OAuth2 token endpoints)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
