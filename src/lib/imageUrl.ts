/**
 * Converts a stored image path to a displayable URL.
 * Handles:
 * - Cloudinary URLs (https://res.cloudinary.com/...)
 * - Local API paths (/api/uploads/...)
 * - Legacy local paths (/uploads/... or uploads/...)
 * - Null/undefined values
 */
export function getImageUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) return null;

  // Already a full URL (Cloudinary or other external)
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    return storedPath;
  }

  // Already an API route path
  if (storedPath.startsWith("/api/uploads/")) {
    return storedPath;
  }

  // Legacy local path - convert to API route
  if (storedPath.startsWith("/uploads/")) {
    return `/api/uploads${storedPath.replace("/uploads", "")}`;
  }

  if (storedPath.startsWith("uploads/")) {
    return `/api/uploads/${storedPath.replace("uploads/", "")}`;
  }

  // Unknown format - return as-is (might be a relative path or other format)
  return storedPath;
}

/**
 * Gets the payment proof URL via the dedicated proof API endpoint.
 * This is preferred for payment proofs as it handles all storage types.
 */
export function getPaymentProofUrl(paymentId: number): string {
  return `/api/payments/proof/${paymentId}`;
}

/**
 * Determines if an image path is stored locally or on Cloudinary.
 * Useful for logging/debugging.
 */
export function getImageStorageType(storedPath: string | null | undefined): "cloudinary" | "local" | "unknown" | "none" {
  if (!storedPath) return "none";
  
  if (storedPath.startsWith("https://res.cloudinary.com")) {
    return "cloudinary";
  }
  
  if (
    storedPath.startsWith("/api/uploads/") ||
    storedPath.startsWith("/uploads/") ||
    storedPath.startsWith("uploads/")
  ) {
    return "local";
  }

  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    return "cloudinary"; // Assume other URLs are also cloud-based
  }

  return "unknown";
}