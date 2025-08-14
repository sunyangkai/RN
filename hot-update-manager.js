import RNFS from 'react-native-fs';
import { Alert, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';
import CryptoJS from 'crypto-js';
import { MANIFEST_URL } from './src/config/update-config';

const { PatchApplier } = NativeModules;
const BUNDLE_LOCAL_PATH = `${RNFS.DocumentDirectoryPath}/hotupdate.bundle`; // 本地上一个版本的资源文件
const BUNDLE_TEMP_PATH = `${RNFS.DocumentDirectoryPath}/hotupdate.bundle.tmp`; // 通过本次热更新生成的临时资源文件
const PATCH_TEMP_PATH = `${RNFS.DocumentDirectoryPath}/hotupdate.patch.tmp`; // 补丁文件被写入这个本地路径
const COMPRESSED_BUNDLE_TEMP_PATH = `${RNFS.DocumentDirectoryPath}/hotupdate.bundle.gz.tmp`; // 压缩bundle临时文件
const COMPRESSED_PATCH_TEMP_PATH = `${RNFS.DocumentDirectoryPath}/hotupdate.patch.gz.tmp`; // 压缩patch临时文件
const VERSION_KEY = 'hotupdate_version';

async function cleanupTempFiles() {
  try {
    const tempFiles = [
      BUNDLE_TEMP_PATH,
      PATCH_TEMP_PATH,
      COMPRESSED_BUNDLE_TEMP_PATH,
      COMPRESSED_PATCH_TEMP_PATH
    ];
    
    for (const filePath of tempFiles) {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath);
        console.log(`🧹 清理临时文件: ${filePath.split('/').pop()}`);
      }
    }
  } catch (error) {
    console.warn('清理临时文件失败:', error);
  }
}

// 计算文件哈希（文本文件）
async function calculateFileHash(filePath) {
  try {
    if (!(await RNFS.exists(filePath))) return null;
    const fileContent = await RNFS.readFile(filePath, 'utf8');// 使用与服务端一致的哈希计算方式 - 转换为hex格式
    return 'sha256:' + CryptoJS.SHA256(fileContent).toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('计算文件哈希失败:', error);
    return null;
  }
}

// 计算二进制文件哈希（如gzip文件）
async function calculateBinaryFileHash(filePath) {
  try {
    if (!(await RNFS.exists(filePath))) return null;
    const fileContent = await RNFS.readFile(filePath, 'base64');
    // 将base64转换为WordArray后计算哈希
    const wordArray = CryptoJS.enc.Base64.parse(fileContent);
    return 'sha256:' + CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('计算二进制文件哈希失败:', error);
    return null;
  }
}

// 优先下载压缩文件（如果可用）
async function downloadFileWithCompression(manifest, fileType, tempPath, compressedTempPath) {
  let downloadInfo;
  let useCompression = false;
  
  if (fileType === 'bundle' && manifest.fullBundle?.compressed) {
    // 优先下载压缩Bundle
    downloadInfo = {
      url: manifest.fullBundle.compressed.url,
      expectedHash: manifest.fullBundle.compressed.hash,
      expectedSize: manifest.fullBundle.compressed.size
    };
    useCompression = true;
    console.log('📦 使用gzip压缩Bundle下载');
  } else if (fileType === 'patch' && manifest.deltaUpdate?.compressed) {
    // 优先下载压缩Patch
    downloadInfo = {
      url: manifest.deltaUpdate.compressed.patchUrl,
      expectedHash: manifest.deltaUpdate.compressed.patchHash,
      expectedSize: manifest.deltaUpdate.compressed.patchSize
    };
    useCompression = true;
    console.log('📦 使用gzip压缩Patch下载');
  } else {
    // 回退到未压缩版本
    if (fileType === 'bundle') {
      downloadInfo = {
        url: manifest.fullBundle.url,
        expectedHash: manifest.fullBundle.hash,
        expectedSize: manifest.fullBundle.size
      };
    } else if (fileType === 'patch') {
      downloadInfo = {
        url: manifest.deltaUpdate.patchUrl,
        expectedHash: manifest.deltaUpdate.patchHash,
        expectedSize: manifest.deltaUpdate.patchSize
      };
    }
    console.log(`📦 使用未压缩${fileType}下载`);
  }
  
  const targetTempPath = useCompression ? compressedTempPath : tempPath;
  
  // 下载文件
  console.log(`⬇️ 开始下载${fileType}: ${downloadInfo.url}`);
  const downloadResult = await RNFS.downloadFile({
    fromUrl: downloadInfo.url,
    toFile: targetTempPath,
  }).promise;
  
  if (downloadResult.statusCode !== 200) {
    throw new Error(`下载失败，状态码: ${downloadResult.statusCode}`);
  }
  
  // 验证下载文件（根据文件类型选择哈希计算方法）
  const downloadedHash = useCompression 
    ? await calculateBinaryFileHash(targetTempPath)
    : await calculateFileHash(targetTempPath);
    
  if (downloadedHash !== downloadInfo.expectedHash) {
    console.error(`${fileType}哈希验证失败:`, {
      expected: downloadInfo.expectedHash,
      actual: downloadedHash,
      useCompression: useCompression,
      filePath: targetTempPath
    });
    throw new Error(`${fileType}文件哈希验证失败`);
  }
  
  // 如果是压缩文件，需要解压
  if (useCompression) {
    console.log(`📦 解压${fileType}文件...`);
    const decompressResult = await PatchApplier.decompressGzipFile(targetTempPath, tempPath);
    
    if (!decompressResult.success) {
      throw new Error(`解压${fileType}失败`);
    }
    
    console.log(`✅ ${fileType}解压成功，原始大小: ${Math.round(decompressResult.originalSize)} bytes, 解压后: ${Math.round(decompressResult.decompressedSize)} bytes`);
    
    // 清理压缩文件
    await RNFS.unlink(targetTempPath);
  }
  
  return {
    success: true,
    tempPath: tempPath,
    useCompression: useCompression,
    downloadedSize: downloadResult.bytesWritten
  };
}

// 应用补丁到bundle文件
async function applyPatch(oldBundlePath, patchPath, outputPath, manifest) {
  try {
    const patchContent = await RNFS.readFile(patchPath, 'utf8');
    
    // 检测补丁类型
    let patchType;
    let patch;
    
    try {
      // 尝试解析为JSON（delta_patch格式）
      patch = JSON.parse(patchContent);
      patchType = patch.type || 'delta_patch';
    } catch (jsonError) {
      // 如果不是JSON，检查是否为unified diff格式
      if (patchContent.includes('@@') && (patchContent.includes('---') || patchContent.includes('+++'))) {
        patchType = 'unified_diff';
      } else {
        throw new Error('无法识别的补丁格式');
      }
    }
    
    console.log(`📋 检测到补丁类型: ${patchType}`);
    
    if (patchType === 'unified_diff') {
      // 使用Android原生模块应用unified diff补丁
      return await applyUnifiedDiffPatch(oldBundlePath, patchContent, outputPath, manifest);
    } else if (patchType === 'delta_patch') {
      // 使用现有的delta补丁逻辑
      return await applyDeltaPatch(oldBundlePath, patch, outputPath);
    } else {
      throw new Error(`不支持的补丁类型: ${patchType}`);
    }
    
  } catch (error) {
    console.error('应用补丁失败:', error);
    return false;
  }
}

// 使用Android原生模块应用unified diff补丁
async function applyUnifiedDiffPatch(oldBundlePath, patchContent, outputPath, manifest) {
  try {
    console.log('🔧 使用原生模块应用unified diff补丁...');
    
    // 首先验证补丁格式
    const validation = await PatchApplier.validatePatchFormat(patchContent);
    if (!validation.valid) {
      throw new Error('Unified diff补丁格式无效');
    }
    
    // 计算源文件哈希用于验证
    const sourceHash = await calculateFileHash(oldBundlePath);
    
    // 调用原生模块应用补丁
    const result = await PatchApplier.applyPatch(oldBundlePath, patchContent, {
      backup: false, // 我们自己管理备份
      expectedSourceHash: sourceHash
    });
    
    if (result.success) {
      console.log(`✅ 原生补丁应用成功! 变更 ${result.changedLines} 行`);
      console.log(`📊 文件大小: ${result.originalSize} → ${result.patchedSize}`);
      
      // 如果需要输出到不同路径，复制文件
      if (oldBundlePath !== outputPath) {
        await RNFS.copyFile(oldBundlePath, outputPath);
      }
      
      return true;
    } else {
      throw new Error('原生补丁应用失败');
    }
    
  } catch (error) {
    console.error('Unified diff补丁应用失败:', error);
    throw error;
  }
}

// 现有的delta补丁逻辑（保持兼容性）
async function applyDeltaPatch(oldBundlePath, patch, outputPath) {
  try {
    console.log('🔧 使用delta补丁逻辑...');
    
    let bundleContent = await RNFS.readFile(oldBundlePath, 'utf8');

    // 计算本地源文件哈希
    const localSourceHash = 'sha256:' + CryptoJS.SHA256(bundleContent).toString(CryptoJS.enc.Hex);
    
    // 验证源文件哈希（如果补丁中提供）
    if (patch.sourceHash) {
      if (localSourceHash !== patch.sourceHash) {
        throw new Error('源文件哈希验证失败');
      }
      console.log('✅ 源文件哈希验证成功');
    }
    
    console.log(`📝 准备应用 ${patch.operations?.length} 个补丁操作`);
    
    const operations = patch.operations || [];
    // 所有操作按位置倒序排序（从大到小），避免操作间相互影响
    const sortedOperations = operations.slice().sort((a, b) => {
      const posA = a.type === 'delete' ? a.start : a.position;
      const posB = b.type === 'delete' ? b.start : b.position;
      return posB - posA;
    });
    
    for (const operation of sortedOperations) {
      switch (operation.type) {
        case 'delete':
          if (operation.start + operation.length > bundleContent.length) {
            throw new Error(`删除操作超出文件范围: ${operation.start}+${operation.length} > ${bundleContent.length}`);
          }
          bundleContent = bundleContent.substring(0, operation.start) +  bundleContent.substring(operation.start + operation.length);
          break;
        case 'insert':
          if (operation.position > bundleContent.length) {
            throw new Error(`插入位置超出文件范围: ${operation.position} > ${bundleContent.length}`);
          }
          bundleContent = bundleContent.substring(0, operation.position) +  operation.data +  bundleContent.substring(operation.position);
          break;
        default:
          console.warn('未知操作类型:', operation.type);
          break;
      }
    }
    
    // 验证目标文件哈希（如果补丁中提供）
    if (patch.targetHash) {
      const resultHash = 'sha256:' + CryptoJS.SHA256(bundleContent).toString(CryptoJS.enc.Hex);
      console.log('📏 文件大小:', bundleContent.length);
      if (resultHash !== patch.targetHash) {
        console.log('期望哈希:', patch.targetHash);
        console.log('实际哈希:', resultHash);
        throw new Error('目标文件哈希验证失败');
      }
      console.log('✅ 目标文件哈希验证成功');
    }
    
    await RNFS.writeFile(outputPath, bundleContent, 'utf8');
    console.log('✅ Delta补丁应用成功');
    return true;
    
  } catch (error) {
    console.error('Delta补丁应用失败:', error);
    throw error;
  }
}

export async function checkAndUpdateBundle() {
  try {
    console.log('检查热更新...');
    const res = await fetch(MANIFEST_URL);
    console.log('获取manifest:', res, `url: ${MANIFEST_URL}`);
    const manifest = await res.json();
    const currentVersion = await AsyncStorage.getItem(VERSION_KEY);
    console.log('当前版本:', currentVersion, '最新版本:', manifest.version);

    if (manifest.version !== currentVersion) {
      await cleanupTempFiles();

      if (manifest.updateType === 'delta' && 
          manifest.deltaUpdate && 
          currentVersion && 
          await RNFS.exists(BUNDLE_LOCAL_PATH)) {
        console.log('开始差量更新...');

        const deltaInfo = manifest.deltaUpdate;        
        try {
          // 使用新的压缩下载功能
          const patchDownloadResult = await downloadFileWithCompression(
            manifest, 
            'patch', 
            PATCH_TEMP_PATH, 
            COMPRESSED_PATCH_TEMP_PATH
          );
          
          if (patchDownloadResult.success) {
            const patchHash = await calculateFileHash(PATCH_TEMP_PATH); 
            const expectedHash = deltaInfo.patchHash;
            
            if (patchDownloadResult.useCompression) {
              console.log(`📦 压缩补丁下载完成，节省 ${((1 - patchDownloadResult.downloadedSize / deltaInfo.patchSize) * 100).toFixed(1)}% 流量`);
            }
            
            if (patchHash === expectedHash) {
              console.log('补丁文件哈希验证成功, 开始应用补丁');
              const patchSuccess = await applyPatch(
                BUNDLE_LOCAL_PATH, 
                PATCH_TEMP_PATH, 
                BUNDLE_TEMP_PATH,
                manifest
              );
              
              if (patchSuccess) {
                const resultHash = await calculateFileHash(BUNDLE_TEMP_PATH);
                if (resultHash === deltaInfo.targetHash) {
                  console.log('差量更新结果哈希验证成功，开始原子性替换');
                  await RNFS.moveFile(BUNDLE_TEMP_PATH, BUNDLE_LOCAL_PATH);
                  await AsyncStorage.setItem(VERSION_KEY, manifest.version);
                  console.log('差量更新完成！');
                  
                  showUpdateAlert();
                  return;
                } else {
                  console.error('差量更新结果哈希验证失败，回退到完整下载');
                }
              } else {
                console.error('应用补丁失败');
              }
            } else {
              console.error('补丁文件哈希验证失败');
            }
          } else {
            console.error('补丁下载失败');
          }
        } catch (error) {
          console.error('差量更新失败', error);
        }
      }
      
      console.log('📦 执行完整下载...');
      
      try {
        // 使用新的压缩下载功能
        const bundleDownloadResult = await downloadFileWithCompression(
          manifest,
          'bundle',
          BUNDLE_TEMP_PATH,
          COMPRESSED_BUNDLE_TEMP_PATH
        );
        
        if (bundleDownloadResult.success) {
          if (bundleDownloadResult.useCompression) {
            console.log(`📦 压缩Bundle下载完成，节省 ${((1 - bundleDownloadResult.downloadedSize / manifest.fullBundle.size) * 100).toFixed(1)}% 流量`);
          }
          
          // 验证完整文件哈希
          const fileHash = await calculateFileHash(BUNDLE_TEMP_PATH);
          if (fileHash !== manifest.fullBundle.hash) {
            console.warn('⚠️ 完整文件哈希验证失败');
            await cleanupTempFiles();
            return;
          }
        
          // 原子性替换
          await RNFS.moveFile(BUNDLE_TEMP_PATH, BUNDLE_LOCAL_PATH);
          await AsyncStorage.setItem(VERSION_KEY, manifest.version);
          console.log('完整更新完成');
          
          showUpdateAlert();
        } else {
          console.warn('完整Bundle下载失败');
          await cleanupTempFiles();
        }
      } catch (error) {
        console.error('完整下载失败:', error);
        await cleanupTempFiles();
      }
    } else {
      console.log('已是最新版本');
    }
  } catch (err) {
    console.error('热更新失败', err);
    await cleanupTempFiles();
  }
}

function showUpdateAlert() {
  Alert.alert(
    '更新完成',
    '需要重启应用以应用更新',
    [
      { text: '稍后重启', style: 'cancel' },
      { text: '立即重启', onPress: () => RNRestart.Restart() }
    ],
    { cancelable: false }
  );
}

export function getBundleFilePath() {
  return BUNDLE_LOCAL_PATH;
}
