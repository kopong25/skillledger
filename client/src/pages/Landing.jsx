import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Confidence Scores from Real Commits',
    desc: 'Our engine analyzes actual production commits, pull requests, and code reviews — not test scores.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Results in Seconds',
    desc: 'Enter any GitHub username and get a full skill profile in under 30 seconds. No candidate action required.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Tamper-Proof Verification',
    desc: 'All scores trace back to immutable GitHub data. No self-reported claims, no inflated profiles.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Built for Global Hiring',
    desc: 'Evaluate candidates across time zones with consistent, objective signals — regardless of local market reputation.',
  },
];

const STATS = [
  { value: '30–50%', label: 'Faster first-screen' },
  { value: '200+', label: 'Data points per candidate' },
  { value: '0', label: 'Minutes of manual repo review' },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-violet-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            GitHub truth serum for tech hiring
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Stop guessing.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              Start scoring.
            </span>
          </h1>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            SkillLedger turns any GitHub profile into a tamper-proof skill graph with confidence scores
            from real commits — in seconds, not hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-base px-8 py-3">
              Start for free →
            </Link>
            <Link to="/login" className="text-slate-300 hover:text-white font-medium transition-colors">
              Log in to dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-sm text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample output preview */}
      <section className="bg-slate-100 border-y border-slate-200 py-12">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-center text-sm text-slate-500 font-medium mb-6 uppercase tracking-wider">Sample Skill Profile Output</p>
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
            {[
              { name: 'React', score: 87, cat: 'framework', commits: 214, repos: 8 },
              { name: 'TypeScript', score: 79, cat: 'language', commits: 189, repos: 11 },
              { name: 'Python', score: 61, cat: 'language', commits: 93, repos: 5 },
              { name: 'Node.js', score: 54, cat: 'framework', commits: 72, repos: 6 },
            ].map((skill, i) => (
              <div key={skill.name}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{skill.cat}</span>
                    <span className="font-semibold text-slate-800">{skill.name}</span>
                    <span className="text-xs text-slate-400">{skill.commits} commits · {skill.repos} repos</span>
                  </div>
                  <span className="font-bold text-slate-900">{skill.score}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 confidence-bar"
                    style={{ '--target-width': `${skill.score}%`, animationDelay: `${i * 100}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">Built for the skills-first hiring era</h2>
        <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">
          70%+ of tech roles now prioritize verified coding data over degrees. SkillLedger automates what recruiters do manually today.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="card">
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to end the résumé guessing game?</h2>
          <p className="text-blue-200 mb-8">Start with 50 free candidate scans per month. No credit card required.</p>
          <Link to="/register" className="inline-block bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
            Create free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-sm py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-white font-semibold">SkillLedger</span>
          </div>
          <span>© {new Date().getFullYear()} SkillLedger. Built for global tech hiring.</span>
        </div>
      </footer>
    </div>
  );
}
