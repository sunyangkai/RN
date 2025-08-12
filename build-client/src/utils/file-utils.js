const fs = require('fs');
const path = require('path');

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
  const packageJson = readJsonFile('../package.json');
  return packageJson ? packageJson.version : '1.0.0';
}

module.exports = {
  ensureDir,
  readJsonFile,
  writeJsonFile,
  getVersion
};