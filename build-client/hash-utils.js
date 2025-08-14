const CryptoJS = require('crypto-js');

/**
 * 哈希计算工具类
 */

// 计算文件哈希（与Java服务端保持一致）
function calculateHash(content) {
  return 'sha256:' + CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
}

// 计算二进制文件哈希（用于gzip等压缩文件）
function calculateBinaryHash(buffer) {
  // 将Buffer转换为WordArray
  const wordArray = CryptoJS.lib.WordArray.create(buffer);
  return 'sha256:' + CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
}

module.exports = {
  calculateHash,
  calculateBinaryHash
};