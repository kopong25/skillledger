from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.database import get_db
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


async def _require_superadmin(current_user: dict):
    if not current_user.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Superadmin access required")


@router.get("/users")
async def get_all_users(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _require_superadmin(current_user)
    rows = await db.fetch(
        "SELECT id, name, email, is_superadmin, created_at FROM users ORDER BY created_at DESC"
    )
    return [dict(r) for r in rows]


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _require_superadmin(current_user)
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await db.execute("DELETE FROM users WHERE id = $1", user_id)
    return {"success": True}


@router.get("/teams")
async def get_all_teams(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _require_superadmin(current_user)
    rows = await db.fetch(
        """SELECT t.*, u.name as owner_name, u.email as owner_email,
           (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count,
           (SELECT COUNT(*) FROM team_saved_candidates tsc WHERE tsc.team_id = t.id) as candidate_count
           FROM teams t JOIN users u ON u.id = t.created_by
           ORDER BY t.created_at DESC"""
    )
    return [dict(r) for r in rows]


@router.get("/stats")
async def get_stats(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _require_superadmin(current_user)
    total_users = await db.fetchval("SELECT COUNT(*) FROM users")
    total_candidates = await db.fetchval("SELECT COUNT(*) FROM candidates")
    total_teams = await db.fetchval("SELECT COUNT(*) FROM teams")
    total_saved = await db.fetchval("SELECT COUNT(*) FROM saved_candidates")
    new_users_7d = await db.fetchval(
        "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'"
    )
    new_analyses_7d = await db.fetchval(
        "SELECT COUNT(*) FROM candidates WHERE created_at > NOW() - INTERVAL '7 days'"
    )
    return {
        "total_users": total_users,
        "total_candidates": total_candidates,
        "total_teams": total_teams,
        "total_saved": total_saved,
        "new_users_7d": new_users_7d,
        "new_analyses_7d": new_analyses_7d,
    }
