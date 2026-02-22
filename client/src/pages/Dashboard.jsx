import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import SkillCard, { SkillCardSkeleton } from '../components/SkillCard';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSaved(false);
    try {
      const data = await api.analyze(username.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await api.saveCandidate({ candidate_id: result.candidate.id });
      setSaved(true);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const topSkill = result?.skills?.[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">Analyze any GitHub profile and get instant skill confidence scores.</p>
      </div>

      {/* Analyzer */}
      <div className="card mb-8">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Analyze a GitHub Profile
        </h2>
        <form onSubmit={handleAnalyze} className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="github-username"
              className="input pl-8"
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading || !username.trim()} className="btn-primary whitespace-nowrap">
            {loading ? 'Analyzing...' : 'Analyze →'}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div>
          <div className="flex items-center gap-4 mb-6 card">
            <div className="shimmer w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="shimmer h-5 w-40 rounded" />
              <div className="shimmer h-4 w-64 rounded" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <SkillCardSkeleton key={i} />)}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div>
          {/* Candidate profile header */}
          <div className="card mb-6">
            <div className="flex items-start gap-5">
              <img
                src={result.candidate.avatar_url}
                alt={result.candidate.display_name}
                className="w-16 h-16 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{result.candidate.display_name}</h2>
                    <a
                      href={result.candidate.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-blue-600 text-sm"
                    >
                      @{result.candidate.github_username} ↗
                    </a>
                    {result.candidate.bio && (
                      <p className="text-sm text-slate-600 mt-1">{result.candidate.bio}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/candidate/${result.candidate.github_username}`)}
                      className="btn-secondary text-sm py-2"
                    >
                      Full profile
                    </button>
                    {!saved ? (
                      <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2">
                        {saving ? 'Saving...' : '+ Save candidate'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium px-4 py-2 bg-green-50 rounded-xl">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                  {result.candidate.location && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {result.candidate.location}
                    </span>
                  )}
                  <span>{result.candidate.public_repos} public repos</span>
                  <span>{result.candidate.followers} followers</span>
                  {result.cached && <span className="text-blue-500">⚡ Cached result</span>}
                </div>
              </div>
            </div>

            {/* Summary banner */}
            {topSkill && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800">
                  <span className="font-semibold">Top signal:</span>{' '}
                  <span className="font-bold">{topSkill.confidence_score}% confidence in {topSkill.skill_name}</span>
                  {topSkill.commit_count > 0 && ` from ${topSkill.commit_count}+ commits in the last year`}
                  {topSkill.repo_count > 0 && ` across ${topSkill.repo_count} repos`}.
                </div>
              </div>
            )}
          </div>

          {/* Skills grid */}
          <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
            {result.skills.length} Skills Detected
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {result.skills.map((skill, i) => (
              <SkillCard key={skill.skill_name} skill={skill} index={i} />
            ))}
          </div>

          {result.skills.length === 0 && (
            <div className="card text-center text-slate-500 py-12">
              <p className="text-lg mb-1">No public code found</p>
              <p className="text-sm">This user may have only private repositories or no code contributions yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="card text-center py-16 text-slate-400">
          <svg className="w-14 h-14 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <p className="text-base font-medium">Enter a GitHub username above to analyze a candidate</p>
          <p className="text-sm mt-1">We'll analyze their commits, repos, and activity to generate confidence scores</p>
        </div>
      )}
    </div>
  );
}
