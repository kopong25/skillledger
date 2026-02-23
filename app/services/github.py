import asyncio
import json
from datetime import datetime, timezone, timedelta
from cachetools import TTLCache
from github import Github, GithubException, UnknownObjectException
from app.config import get_settings

# In-memory cache: 1 hour TTL, max 500 entries
_cache = TTLCache(maxsize=500, ttl=3600)

FRAMEWORK_SIGNALS: dict[str, list[str]] = {
    "React":        ["react", "react-dom", "next", "gatsby", "create-react-app"],
    "Vue.js":       ["vue", "nuxt", "quasar", "@vue/"],
    "Angular":      ["@angular/core", "@angular/cli"],
    "Node.js":      ["express", "fastify", "koa", "hapi", "@nestjs/"],
    "Django":       ["django", "djangorestframework"],
    "FastAPI":      ["fastapi", "uvicorn", "starlette"],
    "Flask":        ["flask"],
    "TypeScript":   ["typescript", "ts-node", "@types/"],
    "GraphQL":      ["graphql", "apollo", "@apollo/"],
    "Docker":       ["dockerfile", "docker-compose"],
    "Kubernetes":   ["kubectl", "helm", "kubernetes"],
    "TensorFlow":   ["tensorflow", "keras"],
    "PyTorch":      ["torch", "pytorch"],
    "AWS":          ["aws-sdk", "boto3", "serverless"],
    "PostgreSQL":   ["pg", "psycopg2", "sequelize", "prisma", "sqlalchemy"],
    "MongoDB":      ["mongoose", "mongodb", "pymongo", "motor"],
    "Redis":        ["redis", "ioredis", "aioredis"],
    "Testing":      ["jest", "pytest", "mocha", "cypress", "vitest"],
    "CI/CD":        [".github/workflows", "jenkinsfile", ".circleci", ".travis.yml"],
    "Pandas":       ["pandas", "numpy", "scipy"],
    "Scikit-learn": ["scikit-learn", "sklearn"],
}

LANGUAGE_CATEGORIES: dict[str, str] = {
    "JavaScript": "language", "TypeScript": "language", "Python": "language",
    "Java": "language", "Go": "language", "Rust": "language", "C++": "language",
    "C#": "language", "Ruby": "language", "PHP": "language", "Swift": "language",
    "Kotlin": "language", "Scala": "language", "R": "language", "Dart": "language",
    "C": "language", "Elixir": "language", "Haskell": "language",
    "HTML": "markup", "CSS": "markup", "Shell": "scripting", "Bash": "scripting",
}


def _get_github_client() -> Github:
    settings = get_settings()
    token = settings.github_token
    return Github(token if token else None, per_page=100)


def _months_ago(dt: datetime) -> float:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (now - dt).days / 30.0


def _build_evidence(lang: str, repo_count: int, commits: int, months_ago: float) -> str:
    parts = []
    if repo_count:
        parts.append(f"{repo_count} repo{'s' if repo_count != 1 else ''}")
    if commits:
        parts.append(f"{commits} commits in the last year")
    if months_ago < 3:
        parts.append("actively used recently")
    return ", ".join(parts) + "." if parts else "Detected in repositories."


def _last_used_str(months_ago: float) -> str:
    m = round(months_ago)
    if m == 0:
        return "This month"
    if m == 1:
        return "1 month ago"
    if m < 12:
        return f"{m} months ago"
    years = round(m / 12)
    return f"{years} year{'s' if years != 1 else ''} ago"


def _confidence_score(
    byte_share: float,
    repo_score: float,
    commit_score: float,
    recency_score: float,
) -> int:
    raw = (
        byte_share    * 0.25 +
        repo_score    * 0.30 +
        commit_score  * 0.30 +
        recency_score * 0.15
    )
    scaled = min(98, max(5, raw * 120))
    return round(scaled)


async def fetch_user_profile(username: str) -> dict:
    cache_key = f"profile:{username.lower()}"
    if cache_key in _cache:
        return _cache[cache_key]

    def _fetch():
        gh = _get_github_client()
        user = gh.get_user(username)
        return {
            "github_username": user.login.lower(),
            "display_name": user.name or user.login,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "location": user.location,
            "public_repos": user.public_repos,
            "followers": user.followers,
            "github_url": user.html_url,
        }

    profile = await asyncio.to_thread(_fetch)
    _cache[cache_key] = profile
    return profile


async def fetch_and_analyze_skills(username: str) -> dict:
    cache_key = f"skills:{username.lower()}"
    if cache_key in _cache:
        return _cache[cache_key]

    def _analyze():
        gh = _get_github_client()
        user = gh.get_user(username)

        # Limit to 20 repos max (was 100 fetched, 30 analyzed)
        repos = [r for r in user.get_repos(sort="pushed", type="owner") if not r.fork][:20]

        now = datetime.now(timezone.utc)
        language_stats: dict[str, dict] = {}
        frameworks_detected: set[str] = set()

        # Analyze only top 10 repos (was 30) — reduces API calls significantly
        for repo in repos[:10]:
            try:
                pushed = repo.pushed_at or repo.created_at
                if pushed.tzinfo is None:
                    pushed = pushed.replace(tzinfo=timezone.utc)
                age_months = (now - pushed).days / 30.0
                recency_factor = max(0.1, 1 - age_months / 36)

                langs = repo.get_languages()
                for lang, bytes_count in langs.items():
                    if lang not in language_stats:
                        language_stats[lang] = {
                            "bytes": 0,
                            "repo_count": 0,
                            "recent_repo_count": 0.0,
                            "last_used": pushed,
                        }
                    language_stats[lang]["bytes"] += bytes_count
                    language_stats[lang]["repo_count"] += 1
                    language_stats[lang]["recent_repo_count"] += recency_factor
                    if pushed > language_stats[lang]["last_used"]:
                        language_stats[lang]["last_used"] = pushed

                # Detect frameworks from topics + description only (no file fetching)
                topics = repo.topics or []
                desc = (repo.description or "").lower()
                combined = " ".join(topics) + " " + desc
                for framework, signals in FRAMEWORK_SIGNALS.items():
                    if any(s.lower() in combined for s in signals):
                        frameworks_detected.add(framework)

            except Exception:
                continue

        # Commit activity — only top 5 repos (was 10)
        commit_activity: dict[str, int] = {}
        one_year_ago = now - timedelta(days=365)

        for repo in repos[:5]:
            try:
                langs = repo.get_languages()
                if not langs:
                    continue
                primary = max(langs.items(), key=lambda x: x[1])[0]
                count = repo.get_commits(
                    author=username,
                    since=one_year_ago,
                ).totalCount
                commit_activity[primary] = commit_activity.get(primary, 0) + count
            except Exception:
                continue

        skills = _build_skill_scores(language_stats, commit_activity, frameworks_detected)
        return {"skills": skills, "repo_count": len(repos)}

    result = await asyncio.to_thread(_analyze)
    _cache[cache_key] = result
    return result


def _build_skill_scores(
    language_stats: dict,
    commit_activity: dict,
    frameworks_detected: set,
) -> list[dict]:
    skills = []
    total_bytes = sum(s["bytes"] for s in language_stats.values()) or 1

    for lang, stats in language_stats.items():
        if stats["bytes"] < 1000:
            continue

        byte_share    = stats["bytes"] / total_bytes
        repo_score    = min(stats["recent_repo_count"] / 5, 1.0)
        commit_count  = commit_activity.get(lang, 0)
        commit_score  = min(commit_count / 100, 1.0)
        months_ago    = _months_ago(stats["last_used"])
        recency_score = max(0.0, 1 - months_ago / 24)

        confidence = _confidence_score(byte_share, repo_score, commit_score, recency_score)

        skills.append({
            "skill_name":       lang,
            "confidence_score": confidence,
            "commit_count":     commit_count,
            "repo_count":       stats["repo_count"],
            "last_used":        _last_used_str(months_ago),
            "category":         LANGUAGE_CATEGORIES.get(lang, "language"),
            "evidence":         _build_evidence(lang, stats["repo_count"], commit_count, months_ago),
        })

    for fw in frameworks_detected:
        if fw not in {s["skill_name"] for s in skills}:
            skills.append({
                "skill_name":       fw,
                "confidence_score": 45,
                "commit_count":     0,
                "repo_count":       1,
                "last_used":        "Detected in repos",
                "category":         "framework",
                "evidence":         "Detected in repository topics or description.",
            })

    return sorted(skills, key=lambda s: s["confidence_score"], reverse=True)