/**
 * 构建配置
 */

const CONFIG = {
  // 构建产物输出目录
  BUILD_DIR: '../build',
  BUNDLES_DIR: '../build/bundles',
  PATCHES_DIR: '../build/patches',
  MANIFEST_PATH: '../build/manifest.json',
  ASSETS_DIR: '../build/assets',
  
  // 原cdn-mock目录（保留兼容性）
  CDN_MOCK_DIR: '../cdn-mock',
  
  BUNDLE_FILE: 'index.android.bundle',
  SERVER_BASE_URL: 'http://localhost:8040'  // 客户端访问地址
};

module.exports = CONFIG;