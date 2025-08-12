const JavaService = require('./java-service');

/**
 * Java服务管理器 - 单例模式，避免重复启动服务
 */
class JavaServiceManager {
  constructor() {
    this.javaService = null;
    this.isStarting = false;
    this.startPromise = null;
  }

  // 获取或启动Java服务
  async getService() {
    // 如果服务已经运行，直接返回
    if (this.javaService && this.javaService.process) {
      return this.javaService;
    }

    // 如果正在启动，等待启动完成
    if (this.isStarting) {
      await this.startPromise;
      return this.javaService;
    }

    // 启动新服务
    return await this.startService();
  }

  // 启动服务
  async startService() {
    this.isStarting = true;
    
    try {
      this.startPromise = (async () => {
        console.log('🚀 启动共享Java服务...');
        this.javaService = new JavaService();
        await this.javaService.start();
        console.log('✅ 共享Java服务启动成功');
      })();

      await this.startPromise;
      return this.javaService;
      
    } finally {
      this.isStarting = false;
      this.startPromise = null;
    }
  }

  // 生成补丁（复用服务）
  async generatePatch(oldBundlePath, newBundlePath, outputDir) {
    const service = await this.getService();
    
    // 显示服务复用信息
    if (!this.isStarting) {
      console.log('♻️  复用已运行的Java服务');
    }
    
    return await service.generatePatch(oldBundlePath, newBundlePath, outputDir);
  }

  // 停止服务（仅在进程退出时调用）
  stop() {
    if (this.javaService) {
      console.log('🛑 停止共享Java服务');
      this.javaService.stop();
      this.javaService = null;
    }
  }

  // 检查服务状态
  isRunning() {
    return this.javaService && this.javaService.process;
  }
}

// 导出单例实例
const javaServiceManager = new JavaServiceManager();

// 进程退出时清理
process.on('exit', () => {
  javaServiceManager.stop();
});

process.on('SIGINT', () => {
  javaServiceManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  javaServiceManager.stop();
  process.exit(0);
});

module.exports = javaServiceManager;