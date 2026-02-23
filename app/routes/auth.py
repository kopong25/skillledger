from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
from app.database import get_db
from app.models.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
from app.middleware.auth import hash_password, verify_password, create_token, get_current_user
import traceback

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: aiosqlite.Connection = Depends(get_db)):
    try:
        email = body.email.lower().strip()

        async with db.execute("SELECT id FROM users WHERE email = ?", (email,)) as cur:
            if await cur.fetchone():
                raise HTTPException(status_code=409, detail="Email already registered")

        password_hash = hash_password(body.password)
        async with db.execute(
            "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
            (email, password_hash, body.name),
        ) as cur:
            user_id = cur.lastrowid

        token = create_token({"id": user_id, "email": email, "name": body.name})
        return {
            "token": token,
            "user": {"id": user_id, "email": email, "name": body.name, "role": "recruiter"}
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"REGISTER ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login")
async def login(body: LoginRequest, db: aiosqlite.Connection = Depends(get_db)):
    try:
        email = body.email.lower().strip()

        async with db.execute("SELECT * FROM users WHERE email = ?", (email,)) as cur:
            row = await cur.fetchone()

        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_token({"id": row["id"], "email": row["email"], "name": row["name"]})
        return {
            "token": token,
            "user": {"id": row["id"], "email": row["email"], "name": row["name"], "role": row["role"]}
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"LOGIN ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user), db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        "SELECT id, email, name, role, created_at FROM users WHERE id = ?",
        (current_user["id"],),
    ) as cur:
        row = await cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    return dict(row)