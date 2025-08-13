#!/usr/bin/env node

const StaticServer = require('./static-server');

/**
 * 独立启动静态服务器的脚本
 */

async function startServer() {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8040;
  
  const server = new StaticServer(port);
  
  try {
    await server.start();
    console.log(`[START] 静态服务器已启动，端口: ${port}`);
    console.log(`[PATH] 服务目录: ./build`);
    console.log(`[URL] 访问地址:`);
    console.log(`   健康检查: http://localhost:${port}/health`);
    console.log(`   版本信息: http://localhost:${port}/version`);
    console.log(`   清单文件: http://localhost:${port}/manifest.json`);
    console.log(`\n按 Ctrl+C 停止服务器`);
    
    // 优雅关闭
    process.on('SIGINT', async () => {
      console.log('\n正在停止服务器...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n正在停止服务器...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[ERROR] 服务器启动失败:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.log(`[INFO] 端口 ${port} 被占用，请尝试其他端口：`);
      console.log(`   node start-server.js 8082`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;