from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from typing import List
import asyncio
import httpx

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import (
    AnalyzeRequest, AnalyzeResponse, SaveRequest, UpdateSavedRequest,
    CandidateOut, SkillOut, SavedCandidateOut, CandidateDetailResponse,
)
from app.services.github import fetch_user_profile, fetch_and_analyze_skills

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    body: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    username = body.username.lower()

    cached_candidate = await db.fetchrow(
        """SELECT * FROM candidates
           WHERE github_username = $1
           AND analyzed_at > NOW() - INTERVAL '24 hours'""",
        username,
    )

    if cached_candidate:
        skills = [SkillOut(**dict(r)) for r in await db.fetch(
            "SELECT * FROM skill_profiles WHERE candidate_id = $1 ORDER BY confidence_score DESC",
            cached_candidate["id"],
        )]
        return AnalyzeResponse(
            candidate=CandidateOut(**dict(cached_candidate)),
            skills=skills,
            cached=True,
        )

    try:
        profile, skill_data = await asyncio.wait_for(
            asyncio.gather(
                fetch_user_profile(username),
                fetch_and_analyze_skills(username),
            ),
            timeout=25.0
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Analysis timed out. Try a user with fewer repositories.")
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f'GitHub user "{body.username}" not found')
        if e.response.status_code == 403:
            raise HTTPException(status_code=429, detail="GitHub API rate limit reached.")
        raise HTTPException(status_code=502, detail=f"GitHub API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    await db.execute(
        """INSERT INTO candidates
           (github_username, display_name, avatar_url, bio, location, public_repos, followers, github_url, analyzed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT(github_username) DO UPDATE SET
               display_name = EXCLUDED.display_name,
               avatar_url   = EXCLUDED.avatar_url,
               bio          = EXCLUDED.bio,
               location     = EXCLUDED.location,
               public_repos = EXCLUDED.public_repos,
               followers    = EXCLUDED.followers,
               github_url   = EXCLUDED.github_url,
               analyzed_at  = NOW()""",
        profile["github_username"], profile["display_name"], profile["avatar_url"],
        profile["bio"], profile["location"], profile["public_repos"],
        profile["followers"], profile["github_url"],
    )

    candidate_row = await db.fetchrow(
        "SELECT * FROM candidates WHERE github_username = $1", profile["github_username"]
    )
    candidate_id = candidate_row["id"]

    await db.execute("DELETE FROM skill_profiles WHERE candidate_id = $1", candidate_id)
    for s in skill_data["skills"]:
        await db.execute(
            """INSERT INTO skill_profiles
               (candidate_id, skill_name, confidence_score, commit_count, repo_count, last_used, evidence, category)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
            candidate_id, s["skill_name"], s["confidence_score"],
            s["commit_count"], s["repo_count"], s["last_used"], s["evidence"], s["category"],
        )

    skills = [SkillOut(**dict(r)) for r in await db.fetch(
        "SELECT * FROM skill_profiles WHERE candidate_id = $1 ORDER BY confidence_score DESC",
        candidate_id,
    )]

    return AnalyzeResponse(
        candidate=CandidateOut(**dict(candidate_row)),
        skills=skills,
        cached=False,
    )


@router.post("/save")
async def save_candidate(
    body: SaveRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await db.execute(
        """INSERT INTO saved_candidates (user_id, candidate_id, notes, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT(user_id, candidate_id) DO UPDATE SET
               notes = EXCLUDED.notes,
               status = EXCLUDED.status""",
        current_user["id"], body.candidate_id, body.notes or "", body.status or "reviewing",
    )
    return {"success": True}


@router.delete("/save/{candidate_id}")
async def remove_saved(
    candidate_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM saved_candidates WHERE user_id = $1 AND candidate_id = $2",
        current_user["id"], candidate_id,
    )
    return {"success": True}


@router.patch("/save/{candidate_id}")
async def update_saved(
    candidate_id: int,
    body: UpdateSavedRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    if body.notes is not None:
        await db.execute(
            "UPDATE saved_candidates SET notes = $1 WHERE user_id = $2 AND candidate_id = $3",
            body.notes, current_user["id"], candidate_id,
        )
    if body.status is not None:
        await db.execute(
            "UPDATE saved_candidates SET status = $1 WHERE user_id = $2 AND candidate_id = $3",
            body.status, current_user["id"], candidate_id,
        )
    return {"success": True}


@router.get("/saved", response_model=List[SavedCandidateOut])
async def get_saved(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch(
        """SELECT c.*, sc.notes, sc.status, sc.saved_at
           FROM saved_candidates sc
           JOIN candidates c ON c.id = sc.candidate_id
           WHERE sc.user_id = $1
           ORDER BY sc.saved_at DESC""",
        current_user["id"],
    )

    result = []
    for row in rows:
        skills = [SkillOut(**dict(s)) for s in await db.fetch(
            """SELECT * FROM skill_profiles
               WHERE candidate_id = $1
               ORDER BY confidence_score DESC LIMIT 6""",
            row["id"],
        )]
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
            saved_at=str(d.get("saved_at")) if d.get("saved_at") else None,
            skills=skills,
        ))
    return result


@router.get("/{username}", response_model=CandidateDetailResponse)
async def get_candidate(
    username: str,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    candidate = await db.fetchrow(
        "SELECT * FROM candidates WHERE github_username = $1", username.lower()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found. Analyze them first.")

    skills = [SkillOut(**dict(r)) for r in await db.fetch(
        "SELECT * FROM skill_profiles WHERE candidate_id = $1 ORDER BY confidence_score DESC",
        candidate["id"],
    )]

    saved = await db.fetchrow(
        "SELECT * FROM saved_candidates WHERE user_id = $1 AND candidate_id = $2",
        current_user["id"], candidate["id"],
    )

    return CandidateDetailResponse(
        candidate=CandidateOut(**dict(candidate)),
        skills=skills,
        saved=dict(saved) if saved else None,
    )
