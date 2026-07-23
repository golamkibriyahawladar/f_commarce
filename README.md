# AiChat-OMNI (Autozy) — Project Documentation

> **Last Updated:** 2026-07-23
> This document is the complete technical reference for the project. Any developer or AI agent can read this and contribute to the codebase.

---

## 📌 Project Summary

**AiChat-OMNI** (brand name: **Autozy**) is a **multi-tenant SaaS automation suite** built for Bangladeshi e-commerce businesses. It brings together an **omnichannel inbox**, **AI-powered chatbot autopilot**, **CRM**, **lead management**, **order/courier tracking**, and a **developer webhook API** — all within a single unified dashboard.

### Core Goals
1. **Omnichannel Inbox** — View and reply to all messages from Facebook Messenger, Instagram DM, WhatsApp, and custom webhooks in one place
2. **AI Autopilot** — Configurable AI Agents that auto-reply to customers (multi-LLM: OpenAI, Gemini, OpenRouter, Ollama)
3. **RAG Knowledge Base** — Upload PDF/DOCX/TXT files, generate vector embeddings via Pinecone, and deliver context-aware AI replies
4. **Meta Lead Capture** — Automatically capture lead data from Facebook/Instagram Ads
5. **CRM & Delivery** — Customer profile management and courier order tracking (Steadfast, Pathao)
6. **Developer API** — Webhook token-based API for external system integration
7. **Multi-Tenant Architecture** — Complete data isolation per company/merchant (enforced via RLS)
8. **Super Admin Panel** — Cross-tenant monitoring and management of all companies, users, and integrations

---

## 🛠 Technology Stack

### Frontend

| Technology | Version | Why It's Used |
|---|---|---|
| **Next.js** | `16.2.9` | App Router-based full-stack React framework. Provides server-side API routes (`/api/*`), server components, and client-side interactivity in a single project. |
| **React** | `19.2.4` | UI component library. The base rendering framework for Next.js. |
| **TypeScript** | `^5` | Static type safety — reduces runtime errors and keeps the codebase maintainable as it grows. |
| **Tailwind CSS** | `v4` | Utility-first CSS framework. Enables rapid UI development, consistent spacing/colors, and easy responsive design. Processed via PostCSS. |
| **Zustand** | `^5.0.14` | Lightweight state management. A minimal-boilerplate, React hooks-friendly alternative to Redux. Used in `authStore` and `inboxStore`. |
| **Radix UI** | Latest | Accessible, unstyled primitive UI components (Dialog, Dropdown, Select, Switch, Tabs, Tooltip, Avatar, etc.). Provides custom styling flexibility with built-in accessibility. |
| **Lucide React** | `^0.469.0` | Icon library. Provides consistent, tree-shakable SVG icons. |
| **date-fns** | `^4.4.0` | Date formatting and manipulation (e.g., `formatDistanceToNow`, `format`). A lightweight alternative to Moment.js. |
| **class-variance-authority** | `^0.7.1` | Component variant system (button sizes, states, etc.). Tailwind-friendly. |
| **clsx + tailwind-merge** | Latest | Conditional className utility + Tailwind class conflict resolution. |
| **next/font** (Google Fonts) | Built-in | `Geist`, `Geist_Mono` (Latin), `Noto_Sans_Bengali` (Bangla text support). Optimized font loading with zero layout shift. |

### Backend (Server-side, Next.js API Routes)

| Technology | Version | Why It's Used |
|---|---|---|
| **Supabase** (PostgreSQL + Auth + Realtime) | `^2.108.2` | **Primary Database + Authentication + Realtime subscriptions.** Cloud-hosted PostgreSQL with built-in Auth (email/password, OAuth), Realtime via WebSocket (postgres_changes), and Row Level Security (RLS). |
| **@supabase/ssr** | `^0.12.0` | Server-side rendering support for Supabase auth cookies/session handling in Next.js. |
| **@google/generative-ai** | `^0.24.1` | Gemini API SDK — used for AI reply generation, text embedding (`gemini-embedding-001`), and model listing. |
| **@pinecone-database/pinecone** | `^8.0.0` | Vector database client — used for RAG embedding storage and semantic search. |
| **pdf-parse** | `^2.4.5` | Extracts text from PDF files during knowledge base file ingestion. |
| **mammoth** | `^1.12.0` | Extracts raw text from DOCX/Word files. |
| **crypto** (Node.js built-in) | N/A | HMAC-SHA256 webhook signature generation and verification. |

### External APIs & Services

| Service | Why It's Used |
|---|---|
| **Supabase Cloud** | Hosted PostgreSQL DB + Auth + Realtime + RLS policies |
| **Meta Graph API** (`v19.0`) | Facebook Messenger DM send/receive, Page webhook subscription, Lead Gen form data |
| **OpenAI API** | Chat Completions (`gpt-4o-mini` etc.), Text Embeddings (`text-embedding-3-small`) |
| **Google Gemini API** | Chat generation (`gemini-1.5-flash` etc.), Embeddings (`gemini-embedding-001`) |
| **OpenRouter API** | Access to multiple LLM providers through a single unified API endpoint |
| **Ollama** (Local) | Self-hosted open-source LLMs (`llama3` etc.) running on localhost:11434 |
| **Pinecone** | Managed vector database for RAG semantic search |
| **Vercel** | Production hosting, serverless functions, and Cron Jobs |

### DevOps / Tooling

| Tool | Why It's Used |
|---|---|
| **Vercel** | Deployment platform with CI/CD auto-deploy from Git. |
| **Vercel Cron** | Every-minute cron job (`/api/queue/cron`) to trigger the AI queue processor. |
| **ESLint** | Code linting via `eslint-config-next`. |
| **PostCSS** | Tailwind CSS processing pipeline. |

---

## 📁 Folder Structure (Project Architecture)

```
aichat-omni/
├── public/                          # Static assets (logo, icons, images)
├── scripts/
│   └── fix_db.mjs                   # DB fix/migration utility script
├── supabase/
│   └── migrations/                  # Supabase migration files
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout (fonts, metadata, SEO)
│   │   ├── page.tsx                 # Landing/redirect page
│   │   ├── globals.css              # Global Tailwind styles
│   │   ├── error.tsx                # Global error boundary
│   │   ├── not-found.tsx            # Custom 404 page
│   │   │
│   │   ├── login/page.tsx           # Email/password login (Supabase Auth)
│   │   ├── register/page.tsx        # User registration (auto company creation)
│   │   ├── auth/                    # Auth callback routes
│   │   ├── privacy-policy/          # Privacy policy page (required by Meta)
│   │   ├── docs/page.tsx            # Interactive API documentation page
│   │   │
│   │   ├── dashboard/               # Protected dashboard area
│   │   │   ├── layout.tsx           # Sidebar + header + auth guard
│   │   │   ├── page.tsx             # Overview/home (stats cards + setup checklist)
│   │   │   ├── inbox/page.tsx       # Omnichannel inbox (conversations + messages)
│   │   │   ├── leads/page.tsx       # Meta Ads lead management
│   │   │   ├── crm/page.tsx         # Customer profiles + delivery tracking
│   │   │   ├── integrations/page.tsx# Channel connections (FB, IG, WhatsApp, Webhook)
│   │   │   ├── agents/page.tsx      # AI Agent configuration (LLM, KB, tools)
│   │   │   ├── knowledge-base/page.tsx # RAG knowledge base management
│   │   │   ├── credentials/page.tsx # API key credential management
│   │   │   ├── developer/page.tsx   # Developer API portal (tokens, docs, curl)
│   │   │   ├── token-analytics/page.tsx # AI token usage analytics
│   │   │   ├── queue-monitor/page.tsx   # AI queue job monitoring
│   │   │   ├── settings/page.tsx    # Workspace configuration
│   │   │   └── super-admin/page.tsx # Cross-tenant admin hub
│   │   │
│   │   └── api/                     # Backend API Routes
│   │       ├── auth/                # Auth-related endpoints
│   │       ├── company-settings/    # Company settings CRUD
│   │       ├── integrations/        # Integration CRUD
│   │       │   ├── facebook/        # Facebook OAuth flow
│   │       │   └── webhook/         # Webhook integration management
│   │       ├── knowledge-base/route.ts    # KB file upload/list/delete (RAG ingestion)
│   │       ├── knowledge-bases/     # KB entity CRUD
│   │       ├── messages/route.ts    # Send message + route to channel API
│   │       ├── models/              # LLM model listing endpoint
│   │       ├── pinecone/            # Pinecone connection test
│   │       ├── queue/               # AI queue management
│   │       │   ├── process/         # Manual queue trigger
│   │       │   └── cron/            # Vercel cron trigger
│   │       ├── super-admin/         # Super admin API
│   │       ├── webhook-tokens/      # Developer token CRUD
│   │       └── webhooks/            # Incoming webhooks
│   │           ├── meta/route.ts    # Meta (Facebook/IG) webhook handler
│   │           └── custom/[id]/     # Custom webhook receiver (Developer API)
│   │
│   ├── components/
│   │   └── DeleteConfirmationModal.tsx  # Reusable delete confirmation modal
│   │
│   ├── lib/                         # Core business logic
│   │   ├── supabase.ts              # Supabase client singleton
│   │   ├── aiAgentExecutor.ts       # AI Agent auto-reply engine (multi-LLM + RAG)
│   │   ├── queueProcessor.ts        # AI message queue (enqueue, pick, process, retry)
│   │   └── webhookDispatcher.ts     # Outgoing webhook dispatcher (HMAC signed)
│   │
│   └── store/                       # Zustand state stores
│       ├── authStore.ts             # Authentication state (user, profile, session)
│       └── inboxStore.ts            # Inbox state (conversations, messages, realtime)
│
├── .env                             # Environment variables (secrets)
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── next.config.ts                   # Next.js configuration
├── vercel.json                      # Vercel deployment config (cron jobs)
├── supabase_setup.sql               # Complete PostgreSQL schema (Supabase)
├── supabase_webhook_tokens.sql      # Webhook tokens table setup
├── MYSQL_MIGRATION.md               # MySQL migration reference document
└── PROJECT.md                       # ← You are reading this file
```

---

## 🗄️ Database Schema (Supabase PostgreSQL)

All data is stored in Supabase-hosted PostgreSQL. Row Level Security (RLS) enforces tenant isolation at the database level.

### Tables

| # | Table | Description |
|---|---|---|
| 1 | `companies` | Tenant/merchant entity. Each company has its own isolated data silo. The `settings` column (JSONB) stores global API keys, AI config, etc. |
| 2 | `profiles` | System users (owner/manager/agent). Linked to `auth.users`. Auto-created on signup via a database trigger. |
| 3 | `integrations` | Connected channels and services. Provider types: `facebook`, `instagram`, `whatsapp`, `webhook`, `developer_api`, `ai_agent`. Credentials are stored in a JSONB column. |
| 4 | `customers` | Consolidated customer profiles. Social platform metadata is stored in `meta_data` (JSONB). |
| 5 | `profile_assignments` | RBAC mapping — which agent is assigned to which integration channel. |
| 6 | `conversations` | Chat threads. `platform_conversation_id` holds the Meta API sender ID. `is_ai_mode` is the per-conversation AI autopilot toggle. |
| 7 | `messages` | Individual messages. `sender_type`: customer / agent / system / ai. AI messages include `metadata.execution_stats` for token usage telemetry. |
| 8 | `leads` | Marketing leads (Meta Ads, Google Ads, Messenger, Instagram, Website). Status pipeline: new → contacted → qualified → converted → junk. |
| 9 | `orders` | Logistics/courier orders. Status lifecycle: pending → confirmed → shipped → delivered → returned → cancelled. Linked to a courier integration. |
| 10 | `knowledge_base_files` | RAG file metadata (name, size, chunk count, embedding provider, processing status). |
| 11 | `knowledge_bases` | RAG knowledge base entities (Pinecone index, namespace, embedding provider config). |
| 12 | `webhook_tokens` | Developer API tokens (HMAC-signed, scoped to: messages/leads/customers). |
| 13 | `message_seen` | Message read/seen tracking per conversation and contact. |
| 14 | `ai_queue` | AI reply processing queue (status, priority, retry count, error tracking). |

### Key Relationships
```
companies ─┬─< profiles (company_id)
            ├─< integrations (company_id)
            ├─< customers (company_id)
            ├─< conversations (company_id)
            ├─< messages (company_id)
            ├─< leads (company_id)
            ├─< orders (company_id)
            ├─< knowledge_bases (company_id)
            ├─< knowledge_base_files (company_id)
            └─< webhook_tokens (company_id)

conversations ──< messages (conversation_id)
conversations ──> customers (customer_id)
conversations ──> integrations (integration_id)
orders ──> customers (customer_id)
orders ──> integrations (courier_integration_id)
```

### Row Level Security (RLS)
Every table has RLS enabled. Policy logic: `company_id = the company_id from the current auth user's profile`. This guarantees that **tenant A can never access tenant B's data**. Server-side API routes use the `service_role_key` to bypass RLS when needed.

### Auto Profile Creation Trigger
When a new row is inserted into `auth.users`, the `handle_new_user()` trigger fires:
- If the role is `owner` → a new `company` record is created automatically
- A `profile` row is inserted and linked to the company

---

## 🔑 Environment Variables

```env
# ── Supabase (Primary DB + Auth) ──
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # Public anon key (used client-side)
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # Service role key (used server-side, bypasses RLS)

# ── Facebook / Meta ──
NEXT_PUBLIC_FACEBOOK_APP_ID=your_app_id       # FB App ID (for OAuth redirect)
NEXT_PUBLIC_FACEBOOK_APP_SECRET=your_secret   # FB App Secret
META_WEBHOOK_VERIFY_TOKEN=102030              # Meta webhook verification token

# ── LLM Keys (Global fallback — per-company overrides stored in company.settings JSONB) ──
# OpenAI, Gemini, OpenRouter keys → stored in company settings JSONB, not in .env
```

> **Important:** Never commit the `.env` file to Git. It is listed in `.gitignore`.

---

## 🧩 Feature Modules (Detailed)

### 1. Authentication & Authorization
- **Supabase Auth** — Email/password signup and login
- Signup automatically creates a company + profile (via DB trigger)
- Role-based access control: `owner` > `manager` > `agent`
- Protected routes: all `/dashboard/*` pages redirect to `/login` if unauthenticated
- Super Admin access: granted to a hardcoded list of email addresses

### 2. Omnichannel Inbox (`/dashboard/inbox`)
- Displays all channel conversations in a single unified list
- Platform filter: All / Facebook / Instagram / WhatsApp / Webhook
- Status filter: Open / Snoozed / Closed
- **Realtime updates** — uses Supabase `postgres_changes` subscriptions so new messages and conversation status changes appear instantly
- Message sending — routes through Meta Graph API for Facebook; other platforms are mocked
- **AI Autopilot toggle** — per-conversation AI mode on/off switch
- Unread count tracking with automatic reset on conversation selection
- Optimistic UI updates (messages appear instantly, saved to DB in background)

### 3. AI Agent System (`/dashboard/agents`)
- **Multi-Agent support** — multiple AI Agents can be created per company
- Each Agent has its own configuration:
  - **Name & System Prompt** — defines agent behavior and personality
  - **LLM Provider** — OpenAI / Gemini / OpenRouter / Ollama
  - **Model Selection** — dynamic model listing fetched from the provider API
  - **API Key** — per-agent key or global fallback from company settings
  - **Channel Assignment** — which integrations the AI agent is active on
  - **Knowledge Base** — which RAG KB to use for context retrieval
  - **Active Tools** — enable/disable `search_knowledge_base` tool
- **Global AI Switch** — toggle in the dashboard header, turns AI on/off for the entire company
- Stored in the `integrations` table with `provider: 'ai_agent'`

### 4. AI Auto-Reply Engine (`src/lib/aiAgentExecutor.ts`)
- When a customer message arrives, checks: is `is_ai_mode` enabled? Is an active agent assigned?
- **RAG Pipeline:**
  1. User message → generate embedding (OpenAI or Gemini)
  2. Query Pinecone (top 4 matching text chunks)
  3. Inject retrieved context into the system prompt
- **LLM Call:** Supports OpenAI, Gemini, OpenRouter, and Ollama — full multi-provider support
- **Token Telemetry:** Records prompt_tokens, completion_tokens, total_tokens, and response_time_ms — saved in the message's metadata
- Reply routing → sends response to the customer via Meta Graph API (Facebook)
- Webhook dispatch → notifies external systems about the AI reply event

### 5. AI Queue System (`src/lib/queueProcessor.ts`)
- Incoming messages are enqueued rather than processed inline (avoids webhook timeouts)
- Priority-based queue with configurable delay between jobs
- **Vercel Cron** (`vercel.json`) — calls `/api/queue/cron` every minute
- Queue processor: atomically picks → processes → marks complete or retries on failure
- Retry logic with configurable `max_retries` and error tracking
- Queue stats: pending, processing, completed, failed counts
- **Queue Monitor** dashboard page (`/dashboard/queue-monitor`) — displays live queue status

### 6. RAG Knowledge Base (`/dashboard/knowledge-base`)
- Create Knowledge Base entities (name, Pinecone index, namespace, embedding provider)
- File upload supports: **PDF, DOCX, TXT/Markdown**
- **Ingestion Pipeline:**
  1. Parse file → extract text (pdf-parse for PDF, mammoth for DOCX, UTF-8 for text)
  2. Split text into chunks (800 characters with 150 character overlap)
  3. Generate embeddings (OpenAI `text-embedding-3-small` or Gemini `gemini-embedding-001`)
  4. Upsert vectors to Pinecone (batches of 50)
- File deletion purges both Pinecone vectors and the DB metadata record
- Namespace overwrite option available on upload

### 7. Meta Webhook Integration (`/api/webhooks/meta`)
- **GET** — Meta webhook verification (`hub.mode`, `hub.verify_token`, `hub.challenge`)
- **POST** — Handles incoming message and leadgen events:
  - **Messages:** find integration by page_id → find/create customer → find/create conversation → save message → trigger outgoing webhooks → enqueue AI reply
  - **Lead Gen:** fetch lead details from Meta API → save to `leads` table

### 8. Channel Integrations (`/dashboard/integrations`)
- **Facebook Page** — Server-side OAuth flow (authorization code → token exchange → page subscription)
- **Instagram** — Similar OAuth flow
- **WhatsApp Business** — Manual credential entry (phone ID, account ID, access token)
- **Outgoing Webhook** — URL + secret entry → events are delivered with HMAC-SHA256 signatures
- Status tracking: active / inactive / error
- Delete with confirmation modal

### 9. Meta Leads (`/dashboard/leads`)
- Facebook/Instagram Ads leadgen data is automatically captured via webhooks
- Lead pipeline: new → contacted → qualified → converted → junk
- Supports status updates, search, and status filtering
- Realtime subscription — auto-refreshes when new leads arrive

### 10. CRM & Delivery (`/dashboard/crm`)
- Customer profile directory (name, phone, email, address)
- Order history and total spend tracking per customer
- Platform-wise customer filtering
- Order status tracking (pending → confirmed → shipped → delivered → returned → cancelled)
- Courier integration support (Steadfast, Pathao API placeholders)

### 11. Developer API (`/dashboard/developer`)
- **Webhook Token Management** — Generate, revoke, and manage scoped API tokens
- Token scopes: `messages`, `leads`, `customers`
- **Interactive API Docs** — cURL examples, payload schemas, and response format reference
- Auto-creates a `developer_api` integration on first visit
- Custom webhook receiver endpoint (`/api/webhooks/custom/[id]`) — authenticated via token + HMAC verification

### 12. Outgoing Webhook Dispatcher (`src/lib/webhookDispatcher.ts`)
- Event-driven: fires on events like `message.created`
- Concurrently dispatches to all active webhook integrations for the company
- **HMAC-SHA256 signature** included via `X-Webhook-Signature` header
- Identifies itself with `User-Agent: Autozy-Webhook-Dispatcher/1.0`

### 13. Token Analytics (`/dashboard/token-analytics`)
- Visualizes token usage across all AI-generated messages
- Per-agent breakdown: total responses, total tokens, prompt vs completion tokens, average response time
- Message-level detail view with full execution stats JSON

### 14. Super Admin Hub (`/dashboard/super-admin`)
- **Access:** restricted to a hardcoded list of email addresses
- Cross-tenant view: browse all companies, profiles, integrations, and AI agents
- Company pause/unpause and settings override capabilities
- Global API key management (OpenAI, Gemini, Pinecone, OpenRouter fallback keys)

### 15. Settings (`/dashboard/settings`)
- Workspace configuration panel
- Social & courier sync settings
- Profile management

### 16. Documentation (`/docs`)
- Interactive API documentation page
- Developer onboarding guide with examples

---

## 🔄 Data Flow Diagrams

### Incoming Facebook Message Flow
```
Meta Webhook POST
  → /api/webhooks/meta (route.ts)
    → Find integration by page_id
    → Find/create customer (by facebook_psid)
    → Find/create conversation
    → Save message to DB
    → Trigger outgoing webhooks (webhookDispatcher)
    → Enqueue AI reply (queueProcessor.addToAiQueue)
      → Vercel Cron (every minute) triggers /api/queue/cron
        → processQueue() picks pending jobs
          → aiAgentExecutor.triggerAiReplyIfNeeded()
            → Check is_ai_mode + find assigned agent
            → (Optional) RAG: embed query → Pinecone search → inject context
            → LLM call (OpenAI/Gemini/OpenRouter/Ollama)
            → Save AI reply message to DB (with token telemetry)
            → Send reply via Meta Graph API
            → Trigger outgoing webhooks
```

### Agent Dashboard Message Send Flow
```
Agent types message in Inbox UI
  → inboxStore.sendMessage() [optimistic UI update]
    → POST /api/messages
      → Fetch conversation + integration details
      → Route to channel API (e.g., Facebook Send API)
      → Save message to DB
      → Update conversation.last_message
      → Trigger outgoing webhooks
      → Supabase Realtime broadcasts the INSERT event
        → inboxStore subscription updates the UI in real time
```

---

## 🧪 How to Run Locally

### Prerequisites
- **Node.js** ≥ 18
- **npm** (comes with Node.js)
- A Supabase project (URL + keys)
- (Optional) A Facebook App for Meta integration
- (Optional) A Pinecone account for RAG features

### Steps
```bash
# 1. Clone the repository
git clone <repo-url>
cd aichat-omni

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file with the required keys (see the Environment Variables section above)

# 4. Run the Supabase SQL setup
# Go to Supabase Dashboard → SQL Editor → Paste supabase_setup.sql → Run

# 5. Start the development server
npm run dev

# 6. Open in browser
# http://localhost:3000
```

### Available Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server (with hot reload) |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint checks |

---

## 📡 API Routes Reference

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/*` | Authentication endpoints | Public |
| GET/POST | `/api/company-settings` | Read/update company settings | Bearer Token |
| GET/POST/DELETE | `/api/integrations/facebook` | Facebook OAuth integration | Bearer Token |
| GET/POST/DELETE | `/api/integrations/webhook` | Webhook integration CRUD | Bearer Token |
| GET/POST/DELETE | `/api/knowledge-base` | KB file upload/list/delete (RAG ingestion) | Bearer Token |
| GET/POST/DELETE | `/api/knowledge-bases` | Knowledge base entity CRUD | Bearer Token |
| POST | `/api/messages` | Send an outbound message to a channel | Server-side |
| GET | `/api/models` | List available LLM models for a provider | Bearer Token |
| POST | `/api/pinecone` | Test Pinecone connection | Bearer Token |
| GET | `/api/queue/cron` | Cron trigger for AI queue processing | Vercel Cron |
| POST | `/api/queue/process` | Manually trigger queue processing | Bearer Token |
| GET/POST | `/api/super-admin` | Super admin operations | Super Admin |
| GET/POST/DELETE | `/api/webhook-tokens` | Developer API token management | Bearer Token |
| GET/POST | `/api/webhooks/meta` | Meta (Facebook/IG) webhook receiver | Meta Signature |
| POST | `/api/webhooks/custom/[id]` | Custom webhook receiver (Developer API) | Token + HMAC |

---

## 🏗 Architecture Patterns

### 1. Multi-Tenant Isolation
- Every DB query filters by `company_id` to prevent data leaks
- RLS policies enforce tenant boundaries at the database level
- Server-side routes use `service_role_key` to bypass RLS, then manually verify `profile.company_id`

### 2. Optimistic UI
- Message sends, AI toggles, and status changes are reflected in the UI immediately
- If the server request fails, the state is reverted

### 3. Realtime Subscriptions
- Supabase `postgres_changes` channels subscribe to the `messages` and `conversations` tables
- Filtered per company: `company_id=eq.${companyId}`

### 4. Event-Driven Webhooks
- Internal events (message created, lead captured) trigger outgoing webhook dispatches
- Payloads are signed with HMAC-SHA256 so receivers can verify authenticity

### 5. Queue-Based AI Processing
- AI replies are processed via a queue to avoid blocking webhook responses and prevent timeouts
- Queue is priority-based, supports retries, and is triggered by a Vercel Cron job every minute

---

## 🤝 Contribution Guide (For Developers & AI Agents)

### Key Things to Know Before Making Changes

1. **Path Alias:** `@/*` maps to `./src/*` (configured in `tsconfig.json`)
2. **Supabase Client Usage:**
   - Client-side: `import { supabase } from '@/lib/supabase'` (uses anon key)
   - Server-side: `createClient(URL, SERVICE_ROLE_KEY)` (uses service role, bypasses RLS)
3. **State Management:** Zustand stores (`authStore`, `inboxStore`) manage global state. Create a new store if the feature scope is distinct.
4. **Styling:** Tailwind CSS v4. Custom utilities and design tokens are defined in `globals.css`.
5. **Components:** Built with Radix UI primitives + custom Tailwind styling. Reusable components go in `src/components/`.
6. **API Auth Pattern:**
   ```typescript
   // Client-side: get the auth token
   const { data: { session } } = await supabase.auth.getSession();
   // Pass it as a header
   headers: { 'Authorization': `Bearer ${session?.access_token}` }

   // Server-side: verify the token
   const { data: { user } } = await supabaseAnon.auth.getUser(token);
   // Then fetch the profile and verify company_id
   ```

### How to Add a New Feature

1. **New Dashboard Page:**
   - Create `src/app/dashboard/<feature>/page.tsx`
   - Add an entry to the `menuItems` array in `dashboard/layout.tsx`

2. **New API Route:**
   - Create `src/app/api/<feature>/route.ts`
   - Follow the pattern: auth check → profile fetch → company_id verification → business logic

3. **New Database Table:**
   - Add the table definition to `supabase_setup.sql`
   - Enable RLS and create an isolation policy
   - Run the SQL in Supabase Dashboard → SQL Editor

4. **New Integration Provider:**
   - Add a new `provider` value in the `integrations` table
   - Create `src/app/api/integrations/<provider>/` route
   - Add the UI card/modal in `src/app/dashboard/integrations/page.tsx`

### Code Conventions
- **File naming:** kebab-case for routes, camelCase for lib files
- **Component naming:** PascalCase
- **TypeScript:** Use type annotations on all functions and interfaces
- **Error handling:** try/catch with console.error + user-facing error messages
- **Comments:** English preferred; inline comments for complex logic

### Known Limitations & Incomplete Features
- **CRM page** (`/dashboard/crm`) — currently uses **mock/hardcoded data**, not connected to Supabase
- **Dashboard overview stats** — **hardcoded values**, need to be replaced with actual DB queries
- **WhatsApp/Instagram message routing** — **mocked/placeholder only**; only Facebook Messenger is fully integrated
- **MySQL migration** — documented in `MYSQL_MIGRATION.md` but the project currently runs on Supabase PostgreSQL
- **Ollama support** — requires a local Ollama server running at `localhost:11434`

---

## 📊 Key Files Quick Reference

| File | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase client singleton (client-side) |
| `src/lib/aiAgentExecutor.ts` | **Core AI engine** — RAG retrieval + multi-LLM generation + reply routing |
| `src/lib/queueProcessor.ts` | AI queue management (enqueue, pick, process, retry) |
| `src/lib/webhookDispatcher.ts` | Outgoing webhook dispatch with HMAC signing |
| `src/store/authStore.ts` | Auth state (user, profile, session lifecycle) |
| `src/store/inboxStore.ts` | Inbox state (conversations, messages, realtime subscriptions) |
| `src/app/dashboard/layout.tsx` | Dashboard shell (sidebar, header, auth guard, global AI toggle) |
| `src/app/api/webhooks/meta/route.ts` | Meta webhook handler (incoming messages + leadgen events) |
| `src/app/api/knowledge-base/route.ts` | RAG file ingestion pipeline (parse → chunk → embed → upsert) |
| `supabase_setup.sql` | Complete PostgreSQL schema with RLS policies and triggers |

---

> **Keep this document in sync with the project.** Update it whenever new features, tables, or architectural changes are introduced.
