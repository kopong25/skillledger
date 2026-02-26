import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'GitHub Intelligence',
    desc: 'Automatically scans commit history, repositories, and activity to surface real technical skills — not just what candidates claim.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Confidence Scoring',
    desc: 'Each skill gets a confidence percentage based on recency, depth, and frequency — giving you a clear signal, not noise.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Team Collaboration',
    desc: 'Share candidate profiles across your hiring team. Track pipeline status from reviewing to hired — all in one place.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'PDF Reports',
    desc: 'Export polished team reports with full candidate profiles and skill breakdowns — ready for stakeholder reviews.',
  },
];

const STEPS = [
  { num: '01', title: 'Enter a GitHub username', desc: 'Paste any public GitHub profile into the analyzer.' },
  { num: '02', title: 'Get instant skill scores', desc: 'SkillsLedger analyzes their repos and commits in seconds.' },
  { num: '03', title: 'Save, share, and decide', desc: 'Build your pipeline and collaborate with your team.' },
];

const SKILLS_DEMO = [
  { name: 'Python', score: 94, color: '#3b82f6' },
  { name: 'React', score: 87, color: '#6366f1' },
  { name: 'TypeScript', score: 81, color: '#0ea5e9' },
  { name: 'Docker', score: 73, color: '#8b5cf6' },
  { name: 'PostgreSQL', score: 68, color: '#06b6d4' },
];

function AnimatedBar({ score, color, delay }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 300 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function Landing() {
  const heroRef = useRef(null);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: '#0a0f1e', color: '#e2e8f0', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap');

        .hero-glow {
          background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 70%);
        }
        .card-glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
        }
        .card-glass:hover {
          background: rgba(255,255,255,0.055);
          border-color: rgba(59,130,246,0.25);
          transition: all 0.3s ease;
        }
        .btn-primary-land {
          background: #2563eb;
          color: white;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 15px;
          transition: background 0.2s, transform 0.15s;
          display: inline-block;
          text-decoration: none;
        }
        .btn-primary-land:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .btn-ghost-land {
          color: #94a3b8;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 15px;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
          display: inline-block;
          text-decoration: none;
        }
        .btn-ghost-land:hover {
          color: #e2e8f0;
          border-color: rgba(255,255,255,0.2);
        }
        .step-line::after {
          content: '';
          position: absolute;
          top: 20px;
          left: calc(100% + 12px);
          width: calc(100% - 24px);
          height: 1px;
          background: linear-gradient(90deg, rgba(59,130,246,0.4), transparent);
        }
        .badge {
          background: rgba(59,130,246,0.12);
          border: 1px solid rgba(59,130,246,0.25);
          color: #93c5fd;
          padding: 4px 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          display: inline-block;
        }
        .serif { font-family: 'Instrument Serif', Georgia, serif; }
        .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0; }
        .noise-bg {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* HERO */}
      <section className="hero-glow noise-bg relative overflow-hidden" style={{ padding: '100px 24px 120px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div className="badge" style={{ marginBottom: 28 }}>Free during beta — no credit card required</div>

          <h1 className="serif" style={{ fontSize: 'clamp(42px, 7vw, 76px)', lineHeight: 1.1, color: '#f1f5f9', marginBottom: 24, fontWeight: 400 }}>
            Hire engineers based on<br />
            <em style={{ color: '#60a5fa' }}>what they've actually built</em>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px', fontWeight: 300 }}>
            SkillsLedger analyzes GitHub profiles and returns verified skill confidence scores — so you can make faster, smarter hiring decisions.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary-land">Start for free →</Link>
            <Link to="/login" className="btn-ghost-land">Sign in</Link>
          </div>

          {/* Demo card */}
          <div className="card-glass" style={{ maxWidth: 480, margin: '64px auto 0', borderRadius: 16, padding: '28px 32px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <img src="https://avatars.githubusercontent.com/google" alt="google" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>google</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>2837 repos · active</div>
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: 11, padding: '3px 10px', borderRadius: 100, fontWeight: 500 }}>Analyzed</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SKILLS_DEMO.map((s, i) => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: 13, color: s.color, fontWeight: 600 }}>{s.score}%</span>
                  </div>
                  <AnimatedBar score={s.score} color={s.color} delay={i * 120} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* LOGOS / SOCIAL PROOF */}
      <section style={{ padding: '36px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 20 }}>Trusted by hiring teams at</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap', opacity: 0.4 }}>
          {['Acme Corp', 'BuildStack', 'NovaTech', 'Relay HQ', 'Forma'].map(name => (
            <span key={name} style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>{name}</span>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* HOW IT WORKS */}
      <section style={{ padding: '100px 24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="badge" style={{ marginBottom: 16 }}>How it works</div>
          <h2 className="serif" style={{ fontSize: 'clamp(30px, 4vw, 46px)', color: '#f1f5f9', fontWeight: 400 }}>From profile to decision in minutes</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
          {STEPS.map((step, i) => (
            <div key={step.num} className="card-glass" style={{ borderRadius: 14, padding: '32px 28px', position: 'relative' }}>
              <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>{step.num}</div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* FEATURES */}
      <section style={{ padding: '100px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="badge" style={{ marginBottom: 16 }}>Features</div>
          <h2 className="serif" style={{ fontSize: 'clamp(30px, 4vw, 46px)', color: '#f1f5f9', fontWeight: 400 }}>Everything your hiring team needs</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card-glass" style={{ borderRadius: 14, padding: '32px 28px' }}>
              <div style={{ width: 44, height: 44, background: 'rgba(59,130,246,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: 20 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* STATS */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
          {[
            { val: '< 30s', label: 'Analysis time per profile' },
            { val: '15+', label: 'Skills detected automatically' },
            { val: '100%', label: 'Based on real code evidence' },
            { val: 'Free', label: 'During beta, always' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '40px 32px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="serif" style={{ fontSize: 40, color: '#60a5fa', fontWeight: 400, lineHeight: 1 }}>{stat.val}</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 10, lineHeight: 1.4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* CTA */}
      <section style={{ padding: '120px 24px', textAlign: 'center' }}>
        <div className="badge" style={{ marginBottom: 24 }}>Get started today</div>
        <h2 className="serif" style={{ fontSize: 'clamp(32px, 5vw, 58px)', color: '#f1f5f9', fontWeight: 400, marginBottom: 20 }}>
          Stop guessing.<br /><em style={{ color: '#60a5fa' }}>Start knowing.</em>
        </h2>
        <p style={{ fontSize: 16, color: '#64748b', marginBottom: 40, maxWidth: 440, margin: '0 auto 40px' }}>
          Create your free account and analyze your first candidate in under a minute.
        </p>
        <Link to="/register" className="btn-primary-land" style={{ fontSize: 16, padding: '14px 36px' }}>
          Create free account →
        </Link>
      </section>

      {/* FOOTER */}
      <hr className="divider" />
      <footer style={{ padding: '40px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1000, margin: '0 auto', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#2563eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 15 }}>SkillsLedger</span>
        </div>
        <p style={{ fontSize: 13, color: '#334155' }}>© {new Date().getFullYear()} SkillsLedger. Free during beta.</p>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/login" style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}>Sign in</Link>
          <Link to="/register" style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}>Register</Link>
        </div>
      </footer>
    </div>
  );
}
