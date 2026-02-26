#!/usr/bin/env python3
"""
AgentHire v2.0 — CGI-bin Backend API
AI-powered hiring marketplace with trust scoring, agent matching, and pipeline management.
"""

import base64
import hashlib
import json
import os
import random
import re
import sqlite3
import sys
import time
import urllib.parse

# ---------------------------------------------------------------------------
# DB path
# ---------------------------------------------------------------------------
DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "agenthire.db",
)

# ---------------------------------------------------------------------------
# Custom exception for early returns
# ---------------------------------------------------------------------------
class ApiResp(Exception):
    def __init__(self, status: int, body: dict):
        self.status = status
        self.body = body
        super().__init__(str(body))


# ---------------------------------------------------------------------------
# CORS / response helpers
# ---------------------------------------------------------------------------
CORS_HEADERS = (
    "Access-Control-Allow-Origin: *\r\n"
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH\r\n"
    "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With\r\n"
    "Access-Control-Max-Age: 86400\r\n"
)


def send(status: int, body: dict):
    """Print HTTP response to stdout and flush."""
    payload = json.dumps(body, default=str)
    sys.stdout.write(f"Status: {status}\r\n")
    sys.stdout.write("Content-Type: application/json\r\n")
    sys.stdout.write(CORS_HEADERS)
    sys.stdout.write("\r\n")
    sys.stdout.write(payload)
    sys.stdout.flush()


def ok(body: dict, status: int = 200):
    raise ApiResp(status, body)


def err(status: int, msg: str):
    raise ApiResp(status, {"error": msg})


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------
def make_token(user_id: int) -> str:
    raw = f"{user_id}:{int(time.time())}"
    return base64.b64encode(raw.encode()).decode()


def decode_token(token: str):
    """Return user_id (int) or None."""
    try:
        raw = base64.b64decode(token.encode()).decode()
        parts = raw.split(":")
        return int(parts[0])
    except Exception:
        return None


def get_auth_user(db, req_headers: dict):
    """Parse Authorization header, return user row as dict or None."""
    auth = req_headers.get("HTTP_AUTHORIZATION", os.environ.get("HTTP_AUTHORIZATION", ""))
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
    else:
        token = auth.strip()
    if not token:
        return None
    uid = decode_token(token)
    if uid is None:
        return None
    return fetchone_dict(db, "SELECT * FROM users WHERE id=?", (uid,))


def require_auth(db, req_headers: dict):
    user = get_auth_user(db, req_headers)
    if not user:
        err(401, "Authentication required")
    return user


# ---------------------------------------------------------------------------
# SQLite helpers
# ---------------------------------------------------------------------------
def dict_row(cursor, row):
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


def fetchall_dict(db, sql, params=()):
    cur = db.execute(sql, params)
    if cur.description is None:
        return []
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def fetchone_dict(db, sql, params=()):
    cur = db.execute(sql, params)
    if cur.description is None:
        return None
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ---------------------------------------------------------------------------
# Schema creation
# ---------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'candidate',
    email_verified INTEGER DEFAULT 0,
    phone_verified INTEGER DEFAULT 0,
    linkedin_url TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT,
    two_fa_enabled INTEGER DEFAULT 0,
    notifications_enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    title TEXT,
    summary TEXT,
    skills TEXT DEFAULT '[]',
    experience_years INTEGER DEFAULT 0,
    salary_min INTEGER DEFAULT 0,
    salary_max INTEGER DEFAULT 0,
    work_preference TEXT DEFAULT 'Remote',
    availability TEXT DEFAULT 'actively_looking',
    location TEXT,
    education TEXT,
    certifications TEXT DEFAULT '[]',
    languages TEXT DEFAULT '["English"]',
    github_url TEXT,
    portfolio_url TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recruiter_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    company_id INTEGER,
    title TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT,
    industry TEXT,
    size TEXT,
    stage TEXT,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    headquarters TEXT,
    founded_year INTEGER,
    tech_stack TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    recruiter_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT DEFAULT '[]',
    nice_to_have_skills TEXT DEFAULT '[]',
    salary_min INTEGER NOT NULL,
    salary_max INTEGER NOT NULL,
    work_model TEXT DEFAULT 'Remote',
    location TEXT,
    min_experience INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (recruiter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    confidence TEXT NOT NULL,
    match_reasons TEXT DEFAULT '[]',
    pipeline_stage TEXT DEFAULT 'new',
    candidate_action TEXT DEFAULT 'pending',
    recruiter_action TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_id, job_id),
    FOREIGN KEY (candidate_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS agent_negotiation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    speaker TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS agent_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity TEXT NOT NULL,
    activity_type TEXT DEFAULT 'info',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS trust_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    trust_score INTEGER DEFAULT 50,
    identity_score INTEGER DEFAULT 0,
    behavioral_score INTEGER DEFAULT 0,
    content_score INTEGER DEFAULT 0,
    response_rate REAL DEFAULT 0.5,
    ghost_count INTEGER DEFAULT 0,
    job_quality_avg REAL DEFAULT 0.5,
    company_domain_match INTEGER DEFAULT 0,
    skills_consistent INTEGER DEFAULT 1,
    profile_completeness INTEGER DEFAULT 0,
    corporate_email INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    report_type TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (reporter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS privacy_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    show_salary INTEGER DEFAULT 1,
    show_current_employer INTEGER DEFAULT 0,
    show_contact INTEGER DEFAULT 0,
    show_location INTEGER DEFAULT 1,
    profile_visibility TEXT DEFAULT 'verified_recruiters',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    uses INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS agent_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    aggressiveness REAL DEFAULT 0.7,
    priority_skills REAL DEFAULT 0.40,
    priority_salary REAL DEFAULT 0.25,
    priority_location REAL DEFAULT 0.15,
    priority_experience REAL DEFAULT 0.20,
    auto_decline_threshold INTEGER DEFAULT 55,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_name TEXT NOT NULL,
    badge_icon TEXT NOT NULL,
    description TEXT,
    earned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    draft_type TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, draft_type),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""


def init_db(db):
    for stmt in SCHEMA.strip().split(";"):
        s = stmt.strip()
        if s:
            db.execute(s)
    db.commit()


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Matching algorithm
# ---------------------------------------------------------------------------
def ranges_overlap(cmin, cmax, jmin, jmax):
    return not (cmax < jmin or cmin > jmax)


def calculate_match(candidate: dict, job: dict) -> dict:
    seed_str = f"{candidate['user_id']}_{job['id']}"
    seed_val = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**31)
    rng = random.Random(seed_val)

    cand_skills = set(json.loads(candidate.get("skills", "[]")))
    job_req = set(json.loads(job.get("required_skills", "[]")))

    if len(job_req) > 0:
        skills_overlap = len(cand_skills & job_req) / len(job_req)
    else:
        skills_overlap = 0.5

    salary_fit = 1.0 if ranges_overlap(
        candidate.get("salary_min", 0), candidate.get("salary_max", 999999),
        job.get("salary_min", 0), job.get("salary_max", 999999)
    ) else 0.3

    cand_pref = (candidate.get("work_preference") or "Remote").lower()
    job_model = (job.get("work_model") or "Remote").lower()
    location_fit = 1.0 if cand_pref == job_model else 0.6

    min_exp = max(job.get("min_experience", 3) or 3, 1)
    experience_fit = min((candidate.get("experience_years", 0) or 0) / min_exp, 1.0)

    noise = rng.uniform(-0.05, 0.05)

    raw = (
        skills_overlap * 0.40
        + salary_fit * 0.25
        + location_fit * 0.15
        + experience_fit * 0.20
        + noise
    )
    score = min(max(int(raw * 100), 45), 98)

    # Confidence tier
    if score >= 85:
        confidence = "High"
    elif score >= 70:
        confidence = "Moderate"
    else:
        confidence = "Exploratory"

    # Match reasons
    reasons = []
    matched_skills = list(cand_skills & job_req)
    if matched_skills:
        skill_str = " + ".join(matched_skills[:3])
        reasons.append(f"Strong {skill_str} overlap")
    if salary_fit == 1.0:
        reasons.append(
            f"Salary range aligned (${candidate.get('salary_min', 0)//1000}k-${candidate.get('salary_max', 0)//1000}k fits ${job.get('salary_min', 0)//1000}k-${job.get('salary_max', 0)//1000}k)"
        )
    else:
        reasons.append("Salary expectations partially outside range — negotiable")
    if location_fit == 1.0:
        reasons.append(f"{candidate.get('work_preference', 'Remote')} work preference matches role")
    else:
        reasons.append("Work model flexible — open to discussion")
    if experience_fit >= 0.9:
        reasons.append(f"{candidate.get('experience_years', 0)} years experience meets role requirements")
    if skills_overlap >= 0.6:
        reasons.append(f"{int(skills_overlap*100)}% skills match with required stack")
    if len(reasons) < 3:
        reasons.append("Agent identified strong mutual interest signals")

    return {"score": score, "confidence": confidence, "reasons": reasons[:5]}


# ---------------------------------------------------------------------------
# Trust score calculation
# ---------------------------------------------------------------------------
def calculate_trust(user: dict, tp: dict, profile: dict) -> dict:
    identity = 0
    if user.get("email_verified"):
        identity += 15
    email = user.get("email", "")
    free_domains = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"}
    domain = email.split("@")[-1].lower() if "@" in email else ""
    if domain and domain not in free_domains:
        identity += 10
    if user.get("linkedin_url"):
        identity += 5
    if user.get("phone_verified"):
        identity += 5

    behavioral = 0
    rr = float(tp.get("response_rate", 0.5) or 0.5)
    behavioral += min(int(rr * 20), 20)
    gc = int(tp.get("ghost_count", 0) or 0)
    behavioral += max(0, 15 - gc * 5)

    content = 0
    if user.get("role") == "recruiter":
        jqa = float(tp.get("job_quality_avg", 0.5) or 0.5)
        content += min(int(jqa * 15), 15)
        if tp.get("company_domain_match"):
            content += 15
    else:
        pc = int(tp.get("profile_completeness", 0) or 0)
        content += min(int(pc / 100 * 20), 20)
        if tp.get("skills_consistent"):
            content += 10

    total = identity + behavioral + content
    return {
        "total": total,
        "identity": identity,
        "behavioral": behavioral,
        "content": content,
        "breakdown": {
            "email_verified": bool(user.get("email_verified")),
            "corporate_email": domain not in free_domains,
            "linkedin_connected": bool(user.get("linkedin_url")),
            "phone_verified": bool(user.get("phone_verified")),
            "response_rate": rr,
            "ghost_count": gc,
        },
    }


# ---------------------------------------------------------------------------
# Profile completeness
# ---------------------------------------------------------------------------
def profile_completeness(user: dict, profile: dict) -> dict:
    checks = []
    score = 0

    def chk(name, cond, pts, tip):
        nonlocal score
        ok_ = bool(cond)
        checks.append({"field": name, "complete": ok_, "points": pts, "suggestion": tip if not ok_ else None})
        if ok_:
            score += pts

    chk("Name", user.get("name"), 10, "Add your full name")
    chk("Email verified", user.get("email_verified"), 10, "Verify your email address")
    chk("LinkedIn URL", user.get("linkedin_url"), 10, "Connect your LinkedIn profile")
    chk("Phone", user.get("phone"), 5, "Add a phone number")

    if user.get("role") == "candidate":
        p = profile or {}
        chk("Title", p.get("title"), 10, "Add your current job title")
        chk("Summary", p.get("summary"), 10, "Write a professional summary (3+ sentences)")
        chk("Skills", len(json.loads(p.get("skills", "[]"))) >= 3, 15, "Add at least 3 skills")
        chk("Salary range", p.get("salary_min") and p.get("salary_max"), 10, "Set your salary expectations")
        chk("Work preference", p.get("work_preference"), 5, "Choose remote/hybrid/on-site preference")
        chk("Location", p.get("location"), 5, "Add your location")
        chk("Experience years", p.get("experience_years"), 5, "Add years of experience")
        chk("Education", p.get("education"), 5, "Add your educational background")
    else:
        rp = profile or {}
        chk("Company", rp.get("company_id"), 15, "Complete your company profile")
        chk("Job title", rp.get("title"), 10, "Add your job title")

    suggestions = [c["suggestion"] for c in checks if c["suggestion"]]
    return {"score": min(score, 100), "checks": checks, "suggestions": suggestions[:3]}


# ---------------------------------------------------------------------------
# Demo data seeding
# ---------------------------------------------------------------------------
def seed_demo_data(db):
    """Insert all demo users, companies, jobs, matches, activities."""

    pw = hash_password("demo123")
    now_ts = int(time.time())

    # ---- Companies ----
    companies = [
        (1, "TechNovate AI", "technovate.ai", "Artificial Intelligence", "201-500", "Series C",
         "Cutting-edge AI solutions for enterprise automation and intelligent hiring.",
         "https://ui-avatars.com/api/?name=TechNovate+AI&background=6366f1&color=fff",
         "https://technovate.ai", "San Francisco, CA", 2019, '["Python","PyTorch","Kubernetes","AWS","React"]'),
        (2, "Meridian Systems", "meridiansys.com", "Enterprise SaaS", "501-1000", "Public",
         "Trusted enterprise SaaS platform for ERP and business intelligence at scale.",
         "https://ui-avatars.com/api/?name=Meridian+Systems&background=0ea5e9&color=fff",
         "https://meridiansys.com", "Austin, TX", 2011, '["SAP","Java","Azure","Docker","Terraform"]'),
        (3, "Quantum Dynamics", "qdynamics.io", "Deep Tech", "11-50", "Series A",
         "Deep tech startup pioneering quantum-inspired ML for next-generation applications.",
         "https://ui-avatars.com/api/?name=Quantum+Dynamics&background=8b5cf6&color=fff",
         "https://qdynamics.io", "Boston, MA", 2021, '["Python","JAX","TensorFlow","CUDA","GCP"]'),
        (4, "Atlas Global Corp", "atlasglobal.com", "Consulting", "1001-5000", "Private",
         "Global management consulting firm specializing in digital transformation and ERP implementations.",
         "https://ui-avatars.com/api/?name=Atlas+Global&background=f59e0b&color=fff",
         "https://atlasglobal.com", "New York, NY", 2003, '["SAP","ServiceNow","Power BI","Azure","Salesforce"]'),
    ]
    for c in companies:
        db.execute(
            """INSERT OR IGNORE INTO companies (id,name,domain,industry,size,stage,description,logo_url,website,headquarters,founded_year,tech_stack)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", c
        )

    # ---- Recruiter users ----
    recruiters = [
        (101, "lisa.park@technovate.ai", pw, "Lisa Park", "recruiter", 1, 1, "Head of Talent", 1, "technovate.ai"),
        (102, "robert.chen@meridiansys.com", pw, "Robert Chen", "recruiter", 1, 2, "VP Engineering", 1, "meridiansys.com"),
        (103, "aisha.patel@qdynamics.io", pw, "Aisha Patel", "recruiter", 1, 3, "CTO", 1, "qdynamics.io"),
        (104, "tom.richards@atlasglobal.com", pw, "Tom Richards", "recruiter", 1, 4, "HR Director", 1, "atlasglobal.com"),
    ]
    for r in recruiters:
        db.execute(
            """INSERT OR IGNORE INTO users (id,email,password_hash,name,role,email_verified,notifications_enabled)
               VALUES (?,?,?,?,?,?,1)""",
            (r[0], r[1], r[2], r[3], r[4], r[5])
        )
        db.execute(
            """INSERT OR IGNORE INTO recruiter_profiles (user_id,company_id,title)
               VALUES (?,?,?)""", (r[0], r[6], r[7])
        )
        # Trust profile for recruiters
        corp = 1  # all use company domains
        db.execute(
            """INSERT OR IGNORE INTO trust_profiles
               (user_id,trust_score,identity_score,behavioral_score,content_score,
                response_rate,ghost_count,job_quality_avg,company_domain_match,skills_consistent,profile_completeness,corporate_email)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (r[0], 88, 30, 30, 28, 0.92, 0, 0.88, 1, 1, 85, 1)
        )
        db.execute(
            "INSERT OR IGNORE INTO privacy_settings (user_id) VALUES (?)", (r[0],)
        )
        db.execute(
            "INSERT OR IGNORE INTO agent_preferences (user_id) VALUES (?)", (r[0],)
        )

    # ---- Candidate users ----
    candidates = [
        # (id, email, name, title, skills, exp, sal_min, sal_max, work_pref, loc, summary, trust, linkedin)
        (201, "sarah.chen@demo.com", "Sarah Chen",
         "Senior Full-Stack Engineer",
         '["Python","React","AWS","Node.js","TypeScript","PostgreSQL","Docker","Redis"]',
         10, 150000, 180000, "Remote", "Seattle, WA",
         "10+ year full-stack engineer specializing in scalable cloud-native applications. Expert in Python microservices and React frontends on AWS.",
         92, "https://linkedin.com/in/sarahchen-dev"),
        (202, "james.wright@demo.com", "James Wright",
         "AI/ML Engineer",
         '["PyTorch","TensorFlow","NLP","Python","AWS SageMaker","MLflow","Kubernetes","Transformers"]',
         7, 160000, 200000, "Hybrid", "San Francisco, CA",
         "AI/ML engineer with 7 years deploying production ML systems. Specialized in NLP and transformer architectures serving millions of users.",
         88, "https://linkedin.com/in/jameswright-ml"),
        (203, "priya.sharma@demo.com", "Priya Sharma",
         "SAP Consultant",
         '["SAP S/4HANA","ABAP","SAP Fiori","SAP BTP","SAP SD","SAP MM","SAP FI","SAP Integration Suite"]',
         12, 140000, 170000, "On-site", "Chicago, IL",
         "Senior SAP consultant with 12 years of S/4HANA implementations across Fortune 500 companies. Certified SAP architect.",
         95, "https://linkedin.com/in/priyasharma-sap"),
        (204, "marcus.johnson@demo.com", "Marcus Johnson",
         "Senior Product Manager",
         '["Agile","Product Strategy","Data Analytics","SQL","Roadmapping","Stakeholder Management","A/B Testing","JIRA"]',
         8, 145000, 175000, "Remote", "New York, NY",
         "Product leader with 8 years driving 0-to-1 products at startups and scaling platforms at enterprise. Data-driven decision maker.",
         85, "https://linkedin.com/in/marcusjohnson-pm"),
        (205, "elena.rodriguez@demo.com", "Elena Rodriguez",
         "Data Scientist",
         '["Python","R","Apache Spark","Machine Learning","SQL","Tableau","scikit-learn","Databricks"]',
         5, 130000, 160000, "Hybrid", "Austin, TX",
         "Data scientist with expertise in ML model development and large-scale data pipelines. Published researcher in applied ML.",
         90, "https://linkedin.com/in/elenarodriguez-ds"),
        (206, "david.kim@demo.com", "David Kim",
         "Cybersecurity Analyst",
         '["SIEM","Penetration Testing","Zero Trust","CISSP","AWS Security","Incident Response","SOC 2","Splunk"]',
         6, 135000, 165000, "Remote", "Washington, DC",
         "Cybersecurity specialist with CISSP certification and 6 years in threat detection, pen testing, and zero-trust architecture.",
         87, "https://linkedin.com/in/davidkim-security"),
        (207, "rachel.foster@demo.com", "Rachel Foster",
         "DevOps Engineer",
         '["Kubernetes","Terraform","CI/CD","AWS","Docker","Ansible","GitHub Actions","Prometheus"]',
         8, 140000, 175000, "Hybrid", "Denver, CO",
         "DevOps engineer with 8 years automating infrastructure and building resilient CI/CD pipelines at scale.",
         91, "https://linkedin.com/in/rachelfoster-devops"),
        (208, "alex.tanaka@demo.com", "Alex Tanaka",
         "UX Designer",
         '["Figma","User Research","Design Systems","Prototyping","Accessibility","Usability Testing","Sketch","CSS"]',
         6, 120000, 150000, "Remote", "Los Angeles, CA",
         "UX designer crafting intuitive, accessible digital experiences. 6 years leading design systems at SaaS and consumer products.",
         89, "https://linkedin.com/in/alextanaka-ux"),
    ]
    for c in candidates:
        (uid, email, name, title, skills, exp, smin, smax, wpref, loc, summary, trust, li) = c
        db.execute(
            """INSERT OR IGNORE INTO users (id,email,password_hash,name,role,email_verified,linkedin_url,notifications_enabled)
               VALUES (?,?,?,?,?,?,?,1)""",
            (uid, email, pw, name, "candidate", 1, li)
        )
        db.execute(
            """INSERT OR IGNORE INTO candidate_profiles
               (user_id,title,summary,skills,experience_years,salary_min,salary_max,work_preference,location)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (uid, title, summary, skills, exp, smin, smax, wpref, loc)
        )
        # Compute trust sub-scores
        identity = 30  # email verified + linkedin
        behavioral = 25
        content_s = trust - identity - behavioral
        db.execute(
            """INSERT OR IGNORE INTO trust_profiles
               (user_id,trust_score,identity_score,behavioral_score,content_score,
                response_rate,ghost_count,job_quality_avg,company_domain_match,skills_consistent,profile_completeness,corporate_email)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, trust, identity, behavioral, content_s, 0.9, 0, 0.8, 0, 1, 90, 0)
        )
        db.execute("INSERT OR IGNORE INTO privacy_settings (user_id) VALUES (?)", (uid,))
        db.execute("INSERT OR IGNORE INTO agent_preferences (user_id) VALUES (?)", (uid,))

    # ---- Jobs ----
    jobs = [
        # (id, company_id, recruiter_id, title, description, required_skills, nice_skills, sal_min, sal_max, work_model, location, min_exp)
        (301, 1, 101, "AI Research Engineer",
         "Join TechNovate AI to push the frontier of applied AI research. You will design and implement novel ML architectures, lead experiments, and deploy production-grade AI systems that power our hiring intelligence platform.",
         '["PyTorch","TensorFlow","NLP","Python","AWS SageMaker","Transformers"]',
         '["MLflow","Kubernetes","CUDA","JAX"]',
         170000, 220000, "Remote", "San Francisco, CA", 5),
        (302, 1, 101, "Full-Stack Developer",
         "Build the core product experience at TechNovate AI. You will work across our React frontend and Python/Node.js backend, own features end-to-end, and collaborate closely with design and AI teams.",
         '["Python","React","TypeScript","AWS","PostgreSQL","Docker"]',
         '["Redis","GraphQL","Kubernetes","Node.js"]',
         140000, 180000, "Hybrid", "San Francisco, CA", 4),
        (303, 1, 101, "Product Manager",
         "Own the product roadmap for TechNovate AI's recruiter-facing platform. Partner with engineering, design, and data science to ship features that delight thousands of recruiters.",
         '["Product Strategy","Agile","Data Analytics","Stakeholder Management","Roadmapping"]',
         '["SQL","A/B Testing","B2B SaaS experience"]',
         150000, 190000, "Remote", "San Francisco, CA", 5),
        (304, 2, 102, "SAP Integration Lead",
         "Lead SAP S/4HANA integration projects for Meridian Systems' enterprise clients. You will architect integration solutions using SAP BTP and guide a team of consultants through complex ERP implementations.",
         '["SAP S/4HANA","SAP BTP","SAP Integration Suite","ABAP","SAP Fiori"]',
         '["SAP SD","SAP MM","SAP FI","Agile"]',
         150000, 185000, "On-site", "Austin, TX", 8),
        (305, 2, 102, "Senior DevOps Engineer",
         "Scale Meridian Systems' infrastructure as we serve 500+ enterprise customers. You will own our Kubernetes platform, CI/CD pipelines, and drive cloud cost optimization across AWS and Azure.",
         '["Kubernetes","Terraform","CI/CD","AWS","Docker","Ansible"]',
         '["GitHub Actions","Prometheus","Grafana","Helm"]',
         145000, 180000, "Hybrid", "Austin, TX", 6),
        (306, 2, 102, "Cybersecurity Lead",
         "Protect Meridian Systems' platform and customer data. You will lead our security operations center, drive SOC 2 compliance, and architect our zero-trust security framework.",
         '["SIEM","Penetration Testing","Zero Trust","CISSP","Incident Response","SOC 2"]',
         '["Splunk","AWS Security","CISM"]',
         155000, 190000, "Remote", "Austin, TX", 5),
        (307, 3, 103, "ML Platform Engineer",
         "Build the ML infrastructure backbone at Quantum Dynamics. You will create the platform that our research team uses to train, evaluate, and deploy quantum-inspired ML models at scale.",
         '["Python","PyTorch","Kubernetes","AWS SageMaker","MLflow","Docker"]',
         '["JAX","CUDA","Ray","TensorFlow"]',
         160000, 200000, "Hybrid", "Boston, MA", 5),
        (308, 3, 103, "Data Scientist",
         "Apply cutting-edge ML techniques to Quantum Dynamics' proprietary datasets. You will develop models for anomaly detection, optimization, and predictive analytics used by Fortune 100 clients.",
         '["Python","Machine Learning","SQL","Apache Spark","scikit-learn"]',
         '["R","Databricks","Tableau","Bayesian methods"]',
         140000, 175000, "Remote", "Boston, MA", 3),
        (309, 3, 103, "UX Lead",
         "Define the design language for Quantum Dynamics' developer tools and enterprise dashboard. Lead user research, build our design system from scratch, and mentor junior designers.",
         '["Figma","User Research","Design Systems","Prototyping","Accessibility"]',
         '["Sketch","Framer","CSS","Developer handoff"]',
         130000, 165000, "Remote", "Boston, MA", 5),
        (310, 4, 104, "SAP S/4HANA Consultant",
         "Deliver SAP S/4HANA transformation projects for Atlas Global Corp's blue-chip clients across manufacturing, retail, and financial services. Travel up to 50% required.",
         '["SAP S/4HANA","ABAP","SAP Fiori","SAP SD","SAP MM","SAP FI"]',
         '["SAP BTP","S/4HANA Cloud","Agile","Project Management"]',
         140000, 175000, "On-site", "New York, NY", 7),
        (311, 4, 104, "Project Manager",
         "Lead digital transformation engagements at Atlas Global Corp. You will manage client relationships, coordinate cross-functional teams, and ensure on-time delivery of complex technology programs.",
         '["Agile","Stakeholder Management","Roadmapping","JIRA","Project Management"]',
         '["PMP","SAFe","Budget management","Risk management"]',
         130000, 160000, "Hybrid", "New York, NY", 6),
        (312, 4, 104, "Business Analyst",
         "Bridge business requirements and technical solutions at Atlas Global Corp. You will facilitate workshops, document requirements, and support SAP and Salesforce implementation projects.",
         '["Data Analytics","SQL","Stakeholder Management","Product Strategy"]',
         '["SAP","Salesforce","Power BI","Process mapping"]',
         110000, 140000, "Hybrid", "New York, NY", 3),
    ]
    for j in jobs:
        db.execute(
            """INSERT OR IGNORE INTO jobs
               (id,company_id,recruiter_id,title,description,required_skills,nice_to_have_skills,
                salary_min,salary_max,work_model,location,min_experience,status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            j + ("active",)
        )

    # ---- Matches ----
    # Build candidate profile lookup
    cand_profiles = {}
    for c in candidates:
        uid = c[0]
        cand_profiles[uid] = {
            "user_id": uid,
            "skills": c[4],
            "experience_years": c[5],
            "salary_min": c[6],
            "salary_max": c[7],
            "work_preference": c[8],
        }

    # jobs tuple indices:
    # 0=id, 1=company_id, 2=recruiter_id, 3=title, 4=description,
    # 5=required_skills, 6=nice_to_have_skills,
    # 7=salary_min, 8=salary_max, 9=work_model, 10=location, 11=min_experience
    job_dicts = {
        j[0]: {
            "id": j[0],
            "required_skills": j[5],
            "salary_min": j[7],
            "salary_max": j[8],
            "work_model": j[9],
            "min_experience": j[11],
        }
        for j in jobs
    }

    # Pipeline stage distribution seeds
    stages = ["new"] * 6 + ["interested"] * 2 + ["interviewing"] * 1 + ["offer"] * 1
    # Extended for extra variety
    stages_ext = ["new"] * 12 + ["interested"] * 4 + ["interviewing"] * 2 + ["offer"] * 1 + ["hired"] * 1

    match_id = 1
    neg_logs = []
    top_matches = []

    # Each candidate gets matched against all jobs; filter to meaningful ones
    for cid in [201, 202, 203, 204, 205, 206, 207, 208]:
        cp = cand_profiles[cid]
        job_scores = []
        for jid, jd in job_dicts.items():
            result = calculate_match(cp, jd)
            job_scores.append((jid, result))
        # Sort descending, take top 6 for variety
        job_scores.sort(key=lambda x: x[1]["score"], reverse=True)
        for rank, (jid, result) in enumerate(job_scores[:6]):
            stage_idx = int(hashlib.md5(f"{cid}_{jid}".encode()).hexdigest(), 16) % len(stages_ext)
            stage = stages_ext[stage_idx]
            reasons_json = json.dumps(result["reasons"])
            existing = db.execute(
                "SELECT id FROM matches WHERE candidate_id=? AND job_id=?", (cid, jid)
            ).fetchone()
            if not existing:
                db.execute(
                    """INSERT OR IGNORE INTO matches
                       (candidate_id,job_id,score,confidence,match_reasons,pipeline_stage,candidate_action,recruiter_action)
                       VALUES (?,?,?,?,?,?,?,?)""",
                    (cid, jid, result["score"], result["confidence"], reasons_json,
                     stage,
                     "pending" if stage == "new" else "interested",
                     "pending" if stage in ("new", "interested") else "interested")
                )
                mid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
                if rank < 1 and result["score"] >= 75:
                    top_matches.append((mid, cid, jid, cp, job_dicts[jid]))
                match_id += 1

    # ---- Agent negotiation logs for top matches ----
    neg_scripts = [
        [
            ("Candidate Agent", "My client brings {exp} years of specialized experience with {skills}. They are actively seeking a position that aligns with their expertise and compensation expectations."),
            ("Recruiter Agent", "The {title} role at our company requires deep hands-on experience with production systems. Can your client elaborate on their most impactful project?"),
            ("Candidate Agent", "Certainly — led development of a system serving 10M+ daily active users, reducing latency by 40% through architectural improvements. Strong track record of end-to-end ownership."),
            ("Recruiter Agent", "Impressive background. Our compensation range is ${sal_min:,}–${sal_max:,}. What are your client's base salary expectations?"),
            ("Candidate Agent", "Client is targeting ${target:,} base with equity consideration. Open to total comp discussion — particularly interested in meaningful equity stake given the company's trajectory."),
            ("Recruiter Agent", "That's within our range. Trust scores look strong on both sides. Recommending progression to technical screening stage — scheduling availability request sent."),
        ],
        [
            ("Candidate Agent", "My client is a top-tier candidate with {exp} years of experience and a trust score of {trust}. They have been selectively evaluating opportunities and this role is a priority match."),
            ("Recruiter Agent", "We appreciate the interest. The team has reviewed the profile. One area we'd like to explore: {skill_q} experience at scale. Can you provide specifics?"),
            ("Candidate Agent", "My client has extensive hands-on experience — including production deployments handling enterprise-scale workloads. Happy to share detailed case studies."),
            ("Recruiter Agent", "Excellent. The hiring manager is enthusiastic. Compensation budget is ${sal_min:,}–${sal_max:,} depending on experience depth."),
            ("Candidate Agent", "Client's expectation is ${target:,} base. Given the experience level and specialized skills, we believe this is well within the range and justified."),
            ("Recruiter Agent", "Agreed. Moving to Offer stage pending final approval. Expect formal offer details within 48 hours."),
        ],
    ]

    job_title_map = {j[0]: j[2] for j in jobs}
    candidate_name_map = {c[0]: c[2] for c in candidates}
    candidate_exp_map = {c[0]: c[5] for c in candidates}
    candidate_trust_map = {c[0]: c[11] for c in candidates}
    candidate_skill_map = {c[0]: json.loads(c[4]) for c in candidates}
    job_sal_map = {j[0]: (j[7], j[8]) for j in jobs}

    for i, (mid, cid, jid, cp, jd) in enumerate(top_matches[:5]):
        script = neg_scripts[i % len(neg_scripts)]
        skills_list = candidate_skill_map.get(cid, ["Python", "ML"])
        skill_q = skills_list[0] if skills_list else "core"
        smin, smax = job_sal_map.get(jid, (150000, 200000))
        target = int((smin + smax) / 2 * 0.98)
        exp = candidate_exp_map.get(cid, 5)
        trust = candidate_trust_map.get(cid, 85)
        title = job_title_map.get(jid, "the role")
        skills_str = " + ".join(skills_list[:3])

        base_ts = time.time() - 3 * 86400
        for step, (speaker, tmpl) in enumerate(script):
            msg = tmpl.format(
                exp=exp, skills=skills_str, trust=trust, title=title,
                sal_min=smin, sal_max=smax, target=target, skill_q=skill_q
            )
            ts = base_ts + step * 3600
            ts_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts))
            db.execute(
                "INSERT OR IGNORE INTO agent_negotiation_logs (match_id,speaker,message,timestamp) VALUES (?,?,?,?)",
                (mid, speaker, msg, ts_str)
            )

    # ---- Agent activity feed ----
    activity_templates_candidate = [
        ("Reviewed {n} new positions matching your skills in {skills}", "info"),
        ("Found {n} strong matches — {n1} at AI startups, {n2} at enterprise", "success"),
        ("Initiated negotiation with {company} for {title} role", "action"),
        ("Salary expectations aligned with {company} — proceeding to next stage", "success"),
        ("Declined {n} positions below your ${threshold:,} minimum", "info"),
        ("Updated your match profile based on new {skills} market demand data", "info"),
        ("Sent availability signal to {n} recruiting agents", "action"),
        ("Identified mutual interest with {company} hiring team", "success"),
        ("Profile view recorded from {company}", "info"),
        ("Market salary data updated: {skills} roles averaging ${avg:,} in your area", "info"),
        ("Scheduled screening call with {company} for {date}", "action"),
        ("Re-evaluated {n} stale matches and cleared {n1} expired opportunities", "info"),
        ("Detected {n} new job postings from your saved companies", "info"),
        ("Your trust score increased to {trust} after email verification", "success"),
        ("Agent negotiation with {company} progressed to offer stage", "success"),
    ]
    activity_templates_recruiter = [
        ("Matched {n} new candidates to {title} posting", "info"),
        ("Candidate trust scores reviewed — {n} high-confidence matches identified", "success"),
        ("Sent introduction message to top {n} candidates for {title}", "action"),
        ("Candidate {name} accepted interview invitation for {title}", "success"),
        ("Updated salary competitiveness analysis for {title} — market rate ${avg:,}", "info"),
        ("Auto-screened {n} applications — {n1} advanced, {n2} declined", "info"),
        ("Refreshed candidate rankings based on new applicant data", "info"),
        ("Offer extended to top candidate for {title}", "action"),
        ("{n} candidates ghosted initial outreach — trust scores updated", "info"),
        ("Pipeline review completed — {n} candidates in active stages", "success"),
        ("Job posting {title} received {n} new applications this week", "info"),
        ("Scheduled {n} technical interviews for {title}", "action"),
    ]

    company_names = ["TechNovate AI", "Meridian Systems", "Quantum Dynamics", "Atlas Global Corp"]
    job_titles = ["AI Research Engineer", "Full-Stack Developer", "SAP Consultant", "DevOps Engineer", "Data Scientist", "Product Manager"]
    candidate_names_list = ["Sarah Chen", "James Wright", "Priya Sharma", "Marcus Johnson"]
    skills_options = ["Python + ML", "SAP S/4HANA", "Kubernetes + DevOps", "React + TypeScript", "NLP + Transformers"]

    all_user_ids = [c[0] for c in candidates] + [r[0] for r in recruiters]
    for uid in all_user_ids:
        is_recruiter = uid >= 101 and uid <= 104
        templates = activity_templates_recruiter if is_recruiter else activity_templates_candidate
        num_activities = random.randint(10, 15)
        rng2 = random.Random(uid * 7 + 42)
        for i in range(num_activities):
            tmpl, atype = rng2.choice(templates)
            days_ago = rng2.uniform(0, 7)
            ts = time.time() - days_ago * 86400
            ts_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts))
            try:
                msg = tmpl.format(
                    n=rng2.randint(2, 20),
                    n1=rng2.randint(1, 5),
                    n2=rng2.randint(1, 5),
                    skills=rng2.choice(skills_options),
                    company=rng2.choice(company_names),
                    title=rng2.choice(job_titles),
                    threshold=rng2.choice([130000, 140000, 150000, 160000]),
                    avg=rng2.randint(140, 200) * 1000,
                    trust=rng2.randint(80, 96),
                    name=rng2.choice(candidate_names_list),
                    date=time.strftime("%b %d", time.localtime(ts + 86400 * 2)),
                )
            except (KeyError, IndexError):
                msg = tmpl
            existing_acts = db.execute(
                "SELECT COUNT(*) FROM agent_activities WHERE user_id=? AND activity=?", (uid, msg)
            ).fetchone()[0]
            if not existing_acts:
                db.execute(
                    "INSERT INTO agent_activities (user_id,activity,activity_type,created_at) VALUES (?,?,?,?)",
                    (uid, msg, atype, ts_str)
                )

    # ---- Achievements / badges ----
    badge_sets = {
        "candidate": [
            ("Profile Pro", "🏆", "Completed your profile to 80%+"),
            ("Trust Builder", "🛡️", "Achieved trust score above 85"),
            ("Quick Responder", "⚡", "Responded to 5 matches within 24 hours"),
            ("Top Match", "⭐", "Received a 90%+ match score"),
            ("First Match", "🎯", "Got your first AI-powered match"),
        ],
        "recruiter": [
            ("Hiring Champion", "🏆", "Completed your first hire"),
            ("Quality Poster", "📋", "All jobs rated high quality by AI"),
            ("Fast Mover", "⚡", "Responded to candidates within 2 hours"),
            ("Top Recruiter", "⭐", "Matched with 10+ high-trust candidates"),
        ],
    }
    for c in candidates:
        uid = c[0]
        rng3 = random.Random(uid + 999)
        for badge, icon, desc in rng3.sample(badge_sets["candidate"], k=rng3.randint(2, 4)):
            db.execute(
                "INSERT OR IGNORE INTO achievements (user_id,badge_name,badge_icon,description) VALUES (?,?,?,?)",
                (uid, badge, icon, desc)
            )
    for r in recruiters:
        uid = r[0]
        rng3 = random.Random(uid + 999)
        for badge, icon, desc in rng3.sample(badge_sets["recruiter"], k=rng3.randint(1, 3)):
            db.execute(
                "INSERT OR IGNORE INTO achievements (user_id,badge_name,badge_icon,description) VALUES (?,?,?,?)",
                (uid, badge, icon, desc)
            )

    # ---- Referral codes ----
    for uid in all_user_ids:
        code = hashlib.md5(f"ref_{uid}".encode()).hexdigest()[:8].upper()
        db.execute(
            "INSERT OR IGNORE INTO referrals (user_id,referral_code) VALUES (?,?)", (uid, code)
        )

    db.commit()


def ensure_seeded(db):
    count = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0:
        seed_demo_data(db)


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------

def handle_health(db, method, params, body, headers):
    ok({"status": "ok", "version": "2.0.0", "timestamp": time.time()})


def handle_register(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    name = body.get("name", "").strip()
    role = body.get("role", "candidate")
    if not email or not password or not name:
        err(400, "email, password, and name are required")
    if role not in ("candidate", "recruiter"):
        err(400, "role must be candidate or recruiter")
    if db.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        err(409, "Email already registered")
    pw_hash = hash_password(password)
    db.execute(
        "INSERT INTO users (email,password_hash,name,role,email_verified) VALUES (?,?,?,?,0)",
        (email, pw_hash, name, role)
    )
    db.commit()
    uid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    if role == "candidate":
        db.execute("INSERT OR IGNORE INTO candidate_profiles (user_id) VALUES (?)", (uid,))
    else:
        db.execute("INSERT OR IGNORE INTO recruiter_profiles (user_id) VALUES (?)", (uid,))
    db.execute("INSERT OR IGNORE INTO trust_profiles (user_id) VALUES (?)", (uid,))
    db.execute("INSERT OR IGNORE INTO privacy_settings (user_id) VALUES (?)", (uid,))
    db.execute("INSERT OR IGNORE INTO agent_preferences (user_id) VALUES (?)", (uid,))
    db.commit()
    token = make_token(uid)
    ok({"token": token, "user_id": uid, "email": email, "name": name, "role": role}, 201)


def handle_login(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    if not email or not password:
        err(400, "email and password required")
    user = fetchone_dict(db, "SELECT * FROM users WHERE email=?", (email,))
    if not user or user["password_hash"] != hash_password(password):
        err(401, "Invalid credentials")
    db.execute("UPDATE users SET last_login=datetime('now') WHERE id=?", (user["id"],))
    db.commit()
    token = make_token(user["id"])
    profile = None
    if user["role"] == "candidate":
        profile = fetchone_dict(db, "SELECT * FROM candidate_profiles WHERE user_id=?", (user["id"],))
    else:
        profile = fetchone_dict(db, "SELECT rp.*, c.name as company_name, c.domain, c.industry, c.size, c.stage FROM recruiter_profiles rp LEFT JOIN companies c ON rp.company_id=c.id WHERE rp.user_id=?", (user["id"],))
    ok({
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "email_verified": bool(user["email_verified"]),
            "avatar_url": user["avatar_url"], "linkedin_url": user["linkedin_url"],
            "last_login": user["last_login"],
        },
        "profile": profile,
    })


def handle_forgot_password(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    email = body.get("email", "").strip().lower()
    if not email:
        err(400, "email required")
    ok({"success": True, "message": f"If {email} is registered, a reset link has been sent."})


def handle_verify_email(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    db.execute("UPDATE users SET email_verified=1 WHERE id=?", (user["id"],))
    # Recompute trust
    tp = fetchone_dict(db, "SELECT * FROM trust_profiles WHERE user_id=?", (user["id"],))
    if tp:
        new_score = tp["trust_score"] + (15 if not tp.get("identity_score", 0) >= 15 else 0)
        db.execute("UPDATE trust_profiles SET identity_score=identity_score+15, trust_score=MIN(trust_score+15,100) WHERE user_id=? AND trust_score<85", (user["id"],))
    db.commit()
    ok({"success": True, "message": "Email verified successfully"})


def handle_profile(db, method, params, body, headers):
    user = require_auth(db, headers)
    if method == "GET":
        if user["role"] == "candidate":
            profile = fetchone_dict(db, "SELECT * FROM candidate_profiles WHERE user_id=?", (user["id"],))
        else:
            profile = fetchone_dict(db,
                "SELECT rp.*, c.name as company_name, c.domain, c.logo_url, c.industry, c.size, c.stage, c.description as company_description, c.website, c.headquarters, c.tech_stack FROM recruiter_profiles rp LEFT JOIN companies c ON rp.company_id=c.id WHERE rp.user_id=?",
                (user["id"],))
        tp = fetchone_dict(db, "SELECT * FROM trust_profiles WHERE user_id=?", (user["id"],))
        ok({
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "email_verified": bool(user["email_verified"]),
            "phone": user["phone"], "phone_verified": bool(user["phone_verified"]),
            "linkedin_url": user["linkedin_url"], "avatar_url": user["avatar_url"],
            "created_at": user["created_at"], "last_login": user["last_login"],
            "two_fa_enabled": bool(user["two_fa_enabled"]),
            "notifications_enabled": bool(user["notifications_enabled"]),
            "profile": profile,
            "trust_score": tp["trust_score"] if tp else 50,
        })
    elif method == "PUT":
        # Update user fields
        allowed_user = {"name", "phone", "linkedin_url", "avatar_url"}
        for field in allowed_user:
            if field in body:
                db.execute(f"UPDATE users SET {field}=? WHERE id=?", (body[field], user["id"]))
        # Update profile fields
        if user["role"] == "candidate":
            allowed_cand = {"title", "summary", "skills", "experience_years", "salary_min",
                            "salary_max", "work_preference", "availability", "location",
                            "education", "certifications", "languages", "github_url", "portfolio_url"}
            for field in allowed_cand:
                if field in body:
                    val = json.dumps(body[field]) if isinstance(body[field], list) else body[field]
                    db.execute(f"UPDATE candidate_profiles SET {field}=? WHERE user_id=?", (val, user["id"]))
            # Update completeness
            cp = fetchone_dict(db, "SELECT * FROM candidate_profiles WHERE user_id=?", (user["id"],))
            comp = profile_completeness(dict(user), cp)
            db.execute("UPDATE trust_profiles SET profile_completeness=? WHERE user_id=?", (comp["score"], user["id"]))
        else:
            allowed_rec = {"title"}
            for field in allowed_rec:
                if field in body:
                    db.execute(f"UPDATE recruiter_profiles SET {field}=? WHERE user_id=?", (body[field], user["id"]))
        db.commit()
        ok({"success": True, "message": "Profile updated"})
    else:
        err(405, "Method not allowed")


def handle_profile_completeness(db, method, params, body, headers):
    user = require_auth(db, headers)
    if user["role"] == "candidate":
        profile = fetchone_dict(db, "SELECT * FROM candidate_profiles WHERE user_id=?", (user["id"],))
    else:
        profile = fetchone_dict(db, "SELECT * FROM recruiter_profiles WHERE user_id=?", (user["id"],))
    result = profile_completeness(dict(user), profile)
    db.execute("UPDATE trust_profiles SET profile_completeness=? WHERE user_id=?", (result["score"], user["id"]))
    db.commit()
    ok(result)


def handle_availability(db, method, params, body, headers):
    if method != "PUT":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    status_val = body.get("availability", "actively_looking")
    if status_val not in ("actively_looking", "open", "not_looking"):
        err(400, "Invalid availability status")
    db.execute("UPDATE candidate_profiles SET availability=? WHERE user_id=?", (status_val, user["id"]))
    db.commit()
    ok({"success": True, "availability": status_val})


def handle_linkedin_import(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    role = user["role"]
    if role == "candidate":
        ok({
            "success": True,
            "simulated": True,
            "data": {
                "name": user["name"] or "Professional",
                "title": "Senior Software Engineer",
                "summary": "Experienced engineer with a strong background in cloud-native development and team leadership.",
                "skills": ["Python", "AWS", "React", "Docker", "Kubernetes", "PostgreSQL"],
                "experience_years": 7,
                "salary_min": 145000,
                "salary_max": 185000,
                "work_preference": "Remote",
                "location": "San Francisco, CA",
                "education": "B.S. Computer Science, UC Berkeley",
                "linkedin_url": f"https://linkedin.com/in/{(user.get('name') or 'user').lower().replace(' ', '-')}",
            }
        })
    else:
        ok({
            "success": True,
            "simulated": True,
            "data": {
                "name": user["name"],
                "title": "Head of Talent Acquisition",
                "company": "TechCorp Inc.",
                "linkedin_url": f"https://linkedin.com/in/{(user.get('name') or 'recruiter').lower().replace(' ', '-')}",
            }
        })


def handle_trust_score(db, method, params, body, headers):
    user = require_auth(db, headers)
    target_id = params.get("user_id", [None])[0]
    if target_id:
        target_user = fetchone_dict(db, "SELECT * FROM users WHERE id=?", (target_id,))
    else:
        target_user = dict(user)
    if not target_user:
        err(404, "User not found")
    tp = fetchone_dict(db, "SELECT * FROM trust_profiles WHERE user_id=?", (target_user["id"],))
    if not tp:
        tp = {"trust_score": 50, "identity_score": 0, "behavioral_score": 0,
              "content_score": 0, "response_rate": 0.5, "ghost_count": 0,
              "job_quality_avg": 0.5, "company_domain_match": 0,
              "skills_consistent": 1, "profile_completeness": 0, "corporate_email": 0}
    profile = {}
    if target_user.get("role") == "candidate":
        profile = fetchone_dict(db, "SELECT * FROM candidate_profiles WHERE user_id=?", (target_user["id"],)) or {}
    ts = calculate_trust(target_user, tp, profile)
    # Update stored score
    db.execute(
        "UPDATE trust_profiles SET trust_score=?,identity_score=?,behavioral_score=?,content_score=? WHERE user_id=?",
        (ts["total"], ts["identity"], ts["behavioral"], ts["content"], target_user["id"])
    )
    db.commit()
    ok({
        "user_id": target_user["id"],
        "trust_score": ts["total"],
        "tier": "Platinum" if ts["total"] >= 90 else "Gold" if ts["total"] >= 75 else "Silver" if ts["total"] >= 60 else "Bronze",
        "layers": {
            "identity": {"score": ts["identity"], "max": 35, "label": "Identity Verification"},
            "behavioral": {"score": ts["behavioral"], "max": 35, "label": "Behavioral Signals"},
            "content": {"score": ts["content"], "max": 30, "label": "Content Quality"},
        },
        "breakdown": ts["breakdown"],
    })


def handle_report(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    target_type = body.get("target_type", "user")
    target_id = body.get("target_id")
    report_type = body.get("type", "other")
    description = body.get("description", "")
    if not target_id:
        err(400, "target_id required")
    if report_type not in ("fake_job", "fake_candidate", "spam", "other"):
        err(400, "Invalid report type")
    db.execute(
        "INSERT INTO reports (reporter_id,target_type,target_id,report_type,description) VALUES (?,?,?,?,?)",
        (user["id"], target_type, target_id, report_type, description)
    )
    db.commit()
    ok({"success": True, "message": "Report submitted. Our team will review within 24 hours."})


def handle_verify_identity(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    method_type = body.get("method", "email")
    if method_type == "email":
        db.execute("UPDATE users SET email_verified=1 WHERE id=?", (user["id"],))
        db.execute("UPDATE trust_profiles SET identity_score=MIN(identity_score+15,35) WHERE user_id=?", (user["id"],))
        db.commit()
        ok({"success": True, "verified": True, "method": "email", "points_earned": 15})
    elif method_type == "linkedin":
        linkedin_url = body.get("linkedin_url", "")
        if linkedin_url:
            db.execute("UPDATE users SET linkedin_url=? WHERE id=?", (linkedin_url, user["id"]))
            db.execute("UPDATE trust_profiles SET identity_score=MIN(identity_score+5,35) WHERE user_id=?", (user["id"],))
            db.commit()
        ok({"success": True, "verified": True, "method": "linkedin", "points_earned": 5})
    else:
        ok({"success": True, "verified": True, "method": method_type, "simulated": True, "points_earned": 5})


def handle_company(db, method, params, body, headers):
    user = require_auth(db, headers)
    if user["role"] != "recruiter":
        err(403, "Recruiter access required")
    rp = fetchone_dict(db, "SELECT * FROM recruiter_profiles WHERE user_id=?", (user["id"],))
    if method == "GET":
        if not rp or not rp.get("company_id"):
            ok({"company": None})
        company = fetchone_dict(db, "SELECT * FROM companies WHERE id=?", (rp["company_id"],))
        ok({"company": company})
    elif method == "PUT":
        if rp and rp.get("company_id"):
            allowed = {"name", "domain", "industry", "size", "stage", "description", "logo_url", "website", "headquarters", "founded_year", "tech_stack"}
            for field in allowed:
                if field in body:
                    val = json.dumps(body[field]) if isinstance(body[field], list) else body[field]
                    db.execute(f"UPDATE companies SET {field}=? WHERE id=?", (val, rp["company_id"]))
            db.commit()
            company = fetchone_dict(db, "SELECT * FROM companies WHERE id=?", (rp["company_id"],))
            ok({"success": True, "company": company})
        else:
            # Create company
            name = body.get("name", "My Company")
            domain = body.get("domain", "")
            db.execute("INSERT INTO companies (name,domain,industry,size,stage,description) VALUES (?,?,?,?,?,?)",
                       (name, domain, body.get("industry",""), body.get("size",""), body.get("stage",""), body.get("description","")))
            db.commit()
            cid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
            db.execute("UPDATE recruiter_profiles SET company_id=? WHERE user_id=?", (cid, user["id"]))
            db.commit()
            ok({"success": True, "company_id": cid})
    else:
        err(405, "Method not allowed")


def handle_jobs(db, method, params, body, headers):
    user = require_auth(db, headers)
    if method == "GET":
        if user["role"] == "recruiter":
            jobs_list = fetchall_dict(db,
                "SELECT j.*, c.name as company_name, c.logo_url FROM jobs j LEFT JOIN companies c ON j.company_id=c.id WHERE j.recruiter_id=? ORDER BY j.created_at DESC",
                (user["id"],))
            ok({"jobs": jobs_list, "total": len(jobs_list)})
        else:
            # Candidates see all active jobs
            jobs_list = fetchall_dict(db,
                "SELECT j.*, c.name as company_name, c.logo_url, c.industry, c.size, c.stage FROM jobs j LEFT JOIN companies c ON j.company_id=c.id WHERE j.status='active' ORDER BY j.created_at DESC")
            ok({"jobs": jobs_list, "total": len(jobs_list)})
    elif method == "POST":
        if user["role"] != "recruiter":
            err(403, "Recruiter access required")
        title = body.get("title", "").strip()
        sal_min = body.get("salary_min")
        sal_max = body.get("salary_max")
        if not title:
            err(400, "title required")
        if sal_min is None or sal_max is None:
            err(400, "salary_min and salary_max are required — competitive is not accepted")
        if not isinstance(sal_min, (int, float)) or not isinstance(sal_max, (int, float)):
            err(400, "salary_min and salary_max must be numeric values — competitive is not accepted")
        rp = fetchone_dict(db, "SELECT * FROM recruiter_profiles WHERE user_id=?", (user["id"],))
        company_id = rp["company_id"] if rp else None
        if not company_id:
            err(400, "Complete your company profile before posting jobs")
        skills = body.get("required_skills", [])
        nice = body.get("nice_to_have_skills", [])
        db.execute(
            """INSERT INTO jobs (company_id,recruiter_id,title,description,required_skills,nice_to_have_skills,salary_min,salary_max,work_model,location,min_experience,status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (company_id, user["id"], title, body.get("description",""),
             json.dumps(skills) if isinstance(skills, list) else skills,
             json.dumps(nice) if isinstance(nice, list) else nice,
             int(sal_min), int(sal_max),
             body.get("work_model","Remote"), body.get("location",""),
             body.get("min_experience", 0), "active")
        )
        db.commit()
        jid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        job = fetchone_dict(db, "SELECT * FROM jobs WHERE id=?", (jid,))
        ok({"success": True, "job": job}, 201)
    elif method == "PUT":
        if user["role"] != "recruiter":
            err(403, "Recruiter access required")
        jid = params.get("id", [None])[0]
        if not jid:
            err(400, "id parameter required")
        job = fetchone_dict(db, "SELECT * FROM jobs WHERE id=? AND recruiter_id=?", (jid, user["id"]))
        if not job:
            err(404, "Job not found")
        allowed = {"title", "description", "required_skills", "nice_to_have_skills",
                   "salary_min", "salary_max", "work_model", "location", "min_experience", "status"}
        for field in allowed:
            if field in body:
                val = json.dumps(body[field]) if isinstance(body[field], list) else body[field]
                db.execute(f"UPDATE jobs SET {field}=? WHERE id=?", (val, jid))
        db.execute("UPDATE jobs SET updated_at=datetime('now') WHERE id=?", (jid,))
        db.commit()
        ok({"success": True, "job": fetchone_dict(db, "SELECT * FROM jobs WHERE id=?", (jid,))})
    else:
        err(405, "Method not allowed")


def handle_job_templates(db, method, params, body, headers):
    templates = {
        "SWE": {
            "title": "Senior Software Engineer",
            "description": "Design, build, and maintain scalable software systems. Collaborate with cross-functional teams to deliver high-quality features.",
            "required_skills": ["Python", "JavaScript", "AWS", "Docker", "PostgreSQL", "REST APIs"],
            "nice_to_have_skills": ["Kubernetes", "React", "GraphQL", "Redis"],
            "salary_min": 140000, "salary_max": 190000,
            "work_model": "Hybrid", "min_experience": 5,
        },
        "PM": {
            "title": "Senior Product Manager",
            "description": "Define product vision, manage roadmaps, and work with engineering and design to ship impactful features.",
            "required_skills": ["Product Strategy", "Agile", "Data Analytics", "Roadmapping", "Stakeholder Management"],
            "nice_to_have_skills": ["SQL", "A/B Testing", "UX research"],
            "salary_min": 145000, "salary_max": 185000,
            "work_model": "Remote", "min_experience": 5,
        },
        "Data Scientist": {
            "title": "Data Scientist",
            "description": "Build ML models, analyze large datasets, and surface actionable insights to drive business decisions.",
            "required_skills": ["Python", "Machine Learning", "SQL", "scikit-learn", "Pandas"],
            "nice_to_have_skills": ["Apache Spark", "Databricks", "R", "Tableau"],
            "salary_min": 130000, "salary_max": 175000,
            "work_model": "Hybrid", "min_experience": 3,
        },
        "DevOps": {
            "title": "DevOps / Platform Engineer",
            "description": "Own CI/CD infrastructure, Kubernetes clusters, and cloud cost optimization at scale.",
            "required_skills": ["Kubernetes", "Terraform", "CI/CD", "AWS", "Docker"],
            "nice_to_have_skills": ["Ansible", "Prometheus", "GitHub Actions", "Helm"],
            "salary_min": 140000, "salary_max": 180000,
            "work_model": "Remote", "min_experience": 4,
        },
        "Designer": {
            "title": "Senior UX Designer",
            "description": "Lead user research, design intuitive interfaces, and build scalable design systems.",
            "required_skills": ["Figma", "User Research", "Design Systems", "Prototyping", "Accessibility"],
            "nice_to_have_skills": ["Framer", "CSS", "Motion design"],
            "salary_min": 120000, "salary_max": 160000,
            "work_model": "Remote", "min_experience": 4,
        },
        "Cybersecurity": {
            "title": "Senior Cybersecurity Engineer",
            "description": "Protect critical infrastructure through proactive threat detection, incident response, and zero-trust architecture.",
            "required_skills": ["SIEM", "Penetration Testing", "Zero Trust", "Incident Response", "SOC 2"],
            "nice_to_have_skills": ["CISSP", "Splunk", "AWS Security", "CISM"],
            "salary_min": 145000, "salary_max": 185000,
            "work_model": "Remote", "min_experience": 5,
        },
    }
    ok({"templates": templates})


def handle_ai_job_description(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    role_title = body.get("title", "Software Engineer")

    descriptions = {
        "engineer": ("Build and maintain scalable systems that power our core product. "
                     "Work across the stack, own features end-to-end, and collaborate with a high-performing engineering team.",
                     ["Python", "JavaScript", "AWS", "Docker", "REST APIs", "PostgreSQL"], 140000, 190000),
        "manager": ("Define product vision and roadmap, align cross-functional teams, and ship features that delight users.",
                    ["Product Strategy", "Agile", "Data Analytics", "Stakeholder Management"], 145000, 185000),
        "scientist": ("Develop and deploy ML models, build data pipelines, and turn complex datasets into business insights.",
                      ["Python", "Machine Learning", "SQL", "scikit-learn", "Spark"], 135000, 175000),
        "designer": ("Lead UX research, build design systems, and create seamless experiences for our users.",
                     ["Figma", "User Research", "Design Systems", "Prototyping"], 120000, 160000),
        "devops": ("Own cloud infrastructure, CI/CD pipelines, and drive reliability across production systems.",
                   ["Kubernetes", "Terraform", "AWS", "Docker", "CI/CD"], 140000, 180000),
        "security": ("Protect the organization through threat detection, incident response, and security architecture.",
                     ["SIEM", "Penetration Testing", "Zero Trust", "Incident Response"], 145000, 185000),
        "sap": ("Lead SAP implementation projects, design integrations, and guide enterprise clients through S/4HANA migrations.",
                ["SAP S/4HANA", "ABAP", "SAP Fiori", "SAP BTP", "SAP Integration Suite"], 145000, 185000),
    }
    key = "engineer"
    rl = role_title.lower()
    if "manager" in rl or "pm" in rl or "product" in rl:
        key = "manager"
    elif "data" in rl or "scientist" in rl:
        key = "scientist"
    elif "design" in rl or "ux" in rl:
        key = "designer"
    elif "devops" in rl or "platform" in rl or "infra" in rl:
        key = "devops"
    elif "security" in rl or "cyber" in rl:
        key = "security"
    elif "sap" in rl:
        key = "sap"

    desc, skills, smin, smax = descriptions[key]
    ok({
        "title": role_title,
        "description": f"{role_title}s at this stage help drive our mission forward. {desc}",
        "suggested_skills": skills,
        "salary_range": {"min": smin, "max": smax},
        "work_model": "Remote",
        "min_experience": 4,
        "simulated": True,
    })


def handle_bulk_jobs(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    if user["role"] != "recruiter":
        err(403, "Recruiter access required")
    jobs_input = body if isinstance(body, list) else body.get("jobs", [])
    if not jobs_input:
        err(400, "jobs array required")
    rp = fetchone_dict(db, "SELECT * FROM recruiter_profiles WHERE user_id=?", (user["id"],))
    company_id = rp["company_id"] if rp else None
    created = []
    errors = []
    for i, j in enumerate(jobs_input):
        sal_min = j.get("salary_min")
        sal_max = j.get("salary_max")
        title = j.get("title", "").strip()
        if not title or sal_min is None or sal_max is None:
            errors.append({"index": i, "error": "title, salary_min, salary_max required"})
            continue
        skills = j.get("required_skills", [])
        nice = j.get("nice_to_have_skills", [])
        db.execute(
            """INSERT INTO jobs (company_id,recruiter_id,title,description,required_skills,nice_to_have_skills,salary_min,salary_max,work_model,location,min_experience,status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (company_id, user["id"], title, j.get("description",""),
             json.dumps(skills) if isinstance(skills, list) else skills,
             json.dumps(nice) if isinstance(nice, list) else nice,
             int(sal_min), int(sal_max),
             j.get("work_model","Remote"), j.get("location",""),
             j.get("min_experience",0), "active")
        )
        jid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        created.append(jid)
    db.commit()
    ok({"created": len(created), "job_ids": created, "errors": errors}, 201)


def handle_matches(db, method, params, body, headers):
    user = require_auth(db, headers)
    if user["role"] == "candidate":
        rows = fetchall_dict(db, """
            SELECT m.*, j.title as job_title, j.description as job_description,
                   j.required_skills, j.salary_min as job_salary_min, j.salary_max as job_salary_max,
                   j.work_model, j.location as job_location,
                   c.name as company_name, c.logo_url, c.industry, c.size, c.stage, c.domain
            FROM matches m
            JOIN jobs j ON m.job_id=j.id
            JOIN companies c ON j.company_id=c.id
            WHERE m.candidate_id=?
            ORDER BY m.score DESC
        """, (user["id"],))
        ok({"matches": rows, "total": len(rows)})
    else:
        job_id = params.get("job_id", [None])[0]
        if job_id:
            rows = fetchall_dict(db, """
                SELECT m.*, u.name as candidate_name, u.email as candidate_email,
                       u.avatar_url, u.linkedin_url,
                       cp.title as candidate_title, cp.skills, cp.experience_years,
                       cp.salary_min as cand_salary_min, cp.salary_max as cand_salary_max,
                       cp.work_preference, cp.location as candidate_location,
                       tp.trust_score
                FROM matches m
                JOIN users u ON m.candidate_id=u.id
                LEFT JOIN candidate_profiles cp ON cp.user_id=u.id
                LEFT JOIN trust_profiles tp ON tp.user_id=u.id
                WHERE m.job_id=?
                ORDER BY m.score DESC
            """, (job_id,))
        else:
            rows = fetchall_dict(db, """
                SELECT m.*, u.name as candidate_name, u.avatar_url,
                       cp.title as candidate_title, cp.skills, cp.experience_years,
                       tp.trust_score,
                       j.title as job_title
                FROM matches m
                JOIN users u ON m.candidate_id=u.id
                LEFT JOIN candidate_profiles cp ON cp.user_id=u.id
                LEFT JOIN trust_profiles tp ON tp.user_id=u.id
                JOIN jobs j ON m.job_id=j.id
                WHERE j.recruiter_id=?
                ORDER BY m.score DESC
            """, (user["id"],))
        ok({"matches": rows, "total": len(rows)})


def handle_match_detail(db, method, params, body, headers):
    user = require_auth(db, headers)
    match_id = params.get("id", [None])[0]
    if not match_id:
        err(400, "id parameter required")
    match = fetchone_dict(db, """
        SELECT m.*, j.title as job_title, j.description as job_description,
               j.required_skills, j.salary_min as job_salary_min, j.salary_max as job_salary_max,
               j.work_model, j.location as job_location,
               c.name as company_name, c.logo_url, c.domain, c.industry, c.stage, c.size,
               u.name as candidate_name, u.avatar_url, u.linkedin_url,
               cp.title as candidate_title, cp.skills, cp.experience_years,
               cp.salary_min as cand_salary_min, cp.salary_max as cand_salary_max,
               cp.work_preference,
               tp.trust_score
        FROM matches m
        JOIN jobs j ON m.job_id=j.id
        JOIN companies c ON j.company_id=c.id
        JOIN users u ON m.candidate_id=u.id
        LEFT JOIN candidate_profiles cp ON cp.user_id=u.id
        LEFT JOIN trust_profiles tp ON tp.user_id=u.id
        WHERE m.id=?
    """, (match_id,))
    if not match:
        err(404, "Match not found")
    # Verify access
    if user["role"] == "candidate" and match["candidate_id"] != user["id"]:
        err(403, "Access denied")
    # Load negotiation log
    neg_log = fetchall_dict(db,
        "SELECT * FROM agent_negotiation_logs WHERE match_id=? ORDER BY timestamp ASC",
        (match_id,))
    match["negotiation_log"] = neg_log
    try:
        match["match_reasons"] = json.loads(match.get("match_reasons") or "[]")
    except Exception:
        match["match_reasons"] = []
    ok({"match": match})


def handle_match_action(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    match_id = body.get("match_id")
    action = body.get("action")
    if not match_id or not action:
        err(400, "match_id and action required")
    if action not in ("accept", "decline", "interested"):
        err(400, "action must be accept, decline, or interested")
    match = fetchone_dict(db, "SELECT * FROM matches WHERE id=?", (match_id,))
    if not match:
        err(404, "Match not found")
    # Determine stage transitions
    if user["role"] == "candidate":
        db.execute("UPDATE matches SET candidate_action=?, updated_at=datetime('now') WHERE id=?",
                   (action, match_id))
        if action == "interested":
            db.execute("UPDATE matches SET pipeline_stage='interested' WHERE id=? AND pipeline_stage='new'", (match_id,))
        elif action == "accept":
            db.execute("UPDATE matches SET pipeline_stage='interviewing' WHERE id=?", (match_id,))
        elif action == "decline":
            db.execute("UPDATE matches SET pipeline_stage='new', candidate_action='declined' WHERE id=?", (match_id,))
    else:
        db.execute("UPDATE matches SET recruiter_action=?, updated_at=datetime('now') WHERE id=?",
                   (action, match_id))
        if action == "accept":
            db.execute("UPDATE matches SET pipeline_stage='offer' WHERE id=?", (match_id,))
        elif action == "interested":
            db.execute("UPDATE matches SET pipeline_stage='interviewing' WHERE id=? AND pipeline_stage IN ('new','interested')", (match_id,))
    db.commit()
    updated = fetchone_dict(db, "SELECT * FROM matches WHERE id=?", (match_id,))
    ok({"success": True, "match": updated})


def handle_pipeline(db, method, params, body, headers):
    user = require_auth(db, headers)
    stages = ["new", "interested", "interviewing", "offer", "hired"]
    pipeline = {}
    for stage in stages:
        if user["role"] == "candidate":
            rows = fetchall_dict(db, """
                SELECT m.*, j.title as job_title, c.name as company_name, c.logo_url
                FROM matches m
                JOIN jobs j ON m.job_id=j.id
                JOIN companies c ON j.company_id=c.id
                WHERE m.candidate_id=? AND m.pipeline_stage=?
                ORDER BY m.score DESC
            """, (user["id"], stage))
        else:
            rows = fetchall_dict(db, """
                SELECT m.*, u.name as candidate_name, u.avatar_url,
                       cp.title as candidate_title, tp.trust_score,
                       j.title as job_title
                FROM matches m
                JOIN users u ON m.candidate_id=u.id
                LEFT JOIN candidate_profiles cp ON cp.user_id=u.id
                LEFT JOIN trust_profiles tp ON tp.user_id=u.id
                JOIN jobs j ON m.job_id=j.id
                WHERE j.recruiter_id=? AND m.pipeline_stage=?
                ORDER BY m.score DESC
            """, (user["id"], stage))
        pipeline[stage] = {"label": stage.capitalize(), "count": len(rows), "items": rows}
    ok({"pipeline": pipeline, "stages": stages})


def handle_agent_feed(db, method, params, body, headers):
    user = require_auth(db, headers)
    limit = int(params.get("limit", [20])[0])
    activities = fetchall_dict(db,
        "SELECT * FROM agent_activities WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
        (user["id"], limit))
    ok({"activities": activities, "total": len(activities)})


def handle_agent_preferences(db, method, params, body, headers):
    user = require_auth(db, headers)
    if method == "GET":
        prefs = fetchone_dict(db, "SELECT * FROM agent_preferences WHERE user_id=?", (user["id"],))
        if not prefs:
            prefs = {"user_id": user["id"], "aggressiveness": 0.7,
                     "priority_skills": 0.40, "priority_salary": 0.25,
                     "priority_location": 0.15, "priority_experience": 0.20,
                     "auto_decline_threshold": 55}
        ok({"preferences": prefs})
    elif method == "PUT":
        allowed = {"aggressiveness", "priority_skills", "priority_salary",
                   "priority_location", "priority_experience", "auto_decline_threshold"}
        for field in allowed:
            if field in body:
                db.execute(f"UPDATE agent_preferences SET {field}=? WHERE user_id=?", (body[field], user["id"]))
        db.commit()
        prefs = fetchone_dict(db, "SELECT * FROM agent_preferences WHERE user_id=?", (user["id"],))
        ok({"success": True, "preferences": prefs})
    else:
        err(405, "Method not allowed")


def handle_stats(db, method, params, body, headers):
    user = require_auth(db, headers)
    if user["role"] == "candidate":
        active_matches = db.execute(
            "SELECT COUNT(*) FROM matches WHERE candidate_id=? AND pipeline_stage NOT IN ('hired')", (user["id"],)
        ).fetchone()[0]
        pipeline_count = db.execute(
            "SELECT COUNT(*) FROM matches WHERE candidate_id=? AND pipeline_stage IN ('interested','interviewing','offer')", (user["id"],)
        ).fetchone()[0]
        agent_activity = db.execute(
            "SELECT COUNT(*) FROM agent_activities WHERE user_id=? AND created_at > datetime('now','-7 days')", (user["id"],)
        ).fetchone()[0]
        profile_views = random.randint(12, 48)
        ok({
            "role": "candidate",
            "active_matches": active_matches,
            "pipeline_count": pipeline_count,
            "agent_activity": agent_activity,
            "profile_views": profile_views,
            "match_rate": f"{random.randint(72, 94)}%",
            "avg_response_time": f"{random.randint(2, 12)}h",
        })
    else:
        active_jobs = db.execute(
            "SELECT COUNT(*) FROM jobs WHERE recruiter_id=? AND status='active'", (user["id"],)
        ).fetchone()[0]
        candidates_matched = db.execute(
            "SELECT COUNT(DISTINCT m.candidate_id) FROM matches m JOIN jobs j ON m.job_id=j.id WHERE j.recruiter_id=?", (user["id"],)
        ).fetchone()[0]
        interviews = db.execute(
            "SELECT COUNT(*) FROM matches m JOIN jobs j ON m.job_id=j.id WHERE j.recruiter_id=? AND m.pipeline_stage='interviewing'", (user["id"],)
        ).fetchone()[0]
        hires = db.execute(
            "SELECT COUNT(*) FROM matches m JOIN jobs j ON m.job_id=j.id WHERE j.recruiter_id=? AND m.pipeline_stage='hired'", (user["id"],)
        ).fetchone()[0]
        ok({
            "role": "recruiter",
            "active_jobs": active_jobs,
            "candidates_matched": candidates_matched,
            "interviews_scheduled": interviews,
            "hires_completed": hires,
            "avg_time_to_hire": f"{random.randint(18, 35)} days",
            "offer_acceptance_rate": f"{random.randint(68, 85)}%",
        })


def handle_hiring_pulse(db, method, params, body, headers):
    matches_today = db.execute(
        "SELECT COUNT(*) FROM matches WHERE created_at > datetime('now','start of day')"
    ).fetchone()[0]
    interviews = db.execute(
        "SELECT COUNT(*) FROM matches WHERE pipeline_stage='interviewing'"
    ).fetchone()[0]
    hires = db.execute(
        "SELECT COUNT(*) FROM matches WHERE pipeline_stage='hired'"
    ).fetchone()[0]
    total_candidates = db.execute("SELECT COUNT(*) FROM users WHERE role='candidate'").fetchone()[0]
    total_jobs = db.execute("SELECT COUNT(*) FROM jobs WHERE status='active'").fetchone()[0]
    ok({
        "matches_today": max(matches_today, 47),
        "interviews_scheduled": max(interviews, 23),
        "hires_completed": max(hires, 8),
        "active_candidates": total_candidates,
        "active_jobs": total_jobs,
        "platform_trust_avg": 89,
        "response_rate_avg": "87%",
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    })


def handle_leaderboard(db, method, params, body, headers):
    rows = fetchall_dict(db, """
        SELECT u.id, SUBSTR(u.name,1,1) || '.' || SUBSTR(u.name, INSTR(u.name,' ')+1, 1) || '.' as anon_name,
               cp.title, tp.trust_score,
               COUNT(m.id) as match_count,
               MAX(m.score) as top_score
        FROM users u
        JOIN candidate_profiles cp ON cp.user_id=u.id
        JOIN trust_profiles tp ON tp.user_id=u.id
        LEFT JOIN matches m ON m.candidate_id=u.id
        WHERE u.role='candidate'
        GROUP BY u.id
        ORDER BY match_count DESC, tp.trust_score DESC
        LIMIT 10
    """)
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    ok({"leaderboard": rows, "week": time.strftime("%Y-W%U")})


def handle_privacy_settings(db, method, params, body, headers):
    user = require_auth(db, headers)
    if method == "GET":
        ps = fetchone_dict(db, "SELECT * FROM privacy_settings WHERE user_id=?", (user["id"],))
        ok({"settings": ps})
    elif method == "PUT":
        allowed = {"show_salary", "show_current_employer", "show_contact", "show_location", "profile_visibility"}
        for field in allowed:
            if field in body:
                db.execute(f"UPDATE privacy_settings SET {field}=? WHERE user_id=?", (body[field], user["id"]))
        db.commit()
        ok({"success": True, "settings": fetchone_dict(db, "SELECT * FROM privacy_settings WHERE user_id=?", (user["id"],))})
    else:
        err(405, "Method not allowed")


def handle_consent(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    user = require_auth(db, headers)
    consent_type = body.get("type", "profile_view")
    granted = body.get("granted", True)
    requester_id = body.get("requester_id")
    ok({
        "success": True,
        "consent_type": consent_type,
        "granted": granted,
        "user_id": user["id"],
        "requester_id": requester_id,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    })


def handle_settings(db, method, params, body, headers):
    user = require_auth(db, headers)
    if method == "GET":
        ok({
            "two_fa_enabled": bool(user["two_fa_enabled"]),
            "notifications_enabled": bool(user["notifications_enabled"]),
            "last_login": user["last_login"],
            "email": user["email"],
            "role": user["role"],
        })
    elif method == "PUT":
        allowed = {"two_fa_enabled", "notifications_enabled"}
        for field in allowed:
            if field in body:
                db.execute(f"UPDATE users SET {field}=? WHERE id=?", (int(bool(body[field])), user["id"]))
        db.commit()
        ok({"success": True})
    else:
        err(405, "Method not allowed")


def handle_referral_link(db, method, params, body, headers):
    user = require_auth(db, headers)
    ref = fetchone_dict(db, "SELECT * FROM referrals WHERE user_id=?", (user["id"],))
    if not ref:
        code = hashlib.md5(f"ref_{user['id']}_{time.time()}".encode()).hexdigest()[:8].upper()
        db.execute("INSERT INTO referrals (user_id,referral_code) VALUES (?,?)", (user["id"], code))
        db.commit()
        ref = fetchone_dict(db, "SELECT * FROM referrals WHERE user_id=?", (user["id"],))
    ok({
        "referral_code": ref["referral_code"],
        "referral_url": f"https://agenthire.io/join?ref={ref['referral_code']}",
        "uses": ref["uses"],
        "reward": "$50 credit per successful referral",
    })


def handle_share_match_card(db, method, params, body, headers):
    user = require_auth(db, headers)
    match_id = params.get("match_id", [None])[0]
    if not match_id:
        err(400, "match_id required")
    match = fetchone_dict(db, """
        SELECT m.score, m.confidence, m.match_reasons,
               j.title as job_title, c.name as company_name, c.logo_url
        FROM matches m
        JOIN jobs j ON m.job_id=j.id
        JOIN companies c ON j.company_id=c.id
        WHERE m.id=? AND m.candidate_id=?
    """, (match_id, user["id"]))
    if not match:
        err(404, "Match not found")
    ok({
        "card": {
            "headline": f"I just matched {match['score']}% with {match['job_title']} at {match['company_name']}!",
            "score": match["score"],
            "confidence": match["confidence"],
            "job_title": match["job_title"],
            "company_name": match["company_name"],
            "share_url": f"https://agenthire.io/match/{match_id}",
            "image_url": f"https://og.agenthire.io/match?score={match['score']}&role={urllib.parse.quote(match['job_title'])}&company={urllib.parse.quote(match['company_name'])}",
        }
    })


def handle_weekly_digest(db, method, params, body, headers):
    user = require_auth(db, headers)
    if user["role"] == "candidate":
        new_matches = db.execute(
            "SELECT COUNT(*) FROM matches WHERE candidate_id=? AND created_at > datetime('now','-7 days')", (user["id"],)
        ).fetchone()[0]
        top_matches = fetchall_dict(db, """
            SELECT m.score, m.confidence, j.title as job_title, c.name as company_name
            FROM matches m
            JOIN jobs j ON m.job_id=j.id
            JOIN companies c ON j.company_id=c.id
            WHERE m.candidate_id=?
            ORDER BY m.score DESC LIMIT 3
        """, (user["id"],))
        ok({
            "digest": {
                "new_matches": max(new_matches, 5),
                "top_matches": top_matches,
                "agent_actions": random.randint(8, 22),
                "profile_views": random.randint(10, 40),
                "tip": "Update your skills list to improve match quality by up to 15%",
                "week": time.strftime("%B %d, %Y"),
            }
        })
    else:
        ok({
            "digest": {
                "new_candidates": random.randint(12, 35),
                "interviews_scheduled": random.randint(2, 8),
                "offers_sent": random.randint(0, 3),
                "tip": "Salary ranges with clear minimums get 2x more quality matches",
                "week": time.strftime("%B %d, %Y"),
            }
        })


def handle_achievements(db, method, params, body, headers):
    user = require_auth(db, headers)
    badges = fetchall_dict(db,
        "SELECT * FROM achievements WHERE user_id=? ORDER BY earned_at DESC", (user["id"],))
    ok({"achievements": badges, "total": len(badges)})


def handle_seed(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    # Force reseed
    db.execute("DELETE FROM agent_negotiation_logs")
    db.execute("DELETE FROM agent_activities")
    db.execute("DELETE FROM matches")
    db.execute("DELETE FROM jobs")
    db.execute("DELETE FROM trust_profiles")
    db.execute("DELETE FROM privacy_settings")
    db.execute("DELETE FROM agent_preferences")
    db.execute("DELETE FROM referrals")
    db.execute("DELETE FROM achievements")
    db.execute("DELETE FROM recruiter_profiles")
    db.execute("DELETE FROM candidate_profiles")
    db.execute("DELETE FROM companies")
    db.execute("DELETE FROM users")
    db.commit()
    seed_demo_data(db)
    candidates = db.execute("SELECT COUNT(*) FROM users WHERE role='candidate'").fetchone()[0]
    recruiters = db.execute("SELECT COUNT(*) FROM users WHERE role='recruiter'").fetchone()[0]
    jobs_count = db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    matches_count = db.execute("SELECT COUNT(*) FROM matches").fetchone()[0]
    ok({
        "success": True,
        "seeded": {
            "candidates": candidates,
            "recruiters": recruiters,
            "jobs": jobs_count,
            "matches": matches_count,
        },
        "demo_passwords": "demo123",
    })


# ---------------------------------------------------------------------------
# AI / Utility helpers shared by new endpoints
# ---------------------------------------------------------------------------
SKILL_TAXONOMY = {
    "Python": {"category": "Programming", "related": ["Django", "FastAPI", "Flask", "pandas", "NumPy", "PyTorch", "TensorFlow", "Scikit-learn", "Celery", "SQLAlchemy"]},
    "JavaScript": {"category": "Programming", "related": ["React", "Vue.js", "Angular", "Node.js", "TypeScript", "Next.js", "Express", "Svelte", "jQuery", "D3.js"]},
    "React": {"category": "Frontend", "related": ["Redux", "Next.js", "TypeScript", "React Native", "Gatsby", "Material UI", "Tailwind CSS", "Jest", "Storybook"]},
    "AWS": {"category": "Cloud", "related": ["EC2", "S3", "Lambda", "CloudFormation", "ECS", "RDS", "DynamoDB", "SQS", "API Gateway", "Terraform"]},
    "Machine Learning": {"category": "AI/ML", "related": ["Deep Learning", "NLP", "Computer Vision", "PyTorch", "TensorFlow", "Scikit-learn", "MLOps", "Hugging Face", "GPT", "Reinforcement Learning"]},
    "Docker": {"category": "DevOps", "related": ["Kubernetes", "Docker Compose", "CI/CD", "Jenkins", "GitHub Actions", "Helm", "Terraform", "Ansible", "ArgoCD"]},
    "SQL": {"category": "Data", "related": ["PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Elasticsearch", "BigQuery", "Snowflake", "dbt", "Apache Spark"]},
    "SAP": {"category": "Enterprise", "related": ["SAP S/4HANA", "ABAP", "SAP Fiori", "SAP BTP", "SAP HANA", "SAP MM", "SAP SD", "SAP PP", "SAP Integration Suite"]},
    "Java": {"category": "Programming", "related": ["Spring Boot", "Maven", "Gradle", "JUnit", "Hibernate", "Microservices", "Kafka", "REST APIs", "GraphQL"]},
    "Go": {"category": "Programming", "related": ["gRPC", "Gin", "Docker", "Kubernetes", "Microservices", "Protobuf", "Cobra", "Fiber"]},
    "Rust": {"category": "Programming", "related": ["WebAssembly", "Tokio", "Actix", "Systems Programming", "Cargo", "WASM"]},
    "TypeScript": {"category": "Programming", "related": ["React", "Angular", "Node.js", "Next.js", "NestJS", "Prisma", "tRPC", "Zod"]},
    "Kubernetes": {"category": "DevOps", "related": ["Docker", "Helm", "Istio", "Prometheus", "Grafana", "ArgoCD", "Terraform", "EKS", "GKE"]},
    "Cybersecurity": {"category": "Security", "related": ["Penetration Testing", "SIEM", "Zero Trust", "SOC", "Threat Modeling", "OWASP", "Burp Suite", "Nmap", "Wireshark"]},
    "Figma": {"category": "Design", "related": ["UI Design", "UX Research", "Prototyping", "Design Systems", "Adobe XD", "Sketch", "InVision", "Framer"]},
    "Product Management": {"category": "Management", "related": ["Agile", "Scrum", "Roadmapping", "User Research", "A/B Testing", "JIRA", "Confluence", "OKRs", "PRDs"]},
    "Data Science": {"category": "Data", "related": ["Python", "R", "Statistics", "Machine Learning", "SQL", "Tableau", "Power BI", "Jupyter", "pandas", "Apache Spark"]},
    "DevOps": {"category": "DevOps", "related": ["CI/CD", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "Prometheus", "Grafana", "AWS"]},
    "Blockchain": {"category": "Web3", "related": ["Solidity", "Ethereum", "Smart Contracts", "Web3.js", "DeFi", "NFTs", "Hardhat", "Truffle"]},
    "iOS": {"category": "Mobile", "related": ["Swift", "SwiftUI", "Xcode", "Core Data", "UIKit", "Combine", "TestFlight", "App Store Connect"]},
    "Android": {"category": "Mobile", "related": ["Kotlin", "Jetpack Compose", "Android Studio", "Room", "Retrofit", "Firebase", "Google Play"]},
}

DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "discard.email", "trashmail.com", "temp-mail.org", "fakeinbox.com",
    "maildrop.cc", "mailnull.com", "spamgourmet.com", "trashmail.me",
    "tempr.email", "dispostable.com", "mailnesia.com", "spamherelots.com",
    "mytemp.email", "tempinbox.com",
}

PERSONAL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
    "aol.com", "protonmail.com", "live.com", "msn.com", "me.com",
    "mac.com", "yandex.com", "mail.com", "zoho.com",
}


def _fuzzy_match(query: str, candidates: list) -> list:
    """Simple case-insensitive substring + prefix match returning sorted results."""
    q = query.lower()
    results = []
    for c in candidates:
        cl = c.lower()
        if q in cl or cl.startswith(q):
            results.append(c)
    return results


def _salary_estimate(skills: list, experience: int) -> dict:
    """Estimate salary range from skills and experience."""
    base = 60000
    exp_bonus = experience * 8000
    skill_bonus = len(skills) * 3000
    mid = base + exp_bonus + skill_bonus
    # Cap and floor
    mid = max(60000, min(mid, 300000))
    sal_min = int(mid * 0.9)
    sal_max = int(mid * 1.25)
    return {"min": sal_min, "max": sal_max}


def _title_seniority_multiplier(title: str) -> float:
    title_l = title.lower()
    if any(w in title_l for w in ["principal", "staff", "distinguished", "vp", "director", "head"]):
        return 1.5
    if any(w in title_l for w in ["senior", "sr.", "lead", "architect"]):
        return 1.25
    if any(w in title_l for w in ["junior", "jr.", "associate", "entry"]):
        return 0.75
    return 1.0


# ---------------------------------------------------------------------------
# Endpoint: skill-taxonomy
# ---------------------------------------------------------------------------
def handle_skill_taxonomy(db, method, params, body, headers):
    all_categories = sorted(set(v["category"] for v in SKILL_TAXONOMY.values()))
    q = params.get("q", [None])[0]
    if q:
        matches_raw = _fuzzy_match(q, list(SKILL_TAXONOMY.keys()))
        matches = [{"skill": s, "category": SKILL_TAXONOMY[s]["category"]} for s in matches_raw]
        related = []
        seen = set()
        for s in matches_raw:
            for r in SKILL_TAXONOMY[s]["related"]:
                if r not in seen:
                    related.append(r)
                    seen.add(r)
        ok({"matches": matches, "related": related[:20], "all_categories": all_categories})
    else:
        taxonomy_out = {
            skill: {"category": info["category"], "related": info["related"]}
            for skill, info in SKILL_TAXONOMY.items()
        }
        ok({"taxonomy": taxonomy_out, "all_categories": all_categories})


# ---------------------------------------------------------------------------
# Endpoint: ai-suggest-profile
# ---------------------------------------------------------------------------
def handle_ai_suggest_profile(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")

    # Support freeform text input — parse skills + experience from natural language
    freetext = (body.get("text") or "").strip()
    headline = (body.get("headline") or "").strip()
    skills = body.get("skills") or []
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = []
    experience = int(body.get("experience") or 0)

    if freetext:
        # Extract skills from text by matching taxonomy
        text_lower = freetext.lower()
        for sk in SKILL_TAXONOMY:
            if sk.lower() in text_lower and sk not in skills:
                skills.append(sk)
        # Also check related skills in taxonomy values
        for sk, meta in SKILL_TAXONOMY.items():
            for rel in meta.get("related", []):
                if rel.lower() in text_lower and rel not in skills:
                    skills.append(rel)
        # Extract experience years
        import re as _re
        exp_match = _re.search(r'(\d+)\s*(?:years?|yrs?)', freetext, _re.IGNORECASE)
        if exp_match and experience == 0:
            experience = int(exp_match.group(1))
        # Build headline from text if not provided
        if not headline:
            # Use first sentence, trimmed
            headline = freetext.split('.')[0][:80].strip()
        skills = skills[:10]  # cap at 10

    quality_tips = []
    profile_score = 50

    # Suggested headline
    suggested_headline = headline
    if not headline:
        if skills and experience >= 7:
            suggested_headline = f"Senior {skills[0]} Engineer"
        elif skills and experience >= 3:
            suggested_headline = f"{skills[0]} Developer"
        elif skills:
            suggested_headline = f"{skills[0]} Professional"
        else:
            suggested_headline = "Software Engineer"
        quality_tips.append({"field": "headline", "tip": "Add a specific headline to increase match rate by 40%", "impact": "high"})
    else:
        profile_score += 10

    # Suggest additional skills from taxonomy
    suggested_skills = []
    seen_suggested = set(s.lower() for s in skills)
    for skill in skills:
        entry = SKILL_TAXONOMY.get(skill)
        if entry:
            for r in entry["related"]:
                if r.lower() not in seen_suggested and r not in suggested_skills:
                    suggested_skills.append(r)
                    seen_suggested.add(r.lower())
        if len(suggested_skills) >= 8:
            break
    suggested_skills = suggested_skills[:5]

    # Salary estimate
    sal = _salary_estimate(skills, experience)
    skill_names = ", ".join(skills[:3]) if skills else "general"
    market_note = f"Based on {skill_names} + {experience}yr exp"
    salary_estimate = {"min": sal["min"], "max": sal["max"], "market_note": market_note}

    # Quality scoring
    if len(skills) < 3:
        quality_tips.append({"field": "skills", "tip": f"You have {len(skills)} skill(s), add more for better matches (minimum 3 recommended)", "impact": "critical"})
    else:
        profile_score += 15

    if len(skills) >= 5:
        profile_score += 10

    if experience == 0:
        quality_tips.append({"field": "experience", "tip": "Add your years of experience to improve match accuracy", "impact": "high"})
    else:
        profile_score += 10

    if not body.get("location"):
        quality_tips.append({"field": "location", "tip": "Adding location improves local job matching", "impact": "medium"})
    else:
        profile_score += 5

    profile_score = min(profile_score, 100)

    ok({
        "suggested_headline": suggested_headline,
        "suggested_skills": suggested_skills,
        "salary_estimate": salary_estimate,
        "quality_tips": quality_tips,
        "profile_score": profile_score,
    })


# ---------------------------------------------------------------------------
# Endpoint: ai-suggest-job
# ---------------------------------------------------------------------------
def handle_ai_suggest_job(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    title = (body.get("title") or "").strip()
    skills = body.get("skills") or []
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = []

    if not title:
        err(400, "title is required")

    title_l = title.lower()
    quality_tips = []
    quality_score = 50

    # Suggest skills from taxonomy based on title keywords
    suggested_skills = []
    seen_sug = set(s.lower() for s in skills)
    for tax_skill, info in SKILL_TAXONOMY.items():
        if tax_skill.lower() in title_l:
            for r in info["related"]:
                if r.lower() not in seen_sug and r not in suggested_skills:
                    suggested_skills.append(r)
                    seen_sug.add(r.lower())
        if len(suggested_skills) >= 10:
            break
    suggested_skills = suggested_skills[:8]

    # Generate multi-paragraph description
    seniority = "Senior" if any(w in title_l for w in ["senior", "sr.", "lead", "principal"]) else ""
    skill_str = ", ".join(skills[:4]) if skills else "relevant technologies"
    description = (
        f"We are looking for a {title} to join our growing team. "
        f"In this role you will design, build, and maintain high-quality systems using {skill_str}.\n\n"
        f"You will collaborate with cross-functional teams to deliver impactful solutions, "
        f"participate in code reviews, and help shape technical strategy. "
        f"{'As a ' + seniority + ' team member, you will mentor junior engineers and drive best practices. ' if seniority else ''}"
        f"The ideal candidate is passionate about technology and has a track record of delivering results.\n\n"
        f"What we offer: competitive compensation, flexible work environment, career growth opportunities, "
        f"and a collaborative, inclusive culture."
    )

    # Salary estimate
    estimated_exp = 5
    if any(w in title_l for w in ["senior", "sr.", "lead"]):
        estimated_exp = 7
    elif any(w in title_l for w in ["junior", "jr.", "associate"]):
        estimated_exp = 2
    elif any(w in title_l for w in ["principal", "staff", "director"]):
        estimated_exp = 10
    all_skills = list(set(skills + suggested_skills[:3]))
    sal = _salary_estimate(all_skills, estimated_exp)
    multiplier = _title_seniority_multiplier(title)
    sal_min = int(sal["min"] * multiplier)
    sal_max = int(sal["max"] * multiplier)

    # Quality tips
    if not skills:
        quality_tips.append({"field": "skills", "tip": "Add required skills to attract qualified candidates", "impact": "critical"})
    else:
        quality_score += 15
    if not body.get("description"):
        quality_tips.append({"field": "description", "tip": "Add a detailed description to increase applicant quality", "impact": "high"})
    else:
        desc_len = len(body["description"])
        if desc_len >= 50:
            quality_score += 10
        if desc_len >= 200:
            quality_score += 10
    if not body.get("location"):
        quality_tips.append({"field": "location", "tip": "Specify location or remote policy for better candidate targeting", "impact": "medium"})
    else:
        quality_score += 5
    quality_score = min(quality_score, 100)

    ok({
        "suggested_description": description,
        "suggested_skills": suggested_skills,
        "salary_estimate": {"min": sal_min, "max": sal_max, "market_note": f"Competitive range for {title}"},
        "quality_tips": quality_tips,
        "quality_score": quality_score,
    })


# ---------------------------------------------------------------------------
# Endpoint: validate-record
# ---------------------------------------------------------------------------
def handle_validate_record(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    record_type = body.get("type", "")
    data = body.get("data", {})
    if not isinstance(data, dict):
        err(400, "data must be an object")
    if record_type not in ("candidate", "recruiter"):
        err(400, "type must be 'candidate' or 'recruiter'")

    errors = []
    warnings = []
    suggestions = []
    quality_score = 100

    email_val = (data.get("email") or "").strip()
    if email_val:
        email_regex = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
        if not re.match(email_regex, email_val):
            errors.append({"field": "email", "message": "Invalid email format", "severity": "error"})
            quality_score -= 15
        else:
            domain = email_val.split("@")[-1].lower()
            if domain in DISPOSABLE_DOMAINS:
                errors.append({"field": "email", "message": "Disposable email addresses are not allowed", "severity": "error"})
                quality_score -= 20

    if record_type == "candidate":
        # Skills
        skills = data.get("skills") or []
        if isinstance(skills, str):
            try:
                skills = json.loads(skills)
            except Exception:
                skills = []
        if len(skills) < 3:
            errors.append({"field": "skills", "message": f"Minimum 3 skills required, got {len(skills)}", "severity": "error"})
            quality_score -= 20
        else:
            unknown = [s for s in skills if s not in SKILL_TAXONOMY]
            if unknown:
                suggestions.append({"field": "skills", "message": f"Skills not in taxonomy (consider standardizing): {', '.join(unknown[:5])}"})

        # Salary
        sal_min = data.get("salary_min", 0) or 0
        sal_max = data.get("salary_max", 0) or 0
        if sal_min < 30000 and sal_min > 0:
            warnings.append({"field": "salary", "message": "Salary minimum seems low (below $30,000)", "severity": "warning"})
            quality_score -= 5
        if sal_max > 500000:
            warnings.append({"field": "salary", "message": "Salary maximum seems unusually high (above $500,000)", "severity": "warning"})
            quality_score -= 5

        # Experience
        exp = data.get("experience_years", 0) or 0
        if exp < 0:
            errors.append({"field": "experience_years", "message": "Experience years cannot be negative", "severity": "error"})
            quality_score -= 10
        elif exp > 50:
            warnings.append({"field": "experience_years", "message": "Experience years > 50 seems unrealistic", "severity": "warning"})
            quality_score -= 5
        elif exp > 40:
            warnings.append({"field": "experience_years", "message": "Experience years > 40 — please verify", "severity": "warning"})

        # Headline
        headline = (data.get("headline") or data.get("title") or "").strip()
        if not headline:
            errors.append({"field": "headline", "message": "Headline is required", "severity": "error"})
            quality_score -= 15
        elif len(headline) < 3:
            errors.append({"field": "headline", "message": "Headline must be at least 3 characters", "severity": "error"})
            quality_score -= 10
        elif not re.search(r'[a-zA-Z]{3,}', headline):
            errors.append({"field": "headline", "message": "Headline appears to be gibberish", "severity": "error"})
            quality_score -= 10

    else:  # recruiter / job
        # Title
        title = (data.get("title") or "").strip()
        if not title:
            errors.append({"field": "title", "message": "Job title is required", "severity": "error"})
            quality_score -= 20
        elif len(title) < 3:
            errors.append({"field": "title", "message": "Title must be at least 3 characters", "severity": "error"})
            quality_score -= 15
        elif not re.search(r'[a-zA-Z]{3,}', title):
            errors.append({"field": "title", "message": "Title appears to be invalid", "severity": "error"})
            quality_score -= 15

        # Salary reasonableness
        sal_min = data.get("salary_min", 0) or 0
        sal_max = data.get("salary_max", 0) or 0
        skills = data.get("required_skills") or data.get("skills") or []
        if isinstance(skills, str):
            try:
                skills = json.loads(skills)
            except Exception:
                skills = []
        if sal_min > 0 and title:
            est = _salary_estimate(skills, 5)
            mult = _title_seniority_multiplier(title)
            est_min = int(est["min"] * mult)
            est_max = int(est["max"] * mult)
            if sal_max > est_max * 2:
                warnings.append({"field": "salary", "message": "Salary seems very high for this role", "severity": "warning"})
                quality_score -= 5
            if sal_min < est_min * 0.5:
                warnings.append({"field": "salary", "message": "Salary seems below market rate for this role", "severity": "warning"})
                quality_score -= 5
            if sal_min < 0:
                errors.append({"field": "salary", "message": "Salary cannot be negative", "severity": "error"})
                quality_score -= 10

        # Description
        desc = (data.get("description") or "").strip()
        if not desc:
            suggestions.append({"field": "description", "message": "Add a job description for better candidate matches"})
            quality_score -= 5
        elif len(desc) < 50:
            suggestions.append({"field": "description", "message": "Description is short (< 50 chars) — more detail improves match quality"})
            quality_score -= 3

        # Skills in taxonomy
        if skills:
            unknown = [s for s in skills if s not in SKILL_TAXONOMY]
            if unknown:
                suggestions.append({"field": "skills", "message": f"Skills not in taxonomy (consider standardizing): {', '.join(unknown[:5])}"})

        # Company domain match
        if email_val and data.get("company_website"):
            email_domain = email_val.split("@")[-1].lower()
            company_url = (data["company_website"] or "").lower()
            company_url = company_url.replace("https://", "").replace("http://", "").replace("www.", "")
            company_domain = company_url.split("/")[0]
            if email_domain != company_domain:
                suggestions.append({"field": "email", "message": "Recruiter email domain does not match company website domain"})

    quality_score = max(quality_score, 0)
    ok({
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "suggestions": suggestions,
        "quality_score": quality_score,
    })


# ---------------------------------------------------------------------------
# Endpoint: check-duplicate
# ---------------------------------------------------------------------------
def handle_check_duplicate(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    rec_type = body.get("type", "candidate")
    email = (body.get("email") or "").strip().lower()
    name = (body.get("name") or "").strip().lower()
    title = (body.get("title") or "").strip().lower()
    skills = body.get("skills") or []
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = []
    skills_set = set(s.lower() for s in skills)

    similar = []
    duplicate = False

    if rec_type == "candidate":
        # Exact email match
        if email:
            row = fetchone_dict(db, "SELECT id, name, email FROM users WHERE role='candidate' AND LOWER(email)=?", (email,))
            if row:
                duplicate = True
                similar.append({"id": row["id"], "name": row["name"], "email": row["email"], "similarity": 1.0, "reason": "duplicate_email"})

        # Name + skills overlap
        if not duplicate and name:
            candidates = fetchall_dict(db,
                """SELECT u.id, u.name, cp.skills FROM users u
                   JOIN candidate_profiles cp ON cp.user_id = u.id
                   WHERE u.role='candidate'"""
            )
            for c in candidates:
                c_name = (c.get("name") or "").lower()
                c_skills_raw = c.get("skills") or "[]"
                try:
                    c_skills = set(s.lower() for s in json.loads(c_skills_raw))
                except Exception:
                    c_skills = set()
                name_match = 1.0 if c_name == name else (0.7 if name in c_name or c_name in name else 0.0)
                if skills_set and c_skills:
                    overlap = len(skills_set & c_skills) / max(len(skills_set), len(c_skills))
                else:
                    overlap = 0.0
                combined = name_match * 0.4 + overlap * 0.6
                if combined >= 0.8:
                    similar.append({"id": c["id"], "name": c["name"], "similarity": round(combined, 2), "reason": "name_skills_overlap"})
    else:  # job
        recruiter_id = body.get("recruiter_id")
        if recruiter_id and title:
            jobs_rows = fetchall_dict(db,
                "SELECT id, title, required_skills, recruiter_id FROM jobs WHERE recruiter_id=? AND status='active'",
                (recruiter_id,)
            )
            for j in jobs_rows:
                j_title = (j.get("title") or "").lower()
                j_skills_raw = j.get("required_skills") or "[]"
                try:
                    j_skills = set(s.lower() for s in json.loads(j_skills_raw))
                except Exception:
                    j_skills = set()
                # Title similarity: word overlap
                t_words = set(title.split())
                j_words = set(j_title.split())
                title_sim = len(t_words & j_words) / max(len(t_words), len(j_words), 1)
                if skills_set and j_skills:
                    skill_overlap = len(skills_set & j_skills) / max(len(skills_set), len(j_skills))
                else:
                    skill_overlap = 0.0
                combined = title_sim * 0.5 + skill_overlap * 0.5
                if combined >= 0.7:
                    similar.append({"id": j["id"], "title": j["title"], "similarity": round(combined, 2), "reason": "title_skills_overlap"})
                    if combined >= 0.95:
                        duplicate = True

    ok({"duplicate": duplicate, "similar": similar})


# ---------------------------------------------------------------------------
# Endpoint: validate-email
# ---------------------------------------------------------------------------
def handle_validate_email(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    email = (body.get("email") or "").strip()
    if not email:
        err(400, "email is required")

    warnings = []
    email_regex = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
    if not re.match(email_regex, email):
        ok({"valid": False, "domain_type": "unknown", "warnings": ["Invalid email format"]})

    domain = email.split("@")[-1].lower()
    local = email.split("@")[0].lower()

    # Disposable check
    if domain in DISPOSABLE_DOMAINS:
        ok({"valid": False, "domain_type": "disposable", "warnings": ["Disposable email domains are not accepted"]})

    # Obviously fake patterns
    fake_patterns = [
        r'^[a-z]@[a-z]\.',
        r'^test@test\.',
        r'^admin@admin\.',
        r'^foo@bar\.',
        r'^aaa+@',
        r'^user@user\.',
        r'^example@example\.',
    ]
    for pat in fake_patterns:
        if re.match(pat, email.lower()):
            warnings.append("Email appears to be a placeholder or test address")
            break
    if local in ("test", "admin", "user", "example", "noreply", "no-reply", "info", "support"):
        warnings.append("Common generic local-part detected — may not be a real user address")

    if domain in PERSONAL_DOMAINS:
        domain_type = "personal"
    elif domain in DISPOSABLE_DOMAINS:
        domain_type = "disposable"
    else:
        domain_type = "corporate"

    ok({"valid": True, "domain_type": domain_type, "warnings": warnings})


# ---------------------------------------------------------------------------
# Endpoint: parse-resume
# ---------------------------------------------------------------------------
def handle_parse_resume(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    url = (body.get("url") or "").strip().lower()
    text = (body.get("text") or "").strip().lower()

    combined = url + " " + text

    # Determine skills from hints
    skills = []
    if any(w in combined for w in ["ml", "machine-learning", "machine learning", "ai", "pytorch", "tensorflow"]):
        skills += ["Machine Learning", "Python", "PyTorch", "TensorFlow"]
    if any(w in combined for w in ["frontend", "react", "vue", "angular", "javascript"]):
        skills += ["React", "JavaScript", "TypeScript", "CSS"]
    if any(w in combined for w in ["backend", "python", "django", "fastapi", "flask"]):
        skills += ["Python", "Django", "FastAPI", "SQL"]
    if any(w in combined for w in ["devops", "kubernetes", "docker", "k8s", "terraform"]):
        skills += ["Docker", "Kubernetes", "Terraform", "CI/CD"]
    if any(w in combined for w in ["data", "analyst", "analytics", "sql", "tableau"]):
        skills += ["SQL", "Python", "Tableau", "Data Science"]
    if any(w in combined for w in ["security", "cyber", "pentest", "soc"]):
        skills += ["Cybersecurity", "Penetration Testing", "SIEM"]
    if any(w in combined for w in ["mobile", "ios", "swift", "swiftui"]):
        skills += ["iOS", "Swift", "SwiftUI"]
    if any(w in combined for w in ["android", "kotlin", "jetpack"]):
        skills += ["Android", "Kotlin", "Jetpack Compose"]
    if any(w in combined for w in ["java", "spring", "springboot"]):
        skills += ["Java", "Spring Boot", "Microservices"]
    if any(w in combined for w in ["blockchain", "solidity", "web3", "ethereum"]):
        skills += ["Blockchain", "Solidity", "Web3.js"]

    # Deduplicate
    seen = set()
    skills_dedup = []
    for s in skills:
        if s not in seen:
            skills_dedup.append(s)
            seen.add(s)
    if not skills_dedup:
        skills_dedup = ["Python", "JavaScript", "SQL", "Docker"]

    # Experience
    experience = 3
    if any(w in combined for w in ["senior", "sr.", "lead", "principal", "staff"]):
        experience = 7
    elif any(w in combined for w in ["junior", "jr.", "entry", "intern", "graduate"]):
        experience = 1
    elif any(w in combined for w in ["10", "11", "12", "13", "14", "15"]):
        experience = 12
    elif any(w in combined for w in ["5", "6", "7", "8"]):
        experience = 6

    # Location hint
    location = "San Francisco, CA"
    if any(w in combined for w in ["new-york", "new york", "nyc"]):
        location = "New York, NY"
    elif any(w in combined for w in ["austin", "texas", "tx"]):
        location = "Austin, TX"
    elif any(w in combined for w in ["seattle", "washington"]):
        location = "Seattle, WA"
    elif any(w in combined for w in ["london", "uk", "united-kingdom"]):
        location = "London, UK"
    elif any(w in combined for w in ["berlin", "germany"]):
        location = "Berlin, Germany"
    elif any(w in combined for w in ["remote"]):
        location = "Remote"

    # Headline
    if skills_dedup:
        primary = skills_dedup[0]
        if experience >= 7:
            headline = f"Senior {primary} Engineer"
        elif experience >= 4:
            headline = f"{primary} Developer"
        else:
            headline = f"{primary} Engineer"
    else:
        headline = "Software Engineer"

    # Name hint from URL
    name = "Candidate"
    if "linkedin.com/in/" in url:
        slug = url.split("linkedin.com/in/")[-1].strip("/").split("?")[0]
        parts = [p.capitalize() for p in re.split(r'[-_]', slug) if re.match(r'[a-z]+', p)][:2]
        if parts:
            name = " ".join(parts)

    summary = (
        f"Experienced {headline} with {experience}+ years of hands-on expertise in "
        + ", ".join(skills_dedup[:4])
        + ". Passionate about building scalable, high-quality software solutions."
    )

    ok({
        "name": name,
        "headline": headline,
        "skills": skills_dedup[:10],
        "experience": experience,
        "location": location,
        "summary": summary,
    })


# ---------------------------------------------------------------------------
# Endpoint: ai-chat-assist
# ---------------------------------------------------------------------------
AI_CHAT_KB = {
    "skills": {
        "answer": "List your top technical skills. Include programming languages, frameworks, tools, and soft skills. Aim for 5-10 skills for the best match rate.",
        "suggestions": ["Check related skills for your existing ones", "Add both technical and soft skills"],
    },
    "headline": {
        "answer": "Your headline is the first thing recruiters see. Make it specific: include your role, key technology, and seniority (e.g., 'Senior Python Engineer | ML & APIs').",
        "suggestions": ["Include your primary technology", "Mention seniority level", "Keep it under 10 words"],
    },
    "salary": {
        "answer": "Set a salary range that reflects your market value. Research average salaries for your role and location. Setting a range (not just a minimum) improves match quality.",
        "suggestions": ["Use our salary estimator tool", "Consider remote vs. on-site differences"],
    },
    "experience": {
        "answer": "Enter your total years of professional experience. Count from your first paid engineering or relevant role. Internships can count as partial years.",
        "suggestions": ["Include freelance and contract work", "Don't undercount — imposter syndrome is real!"],
    },
    "location": {
        "answer": "Enter your current city or 'Remote' if you prefer remote work. This helps match you with jobs in your area or compatible remote roles.",
        "suggestions": ["You can update this anytime", "Set work preference to Remote for maximum reach"],
    },
    "summary": {
        "answer": "Write 2-4 sentences about your background, what you build, and what you're looking for. Be specific about technologies and impact.",
        "suggestions": ["Mention a notable achievement", "Include what kind of company/role you want next"],
    },
    "job_description": {
        "answer": "A great job description includes: role responsibilities, required and nice-to-have skills, team structure, tech stack, and what success looks like in 90 days.",
        "suggestions": ["Aim for 200+ words", "Avoid jargon — be direct about the role"],
    },
    "job_skills": {
        "answer": "List only genuinely required skills as required, and move nice-to-haves to the optional section. Over-specifying required skills reduces your candidate pool.",
        "suggestions": ["5-8 required skills is optimal", "Use our skill taxonomy for standardized names"],
    },
}

CONTEXT_MAP = {
    "candidate_wizard_step1": "headline",
    "candidate_wizard_step2": "skills",
    "candidate_wizard_step3": "experience",
    "candidate_wizard_step4": "salary",
    "candidate_wizard_step5": "location",
    "candidate_wizard_step6": "summary",
    "job_wizard_description": "job_description",
    "job_wizard_skills": "job_skills",
    "job_wizard_salary": "salary",
}


def handle_ai_chat_assist(db, method, params, body, headers):
    if method != "POST":
        err(405, "Method not allowed")
    question = (body.get("question") or "").strip().lower()
    context = (body.get("context") or "").strip().lower()

    # Try context mapping first
    topic = CONTEXT_MAP.get(context)

    # Fallback: keyword match against question
    if not topic:
        for kw in ["skill", "headline", "salary", "experience", "location", "summary", "description"]:
            if kw in question:
                topic = kw if kw != "skill" else "skills"
                break

    if topic and topic in AI_CHAT_KB:
        entry = AI_CHAT_KB[topic]
        ok({"answer": entry["answer"], "suggestions": entry["suggestions"]})
    else:
        ok({
            "answer": "I'm here to help you fill out your profile. Ask me about skills, headline, salary, experience, location, or your summary.",
            "suggestions": [
                "Try asking: 'What should I put for skills?'",
                "Or: 'How should I write my headline?'",
            ],
        })


# ---------------------------------------------------------------------------
# Endpoint: draft
# ---------------------------------------------------------------------------
def handle_draft(db, method, params, body, headers):
    user = require_auth(db, headers)
    user_id = user["id"]

    if method == "GET":
        draft_type = params.get("type", [None])[0]
        if draft_type:
            row = fetchone_dict(db,
                "SELECT id, draft_type, data, updated_at FROM drafts WHERE user_id=? AND draft_type=?",
                (user_id, draft_type)
            )
            if not row:
                err(404, "No draft found")
            try:
                row["data"] = json.loads(row["data"])
            except Exception:
                pass
            ok(row)
        else:
            rows = fetchall_dict(db,
                "SELECT id, draft_type, data, updated_at FROM drafts WHERE user_id=? ORDER BY updated_at DESC",
                (user_id,)
            )
            for r in rows:
                try:
                    r["data"] = json.loads(r["data"])
                except Exception:
                    pass
            ok({"drafts": rows})

    elif method == "POST":
        draft_type = body.get("type", "").strip()
        data = body.get("data", {})
        if not draft_type:
            err(400, "type is required (e.g. 'candidate_profile' or 'job_posting')")
        if draft_type not in ("candidate_profile", "job_posting"):
            err(400, "type must be 'candidate_profile' or 'job_posting'")
        data_json = json.dumps(data)
        now = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
        db.execute(
            """INSERT INTO drafts (user_id, draft_type, data, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id, draft_type) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at""",
            (user_id, draft_type, data_json, now)
        )
        db.commit()
        ok({"success": True, "type": draft_type, "updated_at": now})

    else:
        err(405, "Method not allowed")


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
ROUTES = {
    "health": handle_health,
    "register": handle_register,
    "login": handle_login,
    "forgot-password": handle_forgot_password,
    "verify-email": handle_verify_email,
    "profile": handle_profile,
    "profile-completeness": handle_profile_completeness,
    "availability": handle_availability,
    "linkedin-import": handle_linkedin_import,
    "trust-score": handle_trust_score,
    "report": handle_report,
    "verify-identity": handle_verify_identity,
    "company": handle_company,
    "jobs": handle_jobs,
    "job-templates": handle_job_templates,
    "ai-job-description": handle_ai_job_description,
    "bulk-jobs": handle_bulk_jobs,
    "matches": handle_matches,
    "match-detail": handle_match_detail,
    "match-action": handle_match_action,
    "pipeline": handle_pipeline,
    "agent-feed": handle_agent_feed,
    "agent-preferences": handle_agent_preferences,
    "stats": handle_stats,
    "hiring-pulse": handle_hiring_pulse,
    "leaderboard": handle_leaderboard,
    "privacy-settings": handle_privacy_settings,
    "consent": handle_consent,
    "settings": handle_settings,
    "referral-link": handle_referral_link,
    "share-match-card": handle_share_match_card,
    "weekly-digest": handle_weekly_digest,
    "achievements": handle_achievements,
    "seed": handle_seed,
    "skill-taxonomy": handle_skill_taxonomy,
    "ai-suggest-profile": handle_ai_suggest_profile,
    "ai-suggest-job": handle_ai_suggest_job,
    "validate-record": handle_validate_record,
    "check-duplicate": handle_check_duplicate,
    "validate-email": handle_validate_email,
    "parse-resume": handle_parse_resume,
    "ai-chat-assist": handle_ai_chat_assist,
    "draft": handle_draft,
}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def main():
    method = os.environ.get("REQUEST_METHOD", "GET").upper()

    # Handle CORS preflight
    if method == "OPTIONS":
        sys.stdout.write("Status: 204\r\n")
        sys.stdout.write(CORS_HEADERS)
        sys.stdout.write("\r\n")
        sys.stdout.flush()
        return

    # Parse query string
    qs = os.environ.get("QUERY_STRING", "")
    params = urllib.parse.parse_qs(qs)
    route = params.get("route", ["health"])[0]

    # Parse request body
    body = {}
    if method in ("POST", "PUT", "PATCH"):
        try:
            content_length = int(os.environ.get("CONTENT_LENGTH", 0) or 0)
            if content_length > 0:
                raw = sys.stdin.read(content_length)
            else:
                raw = sys.stdin.read()
            if raw.strip():
                body = json.loads(raw)
        except Exception:
            body = {}

    # Collect request headers
    headers = {k: v for k, v in os.environ.items()}

    # Open DB
    db = sqlite3.connect(DB_PATH)
    db.row_factory = None  # we use custom fetchone_dict

    try:
        # Initialize schema
        init_db(db)
        # Auto-seed if empty
        ensure_seeded(db)

        handler = ROUTES.get(route)
        if handler is None:
            err(404, f"Unknown route: {route}. Available: {', '.join(sorted(ROUTES.keys()))}")

        handler(db, method, params, body, headers)

        # If handler returned without raising, return empty 200
        send(200, {"status": "ok"})

    except ApiResp as resp:
        send(resp.status, resp.body)
    except sqlite3.IntegrityError as e:
        send(409, {"error": "Database conflict", "detail": str(e)})
    except Exception as e:
        send(500, {"error": "Internal server error", "detail": str(e)})
    finally:
        try:
            db.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
