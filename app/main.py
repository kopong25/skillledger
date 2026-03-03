from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from app.routes import auth, candidates, teams, admin, settings as settings_route
import pathlib
from app.config import get_settings
from app.database import init_db, get_db

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print(f"SkillsLedger started — GitHub token: {'SET' if settings.github_token else 'NOT SET'}")
    yield


app = FastAPI(
    title="SkillsLedger API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ──
app.include_router(auth.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(settings_route.router, prefix="/api")


# ── TEMPORARY ROUTE - DELETE AFTER VISITING ──
@app.get("/api/migrate-company-settings-secret")
async def migrate_company(db=Depends(get_db)):
    await db.execute("""
        CREATE TABLE IF NOT EXISTS company_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            company_name TEXT DEFAULT '',
            logo_url TEXT DEFAULT '',
            website TEXT DEFAULT '',
            contact_email TEXT DEFAULT '',
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    return {"done": True}


@app.get("/api/migrate-company-settings-v2-secret")
async def migrate_company_v2(db=Depends(get_db)):
    await db.execute("ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS logo_base64 TEXT DEFAULT ''")
    await db.execute("ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''")
    await db.execute("ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''")
    return {"done": True}
# ── END TEMPORARY ROUTES ──


@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "has_github_token": bool(settings.github_token),
        "version": settings.version,
    }


# ── Serve React SPA (AFTER all API routes) ──
CLIENT_DIST = pathlib.Path(__file__).parent.parent / "client" / "dist"
if CLIENT_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(CLIENT_DIST / "assets")), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    index = CLIENT_DIST / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse({"error": "Frontend not built"}, status_code=503)