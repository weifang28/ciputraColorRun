"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const qr = params?.qr;
  const token = Array.isArray(qr) ? qr[0] : qr;

  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [claimedBy, setClaimedBy] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    fetch(`/api/racePack/qr?qr=${encodeURIComponent(String(token))}`)
      .then((r) => r.json())
      .then((b) => {
        if (!mounted) return;
        if (b.error) {
          setError(b.error);
          setQrData(null);
        } else {
          setQrData(b.qrCode);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [token]);

  function toggleSelect(id: number) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submitClaim() {
    if (!token) return;
    
    if (selectedIds.length === 0) {
      alert("Please select at least one participant to claim.");
      return;
    }
    
    if (!password) {
      alert("Password is required to claim race packs.");
      return;
    }

    if (password !== "CirunMantap") {
      alert("Incorrect password. Only authorized staff can claim race packs.");
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch("/api/racePack/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeData: token,
          participantIds: selectedIds,
          claimedBy: claimedBy || "staff",
          claimType: "staff",
          password: password,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || body?.message || res.statusText);
      
      alert(`Successfully claimed ${selectedIds.length} race pack(s)!`);
      
      // Reload to show updated claimed state
      router.replace(window.location.pathname);
    } catch (err: any) {
      alert("Claim failed: " + (err?.message || String(err)));
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen pt-28 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold text-lg">Loading race pack information...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen pt-28 p-4 bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-emerald-600 text-white rounded-full font-semibold hover:bg-emerald-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </main>
    );
  }

  if (!qrData) {
    return (
      <main className="min-h-screen pt-28 p-4 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Data Found</h2>
          <p className="text-gray-600 mb-6">This QR code is not associated with any registration.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-emerald-600 text-white rounded-full font-semibold hover:bg-emerald-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </main>
    );
  }

  const registration = qrData.registration;
  const participants = registration.participants || [];

  // Group participants by race category name (fallback "Unassigned")
  const groupedByCategory: Record<string, any[]> = {};
  participants.forEach((p: any) => {
    const cat = p.category?.name || "Unassigned";
    groupedByCategory[cat] = groupedByCategory[cat] || [];
    groupedByCategory[cat].push(p);
  });

  const totalClaimed = participants.filter((p: any) => p.packClaimed).length;
  const totalParticipants = participants.length;

  return (
    <main 
      className="min-h-screen pt-24 pb-12 px-4"
      style={{
        backgroundImage: "url('/images/generalBg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 mb-2">
                Race Pack Claim
              </h1>
              <p className="text-lg text-gray-700 font-semibold">
                {registration.user?.name || "Unknown Participant"}
              </p>
            </div>
            <div className="hidden md:block w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Total Packs</p>
              <p className="text-2xl font-bold text-blue-900">{qrData.totalPacks}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-semibold uppercase mb-1">Claimed</p>
              <p className="text-2xl font-bold text-emerald-900">{totalClaimed}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <p className="text-xs text-orange-600 font-semibold uppercase mb-1">Remaining</p>
              <p className="text-2xl font-bold text-orange-900">{qrData.scansRemaining}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Selected</p>
              <p className="text-2xl font-bold text-purple-900">{selectedIds.length}</p>
            </div>
          </div>
        </div>

        {/* Participants Section */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
            Select Participants to Claim
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedByCategory).map(([categoryName, list]) => {
              const total = list.length;
              const claimed = list.filter((x: any) => x.packClaimed).length;
              return (
                <div key={categoryName} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-4 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200">
                    <div>
                      <div className="text-base font-bold text-gray-900">{categoryName}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Total: <span className="font-semibold">{total}</span> • 
                        Claimed: <span className="font-semibold text-emerald-600">{claimed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {list.map((p: any) => (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          p.packClaimed 
                            ? "bg-gray-200 border-gray-300 opacity-60 cursor-not-allowed" 
                            : selectedIds.includes(p.id)
                              ? "bg-emerald-50 border-emerald-500 shadow-md"
                              : "bg-white border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            disabled={p.packClaimed}
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="h-5 w-5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">
                              {p.bibNumber || `#${p.id}`}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {p.fullName || p.participantName || registration.user?.name || "Participant"}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-semibold">
                          {p.packClaimed ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-300">
                              ✓ Claimed
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full border border-orange-300">
                              Unclaimed
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim Form */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
            Claim Information
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Claimed By (Staff Name)
              </label>
              <input
                value={claimedBy}
                onChange={(e) => setClaimedBy(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-base"
                placeholder="Enter staff name (optional)"
              />
              <p className="text-xs text-gray-500 mt-2">Name of the staff member claiming the packs</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Admin Password <span className="text-red-500">*</span>
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-base"
                placeholder="Enter admin password"
                required
              />
              <p className="text-xs text-red-600 mt-2 font-semibold">
                🔒 Password required for security. Only authorized staff can claim race packs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                disabled={claiming || selectedIds.length === 0}
                onClick={submitClaim}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
              >
                {claiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Claim ${selectedIds.length} Pack${selectedIds.length !== 1 ? 's' : ''}`
                )}
              </button>

              <button
                onClick={() => { 
                  setSelectedIds([]); 
                  setPassword(''); 
                  setClaimedBy(''); 
                }}
                className="px-6 py-4 border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-700 rounded-xl font-semibold transition-all"
              >
                Reset Form
              </button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            <span className="font-bold">💡 Tip:</span> Select participants from the list above, then enter the admin password to claim their race packs. 
            You can claim multiple packs at once by selecting multiple participants.
          </p>
        </div>
      </div>
    </main>
  );
}