# Build Server

统一的热更新补丁生成服务，基于java-diff-utils实现。

## 目录结构

```
build-server/
├── java-client/           # Java差异服务客户端
│   ├── src/main/java/com/demo/
│   │   └── DiffServiceClient.java
│   ├── target/
│   ├── pom.xml
│   └── dependency-reduced-pom.xml
├── node-client/           # Node.js客户端封装
│   ├── simple-diff-service-manager.js
│   ├── index.js
│   ├── package.json
│   └── node_modules/
├── test/                  # 测试文件
│   ├── test-bundles/
│   ├── output/
│   └── integration-test.js
└── README.md
```

## 特性

- 基于java-diff-utils的高质量diff算法（Myers算法）
- 轻量级Java服务，无需Spring Boot依赖
- 生成标准unified diff格式
- Node.js友好的集成接口
- 自动服务管理和错误重试
- 跨平台路径处理
- 跨App一致性保障

## 使用方式

```javascript
const { generatePatch } = require('./node-client');

const result = await generatePatch(oldBundlePath, newBundlePath, outputDir);
```