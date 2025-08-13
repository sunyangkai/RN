const Koa = require('koa');
const cors = require('@koa/cors');
const serve = require('koa-static');
const fs = require('fs');
const path = require('path');

class StaticServer {
  constructor(port = 8081) {
    this.port = port;
    this.app = new Koa();
    this.server = null;
    this.buildDir = path.resolve('.', 'build');
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS支持
    this.app.use(cors());
    
    // 错误处理
    this.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        console.error('Server error:', err);
        ctx.status = 500;
        ctx.body = {
          success: false,
          error: err.message
        };
      }
    });
  }

  setupRoutes() {
    // 健康检查
    this.app.use(async (ctx, next) => {
      if (ctx.path === '/health') {
        ctx.body = 'OK';
        return;
      }
      await next();
    });

    // 版本信息
    this.app.use(async (ctx, next) => {
      if (ctx.path === '/version') {
        ctx.body = 'Static Resource Service v1.0.0 (Koa)';
        return;
      }
      await next();
    });

    // Manifest文件处理
    this.app.use(async (ctx, next) => {
      if (ctx.path === '/manifest.json') {
        const manifestPath = path.join(this.buildDir, 'manifest.json');
        
        if (!fs.existsSync(manifestPath)) {
          ctx.status = 404;
          ctx.body = 'Manifest not found';
          return;
        }

        try {
          const manifestContent = fs.readFileSync(manifestPath, 'utf8');
          ctx.type = 'application/json';
          ctx.body = manifestContent;
        } catch (error) {
          ctx.status = 500;
          ctx.body = {
            success: false,
            error: error.message
          };
        }
        return;
      }
      await next();
    });

    // 静态文件服务 - bundles和patches
    this.app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/bundles/') || ctx.path.startsWith('/patches/')) {
        const relativePath = ctx.path.substring(1); // 移除开头的'/'
        const filePath = path.join(this.buildDir, relativePath);
        
        // 安全检查：确保文件路径在build目录内
        const resolvedPath = path.resolve(filePath);
        const resolvedBuildDir = path.resolve(this.buildDir);
        
        if (!resolvedPath.startsWith(resolvedBuildDir)) {
          ctx.status = 403;
          ctx.body = 'Forbidden';
          return;
        }

        if (!fs.existsSync(filePath)) {
          ctx.status = 404;
          ctx.body = 'File not found';
          return;
        }

        try {
          const fileContent = fs.readFileSync(filePath);
          const contentType = this.getContentType(path.extname(filePath));
          
          ctx.type = contentType;
          ctx.body = fileContent;
        } catch (error) {
          ctx.status = 500;
          ctx.body = {
            success: false,
            error: error.message
          };
        }
        return;
      }
      await next();
    });

    // 404处理
    this.app.use(async (ctx) => {
      ctx.status = 404;
      ctx.body = 'Not Found';
    });
  }

  getContentType(ext) {
    const types = {
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.patch': 'text/plain',
      '.diff': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };
    
    return types[ext.toLowerCase()] || 'application/octet-stream';
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Static server started on port ${this.port}`);
          console.log(`Serving files from: ${this.buildDir}`);
          resolve();
        }
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Static server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = StaticServer;