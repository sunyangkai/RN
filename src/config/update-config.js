/**
 * 热更新配置管理
 */

// 服务器域名配置
const SERVER_DOMAINS = {
  DEV: 'http://localhost:8040',
  PROD: 'https://your-production-server.com'
};

// 接口路径配置
const API_PATHS = {
  MANIFEST: '/manifest.json',
  BUNDLES: '/bundles',
  PATCHES: '/patches'
};

// 构建配置对象的辅助函数
function buildConfig(serverDomain) {
  return {
    SERVER_BASE_URL: serverDomain,
    MANIFEST_URL: `${serverDomain}${API_PATHS.MANIFEST}`,
    BUNDLES_BASE_URL: `${serverDomain}${API_PATHS.BUNDLES}`,
    PATCHES_BASE_URL: `${serverDomain}${API_PATHS.PATCHES}`
  };
}

// 开发环境配置
const DEV_CONFIG = buildConfig(SERVER_DOMAINS.DEV);

// 生产环境配置
const PROD_CONFIG = buildConfig(SERVER_DOMAINS.PROD);

// 根据环境选择配置
const isDevelopment = __DEV__;
export const UPDATE_CONFIG = isDevelopment ? DEV_CONFIG : PROD_CONFIG;

// 导出配置项
export const {
  SERVER_BASE_URL,
  MANIFEST_URL,
  BUNDLES_BASE_URL,
  PATCHES_BASE_URL
} = UPDATE_CONFIG;

// 导出域名和路径常量，便于其他模块使用
export { SERVER_DOMAINS, API_PATHS };

// 导出配置构建函数，便于测试或特殊场景使用
export { buildConfig };

export default UPDATE_CONFIG;