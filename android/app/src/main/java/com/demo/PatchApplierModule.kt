package com.demo

import com.facebook.react.bridge.*
import com.github.difflib.DiffUtils
import com.github.difflib.UnifiedDiffUtils
import com.github.difflib.patch.Patch
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.Executors

/**
 * React Native 补丁应用模块
 * 负责在 Android 原生层应用 unified diff 格式的补丁
 */
class PatchApplierModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    
    override fun getName(): String {
        return "PatchApplier"
    }
    
    /**
     * 应用补丁到目标文件
     * @param targetFilePath 目标文件路径
     * @param patchContent 补丁内容（unified diff格式）
     * @param options 选项（可选）
     * @param promise Promise回调
     */
    @ReactMethod
    fun applyPatch(targetFilePath: String, patchContent: String, options: ReadableMap?, promise: Promise) {
        executor.execute {
            try {
                val createBackup = options?.getBoolean("backup") ?: true
                val validateHash = options?.getString("expectedSourceHash")
                
                val result = applyPatchSync(targetFilePath, patchContent, createBackup, validateHash)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("PATCH_ERROR", "Failed to apply patch: ${e.message}", e)
            }
        }
    }
    
    /**
     * 验证补丁格式
     * @param patchContent 补丁内容
     * @param promise Promise回调
     */
    @ReactMethod
    fun validatePatchFormat(patchContent: String, promise: Promise) {
        try {
            val isValid = isValidUnifiedDiff(patchContent)
            val result = WritableNativeMap()
            result.putBoolean("valid", isValid)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("VALIDATION_ERROR", "Failed to validate patch: ${e.message}", e)
        }
    }
    
    /**
     * 同步应用补丁 - 使用 java-diff-utils 库
     */
    private fun applyPatchSync(targetFilePath: String, patchContent: String, createBackup: Boolean, expectedHash: String?): WritableMap {
        val targetFile = File(targetFilePath)
        
        // 检查目标文件是否存在
        if (!targetFile.exists()) {
            throw IllegalArgumentException("Target file does not exist: $targetFilePath")
        }
        
        // 读取原文件内容
        val originalContent = targetFile.readText(Charsets.UTF_8)
        val originalLines = originalContent.lines()
        
        // 验证源文件哈希（如果提供）
        if (expectedHash != null) {
            val actualHash = calculateSHA256(originalContent)
            if (actualHash != expectedHash) {
                throw IllegalStateException("Source file hash mismatch. Expected: $expectedHash, Actual: $actualHash")
            }
        }
        
        // 使用 java-diff-utils 解析并应用补丁
        val patchLines = patchContent.lines()
        val patch = UnifiedDiffUtils.parseUnifiedDiff(patchLines)
        
        // 应用补丁
        val patchedLines = DiffUtils.patch(originalLines, patch)
        val patchedContent = patchedLines.joinToString("\n")
        
        // 创建备份
        var backupPath: String? = null
        if (createBackup) {
            val backupFile = File(targetFile.parent, "${targetFile.name}.backup.${System.currentTimeMillis()}")
            targetFile.copyTo(backupFile)
            backupPath = backupFile.absolutePath
        }
        
        // 写入补丁后的内容
        targetFile.writeText(patchedContent, Charsets.UTF_8)
        
        // 构建返回结果
        val result = WritableNativeMap()
        result.putBoolean("success", true)
        result.putString("action", "applied")
        result.putString("targetFile", targetFilePath)
        if (backupPath != null) {
            result.putString("backupFile", backupPath)
        }
        result.putInt("originalSize", originalContent.length)
        result.putInt("patchedSize", patchedContent.length)
        result.putInt("changedLines", countChangedLines(originalLines, patchedLines))
        result.putString("newHash", calculateSHA256(patchedContent))
        
        return result
    }
    
    /**
     * 验证是否为有效的 unified diff 格式
     */
    private fun isValidUnifiedDiff(patchContent: String): Boolean {
        return try {
            val patchLines = patchContent.lines()
            UnifiedDiffUtils.parseUnifiedDiff(patchLines)
            true
        } catch (e: Exception) {
            false
        }
    }
    
    
    /**
     * 统计变更行数
     */
    private fun countChangedLines(originalLines: List<String>, patchedLines: List<String>): Int {
        val originalSet = originalLines.toSet()
        val patchedSet = patchedLines.toSet()
        
        val added = patchedLines.filter { it !in originalSet }.size
        val removed = originalLines.filter { it !in patchedSet }.size
        
        return added + removed
    }
    
    /**
     * 计算 SHA256 哈希值
     */
    private fun calculateSHA256(content: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(content.toByteArray(Charsets.UTF_8))
        return "sha256:" + hash.joinToString("") { "%02x".format(it) }
    }
    
}