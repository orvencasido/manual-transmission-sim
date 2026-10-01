import Link from 'next/link';

export default function LessonsPage() {
  const lessons = [
    { id: 1, title: 'Finding the Bite Point', desc: 'Learn clutch modulation and find where friction begins without stalling.' },
    { id: 2, title: 'Smooth 1st Gear Start', desc: 'Coordinate throttle application and smooth clutch release on flat ground.' },
    { id: 3, title: 'Sequential Upshifting', desc: 'Shift smoothly from 1st to 2nd and 3rd gear while matching revs.' },
    { id: 4, title: 'Incline & Hill Starts', desc: 'Master handbrake-to-clutch transition without rolling backward.' },
    { id: 5, title: 'Downshifting & Rev Matching', desc: 'Match engine RPM when changing to lower gears for smooth deceleration.' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Driving Curriculum</h1>
          <p className="text-xs text-slate-400">Structured lessons for manual transmission mastery</p>
        </div>
        <Link
          href="/"
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
        >
          Home
        </Link>
      </header>

      <div className="space-y-3">
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
          >
            <div>
              <span className="text-xs text-emerald-400 font-mono">Lesson {lesson.id}</span>
              <h2 className="text-lg font-semibold text-white">{lesson.title}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{lesson.desc}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-400 font-medium">
              Phase 11
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
