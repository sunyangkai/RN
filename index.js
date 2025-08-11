/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import { checkAndUpdateBundle } from './hot-update-manager';

async function startApp() {
    const { default: App } = require('./App');
    AppRegistry.registerComponent(appName, () => App);
    
    // 仍然检查bundle更新
    checkAndUpdateBundle();
}

// 启动应用
startApp();