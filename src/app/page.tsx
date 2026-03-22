import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-hero-pattern flex flex-col relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l10-9 10 9M4 10v10a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1V10" />
            </svg>
          </div>
          <span className="text-white text-xl font-bold tracking-tight">Howlader Estate</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center -mt-16">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-blue-200 text-xs font-semibold px-4 py-1.5 rounded-full border border-white/10 mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Managed by Moslah Howlader & Mahmudul Rapi
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.1]">
            Welcome, tenant.
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-brand-300 to-indigo-300 bg-clip-text text-transparent">
              Everything in one place.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            If you are a tenant of Moslah Howlader or Mahmudul Rapi, use the
            Tenant Portal to view your rent history and documents. Landlords
            can sign in to the dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tenant-portal"
              className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              Tenant Portal
            </Link>
            <Link
              href="/login"
              className="bg-white/10 hover:bg-white/15 backdrop-blur-sm text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all border border-white/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              Landlord Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-slate-600 text-xs">
        Howlader Family
      </footer>
    </div>
  );
}
