package com.demo

import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DeviceInfoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "DeviceInfoModule"
    }
    
    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        try {
            val deviceInfo = WritableNativeMap()
            deviceInfo.putString("brand", Build.BRAND)
            deviceInfo.putString("model", Build.MODEL)
            deviceInfo.putString("version", Build.VERSION.RELEASE)
            deviceInfo.putString("sdk", Build.VERSION.SDK_INT.toString())
            deviceInfo.putString("manufacturer", Build.MANUFACTURER)
            
            promise.resolve(deviceInfo)
        } catch (e: Exception) {
            promise.reject("DEVICE_INFO_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun triggerNativeToast() {
        showToastFromNative("这是从Android原生发送的消息!")
    }
    
    fun showToastFromNative(message: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("showToast", message)
    }
    
    companion object {
        private var instance: DeviceInfoModule? = null
        
        fun getInstance(): DeviceInfoModule? {
            return instance
        }
    }
    
    init {
        instance = this
    }
}