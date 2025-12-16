"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import "./styles/homepage.css";
import LogoLoop from "./components/LogoLoop";
import CountdownTimer from "./components/CountdownTimer";
import AboutCarousel from "./components/AboutCarousel";
import DocDecor from "./components/DocDecor";
import RouteImageModal from "./components/RouteImageModal";

interface Category {
    id: number;
    name: string;
    basePrice: string;
    earlyBirdPrice?: string;
    tier1Price?: string;
    tier1Min?: number;
    tier1Max?: number;
    tier2Price?: string;
    tier2Min?: number;
    tier2Max?: number | null;
    tier3Price?: string;
    tier3Min?: number;
    bundlePrice?: string;
    bundleSize?: number;
    earlyBirdCapacity?: number;
    earlyBirdRemaining?: number | null;
}

export default function Home() {
	const homeTopRef = useRef<HTMLDivElement | null>(null); // now attached to outer .home_top
	const aboutRef = useRef<HTMLElement | null>(null);
	
	// State for route image modal
	const [routeModalOpen, setRouteModalOpen] = useState(false);
	const [selectedRoute, setSelectedRoute] = useState({ src: "", title: "" });

	// State for categories
	const [categories, setCategories] = useState<Category[]>([]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const outer = homeTopRef.current;
		if (!outer) return;

		// Observe the outer jumbotron element:
		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						outer.classList.remove("home_top_hide");
						try {
							(window as any).AOS?.refresh?.();
						} catch (e) {}
					} else {
						outer.classList.add("home_top_hide");
						setTimeout(() => {
							try {
								(window as any).AOS?.refresh?.();
							} catch (e) {}
						}, 240);
					}
				}
			},
			{ root: null, rootMargin: "-10% 0px 0px 0px", threshold: 0.05 }
		);

		io.observe(outer);
		return () => io.disconnect();
	}, []);

	const [loading, setLoading] = useState(true);
	// Jumbotron image path - use the actual path from public folder
	const jumbotronImage = "/homepage/home_bg.jpg"; // match actual file path

	// Refresh AOS animations when page loads
	useEffect(() => {
		if (typeof window !== "undefined" && (window as any).AOS) {
			(window as any).AOS.refresh();
		}

		// Fetch categories
		(async () => {
			try {
				const res = await fetch(`/api/categories`, {
					cache: 'no-store',
					headers: { 'Cache-Control': 'no-cache' }
				});
				if (!res.ok) throw new Error("Failed to load categories");
				const data = await res.json();
				setCategories(data);
			} catch (err) {
				console.error("Failed to load categories:", err);
			}
		})();

		// Simulate initial content load
		const timer = setTimeout(() => setLoading(false), 800);
		return () => clearTimeout(timer);
	}, []);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
					<p className="text-gray-600 font-semibold text-lg">
						Loading Ciputra Color Run...
					</p>
				</div>
			</div>
		);
	}

	const TEMP_LOGO_PATH = "/images/logo.png";

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
		},
	];

	// list documentation images placed in /public/Homepage/documentation
	const docImages = [
		"/homepage/documentation/doc1.jpg",
		"/homepage/documentation/doc2.jpg",
		"/homepage/documentation/doc3.jpg",
		"/homepage/documentation/doc4.jpg",
		"/homepage/documentation/doc5.jpg",
		"/homepage/documentation/doc6.jpg",
		"/homepage/documentation/doc7.jpg",
	];

	// Route maps data
	const routeMaps = [
		{
			distance: "3K",
			title: "3K Route Map",
			image: "/images/routes/3k.png", 
		},
		{
			distance: "5K",
			title: "5K Route Map",
			image: "/images/routes/5k.png", 
		},
		{
			distance: "10K",
			title: "10K Route Map",
			image: "/images/routes/10k.png",
		},
	];

	const openRouteModal = (imageSrc: string, title: string) => {
		setSelectedRoute({ src: imageSrc, title });
		setRouteModalOpen(true);
	};

	return (
		<main className="bg-white overflow-hidden">
			<div
				ref={homeTopRef}
				className="home_top pt-8"
				style={{
					// gradient overlay above the image
					backgroundImage: `linear-gradient(rgba(152,232,206,0.85) 0%, rgba(255,225,196,0.7) 50%, rgba(238,150,157,0.8) 100%), url('${jumbotronImage}')`,
					backgroundSize: "cover",
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
				}}
			>
				<div className="home_top_content">
					<img
						src="/images/logo.png"
						alt="Ciputra Color Run Logo"
						className="home_top_logo pt-10"
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
						CIPUTRA COLOR RUN 2026
					</h1>

					<CountdownTimer />

					{/* Register button wrapper: shows flower assets on hover */}
					<div
						className="register-wrap"
						data-aos="fade-up"
						data-aos-duration="1000"
						data-aos-delay="500"
					>
						<Link
							href="/registration"
							className="home_register_button register-btn"
						>
							REGISTER NOW
						</Link>

						{/* decorative flowers that pop out on hover */}
						<img
							src="/assets/asset10.svg"
							alt=""
							className="register-flower reg-flower-1"
							aria-hidden
						/>
						<img
							src="/assets/asset10.svg"
							alt=""
							className="register-flower reg-flower-2"
							aria-hidden
						/>
					</div>

					<p
						className="home_description"
						data-aos="fade-up"
						data-aos-duration="1000"
						data-aos-delay="700"
					>
						Official registration is available only through this website. Your
						data is secure and will not be shared with third parties.
					</p>
				</div>
			</div>

			{/* <div className="sponsor-container">
				<h1
					className="sponsor-title"
					data-aos="fade-down"
					data-aos-duration="1000"
				>
					MAIN SPONSORS
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
			</div> */}

			{/* About Section - Two Column Layout (image fills entire section) */}
			<section ref={aboutRef} className="w-full relative overflow-hidden pt-20">
				<div className="max-w-full mx-auto relative z-10">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-stretch min-h-[400px] md:min-h-[600px]">
						{/* Left: carousel — show on mobile and desktop */}
						<div className="about-left" aria-hidden>
							<AboutCarousel />
						</div>

						{/* Right: Text content overlays the background image */}
						<div
							className="about-right relative p-6 sm:p-8 md:p-12 md:pl-20 flex flex-col justify-center min-h-[400px]"
							data-aos="fade-left"
							data-aos-duration="1200"
						>
							<h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6 unified-gradient-title">
								About Ciputra Color Run
							</h2>
							<p className="text-sm text-justify md:text-lg text-[#1F6251] mb-3 leading-relaxed">
								Ciputra Color Run is the most vibrant celebration of health and
								happiness in Surabaya. Proudly organized by the Student Council
								of Universitas Ciputra, this annual Fun Run takes you through
								CitraLand and ends with a twist.
							</p>
							<p className="text-sm text-justify md:text-lg text-[#1F6251] mb-3 leading-relaxed">
								The finish line is just the beginning. Get ready for our
								celebrate under a shower of colorful powder.
							</p>
							<p className="text-sm text-justify md:text-lg text-[#1F6251] mb-5 leading-relaxed">
								From casuals to professionals, individuals to families, everyone
								is welcome to run and have fun with us. Let’s make colorful
								memories at Ciputra Color Run 2026!
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Link
									href="/registration"
									className="inline-block px-5 py-2 rounded-full bg-white text-[#1F6251] font-semibold text-center shadow hover:shadow-lg transition-all"
								>
									Register Now
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Route Maps Section */}
			<section className="route-maps-section py-16 bg-gradient-to-br from-emerald-50 to-teal-50">
				<div className="max-w-6xl mx-auto px-4 sm:px-6">
					<h2
						className="text-3xl md:text-4xl font-moderniz font-extrabold text-center mb-4 benefit-section-title"
						data-aos="fade-up"
					>
						RACE ROUTES
					</h2>
					<p
						className="text-center text-gray-600 mb-10 max-w-2xl mx-auto"
						data-aos="fade-up"
						data-aos-delay="100"
					>
						Explore the routes for each distance category. Click on any map to view it in full size.
					</p>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
						{routeMaps.map((route, index) => (
							<div
								key={route.distance}
								className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
								data-aos="zoom-in"
								data-aos-delay={index * 100}
							>
								{/* Route Badge */}
								<div className="bg-gradient-to-r from-[#91DCAC] to-[#4EF9CD] px-4 py-3 text-center">
									<h3 className="text-2xl font-bold text-white">
										{route.distance}
									</h3>
								</div>

								{/* Image Container - Clickable */}
								<div
									className="relative aspect-[4/3] bg-gray-100 cursor-pointer group overflow-hidden"
									onClick={() => openRouteModal(route.image, route.title)}
								>
									<Image
										src={route.image}
										alt={route.title}
										fill
										className="object-cover transition-transform duration-300 group-hover:scale-110"
									/>
									{/* Overlay on hover */}
									<div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
										<div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center">
											<svg
												className="w-12 h-12 mb-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
												/>
											</svg>
											<span className="font-semibold text-lg">Click to Expand</span>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					<div className="text-center mt-8">
						<p className="text-sm text-gray-500">
							Maps are for reference only. Actual routes may vary slightly on race day.
						</p>
					</div>
				</div>
			</section>

			{/* Pricing Section: semantic table with minimal styling + small decor assets */}
			<section className="pricing-section max-w-6xl mx-auto px-4 sm:px-6 py-10 relative overflow-y-hidden">
				{/* decorative assets near the table (non-interactive) */}
				<div className="pricing-decor" aria-hidden>
					<img
						src="/assets/asset4.svg"
						className="pricing-decor-large"
						alt=""
					/>
					<img
						src="/assets/asset10.svg"
						className="pricing-decor-small"
						alt=""
					/>
				</div>

				<h3 className="text-3xl md:text-4xl font-moderniz font-extrabold text-center mb-10 benefit-section-title">
						TICKET PRICES
					</h3>

				<div className="pricing-table-wrap ">
					<table
						className="pricing-table"
						role="table"
						aria-label="Ciputra Color Run Ticket Prices"
						data-aos="fade-up"
						data-aos-delay="300"
						data-aos-duration="900"
					>
						<thead>
							<tr className="text-center justify-center items-center">
								<th scope="col" className="col-item">
									Category
								</th>
								<th scope="col" className="col-main">
									Normal Price
								</th>
								<th scope="col" className="col-tier">
									Community 10-29
								</th>
								<th scope="col" className="col-tier">
									Community 30-59
								</th>
								<th scope="col" className="col-tier">
									Community ≥60
								</th>
								<th scope="col" className="col-note">
									Early bird / Bundle
								</th>
							</tr>
						</thead>
						<tbody>
							<tr className="text-center justify-center items-center">
								<td className="col-item" data-label="Kategori">
									10K
								</td>
								<td className="col-main font-mustica" data-label="Harga Dasar">
									Rp 250.000
								</td>
								<td className="col-tier" data-label="Komunitas 10-29">
									Rp 235.000
								</td>
								<td className="col-tier" data-label="Komunitas 30-59">
									Rp 225.000
								</td>
								<td className="col-tier" data-label="Komunitas ≥60">
									Rp 215.000
								</td>
								<td className="col-note" data-label="Promo">
									{categories.find(c => c.name.toLowerCase().includes('10'))?.earlyBirdRemaining && categories.find(c => c.name.toLowerCase().includes('10'))?.earlyBirdRemaining! > 0 ? (
										<>
											Early bird: Rp {Number(categories.find(c => c.name.toLowerCase().includes('10'))?.earlyBirdPrice).toLocaleString("id-ID")}
										</>
									) : (
										<span className="text-red-500 font-semibold">SOLD OUT</span>
									)}
								</td>
							</tr>
							<tr className="text-center justify-center items-center">
								<td className="col-item" data-label="Kategori">
									5K
								</td>
								<td className="col-main font-mustica" data-label="Harga Dasar">
									Rp 200.000
								</td>
								<td className="col-tier" data-label="Komunitas 10-29">
									Rp 190.000
								</td>
								<td className="col-tier" data-label="Komunitas 30-59">
									Rp 180.000
								</td>
								<td className="col-tier" data-label="Komunitas ≥60">
									Rp 170.000
								</td>
								<td className="col-note" data-label="Promo">
									{categories.find(c => c.name.toLowerCase().includes('5'))?.earlyBirdRemaining && categories.find(c => c.name.toLowerCase().includes('5'))?.earlyBirdRemaining! > 0 ? (
										<>
											Early bird: Rp {Number(categories.find(c => c.name.toLowerCase().includes('5'))?.earlyBirdPrice).toLocaleString("id-ID")}
										</>
									) : (
										<span className="text-red-500 font-semibold">SOLD OUT</span>
									)}
								</td>
							</tr>
							<tr className="text-center justify-center items-center">
                                <td className="col-item" data-label="Kategori">
                                    3K
                                </td>
                                <td className="col-main font-mustica" data-label="Harga Dasar">
                                    Rp 150.000
                                </td>
                                <td className="col-tier" data-label="Komunitas 10-29">
                                    Rp 140.000
                                </td>
                                <td className="col-tier" data-label="Komunitas 30-59">
                                    Rp 135.000
                                </td>
                                <td className="col-tier" data-label="Komunitas ≥60">
                                    Rp 135.000
                                </td>
                                <td className="col-note" data-label="Promo">
                                    {(() => {
                                        const three = categories.find(c => c.name.toLowerCase().includes('3'));
                                        const earlyAvailable = Boolean(three?.earlyBirdRemaining && three!.earlyBirdRemaining! > 0);
                                        const bundlePrice = Number(three?.bundlePrice ?? three?.basePrice ?? 0);
                                        return (
                                            <>
                                                {earlyAvailable ? (
                                                    <>
                                                        Early bird: Rp {Number(three?.earlyBirdPrice ?? 0).toLocaleString("id-ID")}
                                                        <br />
                                                    </>
                                                ) : (
                                                    <span className="text-red-500 font-semibold">Early bird: SOLD OUT</span>
                                                )}
                                                <div>
                                                    Bundling family (4 people): Rp 145.000 / person
                                                </div>
                                            </>
                                        );
                                    })()}
                                </td>
                            </tr>
						</tbody>
					</table>
				</div>

				{/* Benefits Section */}
				<div className="benefits-section mt-12" data-aos="fade-up">
					<h3 className="text-3xl md:text-4xl font-moderniz font-extrabold text-center mb-10 benefit-section-title">
						BENEFITS
					</h3>

					<div className="benefits-grid">
						{/* Jersey & Medal Card */}
						<div
							className="benefit-card"
							data-aos="zoom-in"
							data-aos-delay="100"
						>
							<div className="benefit-icon-wrap">
								<img
									src="/images/homepage/medal_2.png"
									alt="Jersey & Medali"
									className="benefit-image"
									
								/>
							</div>
							<h4 className="benefit-title">Jersey & Medal</h4>
							<p className="benefit-description">
								Exclusive race jersey designed for style and comfort, plus a collectible finisher medal to mark your achievement.
							</p>
						</div>

						{/* Fresh Money Card */}
						<div
							className="benefit-card"
							data-aos="zoom-in"
							data-aos-delay="200"
						>
							<div className="benefit-icon-wrap bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10">
								<svg
									className="benefit-svg"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
										fill="url(#gold-gradient)"
										stroke="#FFD700"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<defs>
										<linearGradient
											id="gold-gradient"
											x1="12"
											y1="2"
											x2="12"
											y2="21.02"
											gradientUnits="userSpaceOnUse"
										>
											<stop stopColor="#FFD700" />
											<stop offset="1" stopColor="#FFA500" />
										</linearGradient>
									</defs>
								</svg>
							</div>
							<h4 className="benefit-title">Podium (5K & 10K)</h4>
							<p className="benefit-description">
								Compete for glory! Trophies and exclusive prizes await the top finishers in the 5K and 10K competitive categories
							</p>
						</div>

						{/* Powder Color War Card */}
						<div
							className="benefit-card"
							data-aos="zoom-in"
							data-aos-delay="300"
						>
							<div className="benefit-icon-wrap bg-gradient-to-br from-[#91DCAC]/20 to-[#F581A4]/10">
								<svg
									className="benefit-svg"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<circle cx="12" cy="12" r="3" fill="#91DCAC" />
									<circle cx="8" cy="8" r="2" fill="#F581A4" />
									<circle cx="16" cy="8" r="2" fill="#4EF9CD" />
									<circle cx="8" cy="16" r="2" fill="#FFD700" />
									<circle cx="16" cy="16" r="2" fill="#73E9DD" />
									<path
										d="M12 2C12 2 15 5 15 8C15 10 13.5 12 12 12C10.5 12 9 10 9 8C9 5 12 2 12 2Z"
										fill="#91DCAC"
										opacity="0.6"
									/>
									<path
										d="M2 12C2 12 5 9 8 9C10 9 12 10.5 12 12C12 13.5 10 15 8 15C5 15 2 12 2 12Z"
										fill="#F581A4"
										opacity="0.6"
									/>
								</svg>
							</div>
							<h4 className="benefit-title">Color War</h4>
							<p className="benefit-description">
								Immerse yourself in the euphoria of our signature Color War.
							</p>
						</div>
						
						{/* agar other benefits ditengah */}
						<div className="hidden md:block">
						</div>

						{/* Additional Benefits Card */}
						<div
							className="benefit-card"
							data-aos="zoom-in"
							data-aos-delay="400"
						>
							<div className="benefit-icon-wrap bg-gradient-to-br from-[#4EF9CD]/20 to-[#73E9DD]/10">
								<svg
								 className="benefit-svg"
								 viewBox="0 0 24 24"
								 fill="none"
								 xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M9 11L12 14L22 4"
										stroke="#4EF9CD"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16"
										stroke="#73E9DD"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
							<h4 className="benefit-title">Other Benefits</h4>
							<p className="benefit-description">
								Enjoy full hydration support, entertainment, and a goody bag packed with exciting sponsor perks.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Timeline Section */}
			<section className="timeline-section py-12 md:py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <h2
                        className="text-3xl md:text-4xl font-moderniz font-extrabold text-center mb-8 benefit-section-title"
                        data-aos="fade-up"
                    >
                        TIMELINE
                    </h2>

					{/* Minimal semantic list timeline */}
					<div className="timeline-scroll-wrap" data-aos="fade-up" data-aos-delay="200">
                        <ul className="timeline-list minimal" aria-label="Event timeline">
                            <li className="timeline-item minimal">
                                <div className="timeline-date">1 Dec 2025 — 28 Mar 2026</div>
                                <div className="timeline-title">Open Registration</div>
                            </li>

                            <li className="timeline-item minimal">
                                <div className="timeline-date">9 — 11 Apr 2026</div>
                                <div className="timeline-title">Race Pack Collection</div>
                            </li>

                            <li className="timeline-item minimal">
                                <div className="timeline-date">12 Apr 2026</div>
                                <div className="timeline-title">Race Day</div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

			{/* Claim Racepack & Venue Section */}
			<section className="claim-venue-section py-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6">
					<div className="space-y-8">
						{/* Race Pack Claim card — full-width block */}
						<div className="claim-card" data-aos="fade-up">
							<div className="claim-card-header">
								<h3 className="font-moderniz text-xl text-[#1F6251] mt-1">
									Race Pack Claim
								</h3>
								<span className="badge-small text-[#1F6251]"><strong>Important</strong></span>
							</div>
							<p className="font-mustica text-[#52605f] mt-3">
								Get your gear ready for the big day! You can pick up your Race Pack at:
							</p>
							<ul className="claim-list mt-4 text-[#52605f]">
								<li>
									<strong>Location:</strong> Corepreneur 1st Floor, UC Tower
								</li>
								<li>
									<strong>Dates:</strong> 9 — 11 April 2026
								</li>
								<li>
									<strong>What to Bring:</strong> Valid ID card (KTP/Birth Certificate/Passport) and your registration QR Code.
								</li>
							</ul>
							<br/>
							<strong className="mt-4 text-[#52605f]">
								Representative Collection
							</strong>
							<ul className="claim-list text-[#52605f]">
								<li>
									<strong>Individuals:</strong> If someone is collecting for you, they must bring a power of attorney letter.
								</li>
								<li>
									<strong>Communities:</strong> Your representative must bring the full list of registered participants.
								</li>
							</ul>
						</div>

						{/* Start / Finish card — full-width block */}
						<div className="venue-card" data-aos="fade-up" data-aos-delay="80">
							<div className="venue-card-header">
								<h3 className="font-moderniz text-xl text-[#1F6251]">
									Start and Finish
								</h3>
							</div>
                            <p className="font-mustica text-[#52605f] mt-2">
                            Both Start and Finish gate are located in {" "}
                                <strong>Universitas Ciputra Surabaya</strong>.
                            </p>

							{/* Minimalistic map card — click to open full Google Maps */}
							<div className="venue-map-wrapper mt-4">
								<div className="venue-map-card" role="group" aria-label="Race venue map">
                                    <div className="venue-map-top">
                                        <span className="venue-map-title">Universitas Ciputra Surabaya</span>
                                        <a
                                            href="https://www.google.com/maps?q=Universitas+Ciputra+Surabaya"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="venue-map-link"
                                        >
                                            Open in Google Maps
                                        </a>
                                    </div>
                                    <iframe
                                        src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d494.69981702612677!2d112.6314999987017!3d-7.286434733495391!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sid!4v1764055698752!5m2!1sen!2sid"
                                        width={600}
                                        height={450}
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        className="venue-iframe"
                                        title="Universitas Ciputra Surabaya - Racepack Claim Location"
                                    />
                                </div>
							</div>
							<p className="mt-4 text-sm text-[#52605f]">
								More information on our Instagram <a className = "underline font-bold" href = "https://instagram.com/ciputrarun.uc">@ciputrarun.uc</a>
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Route Image Modal */}
			<RouteImageModal
				isOpen={routeModalOpen}
				onClose={() => setRouteModalOpen(false)}
				imageSrc={selectedRoute.src}
				title={selectedRoute.title}
			/>
		</main>
	);
}
