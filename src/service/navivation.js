import { createNavigationContainerRef } from '@react-navigation/native';

// 创建一个导航容器的引用
export const navigationRef = createNavigationContainerRef();

/**
 * 函数式导航跳转
 * @param {string} name - 目标路由名称
 * @param {object} params - 传递给目标路由的参数
 */
export function navigate(name, params) {
  // 确保导航容器已经准备好，避免在应用加载完成前调用而导致崩溃
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

// 你还可以根据需要添加其他导航函数
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}