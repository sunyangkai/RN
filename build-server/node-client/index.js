const SimpleDiffServiceManager = require('./simple-diff-service-manager');
const path = require('path');

/**
 * Node.js客户端主接口
 */

let serviceInstance = null;

/**
 * 生成文件差异补丁
 * @param {string} oldBundlePath 原文件路径
 * @param {string} newBundlePath 新文件路径
 * @param {string} outputDir 输出目录
 * @returns {Promise<Object>} 补丁生成结果
 */
async function generatePatch(oldBundlePath, newBundlePath, outputDir = './patches') {
    const service = new SimpleDiffServiceManager();
    
    try {
        console.log('启动Java diff服务...');
        await service.start();
        
        console.log('生成补丁...');
        const result = await service.generatePatchWithRetry(oldBundlePath, newBundlePath, outputDir);
        
        if (result.success) {
            console.log(`补丁生成完成! 路径: ${result.patchFilePath || '(内存中)'}`);
            console.log(`补丁大小: ${result.stats.patchSize} 字符 (${(result.stats.sizeRatio * 100).toFixed(1)}%)`);
            console.log(`操作数量: ${result.stats.operationsCount}`);
        } else {
            console.log(`补丁生成失败: ${result.reason || result.error}`);
        }
        
        return result;
        
    } catch (error) {
        console.error('补丁生成失败:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        // 确保服务被关闭
        await service.stop();
    }
}

/**
 * 计算哈希 - 保留用于兼容性
 * 注意：主要的哈希计算在Java服务端进行，这里仅用于客户端需要时的备用
 */
function calculateHash(content) {
    const crypto = require('crypto');
    return 'sha256:' + crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * 获取服务管理器实例（用于高级用法）
 */
function getServiceManager(port = 8095) {
    if (!serviceInstance) {
        serviceInstance = new SimpleDiffServiceManager(port);
    }
    return serviceInstance;
}

/**
 * 清理资源
 */
async function cleanup() {
    if (serviceInstance) {
        await serviceInstance.stop();
        serviceInstance = null;
    }
}

// 进程退出时的清理
process.on('SIGINT', async () => {
    console.log('\\nReceived SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\\nReceived SIGTERM, shutting down gracefully...');
    await cleanup();
    process.exit(0);
});

// 导出接口
module.exports = {
    generatePatch,
    calculateHash,
    getServiceManager,
    cleanup
};