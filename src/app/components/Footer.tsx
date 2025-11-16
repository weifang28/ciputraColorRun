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
            {/* Sponsors Section */}
            <div
              className="bg-white py-8 sm:py-12 rounded-t-2xl shadow-inner border-t border-gray-200"
              data-aos="fade-up"
              data-aos-duration="800"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <h2 className="text-center text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 tracking-wider text-gray-800" data-aos="zoom-in">
                        SPONSORS
                    </h2>
                    
                    {/* Sponsor Logos Grid */}
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-4 sm:gap-6 items-center justify-items-center mb-6 sm:mb-8">
                        {/* Top row - 2 logos centered */}
                        <div className="col-span-2 md:col-start-2 flex items-center justify-center" data-aos="zoom-in" data-aos-delay="50">
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white p-1 shadow-sm">
                                <Image src="/images/logo.png" alt="Sponsor 1" fill className="object-contain" />
                            </div>
                        </div>
                        <div className="col-span-2 md:col-start-6 flex items-center justify-center" data-aos="zoom-in" data-aos-delay="100">
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white p-1 shadow-sm">
                                <Image src="/images/logo.png" alt="Sponsor 2" fill className="object-contain" />
                            </div>
                        </div>
                        
                        {/* Bottom row - 6 logos */}
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="col-span-1 flex items-center justify-center" data-aos="zoom-in" data-aos-delay={150 + i * 40}>
                                <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden bg-white p-1 shadow-sm">
                                    <Image src="/images/logo.png" alt={`Sponsor ${i + 3}`} fill className="object-contain" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 py-6 sm:py-10 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
                    <div className="text-left" data-aos="fade-right">
                        <h3 className="text-lg sm:text-2xl font-bold mb-1 tracking-wider">
                            CONTACT PERSON
                        </h3>
                        <p className="text-sm sm:text-lg font-semibold mb-0.5">Abel</p>
                        <p className="text-xs sm:text-base opacity-90">WA: 0895410319676</p>
                        <br />
                        <p className="text-sm sm:text-lg font-semibold mb-0.5">Elysian</p>
                        <p className="text-xs sm:text-base opacity-90">WA: 0811306658</p>
                    </div>
                    
                    <div className="flex items-center justify-center" data-aos="fade-left" aria-hidden>
                        <div className="relative w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56 overflow-hidden bg-transparent p-0 shadow-none">
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