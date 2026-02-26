import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import CandidateCard from '../components/CandidateCard';

const STATUS_FILTERS = ['All', 'reviewing', 'shortlisted', 'hired', 'rejected'];

export default function Saved() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState([]);
  const [shareModal, setShareModal] = useState(null); // candidate being shared
  const [shareTeamId, setShareTeamId] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');

  useEffect(() => {
    api.getSaved().then(setCandidates).finally(() => setLoading(false));
    api.getMyTeams().then(setTeams).catch(() => {});
  }, []);

  async function handleRemove(candidateId) {
    if (!confirm('Remove this candidate from your saved list?')) return;
    await api.removeSaved(candidateId);
    setCandidates(c => c.filter(x => x.id !== candidateId));
  }

  async function handleStatusChange(candidateId, status) {
    const candidate = candidates.find(x => x.id === candidateId);
    await api.updateSaved(candidateId, { status, notes: candidate?.notes || '' });
    setCandidates(c => c.map(x => x.id === candidateId ? { ...x, status } : x));
  }

  async function handleShareToTeam() {
    if (!shareTeamId || !shareModal) return;
    try {
      await api.teamSaveCandidate(parseInt(shareTeamId), {
        candidate_id: shareModal.id,
        notes: shareModal.notes || '',
        status: shareModal.status || 'reviewing',
      });
      setShareSuccess(`${shareModal.display_name || shareModal.github_username} shared with team!`);
      setTimeout(() => {
        setShareModal(null);
        setShareSuccess('');
        setShareTeamId('');
      }, 2000);
    } catch (e) {
      alert(e.message);
    }
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
      {/* Share to Team Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Share to Team</h2>
            <p className="text-sm text-slate-500 mb-4">
              Share <span className="font-medium">{shareModal.display_name || shareModal.github_username}</span> with a team
            </p>
            {shareSuccess ? (
              <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-sm">
                {shareSuccess}
              </div>
            ) : (
              <>
                {teams.length === 0 ? (
                  <p className="text-sm text-slate-500">You have no teams yet. Create one in the Team tab first.</p>
                ) : (
                  <select
                    value={shareTeamId}
                    onChange={e => setShareTeamId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
                  >
                    <option value="">Select a team...</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => { setShareModal(null); setShareTeamId(''); }}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShareToTeam}
                    disabled={!shareTeamId}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Share
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                <div key={c.id} className="relative">
                  <CandidateCard
                    candidate={c}
                    onRemove={handleRemove}
                    onStatusChange={handleStatusChange}
                  />
                  {teams.length > 0 && (
                    <button
                      onClick={() => setShareModal(c)}
                      className="absolute top-4 right-4 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Share to Team
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}