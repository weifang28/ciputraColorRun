"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../context/CartContext";

export default function NavBar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();
    const { totalItems } = useCart();

    // new: track auth status (null=unknown, false=not logged in, true=logged in)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
      let mounted = true;
      // call server endpoint to check cookie-based login
      (async () => {
        try {
          const res = await fetch("/api/user", { credentials: "include" });
          if (!mounted) return;
          setIsAuthenticated(res.ok);
        } catch (e) {
          if (!mounted) return;
          setIsAuthenticated(false);
        }
      })();
      return () => { mounted = false; };
    }, []);

    const goToProfile = () => {
      setIsMenuOpen(false);
      // if unknown, optimistically go to profile (server will redirect/401) — but prefer explicit mapping
      if (isAuthenticated === true) {
        router.push("/profilePage");
      } else if (isAuthenticated === false) {
        router.push("/auth/login");
      } else {
        // still unknown — fetch once and then route
        (async () => {
          try {
            const res = await fetch("/api/user", { credentials: "include" });
            if (res.ok) router.push("/profilePage");
            else router.push("/auth/login");
          } catch {
            router.push("/auth/login");
          }
        })();
      }
    };

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
                                onClick={() => router.push("/cart")}
                                className="relative text-white hover:text-white/80 transition-colors"
                                aria-label="Shopping Cart"
                            >
                                <ShoppingCart size={32} strokeWidth={2.5} />
                                {totalItems > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        {totalItems}
                                    </span>
                                )}
                            </button>

                            {/* Profile button: uses auth-aware routing */}
                            <button
                                onClick={goToProfile}
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
                                        setIsMenuOpen(false);
                                        router.push("/cart");
                                    }}
                                    className="relative text-white hover:text-white/80 transition-colors"
                                    aria-label="Shopping Cart"
                                >
                                    <ShoppingCart size={32} strokeWidth={2.5} />
                                    {totalItems > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                            {totalItems}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        // reuse goToProfile logic
                                        goToProfile();
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
            </div>
        </nav>
    );
}
