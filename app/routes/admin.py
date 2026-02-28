import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

SUPERADMIN_EMAIL = "koppong@zioncompassion.com"

async def _require_superadmin(current_user: dict):
    if current_user.get("email") != SUPERADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Superadmin access required")

@router.get("/stats")
async def get_stats(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _require_superadmin(current_user)
    return {
        "total_users":      await db.fetchval("SELECT COUNT(*) FROM users"),
        "total_candidates": await db.fetchval("SELECT COUNT(*) FROM candidates"),
        "total_teams":      await db.fetchval("SELECT COUNT(*) FROM teams"),
        "total_saved":      await db.fetchval("SELECT COUNT(*) FROM saved_candidates"),
        "new_users_7d":     await db.fetchval("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'"),
        "new_analyses_7d":  await db.fetchval("SELECT COUNT(*) FROM candidates WHERE created_at > NOW() - INTERVAL '7 days'"),
    }

@router.get("/users")
async def get_all_users(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _require_superadmin(current_user)
    rows = await db.fetch(
        """SELECT u.id, u.email, u.name, u.role, u.created_at,
           COUNT(sc.id) as saved_count,
           CASE WHEN u.email = $1 THEN true ELSE false END as is_superadmin
           FROM users u
           LEFT JOIN saved_candidates sc ON sc.user_id = u.id
           GROUP BY u.id
           ORDER BY u.created_at DESC""",
        SUPERADMIN_EMAIL,
    )
    return [dict(r) for r in rows]

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

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _require_superadmin(current_user)
    row = await db.fetchrow("SELECT email FROM users WHERE id = $1", user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row["email"] == SUPERADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Cannot delete superadmin")
    await db.execute("DELETE FROM users WHERE id = $1", user_id)
    return {"success": True}