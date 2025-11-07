"use client";

import { useState } from 'react';
import { UserInfoCard } from './UserInfoCard';
import { PurchaseCard } from './PurchaseCard';
import { FloatingElements } from './FloatingElements';
import { Sparkles } from 'lucide-react';

interface UserData {
  name: string;
  email: string;
  phone: string;
}

// Example: User has purchased either Community OR Individual
const PURCHASE_DATA = {
  type: 'community' as const,
  category: '3K',
  participantCount: 50,
  jerseySizes: [
    { size: 'S', count: 12 },
    { size: 'M', count: 15 },
    { size: 'L', count: 18 },
    { size: 'XL', count: 5 },
  ], // Total: 12 + 15 + 18 + 5 = 50 pcs (matches participantCount)
  totalPrice: 2500000 // Indonesian Rupiah
};

// Alternative example for individual:
// const PURCHASE_DATA = {
//   type: 'individual' as const,
//   category: '5K',
//   jerseySize: 'M',
//   price: 150000 // Indonesian Rupiah
// };

export default function App() {
  const [userData, setUserData] = useState<UserData>({
    name: 'Sarah Martinez',
    email: 'sarah.martinez@email.com',
    phone: '+1 (555) 123-4567'
  });

  const handleUpdateUser = (email: string, phone: string) => {
    setUserData({ ...userData, email, phone });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image (place your image at /public/images/profile-bg.jpg) */}
      <div
        className="fixed inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/profile-bg.jpg')",
          backgroundSize: 'contain',
        }}
      />

      {/* Floating decorative elements */}
      <FloatingElements />

      {/* Navbar placeholder */}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen pt-20">
        {/* Header */}
        <header className="relative overflow-hidden">
          {/* Header gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFF1C5]/20 via-white/10 to-[#FFDFC0]/20 backdrop-blur-sm"></div>
          
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
              {/* Ciputra Color Run 2026 Logo */}
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
            
            {/* Page Title */}
            <div>
              <h1 className="text-[#682950] mb-3">My Profile</h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-[#91DCAC] via-[#91DCAC] to-[#91DCAC] rounded-full shadow-lg"></div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
          {/* User Info Card */}
          <div className="mb-12">
            <UserInfoCard
              userName={userData.name}
              email={userData.email}
              phone={userData.phone}
              onUpdate={handleUpdateUser}
            />
          </div>

          {/* Purchase Section */}
          <div>
            <div className="mb-8">
              <h2 className="text-[#682950] mb-3">My Purchase</h2>
              <div className="h-1.5 w-28 bg-[#92DDAE] rounded-full shadow-lg"></div>
            </div>

            <PurchaseCard purchase={PURCHASE_DATA} />
          </div>
        </main>

        {/* Footer */}
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