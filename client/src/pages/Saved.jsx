import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import CandidateCard from '../components/CandidateCard';

const STATUS_FILTERS = ['All', 'reviewing', 'shortlisted', 'hired', 'rejected'];

export default function Saved() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getSaved()
      .then(setCandidates)
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(candidateId) {
    if (!confirm('Remove this candidate from your saved list?')) return;
    await api.removeSaved(candidateId);
    setCandidates(c => c.filter(x => x.id !== candidateId));
  }

  async function handleStatusChange(candidateId, status) {
    await api.updateSaved(candidateId, { status, notes: '' });
    setCandidates(c => c.map(x => x.id === candidateId ? { ...x, status } : x));
  }

  const filtered = candidates
    .filter(c => filter === 'All' || c.status === filter)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.display_name || '').toLowerCase().includes(q) ||
             c.github_username.toLowerCase().includes(q) ||
             (c.skills || []).some(s => s.skill_name.toLowerCase().includes(q));
    });

  const counts = STATUS_FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = candidates.filter(c => c.status === s).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="shimmer h-8 w-48 rounded mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card">
              <div className="flex gap-4">
                <div className="shimmer w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-5 w-40 rounded" />
                  <div className="shimmer h-4 w-60 rounded" />
                  <div className="shimmer h-4 w-80 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Saved Candidates</h1>
        <p className="text-slate-500 mt-1">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} in your list</p>
      </div>

      {candidates.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <svg className="w-14 h-14 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-base font-medium">No saved candidates yet</p>
          <p className="text-sm mt-1">Analyze a GitHub profile from the dashboard and click "Save candidate"</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, username, or skill..."
              className="input flex-1"
            />
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`text-sm px-3 py-2 rounded-xl font-medium transition-colors ${
                    filter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s}{s !== 'All' && counts[s] > 0 ? ` (${counts[s]})` : ''}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card text-center py-10 text-slate-400">
              No candidates match your filter
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(c => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  onRemove={handleRemove}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
