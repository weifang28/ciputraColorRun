"use client";

import { X } from "lucide-react";
import Image from "next/image";

interface RouteImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title: string;
}

export default function RouteImageModal({
  isOpen,
  onClose,
  imageSrc,
  title,
}: RouteImageModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-zoomIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#d1e9d5] to-[#e4a1a6] border-b">
          <h3 className="text-xl font-bold text-emerald-700">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 text-emerald-700" />
          </button>
        </div>

        {/* Image Container */}
        <div className="relative w-full h-[calc(90vh-100px)] bg-gray-50 overflow-auto">
          <div className="flex items-center justify-center min-h-full p-4">
            <Image
              src={imageSrc}
              alt={title}
              width={1200}
              height={800}
              className="max-w-full h-auto object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
