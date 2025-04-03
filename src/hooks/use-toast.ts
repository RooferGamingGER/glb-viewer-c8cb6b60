
// Import from sonner
import { toast as sonnerToast } from 'sonner';

// Re-export with type extensions
export const toast = sonnerToast;

export const useToast = () => {
  return { toast: sonnerToast };
};
