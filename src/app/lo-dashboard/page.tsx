"use client";


import React, { useState } from 'react';

// Mock data for pending payments (replace with API call later)
const mockPendingPayments = [
  { id: 1, userName: 'John Doe', totalPrice: 69000, type: 'personal' },
  { id: 2, userName: 'Jane Smith', totalPrice: 99000, type: 'community', community: 'Runners Club' },
  { id: 3, userName: 'Budi Santoso', totalPrice: 49000, type: 'personal' },
  { id: 4, userName: 'Komunitas Lari Jakarta', totalPrice: 299000, type: 'community', community: 'Komunitas Lari Jakarta' },
];

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'personal', label: 'Personal' },
  { key: 'community', label: 'Community' },
];

export default function LODashboard() {
  const [payments, setPayments] = useState(mockPendingPayments);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const handleAccept = (id: number) => {
    // TODO: Backend - Confirm payment, send QR code via email/WA, update DB
    alert(`Payment for user ${id} accepted. QR code sent.`);
    setPayments(payments.filter(payment => payment.id !== id));
  };

  const handleDecline = (id: number) => {
    // TODO: Backend - Decline payment, notify user
    alert(`Payment for user ${id} declined.`);
    setPayments(payments.filter(payment => payment.id !== id));
  };

  // Filter payments by tab and search
  const filteredPayments = payments.filter(payment => {
    const matchesTab =
      activeTab === 'all' || payment.type === activeTab;
    const matchesSearch =
      payment.userName.toLowerCase().includes(search.toLowerCase()) ||
      (payment.community && payment.community.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="lo-dashboard p-8 min-h-screen flex flex-col items-center bg-[#18181b]">
      <div className="w-full max-w-3xl">
        <br></br>
        <h1 className="text-3xl pt-5 mt-5 font-bold mb-6 text-[#73e9dd] text-center">LO Dashboard - Pending Payments</h1>
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
                <th className="p-3 font-semibold">{activeTab === 'community' ? 'Community' : 'Total Price (IDR)'}</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map(payment => (
                  <tr key={payment.id} className="border-b border-[#73e9dd] hover:bg-[#232326]">
                    <td className="p-3 text-[#ffdfc0] font-medium">{payment.userName}</td>
                    <td className="p-3 text-[#91dcac]">
                      {payment.type === 'community' ? payment.community : payment.totalPrice.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <button className="bg-[#91dcac] hover:bg-[#73e9dd] text-[#18181b] px-4 py-2 mr-2 rounded transition-colors duration-150 font-bold" onClick={() => handleAccept(payment.id)}>Accept</button>
                      <button className="bg-[#f581a4] hover:bg-[#ffdfc0] text-[#18181b] px-4 py-2 rounded transition-colors duration-150 font-bold" onClick={() => handleDecline(payment.id)}>Decline</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-[#ffdfc0]">No pending payments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}