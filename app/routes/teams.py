from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import asyncpg
from typing import List
from io import BytesIO
from datetime import datetime

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.schemas import (
    TeamCreate, TeamOut, TeamMemberOut, TeamSaveRequest,
    TeamUpdateSavedRequest, TeamSavedCandidateOut, AddMemberRequest, SkillOut
)

router = APIRouter(prefix="/teams", tags=["Teams"])


async def _check_team_access(team_id: int, user_id: int, db, require_admin=False):
    member = await db.fetchrow(
        "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
        team_id, user_id
    )
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this team")
    if require_admin and member["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return member


@router.post("", status_code=201)
async def create_team(
    body: TeamCreate,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING id",
        body.name, current_user["id"]
    )
    team_id = row["id"]
    await db.execute(
        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'admin')",
        team_id, current_user["id"]
    )
    return {"id": team_id, "name": body.name}


@router.get("/my", response_model=List[TeamOut])
async def get_my_teams(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    teams = await db.fetch(
        """SELECT t.* FROM teams t
           JOIN team_members tm ON tm.team_id = t.id
           WHERE tm.user_id = $1
           ORDER BY t.created_at DESC""",
        current_user["id"]
    )
    result = []
    for team in teams:
        members = await db.fetch(
            """SELECT tm.user_id, tm.role, tm.joined_at, u.name, u.email
               FROM team_members tm
               JOIN users u ON u.id = tm.user_id
               WHERE tm.team_id = $1""",
            team["id"]
        )
        result.append(TeamOut(
            id=team["id"],
            name=team["name"],
            created_by=team["created_by"],
            created_at=team["created_at"],
            members=[TeamMemberOut(**dict(m)) for m in members]
        ))
    return result


@router.post("/{team_id}/members")
async def add_member(
    team_id: int,
    body: AddMemberRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db, require_admin=True)
    user = await db.fetchrow("SELECT id FROM users WHERE email = $1", body.email.lower())
    if not user:
        raise HTTPException(status_code=404, detail="No user found with that email. They must register first.")
    existing = await db.fetchrow(
        "SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2",
        team_id, user["id"]
    )
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member of this team")
    await db.execute(
        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')",
        team_id, user["id"]
    )
    return {"success": True}


@router.delete("/{team_id}/members/{user_id}")
async def remove_member(
    team_id: int,
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db, require_admin=True)
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself as admin")
    await db.execute(
        "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2",
        team_id, user_id
    )
    return {"success": True}


@router.get("/{team_id}/saved")
async def get_team_saved(
    team_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db)
    rows = await db.fetch(
        """SELECT c.*, tsc.notes, tsc.status, tsc.saved_at, u.name as saved_by_name
           FROM team_saved_candidates tsc
           JOIN candidates c ON c.id = tsc.candidate_id
           JOIN users u ON u.id = tsc.saved_by
           WHERE tsc.team_id = $1
           ORDER BY tsc.saved_at DESC""",
        team_id
    )
    result = []
    for row in rows:
        skills = await db.fetch(
            """SELECT * FROM skill_profiles WHERE candidate_id = $1
               ORDER BY confidence_score DESC LIMIT 6""",
            row["id"]
        )
        d = dict(row)
        result.append(TeamSavedCandidateOut(
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
            saved_by_name=d.get("saved_by_name"),
            skills=[SkillOut(**dict(s)) for s in skills]
        ))
    return result


@router.post("/{team_id}/save")
async def team_save_candidate(
    team_id: int,
    body: TeamSaveRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db)
    await db.execute(
        """INSERT INTO team_saved_candidates (team_id, candidate_id, saved_by, notes, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT(team_id, candidate_id) DO UPDATE SET
               notes = EXCLUDED.notes, status = EXCLUDED.status""",
        team_id, body.candidate_id, current_user["id"],
        body.notes or "", body.status or "reviewing"
    )
    return {"success": True}


@router.patch("/{team_id}/save/{candidate_id}")
async def team_update_saved(
    team_id: int,
    candidate_id: int,
    body: TeamUpdateSavedRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db)
    if body.notes is not None:
        await db.execute(
            "UPDATE team_saved_candidates SET notes = $1 WHERE team_id = $2 AND candidate_id = $3",
            body.notes, team_id, candidate_id
        )
    if body.status is not None:
        await db.execute(
            "UPDATE team_saved_candidates SET status = $1 WHERE team_id = $2 AND candidate_id = $3",
            body.status, team_id, candidate_id
        )
    return {"success": True}


@router.delete("/{team_id}/save/{candidate_id}")
async def team_remove_saved(
    team_id: int,
    candidate_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db)
    await db.execute(
        "DELETE FROM team_saved_candidates WHERE team_id = $1 AND candidate_id = $2",
        team_id, candidate_id
    )
    return {"success": True}


@router.get("/{team_id}/report")
async def download_team_report(
    team_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db)
    team = await db.fetchrow("SELECT * FROM teams WHERE id = $1", team_id)
    rows = await db.fetch(
        """SELECT c.*, tsc.notes, tsc.status, tsc.saved_at, u.name as saved_by_name
           FROM team_saved_candidates tsc
           JOIN candidates c ON c.id = tsc.candidate_id
           JOIN users u ON u.id = tsc.saved_by
           WHERE tsc.team_id = $1
           ORDER BY tsc.saved_at DESC""",
        team_id
    )
    candidates = []
    for row in rows:
        skills = await db.fetch(
            "SELECT * FROM skill_profiles WHERE candidate_id = $1 ORDER BY confidence_score DESC",
            row["id"]
        )
        candidates.append({"info": dict(row), "skills": [dict(s) for s in skills]})

    pdf_buffer = _generate_pdf(team["name"], candidates)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=skillledger-{team['name']}-report.pdf"}
    )


def _generate_pdf(team_name: str, candidates: list) -> BytesIO:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=20*mm, leftMargin=20*mm,
                            topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    story = []

    # Header
    title_style = ParagraphStyle("title", fontSize=24, fontName="Helvetica-Bold",
                                  textColor=colors.HexColor("#1d4ed8"), alignment=TA_CENTER)
    sub_style = ParagraphStyle("sub", fontSize=12, fontName="Helvetica",
                                textColor=colors.grey, alignment=TA_CENTER)
    story.append(Paragraph("SkillLedger", title_style))
    story.append(Paragraph(f"Team Report: {team_name}", sub_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", sub_style))
    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 6*mm))

    if not candidates:
        story.append(Paragraph("No candidates saved to this team yet.", styles["Normal"]))
    else:
        for c in candidates:
            info = c["info"]
            skills = c["skills"]

            # Candidate name
            name_style = ParagraphStyle("name", fontSize=14, fontName="Helvetica-Bold",
                                         textColor=colors.HexColor("#1e293b"))
            story.append(Paragraph(info.get("display_name") or info["github_username"], name_style))

            # GitHub link + meta
            link_style = ParagraphStyle("link", fontSize=9, fontName="Helvetica",
                                         textColor=colors.HexColor("#3b82f6"))
            story.append(Paragraph(
                f'<a href="{info.get("github_url", "")}">{info.get("github_url", "")}</a>',
                link_style
            ))
            meta_style = ParagraphStyle("meta", fontSize=9, textColor=colors.grey)
            story.append(Paragraph(
                f"{info.get('public_repos', 0)} repos · {info.get('followers', 0)} followers · "
                f"Saved by: {info.get('saved_by_name', 'Unknown')} · Status: {info.get('status', 'reviewing')}",
                meta_style
            ))
            story.append(Spacer(1, 3*mm))

            # Skills table
            if skills:
                skill_data = [["Skill", "Category", "Confidence", "Repos", "Last Used"]]
                for s in skills:
                    skill_data.append([
                        s["skill_name"],
                        s["category"],
                        f"{s['confidence_score']}%",
                        str(s["repo_count"]),
                        s.get("last_used") or "—"
                    ])
                table = Table(skill_data, colWidths=[45*mm, 30*mm, 30*mm, 20*mm, 40*mm])
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("PADDING", (0, 0), (-1, -1), 4),
                ]))
                story.append(table)
                story.append(Spacer(1, 3*mm))

            # Notes
            if info.get("notes"):
                notes_style = ParagraphStyle("notes", fontSize=9, textColor=colors.HexColor("#475569"),
                                              leftIndent=5*mm)
                story.append(Paragraph(f"<b>Notes:</b> {info['notes']}", notes_style))
                story.append(Spacer(1, 3*mm))

            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
            story.append(Spacer(1, 6*mm))

    doc.build(story)
    buffer.seek(0)
    return buffer