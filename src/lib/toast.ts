/**
 * showToast(message, variant)
 * variant: "success" | "error" | "info" (info default)
 */
export function showToast(message: string, variant?: "success" | "error" | "info") {
  // no-op on server
  if (typeof window === "undefined") return;

  // dynamic import so this module can be imported safely from SSR or client code
  import("sonner")
    .then(({ toast }) => {
      try {
        if (variant === "success") return toast.success(message, { duration: 1500 });
        if (variant === "error") return toast.error(message, { duration: 1500 });
        return toast(message);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("showToast error:", e);
      }
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error("Failed to load sonner for toasts:", e);
    });
}