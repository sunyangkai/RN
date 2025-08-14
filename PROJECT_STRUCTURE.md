# React Native 热更新项目结构说明

## 📋 项目概述

这是一个React Native热更新项目，支持OTA（Over-The-Air）更新，包含全量包和差量包两种更新方式。项目采用Node.js + Java的混合架构，提供完整的构建、分发和更新功能。

## 🏗️ 项目架构

```
demo/
├── 📱 React Native App (主应用)
├── 🔧 build-client/ (构建客户端)
├── ☕ build-server/ (Java差量服务)
├── 📦 build/ (构建产物)
└── 🔄 热更新相关文件
```

## 📁 详细目录结构

### 🎯 核心目录

#### `/` (项目根目录)
```
├── package.json              # 主项目依赖和脚本配置
├── App.tsx                   # React Native主组件
├── index.js                  # RN应用入口
├── hot-update-manager.js     # 热更新管理器
├── babel.config.js           # Babel配置
├── metro.config.js           # Metro打包配置
├── tsconfig.json             # TypeScript配置
└── PROJECT_STRUCTURE.md      # 本文档
```

#### `/src/` (React Native源码)
```
src/
├── assets/                   # 静态资源
│   ├── icons/               # 图标文件
│   └── imgs/                # 图片文件
├── components/              # React组件
├── screens/                 # 页面组件
├── services/                # 业务服务
├── config/
│   └── update-config.js     # 热更新配置
├── bridge/                  # 原生桥接
├── utils/                   # 工具函数
└── types/                   # TypeScript类型定义
```

#### `/build-client/` (构建客户端 - 扁平化架构)
```
build-client/
├── index.js                 # 命令行入口
├── build.js                 # 核心构建逻辑
├── config.js                # 构建配置 (动态IP)
├── file-utils.js            # 文件操作工具
├── hash-utils.js            # 哈希计算工具
├── diff-service.js          # Java diff服务调用器
├── static-server.js         # Koa静态资源服务器
└── start-server.js          # 独立服务器启动脚本
```

#### `/build-server/` (Java差量服务)
```
build-server/
├── pom.xml                  # Maven配置
├── src/main/java/com/demo/
│   ├── DiffService.java     # 唯一Java文件 - 命令行diff工具
│   └── JsonBuilder.java     # JSON构建工具
└── target/
    └── diff-service-1.0.0.jar # 可执行JAR文件
```

#### `/build/` (构建产物 - Git忽略)
```
build/
├── manifest.json            # 热更新清单文件
├── bundles/                 # 版本化Bundle文件
│   ├── 0.0.42/
│   ├── 0.0.43/
│   └── ...                  # 每个版本一个目录
├── patches/                 # 差量补丁文件
│   ├── 0.0.42-to-0.0.43.patch
│   └── ...
└── assets/                  # 静态资源文件
```

#### `/android/` (Android项目)
```
android/
├── app/
│   ├── src/main/java/com/demo/
│   │   ├── MainActivity.kt         # 主Activity
│   │   ├── PatchApplierModule.kt   # 补丁应用模块
│   │   └── ...
│   └── src/main/assets/
│       └── index.android.bundle    # 打包到APK的bundle
└── build.gradle             # Android构建配置
```

## 🔧 关键文件说明

### 核心业务文件

| 文件 | 用途 | 说明 |
|------|------|------|
| `hot-update-manager.js` | 热更新核心逻辑 | 检查更新、下载补丁、应用更新 |
| `src/config/update-config.js` | 热更新配置 | 服务器地址、API路径配置 |

### 构建系统文件

| 文件 | 用途 | 说明 |
|------|------|------|
| `build-client/build.js` | 核心构建逻辑 | Bundle构建、补丁生成、manifest管理 |
| `build-client/config.js` | 构建配置 | 动态IP获取、路径配置 |
| `build-client/static-server.js` | 静态资源服务器 | Koa服务器，提供manifest、bundle、patch |

### Java服务文件

| 文件 | 用途 | 说明 |
|------|------|------|
| `build-server/src/main/java/com/demo/DiffService.java` | 差量算法 | 命令行diff工具，生成unified diff补丁 |
| `build-server/target/diff-service-1.0.0.jar` | 可执行JAR | Node.js直接调用的差量服务 |

### 产物文件

| 文件/目录 | 用途 | 说明 |
|-----------|------|------|
| `build/manifest.json` | 更新清单 | 包含版本信息、下载地址、哈希验证 |
| `build/bundles/` | Bundle存储 | 按版本号组织的bundle文件 |
| `build/patches/` | 补丁存储 | 版本间的差量补丁文件 |

## 🚀 NPM Scripts

### 开发命令
```bash
npm install              # 安装所有依赖（统一管理）
npm run build-ota        # 构建OTA全量包
npm run build-ota:patch  # 构建OTA差量包
npm run static-server    # 启动静态资源服务器
npm run dev-server       # 构建+启动服务器（一键开发）
```

### React Native命令
```bash
npm run android          # 运行Android应用
npm run start           # 启动Metro服务器
npm run build           # 构建APK内置bundle
```

## 🔄 热更新工作流程

### 1. 构建阶段
1. **全量包**: `npm run build-ota`
   - 执行React Native bundle打包
   - 直接输出到`build/bundles/版本号/`
   - 生成全量manifest.json

2. **差量包**: `npm run build-ota:patch`
   - 构建新版本bundle（不更新manifest）
   - 调用Java diff服务生成补丁
   - 在buildOTA层统一更新manifest

### 2. 服务阶段
- **静态服务器**: 基于Koa的HTTP服务器
- **端口**: 8040（动态获取本地IP）
- **CORS**: 支持跨域访问
- **路由**: `/health`, `/version`, `/manifest.json`, `/bundles/*`, `/patches/*`

### 3. 更新阶段
- **检查**: 应用启动时检查manifest.json
- **差量更新**: 优先使用补丁文件
- **完整更新**: 补丁失败时回退到完整下载
- **原子替换**: 确保更新过程的安全性

## 🎯 架构优势

### 简洁性
- **扁平化结构**: build-client无多层嵌套
- **统一依赖**: 所有依赖在主package.json中
- **单一职责**: 每个文件功能明确

### 可维护性
- **职责分离**: 构建、服务、差量算法分离
- **统一接口**: createUpdateManifest统一处理全量和差量
- **动态配置**: 自动获取本地IP，适应网络环境

### 开发友好
- **一键操作**: dev-server命令一键构建+启动
- **实时调试**: 静态服务器支持本地开发测试
- **版本管理**: 自动版本化存储，便于回溯

## 🛠️ 技术栈

- **前端**: React Native + TypeScript
- **构建**: Node.js + Metro
- **服务**: Koa.js (静态资源服务)
- **差量**: Java + java-diff-utils
- **存储**: 文件系统 + AsyncStorage
- **网络**: HTTP + fetch API

## 📝 开发注意事项

1. **IP地址**: 使用本地IP而非localhost，确保模拟器可访问
2. **端口管理**: 默认8040端口，可通过参数指定其他端口
3. **文件清理**: 构建过程自动清理临时文件
4. **版本管理**: 基于package.json自动获取版本号
5. **路径安全**: 静态服务器包含路径遍历防护

## 🔐 安全考虑

- **路径验证**: 防止目录遍历攻击
- **哈希校验**: 所有文件传输都进行SHA-256验证
- **原子操作**: 更新过程使用原子性文件替换
- **错误处理**: 完善的错误处理和回退机制