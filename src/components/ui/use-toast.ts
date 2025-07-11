
import * as React from "react";
import { toast as sonnerToast } from "sonner";

// Export the toast function directly from sonner
export { toast } from "sonner";

// Import useToast from the hooks folder instead of from toast component
export { useToast } from "@/hooks/use-toast";
