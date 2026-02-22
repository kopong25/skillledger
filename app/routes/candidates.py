from fastapi import APIRouter, Depends, HTTPException
from aiosqlite import Connection
from typing import List
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import (
    AnalyzeRequest, AnalyzeResponse, SaveRequest, UpdateSavedRequest,
    CandidateOut, SkillOut, SavedCandidateOut, CandidateDetailResponse,
)
from app.services.github import fetch_user_profile, fetch_and_analyze_skills
from github import UnknownObjectException, RateLimitExceededException, GithubException

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    body: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db),
):
    username = body.username.lower()

    # Check if cached in DB within last 24 hours
    async with db.execute(
        """SELECT * FROM candidates
           WHERE github_username = ?
           AND analyzed_at > datetime('now', '-24 hours')""",
        (username,),
    ) as cur:
        cached_candidate = await cur.fetchone()

    if cached_candidate:
        async with db.execute(
            "SELECT * FROM skill_profiles WHERE candidate_id = ? ORDER BY confidence_score DESC",
            (cached_candidate["id"],),
        ) as cur:
            skills = [SkillOut(**dict(r)) for r in await cur.fetchall()]
        return AnalyzeResponse(
            candidate=CandidateOut(**dict(cached_candidate)),
            skills=skills,
            cached=True,
        )

    # Fetch from GitHub
    try:
        profile, skill_data = await _fetch_profile_and_skills(body.username)
    except UnknownObjectException:
        raise HTTPException(status_code=404, detail=f'GitHub user "{body.username}" not found')
    except RateLimitExceededException:
        raise HTTPException(
            status_code=429,
            detail="GitHub API rate limit reached. Add a GITHUB_TOKEN to increase limits (5000 req/hr).",
        )
    except GithubException as e:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {str(e)}")

    # Upsert candidate
    await db.execute(
        """INSERT INTO candidates
           (github_username, display_name, avatar_url, bio, location, public_repos, followers, github_url, analyzed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(github_username) DO UPDATE SET
               display_name = excluded.display_name,
               avatar_url   = excluded.avatar_url,
               bio          = excluded.bio,
               location     = excluded.location,
               public_repos = excluded.public_repos,
               followers    = excluded.followers,
               github_url   = excluded.github_url,
               analyzed_at  = CURRENT_TIMESTAMP""",
        (
            profile["github_username"],
            profile["display_name"],
            profile["avatar_url"],
            profile["bio"],
            profile["location"],
            profile["public_repos"],
            profile["followers"],
            profile["github_url"],
        ),
    )

    async with db.execute(
        "SELECT * FROM candidates WHERE github_username = ?", (profile["github_username"],)
    ) as cur:
        candidate_row = await cur.fetchone()

    candidate_id = candidate_row["id"]

    # Replace skills
    await db.execute("DELETE FROM skill_profiles WHERE candidate_id = ?", (candidate_id,))
    for s in skill_data["skills"]:
        await db.execute(
            """INSERT INTO skill_profiles
               (candidate_id, skill_name, confidence_score, commit_count, repo_count, last_used, evidence, category)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (candidate_id, s["skill_name"], s["confidence_score"],
             s["commit_count"], s["repo_count"], s["last_used"], s["evidence"], s["category"]),
        )

    async with db.execute(
        "SELECT * FROM skill_profiles WHERE candidate_id = ? ORDER BY confidence_score DESC",
        (candidate_id,),
    ) as cur:
        skills = [SkillOut(**dict(r)) for r in await cur.fetchall()]

    return AnalyzeResponse(
        candidate=CandidateOut(**dict(candidate_row)),
        skills=skills,
        cached=False,
    )


async def _fetch_profile_and_skills(username: str):
    import asyncio
    profile, skill_data = await asyncio.gather(
        fetch_user_profile(username),
        fetch_and_analyze_skills(username),
    )
    return profile, skill_data


@router.post("/save")
async def save_candidate(
    body: SaveRequest,
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db),
):
    await db.execute(
        """INSERT INTO saved_candidates (user_id, candidate_id, notes, status)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, candidate_id) DO UPDATE SET
               notes = excluded.notes,
               status = excluded.status""",
        (current_user["id"], body.candidate_id, body.notes or "", body.status or "reviewing"),
    )
    return {"success": True}


@router.delete("/save/{candidate_id}")
async def remove_saved(
    candidate_id: int,
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM saved_candidates WHERE user_id = ? AND candidate_id = ?",
        (current_user["id"], candidate_id),
    )
    return {"success": True}


@router.patch("/save/{candidate_id}")
async def update_saved(
    candidate_id: int,
    body: UpdateSavedRequest,
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db),
):
    if body.notes is not None:
        await db.execute(
            "UPDATE saved_candidates SET notes = ? WHERE user_id = ? AND candidate_id = ?",
            (body.notes, current_user["id"], candidate_id),
        )
    if body.status is not None:
        await db.execute(
            "UPDATE saved_candidates SET status = ? WHERE user_id = ? AND candidate_id = ?",
            (body.status, current_user["id"], candidate_id),
        )
    return {"success": True}


@router.get("/saved", response_model=List[SavedCandidateOut])
async def get_saved(
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db),
):
    async with db.execute(
        """SELECT c.*, sc.notes, sc.status, sc.saved_at
           FROM saved_candidates sc
           JOIN candidates c ON c.id = sc.candidate_id
           WHERE sc.user_id = ?
           ORDER BY sc.saved_at DESC""",
        (current_user["id"],),
    ) as cur:
        rows = await cur.fetchall()

    result = []
    for row in rows:
        async with db.execute(
            """SELECT * FROM skill_profiles
               WHERE candidate_id = ?
               ORDER BY confidence_score DESC LIMIT 6""",
            (row["id"],),
        ) as cur:
            skills = [SkillOut(**dict(s)) for s in await cur.fetchall()]

        d = dict(row)
        result.append(SavedCandidateOut(
            id=d["id"],
            github_username=d["github_username"],
            display_name=d.get("display_name"),
            avatar_url=d.get("avatar_url"),
            bio=d.get("bio"),
            location=d.get("location"),
            public_repos=d.get("public_repos", 0),
            followers=d.get("followers", 0),
            notes=d.get("notes"),
            status=d.get("status"),
            saved_at=d.get("saved_at"),
            skills=skills,
        ))
    return result


@router.get("/{username}", response_model=CandidateDetailResponse)
async def get_candidate(
    username: str,
    current_user: dict = Depends(get_current_user),
    db: Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT * FROM candidates WHERE github_username = ?", (username.lower(),)
    ) as cur:
        candidate = await cur.fetchone()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found. Analyze them first.")

    async with db.execute(
        "SELECT * FROM skill_profiles WHERE candidate_id = ? ORDER BY confidence_score DESC",
        (candidate["id"],),
    ) as cur:
        skills = [SkillOut(**dict(r)) for r in await cur.fetchall()]

    async with db.execute(
        "SELECT * FROM saved_candidates WHERE user_id = ? AND candidate_id = ?",
        (current_user["id"], candidate["id"]),
    ) as cur:
        saved = await cur.fetchone()

    return CandidateDetailResponse(
        candidate=CandidateOut(**dict(candidate)),
        skills=skills,
        saved=dict(saved) if saved else None,
    )
