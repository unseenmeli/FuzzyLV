import { router } from 'expo-router';

export const safeNavigate = {
  push: (href: string) => {
    try {
      router.push(href as any);
    } catch (error) {
      console.error('Navigation error:', error);
      setTimeout(() => {
        try {
          router.replace('/');
        } catch (fallbackError) {
          console.error('Fallback navigation failed:', fallbackError);
        }
      }, 100);
    }
  },

  replace: (href: string) => {
    try {
      router.replace(href as any);
    } catch (error) {
      console.error('Navigation error:', error);
      setTimeout(() => {
        try {
          router.replace('/');
        } catch (fallbackError) {
          console.error('Fallback navigation failed:', fallbackError);
        }
      }, 100);
    }
  },

  back: () => {
    try {
      router.back();
    } catch (error) {
      console.error('Navigation error:', error);
      try {
        router.replace('/');
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
      }
    }
  }
};