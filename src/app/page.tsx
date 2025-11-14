import Image from "next/image";
import Link from "next/link";
import "./styles/homepage.css";
import LogoLoop from './components/LogoLoop'

export default function Home() {

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
      
      <section className="relative w-full bg-gradient-to-r from-[#1F6251] to-[#9C686A] py-16 px-10">
        <div className="grid grid-cols-3 gap-8 mb-12 max-w-6xl mx-auto">
          <div 
            className="bg-gray-200 rounded-md flex items-center justify-center text-center p-6"
            data-aos="fade-right"
            data-aos-duration="1000"
            data-aos-delay="100"
          >
            <h3 className="font-bold text-xl text-black">
              Documentation from last Cirun
            </h3>
          </div>

          <div 
            className="bg-gray-200 rounded-md flex items-center justify-center p-6"
            data-aos="zoom-in"
            data-aos-duration="1000"
            data-aos-delay="300"
          >
            <img
              src="/Images/logo.png"
              alt="Running Logo"
              className="w-32 h-32 object-contain"
            />
          </div>

          <div 
            className="bg-gray-200 rounded-md flex items-center justify-center text-center p-6"
            data-aos="fade-left"
            data-aos-duration="1000"
            data-aos-delay="100"
          >
            <h3 className="font-bold text-xl text-black">Documentation</h3>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-6 max-w-6xl mx-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-md aspect-square"
              data-aos="flip-left"
              data-aos-duration="800"
              data-aos-delay={i * 100}
            ></div>
          ))}
        </div>
      </section>
      
      {/* About Section - Two Column Layout with Curvy Separator */}
      <section className="w-full relative overflow-hidden">
        <div className="max-w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-stretch relative min-h-[600px]">
            {/* Left: Image area - z-index 1 */}
            <div 
              className="relative w-full h-full min-h-[400px] md:min-h-[600px] z-[1]"
              data-aos="fade-right"
              data-aos-duration="1200"
            >
              <div className="absolute inset-0">
                <Image
                  src="/Homepage/home_background.svg"
                  alt="About Ciputra Color Run"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                  priority
                />
              </div>
              {/* Overlay to clip the image at the separator curve */}
              <div className="hidden md:block absolute right-0 top-0 bottom-0 w-32 z-[2]">
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 600"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <mask id="image-mask">
                      <rect x="0" y="0" width="100" height="600" fill="white" />
                      <path
                        d="M 50,0 
                           Q 30,100 50,200
                           Q 70,300 50,400
                           Q 30,500 50,600
                           L 100,600
                           L 100,0
                           Z"
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect x="0" y="0" width="100" height="600" fill="transparent" mask="url(#image-mask)" />
                </svg>
              </div>
            </div>

            {/* Curvy Separator - z-index 3 (on top of both) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-32 -ml-16 z-[3]">
              <svg
                className="absolute inset-0 w-full h-full drop-shadow-xl"
                viewBox="0 0 100 600"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="separator-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1F6251" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#9C686A" stopOpacity="1" />
                  </linearGradient>
                </defs>
                {/* Curvy separator path with shadow */}
                <path
                  d="M 50,0 
                     Q 30,100 50,200
                     Q 70,300 50,400
                     Q 30,500 50,600
                     L 100,600
                     L 100,0
                     Z"
                  fill="url(#separator-gradient)"
                />
                {/* Stroke line for definition */}
                <path
                  d="M 50,0 
                     Q 30,100 50,200
                     Q 70,300 50,400
                     Q 30,500 50,600"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Right: Text content with gradient background - z-index 2 */}
            <div 
              className="relative bg-gradient-to-r from-[#1F6251] to-[#9C686A] p-8 md:p-12 md:pl-20 flex flex-col justify-center z-[2]"
              data-aos="fade-left"
              data-aos-duration="1200"
            >
              <h2 
                className="text-3xl md:text-4xl font-bold mb-6 text-white"
                data-aos="fade-up"
                data-aos-delay="200"
              >
                About Ciputra Color Run
              </h2>
              <p 
                className="text-lg text-white/90 mb-4 leading-relaxed"
                data-aos="fade-up"
                data-aos-delay="400"
              >
                Ciputra Color Run is an annual community fun-run event that brings families,
                friends, and organizations together to celebrate health, unity, and color.
              </p>
              <p 
                className="text-base text-white/80 mb-6 leading-relaxed"
                data-aos="fade-up"
                data-aos-delay="600"
              >
                Join us for various race categories designed for all skill levels and ages.
                We offer individual and community registrations. Communities can register multiple
                categories under one registration and claim race packs using generated QR codes.
              </p>
              <div 
                className="flex flex-col sm:flex-row gap-4"
                data-aos="fade-up"
                data-aos-delay="800"
              >
                <Link
                  href="/registration"
                  className="inline-block px-6 py-3 rounded-full bg-white text-[#1F6251] font-semibold text-center shadow hover:shadow-lg transition-all hover:scale-105"
                >
                  Register Now
                </Link>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 rounded-full border-2 border-white text-white font-semibold text-center hover:bg-white/10 transition-all"
                >
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
