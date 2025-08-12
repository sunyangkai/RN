const { readJsonFile, writeJsonFile, getVersion } = require('../utils/file-utils');
const CONFIG = require('../utils/config');

/**
 * Manifest管理服务
 */

class ManifestService {
  // 获取现有manifest
  getManifest() {
    const manifest = readJsonFile(CONFIG.MANIFEST_PATH);
    
    if (manifest) {
      return manifest;
    }
    
    // 默认manifest结构
    return {
      version: getVersion(),
      updateType: "delta",
      fullBundle: {
        url: "",
        hash: "",
        size: 0
      },
      deltaUpdate: null,
    };
  }

  // 更新manifest
  updateManifest(manifestData) {
    writeJsonFile(CONFIG.MANIFEST_PATH, manifestData);
    console.log('📝 Manifest已更新');
  }

  // 创建更新manifest
  createUpdateManifest(currentVersion, previousVersion, bundleInfo, patchInfo) {
    return {
      version: currentVersion,
      updateType: "delta",
      fullBundle: {
        url: `${CONFIG.SERVER_BASE_URL}/bundles/${currentVersion}/${CONFIG.BUNDLE_FILE}`,
        hash: bundleInfo.hash,
        size: bundleInfo.size,
        previousHash: bundleInfo.previousHash
      },
      deltaUpdate: {
        patchUrl: `${CONFIG.SERVER_BASE_URL}/patches/${previousVersion}-to-${currentVersion}.patch`,
        patchHash: patchInfo.hash,
        patchSize: patchInfo.size,
        targetHash: bundleInfo.hash
      },
      fallback: {
        url: `${CONFIG.SERVER_BASE_URL}/bundles/${currentVersion}/${CONFIG.BUNDLE_FILE}`
      }
    };
  }
}

module.exports = ManifestService;