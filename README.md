# Anexo Compras

Multi-tenant Next.js + Supabase SaaS that replaces the desktop **Licuadora.py** script: upload El Salvador DTE JSON files, persist them per company, and export the **F-07 V14 Anexo de Compras** CSV (tipos `03`, `05`, `06`).

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase Auth (email/password) + Postgres + RLS
- Core logic under `src/lib/dte/` (parse/validate) and `src/lib/csv/` (Anexo builder)

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

### 3. Apply the SQL migration

Run the contents of:

`supabase/migrations/20261116000000_init.sql`

in the Supabase SQL Editor (or via the Supabase CLI: `supabase db push` after linking the project).

This creates:

- `profiles`, `workspaces`, `workspace_members`, `companies`, `dte_documents`
- helper functions for membership checks
- **RLS** so company/DTE rows are only visible to members of the owning workspace
- a trigger that inserts `profiles` on `auth.users` signup

Also enable **Email** auth in Supabase → Authentication → Providers. For local MVP you can disable “Confirm email” under Authentication → Settings.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MVP flow

1. Sign up / sign in
2. Create a **workspace**, then a **company**
3. Open **Carga / Export**, pick year/month
4. Upload one or more DTE `.json` files
5. Review duplicates / out-of-window / informative types (`01`, `07`)
6. Configure columns **Q / R / S / T** for tipos `03`/`05`/`06` (defaults `1/2/2/2`; forced `0` when period &lt; February 2024)
7. Download CSV (`;` delimiter, no header, filename ≤ 25 chars, `U=3`, clase=`4`)

## Locked behaviour

| Rule | Value |
|------|--------|
| Date window | Selected period + **2 prior months** (3 periods total; `0 <= monthDiff <= 2`) |
| Persisted tipos | `01`, `03`, `05`, `06`, `07` |
| CSV rows | tipos **`03`, `05`, `06`** |
| Informative only | `01`, `07` |
| 05 / 06 amounts | NC (`05`) **subtracts** (negative money cols); ND (`06`) **adds** (positive), per F-07 total rules |
| Encoding fallbacks | utf-8-sig → cp1252 → latin-1 |
| Tributos | IVA `20`, COTRANS `C8`, FOVIAL `D1` |
| Column E | Prefer **NIT** (no dashes); if empty, **NRC** (no dashes, no zero-padding) |
| Código generación | dashes stripped |
| Money | text `0.00` (signed when needed), 2 decimals, max 10 chars |
| Q–T before Feb 2024 | all `0`; from 2024-02 keep configured codes |

## Scripts

```bash
npm run dev      # local server
npm run build    # production build
npm run test     # vitest (DTE + CSV unit tests)
npm run lint
```

## Project layout

```
src/lib/dte/          # parse, window, tributos
src/lib/csv/          # signed amounts, row + CSV builder
src/lib/supabase/     # browser/server/middleware clients
src/app/(auth)/       # login / signup
src/app/(app)/        # dashboard, companies, export
supabase/migrations/  # SQL ready to run
```

## Notes

- No live Supabase project is required to review this PR: ship SQL + `.env.example` and wire credentials locally.
- Service role keys must never be exposed as `NEXT_PUBLIC_*`.
