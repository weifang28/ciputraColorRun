// src/app/profilePage/PurchaseCard.tsx
"use client";

import * as React from "react";
import { Card } from './components/ui/card';
import { QrCode, Users, ShoppingBag, DollarSign } from 'lucide-react';
import { toDataURL } from 'qrcode'; // generate QR image data URL instead of qrcode.react

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
}

interface IndividualPurchase {
  type: 'individual';
  category: string;
  jerseySize: string;
  price: number;
}

type PurchaseData = CommunityPurchase | IndividualPurchase;

interface PurchaseCardProps {
  purchase: PurchaseData;
  qrCodeData: string | null; // QR payload (string) or null
}

// Format number to Indonesian Rupiah
function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

export function PurchaseCard({ purchase, qrCodeData }: PurchaseCardProps) {
  const [qrImage, setQrImage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function gen() {
      if (!qrCodeData) {
        if (mounted) setQrImage(null);
        return;
      }

      try {
        // If qrCodeData already looks like a full URL, use it.
        // Otherwise build absolute claim URL -> /claim/[token]
        const payload =
          typeof qrCodeData === "string" && qrCodeData.startsWith("http")
            ? qrCodeData
            : `${(typeof window !== "undefined" && window.location?.origin) || (process.env.NEXT_PUBLIC_APP_URL || "")}/claim/${qrCodeData}`;

        const dataUrl = await toDataURL(payload, {
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
  }, [qrCodeData]);

  return (
    <Card className="overflow-hidden bg-white/70 backdrop-blur-xl border-white/90 shadow-2xl relative">
      {/* Gradient top accent - colorful gradient */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#94DCAD] via-[#4EF9CD] to-[#73E9DD]"></div>
      
      {/* Category Header - Positioned at top edge */}
      <div className="px-8 pt-6 pb-4">
        <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-[#FFDFC0]/60 to-[#FFF1C5]/60 border border-[#FFF1C5]/80">
          <p className="text-sm text-[#682950]">
            {purchase.type === 'community' ? 'Community' : 'Individual'} – {purchase.category}
          </p>
        </div>
      </div>

      <div className="px-8 pb-8">
        {/* Purchase Details */}
        <div className="space-y-6 mb-8">
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
                <div className="grid grid-cols-2 gap-3">
                  {purchase.jerseySizes.map((jersey, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-[#D9D9D9]/40 transition-all hover:border-[#94DCAD]/50 hover:shadow-md"
                    >
                      <span className="text-[#682950]/80">Size {jersey.size}</span>
                      <span className="text-white px-3 py-1 rounded-full bg-[#91DDAF]">
                        {jersey.count} pcs
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Price */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#91DDAF] border border-[#91DDAF] transition-all hover:shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center shadow-lg flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/90 mb-1">Total Price</p>
                  <p className="text-white">{formatRupiah(purchase.totalPrice)}</p>
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
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#91DDAF] border border-[#91DDAF] transition-all hover:shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center shadow-lg flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/90 mb-1">Price</p>
                  <p className="text-white">{formatRupiah(purchase.price)}</p>
                </div>
              </div>
            </>
          )}
        </div>
        {/* ... Akhir dari detail pembelian ... */}


        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#D9D9D9]/60 to-transparent mb-8"></div>

        {/* QR Code Section */}
        <div>
          <p className="text-sm text-[#682950]/70 mb-4 text-center">Registration QR Code</p>
          <div className="relative group">
            <div className="w-full aspect-square max-w-xs mx-auto bg-gradient-to-br from-[#FFF1C5]/50 to-[#FFDFC0]/50 rounded-3xl flex items-center justify-center border-4 border-white shadow-2xl relative overflow-hidden transition-all hover:shadow-xl p-6"> {/* Tambahkan padding 'p-6' */}
              
              {/* --- 4. GANTI BAGIAN INI --- */}
              {qrImage ? (
                <img src={qrImage} alt="QR Code" style={{ width: '100%', height: 'auto' }} />
              ) : (
                // Fallback jika tidak ada data QR
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <QrCode className="w-24 h-24 text-[#682950]/50" />
                  <p className="text-sm text-[#682950]/60">QR Code Not Available</p>
                </div>
              )}
              {/* --- AKHIR DARI PENGGANTIAN --- */}

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