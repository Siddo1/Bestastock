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
