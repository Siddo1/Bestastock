-- ============================================================
-- Besta Solar Stock — Setup complet de la base de données
-- À coller dans Supabase → SQL Editor → Run (une seule fois)
-- Généré à partir de supabase/migrations/ (ne pas éditer à la main)
-- ============================================================

/*
# Besta Solar — Core Tables (Phase 1)
Creates all base tables without helper functions that depend on them.
Tables: boutiques, profiles, categories, suppliers, products, stock_items,
stock_movements, customers, sales, sale_items, purchases, purchase_items,
stock_transfers, audit_log
*/

-- ==================== BOUTIQUES ====================
CREATE TABLE IF NOT EXISTS public.boutiques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  boutique_id uuid REFERENCES public.boutiques(id) ON DELETE SET NULL,
  can_modify_stock boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ==================== SUPPLIERS ====================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- ==================== PRODUCTS ====================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_price numeric(15,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  sale_price numeric(15,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  barcode text,
  photos text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_sku_idx ON public.products(sku);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ==================== STOCK ITEMS ====================
CREATE TABLE IF NOT EXISTS public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  boutique_id uuid NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_threshold integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, boutique_id)
);

CREATE INDEX IF NOT EXISTS stock_items_boutique_idx ON public.stock_items(boutique_id);
CREATE INDEX IF NOT EXISTS stock_items_product_idx ON public.stock_items(product_id);

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- ==================== STOCK MOVEMENTS ====================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  boutique_id uuid NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'transfer_in', 'transfer_out', 'adjustment')),
  reference_id uuid,
  notes text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS stock_movements_boutique_idx ON public.stock_movements(boutique_id);
CREATE INDEX IF NOT EXISTS stock_movements_created_idx ON public.stock_movements(created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- ==================== CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL UNIQUE,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers(phone);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ==================== SALES ====================
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id uuid NOT NULL REFERENCES public.boutiques(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  total_amount numeric(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  discount numeric(15,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'card', 'other')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_boutique_idx ON public.sales(boutique_id);
CREATE INDEX IF NOT EXISTS sales_customer_idx ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS sales_created_idx ON public.sales(created_at DESC);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ==================== SALE ITEMS ====================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(15,2) NOT NULL CHECK (unit_price >= 0),
  discount numeric(15,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sale_items_sale_idx ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS sale_items_product_idx ON public.sale_items(product_id);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- ==================== PURCHASES ====================
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  boutique_id uuid NOT NULL REFERENCES public.boutiques(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchases_boutique_idx ON public.purchases(boutique_id);
CREATE INDEX IF NOT EXISTS purchases_supplier_idx ON public.purchases(supplier_id);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- ==================== PURCHASE ITEMS ====================
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(15,2) NOT NULL CHECK (unit_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- ==================== STOCK TRANSFERS ====================
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  from_boutique_id uuid NOT NULL REFERENCES public.boutiques(id) ON DELETE RESTRICT,
  to_boutique_id uuid NOT NULL REFERENCES public.boutiques(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

-- ==================== AUDIT LOG ====================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_user_idx ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_table_idx ON public.audit_log(table_name);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ==================== SEED: Default boutiques ====================
INSERT INTO public.boutiques (name, address, phone) VALUES
  ('Boutique Centrale', 'Dakar, Plateau', '+221 33 000 0001'),
  ('Boutique Nord', 'Dakar, Parcelles Assainies', '+221 33 000 0002'),
  ('Boutique Sud', 'Dakar, Grand-Yoff', '+221 33 000 0003')
ON CONFLICT DO NOTHING;

-- ==================== SEED: Default categories ====================
INSERT INTO public.categories (name, description) VALUES
  ('Panneaux Solaires', 'Panneaux photovoltaïques de toutes puissances'),
  ('Batteries', 'Batteries solaires et de stockage'),
  ('Onduleurs', 'Onduleurs et convertisseurs'),
  ('Câbles & Accessoires', 'Câbles, connecteurs, fixations'),
  ('Éclairage', 'Ampoules et luminaires solaires'),
  ('Régulateurs', 'Régulateurs de charge MPPT et PWM'),
  ('Kits Complets', 'Kits solaires tout-en-un')
ON CONFLICT DO NOTHING;


/*
# Besta Solar — RLS Policies, Helper Functions, and Triggers (Phase 2)
Sets up all RLS policies using helper functions for role-based access.
- get_my_role(): returns current user's role
- get_my_boutique_id(): returns current user's assigned boutique
- handle_new_user(): auto-creates profile on signup
*/

-- ==================== HELPER FUNCTIONS ====================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_boutique_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT boutique_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ==================== BOUTIQUES POLICIES ====================
DROP POLICY IF EXISTS "boutiques_select" ON public.boutiques;
CREATE POLICY "boutiques_select" ON public.boutiques FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "boutiques_insert" ON public.boutiques;
CREATE POLICY "boutiques_insert" ON public.boutiques FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "boutiques_update" ON public.boutiques;
CREATE POLICY "boutiques_update" ON public.boutiques FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "boutiques_delete" ON public.boutiques;
CREATE POLICY "boutiques_delete" ON public.boutiques FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== PROFILES POLICIES ====================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.get_my_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== CATEGORIES POLICIES ====================
DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert" ON public.categories;
CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "categories_update" ON public.categories;
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== SUPPLIERS POLICIES ====================
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "suppliers_insert" ON public.suppliers;
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "suppliers_update" ON public.suppliers;
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "suppliers_delete" ON public.suppliers;
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== PRODUCTS POLICIES ====================
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() = 'admin'
  OR (public.get_my_role() = 'manager' AND (SELECT can_modify_stock FROM public.profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' OR (public.get_my_role() = 'manager' AND (SELECT can_modify_stock FROM public.profiles WHERE id = auth.uid())))
  WITH CHECK (public.get_my_role() = 'admin' OR (public.get_my_role() = 'manager' AND (SELECT can_modify_stock FROM public.profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== STOCK ITEMS POLICIES ====================
DROP POLICY IF EXISTS "stock_items_select" ON public.stock_items;
CREATE POLICY "stock_items_select" ON public.stock_items FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id()
);

DROP POLICY IF EXISTS "stock_items_insert" ON public.stock_items;
CREATE POLICY "stock_items_insert" ON public.stock_items FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() = 'admin'
  OR (boutique_id = public.get_my_boutique_id() AND (SELECT can_modify_stock FROM public.profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "stock_items_update" ON public.stock_items;
CREATE POLICY "stock_items_update" ON public.stock_items FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id())
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (boutique_id = public.get_my_boutique_id() AND (SELECT can_modify_stock FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "stock_items_delete" ON public.stock_items;
CREATE POLICY "stock_items_delete" ON public.stock_items FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== STOCK MOVEMENTS POLICIES ====================
DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
CREATE POLICY "stock_movements_select" ON public.stock_movements FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id()
);

DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;
CREATE POLICY "stock_movements_insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id()
);

DROP POLICY IF EXISTS "stock_movements_update" ON public.stock_movements;
CREATE POLICY "stock_movements_update" ON public.stock_movements FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "stock_movements_delete" ON public.stock_movements;
CREATE POLICY "stock_movements_delete" ON public.stock_movements FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== CUSTOMERS POLICIES ====================
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== SALES POLICIES ====================
DROP POLICY IF EXISTS "sales_select" ON public.sales;
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id()
);

DROP POLICY IF EXISTS "sales_insert" ON public.sales;
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id()
);

DROP POLICY IF EXISTS "sales_update" ON public.sales;
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id())
  WITH CHECK (public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id());

DROP POLICY IF EXISTS "sales_delete" ON public.sales;
CREATE POLICY "sales_delete" ON public.sales FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== SALE ITEMS POLICIES ====================
DROP POLICY IF EXISTS "sale_items_select" ON public.sale_items;
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin'
  OR EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.boutique_id = public.get_my_boutique_id())
);

DROP POLICY IF EXISTS "sale_items_insert" ON public.sale_items;
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() = 'admin'
  OR EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.boutique_id = public.get_my_boutique_id())
);

DROP POLICY IF EXISTS "sale_items_update" ON public.sale_items;
CREATE POLICY "sale_items_update" ON public.sale_items FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "sale_items_delete" ON public.sale_items;
CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== PURCHASES POLICIES ====================
DROP POLICY IF EXISTS "purchases_select" ON public.purchases;
CREATE POLICY "purchases_select" ON public.purchases FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin' OR boutique_id = public.get_my_boutique_id()
);

DROP POLICY IF EXISTS "purchases_insert" ON public.purchases;
CREATE POLICY "purchases_insert" ON public.purchases FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() = 'admin'
  OR (boutique_id = public.get_my_boutique_id() AND (SELECT can_modify_stock FROM public.profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "purchases_update" ON public.purchases;
CREATE POLICY "purchases_update" ON public.purchases FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "purchases_delete" ON public.purchases;
CREATE POLICY "purchases_delete" ON public.purchases FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== PURCHASE ITEMS POLICIES ====================
DROP POLICY IF EXISTS "purchase_items_select" ON public.purchase_items;
CREATE POLICY "purchase_items_select" ON public.purchase_items FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin'
  OR EXISTS (SELECT 1 FROM public.purchases WHERE purchases.id = purchase_items.purchase_id AND purchases.boutique_id = public.get_my_boutique_id())
);

DROP POLICY IF EXISTS "purchase_items_insert" ON public.purchase_items;
CREATE POLICY "purchase_items_insert" ON public.purchase_items FOR INSERT TO authenticated WITH CHECK (
  public.get_my_role() = 'admin'
  OR EXISTS (SELECT 1 FROM public.purchases WHERE purchases.id = purchase_items.purchase_id AND purchases.boutique_id = public.get_my_boutique_id())
);

DROP POLICY IF EXISTS "purchase_items_update" ON public.purchase_items;
CREATE POLICY "purchase_items_update" ON public.purchase_items FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "purchase_items_delete" ON public.purchase_items;
CREATE POLICY "purchase_items_delete" ON public.purchase_items FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== STOCK TRANSFERS POLICIES ====================
DROP POLICY IF EXISTS "stock_transfers_select" ON public.stock_transfers;
CREATE POLICY "stock_transfers_select" ON public.stock_transfers FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin'
  OR from_boutique_id = public.get_my_boutique_id()
  OR to_boutique_id = public.get_my_boutique_id()
);

DROP POLICY IF EXISTS "stock_transfers_insert" ON public.stock_transfers;
CREATE POLICY "stock_transfers_insert" ON public.stock_transfers FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "stock_transfers_update" ON public.stock_transfers;
CREATE POLICY "stock_transfers_update" ON public.stock_transfers FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "stock_transfers_delete" ON public.stock_transfers;
CREATE POLICY "stock_transfers_delete" ON public.stock_transfers FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ==================== AUDIT LOG POLICIES ====================
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT TO authenticated USING (
  public.get_my_role() = 'admin' OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "audit_log_update" ON public.audit_log;
CREATE POLICY "audit_log_update" ON public.audit_log FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "audit_log_delete" ON public.audit_log;
CREATE POLICY "audit_log_delete" ON public.audit_log FOR DELETE TO authenticated USING (false);

-- ==================== AUTO-CREATE PROFILE ON SIGNUP ====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
