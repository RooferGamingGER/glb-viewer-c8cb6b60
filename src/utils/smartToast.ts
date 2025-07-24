/**
 * Smart toast system for managing user notifications
 * Differentiates between user guidance and technical messages
 */

import { toast } from 'sonner';

// Toast categories for better control
export enum ToastCategory {
  USER_GUIDANCE = 'user_guidance',    // Keep - helpful for users
  SUCCESS = 'success',                // Reduce - only important ones
  ERROR = 'error',                    // Reduce - only user-facing errors
  TECHNICAL = 'technical',            // Remove - technical/debug messages
  WARNING = 'warning'                 // Reduce - only important warnings
}

// Configuration for toast behavior
const TOAST_CONFIG = {
  [ToastCategory.USER_GUIDANCE]: {
    enabled: true,
    duration: 4000,
    position: 'top-right' as const
  },
  [ToastCategory.SUCCESS]: {
    enabled: true,
    duration: 2000,
    position: 'top-right' as const
  },
  [ToastCategory.ERROR]: {
    enabled: true,
    duration: 5000,
    position: 'top-right' as const
  },
  [ToastCategory.TECHNICAL]: {
    enabled: process.env.NODE_ENV === 'development',
    duration: 3000,
    position: 'top-right' as const
  },
  [ToastCategory.WARNING]: {
    enabled: true,
    duration: 3000,
    position: 'top-right' as const
  }
};

// Smart toast functions
export const smartToast = {
  // User guidance toasts (tool selection, point placement)
  guidance: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.USER_GUIDANCE];
    if (config.enabled) {
      toast.info(message, {
        duration: config.duration,
        ...options
      });
    }
  },

  // Important success messages only
  success: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.SUCCESS];
    if (config.enabled) {
      toast.success(message, {
        duration: config.duration,
        ...options
      });
    }
  },

  // User-facing errors only
  error: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.ERROR];
    if (config.enabled) {
      toast.error(message, {
        duration: config.duration,
        ...options
      });
    }
  },

  // Technical messages (development only)
  technical: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.TECHNICAL];
    if (config.enabled) {
      toast.info(message, {
        duration: config.duration,
        ...options
      });
    }
  },

  // Important warnings only
  warning: (message: string, options?: any) => {
    const config = TOAST_CONFIG[ToastCategory.WARNING];
    if (config.enabled) {
      toast.warning(message, {
        duration: config.duration,
        ...options
      });
    }
  },

  // Silent mode for technical operations
  silent: () => {
    // No toast displayed
  }
};

// Helper function to determine if a message should be shown
export const shouldShowToast = (category: ToastCategory): boolean => {
  return TOAST_CONFIG[category]?.enabled ?? false;
};

// Export for backwards compatibility
export { toast };