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

    # Fetch company settings for the current user
    company = await db.fetchrow(
        "SELECT * FROM company_settings WHERE user_id = $1", current_user["id"]
    )
    company_settings = dict(company) if company else {}

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

    pdf_buffer = _generate_pdf(team["name"], candidates, company_settings)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=SkillsLedger-{team['name']}-report.pdf"}
    )


def _generate_pdf(team_name: str, candidates: list, company: dict) -> BytesIO:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    import base64
    from io import BytesIO as BIO

    BLUE_DARK   = colors.HexColor("#1d4ed8")
    BLUE_LIGHT  = colors.HexColor("#eff6ff")
    SLATE_DARK  = colors.HexColor("#1e293b")
    SLATE_MID   = colors.HexColor("#475569")
    SLATE_LIGHT = colors.HexColor("#94a3b8")
    BORDER      = colors.HexColor("#e2e8f0")
    ROW_ALT     = colors.HexColor("#f8fafc")
    WHITE       = colors.white

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=22*mm, leftMargin=22*mm,
        topMargin=22*mm, bottomMargin=22*mm
    )
    story = []

    # ── BUILD COMPANY BRANDING (top-right) ────────────────────────────────────
    company_lines = []

    # Logo
    logo_element = None
    logo_b64 = company.get("logo_base64", "")
    if logo_b64 and "," in logo_b64:
        try:
            img_data = base64.b64decode(logo_b64.split(",", 1)[1])
            img_buffer = BIO(img_data)
            logo_element = Image(img_buffer, width=28*mm, height=14*mm, kind="proportional")
            logo_element.hAlign = "RIGHT"
        except Exception:
            logo_element = None

    if company.get("company_name"):
        company_lines.append(
            f'<font size="10" color="#1e293b"><b>{company["company_name"]}</b></font>'
        )
    if company.get("address"):
        for line in company["address"].strip().split("\n"):
            company_lines.append(f'<font size="8" color="#94a3b8">{line.strip()}</font>')
    if company.get("phone"):
        company_lines.append(f'<font size="8" color="#94a3b8">{company["phone"]}</font>')
    if company.get("contact_email"):
        company_lines.append(f'<font size="8" color="#94a3b8">{company["contact_email"]}</font>')
    if company.get("website"):
        company_lines.append(f'<font size="8" color="#3b82f6">{company["website"]}</font>')

    right_col_items = []
    if logo_element:
        right_col_items.append(logo_element)
        right_col_items.append(Spacer(1, 2*mm))
    for line in company_lines:
        right_col_items.append(
            Paragraph(line, ParagraphStyle("cl", fontName="Helvetica", fontSize=8,
                                           alignment=TA_RIGHT, leading=12))
        )

    # ── HEADER BANNER ─────────────────────────────────────────────────────────
    # Left: SkillsLedger title + date
    left_cell = [
        Paragraph(
            '<font size="22" color="#1d4ed8"><b>SkillsLedger</b></font>',
            ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=22,
                           textColor=BLUE_DARK, alignment=TA_LEFT)
        ),
        Spacer(1, 2*mm),
        Paragraph(
            f'<font size="9" color="#94a3b8">Generated {datetime.now().strftime("%B %d, %Y")}</font>',
            ParagraphStyle("date", fontName="Helvetica", fontSize=9,
                           textColor=SLATE_LIGHT, alignment=TA_LEFT)
        ),
    ]

    if right_col_items:
        header_data = [[left_cell, right_col_items]]
        header_table = Table(header_data, colWidths=[95*mm, 71*mm])
    else:
        header_data = [[left_cell,
            Paragraph(
                f'<font size="9" color="#94a3b8">Generated {datetime.now().strftime("%B %d, %Y")}</font>',
                ParagraphStyle("date2", fontName="Helvetica", fontSize=9,
                               textColor=SLATE_LIGHT, alignment=TA_RIGHT)
            )
        ]]
        header_table = Table(header_data, colWidths=[110*mm, 56*mm])

    header_table.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6*mm))

    # Subtitle
    story.append(Paragraph(
        f'Team Report &mdash; <b>{team_name}</b>',
        ParagraphStyle("subtitle", fontName="Helvetica", fontSize=12,
                       textColor=SLATE_MID, alignment=TA_LEFT)
    ))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BLUE_DARK))
    story.append(Spacer(1, 8*mm))

    # ── CANDIDATE COUNT ────────────────────────────────────────────────────────
    story.append(Paragraph(
        f'{len(candidates)} Candidate{"s" if len(candidates) != 1 else ""} in this report',
        ParagraphStyle("count", fontName="Helvetica", fontSize=9,
                       textColor=SLATE_LIGHT, alignment=TA_LEFT)
    ))
    story.append(Spacer(1, 5*mm))

    if not candidates:
        story.append(Paragraph(
            "No candidates selected.",
            ParagraphStyle("empty", fontName="Helvetica", fontSize=11, textColor=SLATE_MID)
        ))
    else:
        for idx, c in enumerate(candidates, 1):
            info   = c["info"]
            skills = c["skills"]

            display = info.get("display_name") or info["github_username"]
            status  = (info.get("status") or "reviewing").capitalize()
            status_color = {
                "Hired":       "#16a34a",
                "Reviewing":   "#d97706",
                "Rejected":    "#dc2626",
                "Shortlisted": "#7c3aed",
            }.get(status, "#475569")

            name_status = [[
                Paragraph(
                    f'<font size="13"><b>{display}</b></font>',
                    ParagraphStyle("cn", fontName="Helvetica-Bold", fontSize=13,
                                   textColor=SLATE_DARK, alignment=TA_LEFT)
                ),
                Paragraph(
                    f'<font size="8" color="{status_color}"><b>{status}</b></font>',
                    ParagraphStyle("cs", fontName="Helvetica-Bold", fontSize=8,
                                   textColor=colors.HexColor(status_color), alignment=TA_RIGHT)
                )
            ]]
            ns_table = Table(name_status, colWidths=[110*mm, 56*mm])
            ns_table.setStyle(TableStyle([
                ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING",   (0, 0), (-1, -1), 0),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
                ("TOPPADDING",    (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            story.append(ns_table)
            story.append(Spacer(1, 1.5*mm))

            gh_url = info.get("github_url", "")
            story.append(Paragraph(
                f'<a href="{gh_url}"><font color="#3b82f6" size="9">{gh_url}</font></a>',
                ParagraphStyle("link", fontName="Helvetica", fontSize=9)
            ))
            story.append(Spacer(1, 1.5*mm))

            meta_parts = []
            if info.get("public_repos") is not None:
                meta_parts.append(f"{info['public_repos']} repos")
            if info.get("followers") is not None:
                meta_parts.append(f"{info['followers']} followers")
            if info.get("saved_by_name"):
                meta_parts.append(f"Saved by {info['saved_by_name']}")
            story.append(Paragraph(
                " · ".join(meta_parts),
                ParagraphStyle("meta", fontName="Helvetica", fontSize=8, textColor=SLATE_LIGHT)
            ))
            story.append(Spacer(1, 4*mm))

            if skills:
                skill_data = [[
                    Paragraph("<b>Skill</b>",      ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE)),
                    Paragraph("<b>Category</b>",   ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE)),
                    Paragraph("<b>Confidence</b>", ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE)),
                    Paragraph("<b>Repos</b>",      ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE)),
                    Paragraph("<b>Last Used</b>",  ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE)),
                ]]
                for s in skills:
                    skill_data.append([
                        Paragraph(s["skill_name"],              ParagraphStyle("td", fontName="Helvetica",      fontSize=8, textColor=SLATE_DARK)),
                        Paragraph(s.get("category") or "-",    ParagraphStyle("td", fontName="Helvetica",      fontSize=8, textColor=SLATE_MID)),
                        Paragraph(f"{s['confidence_score']}%", ParagraphStyle("td", fontName="Helvetica-Bold", fontSize=8, textColor=BLUE_DARK)),
                        Paragraph(str(s["repo_count"]),        ParagraphStyle("td", fontName="Helvetica",      fontSize=8, textColor=SLATE_MID)),
                        Paragraph(str(s.get("last_used") or "-"), ParagraphStyle("td", fontName="Helvetica",   fontSize=8, textColor=SLATE_MID)),
                    ])
                table = Table(skill_data, colWidths=[46*mm, 34*mm, 28*mm, 18*mm, 40*mm])
                table.setStyle(TableStyle([
                    ("BACKGROUND",     (0, 0), (-1, 0),  BLUE_DARK),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, ROW_ALT]),
                    ("GRID",           (0, 0), (-1, -1), 0.4, BORDER),
                    ("TOPPADDING",     (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING",  (0, 0), (-1, -1), 5),
                    ("LEFTPADDING",    (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING",   (0, 0), (-1, -1), 6),
                    ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
                ]))
                story.append(table)
                story.append(Spacer(1, 3*mm))

            if info.get("notes"):
                notes_box = [[
                    Paragraph(
                        f'<b>Notes:</b> {info["notes"]}',
                        ParagraphStyle("notes", fontName="Helvetica", fontSize=8, textColor=SLATE_MID)
                    )
                ]]
                notes_table = Table(notes_box, colWidths=[166*mm])
                notes_table.setStyle(TableStyle([
                    ("BACKGROUND",   (0, 0), (-1, -1), BLUE_LIGHT),
                    ("LEFTPADDING",  (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING",   (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
                ]))
                story.append(notes_table)
                story.append(Spacer(1, 3*mm))

            story.append(Spacer(1, 3*mm))
            story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
            story.append(Spacer(1, 7*mm))

    # ── FOOTER ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 4*mm))
    footer_text = "Generated by SkillsLedger · Confidential"
    if company.get("company_name"):
        footer_text = f"{company['company_name']} · {footer_text}"
    story.append(Paragraph(
        footer_text,
        ParagraphStyle("footer", fontName="Helvetica", fontSize=8,
                       textColor=SLATE_LIGHT, alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
