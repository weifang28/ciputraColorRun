"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import "./styles/homepage.css";
import LogoLoop from './components/LogoLoop'
import CountdownTimer from './components/CountdownTimer';
import AboutCarousel from './components/AboutCarousel';
import DocDecor from './components/DocDecor';

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

          {/* Register button wrapper: shows flower assets on hover */}
          <div
            className="register-wrap"
            data-aos="fade-up"
            data-aos-duration="1000"
            data-aos-delay="500"
          >
            <Link href="/registration" className="home_register_button register-btn">
              REGISTER NOW
            </Link>

            {/* decorative flowers that pop out on hover */}
            <img src="/assets/asset10.svg" alt="" className="register-flower reg-flower-1" aria-hidden />
            <img src="/assets/asset10.svg" alt="" className="register-flower reg-flower-2" aria-hidden />
          </div>

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
      <section className="relative w-full bg-gradient-to-r from-[#a0d4ac] to-[#e2969c] py-8 md:py-16">
        {/* decorative floating assets anchored to this documentation section */}
        <DocDecor />
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
              className="relative bg-gradient-to-r from-[#a0d4ac]/90 to-[#e2969c]/90 p-6 sm:p-8 md:p-12 md:pl-20 flex flex-col justify-center min-h-[400px]"
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

      {/* Pricing Section: semantic table with minimal styling + small decor assets */}
      <section className="pricing-section max-w-6xl mx-auto px-4 sm:px-6 py-10 relative">
        {/* decorative assets near the table (non-interactive) */}
        <div className="pricing-decor" aria-hidden>
          <img src="/assets/asset4.svg" className="pricing-decor-large" alt="" />
          <img src="/assets/asset10.svg" className="pricing-decor-small" alt="" />
        </div>

        <h2 className="pricing-title text-2xl md:text-3xl font-moderniz font-bold text-center mb-6">HARGA TIKET</h2>

        <div className="pricing-table-wrap">
          <table className="pricing-table" role="table" aria-label="Harga Tiket Ciputra Color Run">
            <thead>
              <tr>
                <th scope="col" className="col-item">Kategori</th>
                <th scope="col" className="col-main">Harga Dasar</th>
                <th scope="col" className="col-tier">Komunitas 10-29</th>
                <th scope="col" className="col-tier">Komunitas 30-59</th>
                <th scope="col" className="col-tier">Komunitas ≥60</th>
                <th scope="col" className="col-note">Early bird / Bundle</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-item">10K</td>
                <td className="col-main font-mustica">Rp 250.000</td>
                <td className="col-tier">Rp 235.000</td>
                <td className="col-tier">Rp 225.000</td>
                <td className="col-tier">Rp 215.000</td>
                <td className="col-note">Early bird: Rp 220.000</td>
              </tr>
              <tr>
                <td className="col-item">5K</td>
                <td className="col-main font-mustica">Rp 200.000</td>
                <td className="col-tier">Rp 190.000</td>
                <td className="col-tier">Rp 180.000</td>
                <td className="col-tier">Rp 170.000</td>
                <td className="col-note">Early bird: Rp 180.000</td>
              </tr>
              <tr>
                <td className="col-item">3K</td>
                <td className="col-main font-mustica">Rp 150.000</td>
                <td className="col-tier">Rp 140.000</td>
                <td className="col-tier">Rp 135.000</td>
                <td className="col-tier">—</td>
                <td className="col-note">
                  Early bird: Rp 130.000<br/>
                  Bundling family (4 orang): Rp 145.000 / orang
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="timeline-section py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-[1fr_2fr] gap-8 items-center">
            {/* Left: Title */}
            <div className="timeline-title-wrap" data-aos="fade-right">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1F6251] mb-2 font-moderniz">
                TIMELINE
              </h2>
              <p className="text-gray-600 font-mustica">Jadwal Penting Event</p>
            </div>

            {/* Right: Scrollable timeline cards */}
            <div className="timeline-scroll-wrap" data-aos="fade-left">
              <div className="timeline-cards">
                <div className="timeline-card">
                  <div className="timeline-badge">REGISTRASI</div>
                  <div className="timeline-date">1 Desember 2025 — 28 Maret 2026</div>
                  <p className="timeline-text">
                    Registrasi dibuka sejak 1 Desember 2025 hingga 28 Maret 2026, atau sampai kuota terpenuhi.
                  </p>
                </div>

                <div className="timeline-card">
                  <div className="timeline-badge">PENGAMBILAN RACE PACK</div>
                  <div className="timeline-date">9 — 11 April 2026</div>
                  <p className="timeline-text">
                    Ambil race pack pada tanggal 9 sampai 11 April 2026.
                  </p>
                </div>

                <div className="timeline-card">
                  <div className="timeline-badge">RUNNING DAY</div>
                  <div className="timeline-date">12 April 2026</div>
                  <p className="timeline-text">
                    Hari lomba: 12 April 2026 — mari bergabung dan bersenang-senang!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Claim Racepack & Venue Section */}
      <section className="claim-venue-section py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <div className="claim-card" data-aos="fade-up">
              <div className="claim-card-header">
                <h3 className="font-moderniz text-xl text-[#1F6251]">Claim Your Racepack</h3>
                <span className="badge-small">Important</span>
              </div>
              <p className="font-mustica text-[#52605f] mt-3">
                Registrants can claim their racepack at <strong>Corepreneur UC</strong>.
              </p>
              <ul className="claim-list mt-4">
                <li><strong>Lokasi:</strong> Corepreneur UC, Universitas Ciputra</li>
                <li><strong>Waktu Pengambilan:</strong> 9 — 11 April 2026</li>
                <li><strong>Yang Harus Dibawa:</strong> ID & bukti pendaftaran (QR code / nama)</li>
              </ul>
              <p className="mt-4 text-sm text-[#52605f]">
                Jika Anda mendaftar melalui komunitas, pastikan perwakilan membawa daftar peserta.
              </p>
            </div>

            <div className="venue-card" data-aos="fade-up" data-aos-delay="80">
              <div className="venue-card-header">
                <h3 className="font-moderniz text-xl text-[#1F6251]">Start / Finish</h3>
              </div>
              <p className="font-mustica text-[#52605f] mt-2">
                Start dan finish akan berada di <strong>Universitas Ciputra Surabaya</strong>.
              </p>
              <div className="venue-map mt-4" aria-hidden>
                {/* Decorative asset — non-interactive */}
                <img src="/assets/asset4.svg" alt="" className="venue-decor" />
              </div>
              <p className="mt-4 text-sm text-[#52605f]">
                Detail titik kumpul dan rute akhir akan diumumkan melalui email dan halaman acara.
              </p>
              <div className="mt-4">
                <Link href="/registration" className="inline-block btn-register-ghost">
                  Need help? Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
