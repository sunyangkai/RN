package com.demo;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class UnifiedService {
    
    private HttpServer server;
    private DiffService diffService;
    private StaticResourceService staticService;
    
    public static void main(String[] args) {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8082;
        
        try {
            UnifiedService service = new UnifiedService();
            service.start(port);
            System.out.println("Unified Service started on port " + port);
            System.out.println("Diff Service API: /api/diff/*");
            System.out.println("Static Resource API: /api/static/*");
            System.out.println("Press Ctrl+C to stop");
        } catch (Exception e) {
            System.err.println("Failed to start unified service: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public void start(int port) throws IOException {
        diffService = new DiffService();
        staticService = new StaticResourceService();
        
        server = HttpServer.create(new InetSocketAddress(port), 0);
        
        // 全局健康检查和版本信息
        server.createContext("/health", new GlobalHealthHandler());
        server.createContext("/version", new GlobalVersionHandler());
        
        // Diff服务路由 - 添加 /api/diff 前缀
        server.createContext("/api/diff/health", new DiffHealthHandler());
        server.createContext("/api/diff/version", new DiffVersionHandler());
        server.createContext("/api/diff/generate-patch", new DiffGeneratePatchHandler());
        
        // 静态资源服务路由 - 添加 /api/static 前缀
        server.createContext("/api/static/health", new StaticHealthHandler());
        server.createContext("/api/static/version", new StaticVersionHandler());
        server.createContext("/api/static/bundles/", new StaticBundlesHandler());
        server.createContext("/api/static/patches/", new StaticPatchesHandler());
        server.createContext("/api/static/manifest.json", new StaticManifestHandler());
        
        server.setExecutor(null);
        server.start();
    }
    
    public void stop() {
        if (server != null) {
            server.stop(0);
        }
        if (diffService != null) {
            diffService.stop();
        }
        if (staticService != null) {
            staticService.stop();
        }
    }
    
    // 全局处理器
    static class GlobalHealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String response = "{\"status\": \"OK\", \"services\": [\"diff\", \"static\"]}";
            byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(responseBytes);
            os.close();
        }
    }
    
    static class GlobalVersionHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String response = "Unified Service v1.0.0 (Diff Service + Static Resource Service)";
            byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, responseBytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(responseBytes);
            os.close();
        }
    }
    
    // Diff服务代理处理器
    static class DiffHealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            DiffService.HealthHandler handler = new DiffService.HealthHandler();
            handler.handle(exchange);
        }
    }
    
    static class DiffVersionHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            DiffService.VersionHandler handler = new DiffService.VersionHandler();
            handler.handle(exchange);
        }
    }
    
    static class DiffGeneratePatchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            DiffService.GeneratePatchHandler handler = new DiffService.GeneratePatchHandler();
            handler.handle(exchange);
        }
    }
    
    // 静态资源服务代理处理器
    static class StaticHealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            StaticResourceService.HealthHandler handler = new StaticResourceService.HealthHandler();
            handler.handle(exchange);
        }
    }
    
    static class StaticVersionHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            StaticResourceService.VersionHandler handler = new StaticResourceService.VersionHandler();
            handler.handle(exchange);
        }
    }
    
    static class StaticBundlesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            StaticResourceService.StaticFileHandler handler = new StaticResourceService.StaticFileHandler("bundles");
            handler.handle(exchange);
        }
    }
    
    static class StaticPatchesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            StaticResourceService.StaticFileHandler handler = new StaticResourceService.StaticFileHandler("patches");
            handler.handle(exchange);
        }
    }
    
    static class StaticManifestHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            StaticResourceService.ManifestHandler handler = new StaticResourceService.ManifestHandler();
            handler.handle(exchange);
        }
    }
}