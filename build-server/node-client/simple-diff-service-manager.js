const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

/**
 * 简化版Java Diff服务管理器
 * 使用简化版的Java服务（不依赖Maven/Spring Boot）
 */
class SimpleDiffServiceManager {
    constructor(port = 8095) {
        this.port = port;
        this.process = null;
        this.baseUrl = `http://localhost:${port}`;
        this.startupTimeout = 30000; // 30秒启动超时
    }
    
    /**
     * 启动Java服务
     */
    async start() {
        if (this.process) {
            console.log('Diff service already running');
            return;
        }
        
        console.log('Starting Java diff service client...');
        
        const javaServicePath = path.join(__dirname, '../java-client');
        const jarFile = path.join(javaServicePath, 'target', 'diff-service-client-1.0.0.jar');
        
        // 检查JAR文件是否存在
        if (!fs.existsSync(jarFile)) {
            throw new Error(`JAR file not found: ${jarFile}\\nPlease build first: cd ${javaServicePath} && mvn package`);
        }
        
        // 启动Java服务
        this.process = spawn('java', [
            '-jar',
            jarFile,
            this.port.toString()
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: javaServicePath
        });
        
        // 监听输出
        this.process.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log(`[Java Service] ${output}`);
            }
        });
        
        this.process.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.error(`[Java Service Error] ${output}`);
            }
        });
        
        this.process.on('exit', (code) => {
            console.log(`Java service exited with code ${code}`);
            this.process = null;
        });
        
        // 等待服务启动
        await this.waitForService();
        console.log('Java diff service client started successfully');
    }
    
    /**
     * 等待服务启动
     */
    async waitForService(maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                await axios.get(`${this.baseUrl}/health`, { timeout: 1000 });
                return;
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('Failed to start Java diff service client within timeout');
    }
    
    /**
     * 生成补丁
     * @param {string} oldFile 原文件路径
     * @param {string} newFile 新文件路径
     * @param {string} outputDir 输出目录（可选）
     * @returns {Promise<Object>} 补丁生成结果
     */
    async generatePatch(oldFile, newFile, outputDir = null) {
        try {
            // 转换路径格式，确保在Windows上使用正确的路径分隔符
            const normalizePathForJava = (p) => path.resolve(p).replace(/\\/g, '/');
            
            const response = await axios.post(`${this.baseUrl}/api/generate-patch`, {
                oldFile: normalizePathForJava(oldFile),
                newFile: normalizePathForJava(newFile),
                outputDir: outputDir ? normalizePathForJava(outputDir) : null
            }, {
                timeout: 30000, // 30秒超时
                headers: { 'Content-Type': 'application/json' }
            });
            
            return response.data;
        } catch (error) {
            if (error.response) {
                // 服务器返回错误响应
                throw new Error(`Diff service error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                // 请求发送但无响应
                throw new Error('Diff service not responding');
            } else {
                // 其他错误
                throw new Error(`Request failed: ${error.message}`);
            }
        }
    }
    
    /**
     * 带重试的补丁生成
     */
    async generatePatchWithRetry(oldFile, newFile, outputDir = null, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.generatePatch(oldFile, newFile, outputDir);
            } catch (error) {
                console.warn(`Attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // 重启服务重试
                console.log('Restarting service for retry...');
                await this.stop();
                await this.start();
            }
        }
    }
    
    /**
     * 停止Java服务
     */
    async stop() {
        if (this.process) {
            console.log('Stopping Java diff service client...');
            
            // 发送终止信号
            this.process.kill('SIGTERM');
            
            // 等待进程结束
            await new Promise((resolve) => {
                this.process.on('exit', resolve);
                // 强制杀死超时
                setTimeout(() => {
                    if (this.process) {
                        this.process.kill('SIGKILL');
                        resolve();
                    }
                }, 5000);
            });
            
            this.process = null;
            console.log('Java diff service client stopped');
        }
    }
    
    /**
     * 检查服务状态
     */
    async isRunning() {
        if (!this.process) {
            return false;
        }
        
        try {
            await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 获取服务版本信息
     */
    async getVersion() {
        try {
            const response = await axios.get(`${this.baseUrl}/version`, { timeout: 2000 });
            return response.data;
        } catch (error) {
            throw new Error('Failed to get service version');
        }
    }
}

module.exports = SimpleDiffServiceManager;