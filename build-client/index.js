#!/usr/bin/env node

const { buildBundle, buildPatch, buildOTA } = require('./src/build');

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

// 命令行调用
if (require.main === module) {
  const { command, options } = parseArgs();
  
  switch (command) {
    case 'build-OTA':
      buildOTA(options).catch(() => process.exit(1));
      break;
    default:
      console.log('🛠️  构建客户端使用方式:');
      console.log('  node index.js build-OTA              # 构建全量包');
      console.log('  node index.js build-OTA type=patch   # 构建差量包');
      break;
  }
}

module.exports = { buildBundle, buildPatch, buildOTA };