"use client"

import React, { useEffect } from "react";
import Image from "next/image";
import { Instagram } from "lucide-react";

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
        <footer className="bg-linear-to-r from-gray-900 to-gray-800 mt-8 py-12">
            <div className="max-w-7xl mx-auto px-6">
                {/* 3-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Column 1: Need Help */}
                    <div className="space-y-4" data-aos="fade-right">
                        <h3 className="text-white font-bold text-lg mb-4">Need help or further information? Feel free to contact us!</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                <div>
                                    <p className="text-white font-semibold text-sm">Abel</p>
                                    <p className="text-white/60 text-sm">WhatsApp: 0895410319676</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                <div>
                                    <p className="text-white font-semibold text-sm">Elysian</p>
                                    <p className="text-white/60 text-sm">WhatsApp: 0811306658</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Stay Updated */}
                    <div className="space-y-4 flex flex-col items-center md:items-start" data-aos="fade-up">
                        <h3 className="text-white font-bold text-lg mb-4">Stay Updated</h3>
                        <div className="flex items-center gap-3">
                            <Instagram className="w-5 h-5 text-pink-400" />
                            <div>
                                <div className="text-sm font-semibold text-white">Find out more on our Instagram</div>
                                <a
                                    href="https://instagram.com/ciputrarun.uc"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-white/60 hover:text-white transition-colors"
                                    aria-label="Instagram @ciputrarun.uc"
                                >
                                    @ciputrarun.uc
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Organized By */}
                    <div className="flex items-center justify-center md:justify-end" data-aos="fade-left">
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32">
                            <Image 
                                src="/images/logoWajib.png" 
                                alt="Ciputra Color Run Logo" 
                                fill
                                className="object-contain opacity-90"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Border & Copyright */}
                <div className="border-t border-white/10 pt-6">
                    <p className="text-center text-white/60 text-sm">
                        &copy; 2026 Ciputra Color Run. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}