"use client"

export default function Footer() {
    return (
        <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 mt-12">
            <div className="max-w-7xl mx-auto px-6 py-6 text-center text-white/70 text-sm">
                &copy; {new Date().getFullYear()} Ciputra Color Run. All rights reserved.
            </div>
        </footer>
    )
}