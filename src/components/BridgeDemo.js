import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BridgeManager from '../bridge/BridgeManager';

const BridgeDemo = () => {
  useEffect(() => {
    console.log('=== 桥接通信演示开始 ===');
    
    // 自动执行两个案例的演示
    setTimeout(() => {
      testRNToAndroid();
    }, 1000);
    
    setTimeout(() => {
      testAndroidToRN();
    }, 3000);
  }, []);

  // 案例1：RN调用Android获取设备信息
  const testRNToAndroid = async () => {
    console.log('\n【案例1】RN调用Android获取设备信息：');
    try {
      const deviceInfo = await BridgeManager.getDeviceInfo();
      console.log('设备信息获取成功：', deviceInfo);
      console.log('- 品牌:', deviceInfo.brand);
      console.log('- 型号:', deviceInfo.model);
      console.log('- 系统版本:', deviceInfo.version);
      console.log('- SDK版本:', deviceInfo.sdk);
      console.log('- 制造商:', deviceInfo.manufacturer);
    } catch (error) {
      console.error('获取设备信息失败:', error);
    }
  };

  // 案例2：Android调用RN弹Toast
  const testAndroidToRN = () => {
    console.log('\n【案例2】触发Android调用RN：');
    console.log('调用Android原生方法，让Android发送消息到RN...');
    BridgeManager.triggerAndroidToast();
    console.log('已触发，等待Android响应...');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>桥接通信演示</Text>
      <Text style={styles.subtitle}>请查看控制台输出</Text>
      
      <TouchableOpacity style={styles.button} onPress={testRNToAndroid}>
        <Text style={styles.buttonText}>手动测试：RN→Android</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testAndroidToRN}>
        <Text style={styles.buttonText}>手动测试：Android→RN</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BridgeDemo;