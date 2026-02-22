const CATEGORY_COLORS = {
  language: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  framework: { bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500' },
  markup: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-400' },
  scripting: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
};

function getConfidenceLabel(score) {
  if (score >= 80) return { label: 'Expert', color: 'text-emerald-600', dot: 'bg-emerald-500' };
  if (score >= 60) return { label: 'Proficient', color: 'text-blue-600', dot: 'bg-blue-500' };
  if (score >= 40) return { label: 'Familiar', color: 'text-amber-600', dot: 'bg-amber-500' };
  return { label: 'Exposure', color: 'text-slate-500', dot: 'bg-slate-400' };
}

export default function SkillCard({ skill, index = 0 }) {
  const colors = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.language;
  const level = getConfidenceLabel(skill.confidence_score);

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`badge ${colors.bg} ${colors.text}`}>
            {skill.category}
          </span>
          <h3 className="font-semibold text-slate-900">{skill.skill_name}</h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-slate-900">{skill.confidence_score}%</span>
          <div className={`flex items-center gap-1 justify-end mt-0.5 ${level.color}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${level.dot}`}></div>
            <span className="text-xs font-medium">{level.label}</span>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full confidence-bar ${colors.bar}`}
          style={{
            '--target-width': `${skill.confidence_score}%`,
            animationDelay: `${index * 80}ms`,
          }}
        />
      </div>

      {/* Evidence */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {skill.repo_count > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {skill.repo_count} repo{skill.repo_count !== 1 ? 's' : ''}
          </span>
        )}
        {skill.commit_count > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {skill.commit_count} commits/yr
          </span>
        )}
        {skill.last_used && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {skill.last_used}
          </span>
        )}
      </div>
    </div>
  );
}

export function SkillCardSkeleton() {
  return (
    <div className="card">
      <div className="flex justify-between mb-3">
        <div className="flex gap-2">
          <div className="shimmer h-5 w-16 rounded-full" />
          <div className="shimmer h-5 w-24 rounded" />
        </div>
        <div className="shimmer h-8 w-12 rounded" />
      </div>
      <div className="shimmer h-2 rounded-full mb-3" />
      <div className="flex gap-3">
        <div className="shimmer h-4 w-16 rounded" />
        <div className="shimmer h-4 w-20 rounded" />
      </div>
    </div>
  );
}
