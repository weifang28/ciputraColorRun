"use client"

import React, { useEffect } from "react";
import Image from "next/image";

export default function Footer() {
    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).AOS) {
            try {
                // if AOS already initialized in layout, refresh; otherwise init with defaults
                if (typeof (window as any).AOS.init === "function") {
                    (window as any).AOS.init({ duration: 800, once: false, mirror: true, offset: 100 });
                } else if (typeof (window as any).AOS.refresh === "function") {
                    (window as any).AOS.refresh();
                }
            } catch (e) {
                // silent
            }
        }
    }, []);

    return (
        <footer className="bg-transparent mt-8">
            {/* Contact Section */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 py-8 sm:py-12 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2" data-aos="fade-right">
                        <h3 className="text-lg sm:text-2xl font-bold mb-2 tracking-wider">
                            Need help or further information? Feel free to contact us!
                        </h3>

                        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                            <div>
                                <p className="text-sm sm:text-lg font-semibold mb-0.5">Abel</p>
                                <p className="text-xs sm:text-base opacity-90">WhatsApp: 0895410319676</p>
                            </div>

                            <div>
                                <p className="text-sm sm:text-lg font-semibold mb-0.5">Elysian</p>
                                <p className="text-xs sm:text-base opacity-90">WhatsApp: 0811306658</p>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-pink-400">
                                <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M17.5 6.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>

                            <div>
                                <div className="text-sm sm:text-base font-semibold">Find out more on our Instagram</div>
                                <a
                                    href="https://instagram.com/ciputrarun.uc"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm sm:text-base text-white/90 underline hover:text-white"
                                    aria-label="Instagram @ciputrarun.uc"
                                >
                                    @ciputrarun.uc
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center md:justify-end" data-aos="fade-left" aria-hidden>
                        <div className="relative w-28 h-28 sm:w-40 sm:h-40 lg:w-48 lg:h-48 overflow-hidden bg-transparent p-0">
                            <Image src="/images/logoWajib.png" alt="Ciputra Color Run Logo" fill className="object-contain opacity-100" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Copyright */}
            <div className="bg-gray-900 py-3">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-gray-300 text-xs sm:text-sm">
                    &copy; {new Date().getFullYear()} Ciputra Color Run. All rights reserved.
                </div>
            </div>
        </footer>
    )
}