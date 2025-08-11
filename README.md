# React Native Hot Update Demo

React Native 热更新演示项目，支持差量更新和完整下载模式。

## 项目结构

```
demo/
├── 应用入口
│   ├── index.js                    # 应用启动入口，集成热更新检查
│   ├── App.tsx                     # 主应用组件
│   └── app.json                    # 应用基础配置 - RN应用的身份信息
│
├── 热更新核心
│   ├── hot-update-manager.js       # 热更新管理器，处理版本检查、下载、补丁应用
│   ├── patch-generator.js          # 补丁生成工具，将文件差异转换为补丁
│   └── build-scripts.js           # 构建脚本，支持bundle构建和补丁生成
│
├── UI组件
│   ├── src/
│   │   ├── components/ # app通用UI组件
│   │   │   └── TabNavigator.tsx    
│   │   ├── screens/                # 页面组件
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── IdcardScreen.tsx    
│   │   │   ├── MessageScreen.tsx   
│   │   │   └── ProfileScreen.tsx  
│   │   ├── assets/                 # 静态资源
│   │   │   ├── icons/              # 图标资源
│   │   │   └── imgs/               # 图片资源
│   │   └── service/
│   │       └── navivation.js       # 导航服务
│
├── Android配置 (前端重点关注)
│   ├── android/
│   │   ├── app/                    # Android应用模块
│   │   │   ├── build.gradle        # 应用级构建配置 - 配置应用版本、依赖库
│   │   │   ├── debug.keystore      # 调试签名文件 - 用于开发测试
│   │   │   └── src/main/
│   │   │       ├── AndroidManifest.xml    # 应用清单 - 定义权限、入口Activity等
│   │   │       ├── assets/               # 静态资源目录 (前端关注)
│   │   │       │   └── index.android.bundle  # RN打包后的JS代码，热更新的目标文件
│   │   │       ├── res/                  # Android资源文件夹
│   │   │       │   ├── drawable/         # 图片资源
│   │   │       │   ├── mipmap-*/         # 应用图标 (不同分辨率)
│   │   │       │   └── values/
│   │   │       │       ├── strings.xml  # 字符串资源 - 应用名称等
│   │   │       │       └── styles.xml   # 样式资源 - 主题颜色等
│   │   │       └── java/com/demo/        # 原生代码
│   │   │           ├── MainActivity.kt     # 主Activity - RN应用入口
│   │   │           └── MainApplication.kt  # 应用类 - 初始化RN和第三方库
│   │   ├── build.gradle            # 项目级构建配置 - 全局依赖和插件
│   │   ├── gradle.properties       # Gradle属性 - 构建优化配置
│   │   ├── gradlew                 # Gradle包装器 - Linux/Mac执行脚本
│   │   ├── gradlew.bat             # Gradle包装器 - Windows执行脚本
│   │   └── settings.gradle         # 项目设置 - 定义包含的模块
│
├── 测试
│   └── __tests__/
│       └── App.test.tsx            # 应用组件测试
│
├── 配置文件
│   ├── package.json                # 项目依赖和脚本配置
│   ├── tsconfig.json              # TypeScript配置
│   ├── babel.config.js            # Babel转译配置
│   ├── metro.config.js            # Metro打包配置
│   ├── jest.config.js             # Jest测试配置
│   ├── .eslintrc.js               # ESLint代码检查配置
│   └── .prettierrc.js             # Prettier代码格式化配置
│
└── 文档
    └── README.md                   # 项目说明文档
```

## 热更新功能

### 核心特性

- **差量更新**: 只下载变更部分，减少更新包大小
- **完整更新**: 差量更新失败时自动回退到完整下载
- **哈希验证**: 确保文件完整性和安全性
- **原子性更新**: 避免更新过程中的文件损坏

### 关键文件说明

| 文件 | 功能描述 |
|------|----------|
| `hot-update-manager.js` | 热更新主管理器，负责版本检查、文件下载、补丁应用 |
| `patch-generator.js` | 补丁生成工具，使用jsdiff库计算文件差异并生成补丁 |
| `build-scripts.js` | 构建脚本，支持bundle构建和补丁生成命令 |

### 更新流程

1. **版本检查**: 从服务器获取manifest.json检查新版本
2. **差量更新**: 如果支持，下载补丁文件并应用
3. **完整更新**: 差量失败时下载完整bundle
4. **验证**: 使用SHA256哈希验证文件完整性
5. **重启**: 提示用户重启应用以应用更新

## 快速开始

### 安装依赖
```bash
npm install
```

### 运行项目
```bash
# Android
npm run android

# Start Metro
npm start
```

### 构建Bundle
```bash
# 构建Android bundle
npm run build

# 构建测试用bundle（用于热更新测试）
npm run buildmock

# 生成补丁文件
npm run buildmockpatch
```

## 主要依赖

- **React Native**: 0.80.1
- **React Navigation**: 底部导航
- **react-native-fs**: 文件系统操作
- **crypto-js**: 哈希计算
- **diff**: 文件差异计算
- **react-native-restart**: 应用重启

## app.json 配置详解

`app.json` 是 React Native 应用的核心配置文件，定义了应用的基本信息：

### 当前配置
```json
{
  "name": "demo",           // 应用内部名称，用于代码中引用
  "displayName": "demo"     // 应用显示名称，用户在手机上看到的名称
}
```

### 完整配置选项
```json
{
  "name": "demo",                    // 必需：应用内部标识符
  "displayName": "我的热更新应用",     // 必需：用户看到的应用名称
  // React Native CLI 专用配置
  "react-native": {
    "project": {
      "android": {
        "sourceDir": "android",      // Android 源码目录
        "appName": "demo"           // Android 应用模块名称
      }
    },
    "assets": ["./assets/fonts/"]   // 需要链接的资源文件夹
  }
}
```

### 前端开发者常用配置

#### 1. 修改应用显示名称
```json
{
  "name": "demo",
  "displayName": "热更新演示"  // 修改这里改变应用在手机上的显示名称
}
```

#### 2. 配置资源文件夹 (字体、图片等)
```json
{
  "name": "demo",
  "displayName": "demo",
  "react-native": {
    "assets": [
      "./src/assets/fonts/",     // 自定义字体
      "./src/assets/images/"     // 图片资源
    ]
  }
}
```

#### 3. 多平台配置 (当前项目只支持Android)
```json
{
  "name": "demo",
  "displayName": "demo",
  "react-native": {
    "project": {
      "android": {
        "sourceDir": "android",
        "appName": "demo"
      }
      // 已移除 iOS 配置
    }
  }
}
```

### 重要说明

- **name**: 不能包含空格或特殊字符，通常使用小写字母和连字符
- **displayName**: 可以使用中文和特殊字符，这是用户看到的名称
- **修改后需要重新构建**: 改变配置后需要运行 `npm run android` 重新构建
- **与package.json关联**: 通常 `name` 字段与 `package.json` 中的 `name` 保持一致

### 实际应用示例

针对热更新项目，推荐配置：
```json
{
  "name": "hotupdate-demo",
  "displayName": "热更新演示",
  "react-native": {
    "assets": ["./src/assets/icons/", "./src/assets/imgs/"]
  }
}
```

## Android配置详解 (前端开发者必读)

作为前端开发者，您主要需要关注以下Android文件：

### 🔥 热更新相关 (重要)
```
android/app/src/main/assets/index.android.bundle
```
- **作用**: 这是RN打包后的JavaScript代码文件
- **重要性**: 热更新的目标文件，更新会替换这个文件
- **操作**: 通过`npm run build`命令生成

### 📱 应用配置文件

#### AndroidManifest.xml
```
android/app/src/main/AndroidManifest.xml
```
- **作用**: Android应用的"身份证"，定义应用权限、入口等
- **前端关注点**: 
  - 网络权限 (`INTERNET`) - 热更新需要
  - 文件读写权限 - 存储bundle文件
  - 应用名称和图标设置

#### build.gradle (应用级)
```
android/app/build.gradle
```
- **作用**: 配置应用版本、依赖库等
- **前端关注点**:
  - `versionCode` - 应用版本号，发布时需要递增
  - `versionName` - 显示给用户的版本号
  - RN相关依赖配置

### 🎨 资源文件

#### 应用图标
```
android/app/src/main/res/mipmap-*/
```
- **作用**: 不同分辨率的应用图标
- **前端操作**: 替换 `ic_launcher.png` 文件

#### 字符串资源
```
android/app/src/main/res/values/strings.xml
```
- **作用**: 定义应用名称等文本
- **前端操作**: 修改 `<string name="app_name">` 改变应用显示名称

### 🔧 构建工具 (了解即可)

#### gradlew / gradlew.bat
- **作用**: Gradle构建脚本
- **前端使用**: `./gradlew assembleDebug` 构建APK

#### gradle.properties
- **作用**: 构建优化配置
- **前端关注**: 内存分配、并行构建等性能配置

### 💡 前端开发者常见操作

1. **修改应用名称**: 编辑 `strings.xml` 中的 `app_name`
2. **更换应用图标**: 替换 `mipmap-*` 文件夹中的图标文件
3. **添加权限**: 在 `AndroidManifest.xml` 中添加 `<uses-permission>`
4. **调试APK**: 运行 `npm run android` 或 `./gradlew assembleDebug`
5. **查看构建日志**: 检查 `build.gradle` 中的配置

### ⚠️ 注意事项

- **不要随意修改**: `MainActivity.kt` 和 `MainApplication.kt` (除非添加原生模块)
- **版本管理**: 发布前记得更新 `versionCode` 和 `versionName`
- **签名文件**: `debug.keystore` 仅用于开发，生产需要正式签名

## RN与Android原生通信详解

React Native 和 Android 原生代码的通信是双向的，主要通过以下几种方式：

### 🔗 当前项目中的通信实例

#### 1. 热更新Bundle加载 (MainApplication.kt)

项目中最重要的原生通信是热更新的Bundle文件加载：

```kotlin
// 在 MainApplication.kt 中重写方法
override fun getJSBundleFile(): String? {
    val bundleFile = File(applicationContext.filesDir, "hotupdate.bundle")
    
    return if (bundleFile.exists()) {
        Log.d("fetchJsBoundle", "Loading local hotupdate.bundle: ${bundleFile.absolutePath}")
        bundleFile.absolutePath  // 返回热更新文件路径
    } else {
        Log.d("fetchJsBoundle", "No hotupdate.bundle found, falling back to default")
        super.getJSBundleFile()  // 返回默认Bundle文件
    }
}
```

**通信流程**：
1. RN通过 `react-native-fs` 下载Bundle文件到原生文件系统
2. 原生代码检查文件是否存在
3. 原生代码决定加载哪个Bundle文件
4. RN应用使用更新后的代码运行

### 📡 RN调用原生的主要方式

#### 1. Native Modules (原生模块)
```javascript
// JavaScript端调用
import { NativeModules } from 'react-native';
const { MyNativeModule } = NativeModules;

// 调用原生方法
MyNativeModule.showToast('Hello from RN!');
```

```kotlin
// Android端实现 (需要创建)
@ReactModule(name = "MyNativeModule")
class MyNativeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    @ReactMethod
    fun showToast(message: String) {
        Toast.makeText(reactApplicationContext, message, Toast.LENGTH_SHORT).show()
    }
}
```

#### 2. 通过第三方库调用原生功能
项目中使用的原生通信库：

```javascript
// react-native-fs - 文件系统操作
import RNFS from 'react-native-fs';
await RNFS.writeFile(filePath, content, 'utf8');  // RN调用原生文件写入

// react-native-restart - 应用重启
import RNRestart from 'react-native-restart';
RNRestart.Restart();  // RN调用原生重启功能

// @react-native-async-storage/async-storage - 存储
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('key', 'value');  // RN调用原生存储
```

### 🔄 原生调用RN的方式

#### 1. 事件发送 (DeviceEventEmitter)
```kotlin
// Android端发送事件
private fun sendEventToRN(eventName: String, params: WritableMap) {
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
}
```

```javascript
// RN端监听事件
import { DeviceEventEmitter } from 'react-native';

useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('MyEvent', (data) => {
        console.log('收到原生事件:', data);
    });
    
    return () => subscription?.remove();
}, []);
```

#### 2. Callback回调
```kotlin
// Android端
@ReactMethod
fun getDeviceInfo(callback: Callback) {
    val deviceInfo = // ... 获取设备信息
    callback.invoke(deviceInfo)
}
```

```javascript
// RN端
MyNativeModule.getDeviceInfo((deviceInfo) => {
    console.log('设备信息:', deviceInfo);
});
```

### 📋 创建自定义原生模块步骤

如果需要扩展热更新功能，可以创建自定义原生模块：

#### 1. 创建原生模块类
```kotlin
// android/app/src/main/java/com/demo/HotUpdateModule.kt
@ReactModule(name = "HotUpdateModule")
class HotUpdateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName() = "HotUpdateModule"
    
    @ReactMethod
    fun clearCache(promise: Promise) {
        try {
            // 清理缓存逻辑
            val cacheDir = File(reactApplicationContext.filesDir, "cache")
            cacheDir.deleteRecursively()
            promise.resolve("缓存清理成功")
        } catch (e: Exception) {
            promise.reject("CACHE_ERROR", e.message)
        }
    }
}
```

#### 2. 注册模块
```kotlin
// 在 MainApplication.kt 中注册
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(MyReactNativePackage())  // 添加自定义包
    }
```

#### 3. RN端使用
```javascript
import { NativeModules } from 'react-native';
const { HotUpdateModule } = NativeModules;

// 调用原生方法
try {
    const result = await HotUpdateModule.clearCache();
    console.log(result);
} catch (error) {
    console.error('清理失败:', error);
}
```

### 🔧 实际应用场景

在热更新项目中，RN与原生通信的应用：

1. **文件操作**: RN调用原生读写Bundle文件
2. **网络请求**: RN调用原生下载更新文件
3. **应用重启**: RN调用原生重启应用
4. **状态存储**: RN调用原生存储版本信息
5. **权限检查**: RN调用原生检查文件读写权限

### 💡 最佳实践

1. **异步操作**: 使用Promise或Callback处理异步结果
2. **错误处理**: 原生端要有完善的异常处理
3. **线程安全**: 原生操作要考虑线程问题
4. **性能优化**: 避免频繁的跨语言调用
5. **调试技巧**: 使用日志追踪通信过程

## 开发说明

### 热更新配置

热更新服务器地址配置在 `hot-update-manager.js` 中：
```javascript
const MANIFEST_URL = 'http://192.168.2.173:3000/manifest.json';
```

### 补丁生成

使用 `patch-generator.js` 可以生成差量补丁：
```bash
node patch-generator.js <旧bundle路径> <新bundle路径> [输出目录]
```

### 测试热更新

1. 修改应用代码
2. 运行 `npm run buildmock` 生成新bundle
3. 运行 `npm run buildmockpatch` 生成补丁
4. 应用会自动检测并应用更新

## 注意事项

- 项目已移除iOS支持，专注于Android平台
- 热更新仅支持JavaScript代码，不支持原生代码更新
- 确保服务器端manifest.json格式正确
- 生产环境需要配置HTTPS和签名验证

## 贡献

欢迎提交Issue和Pull Request来改进项目。

## 许可证

ISC License