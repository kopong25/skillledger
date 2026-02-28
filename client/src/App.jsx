import { useState, useEffect } from 'react';
import { api } from './utils/api';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';

const SUPERADMIN_EMAIL = 'koppong@zioncompassion.com';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;
  if (user.email !== SUPERADMIN_EMAIL) return <Navigate to="/dashboard" replace />;

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, t, sk] = await Promise.all([
        api.adminStats(),
        api.adminUsers(),
        api.adminTeams(),
        api.adminCandidates(),
      ]);
      setStats(s);
      setUsers(u);
      setTeams(t);
      setCandidates(sk);

      // Get all unique skills
      const skillsRes = await fetch('/api/admin/skills/all', {
        headers: { Authorization: `Bearer ${localStorage.getItem('sl_token')}` }
      });
      const skillsData = await skillsRes.json();
      setAllSkills(skillsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkillFilter(skill) {
    setSelectedSkill(skill);
    setCandidatesLoading(true);
    try {
      const data = await api.adminCandidates(skill);
      setCandidates(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCandidatesLoading(false);
    }
  }

  async function handleDeleteUser(userId, name) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.adminDeleteUser(userId);
      setUsers(u => u.filter(x => x.id !== userId));
    } catch (e) {
      setError(e.message);
    }
  }

  const filteredSkills = allSkills.filter(s =>
    s.skill_name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">SUPERADMIN</span>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          </div>
          <p className="text-slate-500">Full platform overview and user management</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          { key: 'stats', label: 'Stats' },
          { key: 'users', label: `Users (${users.length})` },
          { key: 'candidates', label: `Candidates (${candidates.length})` },
          { key: 'teams', label: `Teams (${teams.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Users', val: stats.total_users, color: 'text-blue-600' },
            { label: 'Total Analyses', val: stats.total_candidates, color: 'text-violet-600' },
            { label: 'Total Teams', val: stats.total_teams, color: 'text-green-600' },
            { label: 'Total Saved', val: stats.total_saved, color: 'text-amber-600' },
            { label: 'New Users (7d)', val: stats.new_users_7d, color: 'text-blue-600' },
            { label: 'New Analyses (7d)', val: stats.new_analyses_7d, color: 'text-violet-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-500 mb-1">{s.label}</p>
              <p className={`text-4xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#', 'Name', 'Email', 'Role', 'Saved', 'Joined', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.is_superadmin
                      ? <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">Superadmin</span>
                      : <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">Recruiter</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.saved_count || 0}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!u.is_superadmin && (
                      <button onClick={() => handleDeleteUser(u.id, u.name)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-slate-400 py-10">No users yet</p>
          )}
        </div>
      )}

      {/* Candidates Tab with Language Filter */}
      {tab === 'candidates' && (
        <div className="flex gap-6">
          {/* Skill sidebar */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-200">
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                <button
                  onClick={() => handleSkillFilter('')}
                  className={`w-full text-left px-4 py-2.5 text-sm flex justify-between items-center hover:bg-slate-50 transition-colors ${
                    !selectedSkill ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  <span>All Skills</span>
                  <span className="text-xs text-slate-400">{candidates.length}</span>
                </button>
                {filteredSkills.map(s => (
                  <button
                    key={s.skill_name}
                    onClick={() => handleSkillFilter(s.skill_name)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex justify-between items-center hover:bg-slate-50 transition-colors ${
                      selectedSkill === s.skill_name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    <span>{s.skill_name}</span>
                    <span className="text-xs text-slate-400">{s.candidate_count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Candidates list */}
          <div className="flex-1">
            {selectedSkill && (
              <div className="mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                  {selectedSkill}
                </span>
                <span className="text-sm text-slate-500">{candidates.length} candidates found</span>
                <button onClick={() => handleSkillFilter('')} className="text-xs text-slate-400 hover:text-slate-600 ml-1">✕ Clear</button>
              </div>
            )}

            {candidatesLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map(c => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      <img
                        src={c.avatar_url || `https://avatars.githubusercontent.com/${c.github_username}`}
                        alt={c.display_name}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link to={`/candidate/${c.github_username}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                              {c.display_name || c.github_username}
                            </Link>
                            <p className="text-xs text-slate-500">@{c.github_username}</p>
                          </div>
                          {c.top_score && (
                            <span className="text-sm font-bold text-blue-600 flex-shrink-0">
                              {selectedSkill ? `${selectedSkill}: ` : ''}{c.top_score}%
                            </span>
                          )}
                        </div>
                        {c.location && (
                          <p className="text-xs text-slate-400 mt-0.5">{c.location}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(c.skills || []).map(s => (
                            <span key={s.skill_name}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                s.skill_name === selectedSkill
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                              {s.skill_name} {s.confidence_score}%
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {candidates.length === 0 && (
                  <div className="text-center text-slate-400 py-16">
                    No candidates found{selectedSkill ? ` with ${selectedSkill}` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teams Tab */}
      {tab === 'teams' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Team', 'Owner', 'Members', 'Candidates', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {t.owner_name}
                    <br />
                    <span className="text-xs text-slate-400">{t.owner_email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.member_count}</td>
                  <td className="px-4 py-3 text-slate-600">{t.candidate_count}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {teams.length === 0 && (
            <p className="text-center text-slate-400 py-10">No teams created yet</p>
          )}
        </div>
      )}
    </div>
  );
}