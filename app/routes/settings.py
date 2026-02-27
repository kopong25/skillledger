from fastapi import APIRouter, Depends
import asyncpg
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = ""
    logo_url: Optional[str] = ""
    website: Optional[str] = ""
    contact_email: Optional[str] = ""


@router.get("/company")
async def get_company_settings(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM company_settings WHERE user_id = $1", current_user["id"]
    )
    if not row:
        return {"company_name": "", "logo_url": "", "website": "", "contact_email": ""}
    return dict(row)


@router.put("/company")
async def update_company_settings(
    body: CompanySettingsUpdate,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    await db.execute(
        """INSERT INTO company_settings (user_id, company_name, logo_url, website, contact_email, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (user_id) DO UPDATE SET
               company_name = EXCLUDED.company_name,
               logo_url = EXCLUDED.logo_url,
               website = EXCLUDED.website,
               contact_email = EXCLUDED.contact_email,
               updated_at = NOW()""",
        current_user["id"],
        body.company_name or "",
        body.logo_url or "",
        body.website or "",
        body.contact_email or "",
    )
    return {"success": True}
