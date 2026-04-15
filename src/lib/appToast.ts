import { toast as sonnerToast, ExternalToast } from 'sonner';

const importantDuration = 6500;
const defaultDuration = 4200;

/**
 * Opinionated toasts for high-signal actions (auth, payments, destructive ops).
 * Uses Sonner; styling is global in `components/ui/sonner.tsx`.
 */
export const appToast = {
  /** Login succeeded, order placed, saved, etc. */
  success: (message: string, description?: string, options?: ExternalToast) =>
    sonnerToast.success(message, {
      duration: defaultDuration,
      description,
      ...options,
    }),

  /** Validation, auth failure, network errors */
  error: (message: string, description?: string, options?: ExternalToast) =>
    sonnerToast.error(message, {
      duration: 5500,
      description,
      ...options,
    }),

  /** Session, background sync, FYI */
  info: (message: string, description?: string, options?: ExternalToast) =>
    sonnerToast.info(message, {
      duration: 4500,
      description,
      ...options,
    }),

  /** Payments, security, irreversible actions */
  important: (message: string, description?: string, options?: ExternalToast) =>
    sonnerToast(message, {
      duration: importantDuration,
      description,
      ...options,
    }),

  /** Long-running work finished */
  done: (message: string, description?: string) =>
    sonnerToast.success(message, {
      duration: defaultDuration,
      description,
    }),
};
