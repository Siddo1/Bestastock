# Graph Report - /home/user/Bestastock  (2026-08-05)

## Corpus Check
- Corpus is ~49,075 words - fits in a single context window. You may not need a graph.

## Summary
- 292 nodes · 735 edges · 22 communities (19 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.88)
- Token cost: 259,464 input · 0 output

## Community Hubs (Navigation)
- App Shell & Core Utilities
- UI Components & Auth
- Runtime Dependencies
- Docs, Roles & Error Handling
- TypeScript Configuration
- Dev & Build Dependencies
- Database Schema (setup.sql)
- DB Tables Migration
- PWA Icons & Branding
- Login Screen & Product Features
- CSV Product Import
- Vercel Deployment Config
- Maskable PWA Icon Set
- RLS Functions Migration
- Apple Touch Icon Branding
- Sun Icon & Theme Color
- Vite Env Types
- MCP Config
- Edge Function CORS

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 43 edges
2. `formatXOF()` - 27 edges
3. `logAudit()` - 25 edges
4. `supabase` - 25 edges
5. `Spinner()` - 24 edges
6. `PageHeader()` - 21 edges
7. `compilerOptions` - 19 edges
8. `EmptyState()` - 16 edges
9. `Badge()` - 14 edges
10. `formatDateTime()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `index.html Application Shell` --conceptually_related_to--> `Besta Solar Stock (multi-boutique stock & POS application)`  [INFERRED]
  index.html → README.md
- `Badge()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui.tsx → src/lib/utils.ts
- `Spinner()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui.tsx → src/lib/utils.ts
- `Modal()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui.tsx → src/lib/utils.ts
- `ImportProducts()` --calls--> `logAudit()`  [EXTRACTED]
  src/pages/ImportProducts.tsx → src/lib/audit.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Load-failure Diagnostic Safeguards (error script, fallback marker, root mount)** — index_error_capture_script, index_fallback_loading_marker, src_main [EXTRACTED 0.90]
- **Role-based Access Control (roles, RLS, bootstrap)** — readme_admin_role, readme_manager_role, readme_row_level_security, readme_bootstrap_admin [INFERRED 0.85]
- **Bestastock Icon Design Elements** — public_apple_touch_icon_brand_icon, public_apple_touch_icon_b_monogram, public_apple_touch_icon_grid_motif, public_apple_touch_icon_bestastock_brand [INFERRED 0.85]
- **Bestastock PWA App Icon Set** — public_pwa_192x192_icon, public_pwa_512x512_icon, public_favicon_icon, vite_config_pwa_manifest [INFERRED 0.95]
- **Bestastock PWA Branding** — public_pwa_512x512_icon, bestastock_brand_identity, concept_pwa_installable_app [INFERRED 0.75]
- **Bestastock PWA App Icon Set** — public_pwa_maskable_512x512, public_pwa_512x512, public_pwa_192x192 [INFERRED 0.95]
- **Mobile Login Landing Page Composition** — public_screenshots_mobile_1_hero_panel, public_screenshots_mobile_1_login_form, public_screenshots_mobile_1_feature_stats [EXTRACTED 1.00]
- **Besta Solar PWA Branding Assets** — public_sun_sun_icon, vite_config_vitepwa, public_sun_besta_solar_brand_orange [INFERRED 0.85]

## Communities (22 total, 3 thin omitted)

### Community 0 - "App Shell & Core Utilities"
Cohesion: 0.12
Nodes (40): App(), Layout(), navItems, StatCard(), logAudit(), useAuth(), Customer, Sale (+32 more)

### Community 1 - "UI Components & Auth"
Cohesion: 0.15
Nodes (31): Badge(), BadgeProps, ConfirmDialog(), ConfirmDialogProps, EmptyState(), EmptyStateProps, Modal(), ModalProps (+23 more)

### Community 2 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (25): clsx, date-fns, lucide-react, dependencies, clsx, date-fns, lucide-react, react (+17 more)

### Community 3 - "Docs, Roles & Error Handling"
Cohesion: 0.09
Nodes (19): Inline Error Capture Script (error / unhandledrejection), Fallback Loading Marker in #root, index.html Application Shell, Admin Role, Audit Log (Journal d'audit), Besta Solar Stock (multi-boutique stock & POS application), bootstrap-admin Edge Function, Manager Role (+11 more)

### Community 4 - "TypeScript Configuration"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules (+16 more)

### Community 5 - "Dev & Build Dependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/react, @types/react-dom, typescript (+11 more)

### Community 6 - "Database Schema (setup.sql)"
Cohesion: 0.25
Nodes (17): public.audit_log, public.boutiques, public.categories, public.customers, public.get_my_boutique_id(), public.get_my_role(), public.products, public.profiles (+9 more)

### Community 7 - "DB Tables Migration"
Cohesion: 0.31
Nodes (15): public.audit_log, public.boutiques, public.categories, public.customers, public.products, public.profiles, public.purchase_items, public.purchases (+7 more)

### Community 8 - "PWA Icons & Branding"
Cohesion: 0.24
Nodes (10): Bestastock Brand Identity, PWA Installable App, Stock/Inventory Grid Motif, B Monogram Logo Mark, Bestastock Favicon (B Monogram), Bestastock Favicon, Bestastock Brand Mark (letter B with grid/table motif), Bestastock PWA Icon 192x192 (+2 more)

### Community 9 - "Login Screen & Product Features"
Cohesion: 0.33
Nodes (9): Besta Solar - Multi-Boutique Stock Management App, 12-Month Audit Trail, Multi-Boutique Inventory Management, Role-Based Access (Admin & Manager), XOF (Franc CFA) Currency Support, Mobile Login Screenshot (Besta Solar), Feature Stat Cards (3+ Multi-boutiques, XOF, Admin & Manager, 12 mois Audit trail), Hero Branding Panel ('Pilotez vos stocks en temps réel') (+1 more)

### Community 10 - "CSV Product Import"
Cohesion: 0.39
Nodes (7): detectSep(), ImportProducts(), parseRows(), Result, Row, slugSku(), toInt()

### Community 11 - "Vercel Deployment Config"
Cohesion: 0.33
Nodes (5): buildCommand, framework, outputDirectory, rewrites, $schema

### Community 12 - "Maskable PWA Icon Set"
Cohesion: 0.40
Nodes (5): Bestastock Brand Logo (White 'B' with Grid Motif), PWA Maskable Icon Safe-Zone Convention, PWA Icon 192x192, PWA Icon 512x512, PWA Maskable Icon 512x512

### Community 13 - "RLS Functions Migration"
Cohesion: 0.50
Nodes (3): public.profiles, public.get_my_boutique_id(), public.get_my_role()

### Community 14 - "Apple Touch Icon Branding"
Cohesion: 0.83
Nodes (4): B Monogram Letterform, Bestastock Brand Identity, Bestastock Apple Touch Icon (B monogram), Grid / Spreadsheet Cell Motif

### Community 15 - "Sun Icon & Theme Color"
Cohesion: 1.00
Nodes (3): Besta Solar Brand Orange (#f57c0b), Sun Icon (App Icon/Favicon), VitePWA Plugin Configuration

## Knowledge Gaps
- **93 isolated node(s):** `github`, `name`, `private`, `version`, `type` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `github`, `name`, `private` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Core Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.1192156862745098 - nodes in this community are weakly interconnected._
- **Should `UI Components & Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.14666666666666667 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Docs, Roles & Error Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `TypeScript Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Dev & Build Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._