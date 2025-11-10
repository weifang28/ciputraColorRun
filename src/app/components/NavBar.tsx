"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NavBar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/images/logo.png"
                            alt="Ciputra Color Run Logo"
                            width={60}
                            height={60}
                            className="object-contain"
                        />
                    </Link>

                    <div className="hidden md:flex items-center gap-12">
                        <Link
                            href="/"
                            className="text-white font-bold text-lg hover:text-white/80 transition-colors tracking-wide"
                        >
                            HOME
                        </Link>
                        <Link
                            href="/registration"
                            className="text-white font-bold text-lg hover:text-white/80 transition-colors tracking-wide"
                        >
                            REGISTER
                        </Link>

                        {/* Icons */}
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => {
                                    console.log("Cart clicked");
                                }}
                                className="text-white hover:text-white/80 transition-colors"
                                aria-label="Shopping Cart"
                            >
                                <ShoppingCart size={32} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => {
                                    // redirect to profile page
                                    router.push("/profilePage");
                                }}
                                className="text-white hover:text-white/80 transition-colors"
                                aria-label="User Profile"
                            >
                                <User size={32} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden text-white hover:text-white/80 transition-colors"
                        aria-label="Toggle Menu"
                    >
                        {isMenuOpen ? (
                            <X size={32} strokeWidth={2.5} />
                        ) : (
                            <Menu size={32} strokeWidth={2.5} />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 space-y-4 flex flex-col items-end">
                        <Link
                            href="/"
                            className="text-white font-bold text-lg hover:text-white/80 transition-colors tracking-wide"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            HOME
                        </Link>
                        <Link
                            href="/registration"
                            className="text-white font-bold text-lg hover:text-white/80 transition-colors tracking-wide"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            REGISTER
                        </Link>
                        <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                            <button
                                onClick={() => {
                                    console.log("Cart clicked");
                                    setIsMenuOpen(false);
                                }}
                                className="text-white hover:text-white/80 transition-colors"
                                aria-label="Shopping Cart"
                            >
                                <ShoppingCart size={32} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => {
                                    // redirect to profile page (mobile)
                                    setIsMenuOpen(false);
                                    router.push("/profilePage");
                                }}
                                className="text-white hover:text-white/80 transition-colors"
                                aria-label="User Profile"
                            >
                                <User size={32} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
