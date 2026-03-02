from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import asyncpg
from io import BytesIO
from datetime import datetime
from app.database import get_db
from app.middleware.auth import get_current_user
import json

router = APIRouter(prefix="/teams", tags=["Teams"])


async def _check_team_access(team_id: int, user_id: int, db):
    member = await db.fetchrow(
        "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
        team_id, user_id
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this team")
    return member


@router.get("/my")
async def get_my_teams(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch(
        """SELECT t.*,
           (SELECT json_agg(json_build_object(
               'user_id', u.id, 'name', u.name, 'email', u.email, 'role', tm.role
           )) FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = t.id) as members
           FROM teams t
           JOIN team_members tm ON tm.team_id = t.id
           WHERE tm.user_id = $1
           ORDER BY t.created_at DESC""",
        current_user["id"]
    )
   
    result = []
    for row in rows:
        d = dict(row)
        members = d.get("members")
        if isinstance(members, str):
            members = json.loads(members)
        d["members"] = members or []
        result.append(d)
    return result

@router.post("", status_code=201)
async def create_team(
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team name required")
    team = await db.fetchrow(
        "INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING *",
        name, current_user["id"]
    )
    await db.execute(
        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'admin')",
        team["id"], current_user["id"]
    )
    return dict(team)


@router.post("/{team_id}/members")
async def add_team_member(
    team_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    member = await _check_team_access(team_id, current_user["id"], db)
    if member["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add members")
    email = body.get("email", "").lower().strip()
    user = await db.fetchrow("SELECT * FROM users WHERE email = $1", email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    existing = await db.fetchrow(
        "SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2",
        team_id, user["id"]
    )
    if existing:
        raise HTTPException(status_code=409, detail="User already a member")
    await db.execute(
        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')",
        team_id, user["id"]
    )
    return {"success": True}


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: int,
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    member = await _check_team_access(team_id, current_user["id"], db)
    if member["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can remove members")
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
            "SELECT * FROM skill_profiles WHERE candidate_id = $1 ORDER BY confidence_score DESC LIMIT 6",
            row["id"]
        )
        result.append({**dict(row), "skills": [dict(s) for s in skills]})
    return result


@router.post("/{team_id}/save")
async def team_save_candidate(
    team_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db)
    await db.execute(
        """INSERT INTO team_saved_candidates (team_id, candidate_id, saved_by, notes, status)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (team_id, candidate_id) DO UPDATE SET
               notes = EXCLUDED.notes, status = EXCLUDED.status""",
        team_id, body.get("candidate_id"), current_user["id"],
        body.get("notes", ""), body.get("status", "reviewing")
    )
    return {"success": True}


@router.patch("/{team_id}/save/{candidate_id}")
async def team_update_saved(
    team_id: int,
    candidate_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db)
    if body.get("notes") is not None:
        await db.execute(
            "UPDATE team_saved_candidates SET notes = $1 WHERE team_id = $2 AND candidate_id = $3",
            body["notes"], team_id, candidate_id
        )
    if body.get("status") is not None:
        await db.execute(
            "UPDATE team_saved_candidates SET status = $1 WHERE team_id = $2 AND candidate_id = $3",
            body["status"], team_id, candidate_id
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


@router.post("/{team_id}/report")
async def download_team_report(
    team_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await _check_team_access(team_id, current_user["id"], db)
    team = await db.fetchrow("SELECT * FROM teams WHERE id = $1", team_id)
    candidate_ids = body.get("candidate_ids", [])

    if candidate_ids:
        rows = await db.fetch(
            """SELECT c.*, tsc.notes, tsc.status, tsc.saved_at, u.name as saved_by_name
               FROM team_saved_candidates tsc
               JOIN candidates c ON c.id = tsc.candidate_id
               JOIN users u ON u.id = tsc.saved_by
               WHERE tsc.team_id = $1 AND c.id = ANY($2::int[])
               ORDER BY tsc.saved_at DESC""",
            team_id, candidate_ids
        )
    else:
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
        headers={"Content-Disposition": f"attachment; filename=SkillsLedger-{team['name']}-report.pdf"}
    )


def _generate_pdf(team_name: str, candidates: list) -> BytesIO:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=20*mm, leftMargin=20*mm,
                            topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle("title", fontSize=24, fontName="Helvetica-Bold",
                                  textColor=colors.HexColor("#1d4ed8"), alignment=TA_CENTER)
    sub_style = ParagraphStyle("sub", fontSize=12, fontName="Helvetica",
                                textColor=colors.grey, alignment=TA_CENTER)
    story.append(Paragraph("SkillsLedger", title_style))
    story.append(Paragraph(f"Team Report: {team_name}", sub_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", sub_style))
    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 6*mm))

    if not candidates:
        story.append(Paragraph("No candidates selected.", styles["Normal"]))
    else:
        for c in candidates:
            info = c["info"]
            skills = c["skills"]

            name_style = ParagraphStyle("name", fontSize=14, fontName="Helvetica-Bold",
                                         textColor=colors.HexColor("#1e293b"))
            story.append(Paragraph(info.get("display_name") or info["github_username"], name_style))

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

            if skills:
                skill_data = [["Skill", "Category", "Confidence", "Repos", "Last Used"]]
                for s in skills:
                    skill_data.append([
                        s["skill_name"],
                        s["category"],
                        f"{s['confidence_score']}%",
                        str(s["repo_count"]),
                        s.get("last_used") or "-"
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
