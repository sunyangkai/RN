const fs = require('fs');
const path = require('path');
const Diff = require('diff');
const CryptoJS = require('crypto-js');

const CONFIG = {
  PATCH_SIZE_THRESHOLD: 0.6 // 补丁大小阈值，超过（60%）则使用完整下载
};


function calculateHash(content) {
  return 'sha256:' + CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
}


/*
 这里需要转换差异数据结构，有下面的好处：
 diffResult 只包含变更内容，没有绝对位置 convertDiffToPatch 计算每个操作在原文件中的精确位置
 相邻操作合并, 大小估算, 操作重排序
 
jsdiff 的 diffResult 格式：
    [
      { value: "unchanged text", count: 13 },
      { value: "deleted text", count: 12, removed: true },
      { value: "added text", count: 10, added: true }
    ]

转换后的补丁格式：
    [
      { type: 'delete', start: 13, length: 12 },
      { type: 'insert', position: 13, data: "added text" }
    ]
 */
function convertDiffToPatch(diffResult) {
  /* diff库返回的结果，只会包含三种类型，删除，新增，不变
     本质上，diff操作将代码修改视为两种原子操作，新增和删除。修改操作被分解为删除 + 新增
  */
  const operations = [];
  let currentPosition = 0;
  
  for (const part of diffResult) {
    if (part.removed) {
      operations.push({
        type: 'delete',
        start: currentPosition,
        length: part.value.length
      });
      // 修复：删除操作后需要更新位置，因为我们是在原文件中追踪位置
      currentPosition += part.value.length;
    } else if (part.added) {
      operations.push({
        type: 'insert',
        position: currentPosition,
        data: part.value
      });
      // 注意：插入操作后不更新位置，因为插入是在目标文件中的操作
      // currentPosition 保持不变，指向原文件中的相同位置
    } else {
      currentPosition += part.value.length;
    }
  }
  
  return operations;
}

/**
 * 优化补丁操作: 为了避免冗余的操作，将相同且相邻的操作合并为一个操作
 * 比如：某个修改导致新增10行代码，产生10个insert操作。就把这10个操作合并为1个，减少执行补丁脚本的cpu耗时
 */
function optimizePatchOperations(operations) {
  if (operations.length === 0) return operations;
  const optimized = [];
  let current = operations[0];
  for (let i = 1; i < operations.length; i++) {
    const next = operations[i];
    if (current.type === 'insert' && next.type === 'insert' && 
        current.position + current.data.length === next.position) {
      current.data += next.data;
    }
    else if (current.type === 'delete' && next.type === 'delete' && 
             current.start + current.length === next.start) {
      current.length += next.length;
    }
    else {
      optimized.push(current);
      current = next;
    }
  }
  
  optimized.push(current);
  return optimized;
}

function estimatePatchSize(operations) {
  return operations.reduce((size, op) => {
    switch (op.type) {
      case 'insert':
        return size + (op.data ? op.data.length : 0);
      case 'delete':
        return size + 20; // 删除操作本身的开销
      default:
        return size;
    }
  }, 0);
}


async function generatePatch(oldBundlePath, newBundlePath, outputDir = './patches') {
  try {
    console.log('开始生成补丁...');
    const oldContent = fs.readFileSync(oldBundlePath, 'utf8');
    const newContent = fs.readFileSync(newBundlePath, 'utf8');

    // 使用 jsdiff 计算差异
    const diffResult = Diff.diffChars(oldContent, newContent);
    
    // 转换为补丁操作
    let operations = convertDiffToPatch(diffResult);
    
    // 优化操作
    operations = optimizePatchOperations(operations);
    
    console.log(`生成了 ${operations.length} 个补丁操作`);
    
    // 估算补丁大小
    const patchSize = estimatePatchSize(operations);
    const sizeRatio = patchSize / oldContent.length;
    
    console.log(`补丁大小: ${patchSize} 字符 (${(sizeRatio * 100).toFixed(1)}%)`);
    
    // 检查是否应该使用差量更新
    if (sizeRatio > CONFIG.PATCH_SIZE_THRESHOLD) {
      console.log('变化太大，使用完整下载');
      return {
        success: false,
        reason: 'patch_too_large',
        recommendation: 'full_download',
        stats: {
          oldSize: oldContent.length,
          newSize: newContent.length,
          patchSize,
          sizeRatio,
          operationsCount: operations.length
        }
      };
    }
    
    // 生成补丁文件
    const patch = {
      type: 'delta_patch',
      version: '1.0',
      sourceHash: calculateHash(oldContent),
      targetHash: calculateHash(newContent),
      operations: operations,
      metadata: {
        generatedAt: new Date().toISOString(),
        oldSize: oldContent.length,
        newSize: newContent.length,
        patchSize: patchSize,
        operationsCount: operations.length
      }
    };
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const patchFileName = `patch_${Date.now()}.json`;
    const patchFilePath = path.join(outputDir, patchFileName);
    fs.writeFileSync(patchFilePath, JSON.stringify(patch, null, 2));
    console.log(`补丁生成完成! 路径: ${patchFilePath}`);
    
    return {
      success: true,
      patchFilePath,
      patch,
      stats: {
        oldSize: oldContent.length,
        newSize: newContent.length,
        patchSize,
        sizeRatio,
        operationsCount: operations.length
      }
    };
    
  } catch (error) {
    console.error('补丁生成失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 命令行使用方式
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('使用方式: node patch-generator.js <旧bundle路径> <新bundle路径> [输出目录]');
    process.exit(1);
  }
  
  const [oldPath, newPath, outputDir] = args;
  generatePatch(oldPath, newPath, outputDir);
}

module.exports = { generatePatch, calculateHash };