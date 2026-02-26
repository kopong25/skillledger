import { Link } from 'react-router-dom';

const STATUS_STYLES = {
  reviewing: 'bg-amber-50 text-amber-700',
  shortlisted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  hired: 'bg-blue-50 text-blue-700',
};

export default function CandidateCard({ candidate, onRemove, onStatusChange, onShare }) {
  const topSkills = (candidate.skills || []).slice(0, 4);

  return (
    <div className="card hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-4">
        <img
          src={candidate.avatar_url || `https://avatars.githubusercontent.com/${candidate.github_username}`}
          alt={candidate.display_name}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                to={`/candidate/${candidate.github_username}`}
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
              >
                {candidate.display_name || candidate.github_username}
              </Link>
              <p className="text-sm text-slate-500">@{candidate.github_username}</p>
            </div>
            {candidate.status && (
              <select
                value={candidate.status}
                onChange={(e) => onStatusChange?.(candidate.id, e.target.value)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${STATUS_STYLES[candidate.status] || STATUS_STYLES.reviewing}`}
              >
                <option value="reviewing">Reviewing</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
                <option value="hired">Hired</option>
              </select>
            )}
          </div>

          {candidate.bio && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-1">{candidate.bio}</p>
          )}

          {topSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {topSkills.map(skill => (
                <span key={skill.skill_name} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {skill.skill_name}
                  <span className="font-semibold">{skill.confidence_score}%</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {candidate.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {candidate.location}
                </span>
              )}
              <span>{candidate.public_repos} repos</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/candidate/${candidate.github_username}`}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Full profile →
              </Link>
              {onShare && (
                <button
                  onClick={onShare}
                  className="text-xs text-slate-400 hover:text-blue-500 transition-colors ml-2"
                >
                  Share to Team
                </button>
              )}
              {onRemove && (
                <button
                  onClick={() => onRemove(candidate.id)}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-2"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
