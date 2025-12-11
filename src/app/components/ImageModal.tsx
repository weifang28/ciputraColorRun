"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, altText }: ImageModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }
    
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl max-h-[90vh] w-full animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all backdrop-blur-sm z-10"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Image Container */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <img
            src={imageUrl}
            alt={altText}
            className="w-full h-full object-contain max-h-[85vh]"
          />
        </div>

        {/* Image Label */}
        <div className="mt-4 text-center">
          <p className="text-white text-lg font-semibold">{altText}</p>
          <p className="text-white/70 text-sm mt-1">Click outside or press ESC to close</p>
        </div>
      </div>
    </div>
  );
}
