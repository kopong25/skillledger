import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const SUPERADMIN_EMAIL = 'koppong@zioncompassion.com';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [searching, setSearching] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user || user.email !== SUPERADMIN_EMAIL) return;
    loadAll();
    api.getAllSkills().then(setAllSkills).catch(() => {});
  }, [user]);

  if (!user) return null;
  if (user.email !== SUPERADMIN_EMAIL) return <Navigate to="/dashboard" replace />;

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, t] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.adminTeams(),
      ]);
      setStats(s);
      setUsers(u);
      setTeams(t);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleDeleteUser(userId, name) {
    if (!confirm('Delete user "' + name + '"? This cannot be undone.')) return;
    try {
      await api.deleteAdminUser(userId);
      setUsers(u => u.filter(x => x.id !== userId));
      setSuccess('User deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  }

  async function handleSkillSearch(e) {
    e.preventDefault();
    if (!skillSearch.trim()) return;
    setSearching(true);
    try {
      const data = await api.searchBySkill(skillSearch);
      setSkillResults(data);
    } catch (e) { setError(e.message); }
    finally { setSearching(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">SUPERADMIN</span>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        </div>
        <p className="text-slate-500">Full platform overview and user management</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">x</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {['stats', 'users', 'teams', 'skills'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={'px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ' +
              (tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t === 'skills' ? 'Skill Search' : t}
          </button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Users', val: stats.total_users },
            { label: 'Total Analyses', val: stats.total_candidates },
            { label: 'Total Teams', val: stats.total_teams },
            { label: 'Total Saved', val: stats.total_saved },
            { label: 'New Users (7d)', val: stats.new_users_7d },
            { label: 'New Analyses (7d)', val: stats.new_analyses_7d },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-500 mb-1">{s.label}</p>
              <p className="text-4xl font-bold text-slate-900">{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.is_superadmin
                      ? <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">Superadmin</span>
                      : <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">User</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
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
        </div>
      )}

      {tab === 'teams' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Team</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Members</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Candidates</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 text-slate-500">{t.owner_name}<br />
                    <span className="text-xs text-slate-400">{t.owner_email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.member_count}</td>
                  <td className="px-4 py-3 text-slate-600">{t.candidate_count}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'skills' && (
        <div>
          <form onSubmit={handleSkillSearch} className="flex gap-2 mb-6">
            <input
              type="text"
              value={skillSearch}
              onChange={e => setSkillSearch(e.target.value)}
              placeholder="Search by skill e.g. Python, React, TypeScript..."
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm"
              list="skills-list"
            />
            <datalist id="skills-list">
              {allSkills.map(s => <option key={s.skill_name} value={s.skill_name} />)}
            </datalist>
            <button type="submit" disabled={searching}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {allSkills.length > 0 && skillResults.length === 0 && !searching && (
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-3">Top skills on platform:</p>
              <div className="flex flex-wrap gap-2">
                {allSkills.slice(0, 20).map(s => (
                  <button key={s.skill_name}
                    onClick={() => setSkillSearch(s.skill_name)}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100">
                    {s.skill_name} ({s.candidate_count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {skillResults.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 mb-4">
                {skillResults.length} candidate{skillResults.length !== 1 ? 's' : ''} with <strong>{skillSearch}</strong>
              </p>
              <div className="space-y-3">
                {skillResults.map(c => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <a href={'/candidate/' + c.github_username}
                          className="font-medium text-blue-600 hover:underline">
                          {c.display_name || c.github_username}
                        </a>
                        <p className="text-xs text-slate-400">{'@' + c.github_username}</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{c.top_score}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.skills && c.skills.map(s => (
                        <span key={s.skill_name}
                          className={'text-xs px-2 py-0.5 rounded-full ' +
                            (s.skill_name.toLowerCase() === skillSearch.toLowerCase()
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600')}>
                          {s.skill_name} {s.confidence_score}%
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}