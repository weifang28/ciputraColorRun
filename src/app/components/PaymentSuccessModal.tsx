"use client";

import { CheckCircle, Mail, Info } from "lucide-react";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export default function PaymentSuccessModal({ isOpen, onClose, email }: PaymentSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
        {/* Success Icon */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 px-6 py-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce">
              <CheckCircle size={64} className="text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Payment Submitted!</h2>
            <p className="text-white/90 text-lg">We've received your payment proof</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {/* Email Confirmation */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Mail className="text-blue-600 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">Check Your Email</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  We've sent a confirmation to <strong className="text-blue-900">{email}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Info size={20} className="text-emerald-600" />
              What happens next?
            </h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span>Our admin will verify your payment (usually within 24 hours)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span>You'll receive an <strong>access code</strong> via email once approved</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span>Use the access code to view your registration details and QR code</span>
              </li>
            </ol>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
            <p className="text-yellow-800 text-sm">
              <strong className="font-bold">⚠️ Important:</strong> If your payment is declined, you'll receive an email notification with the reason.
            </p>
          </div>

          {/* WhatsApp CTA */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <h3 className="font-bold text-green-900 mb-2">Join Our WhatsApp Group</h3>
            <p className="text-green-800 text-sm mb-3">
              Get event updates, important announcements, and connect with other participants!
            </p>
            <a
              href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full text-center transition-colors"
            >
              Join WhatsApp Group
            </a>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-full hover:bg-gray-50 transition-colors"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}