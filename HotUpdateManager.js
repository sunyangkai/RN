import RNFS from 'react-native-fs';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';
import CryptoJS from 'crypto-js';

const MANIFEST_URL = 'http://192.168.2.173:3000/manifest.json';
const BUNDLE_LOCAL_PATH = `${RNFS.DocumentDirectoryPath}/hotupdate.bundle`; // 本地上一个版本的资源文件
const BUNDLE_TEMP_PATH = `${RNFS.DocumentDirectoryPath}/hotupdate.bundle.tmp`; // 通过本次热更新生成的临时资源文件
const PATCH_TEMP_PATH = `${RNFS.DocumentDirectoryPath}/hotupdate.patch.tmp`; // 补丁文件被写入这个路径
const VERSION_KEY = 'hotupdate_version';

async function cleanupTempFiles() {
  try {
    if (await RNFS.exists(BUNDLE_TEMP_PATH)) {
      await RNFS.unlink(BUNDLE_TEMP_PATH);
      console.log('🧹 清理bundle临时文件');
    }
    if (await RNFS.exists(PATCH_TEMP_PATH)) {
      await RNFS.unlink(PATCH_TEMP_PATH);
      console.log('🧹 清理patch临时文件');
    }
  } catch (error) {
    console.warn('清理临时文件失败:', error);
  }
}

// 计算文件哈希
async function calculateFileHash(filePath) {
  try {
    if (!(await RNFS.exists(filePath))) return null;
    const fileContent = await RNFS.readFile(filePath, 'utf8');
    // 使用与服务端一致的哈希计算方式 - 转换为hex格式
    return 'sha256:' + CryptoJS.SHA256(fileContent).toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('计算文件哈希失败:', error);
    return null;
  }
}

// 应用补丁到bundle文件
async function applyPatch(oldBundlePath, patchPath, outputPath) {
  try {
    const patchContent = await RNFS.readFile(patchPath, 'utf8');
    const patch = JSON.parse(patchContent);
    console.log('patchContent', patchContent)
    if (patch.type !== 'delta_patch') {
      throw new Error('不支持的补丁类型');
    }
    
    let bundleContent = await RNFS.readFile(oldBundlePath, 'utf8');
    
    // 验证源文件哈希（如果补丁中提供）
    if (patch.sourceHash) {
      const currentHash = 'sha256:' + CryptoJS.SHA256(bundleContent).toString(CryptoJS.enc.Hex);
      console.log('🔍 源文件哈希验证:');
      console.log('  期望哈希:', patch.sourceHash);
      console.log('  实际哈希:', currentHash);
      console.log('  文件大小:', bundleContent.length);
      if (currentHash !== patch.sourceHash) {
        console.warn('⚠️ 源文件哈希不匹配，可能版本不一致');
        throw new Error('源文件哈希验证失败');
      }
      console.log('✅ 源文件哈希验证成功');
    }
    
    console.log(`🔧 应用 ${patch.operations?.length || 0} 个补丁操作`);
    
    // 按位置倒序排列操作，避免位置偏移问题
    const operations = (patch.operations || []).sort((a, b) => {
      const posA = a.start || a.position || 0;
      const posB = b.start || b.position || 0;
      return posB - posA;
    });
    
    // 应用补丁操作
    for (const operation of operations) {      
      switch (operation.type) {
        case 'insert':
          if (operation.position > bundleContent.length) {
            throw new Error(`插入位置超出文件范围: ${operation.position} > ${bundleContent.length}`);
          }
          bundleContent = bundleContent.substring(0, operation.position) + 
                         operation.data + 
                         bundleContent.substring(operation.position);
          break;
        case 'delete':
          if (operation.start + operation.length > bundleContent.length) {
            throw new Error(`删除操作超出文件范围: ${operation.start}+${operation.length} > ${bundleContent.length}`);
          }
          bundleContent = bundleContent.substring(0, operation.start) + 
                         bundleContent.substring(operation.start + operation.length);
          break;
        default:
          console.warn('未知操作类型:', operation.type);
          break;
      }
      
    }
    
    // 验证目标文件哈希（如果补丁中提供）
    if (patch.targetHash) {
      const resultHash = 'sha256:' + CryptoJS.SHA256(bundleContent).toString(CryptoJS.enc.Hex);
      console.log('🔍 目标哈希验证:');
      console.log('  期望哈希:', patch.targetHash);
      console.log('  实际哈希:', resultHash);
      console.log('  文件大小:', bundleContent.length);
      if (resultHash !== patch.targetHash) {
        console.error('❌ 目标文件哈希验证失败');
        throw new Error('目标文件哈希验证失败');
      }
      console.log('✅ 目标文件哈希验证成功');
    }
    
    await RNFS.writeFile(outputPath, bundleContent, 'utf8');
    console.log('🎉 补丁应用成功');
    return true;
  } catch (error) {
    console.error('❌ 应用补丁失败:', error);
    return false;
  }
}

export async function checkAndUpdateBundle() {
  try {
    const res = await fetch(MANIFEST_URL);
    const manifest = await res.json();
    const currentVersion = await AsyncStorage.getItem(VERSION_KEY);

    console.log('manifest', manifest);
    console.log('currentVersion', currentVersion);
    
    if (manifest.version !== currentVersion) {
      await cleanupTempFiles();

      if (manifest.updateType === 'delta' && 
          manifest.deltaUpdate && 
          currentVersion && 
          await RNFS.exists(BUNDLE_LOCAL_PATH)) {
        
        const deltaInfo = manifest.deltaUpdate;        
        try {
          const patchDownloadResult = await RNFS.downloadFile({
            fromUrl: deltaInfo.patchUrl,
            toFile: PATCH_TEMP_PATH,
          }).promise;
          if (patchDownloadResult.statusCode === 200) {
            const patchHash = await calculateFileHash(PATCH_TEMP_PATH); 
            if (patchHash === deltaInfo.patchHash) {
              
              // 应用补丁
              // 
              const patchSuccess = await applyPatch(
                BUNDLE_LOCAL_PATH, 
                PATCH_TEMP_PATH, 
                BUNDLE_TEMP_PATH
              );
              
              if (patchSuccess) {
                // 验证结果文件哈希
                const resultHash = await calculateFileHash(BUNDLE_TEMP_PATH);
                if (resultHash === deltaInfo.targetHash) {
                  // 原子性替换
                  await RNFS.moveFile(BUNDLE_TEMP_PATH, BUNDLE_LOCAL_PATH);
                  await AsyncStorage.setItem(VERSION_KEY, manifest.version);
                  console.log('差量更新完成！');
                  
                  showUpdateAlert();
                  return;
                } else {
                  console.error('差量更新结果哈希验证失败，回退到完整下载');
                }
              } else {
                console.error('应用补丁失败，回退到完整下载');
              }
            } else {
              console.error('补丁文件哈希验证失败，回退到完整下载', patchHash, deltaInfo.patchHash);
            }
          } else {
            console.error('补丁下载失败，回退到完整下载');
          }
        } catch (error) {
          console.error('差量更新失败，回退到完整下载:', error);
        }
      }
      
      // 完整下载（回退方案）
      console.log('📦 执行完整下载...');
      const downloadUrl = manifest.fullBundle?.url;
      
      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: BUNDLE_TEMP_PATH,
      }).promise;
      
      if (downloadResult.statusCode === 200) {
        // 验证完整文件哈希（如果提供）
        if (manifest.fullBundle?.hash) {
          const fileHash = await calculateFileHash(BUNDLE_TEMP_PATH);
          if (fileHash !== manifest.fullBundle.hash) {
            console.warn('⚠️ 完整文件哈希验证失败');
            await cleanupTempFiles();
            return;
          }
        }
        
        // 原子性替换
        await RNFS.moveFile(BUNDLE_TEMP_PATH, BUNDLE_LOCAL_PATH);
        await AsyncStorage.setItem(VERSION_KEY, manifest.version);
        console.log('🔥 完整更新完成');
        
        showUpdateAlert();
      } else {
        console.warn('❌ 完整下载失败');
        await cleanupTempFiles();
      }
    } else {
      console.log('✅ 已是最新版本');
    }
  } catch (err) {
    console.error('🔥 热更新失败', err);
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
