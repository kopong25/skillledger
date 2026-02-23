import aiosqlite
import os


def get_db_path() -> str:
    return os.environ.get("DB_PATH", "/tmp/skillledger.db")


async def get_db():
    db = await aiosqlite.connect(get_db_path())
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()


async def init_db():
    db_path = get_db_path()
    print(f"Initializing database at: {db_path}")

    async with aiosqlite.connect(db_path) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'recruiter',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                github_username TEXT UNIQUE NOT NULL,
                display_name TEXT,
                avatar_url TEXT,
                bio TEXT,
                location TEXT,
                public_repos INTEGER DEFAULT 0,
                followers INTEGER DEFAULT 0,
                github_url TEXT,
                analyzed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS skill_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                skill_name TEXT NOT NULL,
                confidence_score INTEGER NOT NULL,
                commit_count INTEGER DEFAULT 0,
                repo_count INTEGER DEFAULT 0,
                last_used TEXT,
                evidence TEXT,
                category TEXT DEFAULT 'language',
                FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS saved_candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                candidate_id INTEGER NOT NULL,
                notes TEXT DEFAULT '',
                status TEXT DEFAULT 'reviewing',
                saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, candidate_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_candidates_github ON candidates(github_username);
            CREATE INDEX IF NOT EXISTS idx_skills_candidate ON skill_profiles(candidate_id);
            CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_candidates(user_id);
        """)
        await db.commit()
    print("Database initialized successfully")
