"use client";

import React, { useState, useEffect } from 'react';
import { Package, User, Calendar, MapPin, Search, Eye, X } from 'lucide-react';
import { showToast } from '../../../lib/toast';

interface ClaimDetail {
  id: number;
  participantId: number;
  participant: {
    id: number;
    bibNumber?: string;
    fullName?: string;
    participantName?: string;
    category: {
      name: string;
    };
    jersey: {
      size: string;
    };
  };
}

interface ClaimRecord {
  id: number;
  claimedBy: string;
  packsClaimedCount: number;
  createdAt: string;
  qrCode: {
    registration: {
      id: number;
      user?: {
        name: string;
        email: string;
        phone: string;
      };
      registrationType: string;
      groupName?: string;
    };
    category: {
      name: string;
    };
  };
  claimDetails: ClaimDetail[];
}

export default function ClaimPacksPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<ClaimRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  const STAFF_PASSWORD = process.env.NEXT_PUBLIC_CLAIM_PAGE_PASS;

  useEffect(() => {
    if (isAuthenticated) {
      fetchClaims();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === STAFF_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      showToast("Incorrect password. Access denied.", "error");
      setPassword("");
    }
  };

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/racePack/claims', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch claims');
      }
      
      const data = await res.json();
      setClaims(data.claims || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
      showToast('Error fetching claims data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = claims.filter(claim => {
    const searchLower = searchTerm.toLowerCase();
    return (
      claim.qrCode.registration.user?.name?.toLowerCase().includes(searchLower) ||
      claim.qrCode.registration.user?.email?.toLowerCase().includes(searchLower) ||
      claim.claimedBy.toLowerCase().includes(searchLower) ||
      claim.qrCode.category.name.toLowerCase().includes(searchLower) ||
      claim.claimDetails.some(detail => 
        detail.participant.bibNumber?.toLowerCase().includes(searchLower) ||
        detail.participant.fullName?.toLowerCase().includes(searchLower) ||
        detail.participant.participantName?.toLowerCase().includes(searchLower)
      )
    );
  });

  const totalPacksClaimed = claims.reduce((sum, claim) => sum + claim.packsClaimedCount, 0);
  const uniqueStaff = new Set(claims.map(claim => claim.claimedBy)).size;

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Staff Access</h1>
            <p className="text-gray-600">Enter staff password to access race pack claims dashboard</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staff Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-black"
                placeholder="Enter staff password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
            >
              Access Dashboard
            </button>
          </form>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            🔒 This page is restricted to authorized staff only
          </p>
        </div>
      </main>
    );
  }

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 mb-2">
                Race Pack Claims Dashboard
              </h1>
              <p className="text-gray-600">Monitor and track all claimed race packs</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={fetchClaims}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              
              <button
                onClick={() => setIsAuthenticated(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Packs Claimed</p>
                <p className="text-2xl font-bold text-gray-800">{totalPacksClaimed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Claims</p>
                <p className="text-2xl font-bold text-gray-800">{claims.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold text-gray-800">{uniqueStaff}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Search by participant name, email, staff name, category, or bib number..."
            />
          </div>
        </div>

        {/* Claims List */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Claims History</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading claims data...</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No claims found</p>
              {searchTerm && (
                <p className="text-gray-500 text-sm mt-2">
                  Try adjusting your search terms
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim) => (
                <div key={claim.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-800">
                          {claim.qrCode.registration.user?.name || "Unknown User"}
                        </h3>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          {claim.qrCode.category.name}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Registration #{claim.qrCode.registration.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>{claim.packsClaimedCount} packs claimed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>Staff: {claim.claimedBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(claim.createdAt).toLocaleDateString('id-ID')} {new Date(claim.createdAt).toLocaleTimeString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedClaim(claim);
                        setShowModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedClaim && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Claim Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Registration Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Registration Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Participant Name</p>
                    <p className="font-medium">{selectedClaim.qrCode.registration.user?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registration Type</p>
                    <p className="font-medium">{selectedClaim.qrCode.registration.registrationType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedClaim.qrCode.registration.user?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedClaim.qrCode.registration.user?.phone || "N/A"}</p>
                  </div>
                  {selectedClaim.qrCode.registration.groupName && (
                    <div>
                      <p className="text-sm text-gray-600">Group Name</p>
                      <p className="font-medium">{selectedClaim.qrCode.registration.groupName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Claim Info */}
              <div className="bg-emerald-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Claim Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Claimed By</p>
                    <p className="font-medium">{selectedClaim.claimedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Packs Claimed</p>
                    <p className="font-medium">{selectedClaim.packsClaimedCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-medium">
                      {new Date(selectedClaim.createdAt).toLocaleDateString('id-ID')}<br/>
                      {new Date(selectedClaim.createdAt).toLocaleTimeString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participant Details */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Claimed Participants</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedClaim.claimDetails.map((detail) => (
                    <div key={detail.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                          {detail.participant.bibNumber || `#${detail.participant.id}`}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {detail.participant.jersey.size}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800 mb-1">
                        {detail.participant.fullName || detail.participant.participantName || "Participant"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {detail.participant.category.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}