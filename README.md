# AtlasOps — AI-Powered Enterprise Content Operations Platform

**Team: The Token Titans** | ET AI Hackathon 2026 — Track 1: AI for Enterprise Content Operations

> *From product spec to published post — fully automated, compliance-guaranteed.*

---

## The Problem

Enterprise content teams spend **3–5 days** on every piece of content:
- A writer drafts it (1 day)
- Legal/brand compliance reviews it (1–2 days, manual, often requires rewrites)
- A translation agency localizes it (1 day, expensive)
- Someone manually publishes it to each platform (hours)

At scale — 20+ content pieces per month — this costs mid-size companies **₹12–18 lakh/year** in labor, delays, and compliance errors that reach audiences.

---

## The Solution

AtlasOps is a **5-agent LangGraph pipeline** that automates the entire content lifecycle — draft → compliance → localize → approve → publish — with a human-in-the-loop approval gate before anything goes live.

```
User submits topic → Drafting Agent → Compliance Agent (retry loop, max 3x)
                                            ↓ PASS
                                    Localization Agent (Hindi, Marathi + more)
                                            ↓
                                    Approval Gate (email + dashboard)
                                            ↓ APPROVED
                                    Publishing Agent (Buffer API → LinkedIn, Instagram, Twitter/X, Threads)
```

### The 5 Agents

| Agent | Role | LLM | Key Output |
|-------|------|-----|------------|
| **Drafting Protocol** | Generates blog post + all social channel variants | Gemini 2.5 Flash | `draft_text`, `channel_variants` |
| **Compliance Engine** | Checks against configurable rules, flags violations, suggests rewrites | Gemini 2.5 Flash (temp=0) | `compliance_result` with pass/fail + issues |
| **L10N Protocol** | Translates + culturally adapts to Hindi, Marathi, and more | Gemini 2.5 Flash | `localized_variants` dict |
| **Approval Gate** | Sends preview email to human reviewer via Resend | — | `approval_status` |
| **Publishing Agent** | Publishes approved content to all channels via Buffer GraphQL API | — | `published_urls` |

---

## Tech Stack

**Backend**
- Python 3.11 + FastAPI
- LangGraph (StateGraph, conditional edges, retry loops)
- Google Gemini 2.5 Flash (primary LLM for all agents)
- APScheduler (polls for approved jobs every 5 minutes)
- Supabase (PostgreSQL — jobs, agent_logs, audit_logs, localizations, compliance tables)
- Resend (approval email delivery)
- Buffer GraphQL API (multi-channel social publishing)
- pdfplumber (product spec PDF extraction)

**Frontend**
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + Framer Motion
- Recharts (analytics charts)
- Supabase JS client (real-time polling)

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project (free tier works)
- Google AI Studio API key (Gemini)
- Buffer developer account (free)
- Resend account (free, 100 emails/day)

### 1. Environment Variables

Create `backend/.env`:

```env
# LLM
GOOGLE_API_KEY=your_gemini_api_key_here

# Database
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Email (approval notifications)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
APPROVER_EMAIL=your@email.com

# Publishing
BUFFER_ACCESS_TOKEN=your_buffer_access_token_here

# App
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```
### 2. Clone & Install & Run Locally

```bash
********** Terminal 1: Run the Backend (FastAPI) *********
Make sure you are in the root atlas directory in your terminal before running these commands.

For Windows (using Git Bash):

bash
# 1. Create a virtual environment (if you haven't already)
python -m venv .venv
# 2. Activate the virtual environment
source .venv/Scripts/activate
# 3. Install the required Python packages
pip install -r backend/requirements.txt
# 4. Run the FastAPI server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

For macOS (using Terminal / Bash / Zsh):

bash
# 1. Create a virtual environment (if you haven't already)
python3 -m venv .venv
# 2. Activate the virtual environment
source .venv/bin/activate
# 3. Install the required Python packages
pip install -r backend/requirements.txt
# 4. Run the FastAPI server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

(You should see a message saying Application startup complete. The backend is now running at http://localhost:8000)

********** Terminal 2: Run the Frontend (Next.js) *********
Open a new Git Bash (Windows) or Terminal (macOS) window, navigate to the root atlas directory, and run:

For BOTH Windows (Git Bash) and macOS:

bash
# 1. Install Node.js dependencies (only needed the first time or if package.json changes)
npm install
# 2. Start the Next.js development server
npm run dev
(You should see a message saying the server is ready. The frontend is now running at http://localhost:3000)
```

### 3. Database Setup

Run the full schema in your Supabase SQL Editor:

```bash
# Copy and paste contents of supabase/schema.sql into Supabase SQL Editor
# This creates all tables: jobs, agents, agent_logs, audit_logs,
# localizations, compliance_rules, compliance_policies, blocked_terms,
# published_posts, organizations, profiles, etc.
```

Seed default compliance rules:

```sql
INSERT INTO compliance_rules (id, rules) VALUES (1, '{
  "forbidden_words": ["guarantee", "100% ROI", "risk-free", "unlimited", "guaranteed returns"],
  "required_disclaimers": ["Past performance is not indicative of future results"],
  "tone_guidelines": "Professional, authoritative, evidence-based. No hyperbole.",
  "max_exclamation_marks": 1
}'::jsonb) ON CONFLICT (id) DO NOTHING;
```

## Running the 3 Hackathon Scenarios

### Scenario 1 — Product Launch Sprint
1. Click **New Mission** in the dashboard
2. Topic: `"New AI-powered CRM platform launch"`
3. Audience: `"Enterprise Sales Directors"`
4. Channels: Instagram, Threads, Twitter/X
5. Languages: English + Hindi
6. Upload a sample product spec PDF (optional)
7. Click **Launch** → watch the Kanban board progress through all 5 stages

### Scenario 2 — Compliance Rejection
1. Go to **Compliance Rules** page
2. Ensure `"guarantee"` and `"100% ROI"` are in forbidden words
3. Submit a new mission with topic: `"Our platform guarantees 100% ROI improvement"`
4. Watch the Compliance Engine flag the violation, show the exact sentence, and trigger a retry
5. The Drafting Protocol rewrites automatically — verify in the Audit Trail

### Scenario 3 — Performance Pivot (Content Intelligence)
1. Go to **Analytics** page
2. The AI Insights card analyzes engagement patterns
3. If video content outperforms text 4x for any audience segment, it surfaces a strategy shift recommendation
4. Recommendations appear automatically — no manual intervention needed

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pipeline/start` | Start a new content pipeline job |
| `GET` | `/api/jobs` | List all jobs (for Kanban board) |
| `GET` | `/api/jobs/{job_id}` | Get full job detail |
| `POST` | `/api/jobs/{job_id}/approve` | Approve job → triggers Publishing Agent |
| `POST` | `/api/jobs/{job_id}/reject` | Reject job with feedback → routes back to Drafting |
| `GET` | `/api/rules` | Get current compliance rules |
| `POST` | `/api/rules` | Update compliance rules |
| `GET` | `/health` | Health check |
| `POST` | `/webhook/buffer` | Buffer webhook (post published callback) |

All responses follow: `{ "success": bool, "data": {} | null, "error": string | null }`

---

## Project Structure

```
atlasops/
├── backend/
│   ├── main.py                    # FastAPI app + APScheduler
│   ├── supabase_client.py         # Supabase connection
│   ├── requirements.txt
│   └── graph/
│       ├── state.py               # ContentOpsState TypedDict
│       ├── workflow.py            # LangGraph graph assembly
│       └── nodes/
│           ├── drafting.py        # Drafting Protocol
│           ├── compliance.py      # Compliance Engine
│           ├── localization.py    # L10N Protocol
│           ├── approval.py        # Approval Gate
│           └── publishing.py      # Publishing Agent (Buffer API)
├── src/
│   ├── app/
│   │   ├── (dashboard)/           # All dashboard pages
│   │   │   ├── pipeline/          # Kanban board
│   │   │   ├── agents/            # Agent Constellation view
│   │   │   ├── analytics/         # Analytics + AI Insights
│   │   │   ├── audit/             # Audit Trail
│   │   │   ├── rules/             # Compliance Rules config
│   │   │   └── settings/          # Settings
│   │   └── (auth)/                # Login / Signup
│   └── components/
│       ├── DashboardShell.tsx     # Main layout
│       ├── NewJobModal.tsx        # Launch pipeline form
│       ├── JobDetailPanel.tsx     # Job detail side panel
│       └── views/
│           ├── PipelineBoard.tsx  # Kanban board
│           ├── AgentConstellation.tsx
│           ├── AnalyticsView.tsx
│           ├── AuditTrail.tsx
│           └── ComplianceRules.tsx
├── supabase/
│   └── schema.sql                 # Complete DB schema
└── README.md
```

---

## Architecture Summary

```
[React Next.js Frontend]
         ↕ REST API + Supabase Realtime
[FastAPI Backend]
         ↕
[LangGraph Pipeline]
  Drafting → Compliance (retry loop ×3) → Localization → Approval → Publishing
         ↕                    ↕                  ↕              ↕           ↕
    [Gemini 2.5]         [Gemini 2.5]       [Gemini 2.5]   [Resend]   [Buffer API]
         ↕                    ↕                  ↕              ↕           ↕
                         [Supabase PostgreSQL — jobs, logs, audit, localizations]
```

Every agent decision is logged to `agent_logs` and `audit_logs` — full enterprise audit trail.

---

## Impact Model (Summary)

| Metric | Before AtlasOps | After AtlasOps | Improvement |
|--------|----------------|----------------|-------------|
| Content cycle time | 3–5 days | 15–45 minutes | **96% reduction** |
| Compliance review cost | ₹15,000/piece | ₹0 (automated) | **100% saved** |
| Translation cost | ₹8,000/piece/language | ₹0 (automated) | **100% saved** |
| Monthly saving (20 pieces) | — | ₹1,00,000+ | **₹12 lakh/year** |

See `IMPACT_MODEL.pdf` for full calculations with assumptions.

---

## Team — The Token Titans

Built for ET AI Hackathon 2026, Track 1: AI for Enterprise Content Operations

---

*AtlasOps — Where enterprise content goes from zero to published, automatically.*
