#!/usr/bin/env node

const { buildBundle, buildPatch, buildOTA } = require('./build');
const DiffService = require('./diff-service');
const StaticServer = require('./static-server');

/**
 * 构建客户端命令行入口
 */

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};
  
  // 解析参数 (例如: type=patch)
  args.slice(1).forEach(arg => {
    if (arg.includes('=')) {
      const [key, value] = arg.split('=');
      options[key] = value;
    }
  });
  
  return { command, options };
}

// 静态服务器实例
let staticServer = null;

// 服务管理命令处理
async function handleServiceCommand(options) {
  const action = options.action || process.argv[3];
  
  switch (action) {
    case 'status':
      const diffService = new DiffService();
      console.log(`Diff服务状态: ${diffService.isAvailable() ? '[OK] 可用' : '[ERROR] 不可用'}`);
      console.log(`静态服务器状态: ${staticServer ? '[OK] 运行中' : '[ERROR] 未运行'}`);
      break;
    case 'stop':
      console.log('[INFO] Diff服务为命令行工具，无需停止');
      if (staticServer) {
        await staticServer.stop();
        staticServer = null;
        console.log('[STOP] 静态服务器已停止');
      }
      break;
    case 'start-static':
      if (staticServer) {
        console.log('静态服务器已在运行中');
      } else {
        const port = options.port || 8040;
        staticServer = new StaticServer(port);
        try {
          await staticServer.start();
          console.log(`[START] 静态服务器已启动，端口: ${port}`);
        } catch (error) {
          console.error('[ERROR] 静态服务器启动失败:', error.message);
          staticServer = null;
        }
      }
      break;
    case 'stop-static':
      if (staticServer) {
        await staticServer.stop();
        staticServer = null;
        console.log('[STOP] 静态服务器已停止');
      } else {
        console.log('静态服务器未运行');
      }
      break;
    default:
      console.log('可用的服务命令:');
      console.log('  status        # 查看服务状态');
      console.log('  stop          # 停止所有服务');
      console.log('  start-static  # 启动静态服务器');
      console.log('  stop-static   # 停止静态服务器');
      break;
  }
}

// 命令行调用
if (require.main === module) {
  const { command, options } = parseArgs();
  
  switch (command) {
    case 'build-OTA':
      buildOTA(options).catch(() => process.exit(1));
      break;
    case 'service':
      handleServiceCommand(options).catch(() => process.exit(1));
      break;
    default:
      console.log('🛠️  构建客户端使用方式:');
      console.log('  node index.js build-OTA                # 构建全量包');
      console.log('  node index.js build-OTA type=patch     # 构建差量包');
      console.log('  node index.js service status           # 查看服务状态');
      console.log('  node index.js service stop             # 停止所有服务');
      console.log('  node index.js service start-static     # 启动静态服务器');
      console.log('  node index.js service stop-static      # 停止静态服务器');
      break;
  }
}

module.exports = { buildBundle, buildPatch, buildOTA };