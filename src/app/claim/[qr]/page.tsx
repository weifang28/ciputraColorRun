"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Claim UI:
 * - Fetch /api/racePack/qr?qr=... to display registration + participants grouped by jersey size
 * - Allow selecting participants (checkbox) and submit to POST /api/racePack/claim with participantIds
 * - Support "Self claim" mode which requires a password (env CLAIM_PASSWORD or ADMIN_PASS on server)
 */

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  // normalize useParams() value (string | string[] | undefined) to a single token string
  const qr = params?.qr;
  const token = Array.isArray(qr) ? qr[0] : qr;

  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [claimedBy, setClaimedBy] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [claiming, setClaiming] = useState(false);
  const [selfMode, setSelfMode] = useState(false);

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
    if (selectedIds.length === 0 && !selfMode) {
      alert("Select at least one participant or use Self Claim.");
      return;
    }
    if (selfMode && !password) {
      alert("Password is required for self-claim.");
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch("/api/racePack/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeData: token,
          participantIds: selectedIds.length ? selectedIds : undefined,
          claimedBy: claimedBy || (selfMode ? "self" : "staff"),
          claimType: selfMode ? "self" : "staff",
          password: selfMode ? password : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || body?.message || res.statusText);
      alert("Claim successful");
      // reload to show updated claimed state
      router.replace(window.location.pathname);
    } catch (err: any) {
      alert("Claim failed: " + (err?.message || String(err)));
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading QR info…</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  if (!qrData) return <div className="p-8 text-center">No data found for this QR.</div>;

  const registration = qrData.registration;
  const participants = registration.participants || [];
  const groupedBySize: Record<string, any[]> = {};
  participants.forEach((p: any) => {
    const size = p.jersey?.size || "M";
    groupedBySize[size] = groupedBySize[size] || [];
    groupedBySize[size].push(p);
  });

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold mb-2">Claim Race Pack</h1>
        <p className="text-sm text-gray-600 mb-4">
          Registration: <strong>{registration.user?.name || "—"}</strong> — Total packs for this QR: <strong>{qrData.totalPacks}</strong> — Scans remaining: <strong>{qrData.scansRemaining}</strong>
        </p>

        <section className="mb-6">
          <h2 className="font-semibold mb-2">Participants (by jersey size)</h2>
          <div className="space-y-4">
            {Object.entries(groupedBySize).map(([size, list]) => (
              <div key={size} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Size {size}</div>
                  <div className="text-sm text-gray-600">Total: {list.length} — Claimed: {list.filter((x: any) => x.packClaimed).length}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {list.map((p: any) => (
                    <label key={p.id} className={`flex items-center gap-3 p-2 rounded ${p.packClaimed ? "bg-gray-100 opacity-70" : "bg-white"}`}>
                      <input
                        type="checkbox"
                        disabled={p.packClaimed}
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                      <div className="text-sm">
                        <div className="font-medium">{p.bibNumber || `Participant #${p.id}`}</div>
                        <div className="text-xs text-gray-500">{p.packClaimed ? "Claimed" : "Unclaimed"}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold mb-2">Claim Options</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Claimed By (name)</label>
              <input value={claimedBy} onChange={(e) => setClaimedBy(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Name of claimer (optional)" />
            </div>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center">
                <input type="checkbox" checked={selfMode} onChange={() => setSelfMode((s) => !s)} />
                <span className="ml-2 text-sm">Self-claim (requires admin password)</span>
              </label>
            </div>

            {selfMode && (
              <div>
                <label className="block text-sm mb-1">Admin Claim Password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full px-3 py-2 border rounded" placeholder="Enter claim password" />
              </div>
            )}

            <div className="pt-3 flex gap-3">
              <button disabled={claiming} onClick={submitClaim} className="px-4 py-2 bg-green-600 text-white rounded">
                {claiming ? "Claiming…" : "Submit Claim"}
              </button>
              <button onClick={() => { setSelectedIds([]); setPassword(''); setClaimedBy(''); }} className="px-4 py-2 border rounded">Reset</button>
            </div>
          </div>
        </section>

        <div className="text-sm text-gray-500 mt-4">
          Tip: staff can select exact participants to claim (per-size). For quick claims you may leave selection empty and staff will claim first available unclaimed packs.
        </div>
      </div>
    </main>
  );
}