"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import "./styles/homepage.css";
import LogoLoop from './components/LogoLoop'
import CountdownTimer from './components/CountdownTimer';
import AboutCarousel from './components/AboutCarousel';

export default function Home() {
  // Refresh AOS animations when page loads
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).AOS) {
      (window as any).AOS.refresh();
    }
  }, []);

  const TEMP_LOGO_PATH = '/Images/logo.png';
  
  const partnerLogos = [
    {
      src: TEMP_LOGO_PATH,
      alt: "Partner 1",
    },
    {
      src: TEMP_LOGO_PATH,
      alt: "Partner 2",
    },
    {
      src: TEMP_LOGO_PATH,
      alt: "Partner 3",
    }
  ];

  // list documentation images placed in /public/Homepage/documentation
  const docImages = [
    "/Homepage/documentation/doc1.jpg",
    "/Homepage/documentation/doc2.jpg",
    "/Homepage/documentation/doc3.jpg",
    "/Homepage/documentation/doc4.jpg",
    "/Homepage/documentation/doc5.jpg",
    "/Homepage/documentation/doc6.jpg",
    "/Homepage/documentation/doc7.jpg",
  ];

  return (
    <main className="bg-white overflow-x-hidden">
      <div className="home_top">
        <div className="home_top_content">

          <img
            src="/Images/logo.png"
            alt="Ciputra Color Run Logo"
            className="home_top_logo"
            data-aos="zoom-in"
            data-aos-duration="1000"
            data-aos-delay="100"
          />

          <h1 
            className="home_title"
            data-aos="fade-up"
            data-aos-duration="1000"
            data-aos-delay="300"
          >
            CIPUTRA COLOR RUN
          </h1>
        
          <CountdownTimer />

          <Link 
            href="/registration" 
            className="home_register_button"
            data-aos="fade-up"
            data-aos-duration="1000"
            data-aos-delay="500"
          >
            REGISTER NOW
          </Link>

          <p 
            className="home_description"
            data-aos="fade-up"
            data-aos-duration="1000"
            data-aos-delay="700"
          >
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Cupiditate quis aperiam voluptatem perferendis eos distinctio voluptatum exercitationem enim, error dolores iure magnam explicabo vel consectetur ullam excepturi recusandae alias tenetur!
          </p>

        </div>
      </div>

      

      <div className="sponsor-container">

        <h1 
          className="sponsor-title"
          data-aos="fade-down"
          data-aos-duration="1000"
        >
          MAIN SPONSOR
        </h1>

        <div 
          className="partner-loop-with-borders"
          data-aos="fade-up"
          data-aos-duration="1000"
          data-aos-delay="200"
        >
          <LogoLoop
            logos={partnerLogos}
            speed={40}
            direction="left"
            logoHeight={120}
            gap={20}
            pauseOnHover={true}
            fadeOut={false}
            scaleOnHover={false}
            className="partner-logo-loop"
          />
        </div>

      </div>
      {/* Documentation Section - Grid Layout with Animations */}
      <section className="relative w-full bg-gradient-to-r from-[#1F6251] to-[#9C686A] py-8 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            { /* Featured top-3 documentation images */ }
            {[0,1,2].map((n) => (
              <div
                key={`featured-doc-${n}`}
                className="bg-gray-200 rounded-md overflow-hidden p-0 min-h-[160px] md:min-h-[200px]"
                data-aos="zoom-in"
                data-aos-duration="1000"
                data-aos-delay={100 + n * 100}
              >
                <img
                  src={docImages[n]}
                  alt={`Documentation featured ${n + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/Homepage/documentation/placeholder.png";
                  }}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {docImages.map((src, i) => (
              <div
                key={i}
                className="bg-gray-200 rounded-md aspect-square w-full overflow-hidden"
                data-aos="flip-left"
                data-aos-duration="800"
                data-aos-delay={i * 100}
                aria-hidden
              >
                <img
                  src={src}
                  alt={`Documentation ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // fallback if image missing
                    (e.currentTarget as HTMLImageElement).src = "/Homepage/documentation/placeholder.png";
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* About Section - Two Column Layout (image fills entire section) */}
      <section className="w-full relative overflow-hidden">
        <div className="max-w-full mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-stretch min-h-[400px] md:min-h-[600px]">
            {/* Left: carousel placed inside left grid column (hidden on small screens) */}
            <div className="hidden md:block about-left" aria-hidden>
              <AboutCarousel />
            </div>

            {/* Right: Text content overlays the background image */}
            <div
              className="relative bg-gradient-to-r from-[#1F6251]/90 to-[#9C686A]/90 p-6 sm:p-8 md:p-12 md:pl-20 flex flex-col justify-center min-h-[400px]"
              data-aos="fade-left"
              data-aos-duration="1200"
            >
              <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6 text-white">
                About Ciputra Color Run
              </h2>
              <p className="text-base md:text-lg text-white/90 mb-3 md:mb-4 leading-relaxed">
                Ciputra Color Run is an annual community fun-run event that brings families,
                friends, and organizations together to celebrate health, unity, and color.
              </p>
              <p className="text-sm md:text-base text-white/80 mb-4 md:mb-6 leading-relaxed">
                Join us for various race categories designed for all skill levels and ages.
                We offer individual and community registrations. Communities can register multiple
                categories under one registration and claim race packs using generated QR codes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/registration" className="inline-block px-5 py-2 rounded-full bg-white text-[#1F6251] font-semibold text-center shadow hover:shadow-lg transition-all">
                  Register Now
                </Link>
                <Link href="/" className="inline-block px-5 py-2 rounded-full border-2 border-white text-white font-semibold text-center hover:bg-white/10 transition-all">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
