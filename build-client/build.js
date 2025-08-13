const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { ensureDir, getVersion, readJsonFile, writeJsonFile } = require('./file-utils');
const { calculateHash } = require('./hash-utils');
const CONFIG = require('./config');
const DiffService = require('./diff-service');

/**
 * 核心构建逻辑
 */

/**
 * 获取manifest文件
 */
function getManifest() {
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

/**
 * 更新manifest文件
 */
function updateManifest(manifestData) {
  writeJsonFile(CONFIG.MANIFEST_PATH, manifestData);
  console.log('📝 Manifest已更新');
}

/**
 * 创建更新manifest（统一处理全量和差量）
 * @param {Object} result - 构建结果对象，包含version, bundleInfo, patchInfo?, previousVersion?
 */
function createUpdateManifest(result) {
  const { version, bundleInfo, patchInfo, previousVersion } = result;
  
  const manifest = {
    version: version,
    updateType: patchInfo ? "delta" : "full",
    fullBundle: {
      url: `${CONFIG.SERVER_BASE_URL}/bundles/${version}/${CONFIG.BUNDLE_FILE}`,
      hash: bundleInfo.hash,
      size: bundleInfo.size
    },
    fallback: {
      url: `${CONFIG.SERVER_BASE_URL}/bundles/${version}/${CONFIG.BUNDLE_FILE}`
    }
  };

  // 如果有补丁信息，则添加差量更新和previousHash
  if (patchInfo && previousVersion) {
    manifest.fullBundle.previousHash = bundleInfo.previousHash;
    manifest.deltaUpdate = {
      patchUrl: `${CONFIG.SERVER_BASE_URL}/patches/${previousVersion}-to-${version}.patch`,
      patchHash: patchInfo.hash,
      patchSize: patchInfo.size,
      targetHash: bundleInfo.hash
    };
  } else {
    manifest.deltaUpdate = null;
  }

  return manifest;
}

/**
 * 构建Bundle包
 */
async function buildBundle() {
  try {
    console.log('开始构建Bundle包...');
    
    const version = getVersion();
    console.log(`当前版本: ${version}`);
    
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
    
    console.log(`✅ 构建完成！`);
    console.log(`📁 Bundle路径: ${versionBundlePath}`);
    console.log(`📊 文件大小: ${bundleSize} 字符`);
    console.log(`🔒 文件哈希: ${bundleHash}`);
    
    return {
      version,
      bundlePath: versionBundlePath,
      bundleInfo: {
        hash: bundleHash,
        size: bundleSize
      }
    };
    
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    throw error;
  }
}

/**
 * 构建差量补丁包
 */
async function buildPatch() {
  try {
    console.log('🔧 开始生成补丁包...');
    
    const currentVersion = getVersion();
    console.log(`📦 更新版本: ${currentVersion}`);
    ensureDir(CONFIG.PATCHES_DIR);
    
    const manifest = getManifest();
    const previousVersion = manifest.version;
    
    console.log(previousVersion, currentVersion)
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
    console.log('🔧 使用diff服务生成补丁...');
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
    
    console.log(`📁 补丁文件: ${finalPatchPath}`);
    
    // 计算相关哈希信息
    const patchContent = fs.readFileSync(finalPatchPath, 'utf8');
    const patchHash = calculateHash(patchContent);
    
    const newBundleContent = fs.readFileSync(newBundlePath, 'utf8');
    const newBundleSize = newBundleContent.length;
    const newBundleHash = calculateHash(newBundleContent);
    
    const oldBundleContent = fs.readFileSync(oldBundlePath, 'utf8');
    const previousHash = calculateHash(oldBundleContent);
    
    console.log('✅ 补丁包生成完成！');
    console.log(`📊 补丁大小: ${patchResult.stats.patchSize} 字符`);
    console.log(`📈 大小比例: ${(patchResult.stats.sizeRatio * 100).toFixed(1)}%`);
    console.log(`🔧 操作数量: ${patchResult.stats.operationsCount}`);
    
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
      stats: patchResult.stats
    };
    
  } catch (error) {
    console.error('❌ 补丁生成失败:', error.message);
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
      console.log('🔧 开始构建差量包...');
      
      // 构建差量包：先构建新版本，再生成补丁
      console.log('\n=== 第一步：构建新版本 ===');
      const buildResult = await buildBundle();
      
      console.log('\n=== 第二步：生成差量补丁 ===');
      const patchResult = await buildPatch();
      
      console.log('\n🎉 差量包构建完成！');
      console.log(`📦 版本: ${buildResult.version}`);
      if (patchResult) {
        console.log(`🔧 补丁: ${patchResult.patchPath}`);
        console.log(`📊 补丁大小: ${patchResult.stats.patchSize} 字符`);
        console.log(`📈 大小比例: ${(patchResult.stats.sizeRatio * 100).toFixed(1)}%`);
        
        // 生成差量包manifest
        const updatedManifest = createUpdateManifest(patchResult);
        
        updateManifest(updatedManifest);
        console.log(`📝 Manifest已更新`);
      }
      
      return {
        type: 'patch',
        build: buildResult,
        patch: patchResult
      };
      
    } else {
      console.log('📦 开始构建全量包...');
      
      const buildResult = await buildBundle();
      
      // 生成全量包manifest
      const fullBundleManifest = createUpdateManifest(buildResult);
      
      updateManifest(fullBundleManifest);
      
      console.log('\n🎉 全量包构建完成！');
      console.log(`📦 版本: ${buildResult.version}`);
      console.log(`📁 Bundle: ${buildResult.bundlePath}`);
      console.log(`📊 文件大小: ${buildResult.bundleInfo.size} 字符`);
      console.log(`📝 Manifest已生成`);
      
      return {
        type: 'full',
        build: buildResult
      };
    }
    
  } catch (error) {
    console.error('❌ OTA构建失败:', error.message);
    throw error;
  }
}

module.exports = { buildBundle, buildPatch, buildOTA };