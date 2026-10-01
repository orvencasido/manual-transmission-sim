import Link from 'next/link';

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Driving Statistics & Progress</h1>
          <p className="text-xs text-slate-400">Driver telemetry and session history via Supabase</p>
        </div>
        <Link
          href="/"
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
        >
          Home
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total Stalls</div>
          <div className="text-3xl font-bold font-mono text-red-400 mt-2">0</div>
          <div className="text-xs text-slate-500 mt-1">Stall count tracking</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Smooth Starts</div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-2">0</div>
          <div className="text-xs text-slate-500 mt-1">Successful bite engagement</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Time Driven</div>
          <div className="text-3xl font-bold font-mono text-cyan-400 mt-2">0m</div>
          <div className="text-xs text-slate-500 mt-1">Cumulative session time</div>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-400">
        Supabase persistence and session sync will be connected in Phase 10.
      </div>
    </div>
  );
}
