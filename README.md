# AI Workflow Vault — Silver & Gold Tier

A fully autonomous AI agent system built with Node.js and Claude AI. Runs 24/7 to handle messaging, social media, business reporting, and task automation.

---

## 🗂 Project Structure
```
AI_Workflow_Vault/
├── Inbox/                    # Drop files here to trigger watcher
├── Needs_Action/             # AI-processed files awaiting action
├── Done/                     # Completed tasks
├── Pending_Approval/         # Actions awaiting human approval
├── logs/                     # Audit logs (JSONL)
├── vault/                    # Obsidian markdown output
├── Skill/
│   ├── linkedin_poster.js
│   ├── reasoning_loop.js
│   ├── approval.js
│   ├── audit_logger.js
│   ├── retry.js
│   ├── ceo_briefing.js
│   ├── ralph_loop.js
│   ├── meta_poster.js
│   └── twitter_poster.js
├── watcher.js
├── whatsapp_watcher.js
├── linkedin_watcher.js
├── mcp_email_server.js
├── mcp_odoo_server.js
├── mcp_social_server.js
├── scheduler.js
├── .env                      # Never commit this
├── .env.example              # Safe to share
└── package.json
```

---

## ⚡ Requirements

- Node.js v18+
- NPM
- Docker Desktop (for Odoo in Gold tier)
- PM2 (`npm install -g pm2`)

---

## 🚀 Setup

1. Clone the repo and install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

3. Start all processes with PM2:
```bash
pm2 start watcher.js           --name file-watcher
pm2 start whatsapp_watcher.js  --name whatsapp-watcher
pm2 start linkedin_watcher.js  --name linkedin-watcher
pm2 start scheduler.js         --name scheduler
pm2 save
pm2 startup
```

---

## 🐳 Odoo Setup (Gold Tier)
```bash
cd C:\Odoo
docker compose up -d
```

Open `http://localhost:8069` and create your database.

---

## 🔄 How It Works

| Tier | Features |
|------|----------|
| **Silver** | File watcher, WhatsApp & LinkedIn automation, reasoning loop, email MCP server, approval gate, PM2 scheduling |
| **Gold** | Facebook/Instagram/Twitter posting, Odoo CRM integration, audit logging, retry system, weekly CEO briefing, Ralph autonomous loop |

---

## 📁 File Workflow

1. Drop a file into `/Inbox`
2. Watcher picks it up and processes it with Claude AI
3. Moves to `/Needs_Action` with AI summary
4. Reasoning loop writes a plan to `/vault`
5. Completed tasks move to `/Done`

---

## 🔐 Security

- Never commit `.env` — it's in `.gitignore`
- Use `.env.example` to share required variable names
- All sensitive actions go through the approval gate before executing

---

## ✅ Checklist

- [x] File watcher with AI processing
- [x] WhatsApp & LinkedIn message watchers
- [x] LinkedIn auto-poster with approval gate
- [x] Daily reasoning loop → Obsidian vault
- [x] MCP email server
- [x] PM2 process management
- [x] Facebook & Instagram poster
- [x] Twitter poster
- [x] Audit logger (JSONL)
- [x] Retry system with exponential backoff
- [x] Weekly CEO briefing
- [x] Ralph autonomous loop
- [x] Odoo CRM integration via Docker
