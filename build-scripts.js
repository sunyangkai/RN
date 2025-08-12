const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const CryptoJS = require('crypto-js');

/**
 * 构建脚本工具
 */

const CONFIG = {
  CDN_MOCK_DIR: './cdn-mock',
  BUNDLES_DIR: './cdn-mock/bundles',
  PATCHES_DIR: './cdn-mock/patches',
  MANIFEST_PATH: './cdn-mock/manifest.json',
  BUNDLE_FILE: 'index.android.bundle',
  ASSETS_DIR: './cdn-mock/assets',
  JAVA_SERVICE_URL: 'http://localhost:8082', // Java服务端地址
  SERVER_BASE_URL: 'http://localhost:8082'   // 客户端访问地址（同Java服务）
};

// 计算文件哈希（与Java服务端保持一致）
function calculateHash(content) {
  return 'sha256:' + CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
}

// 启动Java服务端
async function startJavaService() {
  console.log('🚀 启动Java服务端...');
  const { spawn } = require('child_process');
  
  const javaProcess = spawn('java', [
    '-jar',
    './build-server/target/diff-service-client-1.0.0.jar',
    '8082'
  ], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  javaProcess.stdout.on('data', (data) => {
    console.log(`[Java] ${data.toString().trim()}`);
  });
  
  javaProcess.stderr.on('data', (data) => {
    console.error(`[Java Error] ${data.toString().trim()}`);
  });
  
  // 等待服务启动
  await new Promise((resolve, reject) => {
    const checkService = async () => {
      try {
        await axios.get(`${CONFIG.JAVA_SERVICE_URL}/health`, { timeout: 1000 });
        console.log('✅ Java服务启动成功');
        resolve();
      } catch (error) {
        setTimeout(checkService, 1000);
      }
    };
    
    setTimeout(() => reject(new Error('Java服务启动超时')), 30000);
    setTimeout(checkService, 2000); // 给服务2秒启动时间
  });
  
  return javaProcess;
}

// 调用Java服务生成补丁
async function generatePatchViaJavaService(oldBundlePath, newBundlePath, outputDir) {
  try {
    console.log('🔧 调用Java服务生成补丁...');
    
    const response = await axios.post(`${CONFIG.JAVA_SERVICE_URL}/api/diff/generate-patch`, {
      oldFile: path.resolve(oldBundlePath).replace(/\\/g, '/'),
      newFile: path.resolve(newBundlePath).replace(/\\/g, '/'),
      outputDir: path.resolve(outputDir).replace(/\\/g, '/')
    }, {
      timeout: 60000, // 60秒超时
      headers: { 'Content-Type': 'application/json' }
    });
    
    return response.data;
    
  } catch (error) {
    if (error.response) {
      throw new Error(`Java服务错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('Java服务无响应');
    } else {
      throw new Error(`请求失败: ${error.message}`);
    }
  }
}


function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}


function getVersion() {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  return packageJson.version;
}

function getManifest() {
  if (fs.existsSync(CONFIG.MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG.MANIFEST_PATH, 'utf8'));
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

/**
 * buildmock 命令 - 生成打包产物
 */
async function buildMock() {
  try {
    console.log('开始构建mock版本...');
    
    const version = getVersion();
    console.log(`当前版本: ${version}`);
    
    // 确保目录存在
    ensureDir(CONFIG.CDN_MOCK_DIR);
    ensureDir(CONFIG.ASSETS_DIR);
    ensureDir(path.join(CONFIG.BUNDLES_DIR, version));
    
    // 执行React Native打包
    console.log('执行React Native打包...');
    execSync(`npx react-native bundle --entry-file index.js --platform android --dev false --bundle-output ${CONFIG.CDN_MOCK_DIR}/${CONFIG.BUNDLE_FILE} --assets-dest ${CONFIG.ASSETS_DIR}/`, {
      stdio: 'inherit'
    });
    
    // 复制bundle到版本目录
    const versionBundlePath = path.join(CONFIG.BUNDLES_DIR, version, CONFIG.BUNDLE_FILE);
    fs.copyFileSync(
      path.join(CONFIG.CDN_MOCK_DIR, CONFIG.BUNDLE_FILE),
      versionBundlePath
    );
    
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
      size: bundleSize,
      hash: bundleHash
    };
    
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    throw error;
  }
}

/**
 * buildmockpath 命令 - 生成补丁包和manifest
 */
async function buildMockPath() {
  try {
    console.log('🔧 开始生成补丁包...');
    
    const currentVersion = getVersion();
    console.log(`📦 更新版本: ${currentVersion}`);
    ensureDir(CONFIG.PATCHES_DIR);
    
    // 获取现有manifest
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
      console.error(`找不到旧版本bundle: ${oldBundlePath}`);
      throw new Error('旧版本bundle不存在');
    }
    
    if (!fs.existsSync(newBundlePath)) {
      console.error(`找不到新版本bundle: ${newBundlePath}`);
      console.log('💡 请先运行 npm run buildmock 生成新版本');
      throw new Error('新版本bundle不存在');
    }
    
    // 启动Java服务
    const javaProcess = await startJavaService();
    
    let patchResult;
    try {
      // 生成补丁
      console.log('生成补丁文件...');
      patchResult = await generatePatchViaJavaService(oldBundlePath, newBundlePath, CONFIG.PATCHES_DIR);
    } finally {
      // 确保Java服务关闭
      if (javaProcess) {
        javaProcess.kill();
      }
    }
    
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
    
    // 计算补丁文件hash
    const patchContent = fs.readFileSync(finalPatchPath, 'utf8');
    const patchHash = calculateHash(patchContent);
    
    // 获取新版本bundle信息
    const newBundleContent = fs.readFileSync(newBundlePath, 'utf8');
    const newBundleSize = newBundleContent.length;
    const newBundleHash = calculateHash(newBundleContent);
    
    // 获取旧版本bundle哈希作为previousHash
    const oldBundleContent = fs.readFileSync(oldBundlePath, 'utf8');
    const previousHash = calculateHash(oldBundleContent);
    
    // 更新manifest
    console.log('📝 更新manifest...');
    const updatedManifest = {
      version: currentVersion,
      updateType: "delta",
      fullBundle: {
        url: `${CONFIG.SERVER_BASE_URL}/bundles/${currentVersion}/${CONFIG.BUNDLE_FILE}`,
        hash: newBundleHash,
        size: newBundleSize,
        previousHash: previousHash
      },
      deltaUpdate: {
        patchUrl: `${CONFIG.SERVER_BASE_URL}/patches/${patchFileName}`,
        patchHash: patchHash,
        patchSize: patchResult.stats.patchSize,
        targetHash: newBundleHash
      },
      fallback: {
        url: `${CONFIG.SERVER_BASE_URL}/bundles/${currentVersion}/${CONFIG.BUNDLE_FILE}`
      }
    };
    
    fs.writeFileSync(CONFIG.MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2));
    
    console.log('✅ 补丁包生成完成！');
    console.log(`📊 补丁大小: ${patchResult.stats.patchSize} 字符`);
    console.log(`📈 大小比例: ${(patchResult.stats.sizeRatio * 100).toFixed(1)}%`);
    console.log(`🔧 操作数量: ${patchResult.stats.operationsCount}`);
    console.log(`📝 Manifest已更新`);
    
    return {
      patchPath: finalPatchPath,
      manifest: updatedManifest,
      stats: patchResult.stats
    };
    
  } catch (error) {
    console.error('❌ 补丁生成失败:', error.message);
    throw error;
  }
}

// 命令行调用
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'buildmock':
      buildMock().catch(process.exit);
      break;
    case 'buildmockpath':
      buildMockPath().catch(process.exit);
      break;
    default:
      console.log('使用方式:');
      console.log('  node build-scripts.js buildmock      # 生成打包产物');
      console.log('  node build-scripts.js buildmockpath  # 生成补丁包和manifest');
      break;
  }
}

module.exports = { buildMock, buildMockPath };