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
          />

          <h1 className="home_title">CIPUTRA COLOR RUN</h1>

          <Link href="/registration" className="home_register_button">
            REGISTER NOW
          </Link>

          <p className="home_description">
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Cupiditate quis aperiam voluptatem perferendis eos distinctio voluptatum exercitationem enim, error dolores iure magnam explicabo vel consectetur ullam excepturi recusandae alias tenetur!
          </p>

        </div>
      </div>

      <div className="sponsor-container">

        <h1 className="sponsor-title">MAIN SPONSOR</h1>

        <div className="partner-loop-with-borders">
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
          <div className="bg-gray-200 rounded-md flex items-center justify-center text-center p-6">
            <h3 className="font-bold text-xl text-black">
              Documentation from last Cirun
            </h3>
          </div>

          <div className="bg-gray-200 rounded-md flex items-center justify-center p-6">
            <img
              src="/Images/logo.png"
              alt="Running Logo"
              className="w-32 h-32 object-contain"
            />
          </div>

          <div className="bg-gray-200 rounded-md flex items-center justify-center text-center p-6">
            <h3 className="font-bold text-xl text-black">Documentation</h3>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-6 max-w-6xl mx-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-md aspect-square"
            ></div>
          ))}
        </div>
      </section>
            <section className="w-full bg-gray-200 py-24 flex justify-center items-center">
        <p className="text-gray-700 text-2xl font-semibold">About Ciputra Run</p>
      </section>
    </main>
  );
}
