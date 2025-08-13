const CryptoJS = require('crypto-js');

/**
 * 哈希计算工具类
 */

// 计算文件哈希（与Java服务端保持一致）
function calculateHash(content) {
  return 'sha256:' + CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
}

module.exports = {
  calculateHash
};