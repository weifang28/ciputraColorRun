"use client";

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, MapPin, AlertCircle, LogOut, FileText, IdCard, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getImageUrl, getPaymentProofUrl } from '../../lib/imageUrl';

const TABS = [
  { key: 'pending', label: 'Pending', status: 'pending', color: 'yellow' },
  { key: 'confirmed', label: 'Confirmed', status: 'confirmed', color: 'green' },
  { key: 'declined', label: 'Declined', status: 'declined', color: 'red' },
];

const TYPE_FILTERS = [
  { key: 'all', label: 'All Types' },
  { key: 'individual', label: 'Individual' },
  { key: 'community', label: 'Community' },
  { key: 'family', label: 'Family Bundle' },
];

interface PaymentDetail {
  // compatibility fields kept
  registrationId: number;
  registrationIds?: number[];
  transactionId?: string;
  userName: string;
  email: string;
  phone: string;
  registrationType: string;
  groupName?: string;
  totalAmount: number;
  createdAt: string;
  paymentStatus: string;
  participantCount: number;
  categoryCounts?: Record<string, number>;
  jerseySizes?: Record<string, number>;
  payments: Array<{
    id: number;
    amount: number;
    proofOfPayment?: string;
    status?: string;
    transactionId?: string;
    registrationId?: number;
    proofSenderName?: string;
  }>;
  user?: {
    birthDate?: string;
    gender?: string;
    currentAddress?: string;
    nationality?: string;
    emergencyPhone?: string;
    medicalHistory?: string;
    idCardPhoto?: string;
  };

  // NEW: include registration objects for the payment (populated from API.registrations)
  registrations?: Array<{
    registrationId: number;
    registrationType: string;
    totalAmount: number;
    groupName?: string;
    participantCount: number;
    createdAt: string;
  }>;
}

interface StatusCounts {
  pending: number;
  confirmed: number;
  declined: number;
}

export default function LODashboard() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentDetail[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    confirmed: 0,
    declined: 0,
  });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [pendingDeclineId, setPendingDeclineId] = useState<number | null>(null);

  // Fetch status counts for all tabs
  useEffect(() => {
    fetchStatusCounts();
  }, []);

  // Fetch payments when tab changes
  useEffect(() => {
    fetchPayments();
    fetchCounts();
  }, [activeTab]);

  async function fetchStatusCounts() {
    try {
      const res = await fetch('/api/payments/counts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStatusCounts(data.counts || { pending: 0, confirmed: 0, declined: 0 });
      }
    } catch (err) {
      console.error('Error fetching status counts:', err);
    }
  }

  async function fetchPayments() {
    setLoading(true);
    setError(null);
    try {
      // FIX: Use the correct admin endpoint
      const url = activeTab === 'all' 
        ? '/api/admin/payments/all'
        : `/api/admin/payments/all?status=${activeTab}`;
      
      console.log('[LODashboard] Fetching from:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[LODashboard] Received data:', data);
      console.log('[LODashboard] First payment:', JSON.stringify(data[0], null, 2));
      
      // The admin endpoint returns the correct format directly
      setPayments(data as PaymentDetail[]);
      
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCounts() {
    try {
      const response = await fetch('/api/payments/counts', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStatusCounts(data.counts);
      }
    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  }

  async function handleAccept(payment: PaymentDetail) {
    if (!confirm(`Confirm payment for transaction ${payment.transactionId || payment.registrationId}? This will confirm all linked registrations.`)) return;
    try {
      const regIds = payment.registrationIds && payment.registrationIds.length > 0 ? payment.registrationIds : [payment.registrationId];
      for (const regId of regIds) {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ registrationId: regId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || body?.message || 'Failed to confirm registration ' + regId);
      }
      alert('All registrations in transaction confirmed. QR codes will be sent.');
      fetchPayments();
      fetchStatusCounts();
      setShowDetailsModal(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDecline(payment: PaymentDetail) {
    if (!confirm(`Decline payment for transaction ${payment.transactionId || payment.registrationId}? This will decline all linked registrations.`)) return;
    try {
      const regIds = payment.registrationIds && payment.registrationIds.length > 0 ? payment.registrationIds : [payment.registrationId];
      for (const regId of regIds) {
        const res = await fetch('/api/payments/decline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ registrationId: regId, reason: 'Declined by admin' }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || body?.message || 'Failed to decline registration ' + regId);
      }
      alert('Transaction declined. Notifications sent.');
      fetchPayments();
      fetchStatusCounts();
      setShowDetailsModal(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  // Confirm decline from the modal — decline all registrations for the selected payment (or the pending id)
  async function confirmDecline() {
    const reason = declineReason?.trim() || 'Declined by admin';
    // Determine registration IDs to decline: prefer selectedPayment.registrationIds, fallback to pendingDeclineId
    const regIds: number[] = [];
    if (selectedPayment?.registrationIds && selectedPayment.registrationIds.length > 0) {
      regIds.push(...selectedPayment.registrationIds);
    } else if (pendingDeclineId) {
      regIds.push(pendingDeclineId);
    } else if (selectedPayment?.registrationId) {
      regIds.push(selectedPayment.registrationId);
    }

    if (regIds.length === 0) {
      alert('No registration selected to decline.');
      return;
    }

    try {
      setLoading(true);
      for (const regId of regIds) {
        const res = await fetch('/api/payments/decline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ registrationId: regId, reason }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || body?.message || `Failed to decline registration ${regId}`);
      }
      // Success
      setShowDeclineModal(false);
      setPendingDeclineId(null);
      setDeclineReason('');
      await fetchPayments();
      await fetchStatusCounts();
      alert('Selected registration(s) declined and notification(s) sent.');
    } catch (err: any) {
      console.error('Decline failed:', err);
      alert('Decline failed: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  const handleChangeStatus = async (registrationId: number, newStatus: 'confirmed' | 'declined') => {
    const action = newStatus === 'confirmed' ? 'confirm' : 'decline';
    if (!confirm(`Change payment status to ${newStatus}?`)) return;
    
    try {
      const res = await fetch(`/api/payments/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ registrationId }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Failed to ${action}`);

      alert(`Status changed to ${newStatus} successfully!`);
      fetchPayments();
      fetchStatusCounts(); // Refresh counts
      setShowDetailsModal(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Logout from admin dashboard?')) return;
    
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
      
      setPayments([]);
      setSelectedPayment(null);
      setShowDetailsModal(false);
      
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/admin/login');
    }
  };

  const openDetails = (payment: PaymentDetail) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesType = typeFilter === 'all' || payment.registrationType === typeFilter;
    const matchesSearch =
      payment.userName.toLowerCase().includes(search.toLowerCase()) ||
      payment.email.toLowerCase().includes(search.toLowerCase()) ||
      (payment.groupName && payment.groupName.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      confirmed: 'bg-green-500/20 text-green-300 border-green-500/50',
      declined: 'bg-red-500/20 text-red-300 border-red-500/50',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1724] via-[#18181b] to-[#0f1724] p-4 sm:p-6 lg:p-8 pt-24">
      <div className="max-w-7xl mx-auto pt-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#73e9dd] to-[#91dcac]">
              Payment Management Dashboard
            </h1>
            <p className="text-[#ffdfc0]/60 mt-2">Manage and review registration payments</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 text-red-300 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} />
            <span>Error: {error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#73e9dd] mx-auto mb-4"></div>
            <p className="text-[#ffdfc0]">Loading payments...</p>
          </div>
        ) : (
          <>
            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-[#73e9dd] to-[#91dcac] text-[#0f1724] shadow-lg scale-105'
                      : 'bg-[#232326] text-[#ffdfc0] hover:bg-[#2a2a2e] border border-[#73e9dd]/20'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#0f1724]/20">
                    {statusCounts[tab.status as keyof StatusCounts]}
                  </span>
                </button>
              ))}
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {TYPE_FILTERS.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setTypeFilter(filter.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    typeFilter === filter.key
                      ? 'bg-[#73e9dd]/20 text-[#73e9dd] border border-[#73e9dd]'
                      : 'bg-[#232326] text-[#ffdfc0]/60 border border-transparent hover:border-[#73e9dd]/30'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search by name, email, or group name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-3 bg-[#232326] border border-[#73e9dd]/30 text-[#ffdfc0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#73e9dd] focus:border-transparent placeholder-[#ffdfc0]/40"
              />
            </div>

            {/* Payment Cards */}
            <div className="space-y-4">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <div
                    key={payment.registrationId}
                    className="bg-[#232326] rounded-xl p-6 border border-[#73e9dd]/20 hover:border-[#73e9dd]/50 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-[#ffdfc0]">{payment.userName}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(payment.paymentStatus)}`}>
                            {payment.paymentStatus}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#73e9dd]/20 text-[#73e9dd] border border-[#73e9dd]/50 capitalize">
                            {payment.registrationType}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-[#ffdfc0]/60">
                          <span className="flex items-center gap-1">
                            <Mail size={14} /> {payment.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={14} /> {payment.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> {new Date(payment.createdAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-2xl font-bold text-[#91dcac]">
                          Rp {Number(payment.totalAmount).toLocaleString('id-ID')}
                        </div>
                        <div className="text-sm text-[#ffdfc0]/60">
                          {payment.participantCount} registration{payment.participantCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {/* Always show payment proof section */}
                      {payment.payments?.[0] ? (
                        payment.payments[0].proofOfPayment ? (
                          <>
                            {getFileType(payment.payments[0].proofOfPayment) === 'pdf' ? (
                              <a
                                href={getPaymentProofUrl(payment.payments[0].id)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-[#73e9dd]/10 border border-[#73e9dd]/30 text-[#73e9dd] rounded-lg hover:bg-[#73e9dd]/20 transition-all text-sm"
                              >
                                <FileText size={16} />
                                View Proof (PDF) - ID: {payment.payments[0].id}
                              </a>
                            ) : getFileType(payment.payments[0].proofOfPayment) === 'image' ? (
                              <a
                                href={getPaymentProofUrl(payment.payments[0].id)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-shrink-0"
                              >
                                <img
                                  src={getPaymentProofUrl(payment.payments[0].id)}
                                  alt="Payment proof"
                                  className="w-24 h-24 object-cover rounded-lg border-2 border-[#73e9dd]/30 hover:border-[#73e9dd] transition-all"
                                  onError={(e) => {
                                    console.error('Image load failed for payment ID:', payment.payments[0].id);
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </a>
                            ) : (
                              <a
                                href={getPaymentProofUrl(payment.payments[0].id)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-[#73e9dd]/10 border border-[#73e9dd]/30 text-[#73e9dd] rounded-lg hover:bg-[#73e9dd]/20 transition-all text-sm"
                              >
                                <FileText size={16} />
                                View Proof - ID: {payment.payments[0].id}
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm">
                            <AlertCircle size={16} />
                            No proof uploaded (Path: {payment.payments[0].proofOfPayment || 'null'})
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm">
                          <AlertCircle size={16} />
                          No payment record
                        </div>
                      )}
                      {payment.categoryCounts && Object.entries(payment.categoryCounts).length > 0 && (
                        <div className="flex-1 bg-[#18181b] rounded-lg p-3">
                          <div className="text-xs text-[#73e9dd] mb-2 font-semibold">Categories:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(payment.categoryCounts).map(([cat, count]) => (
                              <span key={cat} className="px-2 py-1 bg-[#73e9dd]/10 text-[#73e9dd] rounded text-xs">
                                {cat}: {String(count)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {payment.jerseySizes && Object.entries(payment.jerseySizes).length > 0 && (
                        <div className="flex-1 bg-[#18181b] rounded-lg p-3">
                          <div className="text-xs text-[#73e9dd] mb-2 font-semibold">Jersey Sizes:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(payment.jerseySizes).map(([size, count]) => (
                              <span key={size} className="px-2 py-1 bg-[#91dcac]/10 text-[#91dcac] rounded text-xs">
                                {size}: {String(count)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openDetails(payment)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#73e9dd]/20 border border-[#73e9dd]/50 text-[#73e9dd] rounded-lg hover:bg-[#73e9dd]/30 transition-colors"
                      >
                        <FileText size={16} />
                        View Details
                      </button>
                      {activeTab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAccept(payment)}
                            className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors font-semibold"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(payment)}
                            className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors font-semibold"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-[#232326] rounded-xl border border-[#73e9dd]/20">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-[#ffdfc0] text-lg">No {activeTab} payments found</p>
                  <p className="text-[#ffdfc0]/60 text-sm mt-2">Try adjusting your filters or search query</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#232326] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#73e9dd]/30 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#232326] to-[#2a2a2e] p-6 border-b border-[#73e9dd]/30 flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#73e9dd] to-[#91dcac]">
                  Registration Details
                </h2>
                <p className="text-[#ffdfc0]/60 text-sm mt-1">
                  ID: {selectedPayment.registrationId} {selectedPayment.transactionId && `| Transaction: ${selectedPayment.transactionId}`}
                </p>
                <div className="text-[#ffdfc0]/60 text-sm mt-2 space-y-1">
                  {selectedPayment.registrations && selectedPayment.registrations.length > 0 ? (
                    selectedPayment.registrations.map((r) => (
                      <div key={r.registrationId} className="flex items-center justify-between bg-[#1b1b1d] p-2 rounded">
                        <div className="text-sm">
                          <div className="font-medium">#{r.registrationId} — {r.registrationType}</div>
                          <div className="text-xs text-[#9ca3af]">
                            {r.groupName ? `${r.groupName} • ` : ''}{r.participantCount} participant{r.participantCount > 1 ? 's' : ''} • Rp {Number(r.totalAmount).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="text-xs text-[#9ca3af]">{new Date(r.createdAt).toLocaleDateString('id-ID')}</div>
                      </div>
                    ))
                  ) : (
                    <div>Registrations: {selectedPayment.registrationIds?.join(', ')}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-[#18181b] rounded-lg transition-colors"
              >
                <X size={24} className="text-[#ffdfc0]" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusBadge(selectedPayment.paymentStatus)}`}>
                  Status: {selectedPayment.paymentStatus.toUpperCase()}
                </span>
                <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#73e9dd]/20 text-[#73e9dd] border border-[#73e9dd]/50 capitalize">
                  Type: {selectedPayment.registrationType}
                </span>
              </div>

              {/* Personal Information */}
              <div className="bg-[#18181b] rounded-xl p-6 border border-[#73e9dd]/20">
                <h3 className="text-lg font-semibold text-[#91dcac] mb-4 flex items-center gap-2">
                  <User size={20} /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={<User size={16} />} label="Full Name" value={selectedPayment.userName} />
                  <InfoItem icon={<Mail size={16} />} label="Email" value={selectedPayment.email} />
                  <InfoItem icon={<Phone size={16} />} label="Phone" value={selectedPayment.phone} />
                  {selectedPayment.user?.emergencyPhone && (
                    <InfoItem icon={<AlertCircle size={16} />} label="Emergency Contact" value={selectedPayment.user.emergencyPhone} />
                  )}
                  {selectedPayment.user?.birthDate && (
                    <InfoItem 
                      icon={<Calendar size={16} />} 
                      label="Birth Date" 
                      value={new Date(selectedPayment.user.birthDate).toLocaleDateString('id-ID')} 
                    />
                  )}
                  {selectedPayment.user?.gender && (
                    <InfoItem label="Gender" value={selectedPayment.user.gender} capitalize />
                  )}
                  {selectedPayment.user?.nationality && (
                    <InfoItem label="Nationality" value={selectedPayment.user.nationality} />
                  )}
                  {selectedPayment.user?.currentAddress && (
                    <InfoItem 
                      icon={<MapPin size={16} />} 
                      label="Address" 
                      value={selectedPayment.user.currentAddress} 
                      fullWidth 
                    />
                  )}
                  {selectedPayment.user?.medicalHistory && (
                    <InfoItem 
                      label="Medical History" 
                      value={selectedPayment.user.medicalHistory} 
                      fullWidth 
                    />
                  )}
                </div>
              </div>

              {/* ID Card/Passport Photo - UPDATED for PDF support */}
                {selectedPayment.registrations && selectedPayment.registrations.length > 0 && selectedPayment.registrations.some((r:any) => (r.user?.idCardPhoto || r.idCardPhoto)) ? (
                <div className="bg-[#18181b] rounded-xl p-6 border border-[#73e9dd]/20">
                  <h3 className="text-lg font-semibold text-[#91dcac] mb-4 flex items-center gap-2">
                    <IdCard size={20} />
                    ID Card(s) for Registrations
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedPayment.registrations.map((r: any) => {
                      const img = r.user?.idCardPhoto || r.idCardPhoto;
                      if (!img) return null;
                      const imgUrl = getImageUrl(img);
                      const alt = `ID Card — Registration #${r.registrationId}`;
                      
                      return (
                        <div key={r.registrationId}>
                          <FileDisplay 
                            src={imgUrl}
                            originalPath={img}
                            alt={alt}
                            label={`ID Card - Reg #${r.registrationId}`}
                            imageClassName="w-full rounded-lg border-2 border-[#73e9dd]/30 hover:border-[#73e9dd] transition-all cursor-pointer object-cover max-h-60"
                          />
                          <p className="text-xs text-[#ffdfc0]/60 text-center mt-2">Registration #{r.registrationId}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedPayment.user?.idCardPhoto ? (
                <div className="bg-[#18181b] rounded-xl p-6 border border-[#73e9dd]/20">
                  <h3 className="text-lg font-semibold text-[#91dcac] mb-4 flex items-center gap-2">
                    <IdCard size={20} />
                    {selectedPayment.user.nationality === 'WNI' ? 'KTP/ID Card Photo' : 'Passport Photo'}
                  </h3>
                  <FileDisplay 
                    src={getImageUrl(selectedPayment.user.idCardPhoto)}
                    originalPath={selectedPayment.user.idCardPhoto}
                    alt="ID Card"
                    label={selectedPayment.user.nationality === 'WNI' ? 'ID Card Document' : 'Passport Document'}
                    imageClassName="w-full max-w-2xl mx-auto rounded-lg border-2 border-[#73e9dd]/30 hover:border-[#73e9dd] transition-all cursor-pointer"
                  />
                  <p className="text-xs text-[#ffdfc0]/60 text-center mt-2">Click to view full size</p>
                </div>
              ) : null}

              {/* Registration Information */}
              <div className="bg-[#18181b] rounded-xl p-6 border border-[#73e9dd]/20">
                <h3 className="text-lg font-semibold text-[#91dcac] mb-4">Registration Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem label="Registration Type" value={selectedPayment.registrationType} capitalize />
                  {selectedPayment.groupName && (
                    <InfoItem label="Group Name" value={selectedPayment.groupName} />
                  )}
                  <InfoItem 
                    label="Total Amount" 
                    value={`Rp ${Number(selectedPayment.totalAmount).toLocaleString('id-ID')}`}
                    highlight 
                  />
                  <InfoItem 
                    label="Participants" 
                    value={`${selectedPayment.participantCount} person${selectedPayment.participantCount > 1 ? 's' : ''}`}
                  />
                  <InfoItem 
                    label="Registered At" 
                    value={new Date(selectedPayment.createdAt).toLocaleString('id-ID')}
                    fullWidth 
                  />
                </div>

                {selectedPayment.categoryCounts && Object.keys(selectedPayment.categoryCounts).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#73e9dd]/20">
                    <div className="text-sm text-[#73e9dd] mb-2 font-semibold">Categories:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedPayment.categoryCounts).map(([cat, count]) => (
                        <span key={cat} className="px-3 py-1.5 bg-[#73e9dd]/10 text-[#73e9dd] rounded-lg text-sm border border-[#73e9dd]/30">
                          {cat}: {String(count)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPayment.jerseySizes && Object.keys(selectedPayment.jerseySizes).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#73e9dd]/20">
                    <div className="text-sm text-[#73e9dd] mb-2 font-semibold">Jersey Sizes:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedPayment.jerseySizes).map(([size, count]) => (
                        <span key={size} className="px-3 py-1.5 bg-[#91dcac]/10 text-[#91dcac] rounded-lg text-sm border border-[#91dcac]/30">
                          {size}: {String(count)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Proof - ALWAYS SHOW THIS SECTION */}
              <div className="bg-[#18181b] rounded-xl p-6 border border-[#73e9dd]/20">
                <h3 className="text-lg font-semibold text-[#91dcac] mb-4">Payment Proof</h3>
                
                {/* DEBUG INFO */}
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                  <p><strong>Debug Info:</strong></p>
                  <p>Payment ID: {selectedPayment.payments?.[0]?.id || 'N/A'}</p>
                  <p>Proof Path in DB: {selectedPayment.payments?.[0]?.proofOfPayment || 'null'}</p>
                  <p>File Type Detected: {getFileType(selectedPayment.payments?.[0]?.proofOfPayment)}</p>
                  <p>Proxy URL: {selectedPayment.payments?.[0] ? getPaymentProofUrl(selectedPayment.payments[0].id) : 'N/A'}</p>
                </div>
                
                {selectedPayment.payments?.[0]?.proofOfPayment ? (
                  <>
                    <FileDisplay 
                      src={getPaymentProofUrl(selectedPayment.payments[0].id)}
                      originalPath={selectedPayment.payments[0].proofOfPayment}
                      alt="Payment proof"
                      label="Payment Proof Document"
                      imageClassName="w-full max-w-2xl mx-auto rounded-lg border-2 border-[#73e9dd]/30 hover:border-[#73e9dd] transition-all cursor-pointer"
                    />
                    <p className="text-xs text-[#ffdfc0]/60 text-center mt-2">
                      {getFileType(selectedPayment.payments[0].proofOfPayment) === 'pdf' ? 'Click "Open PDF" to view' : 'Click to view full size'}
                    </p>
                  </>
                ) : (
                  <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg p-8 flex flex-col items-center justify-center gap-4">
                    <AlertCircle size={64} className="text-yellow-500" />
                    <p className="text-yellow-300 text-center font-medium">No payment proof uploaded</p>
                    <p className="text-[#ffdfc0]/60 text-center text-sm">The user has not provided proof of payment yet</p>
                  </div>
                )}
                {/* Proof Sender Name */}
                <div className="mt-4 pt-4 border-t border-[#73e9dd]/20">
                  <InfoItem 
                    label="Proof Sender Name" 
                    value={selectedPayment.payments?.[0]?.proofSenderName || "No sender name provided"} 
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#73e9dd]/30">
                {selectedPayment.paymentStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAccept(selectedPayment)}
                      className="flex-1 min-w-[200px] px-6 py-3 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-all font-bold"
                    >
                      ✓ Accept Payment
                    </button>
                    <button
                      onClick={() => handleDecline(selectedPayment)}
                      className="flex-1 min-w-[200px] px-6 py-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-all font-bold"
                    >
                      ✗ Decline Payment
                    </button>
                  </>
                )}
                {selectedPayment.paymentStatus === 'confirmed' && (
                  <button
                    onClick={() => handleChangeStatus(selectedPayment.registrationId, 'declined')}
                    className="flex-1 min-w-[200px] px-6 py-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-all font-bold"
                  >
                    Change to Declined
                  </button>
                )}
                {selectedPayment.paymentStatus === 'declined' && (
                  <button
                    onClick={() => handleChangeStatus(selectedPayment.registrationId, 'confirmed')}
                    className="flex-1 min-w-[200px] px-6 py-3 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-all font-bold"
                  >
                    Change to Confirmed
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-3 bg-[#232326] border border-[#73e9dd]/30 text-[#ffdfc0] rounded-lg hover:bg-[#18181b] transition-all font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#232326] rounded-2xl max-w-md w-full p-6 border-2 border-red-500/30">
            <h3 className="text-xl font-bold text-red-300 mb-4">Decline Payment</h3>
            <p className="text-[#ffdfc0]/80 text-sm mb-4">
              Please provide a reason for declining this payment. This will be sent to the user via email.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full px-4 py-3 bg-[#18181b] border border-red-500/30 text-[#ffdfc0] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="e.g., Payment proof is unclear, amount doesn't match, transfer not found..."
              rows={4}
              required
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                  setPendingDeclineId(null);
                }}
                className="flex-1 px-4 py-2 border border-[#73e9dd]/30 text-[#ffdfc0] rounded-lg hover:bg-[#18181b] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDecline}
                disabled={!declineReason.trim()}
                className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to determine file type from path/filename
function getFileType(filePath: string | null | undefined): 'pdf' | 'image' | 'unknown' {
  if (!filePath) return 'unknown';
  
  const lowerPath = filePath.toLowerCase();
  
  // Check for PDF
  if (lowerPath.endsWith('.pdf') || lowerPath.includes('.pdf')) {
    return 'pdf';
  }
  
  // Check for common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  for (const ext of imageExtensions) {
    if (lowerPath.endsWith(ext) || lowerPath.includes(ext)) {
      return 'image';
    }
  }
  
  return 'unknown';
}

// Unified component to display either image or PDF based on file type
function FileDisplay({ 
  src, 
  originalPath,
  alt, 
  label = "View Document",
  imageClassName = ""
}: { 
  src: string | null; 
  originalPath?: string;
  alt: string; 
  label?: string;
  imageClassName?: string;
}) {
  if (!src) {
    return (
      <div className="w-full h-60 bg-[#18181b] rounded-lg border-2 border-[#73e9dd]/20 flex flex-col items-center justify-center text-[#ffdfc0]/60 gap-3">
        <AlertCircle size={48} className="text-[#73e9dd]/50" />
        <p className="text-center">No document available</p>
      </div>
    );
  }

  const fileType = getFileType(originalPath || src);

  if (fileType === 'pdf') {
    return (
      <div className="bg-[#18181b] rounded-lg p-8 border-2 border-[#73e9dd]/30 flex flex-col items-center justify-center gap-4">
        <FileText size={64} className="text-[#73e9dd]" />
        <p className="text-[#ffdfc0] text-center font-medium">{label} (PDF)</p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-6 py-3 bg-[#73e9dd]/20 border border-[#73e9dd]/50 text-[#73e9dd] rounded-lg hover:bg-[#73e9dd]/30 transition-all font-semibold"
        >
          <ExternalLink size={20} />
          Open PDF
        </a>
      </div>
    );
  }

  if (fileType === 'image') {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="block">
        <img
          src={src}
          alt={alt}
          className={imageClassName}
          onError={(e) => {
            // Replace with a "file not found" placeholder
            const target = e.target as HTMLImageElement;
            console.error('Failed to load image:', src);
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="w-full h-60 bg-[#18181b] rounded-lg border-2 border-red-500/30 flex flex-col items-center justify-center gap-3">
                  <svg class="w-16 h-16 text-red-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <p class="text-red-300 text-center font-medium">Image file not found</p>
                  <p class="text-[#ffdfc0]/60 text-center text-sm">The file may have been moved or deleted</p>
                </div>
              `;
            }
          }}
        />
      </a>
    );
  }

  // Unknown file type - show generic link
  return (
    <div className="bg-[#18181b] rounded-lg p-8 border-2 border-[#73e9dd]/30 flex flex-col items-center justify-center gap-4">
      <FileText size={64} className="text-[#73e9dd]/50" />
      <p className="text-[#ffdfc0] text-center font-medium">{label}</p>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-6 py-3 bg-[#73e9dd]/20 border border-[#73e9dd]/50 text-[#73e9dd] rounded-lg hover:bg-[#73e9dd]/30 transition-all font-semibold"
      >
        <ExternalLink size={20} />
        View Document
      </a>
    </div>
  );
}

// Helper component for info items
function InfoItem({ 
  icon, 
  label, 
  value, 
  fullWidth = false, 
  highlight = false,
  capitalize = false 
}: { 
  icon?: React.ReactNode; 
  label: string; 
  value: string; 
  fullWidth?: boolean;
  highlight?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <div className="text-xs text-[#73e9dd] mb-1 font-semibold flex items-center gap-1">
        {icon}
        {label}:
      </div>
      <div className={`text-[#ffdfc0] ${highlight ? 'text-lg font-bold text-[#91dcac]' : ''} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </div>
    </div>
  );
}