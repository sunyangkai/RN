import { NativeModules, DeviceEventEmitter } from 'react-native';

const { DeviceInfoModule } = NativeModules;

class BridgeManager {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    DeviceEventEmitter.addListener('showToast', (message) => {
      console.log('📱 收到Android消息:', message);
      console.log('✅ Android→RN 通信成功！');
    });
  }

  async getDeviceInfo() {
    try {
      console.log('📞 调用Android原生方法...');
      const deviceInfo = await DeviceInfoModule.getDeviceInfo();
      console.log('✅ RN→Android 通信成功！');
      return deviceInfo;
    } catch (error) {
      console.error('❌ 获取设备信息失败:', error);
      throw error;
    }
  }

  triggerAndroidToast() {
    try {
      DeviceInfoModule.triggerNativeToast();
    } catch (error) {
      console.error('❌ 触发Android Toast失败:', error);
    }
  }

  removeListeners() {
    DeviceEventEmitter.removeAllListeners('showToast');
  }
}

export default new BridgeManager();