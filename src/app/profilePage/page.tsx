"use client";

import { useState, useEffect } from 'react';
import { UserInfoCard } from './UserInfoCard';
import { PurchaseCard } from './PurchaseCard';
import { FloatingElements } from './FloatingElements';
import { Sparkles } from 'lucide-react';

interface UserData {
  name: string;
  email: string;
  phone: string;
}

// --- THIS IS THE FIX ---
// The user you created in Prisma Studio was "Test User".
// Our new logic generates "test_user" from "Test User".
const MOCK_ACCESS_CODE = 'test_user'; // Changed from 'dev-user-code'

// Local shape passed to PurchaseCard
type PurchaseData =
  | {
      type: 'community';
      category: string;
      participantCount: number;
      jerseySizes: { size: string; count: number }[];
      totalPrice: number;
      qrCodeData: string | null;
    }
  | {
      type: 'individual';
      category: string;
      jerseySize: string;
      price: number;
      qrCodeData: string | null;
    };

export default function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);

  // --- GET User Data on Mount ---
  useEffect(() => {
    async function fetchUserAndPurchases() {
      if (!MOCK_ACCESS_CODE) {
        setError("Access code is not set.");
        setIsLoading(false);
        return;
      }
      try {
        // 1) fetch user (existing behavior)
        const resUser = await fetch(`/api/user?accessCode=${encodeURIComponent(MOCK_ACCESS_CODE)}`);
        if (!resUser.ok) {
          const errorData = await resUser.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch user: ${resUser.statusText}`);
        }
        const { user } = await resUser.json();
        setUserData(user);

        // 2) fetch registrations/purchases (server now accepts ?accessCode= for dev)
        const res = await fetch(`/api/profile/purchases?accessCode=${encodeURIComponent(MOCK_ACCESS_CODE)}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to fetch purchases: ${res.statusText}`);
        }
        const { registrations } = await res.json();

        // map registrations -> PurchaseData expected by PurchaseCard
        const mapped: PurchaseData[] = (registrations || []).map((reg: any) => {
          const participants = reg.participants || [];
          const qrCode = (reg.qrCodes && reg.qrCodes[0]) ? reg.qrCodes[0].qrCodeData : null;

          if (reg.registrationType === 'community' || reg.registrationType === 'family' || participants.length > 1) {
            // aggregate jersey sizes
            const sizesMap: Record<string, number> = {};
            for (const p of participants) {
              const size = p.jersey?.size || 'M';
              sizesMap[size] = (sizesMap[size] || 0) + 1;
            }
            const jerseySizes = Object.entries(sizesMap).map(([size, count]) => ({ size, count }));
            return {
              type: 'community',
              category: participants[0]?.category?.name || (reg.registrationType === 'family' ? 'Family Bundle' : 'Community'),
              participantCount: participants.length,
              jerseySizes,
              totalPrice: Number(reg.totalAmount ?? 0),
              qrCodeData: qrCode,
            } as PurchaseData;
          } else {
            // individual
            const p = participants[0] || {};
            return {
              type: 'individual',
              category: p.category?.name || reg.registrationType || 'Individual',
              jerseySize: p.jersey?.size || 'M',
              price: Number(reg.totalAmount ?? 0),
              qrCodeData: qrCode,
            } as PurchaseData;
          }
        });

        setPurchases(mapped);
      } catch (err: any) {
        console.error("Fetch User/Purchases Error:", err);
        setError(err.message || 'Failed to load profile or purchases.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserAndPurchases();
  }, []);

  // --- UPDATE User Data Logic (Corrected) ---
  const handleUpdateUser = async (email: string, phone: string): Promise<boolean> => {
    if (!userData) {
      console.error("Attempted to update user before data was loaded.");
      return false;
    }
    
    try {
        const res = await fetch('/api/user', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accessCode: MOCK_ACCESS_CODE, email, phone }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Update failed: ${res.statusText}`);
        }

        const { user } = await res.json();
        setUserData(user);
        alert('Profile updated successfully!'); 
        return true;
    } catch (err: any) {
        console.error("Update User Error:", err);
        alert(`Update failed: ${err.message}`);
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-28 p-6 bg-gradient-to-br from-red-50 to-pink-50">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Profile</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: "url('/images/generalBg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <FloatingElements />
      
      <div className="relative z-10 min-h-screen pt-20">
        {/* Header */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFF1C5]/20 via-white/10 to-[#FFDFC0]/20 backdrop-blur-sm"></div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#91DCAC] to-[#91DCAC] flex items-center justify-center shadow-2xl ring-4 ring-white/50">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-[#FFF1C5] to-[#FFDFC0] border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <span className="text-[#682950] tracking-wider">Ciputra Color Run 2026</span>
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-[#682950] mb-3">My Profile</h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-[#91DCAC] via-[#91DCAC] to-[#91DCAC] rounded-full shadow-lg"></div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
            {userData ? (
                <>
                  <div className="mb-12">
                    <UserInfoCard
                      userName={userData.name}
                      email={userData.email}
                      phone={userData.phone}
                      onUpdate={handleUpdateUser}
                    />
                  </div>

                  <div>
                    <div className="mb-8">
                      <h2 className="text-[#682950] mb-3">My Purchases</h2>
                      <div className="h-1.5 w-28 bg-[#92DDAE] rounded-full shadow-lg"></div>
                    </div>

                    <div className="space-y-6">
                      {purchases.length === 0 ? (
                        <div className="text-center text-gray-600">No purchases found.</div>
                      ) : (
                        purchases.map((p, idx) => (
                          <PurchaseCard key={idx} purchase={p as any} qrCodeData={(p as any).qrCodeData ?? null} />
                        ))
                      )}
                    </div>
                  </div>
                </>
            ) : null}
        </main>

        {/* Footer (unchanged) */}
        <footer className="relative mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              {/* Footer badge */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#FFF1C5]/80 to-[#FFDFC0]/80 backdrop-blur-xl border border-white/80 shadow-2xl">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#91DCAC] to-[#91DCAC] animate-pulse"></div>
                  <p className="text-sm text-[#682950]">Ciputra Color Run 2026</p>
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#91DCAC] to-[#91DCAC] animate-pulse"></div>
                </div>
              </div>
              
              {/* Decorative line */}
              <div className="h-1 w-64 mx-auto bg-gradient-to-r from-transparent via-[#D9D9D9]/50 to-transparent rounded-full"></div>
            </div>
          </div>

          {/* Bottom accent wave - green gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-40 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 1200 100" preserveAspectRatio="none">
              <path
                d="M0,40 C300,80 500,20 800,50 C1000,70 1100,30 1200,40 L1200,100 L0,100 Z"
                fill="url(#footer-wave-gradient)"
              />
              <defs>
                <linearGradient id="footer-wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9DD290" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#66EBE4" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#91DCAC" stopOpacity="0.7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </footer>
      </div>
    </div>
  );
}