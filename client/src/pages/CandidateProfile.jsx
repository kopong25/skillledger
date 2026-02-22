import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import SkillCard from '../components/SkillCard';

const CATEGORY_ORDER = ['language', 'framework', 'markup', 'scripting'];

export default function CandidateProfile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getCandidate(username)
      .then(d => {
        setData(d);
        setSaved(!!d.saved);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveCandidate({ candidate_id: data.candidate.id });
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="card mb-6">
          <div className="flex gap-5">
            <div className="shimmer w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="shimmer h-6 w-48 rounded" />
              <div className="shimmer h-4 w-32 rounded" />
              <div className="shimmer h-4 w-64 rounded" />
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card space-y-3">
              <div className="shimmer h-5 w-32 rounded" />
              <div className="shimmer h-2 rounded-full" />
              <div className="shimmer h-4 w-48 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-lg text-red-600 mb-4">{error}</p>
        <Link to="/dashboard" className="btn-primary">← Back to dashboard</Link>
      </div>
    );
  }

  if (!data) return null;

  const { candidate, skills } = data;

  // Group skills by category
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catSkills = skills.filter(s => s.category === cat);
    if (catSkills.length > 0) acc[cat] = catSkills;
    return acc;
  }, {});

  const avgConfidence = skills.length > 0
    ? Math.round(skills.slice(0, 5).reduce((s, sk) => s + sk.confidence_score, 0) / Math.min(5, skills.length))
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      {/* Profile header card */}
      <div className="card mb-8">
        <div className="flex items-start gap-6">
          <img src={candidate.avatar_url} alt={candidate.display_name} className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{candidate.display_name}</h1>
                <a href={candidate.github_url} target="_blank" rel="noopener noreferrer"
                   className="text-slate-500 hover:text-blue-600 text-sm transition-colors">
                  @{candidate.github_username} ↗
                </a>
                {candidate.bio && <p className="text-slate-600 mt-1 text-sm">{candidate.bio}</p>}
              </div>
              {!saved ? (
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2 flex-shrink-0">
                  {saving ? 'Saving...' : '+ Save candidate'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium px-4 py-2 bg-green-50 rounded-xl flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved to list
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
              {[
                { label: 'Skills Detected', value: skills.length },
                { label: 'Avg Confidence (top 5)', value: `${avgConfidence}%` },
                { label: 'Public Repos', value: candidate.public_repos },
                { label: 'Followers', value: candidate.followers },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Skills by category */}
      {Object.entries(grouped).map(([category, catSkills]) => (
        <div key={category} className="mb-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            {category}s
            <div className="h-px flex-1 bg-slate-200" />
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {catSkills.map((skill, i) => (
              <SkillCard key={skill.skill_name} skill={skill} index={i} />
            ))}
          </div>
        </div>
      ))}

      {skills.length === 0 && (
        <div className="card text-center py-16 text-slate-400">
          <p>No public code skills detected for this user.</p>
        </div>
      )}
    </div>
  );
}
