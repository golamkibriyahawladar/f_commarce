-- ====================================================================
-- AiChat Suite (AiChat-OMNI) Database Setup Schema
-- Run this script in your Supabase SQL Editor
-- ====================================================================

-- ── 1. TENANT / MERCHANT DATA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. SYSTEM USER PROFILES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'agent')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. INTEGRATED CHANNELS & CREDENTIALS ──────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('social', 'courier', 'webhook', 'ecommerce')),
  credentials JSONB NOT NULL,
  webhook_url TEXT,
  webhook_secret TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 4. CONSOLIDATED CUSTOMER PROFILES ────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. ASSIGNED AGENT CHANNELS (RBAC Map) ────────────────────────────
CREATE TABLE IF NOT EXISTS profile_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, integration_id)
);

-- ── 6. CONVERSATION THREADS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  platform_conversation_id TEXT NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread_count INT DEFAULT 0,
  is_ai_mode BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'snoozed', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 7. INDIVIDUAL MESSAGES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system', 'ai')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'video', 'document', 'comment', 'meta_lead')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 8. AD & MARKETING LEADS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT NOT NULL CHECK (source IN ('meta_ads', 'google_ads', 'messenger', 'instagram', 'website')),
  campaign_name TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'junk')),
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 9. LOGISTICS & COURIER ORDERS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled')),
  total_amount NUMERIC(10, 2) NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  shipping_details JSONB,
  courier_integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  courier_tracking_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 1. Companies policies
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (
    id = (SELECT company_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- 2. Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Tenant isolation helper policies (conversations, messages, integrations, leads, orders, customers)
CREATE POLICY "Tenant isolation - integrations" ON integrations
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant isolation - customers" ON customers
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant isolation - profile_assignments" ON profile_assignments
  FOR ALL USING (
    profile_id = auth.uid() OR
    integration_id IN (SELECT id FROM integrations WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Tenant isolation - conversations" ON conversations
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant isolation - messages" ON messages
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant isolation - leads" ON leads
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant isolation - orders" ON orders
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ====================================================================
-- AUTOMATED USER PROFILE TRIGGER
-- When a user signs up using Supabase Auth (Email or Facebook OAuth), 
-- automatically insert a profile row.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  company_name TEXT;
  user_role TEXT;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'owner');

  -- Create a company if the user is an owner (default role)
  IF user_role = 'owner' THEN
    company_name := COALESCE(
      new.raw_user_meta_data->>'company_name',
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Company'
    );
    
    INSERT INTO public.companies (name, slug)
    VALUES (
      company_name,
      LOWER(REGEXP_REPLACE(company_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || FLOOR(RANDOM() * 1000000)::TEXT
    )
    RETURNING id INTO new_company_id;
  ELSE
    new_company_id := NULL;
  END IF;

  -- Create a profile for the user, mapping them to the company if created
  INSERT INTO public.profiles (id, email, full_name, role, company_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    user_role,
    new_company_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run on Auth user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
