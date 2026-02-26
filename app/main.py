from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from app.routes import auth, candidates, teams  # add teams here
import pathlib

from app.config import get_settings
from app.database import init_db
from app.routes import auth, candidates

app.include_router(teams.router, prefix="/api")

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print(f"SkillLedger started — GitHub token: {'SET' if settings.github_token else 'NOT SET'}")
    yield


app = FastAPI(
    title="SkillLedger API",
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