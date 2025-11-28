"use client";

import React, { useState } from 'react';
import { getImageUrl } from '../../lib/imageUrl';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  storedPath: string | null | undefined;
  fallbackText?: string;
}

const FALLBACK_SVG = (text: string) => 
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23374151' width='400' height='300'/%3E%3Ctext fill='%239CA3AF' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;

export function SafeImage({ 
  storedPath, 
  fallbackText = "Image not available",
  alt = "",
  className = "",
  ...props 
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getImageUrl(storedPath);

  if (!imageUrl || hasError) {
    return (
      <img
        src={FALLBACK_SVG(fallbackText)}
        alt={fallbackText}
        className={className}
        {...props}
      />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

// For payment proofs specifically
interface PaymentProofImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  paymentId: number;
  fallbackText?: string;
}

export function PaymentProofImage({
  paymentId,
  fallbackText = "Proof not available",
  alt = "Payment proof",
  className = "",
  ...props
}: PaymentProofImageProps) {
  const [hasError, setHasError] = useState(false);
  const proofUrl = `/api/payments/proof/${paymentId}`;

  if (hasError) {
    return (
      <img
        src={FALLBACK_SVG(fallbackText)}
        alt={fallbackText}
        className={className}
        {...props}
      />
    );
  }

  return (
    <img
      src={proofUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}