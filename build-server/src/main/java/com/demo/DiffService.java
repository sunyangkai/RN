package com.demo;

import com.github.difflib.DiffUtils;
import com.github.difflib.UnifiedDiffUtils;
import com.github.difflib.patch.Patch;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

public class DiffService {
    
    private static final double PATCH_SIZE_THRESHOLD = 5.0;
    private HttpServer server;
    
    public static void main(String[] args) {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8080;
        
        try {
            DiffService service = new DiffService();
            service.start(port);
            System.out.println("Diff Service started on port " + port);
            System.out.println("Press Ctrl+C to stop");
        } catch (Exception e) {
            System.err.println("Failed to start diff service: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public void start(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/health", new HealthHandler());
        server.createContext("/version", new VersionHandler());
        server.createContext("/api/generate-patch", new GeneratePatchHandler());
        server.setExecutor(null);
        server.start();
    }
    
    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }
    
    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String response = "OK";
            byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, responseBytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(responseBytes);
            os.close();
        }
    }
    
    static class VersionHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String response = "Diff Service v1.0.0";
            byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, responseBytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(responseBytes);
            os.close();
        }
    }
    
    static class GeneratePatchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(405, 0);
                return;
            }
            
            try {
                String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                
                String oldFile = extractJsonValue(requestBody, "oldFile");
                String newFile = extractJsonValue(requestBody, "newFile");
                String outputDir = extractJsonValue(requestBody, "outputDir");
                
                if (oldFile == null || newFile == null) {
                    sendErrorResponse(exchange, "oldFile and newFile parameters are required");
                    return;
                }
                
                if (!Files.exists(Paths.get(oldFile))) {
                    sendErrorResponse(exchange, "Old file does not exist: " + oldFile);
                    return;
                }
                
                if (!Files.exists(Paths.get(newFile))) {
                    sendErrorResponse(exchange, "New file does not exist: " + newFile);
                    return;
                }
                
                PatchResult result = generateDiffPatch(oldFile, newFile, outputDir);
                
                String jsonResponse = buildJsonResponse(result);
                byte[] responseBytes = jsonResponse.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                exchange.sendResponseHeaders(200, responseBytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(responseBytes);
                os.close();
                
            } catch (Exception e) {
                e.printStackTrace();
                sendErrorResponse(exchange, e.getMessage());
            }
        }
        
        private String extractJsonValue(String json, String key) {
            String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(json);
            return m.find() ? m.group(1) : null;
        }
        
        private void sendErrorResponse(HttpExchange exchange, String error) throws IOException {
            JsonBuilder json = new JsonBuilder();
            json.add("success", false);
            json.add("error", error);
            String jsonResponse = json.build();
            byte[] responseBytes = jsonResponse.getBytes(StandardCharsets.UTF_8);
            
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(200, responseBytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(responseBytes);
            os.close();
        }
        
        private PatchResult generateDiffPatch(String oldFile, String newFile, String outputDir) throws Exception {
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
            if (outputDir != null && !outputDir.trim().isEmpty()) {
                Files.createDirectories(Paths.get(outputDir));
                patchFilePath = Paths.get(outputDir, "patch_" + System.currentTimeMillis() + ".diff").toString();
                Files.write(Paths.get(patchFilePath), patchContent.getBytes(StandardCharsets.UTF_8));
            }
            
            String sourceHash = calculateHash(oldContent);
            String targetHash = calculateHash(newContent);
            
            return new PatchResult(true, patchFilePath, patchContent, sourceHash, targetHash,
                null, null, null, oldContent.length(), newContent.length(), 
                patchSize, sizeRatio, operationsCount);
        }
        
        private String calculateHash(String content) throws Exception {
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
        
        private String buildJsonResponse(PatchResult result) {
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