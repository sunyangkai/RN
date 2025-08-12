import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs'; // 需要安装: npm install react-native-fs
import { calculateHash } from '../utils/HashUtils';

const { PatchApplier } = NativeModules;

/**
 * 补丁管理器
 * 负责协调RN层和原生层的补丁操作
 */
class PatchManager {
  constructor() {
    this.baseUrl = 'http://your-cdn-server.com'; // 配置你的CDN服务器
  }

  /**
   * 检查是否有可用更新
   * @param {string} currentVersion 当前版本
   * @returns {Promise<Object>} 更新信息
   */
  async checkForUpdates(currentVersion) {
    try {
      const response = await fetch(`${this.baseUrl}/api/check-update?version=${currentVersion}`);
      const updateInfo = await response.json();
      
      return {
        hasUpdate: updateInfo.hasUpdate,
        latestVersion: updateInfo.latestVersion,
        patchUrl: updateInfo.patchUrl,
        patchHash: updateInfo.patchHash,
        patchSize: updateInfo.patchSize,
        description: updateInfo.description
      };
    } catch (error) {
      throw new Error(`检查更新失败: ${error.message}`);
    }
  }

  /**
   * 下载补丁文件
   * @param {string} patchUrl 补丁下载URL
   * @param {Function} onProgress 进度回调
   * @returns {Promise<string>} 补丁内容
   */
  async downloadPatch(patchUrl, onProgress = null) {
    try {
      console.log('🔽 开始下载补丁:', patchUrl);
      
      // 使用fetch下载，如果需要进度监控可以使用react-native-fs
      const response = await fetch(patchUrl);
      
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }
      
      const patchContent = await response.text();
      console.log('✅ 补丁下载完成，大小:', patchContent.length);
      
      return patchContent;
    } catch (error) {
      throw new Error(`下载补丁失败: ${error.message}`);
    }
  }

  /**
   * 验证补丁内容
   * @param {string} patchContent 补丁内容
   * @param {string} expectedHash 期望的哈希值
   * @returns {Promise<boolean>} 验证结果
   */
  async verifyPatch(patchContent, expectedHash) {
    try {
      // 验证补丁格式
      const formatResult = await PatchApplier.validatePatchFormat(patchContent);
      if (!formatResult.valid) {
        throw new Error('补丁格式无效');
      }

      // 验证补丁哈希
      const actualHash = calculateHash(patchContent);
      if (actualHash !== expectedHash) {
        throw new Error(`补丁哈希不匹配. 期望: ${expectedHash}, 实际: ${actualHash}`);
      }

      return true;
    } catch (error) {
      throw new Error(`补丁验证失败: ${error.message}`);
    }
  }

  /**
   * 应用补丁到bundle文件
   * @param {string} bundlePath bundle文件路径
   * @param {string} patchContent 补丁内容
   * @param {Object} options 选项
   * @returns {Promise<Object>} 应用结果
   */
  async applyPatchToBundle(bundlePath, patchContent, options = {}) {
    try {
      console.log('🔧 开始应用补丁到:', bundlePath);
      
      // 读取当前bundle文件以计算哈希
      const currentBundle = await RNFS.readFile(bundlePath, 'utf8');
      const currentHash = calculateHash(currentBundle);
      
      // 调用原生模块应用补丁
      const result = await PatchApplier.applyPatch(bundlePath, patchContent, {
        backup: true,
        expectedSourceHash: options.expectedSourceHash || currentHash,
        ...options
      });

      if (result.success) {
        console.log('✅ 补丁应用成功:', result);
        return {
          success: true,
          message: '补丁应用成功',
          changedLines: result.changedLines,
          newHash: result.newHash,
          backupFile: result.backupFile
        };
      } else {
        throw new Error('补丁应用失败');
      }
    } catch (error) {
      console.error('❌ 补丁应用失败:', error);
      throw new Error(`补丁应用失败: ${error.message}`);
    }
  }

  /**
   * 完整的更新流程
   * @param {string} currentVersion 当前版本
   * @param {string} bundlePath bundle文件路径
   * @param {Object} callbacks 回调函数
   * @returns {Promise<Object>} 更新结果
   */
  async performUpdate(currentVersion, bundlePath, callbacks = {}) {
    const {
      onCheckStart = () => {},
      onCheckComplete = () => {},
      onDownloadStart = () => {},
      onDownloadProgress = () => {},
      onDownloadComplete = () => {},
      onVerifyStart = () => {},
      onVerifyComplete = () => {},
      onApplyStart = () => {},
      onApplyComplete = () => {},
      onError = () => {}
    } = callbacks;

    try {
      // 1. 检查更新
      onCheckStart();
      const updateInfo = await this.checkForUpdates(currentVersion);
      onCheckComplete(updateInfo);

      if (!updateInfo.hasUpdate) {
        return { success: true, message: '已是最新版本', hasUpdate: false };
      }

      // 2. 下载补丁
      onDownloadStart(updateInfo);
      const patchContent = await this.downloadPatch(updateInfo.patchUrl, onDownloadProgress);
      onDownloadComplete(patchContent);

      // 3. 验证补丁
      onVerifyStart();
      await this.verifyPatch(patchContent, updateInfo.patchHash);
      onVerifyComplete();

      // 4. 应用补丁
      onApplyStart();
      const applyResult = await this.applyPatchToBundle(bundlePath, patchContent, {
        expectedSourceHash: updateInfo.expectedSourceHash
      });
      onApplyComplete(applyResult);

      return {
        success: true,
        message: '更新完成',
        hasUpdate: true,
        version: updateInfo.latestVersion,
        ...applyResult
      };

    } catch (error) {
      onError(error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * 回滚到备份版本
   * @param {string} bundlePath bundle文件路径
   * @param {string} backupPath 备份文件路径
   * @returns {Promise<boolean>} 回滚结果
   */
  async rollbackToBackup(bundlePath, backupPath) {
    try {
      console.log('🔄 回滚到备份版本:', backupPath);
      
      if (!(await RNFS.exists(backupPath))) {
        throw new Error('备份文件不存在');
      }

      await RNFS.copyFile(backupPath, bundlePath);
      console.log('✅ 回滚成功');
      
      return true;
    } catch (error) {
      console.error('❌ 回滚失败:', error);
      throw new Error(`回滚失败: ${error.message}`);
    }
  }
}

// 导出单例
export default new PatchManager();