import { Router } from "expo-router";

let isNavigating = false;
let navigationTimer: NodeJS.Timeout | null = null;

const NAVIGATION_DEBOUNCE_TIME = 300;

export const safeNavigate = (router: Router, path: string, params?: any) => {
  if (isNavigating) {
    return;
  }

  isNavigating = true;

  if (navigationTimer) {
    clearTimeout(navigationTimer);
  }

  if (params) {
    router.push({ pathname: path, params });
  } else {
    router.push(path);
  }

  navigationTimer = setTimeout(() => {
    isNavigating = false;
  }, NAVIGATION_DEBOUNCE_TIME);
};

export const safeReplace = (router: Router, path: string, params?: any) => {
  if (isNavigating) {
    return;
  }

  isNavigating = true;

  if (navigationTimer) {
    clearTimeout(navigationTimer);
  }

  if (params) {
    router.replace({ pathname: path, params });
  } else {
    router.replace(path);
  }

  navigationTimer = setTimeout(() => {
    isNavigating = false;
  }, NAVIGATION_DEBOUNCE_TIME);
};

export const safeBack = (router: Router) => {
  if (isNavigating) {
    return;
  }

  isNavigating = true;

  if (navigationTimer) {
    clearTimeout(navigationTimer);
  }

  router.back();

  navigationTimer = setTimeout(() => {
    isNavigating = false;
  }, NAVIGATION_DEBOUNCE_TIME);
};

export const resetNavigationState = () => {
  isNavigating = false;
  if (navigationTimer) {
    clearTimeout(navigationTimer);
    navigationTimer = null;
  }
};