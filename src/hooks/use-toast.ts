
// Import from sonner
import { toast as sonnerToast } from 'sonner';

// Re-export with type extensions
export const toast = {
  ...sonnerToast,
  error: (message: string, options?: any) => sonnerToast.error(message, options),
  success: (message: string, options?: any) => sonnerToast.success(message, options),
  info: (message: string, options?: any) => sonnerToast.info(message, options),
  warning: (message: string, options?: any) => sonnerToast.warning(message, options)
};

export const useToast = () => {
  return { toast };
};
