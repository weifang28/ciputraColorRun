"use client";

import { Suspense } from "react";
import  ConfirmPaymentClient from "./ConfirmPaymentClient"


export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ConfirmPaymentClient />
    </Suspense>
  );
}
