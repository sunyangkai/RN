/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import { checkAndUpdateBundle } from './hot-update-manager';

async function startApp() {
    const { default: App } = require('./App');
    AppRegistry.registerComponent(appName, () => App);
    
    // 测试gzip压缩的热更新 - 修复哈希计算
    console.log('App启动 - gzip压缩版本测试（修复哈希）');
    checkAndUpdateBundle();
}

// 启动应用
startApp();