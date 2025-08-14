const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

/**
 * 压缩工具类 - 专为热更新优化
 */
class CompressionUtils {
  /**
   * 压缩文件 - 使用兼容性最佳的参数
   * @param {string} inputPath - 输入文件路径
   * @param {string} outputPath - 输出文件路径（可选）
   * @returns {Promise<Object>} 压缩结果
   */
  static async compressFile(inputPath, outputPath = null) {
    try {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }

      // 读取文件并确保UTF-8编码
      const inputData = fs.readFileSync(inputPath);
      
      // 使用兼容性最佳的gzip参数
      const compressedData = await gzip(inputData, { 
        level: 6,           // 平衡压缩率和速度
        chunkSize: 16 * 1024, // 16KB chunks
        windowBits: 15,     // 标准gzip
        memLevel: 8         // 默认内存级别
      });
      
      const finalOutputPath = outputPath || `${inputPath}.gz`;
      fs.writeFileSync(finalOutputPath, compressedData);

      const originalSize = inputData.length;
      const compressedSize = compressedData.length;
      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      console.log(`📦 压缩完成: ${path.basename(inputPath)}`);
      console.log(`   原始大小: ${this.formatBytes(originalSize)}`);
      console.log(`   压缩大小: ${this.formatBytes(compressedSize)}`);
      console.log(`   压缩率: ${compressionRatio.toFixed(1)}%`);

      return {
        success: true,
        originalPath: inputPath,
        compressedPath: finalOutputPath,
        originalSize,
        compressedSize,
        compressionRatio,
        compressionType: 'gzip'
      };
    } catch (error) {
      console.error('📦❌ 压缩失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 压缩字符串内容
   * @param {string} content - 要压缩的内容
   * @returns {Promise<Buffer>} 压缩后的数据
   */
  static async compressString(content) {
    const buffer = Buffer.from(content, 'utf8');
    return await gzip(buffer, { level: 6 });
  }

  /**
   * 检查文件是否适合压缩
   * @param {string} filePath - 文件路径
   * @param {number} minSize - 最小文件大小阈值（默认1KB）
   * @returns {Object} 检查结果
   */
  static shouldCompress(filePath, minSize = 1024) {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // 检查文件大小
      if (stats.size < minSize) {
        return { 
          should: false, 
          reason: '文件太小，压缩收益不明显' 
        };
      }

      // 检查文件类型 - 针对热更新场景
      const compressibleExtensions = [
        '.js',      // Bundle文件
        '.json',    // Manifest文件
        '.patch',   // 补丁文件
        '.css',     // 样式文件
        '.html',    // HTML文件
        '.txt'      // 文本文件
      ];
      
      const isCompressible = compressibleExtensions.includes(ext) || !ext;
      
      if (!isCompressible) {
        return { 
          should: false, 
          reason: '文件类型不适合压缩' 
        };
      }

      return { should: true };
    } catch (error) {
      return { 
        should: false, 
        reason: `检查文件失败: ${error.message}` 
      };
    }
  }

  /**
   * 验证gzip文件有效性
   * @param {string} filePath - gzip文件路径
   * @returns {boolean} 是否为有效的gzip文件
   */
  static isValidGzipFile(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      // 检查gzip魔数 (0x1f, 0x8b)
      return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
    } catch (error) {
      return false;
    }
  }

  /**
   * 格式化字节大小显示
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 批量压缩Bundle和Patch文件
   * @param {Object} files - 文件信息
   * @returns {Promise<Object>} 压缩结果
   */
  static async compressHotUpdateFiles(files) {
    const results = {
      bundle: null,
      patch: null,
      success: true,
      errors: []
    };

    try {
      // 压缩Bundle文件
      if (files.bundlePath && fs.existsSync(files.bundlePath)) {
        console.log('📦 开始压缩Bundle文件...');
        const bundleResult = await this.compressFile(files.bundlePath);
        results.bundle = bundleResult;
        
        if (!bundleResult.success) {
          results.success = false;
          results.errors.push(`Bundle压缩失败: ${bundleResult.error}`);
        }
      }

      // 压缩Patch文件
      if (files.patchPath && fs.existsSync(files.patchPath)) {
        console.log('📦 开始压缩Patch文件...');
        const patchResult = await this.compressFile(files.patchPath);
        results.patch = patchResult;
        
        if (!patchResult.success) {
          results.success = false;
          results.errors.push(`Patch压缩失败: ${patchResult.error}`);
        }
      }

      if (results.success) {
        console.log('📦✅ 热更新文件压缩完成');
      } else {
        console.error('📦❌ 部分文件压缩失败:', results.errors);
      }

      return results;
    } catch (error) {
      console.error('📦❌ 批量压缩失败:', error.message);
      return {
        bundle: null,
        patch: null,
        success: false,
        errors: [error.message]
      };
    }
  }
}

module.exports = CompressionUtils;