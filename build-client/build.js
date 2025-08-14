const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { ensureDir, getVersion, readJsonFile, writeJsonFile } = require('./file-utils');
const { calculateHash, calculateBinaryHash } = require('./hash-utils');
const CONFIG = require('./config');
const DiffService = require('./diff-service');
const CompressionUtils = require('./compression-utils');


async function buildBundle() {
  try {    
    const version = getVersion();
    console.log(`当前版本: ${version}`, '开始构建Bundle包...');

    // 确保目录存在
    ensureDir(CONFIG.BUILD_DIR);
    ensureDir(CONFIG.ASSETS_DIR);
    ensureDir(path.join(CONFIG.BUNDLES_DIR, version));
    
    // 执行React Native打包，直接输出到版本目录
    console.log('执行React Native打包...');
    const versionBundlePath = path.join(CONFIG.BUNDLES_DIR, version, CONFIG.BUNDLE_FILE);
    const assetsPath = path.resolve('.', CONFIG.ASSETS_DIR);
    execSync(`npx react-native bundle --entry-file index.js --platform android --dev false --bundle-output "${versionBundlePath}" --assets-dest "${assetsPath}/"`, {
      stdio: 'inherit',
      cwd: '.' // 在当前目录执行
    });
    
    // 计算文件大小和哈希
    const bundleContent = fs.readFileSync(versionBundlePath, 'utf8');
    const bundleSize = bundleContent.length;
    const bundleHash = calculateHash(bundleContent);
    
    console.log(`[OK] 构建完成！`);
    console.log(`[PATH] Bundle路径: ${versionBundlePath}`);
    console.log(`[SIZE] 文件大小: ${CompressionUtils.formatBytes(bundleSize)}`);
    console.log(`[HASH] 文件哈希: ${bundleHash}`);
    
    // 压缩Bundle文件
    console.log('\n=== 压缩Bundle文件 ===');
    const compressionResult = await CompressionUtils.compressFile(versionBundlePath);
    
    let compressedInfo = null;
    if (compressionResult.success) {
      const compressedBuffer = fs.readFileSync(compressionResult.compressedPath);
      const compressedHash = calculateBinaryHash(compressedBuffer);
      compressedInfo = {
        path: compressionResult.compressedPath,
        hash: compressedHash,
        size: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio
      };
    }
    
    return {
      version,
      bundlePath: versionBundlePath,
      bundleInfo: {
        hash: bundleHash,
        size: bundleSize
      },
      compressedBundle: compressedInfo
    };
    
  } catch (error) {
    console.error('[ERROR] 构建失败:', error.message);
    throw error;
  }
}

async function buildPatch() {
  try {    
    const currentVersion = getVersion();
    console.log(`[PACK] 更新版本: ${currentVersion}`, '[BUILD] 开始生成补丁包...');
    ensureDir(CONFIG.PATCHES_DIR);
    
    const manifest = getManifest();
    const previousVersion = manifest.version;
    
    if (previousVersion === currentVersion) {
      console.log('版本未变化，无需生成补丁');
      return;
    }
    
    console.log(`从版本 ${previousVersion} 更新到 ${currentVersion}`);
    
    // 检查文件是否存在
    const oldBundlePath = path.join(CONFIG.BUNDLES_DIR, previousVersion, CONFIG.BUNDLE_FILE);
    const newBundlePath = path.join(CONFIG.BUNDLES_DIR, currentVersion, CONFIG.BUNDLE_FILE);
    
    if (!fs.existsSync(oldBundlePath)) {
      throw new Error(`找不到旧版本bundle: ${oldBundlePath}`);
    }
    
    if (!fs.existsSync(newBundlePath)) {
      console.log('💡 请先运行 npm run buildmock 生成新版本');
      throw new Error('新版本bundle不存在');
    }
    
    // 使用diff服务生成补丁
    console.log('[BUILD] 使用diff服务生成补丁...');
    const diffService = new DiffService();
    const patchResult = await diffService.generatePatch(oldBundlePath, newBundlePath, CONFIG.PATCHES_DIR);
    
    if (!patchResult.success) {
      if (patchResult.reason === 'patch_too_large') {
        console.log('📊 补丁过大，建议使用完整下载');
        console.log(`📈 补丁大小比例: ${(patchResult.stats.sizeRatio * 100).toFixed(1)}%`);
      }
      throw new Error(patchResult.error || '补丁生成失败');
    }
    
    // 重命名补丁文件
    const patchFileName = `${previousVersion}-to-${currentVersion}.patch`;
    const finalPatchPath = path.join(CONFIG.PATCHES_DIR, patchFileName);
    fs.renameSync(patchResult.patchFilePath, finalPatchPath);
    
    console.log(`[PATH] 补丁文件: ${finalPatchPath}`);
    
    // 压缩补丁文件
    console.log('\n=== 压缩补丁文件 ===');
    const patchCompressionResult = await CompressionUtils.compressFile(finalPatchPath);
    
    // 计算相关哈希信息
    const patchContent = fs.readFileSync(finalPatchPath, 'utf8');
    const patchHash = calculateHash(patchContent);
    
    let compressedPatchInfo = null;
    if (patchCompressionResult.success) {
      const compressedPatchBuffer = fs.readFileSync(patchCompressionResult.compressedPath);
      const compressedPatchHash = calculateBinaryHash(compressedPatchBuffer);
      compressedPatchInfo = {
        path: patchCompressionResult.compressedPath,
        hash: compressedPatchHash,
        size: patchCompressionResult.compressedSize,
        compressionRatio: patchCompressionResult.compressionRatio
      };
    }
    
    const newBundleContent = fs.readFileSync(newBundlePath, 'utf8');
    const newBundleSize = newBundleContent.length;
    const newBundleHash = calculateHash(newBundleContent);
    
    const oldBundleContent = fs.readFileSync(oldBundlePath, 'utf8');
    const previousHash = calculateHash(oldBundleContent);
    
    console.log('[OK] 补丁包生成完成!', 
      `   补丁大小: ${CompressionUtils.formatBytes(patchResult.stats.patchSize)}`, 
      `,  变更比例: ${(patchResult.stats.sizeRatio * 100).toFixed(1)}%`,
      `,  操作数量: ${patchResult.stats.operationsCount}`
    );
    
    if (compressedPatchInfo) {
      console.log(`[GZIP] 压缩后大小: ${CompressionUtils.formatBytes(compressedPatchInfo.size)}`);
      console.log(`[GZIP] 压缩率: ${compressedPatchInfo.compressionRatio.toFixed(1)}%`);
    }    
    return {
      version: currentVersion,
      previousVersion,
      patchPath: finalPatchPath,
      bundleInfo: {
        hash: newBundleHash,
        size: newBundleSize,
        previousHash: previousHash
      },
      patchInfo: {
        hash: patchHash,
        size: patchResult.stats.patchSize
      },
      compressedPatch: compressedPatchInfo,
      stats: patchResult.stats
    };
    
  } catch (error) {
    console.error('[ERROR] 补丁生成失败:', error.message);
    throw error;
  }
}

/**
 * build-OTA 命令 - 统一OTA构建入口
 * @param {Object} options - 构建选项
 * @param {string} options.type - 构建类型: 'patch' 为差量包，其他为全量包
 */
async function buildOTA(options = {}) {
  const { type } = options;
  
  try {
    if (type === 'patch') {
      console.log('[BUILD] 开始构建差量包...');
      
      // 构建差量包：先构建新版本，再生成补丁
      console.log('\n=== 第一步：构建新版本 ===');
      const buildResult = await buildBundle();
      
      console.log('\n=== 第二步：生成差量补丁 ===');
      const patchResult = await buildPatch();
      
      console.log('\n[DONE] 差量包构建完成！');
      console.log(`[PACK] 版本: ${buildResult.version}`);
      if (patchResult) {
        console.log(`[BUILD] 补丁: ${patchResult.patchPath}`);
        console.log(`[SIZE] 补丁大小: ${patchResult.stats.patchSize} 字符`);
        console.log(`[RATIO] 大小比例: ${(patchResult.stats.sizeRatio * 100).toFixed(1)}%`);
        const updatedManifest = createUpdateManifest(patchResult);
        updateManifest(updatedManifest);
      }
      
      return {
        type: 'patch',
        build: buildResult,
        patch: patchResult
      };
      
    } else {
      console.log('[PACK] 开始构建全量包...');
      const buildResult = await buildBundle();
      const fullBundleManifest = createUpdateManifest(buildResult);
      
      updateManifest(fullBundleManifest);
      
      console.log('\n[DONE] 全量包构建完成！');
      console.log(`[PACK] 版本: ${buildResult.version}`);
      console.log(`[PATH] Bundle: ${buildResult.bundlePath}`);
      console.log(`[SIZE] 文件大小: ${buildResult.bundleInfo.size} 字符`);
      console.log(`[MANIFEST] 已生成`);
      
      return {
        type: 'full',
        build: buildResult
      };
    }
    
  } catch (error) {
    console.error('[ERROR] OTA构建失败:', error.message);
    throw error;
  }
}

function getManifest() {
  const manifest = readJsonFile(CONFIG.MANIFEST_PATH);
  if (manifest) {
    return manifest;
  }
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

function updateManifest(manifestData) {
  writeJsonFile(CONFIG.MANIFEST_PATH, manifestData);
  console.log('[MANIFEST] 已更新');
}

// 创建更新manifest（统一处理全量和差量）
function createUpdateManifest(result) {
  const { version, bundleInfo, patchInfo, previousVersion, compressedBundle, compressedPatch } = result;
  
  const manifest = {
    version: version,
    updateType: patchInfo ? "delta" : "full",
    compression: "gzip",
    fullBundle: {
      url: `${CONFIG.SERVER_BASE_URL}/bundles/${version}/${CONFIG.BUNDLE_FILE}`,
      hash: bundleInfo.hash,
      size: bundleInfo.size
    },
    fallback: {
      url: `${CONFIG.SERVER_BASE_URL}/bundles/${version}/${CONFIG.BUNDLE_FILE}`
    }
  };

  // 添加压缩Bundle信息
  if (compressedBundle) {
    manifest.fullBundle.compressed = {
      url: `${CONFIG.SERVER_BASE_URL}/bundles/${version}/${CONFIG.BUNDLE_FILE}.gz`,
      hash: compressedBundle.hash,
      size: compressedBundle.size,
      compressionRatio: compressedBundle.compressionRatio
    };
  }

  // 如果有补丁信息，则添加差量更新和previousHash
  if (patchInfo && previousVersion) {
    manifest.fullBundle.previousHash = bundleInfo.previousHash;
    manifest.deltaUpdate = {
      patchUrl: `${CONFIG.SERVER_BASE_URL}/patches/${previousVersion}-to-${version}.patch`,
      patchHash: patchInfo.hash,
      patchSize: patchInfo.size,
      targetHash: bundleInfo.hash
    };

    // 添加压缩补丁信息
    if (compressedPatch) {
      manifest.deltaUpdate.compressed = {
        patchUrl: `${CONFIG.SERVER_BASE_URL}/patches/${previousVersion}-to-${version}.patch.gz`,
        patchHash: compressedPatch.hash,
        patchSize: compressedPatch.size,
        compressionRatio: compressedPatch.compressionRatio
      };
    }
  } else {
    manifest.deltaUpdate = null;
  }

  return manifest;
}


module.exports = { buildBundle, buildPatch, buildOTA };