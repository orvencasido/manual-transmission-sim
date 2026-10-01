import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Browser Training Simulator
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Manual Driving Trainer
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">
            Master the clutch, throttle balance, bite point, and gear selection in a realistic 2D longitudinal vehicle simulator.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            href="/simulator"
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="text-emerald-400 font-semibold text-lg group-hover:translate-x-1 transition-transform">
              Free Drive →
            </div>
            <div className="text-slate-400 text-sm mt-1">
              Practice clutch modulation, shifting, and hill starts freely.
            </div>
          </Link>

          <Link
            href="/lessons"
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="text-cyan-400 font-semibold text-lg group-hover:translate-x-1 transition-transform">
              Lessons →
            </div>
            <div className="text-slate-400 text-sm mt-1">
              Step-by-step curriculum from bite point basics to rev matching.
            </div>
          </Link>

          <Link
            href="/progress"
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="text-indigo-400 font-semibold text-lg group-hover:translate-x-1 transition-transform">
              Progress →
            </div>
            <div className="text-slate-400 text-sm mt-1">
              Review driving session stats, stall counts, and achievements.
            </div>
          </Link>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-wrap justify-center gap-6 text-xs text-slate-500">
          <span>Decoupled 120Hz Physics</span>
          <span>•</span>
          <span>Timed Continuous Ramping</span>
          <span>•</span>
          <span>Bite Point Feedback</span>
          <span>•</span>
          <span>Web Audio Engine</span>
        </div>
      </div>
    </main>
  );
}
