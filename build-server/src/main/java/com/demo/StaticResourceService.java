package com.demo;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

public class StaticResourceService {
    
    private HttpServer server;
    
    public static void main(String[] args) {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8081;
        
        try {
            StaticResourceService service = new StaticResourceService();
            service.start(port);
            System.out.println("Static Resource Service started on port " + port);
            System.out.println("Press Ctrl+C to stop");
        } catch (Exception e) {
            System.err.println("Failed to start static resource service: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public void start(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/health", new HealthHandler());
        server.createContext("/version", new VersionHandler());
        server.createContext("/bundles/", new StaticFileHandler("bundles"));
        server.createContext("/patches/", new StaticFileHandler("patches"));
        server.createContext("/manifest.json", new ManifestHandler());
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
            String response = "Static Resource Service v1.0.0";
            byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, responseBytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(responseBytes);
            os.close();
        }
    }
    
    static class StaticFileHandler implements HttpHandler {
        private final String baseDir;
        
        public StaticFileHandler(String baseDir) {
            this.baseDir = baseDir;
        }
        
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String requestPath = exchange.getRequestURI().getPath();
            String fileName = requestPath.substring(requestPath.indexOf(baseDir) + baseDir.length() + 1);
            
            java.nio.file.Path filePath = Paths.get("src/main/resources", baseDir, fileName);
            
            try {
                if (!Files.exists(filePath)) {
                    exchange.sendResponseHeaders(404, 0);
                    exchange.getResponseBody().close();
                    return;
                }
                
                String contentType = getContentType(fileName);
                byte[] fileBytes = Files.readAllBytes(filePath);
                
                exchange.getResponseHeaders().set("Content-Type", contentType);
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.sendResponseHeaders(200, fileBytes.length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(fileBytes);
                os.close();
                
            } catch (Exception e) {
                e.printStackTrace();
                exchange.sendResponseHeaders(500, 0);
                exchange.getResponseBody().close();
            }
        }
        
        private String getContentType(String fileName) {
            if (fileName.endsWith(".js")) return "application/javascript";
            if (fileName.endsWith(".json")) return "application/json";
            if (fileName.endsWith(".patch")) return "text/plain";
            if (fileName.endsWith(".diff")) return "text/plain";
            return "application/octet-stream";
        }
    }
    
    static class ManifestHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                java.nio.file.Path manifestPath = Paths.get("src/main/resources/manifest.json");
                
                if (!Files.exists(manifestPath)) {
                    exchange.sendResponseHeaders(404, 0);
                    exchange.getResponseBody().close();
                    return;
                }
                
                byte[] manifestBytes = Files.readAllBytes(manifestPath);
                
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.sendResponseHeaders(200, manifestBytes.length);
                
                OutputStream os = exchange.getResponseBody();
                os.write(manifestBytes);
                os.close();
                
            } catch (Exception e) {
                e.printStackTrace();
                sendErrorResponse(exchange, e.getMessage());
            }
        }
        
        private void sendErrorResponse(HttpExchange exchange, String error) throws IOException {
            JsonBuilder json = new JsonBuilder();
            json.add("success", false);
            json.add("error", error);
            String jsonResponse = json.build();
            byte[] responseBytes = jsonResponse.getBytes(StandardCharsets.UTF_8);
            
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(500, responseBytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(responseBytes);
            os.close();
        }
    }
    
}