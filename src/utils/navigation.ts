import { router } from "expo-router";

let isNavigating = false;
let navigationTimeout: NodeJS.Timeout | null = null;

export const safeNavigate = {
  push: (path: string, params?: any) => {
    if (isNavigating) return;
    
    isNavigating = true;
    
    if (navigationTimeout) clearTimeout(navigationTimeout);
    navigationTimeout = setTimeout(() => {
      isNavigating = false;
    }, 500);
    
    try {
      if (params) {
        router.push({ pathname: path, params });
      } else {
        router.push(path);
      }
    } catch (error) {
      console.error("Navigation error:", error);
      isNavigating = false;
    }
  },
  
  replace: (path: string, params?: any) => {
    if (isNavigating) return;
    
    isNavigating = true;
    
    if (navigationTimeout) clearTimeout(navigationTimeout);
    navigationTimeout = setTimeout(() => {
      isNavigating = false;
    }, 500);
    
    try {
      if (params) {
        router.replace({ pathname: path, params });
      } else {
        router.replace(path);
      }
    } catch (error) {
      console.error("Navigation error:", error);
      isNavigating = false;
    }
  },
  
  back: () => {
    if (isNavigating) return;
    
    isNavigating = true;
    
    if (navigationTimeout) clearTimeout(navigationTimeout);
    navigationTimeout = setTimeout(() => {
      isNavigating = false;
    }, 500);
    
    try {
      router.back();
    } catch (error) {
      console.error("Navigation error:", error);
      isNavigating = false;
    }
  },
  
  resetNavigating: () => {
    isNavigating = false;
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
      navigationTimeout = null;
    }
  }
};