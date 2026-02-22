# SkillLedger — FastAPI Edition

**Real-Time Skill Intelligence for Global Tech Hiring**

Built with **Python + FastAPI** — includes auto-generated Swagger docs at `/docs`.

---

## 🚀 Deploy to Render (One-Click)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/skillledger.git
git push -u origin main
```

### Step 2: Connect to Render
1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repository
3. Render reads `render.yaml` automatically — no manual config needed

### Step 3: Set Environment Variables in Render
| Variable | How to set |
|---|---|
| `JWT_SECRET` | Click **"Generate"** — Render handles it |
| `GITHUB_TOKEN` | Paste your GitHub token (see below) |

**Done.** Render builds and deploys in ~3 minutes.

---

## 🔑 Getting a GitHub Token (Highly Recommended)

Without a token: **60 requests/hour** (runs out fast)
With a token: **5,000 requests/hour**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Select scopes: ✅ `public_repo`  ✅ `read:user`
4. Copy the token → paste into Render as `GITHUB_TOKEN`

---

## 💻 Local Development

```bash
# 1. Clone the repo
git clone <your-repo>
cd skillledger

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Set up environment
cp .env.example .env
# Edit .env — add JWT_SECRET and optionally GITHUB_TOKEN

# 5. Run the FastAPI server
uvicorn app.main:app --reload --port 8000

# 6. In a separate terminal — run the React frontend
cd client
npm install
npm run dev
```

- **API:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Frontend:** http://localhost:5173

---

## 📁 Project Structure

```
skillledger/
├── app/
│   ├── main.py              # FastAPI app, CORS, lifespan, SPA serving
│   ├── config.py            # Settings (pydantic-settings, reads .env)
│   ├── database.py          # SQLite init + async connection
│   ├── routes/
│   │   ├── auth.py          # POST /register, /login, GET /me
│   │   └── candidates.py    # POST /analyze, GET /saved, GET /:username
│   ├── services/
│   │   └── github.py        # GitHub API client + skill scoring engine
│   ├── middleware/
│   │   └── auth.py          # JWT create/verify, bcrypt, get_current_user
│   └── models/
│       └── schemas.py       # Pydantic request/response models
├── client/                  # React 18 + Vite + Tailwind (unchanged)
│   └── src/
│       ├── pages/           # Landing, Dashboard, Saved, CandidateProfile
│       ├── components/      # Navbar, SkillCard, CandidateCard
│       ├── hooks/           # useAuth context
│       └── utils/           # API client
├── run.py                   # Uvicorn production entry point
├── render.yaml              # Render deployment blueprint
├── requirements.txt
└── .env.example
```

---

## 📊 Skill Scoring Algorithm

For each GitHub user, SkillLedger:

1. Fetches up to **100 non-fork repos** sorted by last push date
2. Analyzes **language byte counts** across all repos
3. Detects **frameworks** from `package.json`, `requirements.txt`, repo topics
4. Measures **commit activity** in the last 12 months per language
5. Computes a **confidence score**:

```python
confidence = (
    byte_share    * 0.25 +   # How much of total code is this language?
    repo_score    * 0.30 +   # How many recent repos use it?
    commit_score  * 0.30 +   # How active are commits in the last year?
    recency_score * 0.15     # How recently was it used?
) * 120  # scaled 0–98%
```

| Score | Label |
|---|---|
| 80–98% | Expert |
| 60–79% | Proficient |
| 40–59% | Familiar |
| 5–39% | Exposure |

Results cached **24 hours** in SQLite per username to stay within GitHub rate limits.

---

## 🌐 API Endpoints

Full interactive docs at `/docs` (Swagger UI).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Get JWT token |
| GET | `/api/auth/me` | ✅ | Current user info |
| POST | `/api/candidates/analyze` | ✅ | Analyze GitHub username |
| GET | `/api/candidates/saved` | ✅ | Get saved candidates |
| POST | `/api/candidates/save` | ✅ | Save a candidate |
| PATCH | `/api/candidates/save/{id}` | ✅ | Update status/notes |
| DELETE | `/api/candidates/save/{id}` | ✅ | Remove from saved |
| GET | `/api/candidates/{username}` | ✅ | Full candidate profile |
| GET | `/api/health` | ❌ | Health check |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI + Uvicorn |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Database | SQLite via aiosqlite (async) |
| GitHub API | PyGithub |
| Validation | Pydantic v2 |
| Rate Limiting | slowapi |
| Frontend | React 18 + Vite + Tailwind CSS |
| Deployment | Render (with persistent disk) |

---

## 📈 Roadmap

- [ ] GitLab + Bitbucket support
- [ ] ATS integrations (Greenhouse, Lever)
- [ ] Side-by-side candidate comparison
- [ ] PDF skill report export
- [ ] ML-based scoring using scikit-learn
- [ ] Team/organization accounts
