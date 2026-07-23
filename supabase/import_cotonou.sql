-- ============================================================
-- Import inventaire — Boutique Cotonou
-- À coller dans Supabase → SQL Editor → Run
-- Les PRIX sont à 0 : à compléter ensuite (dans l'app ou par UPDATE).
-- ============================================================

-- 1) Catégories manquantes
insert into public.categories (name) values
  ('Générateurs'),
  ('Réfrigération')
on conflict (name) do nothing;

-- 2) Produits (purchase_price / sale_price à 0 — À COMPLÉTER)
insert into public.products (sku, name, category_id, purchase_price, sale_price)
select v.sku, v.name, c.id, 0, 0
from (values
  ('AIO-3KWH',        'All-in-One IEE 3kWh 13.6kW',   'Kits Complets'),
  ('BAT-HZ-2.5K',     'Batterie HZ 2.5kWh 24V 100A',  'Batteries'),
  ('BAT-HZ-4.8K',     'Batterie HZ 4.8kWh 48V 100A',  'Batteries'),
  ('BAT-HZ-5.12K',    'Batterie HZ 5.12kWh 48V 100A', 'Batteries'),
  ('BAT-12V-100A',    'Batterie HZ 12V 100A',         'Batteries'),
  ('BAT-12V-60A',     'Batterie HZ 12V 60A',          'Batteries'),
  ('GEN-2000W',       'Générateur 2000W',             'Générateurs'),
  ('GEN-1500W',       'Générateur 1500W',             'Générateurs'),
  ('GEN-1000W',       'Générateur 1000W',             'Générateurs'),
  ('BAT-12V-200A',    'Batterie 12V 200A',            'Batteries'),
  ('GEN-MNT-800W',    'Générateur Mounter 800W',      'Générateurs'),
  ('OND-FEL-12K',     'Onduleur Felicity 12kVA',      'Onduleurs'),
  ('OND-FEL-8K',      'Onduleur Felicity 8kVA',       'Onduleurs'),
  ('OND-FEL-6K',      'Onduleur Felicity 6kVA',       'Onduleurs'),
  ('OND-FEL-3K',      'Onduleur Felicity Tel 3kVA',   'Onduleurs'),
  ('OND-GRW-6K',      'Onduleur Growatt 6kVA',        'Onduleurs'),
  ('OND-GRW-5K',      'Onduleur Growatt HZ 5kVA',     'Onduleurs'),
  ('OND-GRW-8K',      'Onduleur Growatt 8kVA',        'Onduleurs'),
  ('OND-DEYE-6K',     'Onduleur Deye 6kVA',           'Onduleurs'),
  ('OND-DEYE-3.6K',   'Onduleur Deye 3.6kVA',         'Onduleurs'),
  ('BAT-12V-100A-GEL','Batterie 12V 100A Gel',        'Batteries'),
  ('CONG-500L',       'Congélateur 500L 220V',        'Réfrigération'),
  ('CONG-198L',       'Congélateur 198L 12V',         'Réfrigération'),
  ('CONG-168L',       'Congélateur 168L 12V',         'Réfrigération'),
  ('CONG-118L',       'Congélateur 118L 12V',         'Réfrigération'),
  ('OND-HZ-3K',       'Onduleur HZ 3kVA',             'Onduleurs'),
  ('OND-HZ-1K',       'Onduleur HZ 1kVA',             'Onduleurs'),
  ('OND-CNV-2K',      'Onduleur Canvolt 2kVA',        'Onduleurs')
) as v(sku, name, cat)
join public.categories c on c.name = v.cat
on conflict (sku) do nothing;

-- 3) Mise en stock à la Boutique Cotonou (quantités — vérifie celles notées ?)
insert into public.stock_items (product_id, boutique_id, quantity, reorder_threshold)
select p.id, b.id, v.qty, 2
from (values
  ('AIO-3KWH', 1),
  ('BAT-HZ-2.5K', 10),
  ('BAT-HZ-4.8K', 1),      -- ? à vérifier
  ('BAT-HZ-5.12K', 3),
  ('BAT-12V-100A', 6),
  ('BAT-12V-60A', 1),      -- ? à vérifier
  ('GEN-2000W', 1),
  ('GEN-1500W', 1),        -- ? à vérifier
  ('GEN-1000W', 1),
  ('BAT-12V-200A', 1),     -- ? à vérifier
  ('GEN-MNT-800W', 1),
  ('OND-FEL-12K', 1),
  ('OND-FEL-8K', 1),
  ('OND-FEL-6K', 1),
  ('OND-FEL-3K', 1),
  ('OND-GRW-6K', 1),
  ('OND-GRW-5K', 1),
  ('OND-GRW-8K', 1),
  ('OND-DEYE-6K', 1),
  ('OND-DEYE-3.6K', 2),
  ('BAT-12V-100A-GEL', 1),
  ('CONG-500L', 2),
  ('CONG-198L', 1),
  ('CONG-168L', 3),
  ('CONG-118L', 1),
  ('OND-HZ-3K', 2),
  ('OND-HZ-1K', 1),
  ('OND-CNV-2K', 1)
) as v(sku, qty)
join public.products p on p.sku = v.sku
cross join lateral (select id from public.boutiques where name = 'Boutique Cotonou' limit 1) b
on conflict (product_id, boutique_id) do update set quantity = excluded.quantity;
