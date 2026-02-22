from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import pathlib

from app.config import get_settings
from app.database import init_db
from app.routes import auth, candidates
from app.models.schemas import HealthResponse

settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events."""
    await init_db()
    print(f"""
  ┌────────────────────────────────────────────────┐
  │             SkillLedger API                    │
  │  Env:    {settings.environment:<35} │
  │  GitHub: {"Token set ✓" if settings.github_token else "No token (60 req/hr)  ":<35} │
  │  Docs:   /docs  |  /redoc                      │
  └────────────────────────────────────────────────┘
    """)
    yield


app = FastAPI(
    title="SkillLedger API",
    description="""
## Real-Time Skill Intelligence for Global Tech Hiring

Analyze any GitHub profile and get tamper-proof confidence scores
derived from real commits, pull requests, and code activity.

### Authentication
All protected endpoints require a Bearer token:
```
Authorization: Bearer <token>
```
Get your token via `/api/auth/register` or `/api/auth/login`.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
is_dev = settings.environment != "production"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"] if is_dev else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health():
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
        has_github_token=bool(settings.github_token),
        version=settings.version,
    )


# Serve React frontend in production
CLIENT_DIST = pathlib.Path(__file__).parent.parent / "client" / "dist"

if CLIENT_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(CLIENT_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = CLIENT_DIST / "index.html"
        return FileResponse(str(index))
