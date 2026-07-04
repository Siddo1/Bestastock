# Besta Solar Stock

Application de gestion de stock et de point de vente **multi-boutiques** pour
Besta Solar. Elle centralise produits, stock, ventes (POS), clients,
fournisseurs, achats, transferts inter-boutiques, utilisateurs, rapports et
journal d'audit. Montants en franc CFA (XOF).

## Stack technique

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** pour le design
- **React Router** pour la navigation
- **Recharts** pour les graphiques du tableau de bord
- **Supabase** (PostgreSQL + Auth + Row Level Security + Edge Functions)
- **lucide-react** (icônes), **date-fns** (dates)

## Fonctionnalités

| Module | Description |
| --- | --- |
| Tableau de bord | Indicateurs clés, ventes, valeur du stock, alertes de réappro |
| Produits | Catalogue (SKU, code-barres, prix d'achat/vente, catégories, photos) |
| Stock | Niveaux par boutique, seuils de réapprovisionnement, ajustements |
| Point de vente (POS) | Encaissement rapide, recherche produit, remises, moyens de paiement |
| Ventes | Historique et détail des ventes |
| Clients | Fiches clients et historique d'achats |
| Fournisseurs & Achats | Réception de marchandises et mise à jour du stock |
| Transferts | Déplacement de stock entre boutiques |
| Utilisateurs | Rôles **admin** / **manager**, affectation à une boutique |
| Rapports | Analyses de ventes et de stock |
| Journal d'audit | Traçabilité des actions sensibles |

## Rôles

- **Admin** : accès complet, gestion des utilisateurs et des boutiques.
- **Manager** : gestion opérationnelle, restreinte à sa boutique.

## Prérequis

- Node.js ≥ 18
- Un projet [Supabase](https://supabase.com)

## Installation

```bash
npm install
cp .env.example .env   # puis renseignez vos identifiants Supabase
```

Renseignez dans `.env` :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Base de données

Appliquez les migrations SQL du dossier `supabase/migrations/` à votre projet
Supabase (via le SQL Editor du dashboard ou la CLI Supabase). Elles créent les
tables, les politiques Row Level Security et les fonctions.

### Premier administrateur

La création de comptes est réservée aux admins. Pour créer le tout premier
administrateur, déployez et appelez l'Edge Function `bootstrap-admin` :

```bash
supabase functions deploy bootstrap-admin
```

Elle nécessite `SUPABASE_SERVICE_ROLE_KEY` côté serveur et n'autorise la
création que s'il n'existe encore aucun administrateur.

## Développement

```bash
npm run dev       # serveur de développement Vite
npm run build     # build de production (tsc + vite)
npm run preview   # prévisualisation du build
```

## Structure du projet

```
src/
  components/   Layout applicatif et composants UI réutilisables
  lib/          Client Supabase, contexte d'authentification, utilitaires
  pages/        Une page par module (Dashboard, POS, Products, …)
supabase/
  functions/    Edge Functions (bootstrap-admin)
  migrations/   Schéma SQL, RLS et fonctions
```
