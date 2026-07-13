import { toast } from "sonner";
import { getErrorMessage, getFieldErrors } from "@/lib/api";

export function toastSuccess(message: string, description?: string) {
  return toast.success(message, { description });
}

export function toastError(message: string, description?: string) {
  return toast.error(message, { description });
}

export function toastInfo(message: string, description?: string) {
  return toast.message(message, { description });
}

/**
 * Show API/unknown errors via Sonner.
 * Uses field-level validation copy when present — never bare "Validation failed".
 */
export function toastFromError(
  error: unknown,
  fallback = "Something went wrong",
) {
  const message = getErrorMessage(error) || fallback;
  const fields = getFieldErrors(error);
  const fieldCount = fields ? Object.keys(fields).length : 0;

  return toast.error(message, {
    description:
      fieldCount > 1
        ? "Fix the highlighted issues and try again."
        : undefined,
  });
}
