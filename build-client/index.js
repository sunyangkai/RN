#!/usr/bin/env node

const { buildBundle, buildPatch, buildOTA } = require('./src/build');
const javaServiceManager = require('./src/services/java-service-manager');

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

// 服务管理命令处理
async function handleServiceCommand(options) {
  const action = options.action || process.argv[3];
  
  switch (action) {
    case 'status':
      console.log(`Java服务状态: ${javaServiceManager.isRunning() ? '🟢 运行中' : '🔴 未运行'}`);
      break;
    case 'stop':
      javaServiceManager.stop();
      console.log('🛑 Java服务已停止');
      break;
    default:
      console.log('可用的服务命令:');
      console.log('  status  # 查看服务状态');
      console.log('  stop    # 停止服务');
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
      console.log('  node index.js build-OTA              # 构建全量包');
      console.log('  node index.js build-OTA type=patch   # 构建差量包');
      console.log('  node index.js service status         # 查看Java服务状态');
      console.log('  node index.js service stop           # 停止Java服务');
      break;
  }
}

module.exports = { buildBundle, buildPatch, buildOTA };