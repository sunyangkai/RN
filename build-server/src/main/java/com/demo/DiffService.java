package com.demo;

import com.github.difflib.DiffUtils;
import com.github.difflib.UnifiedDiffUtils;
import com.github.difflib.patch.Patch;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 简单的命令行diff工具
 * 使用方式: java -jar diff-service.jar <oldFile> <newFile> [outputFile]
 */
public class DiffService {
    
    private static final double PATCH_SIZE_THRESHOLD = 5.0;
    
    public static void main(String[] args) {
        if (args.length < 2) {
            System.err.println("Usage: java -jar diff-service.jar <oldFile> <newFile> [outputFile]");
            System.exit(1);
        }
        
        String oldFile = args[0];
        String newFile = args[1];
        String outputFile = args.length > 2 ? args[2] : null;
        
        try {
            PatchResult result = generateDiffPatch(oldFile, newFile, outputFile);
            
            // 输出JSON结果到stdout
            String jsonOutput = buildJsonResponse(result);
            System.out.println(jsonOutput);
            
            if (!result.success) {
                System.exit(1);
            }
            
        } catch (Exception e) {
            // 输出错误JSON到stdout
            JsonBuilder json = new JsonBuilder();
            json.add("success", false);
            json.add("error", e.getMessage());
            System.out.println(json.build());
            System.exit(1);
        }
    }
    
    private static PatchResult generateDiffPatch(String oldFile, String newFile, String outputFile) throws Exception {
        if (!Files.exists(Paths.get(oldFile))) {
            throw new Exception("Old file does not exist: " + oldFile);
        }
        
        if (!Files.exists(Paths.get(newFile))) {
            throw new Exception("New file does not exist: " + newFile);
        }
        
        String oldContent = Files.readString(Paths.get(oldFile), StandardCharsets.UTF_8);
        String newContent = Files.readString(Paths.get(newFile), StandardCharsets.UTF_8);
        
        List<String> oldLines = oldContent.lines().collect(Collectors.toList());
        List<String> newLines = newContent.lines().collect(Collectors.toList());
        
        Patch<String> patch = DiffUtils.diff(oldLines, newLines);
        
        List<String> unifiedDiff = UnifiedDiffUtils.generateUnifiedDiff(
            "old", "new", oldLines, patch, 3);
        
        String patchContent = String.join("\n", unifiedDiff);
        int patchSize = patchContent.length();
        double sizeRatio = (double) patchSize / oldContent.length();
        
        int operationsCount = patch.getDeltas().size();
        
        if (sizeRatio > PATCH_SIZE_THRESHOLD) {
            return new PatchResult(false, null, null, null, null, 
                "patch_too_large", "full_download", null,
                oldContent.length(), newContent.length(), patchSize, sizeRatio, operationsCount);
        }
        
        String patchFilePath = null;
        if (outputFile != null && !outputFile.trim().isEmpty()) {
            Files.createDirectories(Paths.get(outputFile).getParent());
            patchFilePath = outputFile;
            Files.write(Paths.get(patchFilePath), patchContent.getBytes(StandardCharsets.UTF_8));
        }
        
        String sourceHash = calculateHash(oldContent);
        String targetHash = calculateHash(newContent);
        
        return new PatchResult(true, patchFilePath, patchContent, sourceHash, targetHash,
            null, null, null, oldContent.length(), newContent.length(), 
            patchSize, sizeRatio, operationsCount);
    }
    
    private static String calculateHash(String content) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return "sha256:" + hexString.toString();
    }
    
    private static String buildJsonResponse(PatchResult result) {
        JsonBuilder json = new JsonBuilder();
        json.add("success", result.success);
        
        if (result.success) {
            json.addIfNotNull("patchFilePath", result.patchFilePath);
            json.addIfNotNull("patchContent", result.patchContent);
            json.add("sourceHash", result.sourceHash);
            json.add("targetHash", result.targetHash);
            json.addObject("stats", stats -> {
                stats.add("oldSize", result.oldSize);
                stats.add("newSize", result.newSize);
                stats.add("patchSize", result.patchSize);
                stats.add("sizeRatio", result.sizeRatio);
                stats.add("operationsCount", result.operationsCount);
            });
        } else {
            json.addIfNotNull("reason", result.reason);
            json.addIfNotNull("recommendation", result.recommendation);
            json.addIfNotNull("error", result.error);
            if (result.oldSize > 0) {
                json.addObject("stats", stats -> {
                    stats.add("oldSize", result.oldSize);
                    stats.add("newSize", result.newSize);
                    stats.add("patchSize", result.patchSize);
                    stats.add("sizeRatio", result.sizeRatio);
                    stats.add("operationsCount", result.operationsCount);
                });
            }
        }
        
        return json.build();
    }
    
    static class PatchResult {
        boolean success;
        String patchFilePath;
        String patchContent;
        String sourceHash;
        String targetHash;
        String reason;
        String recommendation;
        String error;
        int oldSize;
        int newSize;
        int patchSize;
        double sizeRatio;
        int operationsCount;
        
        public PatchResult(boolean success, String patchFilePath, String patchContent,
                         String sourceHash, String targetHash, String reason,
                         String recommendation, String error, int oldSize, int newSize,
                         int patchSize, double sizeRatio, int operationsCount) {
            this.success = success;
            this.patchFilePath = patchFilePath;
            this.patchContent = patchContent;
            this.sourceHash = sourceHash;
            this.targetHash = targetHash;
            this.reason = reason;
            this.recommendation = recommendation;
            this.error = error;
            this.oldSize = oldSize;
            this.newSize = newSize;
            this.patchSize = patchSize;
            this.sizeRatio = sizeRatio;
            this.operationsCount = operationsCount;
        }
    }
}