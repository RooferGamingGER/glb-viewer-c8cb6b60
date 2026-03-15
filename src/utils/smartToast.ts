/**
 * Smart toast system for managing user notifications
 */

import { toast } from 'sonner';

export enum ToastCategory {
  USER_GUIDANCE = 'user_guidance',
  SUCCESS = 'success',
  ERROR = 'error',
  TECHNICAL = 'technical',
  WARNING = 'warning'
}

const isProd = import.meta.env.PROD;
const isDev = import.meta.env.DEV;

const TOAST_CONFIG = {
  [ToastCategory.USER_GUIDANCE]: { enabled: !isProd, duration: 4000 },
  [ToastCategory.SUCCESS]: { enabled: true, duration: 2000 },
  [ToastCategory.ERROR]: { enabled: true, duration: 5000 },
  [ToastCategory.TECHNICAL]: { enabled: isDev, duration: 3000 },
  [ToastCategory.WARNING]: { enabled: !isProd, duration: 3000 }
};

export const smartToast = {
  guidance: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.USER_GUIDANCE];
    if (config.enabled) toast.info(message, { duration: config.duration, ...options });
  },
  success: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.SUCCESS];
    if (config.enabled) toast.success(message, { duration: config.duration, ...options });
  },
  error: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.ERROR];
    if (config.enabled) toast.error(message, { duration: config.duration, ...options });
  },
  technical: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.TECHNICAL];
    if (config.enabled) toast.info(message, { duration: config.duration, ...options });
  },
  warning: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.WARNING];
    if (config.enabled) toast.warning(message, { duration: config.duration, ...options });
  },
  silent: () => {}
};

export const shouldShowToast = (category: ToastCategory): boolean => {
  return TOAST_CONFIG[category]?.enabled ?? false;
};

export { toast };
