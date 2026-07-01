# AiChat-OMNI — MySQL Migration Reference Document

> **এই ডকুমেন্ট একটি লিভিং ডকুমেন্ট।** যতবার ডাটাবেস কোড আপডেট হবে, ততবার এই ফাইলও আপডেট হবে।
> যখন ইচ্ছা MySQL-এ যেতে চাইলে এই ডকুমেন্ট ফলো করুন।

**Last Updated:** 2026-07-01

---

## 📌 Quick Reference

| বিষয় | বর্তমান (Supabase) | MySQL বিকল্প |
|---|---|---|
| ডাটাবেস | PostgreSQL (ক্লাউড) | MySQL 8 (XAMPP লোকাল) |
| ORM | `@supabase/supabase-js` | **Prisma ORM** |
| অথেন্টিকেশন | Supabase Auth | **NextAuth.js** (Credentials) |
| রিয়েলটাইম | Supabase Realtime | **Socket.io** (WebSocket) |
| RLS | PostgreSQL RLS Policies | API-level middleware |
| UUID | `gen_random_uuid()` | `UUID()` (MySQL 8+) |
| JSON | `JSONB` | `JSON` |
| Timestamp | `TIMESTAMPTZ` | `DATETIME(3)` |
| Array | `TEXT[]` | `JSON` (array হিসেবে) |

---

## 🗄️ সম্পূর্ণ MySQL Schema

নিচে আপনার সম্পূর্ণ ডাটাবেস স্কিমা MySQL ফরম্যাটে দেওয়া হলো। phpMyAdmin-এর SQL ট্যাবে পেস্ট করে রান করলেই সব টেবিল তৈরি হয়ে যাবে।

```sql
-- ====================================================================
-- AiChat-OMNI — MySQL Database Schema
-- Run this in phpMyAdmin SQL tab after creating database: aichat_omni
-- Collation: utf8mb4_unicode_ci
-- ====================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ── 1. COMPANIES (Tenant/Merchant) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  settings JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. PROFILES (System Users) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'manager', 'agent') NOT NULL DEFAULT 'owner',
  company_id CHAR(36),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  INDEX idx_profiles_email (email),
  INDEX idx_profiles_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. INTEGRATIONS (Channels & Credentials) ───────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  type ENUM('social', 'courier', 'webhook', 'ecommerce') NOT NULL,
  credentials JSON NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  status ENUM('active', 'inactive', 'error') DEFAULT 'active',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_integrations_company (company_id),
  INDEX idx_integrations_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. CUSTOMERS (Consolidated Profiles) ────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  shipping_address JSON DEFAULT (JSON_OBJECT()),
  meta_data JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_customers_company (company_id),
  INDEX idx_customers_phone (phone),
  INDEX idx_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. PROFILE ASSIGNMENTS (RBAC Map) ───────────────────────────────
CREATE TABLE IF NOT EXISTS profile_assignments (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  profile_id CHAR(36) NOT NULL,
  integration_id CHAR(36) NOT NULL,
  assigned_by CHAR(36),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY unique_assignment (profile_id, integration_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. CONVERSATIONS (Thread Management) ────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  integration_id CHAR(36),
  customer_id CHAR(36) NOT NULL,
  platform_conversation_id VARCHAR(500) NOT NULL,
  last_message TEXT,
  last_message_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  unread_count INT DEFAULT 0,
  is_ai_mode TINYINT(1) DEFAULT 0,
  status ENUM('open', 'snoozed', 'closed') DEFAULT 'open',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_conversations_company (company_id),
  INDEX idx_conversations_customer (customer_id),
  INDEX idx_conversations_platform (platform_conversation_id),
  INDEX idx_conversations_last_msg (last_message_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. MESSAGES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  company_id CHAR(36) NOT NULL,
  sender_type ENUM('customer', 'agent', 'system', 'ai') NOT NULL,
  message_type ENUM('text', 'image', 'video', 'document', 'comment', 'meta_lead') NOT NULL,
  content TEXT NOT NULL,
  metadata JSON DEFAULT (JSON_OBJECT()),
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id),
  INDEX idx_messages_company (company_id),
  INDEX idx_messages_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. LEADS (Marketing/Ads) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  customer_id CHAR(36),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  source ENUM('meta_ads', 'google_ads', 'messenger', 'instagram', 'website') NOT NULL,
  campaign_name VARCHAR(500),
  status ENUM('new', 'contacted', 'qualified', 'converted', 'junk') DEFAULT 'new',
  raw_payload JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_leads_company (company_id),
  INDEX idx_leads_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. ORDERS (Courier/Logistics) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  customer_id CHAR(36),
  order_status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  items JSON DEFAULT (JSON_ARRAY()),
  shipping_details JSON,
  courier_integration_id CHAR(36),
  courier_tracking_code VARCHAR(255),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (courier_integration_id) REFERENCES integrations(id) ON DELETE SET NULL,
  INDEX idx_orders_company (company_id),
  INDEX idx_orders_status (order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. KNOWLEDGE BASE FILES (RAG) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_base_files (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  integration_id CHAR(36) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  size_bytes INT NOT NULL,
  chunk_count INT DEFAULT 0,
  embedding_provider ENUM('openai', 'gemini') NOT NULL DEFAULT 'openai',
  status ENUM('processing', 'completed', 'error') DEFAULT 'processing',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE,
  INDEX idx_kb_company (company_id),
  INDEX idx_kb_integration (integration_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. WEBHOOK TOKENS (Developer API) ──────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_tokens (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  company_id CHAR(36) NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL DEFAULT 'Default Token',
  scopes JSON DEFAULT (JSON_ARRAY('messages', 'leads', 'customers')),
  is_active TINYINT(1) DEFAULT 1,
  last_used_at DATETIME(3),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_wt_token (token),
  INDEX idx_wt_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. MESSAGE SEEN TRACKING ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_seen (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  contact_id CHAR(36) NOT NULL,
  seen_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_seen (conversation_id, contact_id),
  INDEX idx_seen_conversation (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🔀 টাইপ কনভার্সন রেফারেন্স

| PostgreSQL (Supabase) | MySQL 8 | নোট |
|---|---|---|
| `UUID` | `CHAR(36)` | `DEFAULT (UUID())` ব্যবহার করুন |
| `TEXT` | `TEXT` বা `VARCHAR(n)` | ছোট ফিল্ডে `VARCHAR`, বড়তে `TEXT` |
| `JSONB` | `JSON` | MySQL-এর JSON indexable নয় (virtual column দিয়ে সম্ভব) |
| `TEXT[]` (Array) | `JSON` | `JSON_ARRAY(...)` হিসেবে স্টোর করুন |
| `TIMESTAMPTZ` | `DATETIME(3)` | মিলিসেকেন্ড সাপোর্টের জন্য `(3)` |
| `BOOLEAN` | `TINYINT(1)` | `0` = false, `1` = true |
| `NUMERIC(10,2)` | `DECIMAL(10,2)` | একই আচরণ |
| `CHECK (...)` | `ENUM(...)` | MySQL-তে ENUM সবচেয়ে পরিষ্কার |
| `gen_random_uuid()` | `UUID()` | MySQL 8+ সাপোর্ট করে |
| `now()` | `CURRENT_TIMESTAMP(3)` | একই ফাংশন |

---

## 🔐 Environment Variables (.env)

```env
# ── MySQL Database (XAMPP) ──
DATABASE_URL="mysql://root:@localhost:3306/aichat_omni"

# ── NextAuth.js ──
NEXTAUTH_SECRET="your-random-secret-key-here-at-least-32-characters"
NEXTAUTH_URL="http://localhost:3000"

# ── Facebook / Meta ──
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
META_WEBHOOK_VERIFY_TOKEN=102030

# ── (আগের Supabase variables বাদ) ──
# NEXT_PUBLIC_SUPABASE_URL — বাদ
# NEXT_PUBLIC_SUPABASE_ANON_KEY — বাদ
# SUPABASE_SERVICE_ROLE_KEY — বাদ
```

---

## 🔄 Supabase → Prisma Query Mapping

| Supabase কোড | Prisma কোড |
|---|---|
| `supabase.from('messages').select('*')` | `prisma.message.findMany()` |
| `.eq('company_id', id)` | `{ where: { company_id: id } }` |
| `.order('created_at', { ascending: false })` | `{ orderBy: { created_at: 'desc' } }` |
| `.limit(10)` | `{ take: 10 }` |
| `.single()` | `findUnique()` or `findFirst()` |
| `supabase.from('messages').insert({...})` | `prisma.message.create({ data: {...} })` |
| `supabase.from('messages').update({...}).eq('id', x)` | `prisma.message.update({ where: { id: x }, data: {...} })` |
| `supabase.from('messages').delete().eq('id', x)` | `prisma.message.delete({ where: { id: x } })` |
| `.maybeSingle()` | `findFirst()` (returns null if not found) |
| `supabase.auth.getUser(token)` | `getServerSession(authOptions)` |
| `supabase.auth.signInWithPassword()` | `signIn('credentials', ...)` |
| `supabase.auth.signUp()` | Custom `/api/auth/register` route |
| `supabase.auth.signOut()` | `signOut()` from NextAuth |

---

## 📡 রিয়েলটাইম বিকল্প — Socket.io

### কেন Socket.io?
- Supabase Realtime-এর মতোই কাজ করে (ইভেন্ট-বেসড)
- দ্বিমুখী (bi-directional) কমিউনিকেশন
- অটো রিকানেক্ট সাপোর্ট
- Room/channel সাপোর্ট (company-wise isolation)

### ব্যবহারের ধরন:
```typescript
// সার্ভার সাইড — নতুন মেসেজ আসলে ব্রডকাস্ট
io.to(`company_${companyId}`).emit('new_message', messageData);

// ক্লায়েন্ট সাইড — inboxStore.ts
socket.on('new_message', (data) => {
  // নতুন মেসেজ ইনবক্সে যোগ করো
});
```

---

## 📋 প্রভাবিত ফাইল তালিকা (২৯+ ফাইল)

| # | ফাইল | পরিবর্তনের ধরন |
|---|---|---|
| 1 | `.env` | Supabase → MySQL + NextAuth vars |
| 2 | `package.json` | `@supabase/*` বাদ, `prisma`, `next-auth`, `bcrypt` যোগ |
| 3 | `src/lib/supabase.ts` | **ডিলিট** → `src/lib/prisma.ts` দিয়ে রিপ্লেস |
| 4 | `src/lib/auth.ts` | **নতুন** — NextAuth কনফিগ |
| 5 | `prisma/schema.prisma` | **নতুন** — ডাটাবেস মডেল |
| 6 | `src/store/authStore.ts` | Supabase Auth → NextAuth |
| 7 | `src/store/inboxStore.ts` | Supabase queries + realtime → fetch + Socket.io |
| 8 | `src/lib/aiAgentExecutor.ts` | Supabase → Prisma |
| 9 | `src/lib/webhookDispatcher.ts` | Supabase → Prisma |
| 10 | `src/app/login/page.tsx` | Supabase Auth → NextAuth signIn |
| 11 | `src/app/register/page.tsx` | Supabase Auth → custom register |
| 12 | `src/app/auth/callback/route.ts` | বাদ বা NextAuth handles |
| 13-24 | `src/app/api/*/route.ts` (১২টি) | Supabase client → Prisma |
| 25-31 | `src/app/dashboard/*/page.tsx` (৭টি) | `supabase.from()` → `fetch()` |
| 32 | `src/app/dashboard/layout.tsx` | NextAuth SessionProvider wrap |
| 33 | `scripts/fix_db.mjs` | Supabase → Prisma/MySQL |

---

## ⚡ মাইগ্রেশন স্টেপস (যখন MySQL-এ যেতে চাইবেন)

```bash
# 1. XAMPP MySQL চালু করুন ও phpMyAdmin-এ aichat_omni DB তৈরি করুন

# 2. প্যাকেজ ইনস্টল
npm install prisma @prisma/client next-auth@5 bcrypt
npm install -D @types/bcrypt
npm uninstall @supabase/supabase-js @supabase/ssr

# 3. Prisma ইনিশিয়ালাইজ
npx prisma init --datasource-provider mysql

# 4. schema.prisma ফাইলে উপরের মডেল পেস্ট করুন

# 5. ডাটাবেস মাইগ্রেট
npx prisma migrate dev --name init

# 6. Prisma Client জেনারেট
npx prisma generate

# 7. কোড আপডেট করুন (এজেন্ট সাহায্য করবে)
```

---

> **নোট:** এই ডকুমেন্ট স্বয়ংক্রিয়ভাবে আপডেট হবে যখনই নতুন টেবিল, কলাম, বা ডাটাবেস লজিক যোগ/পরিবর্তন হবে।
