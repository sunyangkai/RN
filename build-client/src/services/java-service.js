const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');
const CONFIG = require('../utils/config');

/**
 * Java服务交互类
 */

class JavaService {
  constructor() {
    this.process = null;
  }

  // 启动Java服务端
  async start() {
    console.log('🚀 启动Java服务端...');
    
    const jarPath = path.resolve(__dirname, '../../../build-server/target/diff-service-client-1.0.0.jar');
    this.process = spawn('java', [
      '-jar',
      jarPath,
      '8040'
    ], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.process.stdout.on('data', (data) => {
      console.log(`[Java] ${data.toString().trim()}`);
    });
    
    this.process.stderr.on('data', (data) => {
      console.error(`[Java Error] ${data.toString().trim()}`);
    });
    
    // 等待服务启动
    await new Promise((resolve, reject) => {
      const checkService = async () => {
        try {
          await axios.get(`http://localhost:8040/health`, { timeout: 1000 });
          console.log('✅ Java服务启动成功');
          resolve();
        } catch (error) {
          setTimeout(checkService, 1000);
        }
      };
      
      setTimeout(() => reject(new Error('Java服务启动超时')), 30000);
      setTimeout(checkService, 2000); // 给服务2秒启动时间
    });
    
    return this.process;
  }

  // 停止Java服务
  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  // 调用Java服务生成补丁
  async generatePatch(oldBundlePath, newBundlePath, outputDir) {
    try {
      console.log('🔧 调用Java服务生成补丁...');
      
      const response = await axios.post(`http://localhost:8040/api/generate-patch`, {
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
}

module.exports = JavaService;