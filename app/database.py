import asyncpg
import os
from typing import AsyncGenerator

_pool = None

async def get_pool():
    global _pool
    if _pool is None:
        database_url = os.environ.get("DATABASE_URL", "")
        if not database_url:
            raise RuntimeError("DATABASE_URL environment variable not set")
        try:
            _pool = await asyncpg.create_pool(database_url, min_size=1, max_size=5)
        except Exception as e:
            print(f"DATABASE CONNECTION ERROR: {e}")
            raise
    return _pool

async def get_db() -> AsyncGenerator:
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn

async def init_db():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'recruiter',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS candidates (
                id SERIAL PRIMARY KEY,
                github_username TEXT UNIQUE NOT NULL,
                display_name TEXT,
                avatar_url TEXT,
                bio TEXT,
                location TEXT,
                public_repos INTEGER DEFAULT 0,
                followers INTEGER DEFAULT 0,
                github_url TEXT,
                analyzed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS skill_profiles (
                id SERIAL PRIMARY KEY,
                candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                skill_name TEXT NOT NULL,
                confidence_score INTEGER NOT NULL,
                commit_count INTEGER DEFAULT 0,
                repo_count INTEGER DEFAULT 0,
                last_used TEXT,
                evidence TEXT,
                category TEXT DEFAULT 'language'
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_candidates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                notes TEXT DEFAULT '',
                status TEXT DEFAULT 'reviewing',
                saved_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, candidate_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS teams (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS team_members (
                id SERIAL PRIMARY KEY,
                team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role TEXT DEFAULT 'member',
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(team_id, user_id)
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS team_saved_candidates (
                id SERIAL PRIMARY KEY,
                team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                saved_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                notes TEXT DEFAULT '',
                status TEXT DEFAULT 'reviewing',
                saved_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(team_id, candidate_id)
            )
        """)
        await conn.execute("""
    CREATE TABLE IF NOT EXISTS company_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        company_name TEXT DEFAULT '',
        logo_base64 TEXT DEFAULT '',
        website TEXT DEFAULT '',
        contact_email TEXT DEFAULT '',
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
         )
       """)

      # Add missing columns to existing deployments
      for col, col_type in [
          ("logo_base64", "TEXT DEFAULT ''"),
          ("address",     "TEXT DEFAULT ''"),
          ("phone",       "TEXT DEFAULT ''"),
        ]:
    await conn.execute(f"""
        ALTER TABLE company_settings
        ADD COLUMN IF NOT EXISTS {col} {col_type}
    """)
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_candidates_github ON candidates(github_username)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_skills_candidate ON skill_profiles(candidate_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_candidates(user_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_team_members ON team_members(team_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_team_saved ON team_saved_candidates(team_id)")
    print("Database initialized successfully")
