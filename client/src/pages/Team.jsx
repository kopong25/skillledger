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

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) loadTeamCandidates(selectedTeam.id);
  }, [selectedTeam]);

  async function loadTeams() {
    try {
      const data = await api.getMyTeams();
      setTeams(data);
      if (data.length > 0) setSelectedTeam(data[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamCandidates(teamId) {
    try {
      const data = await api.getTeamSaved(teamId);
      setTeamCandidates(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function createTeam() {
    if (!newTeamName.trim()) return;
    try {
      await api.createTeam({ name: newTeamName });
      setNewTeamName('');
      setSuccess('Team created!');
      loadTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  }

  async function addMember() {
    if (!newMemberEmail.trim() || !selectedTeam) return;
    try {
      await api.addTeamMember(selectedTeam.id, { email: newMemberEmail });
      setNewMemberEmail('');
      setSuccess('Member added!');
      loadTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeMember(userId) {
    if (!selectedTeam) return;
    try {
      await api.removeTeamMember(selectedTeam.id, userId);
      setSuccess('Member removed');
      loadTeams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    }
  }

  async function downloadReport() {
    if (!selectedTeam) return;
    setDownloading(true);
    try {
      const blob = await api.downloadTeamReport(selectedTeam.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skillledger-${selectedTeam.name}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  const statusColors = {
    reviewing: 'bg-yellow-100 text-yellow-800',
    shortlisted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

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
        {selectedTeam && (
          <button
            onClick={downloadReport}
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading ? 'Generating...' : '⬇ Download PDF Report'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar - Teams list */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Create Team</h2>
            <input
              type="text"
              placeholder="Team name"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTeam()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2"
            />
            <button
              onClick={createTeam}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
            >
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
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedTeam?.id === team.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
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

        {/* Main content */}
        {selectedTeam && (
          <div className="lg:col-span-2 space-y-4">
            {/* Members */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-800 mb-3">
                Members — {selectedTeam.name}
              </h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  placeholder="Add member by email"
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={addMember}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
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
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        member.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {member.role}
                      </span>
                      {member.role !== 'admin' && (
                        <button
                          onClick={() => removeMember(member.user_id)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared candidates */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-800 mb-3">
                Shared Candidates ({teamCandidates.length})
              </h2>
              {teamCandidates.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No candidates shared yet. Go to Saved and share candidates with this team.
                </p>
              ) : (
                <div className="space-y-4">
                  {teamCandidates.map(c => (
                    <div key={c.id} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          
                            href={`/candidate/${c.github_username}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {c.display_name || c.github_username}
                          </a>
                          <p className="text-xs text-slate-400">
                            @{c.github_username} · Saved by {c.saved_by_name}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                          {c.status}
                        </span>
                      </div>
                      {c.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.skills.slice(0, 5).map(s => (
                            <span key={s.skill_name} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {s.skill_name} {s.confidence_score}%
                            </span>
                          ))}
                        </div>
                      )}
                      {c.notes && (
                        <p className="text-xs text-slate-500 mt-2 italic">"{c.notes}"</p>
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