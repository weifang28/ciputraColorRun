"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "../context/CartContext";

export default function NavBar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { totalItems } = useCart();

    // Track auth status (null=unknown, false=not logged in, true=logged in)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(false);

    // Check authentication status
    const checkAuth = async () => {
        if (isCheckingAuth) return; // Prevent multiple simultaneous checks
        setIsCheckingAuth(true);
        
        try {
            const res = await fetch("/api/user", { 
                credentials: "include",
                cache: 'no-store' // Prevent caching
            });
            
            if (res.ok) {
                const body = await res.json().catch(() => ({}));
                setIsAuthenticated(true);
                const name = body?.user?.name ?? body?.name ?? null;
                setUserName(name);
            } else {
                setIsAuthenticated(false);
                setUserName(null);
            }
        } catch (e) {
            setIsAuthenticated(false);
            setUserName(null);
        } finally {
            setIsCheckingAuth(false);
        }
    };

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Re-check auth when pathname changes (after navigation)
    useEffect(() => {
        // Small delay to allow cookie changes to propagate
        const timer = setTimeout(() => {
            checkAuth();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [pathname]);

    const goToProfile = () => {
        setIsMenuOpen(false);
        if (isAuthenticated === true) {
            router.push("/profilePage");
        } else if (isAuthenticated === false) {
            router.push("/auth/login");
        } else {
            // Unknown state - check then route
            checkAuth().then(() => {
                if (isAuthenticated) {
                    router.push("/profilePage");
                } else {
                    router.push("/auth/login");
                }
            });
        }
    };

    // Logout: call logout endpoint and force re-check
    const logout = async () => {
        try {
            // Call server logout endpoint
            await fetch("/api/auth/logout", { 
                method: "POST", 
                credentials: "include" 
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local state immediately
            setIsAuthenticated(false);
            setUserName(null);
            
            // Navigate home
            router.push("/");
            
            // Force re-check after navigation
            setTimeout(() => {
                checkAuth();
            }, 200);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 nav-glass border-b font-moderniz">
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
                            {/* Cart */}
                            <button
                                onClick={() => router.push("/cart")}
                                className="relative text-white hover:text-white/80 transition-colors mr-2"
                                aria-label="Shopping Cart"
                            >
                                <ShoppingCart size={32} strokeWidth={2.5} />
                                {totalItems > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        {totalItems}
                                    </span>
                                )}
                            </button>

                            {/* Auth: show LOGIN when not logged in; show icon + name + logout when logged in */}
                            {isAuthenticated === null ? (
                                // Loading state
                                <div className="w-20 h-8 bg-white/10 rounded animate-pulse"></div>
                            ) : isAuthenticated ? (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={goToProfile}
                                        className="flex items-center text-white hover:text-white/80 transition-colors gap-2"
                                        aria-label="User Profile"
                                    >
                                        <User size={28} strokeWidth={2.5} />
                                        <span className="hidden sm:inline font-medium">{userName ?? "Profile"}</span>
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="text-white/90 hover:text-white px-3 py-1 border border-white/10 rounded-md text-sm"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => router.push("/auth/login")}
                                    className="text-white font-semibold"
                                >
                                    LOGIN
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden text-white p-2"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>

                    {/* Mobile Menu */}
                    {isMenuOpen && (
                        <div className="absolute top-full left-0 right-0 md:hidden">
                            <div className="bg-[#0f1724]/95 backdrop-blur-lg border-b border-white/10">
                                <div className="flex flex-col items-end px-6 py-6 gap-6">
                                    <nav className="flex flex-col items-end gap-4 w-full">
                                        <Link
                                            href="/"
                                            className="text-white font-bold text-lg hover:text-white/80 transition-colors tracking-wide w-full text-right"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            HOME
                                        </Link>
                                        <Link
                                            href="/registration"
                                            className="text-white font-bold text-lg hover:text-white/80 transition-colors tracking-wide w-full text-right"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            REGISTER
                                        </Link>

                                        {/* Bottom actions: cart + auth (right aligned) */}
                                        <div className="flex items-center gap-4 pt-4 border-t border-white/10 w-full justify-end">
                                            <button
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    router.push("/cart");
                                                }}
                                                className="relative text-white hover:text-white/80 transition-colors"
                                                aria-label="Shopping Cart"
                                            >
                                                <ShoppingCart size={28} strokeWidth={2.5} />
                                                {totalItems > 0 && (
                                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                        {totalItems}
                                                    </span>
                                                )}
                                            </button>

                                            {isAuthenticated === null ? (
                                                <div className="w-20 h-8 bg-white/10 rounded animate-pulse"></div>
                                            ) : isAuthenticated ? (
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setIsMenuOpen(false);
                                                            goToProfile();
                                                        }}
                                                        className="flex items-center gap-2 text-white font-medium"
                                                        aria-label="User Profile"
                                                    >
                                                        <User size={28} strokeWidth={2.5} />
                                                        <span>{userName ?? "Profile"}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsMenuOpen(false);
                                                            logout();
                                                        }}
                                                        className="text-white/90 hover:text-white px-3 py-1 border border-white/10 rounded-md text-sm"
                                                    >
                                                        Logout
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setIsMenuOpen(false);
                                                        router.push("/auth/login");
                                                    }}
                                                    className="text-white font-semibold"
                                                >
                                                    LOGIN
                                                </button>
                                            )}
                                        </div>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
