from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    token: str
    user: UserOut


# ── Candidates ────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def clean_username(cls, v):
        return v.strip().lstrip("@")


class SkillOut(BaseModel):
    id: Optional[int] = None
    skill_name: str
    confidence_score: int
    commit_count: int
    repo_count: int
    last_used: Optional[str]
    evidence: Optional[str]
    category: str


class CandidateOut(BaseModel):
    id: int
    github_username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    public_repos: int
    followers: int
    github_url: Optional[str]
    analyzed_at: Optional[str]


class AnalyzeResponse(BaseModel):
    candidate: CandidateOut
    skills: List[SkillOut]
    cached: bool


class SaveRequest(BaseModel):
    candidate_id: int
    notes: Optional[str] = ""
    status: Optional[str] = "reviewing"


class UpdateSavedRequest(BaseModel):
    notes: Optional[str] = None
    status: Optional[str] = None


class SavedCandidateOut(BaseModel):
    id: int
    github_username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    public_repos: int
    followers: int
    notes: Optional[str]
    status: Optional[str]
    saved_at: Optional[str]
    skills: List[SkillOut] = []


class CandidateDetailResponse(BaseModel):
    candidate: CandidateOut
    skills: List[SkillOut]
    saved: Optional[dict] = None


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    has_github_token: bool
    version: str
