import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  if (!user?.is_superadmin) return <Navigate to="/dashboard" replace />;

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, t] = await Promise.all([
        api.adminStats(),
        api.adminUsers(),
        api.adminTeams(),
      ]);
      setStats(s);
      setUsers(u);
      setTeams(t);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleDeleteUser(userId, name) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.adminDeleteUser(userId);
      setUsers(u => u.filter(x => x.id !== userId));
    } catch (e) { setError(e.message); }
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
          <button onClick={() => setError('')} className="float-right font-bold">×</button>
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {['stats', 'users', 'teams'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t}
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