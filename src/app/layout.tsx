import type { Metadata } from "next";
import "./globals.css";
import "./styles/homepage.css";
import NavBar from "./components/NavBar";
import Script from "next/script";
import Footer from "./components/Footer";
import ClientToaster from "./components/ClientToaster";

export const metadata: Metadata = {
  title: "Ciputra Color Run 2026 - The Most Vibrant Fun Run in Surabaya",
  description: "Join Ciputra Color Run 2026, the most vibrant celebration of health and happiness in Surabaya! Organized by Student Council of Universitas Ciputra. Register now for 3K, 5K, or 10K categories.",
  keywords: "Ciputra Color Run, Ciputra Color Run 2026, color run Surabaya, fun run Surabaya, Universitas Ciputra, UC run, running event Surabaya, 3K 5K 10K run",
  authors: [{ name: "Student Council Universitas Ciputra" }],
  
  // Primary metadata
  metadataBase: new URL('https://ciputrarun.com'),
  alternates: {
    canonical: '/',
  },
  
  // Open Graph
  openGraph: {
    title: "Ciputra Color Run 2026",
    description: "The most vibrant celebration of health and happiness in Surabaya. Join us on April 12, 2026!",
    url: "https://ciputrarun.com",
    siteName: "Ciputra Color Run 2026",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "Ciputra Color Run 2026 Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "Ciputra Color Run 2026",
    description: "The most vibrant celebration of health and happiness in Surabaya",
    images: ["/images/logo.png"],
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Icons - Next.js 14+ handles these automatically
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/images/logo.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: [
      { url: '/images/logo.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
  },
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

        {/* Structured Data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsEvent",
              "name": "Ciputra Color Run 2026",
              "description": "The most vibrant celebration of health and happiness in Surabaya. Proudly organized by the Student Council of Universitas Ciputra.",
              "startDate": "2026-04-12T04:00:00+07:00",
              "endDate": "2026-04-12T09:30:00+07:00",
              "location": {
                "@type": "Place",
                "name": "Universitas Ciputra Surabaya",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Surabaya",
                  "addressRegion": "Jawa Timur",
                  "addressCountry": "ID"
                }
              },
              "image": "https://ciputrarun.com/images/logo.png",
              "organizer": {
                "@type": "Organization",
                "name": "Student Council Universitas Ciputra",
                "url": "https://ciputrarun.com",
                "logo": "https://ciputrarun.com/images/logo.png"
              },
              "offers": {
                "@type": "Offer",
                "url": "https://ciputrarun.com/registration",
                "price": "130000",
                "priceCurrency": "IDR",
                "availability": "https://schema.org/InStock",
                "validFrom": "2025-12-01"
              }
            })
          }}
        />
      </head>
      <body className="antialiased">
        <NavBar />
        {/* ensure page content is pushed below fixed navbar */}
        <div className="">{children}</div>

        {/* Client-only toast container */}
        <ClientToaster />

        {/* AOS script / init */}
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
        <Footer />
      </body>
    </html>
  );
}
