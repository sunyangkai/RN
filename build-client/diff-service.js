const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class DiffService {
  constructor() {
    this.jarPath = path.resolve('.', 'build-server', 'target', 'diff-service-1.0.0.jar');
  }

  async generatePatch(oldFilePath, newFilePath, outputDir) {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(this.jarPath)) {
          throw new Error(`Diff service jar not found: ${this.jarPath}`);
        }

        // 生成输出文件路径
        const outputFile = outputDir ? 
          path.join(outputDir, `patch_${Date.now()}.diff`) : null;

        // 构建命令
        const args = [oldFilePath, newFilePath];
        if (outputFile) {
          args.push(outputFile);
        }

        const command = `java -jar "${this.jarPath}" "${args.join('" "')}"`;
        
        // console.log('[BUILD] 执行diff命令:', command);

        // 执行Java命令
        const stdout = execSync(command, {
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        // 解析JSON输出
        const result = JSON.parse(stdout.trim());
        
        if (result.success) {
          console.log('[OK] Diff补丁生成成功');
          console.log(`[SIZE] 补丁大小: ${result.stats.patchSize} 字符`);
          console.log(`[RATIO] 大小比例: ${(result.stats.sizeRatio * 100).toFixed(1)}%`);
        } else {
          console.log('[ERROR] Diff补丁生成失败:', result.reason || result.error);
        }

        resolve(result);

      } catch (error) {
        console.error('[ERROR] Diff服务调用失败:', error.message);
        
        // 尝试解析错误输出中的JSON
        if (error.stdout) {
          try {
            const errorResult = JSON.parse(error.stdout);
            resolve(errorResult);
            return;
          } catch (parseError) {
            // 忽略JSON解析错误，继续处理原始错误
          }
        }

        reject({
          success: false,
          error: error.message,
          details: error.stderr || error.stdout
        });
      }
    });
  }

  /**
   * 检查diff服务是否可用
   * @returns {boolean}
   */
  isAvailable() {
    return fs.existsSync(this.jarPath);
  }

  /**
   * 获取diff服务信息
   * @returns {Object}
   */
  getInfo() {
    return {
      jarPath: this.jarPath,
      available: this.isAvailable(),
      type: 'command-line'
    };
  }
}

module.exports = DiffService;