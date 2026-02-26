import asyncio
import httpx
from datetime import datetime, timezone
from cachetools import TTLCache
from app.config import get_settings

_cache = TTLCache(maxsize=500, ttl=3600)

FRAMEWORK_SIGNALS: dict[str, list[str]] = {
    "React":        ["react", "react-dom", "next", "gatsby"],
    "Vue.js":       ["vue", "nuxt", "quasar"],
    "Angular":      ["angular"],
    "Node.js":      ["express", "fastify", "koa", "nestjs"],
    "Django":       ["django"],
    "FastAPI":      ["fastapi", "uvicorn"],
    "Flask":        ["flask"],
    "TypeScript":   ["typescript"],
    "Docker":       ["docker"],
    "Kubernetes":   ["kubernetes", "helm"],
    "TensorFlow":   ["tensorflow", "keras"],
    "PyTorch":      ["torch", "pytorch"],
    "AWS":          ["aws", "boto3", "serverless"],
    "PostgreSQL":   ["postgres", "psycopg2", "sqlalchemy"],
    "MongoDB":      ["mongodb", "mongoose"],
    "Redis":        ["redis"],
    "Testing":      ["jest", "pytest", "cypress"],
    "Pandas":       ["pandas", "numpy"],
}

LANGUAGE_CATEGORIES: dict[str, str] = {
    "JavaScript": "language", "TypeScript": "language", "Python": "language",
    "Java": "language", "Go": "language", "Rust": "language", "C++": "language",
    "C#": "language", "Ruby": "language", "PHP": "language", "Swift": "language",
    "Kotlin": "language", "Scala": "language", "R": "language", "Dart": "language",
    "C": "language", "Elixir": "language", "Haskell": "language",
    "HTML": "markup", "CSS": "markup", "Shell": "scripting", "Bash": "scripting",
}


def _get_headers() -> dict:
    settings = get_settings()
    headers = {"Accept": "application/vnd.github+json"}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    return headers


def _months_ago(dt_str: str) -> float:
    if not dt_str:
        return 24.0
    dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    return (now - dt).days / 30.0


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


def _confidence_score(byte_share: float, repo_score: float, recency_score: float) -> int:
    raw = byte_share * 0.40 + repo_score * 0.40 + recency_score * 0.20
    scaled = min(98, max(5, raw * 120))
    return round(scaled)


async def fetch_user_profile(username: str) -> dict:
    cache_key = f"profile:{username.lower()}"
    if cache_key in _cache:
        return _cache[cache_key]

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"https://api.github.com/users/{username}",
            headers=_get_headers()
        )
        if r.status_code == 404:
            from github import UnknownObjectException
            raise UnknownObjectException(404, "Not found", {})
        r.raise_for_status()
        u = r.json()

    profile = {
        "github_username": u["login"].lower(),
        "display_name": u.get("name") or u["login"],
        "avatar_url": u.get("avatar_url"),
        "bio": u.get("bio"),
        "location": u.get("location"),
        "public_repos": u.get("public_repos", 0),
        "followers": u.get("followers", 0),
        "github_url": u.get("html_url"),
    }
    _cache[cache_key] = profile
    return profile


async def fetch_and_analyze_skills(username: str) -> dict:
    cache_key = f"skills:{username.lower()}"
    if cache_key in _cache:
        return _cache[cache_key]

    headers = _get_headers()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Fetch first 10 repos in one call
        r = await client.get(
            f"https://api.github.com/users/{username}/repos",
            headers=headers,
            params={"sort": "pushed", "type": "owner", "per_page": 10, "page": 1}
        )
        r.raise_for_status()
        repos = r.json()

        # Fetch languages for all repos in parallel
        lang_tasks = [
            client.get(repo["languages_url"], headers=headers)
            for repo in repos
        ]
        lang_responses = await asyncio.gather(*lang_tasks, return_exceptions=True)

    now = datetime.now(timezone.utc)
    language_stats: dict[str, dict] = {}
    frameworks_detected: set[str] = set()

    for repo, lang_resp in zip(repos, lang_responses):
        try:
            if isinstance(lang_resp, Exception):
                continue

            pushed_str = repo.get("pushed_at") or repo.get("created_at", "")
            months_ago = _months_ago(pushed_str)
            recency_factor = max(0.1, 1 - months_ago / 36)

            langs = lang_resp.json()
            for lang, bytes_count in langs.items():
                if lang not in language_stats:
                    language_stats[lang] = {
                        "bytes": 0,
                        "repo_count": 0,
                        "recent_repo_count": 0.0,
                        "months_ago": months_ago,
                    }
                language_stats[lang]["bytes"] += bytes_count
                language_stats[lang]["repo_count"] += 1
                language_stats[lang]["recent_repo_count"] += recency_factor
                if months_ago < language_stats[lang]["months_ago"]:
                    language_stats[lang]["months_ago"] = months_ago

            # Detect frameworks from topics + description
            topics = repo.get("topics") or []
            desc = (repo.get("description") or "").lower()
            combined = " ".join(topics) + " " + desc
            for framework, signals in FRAMEWORK_SIGNALS.items():
                if any(s.lower() in combined for s in signals):
                    frameworks_detected.add(framework)

        except Exception:
            continue

    skills = _build_skill_scores(language_stats, frameworks_detected)
    result = {"skills": skills, "repo_count": len(repos)}
    _cache[cache_key] = result
    return result


def _build_skill_scores(language_stats: dict, frameworks_detected: set) -> list[dict]:
    skills = []
    total_bytes = sum(s["bytes"] for s in language_stats.values()) or 1

    for lang, stats in language_stats.items():
        if stats["bytes"] < 1000:
            continue

        byte_share    = stats["bytes"] / total_bytes
        repo_score    = min(stats["recent_repo_count"] / 5, 1.0)
        months_ago    = stats["months_ago"]
        recency_score = max(0.0, 1 - months_ago / 24)
        confidence    = _confidence_score(byte_share, repo_score, recency_score)

        skills.append({
            "skill_name":       lang,
            "confidence_score": confidence,
            "commit_count":     0,
            "repo_count":       stats["repo_count"],
            "last_used":        _last_used_str(months_ago),
            "category":         LANGUAGE_CATEGORIES.get(lang, "language"),
            "evidence":         f"{stats['repo_count']} repo{'s' if stats['repo_count'] != 1 else ''}" + (", actively used recently." if months_ago < 3 else "."),
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
