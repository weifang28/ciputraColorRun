"use client";

import React, { useEffect, useState } from "react";

export default function AdminConfirmedPage() {
  const [regs, setRegs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/payments/confirmed", { credentials: "include" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || res.statusText);
        if (mounted) setRegs(body.registrations || []);
      } catch (err: any) {
        console.error("Failed to load confirmed:", err);
        if (mounted) setError(err.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-6">Loading confirmed registrations…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!regs || regs.length === 0) return <div className="p-6">No confirmed registrations found.</div>;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Confirmed Registrations</h1>
      <div className="space-y-4">
        {regs.map((r) => (
          <div key={r.id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{r.user?.name || "—"}</div>
                <div className="text-sm text-gray-600">{r.user?.email || "No email"} • {r.registrationType}</div>
                <div className="text-xs text-gray-500 mt-1">Total: Rp {Number(r.totalAmount || 0).toLocaleString("id-ID")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">Registered: {new Date(r.createdAt).toLocaleString()}</div>
                <div className="mt-2">
                  {r.payments && r.payments[0]?.proofOfPayment ? (
                    <a href={r.payments[0].proofOfPayment} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View proof</a>
                  ) : null}
                </div>
              </div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-700">View participants & personal data</summary>
              <div className="mt-2 text-sm">
                <p><strong>Phone:</strong> {r.user?.phone || "-"}</p>
                <p><strong>Address:</strong> {r.user?.currentAddress || "-"}</p>
                <p><strong>Nationality:</strong> {r.user?.nationality || "-"}</p>
                <div className="mt-2">
                  <strong>Participants:</strong>
                  <ul className="list-disc ml-6">
                    {(r.participants || []).map((p: any) => (
                      <li key={p.id}>
                        {p.bibNumber || `#${p.id}`} — Jersey: {p.jersey?.size || "-"} — Claimed: {p.packClaimed ? "Yes" : "No"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>
    </main>
  );
}