/**
 * 构建配置
 */

const { getLocalIP } = require('./file-utils');

const CONFIG = {
  // 构建产物输出目录
  BUILD_DIR: './build',
  BUNDLES_DIR: './build/bundles',
  PATCHES_DIR: './build/patches',
  MANIFEST_PATH: './build/manifest.json',
  ASSETS_DIR: './build/assets',
  
  BUNDLE_FILE: 'index.android.bundle',
  // 动态获取本地IP，确保React Native可以访问
  get SERVER_BASE_URL() {
    const localIP = getLocalIP();
    return `http://${localIP}:8040`;
  }
};

module.exports = CONFIG;