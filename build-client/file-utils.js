const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 文件操作工具类
 */

// 确保目录存在
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 读取JSON文件
function readJsonFile(filePath) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

// 写入JSON文件
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 获取版本号（从项目根目录读取）
function getVersion() {
  const packageJson = readJsonFile('./package.json');
  return packageJson ? packageJson.version : '1.0.0';
}

/**
 * 获取本地IP地址
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  // 优先查找以太网接口
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        // 优先返回192.168.x.x或10.x.x.x网段的IP
        if (alias.address.startsWith('192.168.') || alias.address.startsWith('10.')) {
          return alias.address;
        }
      }
    }
  }
  
  // 如果没找到内网IP，返回第一个非内部IPv4地址
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  
  // 最后兜底返回localhost
  return 'localhost';
}

module.exports = {
  ensureDir,
  readJsonFile,
  writeJsonFile,
  getVersion,
  getLocalIP
};