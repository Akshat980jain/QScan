# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep ZXing classes
-keep class com.google.zxing.** { *; }

# Keep ML Kit classes
-keep class com.google.mlkit.** { *; }

# Keep Retrofit and OkHttp classes
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }

# Keep Gson classes
-keep class com.google.gson.** { *; }
