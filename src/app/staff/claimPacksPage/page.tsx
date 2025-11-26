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

  // New state for tabs and confirmed registrations
  const [activeTab, setActiveTab] = useState<'claims' | 'confirmed'>('claims');
  const [confirmedRegs, setConfirmedRegs] = useState<any[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<any | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);

  const STAFF_PASSWORD = process.env.NEXT_PUBLIC_CLAIM_PAGE_PASS;

  useEffect(() => {
    if (isAuthenticated) {
      fetchClaims();
      fetchConfirmedRegistrations();
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

  const fetchConfirmedRegistrations = async () => {
    setLoadingConfirmed(true);
    try {
      const res = await fetch('/api/payments/confirmed', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch confirmed registrations');
      }
      
      const data = await res.json();
      setConfirmedRegs(data.registrations || []);
    } catch (error) {
      console.error('Error fetching confirmed registrations:', error);
      showToast('Error fetching confirmed registrations', 'error');
    } finally {
      setLoadingConfirmed(false);
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

  const filteredConfirmed = confirmedRegs.filter(reg => {
    const searchLower = searchTerm.toLowerCase();
    return (
      reg.user?.name?.toLowerCase().includes(searchLower) ||
      reg.user?.email?.toLowerCase().includes(searchLower) ||
      reg.registrationType?.toLowerCase().includes(searchLower) ||
      reg.participants?.some((p: any) => 
        p.category?.name?.toLowerCase().includes(searchLower) ||
        p.bibNumber?.toLowerCase().includes(searchLower)
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
                Staff Dashboard
              </h1>
              <p className="text-gray-600">Monitor and track all claimed race packs</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  fetchClaims();
                  fetchConfirmedRegistrations();
                }}
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

        {/* Tab Navigation */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('claims')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'claims'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Claims History
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
              {claims.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'confirmed'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Confirmed Registrations
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
              {confirmedRegs.length}
            </span>
          </button>
        </div>

        {/* Stats Cards */}
        {activeTab === 'claims' && (
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
        )}

        {/* Search Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder={activeTab === 'claims' 
                ? "Search by participant name, email, staff name, category, or bib number..."
                : "Search by participant name, email, category, or bib number..."
              }
            />
          </div>
        </div>

        {/* Claims List Tab */}
        {activeTab === 'claims' && (
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
        )}

        {/* Confirmed Registrations Tab */}
        {activeTab === 'confirmed' && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Confirmed Registrations</h2>
            
            {loadingConfirmed ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading confirmed registrations...</p>
              </div>
            ) : filteredConfirmed.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No confirmed registrations found</p>
                {searchTerm && (
                  <p className="text-gray-500 text-sm mt-2">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConfirmed.map((reg) => {
                  // Get unique categories
                  const categories = [...new Set(reg.participants?.map((p: any) => p.category?.name).filter(Boolean))];
                  const participantCount = reg.participants?.length || 0;
                  
                  return (
                    <div key={reg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">
                            {reg.user?.name || "Unknown"}
                          </h3>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {categories.map((cat, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                {String(cat)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          Confirmed
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="capitalize">{reg.registrationType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
                        </div>
                        {reg.groupName && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{reg.groupName}</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedRegistration(reg);
                          setShowRegModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        View Full Details
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal (existing claims modal) */}
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

      {/* Registration Detail Modal (new) */}
      {showRegModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Registration Details</h2>
                  <p className="text-sm text-gray-600 mt-1">ID: #{selectedRegistration.id}</p>
                </div>
                <button
                  onClick={() => setShowRegModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border-2 border-emerald-200">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium text-black">{selectedRegistration.user?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-black">{selectedRegistration.user?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-black">{selectedRegistration.user?.phone || "N/A"}</p>
                  </div>
                  {selectedRegistration.user?.birthDate && (
                    <div>
                      <p className="text-sm text-gray-600">Birth Date</p>
                      <p className="font-medium text-black">{new Date(selectedRegistration.user.birthDate).toLocaleDateString('id-ID')}</p>
                    </div>
                  )}
                  {selectedRegistration.user?.gender && (
                    <div>
                      <p className="text-sm text-gray-600">Gender</p>
                      <p className="font-medium capitalize text-black">{selectedRegistration.user.gender}</p>
                    </div>
                  )}
                  {selectedRegistration.user?.nationality && (
                    <div>
                      <p className="text-sm text-gray-600">Nationality</p>
                      <p className="font-medium text-black">{selectedRegistration.user.nationality}</p>
                    </div>
                  )}
                  {selectedRegistration.user?.currentAddress && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium text-black">{selectedRegistration.user.currentAddress}</p>
                    </div>
                  )}
                  {selectedRegistration.user?.emergencyPhone && (
                    <div>
                      <p className="text-sm text-gray-600">Emergency Contact</p>
                      <p className="font-medium text-black">{selectedRegistration.user.emergencyPhone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Registration Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Registration Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Registration Type</p>
                    <p className="font-medium capitalize text-black">{selectedRegistration.registrationType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-medium text-emerald-600">Rp {Number(selectedRegistration.totalAmount || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      {selectedRegistration.paymentStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 ">Registration Date</p>
                    <p className="font-medium text-black">{new Date(selectedRegistration.createdAt).toLocaleDateString('id-ID')}</p>
                  </div>
                  {selectedRegistration.groupName && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Group Name</p>
                      <p className="font-medium">{selectedRegistration.groupName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Participants List */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Participants ({selectedRegistration.participants?.length || 0})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedRegistration.participants?.map((participant: any) => (
                    <div key={participant.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                            {participant.bibNumber || `#${participant.id}`}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                            {participant.jersey?.size || 'M'}
                          </span>
                        </div>
                        {participant.packClaimed && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                            ✓ Claimed
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-800 mb-1">
                        {participant.fullName || participant.participantName || "Participant"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {participant.category?.name || "No category"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Proof (if available) */}
              {selectedRegistration.payments?.[0]?.proofOfPayment && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Payment Proof</h3>
                  <a
                    href={`/api/payments/proof/${selectedRegistration.payments[0].id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={`/api/payments/proof/${selectedRegistration.payments[0].id}`}
                      alt="Payment proof"
                      className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300 hover:border-emerald-500 transition-all cursor-pointer"
                    />
                  </a>
                  <p className="text-xs text-gray-500 text-center mt-2">Click to view full size</p>
                </div>
              )}

             {/* ID Card/Passport Photo */}
             {selectedRegistration.user?.idCardPhoto && (
               <div className="bg-gray-50 rounded-lg p-4">
                 <h3 className="font-semibold text-gray-800 mb-3">
                   {selectedRegistration.user.nationality === 'WNI' ? 'KTP Photo' : 'Passport Photo'}
                 </h3>
                 <a
                   href={selectedRegistration.user.idCardPhoto}
                   target="_blank"
                   rel="noreferrer"
                   className="block"
                 >
                   <img
                     src={selectedRegistration.user.idCardPhoto}
                     alt={selectedRegistration.user.nationality === 'WNI' ? 'KTP' : 'Passport'}
                     className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300 hover:border-emerald-500 transition-all cursor-pointer"
                   />
                 </a>
                 <p className="text-xs text-gray-500 text-center mt-2">Click to view full size</p>
               </div>
             )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowRegModal(false)}
                className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
    )}
    </main>
  );
}

