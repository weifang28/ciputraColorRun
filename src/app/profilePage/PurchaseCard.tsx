// src/app/profilePage/PurchaseCard.tsx
"use client";

import * as React from "react";
import { Card } from './components/ui/card';
import { QrCode, Users, ShoppingBag, DollarSign } from 'lucide-react';
import QRCode from 'qrcode'; // QR code generation

interface JerseySize {
  size: string;
  count: number;
}

interface CommunityPurchase {
  type: 'community';
  category: string;
  participantCount: number;
  jerseySizes: JerseySize[];
  totalPrice: number;
  paymentStatus?: string;
}

interface FamilyPurchase {
  type: 'family';
  category: string;
  participantCount: number;
  jerseySizes: JerseySize[];
  totalPrice: number;
  paymentStatus?: string;
}

interface IndividualPurchase {
  type: 'individual';
  category: string;
  jerseySize: string;
  price: number;
  paymentStatus?: string; // ADDED
}

type PurchaseData = CommunityPurchase | IndividualPurchase | FamilyPurchase;

interface PurchaseCardProps {
  purchase: PurchaseData;
  qrCodeData: string | null;
}

// Format number to Indonesian Rupiah
function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

export function PurchaseCard({ purchase, qrCodeData }: PurchaseCardProps) {
  const [qrImage, setQrImage] = React.useState<string | null>(null);
  
  // ADDED: Get payment status
  const paymentStatus = purchase.paymentStatus || 'pending';
  const isConfirmed = paymentStatus === 'confirmed';
  const isPending = paymentStatus === 'pending';
  const isDeclined = paymentStatus === 'declined';

  React.useEffect(() => {
    let mounted = true;
    async function gen() {
      // CHANGED: Only generate QR if confirmed and has data
      if (!qrCodeData || !isConfirmed) {
        if (mounted) setQrImage(null);
        return;
      }

      try {
        const payload =
          typeof qrCodeData === "string" && qrCodeData.startsWith("http")
            ? qrCodeData
            : `${(typeof window !== "undefined" && window.location?.origin) || (process.env.NEXT_PUBLIC_APP_URL || "")}/claim/${qrCodeData}`;

        const dataUrl = await QRCode.toDataURL(payload, {
          margin: 1,
          color: {
            dark: '#682950',
            light: '#ffffff',
          },
        });

        if (mounted) setQrImage(dataUrl);
      } catch (e) {
        console.error('Failed to generate QR data URL', e);
        if (mounted) setQrImage(null);
      }
    }
    gen();
    return () => { mounted = false; };
  }, [qrCodeData, isConfirmed]);

  return (
    <Card className="overflow-hidden bg-white/70 backdrop-blur-xl border-white/90 shadow-2xl relative">
      {/* Gradient top accent */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#94DCAD] via-[#4EF9CD] to-[#73E9DD]"></div>
      
      {/* Category Header */}
      <div className="px-8 pt-6 pb-4">
        <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-[#FFDFC0]/60 to-[#FFF1C5]/60 border border-[#FFF1C5]/80">
          <p className="text-sm text-[#682950]">
            {purchase.type === 'community' ? 'Community' : purchase.type === 'family' ? 'Family Bundle' : 'Individual'} – {purchase.category}
          </p>
        </div>
        
        {/* Payment Status Badge */}
        <div className="mt-3">
          {purchase.paymentStatus === 'pending' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-300">
              <svg className="w-4 h-4 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="text-sm font-semibold text-amber-700">Awaiting Verification</span>
            </div>
          )}
          {purchase.paymentStatus === 'confirmed' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 border border-green-300">
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="text-sm font-semibold text-green-700">Confirmed</span>
            </div>
          )}
          {purchase.paymentStatus === 'declined' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 border border-red-300">
              <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="text-sm font-semibold text-red-700">Payment Declined</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Purchase Details */}
          <div className="space-y-6 mb-8 lg:mb-0">
            {purchase.type === 'community' ? (
              <>
                {/* Participant Count */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#4EF9CD]/20 to-[#73E9DD]/20 border border-[#4EF9CD]/50 transition-all hover:shadow-lg hover:border-[#73E9DD]/70">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#73E9DD] to-[#4EF9CD] flex items-center justify-center shadow-lg flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#682950]/70 mb-1">Number of Participants</p>
                    <p className="text-[#682950]">{purchase.participantCount} people</p>
                  </div>
                </div>

                {/* Jersey Sizes */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#94DCAD]/20 to-[#4EF9CD]/15 border border-[#94DCAD]/50 transition-all hover:shadow-lg hover:border-[#94DCAD]/70">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#94DCAD] to-[#73E9DD] flex items-center justify-center shadow-lg">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[#682950]">Jersey Sizes</p>
                  </div>
                  {/* Mobile: single column stack; >=sm: two columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {purchase.jerseySizes.map((jersey, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-[#D9D9D9]/40 transition-all hover:border-[#94DCAD]/50 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#682950]/80">Size</span>
                          <span className="text-lg font-semibold text-[#682950]">{jersey.size}</span>
                        </div>
                        <span className="text-white px-3 py-1 rounded-full bg-[#91DDAF] mt-3 sm:mt-0">
                          {jersey.count} pcs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Price */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#94DCAD]/20 to-[#4EF9CD]/15 border border-[#94DCAD]/50 transition-all hover:shadow-lg hover:border-[#94DCAD]/70">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#94DCAD] to-[#73E9DD] flex items-center justify-center shadow-lg flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#682950]/70 mb-1">Total Price</p>
                    <p className="text-[#682950]">{formatRupiah(purchase.totalPrice)}</p>
                  </div>
                </div>
              </>
            ) : purchase.type === 'family' ? (
              <>
                {/* Participant Count */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#4EF9CD]/20 to-[#73E9DD]/20 border border-[#4EF9CD]/50 transition-all hover:shadow-lg hover:border-[#73E9DD]/70">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#73E9DD] to-[#4EF9CD] flex items-center justify-center shadow-lg flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#682950]/70 mb-1">Number of Participants</p>
                    <p className="text-[#682950]">{purchase.participantCount} people (Family Bundle)</p>
                  </div>
                </div>

                {/* Jersey Sizes */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#94DCAD]/20 to-[#4EF9CD]/15 border border-[#94DCAD]/50 transition-all hover:shadow-lg hover:border-[#94DCAD]/70">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#94DCAD] to-[#73E9DD] flex items-center justify-center shadow-lg">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[#682950]">Jersey Sizes</p>
                  </div>
                  {/* Mobile: single column stack; >=sm: two columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {purchase.jerseySizes.map((jersey, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-[#D9D9D9]/40 transition-all hover:border-[#94DCAD]/50 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#682950]/80">Size</span>
                          <span className="text-lg font-semibold text-[#682950]">{jersey.size}</span>
                        </div>
                        <span className="text-white px-3 py-1 rounded-full bg-[#91DDAF] mt-3 sm:mt-0">
                          {jersey.count} pcs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Price */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#94DCAD]/20 to-[#4EF9CD]/15 border border-[#94DCAD]/50 transition-all hover:shadow-lg hover:border-[#94DCAD]/70">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#94DCAD] to-[#73E9DD] flex items-center justify-center shadow-lg flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#682950]/70 mb-1">Total Price</p>
                    <p className="text-[#682950]">{formatRupiah(purchase.totalPrice)}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Jersey Size */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#94DCAD]/20 to-[#4EF9CD]/15 border border-[#94DCAD]/50 transition-all hover:shadow-lg hover:border-[#94DCAD]/70">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#94DCAD] to-[#73E9DD] flex items-center justify-center shadow-lg flex-shrink-0">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#682950]/70 mb-1">Jersey Size</p>
                    <p className="text-[#682950]">Size {purchase.jerseySize}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#94DCAD]/20 to-[#4EF9CD]/15 border border-[#94DCAD]/50 transition-all hover:shadow-lg hover:border-[#94DCAD]/70">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#94DCAD] to-[#73E9DD] flex items-center justify-center shadow-lg flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#682950]/70 mb-1">Price</p>
                    <p className="text-[#682950]">{formatRupiah(purchase.price)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column: QR Code Section */}
          <div className="relative w-full">
            <p className="absolute -top-8 left-0 right-0 text-center text-sm text-[#682950]/70">Registration QR Code</p>
            
            <div className="w-full aspect-square relative overflow-hidden bg-gradient-to-br from-[#FFF1C5]/50 to-[#FFDFC0]/50 rounded-3xl border-4 border-white shadow-2xl transition-all hover:shadow-xl">
              <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto">
                {!isConfirmed ? (
                  // Compact / responsive waiting state for small phones
                  <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4 max-w-full">
                    <svg className="w-16 h-16 sm:w-24 sm:h-24 text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="px-2">
                      <p className="text-base sm:text-lg font-bold text-[#682950] mb-1">
                        {isPending ? "Awaiting Verification" : "Payment Declined"}
                      </p>
                      <p className="text-xs sm:text-sm text-[#682950]/70 leading-relaxed max-w-[18rem] sm:max-w-xs break-words">
                        {isPending
                          ? "Your QR code will appear here once your payment is verified by our admin (usually within 48 hours)."
                          : "Please contact support or submit a new payment."}
                      </p>
                    </div>
                  </div>
                ) : qrImage ? (
                  <img src={qrImage} alt="QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <QrCode className="w-24 h-24 text-[#682950]/50" />
                    <p className="text-sm text-[#682950]/60">QR Code Not Available</p>
                  </div>
                )}
              </div>

              {/* Corner accents */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-[#66EBE4] rounded-tl-2xl"></div>
              <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-[#91DCAC] rounded-tr-2xl"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-[#9DD290] rounded-bl-2xl"></div>
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-[#91DCAC] rounded-br-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}