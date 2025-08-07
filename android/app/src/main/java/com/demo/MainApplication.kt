package com.demo

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import java.io.File
import android.util.Log


class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // add(MyReactNativePackage())
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED

            // 重写getjsboundle 检查是否存在本地热更新jsboundle
            override fun getJSBundleFile(): String? {
                val bundleFile = File(applicationContext.filesDir, "hotupdate.bundle")
                
                return if (bundleFile.exists()) {
                    Log.d("fetchJsBoundle", "Loading local hotupdate.bundle: ${bundleFile.absolutePath}")
                    bundleFile.absolutePath
                } else {
                    Log.d("fetchJsBoundle", "No hotupdate.bundle found, falling back to default")
                    super.getJSBundleFile()
                }
            }
        }

    override val reactHost: ReactHost

    
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
    }
}