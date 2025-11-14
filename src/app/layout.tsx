import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import { CartProvider } from "./context/CartContext";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ciputra Color Run",
  description: "Join the most colorful run in town!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* AOS CSS */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css"
          integrity="sha512-1cK78a1o+ht2JcaW6g8OXYwqpev9+6GqOkz9xmBN9iUUhIndKtxwILGWYOSibOKjLsEdjyjZvYDq/cZwNeak0w=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <CartProvider>
          <NavBar />
          {children}
        </CartProvider>
        
        {/* AOS JavaScript (load library) */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"
          integrity="sha512-A7AYk1fGKX6S2SsHywmPkrnzTZHrgiVT7GcQkLGDe2ev0aWb8zejytzS8wjo7PGEXKqJOrjQ4oORtnimIRZBtw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          strategy="afterInteractive"
        />

        {/* Inline initializer (polls for AOS and calls init) */}
        <script
          // inline script must be a string; run afterInteractive script will load AOS,
          // this polls for its availability and initializes it once present
          dangerouslySetInnerHTML={{
            __html: `
              (function initAOSWhenReady() {
                var attempts = 0;
                var maxAttempts = 50; // ~5s (50 * 100ms)
                var interval = setInterval(function() {
                  if (typeof window !== 'undefined' && window.AOS && typeof window.AOS.init === 'function') {
                    try {
                      window.AOS.init({ duration: 1000, once: false, mirror: true, offset: 100 });
                    } catch (e) {
                      console.error('AOS init error', e);
                    }
                    clearInterval(interval);
                    return;
                  }
                  attempts++;
                  if (attempts >= maxAttempts) clearInterval(interval);
                }, 100);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
