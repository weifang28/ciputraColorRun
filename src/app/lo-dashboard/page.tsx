"use client";

import React, { useState, useEffect } from 'react';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'individual', label: 'Individual' },
  { key: 'community', label: 'Community' },
];

export default function LODashboard() {
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending payments from database
  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true);
        const res = await fetch('/api/payments/pending');
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || 'Failed to fetch payments');
        }
        const data = await res.json();
        setPayments(data);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching payments:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, []);

  const handleAccept = async (registrationId: number) => {
    try {
      // include credentials so any cookie-based admin session is sent
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ registrationId }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        // show server-provided message when available
        const msg = body?.error || body?.message || res.statusText || 'Unknown error';
        throw new Error(msg);
      }

      alert(`Payment confirmed. QR code sent to user email.`);
      setPayments(prev => prev.filter(p => p.registrationId !== registrationId));
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Failed to confirm payment'));
    }
  };

  const handleDecline = async (registrationId: number) => {
    try {
      const res = await fetch('/api/payments/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ registrationId }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body?.error || body?.message || res.statusText || 'Failed to decline payment';
        throw new Error(msg);
      }

      alert('Payment declined — status updated in database.');
      setPayments(prev => prev.filter(p => p.registrationId !== registrationId));
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Failed to decline payment'));
    }
  };

  // Filter payments by tab and search
  const filteredPayments = payments.filter(payment => {
    const matchesTab =
      activeTab === 'all' || payment.registrationType === activeTab;
    const matchesSearch =
      payment.userName.toLowerCase().includes(search.toLowerCase()) ||
      (payment.groupName && payment.groupName.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="lo-dashboard p-8 min-h-screen flex flex-col items-center bg-[#18181b]">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl pt-5 mt-5 font-bold mb-6 text-[#73e9dd] text-center">LO Dashboard - Pending Payments</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 text-red-300 rounded">
            Error: {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-[#ffdfc0]">
            Loading payments...
          </div>
        )}

        {!loading && (
          <>
            {/* Tabs */}
            <div className="flex justify-center mb-4 gap-2">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors duration-150 ${activeTab === tab.key ? 'bg-[#73e9dd] text-[#18181b] border-[#73e9dd]' : 'bg-[#232326] text-[#ffdfc0] border-transparent hover:bg-[#232326] hover:text-[#73e9dd]'}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="mb-6 flex justify-center">
              <input
                type="text"
                placeholder="Search by name or community..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-[#73e9dd] bg-[#232326] text-[#ffdfc0] rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#73e9dd] placeholder-[#91dcac]"
              />
            </div>
            {/* Table */}
            <div className="overflow-x-auto rounded-lg shadow">
              <table className="w-full text-left bg-[#232326]">
                <thead>
                  <tr className="bg-[#18181b] text-[#73e9dd]">
                    <th className="p-3 font-semibold">User Name</th>
                    <th className="p-3 font-semibold">{activeTab === 'community' ? 'Group Name' : 'Total Price (IDR)'}</th>
                    <th className="p-3 font-semibold">Proof</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map(payment => (
                      <tr key={payment.registrationId} className="border-b border-[#73e9dd] hover:bg-[#232326]">
                        <td className="p-3 text-[#ffdfc0] font-medium">{payment.userName}</td>
                        <td className="p-3 text-[#91dcac]">
                          {payment.registrationType === 'community' ? payment.groupName : payment.totalAmount?.toLocaleString()}
                        </td>
                        <td className="p-3">
                          {/* show first proof thumbnail if available */}
                          {payment.payments && payment.payments.length > 0 && payment.payments[0].proofOfPayment ? (
                            <a href={payment.payments[0].proofOfPayment} target="_blank" rel="noreferrer">
                              <img src={payment.payments[0].proofOfPayment} alt="proof" className="w-20 h-14 object-cover rounded-md border" />
                            </a>
                          ) : (
                            <span className="text-xs text-[#ffdfc0] opacity-60">No proof</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button className="bg-[#91dcac] hover:bg-[#73e9dd] text-[#18181b] px-4 py-2 mr-2 rounded transition-colors duration-150 font-bold" onClick={() => handleAccept(payment.registrationId)}>Accept</button>
                          <button className="bg-[#f581a4] hover:bg-[#ffdfc0] text-[#18181b] px-4 py-2 rounded transition-colors duration-150 font-bold" onClick={() => handleDecline(payment.registrationId)}>Decline</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[#ffdfc0]">No pending payments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}