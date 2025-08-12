import CryptoJS from 'crypto-js'; // 需要安装: npm install crypto-js

/**
 * 哈希工具函数
 */

/**
 * 计算字符串的SHA256哈希值
 * @param {string} content 要计算哈希的内容
 * @returns {string} SHA256哈希值（带sha256:前缀）
 */
export function calculateHash(content) {
  const hash = CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
  return `sha256:${hash}`;
}

/**
 * 验证内容哈希是否匹配
 * @param {string} content 内容
 * @param {string} expectedHash 期望的哈希值
 * @returns {boolean} 是否匹配
 */
export function verifyHash(content, expectedHash) {
  const actualHash = calculateHash(content);
  return actualHash === expectedHash;
}