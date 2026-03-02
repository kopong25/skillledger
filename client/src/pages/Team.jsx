import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function Team() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamCandidates, setTeamCandidates] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const statusColors = {
    reviewing: 'bg-yellow-100 text-yellow-800',
    shortlisted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  useEffect(() => { loadTeams(); }, []);
  useEffect(() => {
    if (selectedTeam) {
      loadTeamCandidates(selectedTeam.id);
      setSelectedIds([]);
    }
  }, [selectedTeam]);

  async function loadTeams() {
    try {
      const data = await api.getMyTeams();
      setTeams(data);
      if (data.length > 0) setSelectedTeam(data[0]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadTeamCandidates(teamId) {
    try {
      const data = await api.getTeamSaved(teamId);
      setTeamCandidates(data);
    } catch (e) { setError(e.message); }
  }

  async function createTeam() {
    if (!newTeamName.trim()) return;
    try {
      await api.createTeam({ name: newTeamName });
      setNewTeamName('');
      setSuccess('Team created!');
      loadTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  }

  async function addMember() {
    if (!newMemberEmail.trim() || !selectedTeam) return;
    try {
      await api.addTeamMember(selectedTeam.id, { email: newMemberEmail });
      setNewMemberEmail('');
      setSuccess('Member added!');
      loadTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  }

  async function removeMember(userId) {
    if (!selectedTeam) return;
    try {
      await api.removeTeamMember(selectedTeam.id, userId);
      setSuccess('Member removed');
      loadTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
  }

  function toggleSelect(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === teamCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(teamCandidates.map(c => c.id));
    }
  }

  async function downloadReport() {
    if (!selectedTeam) return;
    const idsToExport = selectedIds.length > 0 ? selectedIds : teamCandidates.map(c => c.id);
    if (idsToExport.length === 0) {
      setError('No candidates to export');
      return;
    }
    setDownloading(true);
    try {
      const token = localStorage.getItem('sl_token');
      const res = await fetch(`/api/teams/${selectedTeam.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ candidate_ids: idsToExport }),
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SkillsLedger-${selectedTeam.name}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 mt-1">Collaborate with your team on candidates</p>
        </div>
        {selectedTeam && teamCandidates.length > 0 && (
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <span className="text-sm text-slate-500">
                {selectedIds.length} selected
              </span>
            )}
            <button onClick={downloadReport} disabled={downloading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {downloading ? 'Generating...' : selectedIds.length > 0 ? `Export ${selectedIds.length} to PDF` : 'Export All to PDF'}
            </button>
          </div>
        )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Create Team</h2>
            <input type="text" placeholder="Team name" value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTeam()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" />
            <button onClick={createTeam}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">
              Create Team
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800 mb-3">My Teams</h2>
            {teams.length === 0 ? (
              <p className="text-slate-500 text-sm">No teams yet. Create one above.</p>
            ) : (
              <div className="space-y-2">
                {teams.map(team => (
                  <button key={team.id} onClick={() => setSelectedTeam(team)}
                    className={'w-full text-left px-3 py-2 rounded-lg text-sm ' + (selectedTeam && selectedTeam.id === team.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-700')}>
                    {team.name}
                    <span className="text-xs text-slate-400 ml-2">
                      {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedTeam && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-800 mb-3">Members — {selectedTeam.name}</h2>
              <div className="flex gap-2 mb-4">
                <input type="email" placeholder="Add member by email" value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <button onClick={addMember}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {selectedTeam.members.map(member => (
                  <div key={member.user_id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="font-medium text-sm text-slate-800">{member.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={'text-xs px-2 py-1 rounded-full ' + (member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600')}>
                        {member.role}
                      </span>
                      {member.role !== 'admin' && (
                        <button onClick={() => removeMember(member.user_id)}
                          className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">
                  Shared Candidates ({teamCandidates.length})
                </h2>
                {teamCandidates.length > 0 && (
                  <button onClick={toggleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {selectedIds.length === teamCandidates.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {teamCandidates.length === 0 ? (
                <p className="text-slate-500 text-sm">No candidates shared yet. Go to Saved and click Share to Team.</p>
              ) : (
                <div className="space-y-3">
                  {teamCandidates.map(c => (
                    <div key={c.id}
                      onClick={() => toggleSelect(c.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedIds.includes(c.id)
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-100 hover:border-slate-300'
                      }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            onClick={e => e.stopPropagation()}
                            className="mt-1 w-4 h-4 accent-blue-600"
                          />
                          <div>
                            <a href={'/candidate/' + c.github_username}
                              onClick={e => e.stopPropagation()}
                              className="font-medium text-blue-600 hover:underline">
                              {c.display_name || c.github_username}
                            </a>
                            <p className="text-xs text-slate-400">
                              @{c.github_username} · Saved by {c.saved_by_name || ''}
                            </p>
                          </div>
                        </div>
                        <span className={'text-xs px-2 py-1 rounded-full ' + (statusColors[c.status] || 'bg-slate-100 text-slate-600')}>
                          {c.status}
                        </span>
                      </div>
                      {c.skills && c.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 ml-7">
                          {c.skills.slice(0, 5).map(s => (
                            <span key={s.skill_name} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {s.skill_name} {s.confidence_score}%
                            </span>
                          ))}
                        </div>
                      )}
                      {c.notes && (
                        <p className="text-xs text-slate-500 mt-2 ml-7 italic">"{c.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}