export function FloatingElements() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating orbs - turquoise to green gradient dominant with colorful accents */}
      <div className="absolute top-20 left-10 w-24 h-24 rounded-full bg-gradient-to-br from-[#73E9DD]/40 to-[#4EF9CD]/35 blur-2xl animate-float"></div>
      <div className="absolute top-40 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-[#4EF9CD]/45 to-[#94DCAD]/40 blur-2xl animate-float-delayed"></div>
      <div className="absolute bottom-40 left-1/4 w-28 h-28 rounded-full bg-gradient-to-br from-[#94DCAD]/45 to-[#73E9DD]/35 blur-2xl animate-float-slow"></div>
      <div className="absolute top-1/3 right-1/3 w-40 h-40 rounded-full bg-gradient-to-br from-[#4EF9CD]/35 to-[#73E9DD]/30 blur-3xl animate-float"></div>
      <div className="absolute bottom-24 right-16 w-28 h-28 rounded-full bg-gradient-to-br from-[#73E9DD]/40 to-[#4EF9CD]/35 blur-2xl animate-float-delayed"></div>
      <div className="absolute top-1/2 left-10 w-36 h-36 rounded-full bg-gradient-to-br from-[#94DCAD]/30 to-[#4EF9CD]/25 blur-3xl animate-float-slow"></div>
      
      {/* Medium accent orbs - turquoise/green */}
      <div className="absolute top-60 left-1/3 w-20 h-20 rounded-full bg-[#73E9DD]/35 blur-xl animate-float"></div>
      <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full bg-[#4EF9CD]/30 blur-xl animate-float-delayed"></div>
      <div className="absolute top-1/4 right-1/2 w-22 h-22 rounded-full bg-[#94DCAD]/30 blur-xl animate-float-slow"></div>
      
      {/* Green accent orbs - distributed throughout */}
      <div className="absolute bottom-1/2 left-1/2 w-20 h-20 rounded-full bg-[#91DCAC]/25 blur-xl animate-float-delayed"></div>
      <div className="absolute top-3/4 right-1/3 w-18 h-18 rounded-full bg-[#91DCAC]/20 blur-xl animate-float"></div>
      <div className="absolute top-1/4 left-1/4 w-16 h-16 rounded-full bg-[#91DCAC]/20 blur-xl animate-float-slow"></div>
      
      {/* Cream/peach accent orbs */}
      <div className="absolute bottom-1/4 right-1/2 w-24 h-24 rounded-full bg-[#FFF1C5]/25 blur-2xl animate-float"></div>
      <div className="absolute top-2/3 left-1/3 w-20 h-20 rounded-full bg-[#FFDFC0]/25 blur-xl animate-float-delayed"></div>
      
      {/* Wave elements at bottom - prominent gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-64 opacity-35">
        <svg className="w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M0,50 C300,100 500,0 800,50 C1000,80 1100,40 1200,60 L1200,120 L0,120 Z"
            fill="url(#wave-gradient-cirun)"
          />
          <path
            d="M0,70 C250,40 450,90 750,60 C950,40 1100,70 1200,50 L1200,120 L0,120 Z"
            fill="url(#wave-gradient-cirun-2)"
            opacity="0.7"
          />
          <defs>
            <linearGradient id="wave-gradient-cirun" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4EF9CD" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#73E9DD" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#94DCAD" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="wave-gradient-cirun-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#91DCAC" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#91DCAC" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#91DCAC" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle, #682950 1px, transparent 1px)`,
        backgroundSize: '30px 30px'
      }}></div>
    </div>
  );
}