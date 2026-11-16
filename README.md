# Anexo Compras

Multi-tenant Next.js + Supabase SaaS that replaces the desktop **Licuadora.py** script: upload El Salvador DTE JSON files, persist them per company, and export the **F-07 V14 Anexo de Compras** CSV plus two control Excels (CRED / FACT).

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase Auth (email/password) + Postgres + RLS
- Core logic under `src/lib/dte/` (parse/validate) and `src/lib/csv/` (Anexo builder)
- Global teal/slate design tokens in `src/app/globals.css` (shared nav, panels, forms, tables)

## Local setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Configure Supabase env vars

In `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Create a free project at [supabase.com](https://supabase.com) if you do not have one yet. Placeholders work for reading the code; Auth and DB calls need a real project.

### 3. Apply the SQL migrations

Run (in order) the contents of:

1. `supabase/migrations/20261116000000_init.sql`
2. `supabase/migrations/20261116010000_allow_any_tipo_dte.sql`
3. `supabase/migrations/20261116020000_single_workspace_invites.sql`

in the Supabase SQL Editor (or via the Supabase CLI: `supabase db push` after linking the project).

This creates:

- `profiles`, `workspaces`, `workspace_members`, `companies`, `dte_documents`, `workspace_invites`
- helper functions for membership checks, **default workspace** (`ensure_default_workspace`), and **invite accept** (`accept_workspace_invite`)
- **RLS** so company/DTE rows are only visible to members of the owning workspace
- a trigger that inserts `profiles` on `auth.users` signup

Also enable **Email** auth in Supabase → Authentication → Providers. For local MVP you can disable “Confirm email” under Authentication → Settings.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MVP flow

1. Sign up / sign in — the app **auto-creates one default workspace** (owner) if you have none
2. Create a **company** inside that workspace (no “create another workspace” in the primary UI)
3. Optionally **invite** teammates by email (owner/admin); they join via `/invite/[token]`
4. Open **Carga / Export**, pick year/month
5. Upload one or more DTE `.json` files (any `tipoDte` — known or unexpected)
6. Review duplicates / out-of-window / informative types
7. Configure **Clasificación** (Tipo de Operación, Clasificación, Sector, Tipo de Costo/Gasto) with name-only F-07 dropdowns for tipos `03`/`05`/`06` (defaults `1/2/2/2`). UI shows labels only; DB/CSV keep numeric codes. Gravada cascade follows manual page 21 (`src/lib/dte/qrt-cascade.ts`). Export always uses the selected codes (no period-based auto-zero).
8. Review **Documentos del periodo** (filter by tipo, date range, sort; Exento + money footer totals) and download **CSV** + **Excel CRED** (`03/05/06`) + **Excel FACT** (`01` / `07` / other)

## Locked behaviour

| Rule | Value |
|------|--------|
| Workspaces | **One default space per user** on first login (oldest owned if several already exist). Companies live inside the space. Teammates **join by invite**, not by creating parallel spaces as the main flow. |
| Invites | Owner/admin invites by email → `workspace_invites` + accept link `/invite/[token]` (RLS-safe). |
| Date window | Selected period + **2 prior months** (3 periods total; `0 <= monthDiff <= 2`) |
| Persisted tipos | Any parseable `tipoDte` (`01`/`03`/`05`/`06`/`07` **and unexpected**). Out-of-window JSON are **not** stored (exportables and informative alike) — re-upload under the matching period. |
| CSV rows | tipos **`03`, `05`, `06`** |
| Excel CRED | `03`/`05`/`06` — Licuadora CRED columns + signed 05/06 + EXENTO + Q–T |
| Excel FACT | `01` and any non-03/05/06 (incl. `07` and unexpected) — fecha, tipo, código, NIT/NRC, nombre, totales, source filename |
| Informative only | Everything except `03`/`05`/`06` |
| 05 / 06 amounts | NC (`05`) **subtracts** (negative money cols); ND (`06`) **adds** (positive), per F-07 total rules |
| Encoding fallbacks | utf-8-sig → cp1252 → latin-1 |
| Tributos | IVA `20`, COTRANS `C8`, FOVIAL `D1` |
| Column E | Prefer **NIT** (no dashes); if empty, **NRC** (no dashes, no zero-padding) |
| Código generación (col D) | dashes stripped on **upload persist** and again in CSV/Excel builders |
| Money (cols G–O) | text with **exactly 2 decimals** via `formatMoney` (e.g. `12.50`, `0.00`; signed for 05) |
| Classification export | Always the **selected** Q/R/S/T codes for the period (no auto-zero for pre–Feb 2024) |
| Classification UI | Section title **Clasificación**; column headers Tipo de Operación / Clasificación / Sector / Tipo de Costo/Gasto. Names only in dropdowns; persist numeric codes |
| Q–T cascade (Gravada) | Manual F-07 p.21: Costo+Industria → T `4–7`; Costo+other sectors → T `4–5`; Gasto → T `1–3`. Invalid e.g. `1,1,4,1`; valid `1,1,4,5`. Upstream changes reset invalid T. Mass + per-row both enforce. |
| Control Excel names | `YYYYMM - CONTROL CRED.xlsx` / `YYYYMM - CONTROL FACT.xlsx` |

## Scripts

```bash
npm run dev      # local server
npm run build    # production build
npm run test     # vitest (DTE + CSV unit tests)
npm run lint
```

## Project layout

```
src/lib/dte/          # parse, window, tributos, classification catalogs + cascade matrix
src/lib/csv/          # signed amounts, row + CSV builder
src/lib/excel/        # CRED / FACT control Excel builders (exceljs)
src/lib/workspace/    # primary workspace helpers + ensure-default
src/lib/supabase/     # browser/server/middleware clients
src/app/(auth)/       # login / signup
src/app/(app)/        # dashboard, companies, export
src/app/invite/       # accept workspace invite by token
supabase/migrations/  # SQL ready to run
```

## Notes

- No live Supabase project is required to review this PR: ship SQL + `.env.example` and wire credentials locally.
- Service role keys must never be exposed as `NEXT_PUBLIC_*`.
- Legacy users with multiple workspaces keep access; the UI stops promoting multi-create and treats the oldest owned space as primary.
