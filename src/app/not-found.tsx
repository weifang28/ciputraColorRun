import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/images/generalBg.png')",
      }}
    >
      <div className="max-w-xl mx-4 p-8 bg-black/60 rounded-2xl backdrop-blur-sm border border-white/10 shadow-xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#91DCAC] to-[#F581A4] mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M11 7h2v6h-2z" fill="#08131A"/>
            <path d="M11 15h2v2h-2z" fill="#08131A"/>
            <circle cx="12" cy="12" r="10" stroke="#08131A" strokeWidth="0"/>
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-sm sm:text-base text-[#E6F7F0] opacity-90 mb-6">
          The page you’re looking for doesn’t exist or has been moved. Try going back to the homepage or the registration page.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2 rounded-full bg-white text-[#1F6251] font-semibold shadow hover:shadow-lg transition"
          >
            Go Home
          </Link>

          <Link
            href="/registration"
            className="px-6 py-2 rounded-full border-2 border-white text-white font-semibold hover:bg-white/10 transition"
          >
            Register
          </Link>
        </div>

        <p className="mt-6 text-xs text-white/60">
          If you think this is an error, contact the organiser.
        </p>
      </div>
    </main>
  );
}