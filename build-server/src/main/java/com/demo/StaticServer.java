package com.demo;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

public class StaticServer {
    
    private HttpServer server;
    
    public static void main(String[] args) {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8040;
        
        try {
            StaticServer service = new StaticServer();
            service.start(port);
            System.out.println("Static Server started on port " + port);
            System.out.println("Press Ctrl+C to stop");
        } catch (Exception e) {
            System.err.println("Failed to start static server: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public void start(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/health", new HealthHandler());
        server.createContext("/manifest.json", new ManifestHandler());
        server.createContext("/bundles/", new BundlesHandler());
        server.createContext("/patches/", new PatchesHandler());
        server.setExecutor(null);
        server.start();
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
    
    static class ManifestHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                java.nio.file.Path manifestPath = Paths.get("build/manifest.json");
                
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
                exchange.sendResponseHeaders(500, 0);
                exchange.getResponseBody().close();
            }
        }
    }
    
    static class BundlesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String requestPath = exchange.getRequestURI().getPath();
            String fileName = requestPath.substring("/bundles/".length());
            
            java.nio.file.Path filePath = Paths.get("build/bundles", fileName);
            
            try {
                if (!Files.exists(filePath)) {
                    exchange.sendResponseHeaders(404, 0);
                    exchange.getResponseBody().close();
                    return;
                }
                
                byte[] fileBytes = Files.readAllBytes(filePath);
                
                exchange.getResponseHeaders().set("Content-Type", "application/javascript");
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
    }
    
    static class PatchesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String requestPath = exchange.getRequestURI().getPath();
            String fileName = requestPath.substring("/patches/".length());
            
            java.nio.file.Path filePath = Paths.get("build/patches", fileName);
            
            try {
                if (!Files.exists(filePath)) {
                    exchange.sendResponseHeaders(404, 0);
                    exchange.getResponseBody().close();
                    return;
                }
                
                byte[] fileBytes = Files.readAllBytes(filePath);
                
                exchange.getResponseHeaders().set("Content-Type", "text/plain");
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
    }
}