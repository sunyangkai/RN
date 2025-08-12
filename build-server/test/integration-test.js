const { generatePatch } = require('../node-client');
const path = require('path');
const fs = require('fs');

/**
 * 集成测试脚本
 */
async function runIntegrationTest() {
    console.log('🧪 开始集成测试...');
    
    try {
        // 测试文件路径
        const oldBundlePath = path.join(__dirname, 'test-bundles/old-bundle.js');
        const newBundlePath = path.join(__dirname, 'test-bundles/new-bundle.js');
        const outputDir = path.join(__dirname, 'output');
        
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        console.log('📁 测试文件:');
        console.log(`  旧文件: ${oldBundlePath}`);
        console.log(`  新文件: ${newBundlePath}`);
        console.log(`  输出目录: ${outputDir}`);
        
        // 生成补丁
        console.log('\\n🔄 生成补丁...');
        const result = await generatePatch(oldBundlePath, newBundlePath, outputDir);
        
        // 验证结果
        console.log('\\n📊 测试结果:');
        console.log(`  生成成功: ${result.success ? '✅' : '❌'}`);
        
        if (result.success) {
            console.log(`  补丁文件: ${result.patchFilePath}`);
            console.log(`  源文件哈希: ${result.sourceHash}`);
            console.log(`  目标文件哈希: ${result.targetHash}`);
            console.log(`  统计信息:`);
            console.log(`    原文件大小: ${result.stats.oldSize} 字符`);
            console.log(`    新文件大小: ${result.stats.newSize} 字符`);
            console.log(`    补丁大小: ${result.stats.patchSize} 字符`);
            console.log(`    大小比例: ${(result.stats.sizeRatio * 100).toFixed(1)}%`);
            console.log(`    操作数量: ${result.stats.operationsCount}`);
            
            // 读取并显示补丁内容
            if (result.patchFilePath && fs.existsSync(result.patchFilePath)) {
                const patchContent = fs.readFileSync(result.patchFilePath, 'utf8');
                console.log('\\n📄 补丁内容:');
                console.log('---');
                console.log(patchContent);
                console.log('---');
            }
            
            console.log('\\n✅ 集成测试通过!');
        } else {
            console.log(`  失败原因: ${result.reason || result.error}`);
            if (result.stats) {
                console.log(`  统计信息:`);
                console.log(`    原文件大小: ${result.stats.oldSize} 字符`);
                console.log(`    新文件大小: ${result.stats.newSize} 字符`);
                console.log(`    补丁大小: ${result.stats.patchSize} 字符`);
                console.log(`    大小比例: ${(result.stats.sizeRatio * 100).toFixed(1)}%`);
            }
            console.log('\\n❌ 集成测试失败!');
        }
        
    } catch (error) {
        console.error('\\n💥 测试过程中发生错误:', error.message);
        console.log('\\n❌ 集成测试失败!');
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    runIntegrationTest();
}

module.exports = { runIntegrationTest };