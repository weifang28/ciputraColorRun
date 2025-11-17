"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useState, useEffect, Suspense } from "react";
import ConfirmPaymentClient from "./ConfirmPaymentClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ConfirmPaymentClient />
    </Suspense>
  );
}
