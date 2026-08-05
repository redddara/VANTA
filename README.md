<div align="center">
  <img src="public/vanta-crest.png" alt="Vanta" width="96" height="96" />
  <h1>Vanta Portal</h1>
  <p>Member portal for the Vanta FiveM roleplay crew — remit logs and reputation, with Discord sign-in.</p>
</div>

---

## What it does

Tracks two things per crew member, plus the accountability trail around them:

- **Remit logs** — contributions submitted for the org. An officer files them,
  an admin approves them, and only approved remit counts toward a member's
  total.
- **Reputation** — an internal standing score. Officers grant or dock points,
  and every entry requires a written reason that the member can see.
- **Audit log** — every privileged edit, void and role change, written by
  database triggers rather than application code.

Members sign in with Discord. There are no passwords to manage and no accounts
to create by hand: a profile row is provisioned automatically the first time
someone signs in.

## Stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, TypeScript, React Server Components) |
| Database   | Supabase Postgres with row level security                   |
| Auth       | Supabase Auth, Discord OAuth provider                       |
| Styling    | Tailwind CSS v4                                             |
| Components | shadcn/ui (Radix primitives, owned in `src/components/ui`)  |
| Hosting    | Vercel                                                      |

No custom server, no background workers, no scheduled jobs, no service-role key.
Everything fits inside the Supabase and Vercel free tiers.

## Getting started

Full instructions, including exactly what to paste into the Discord Developer
Portal, are in **[SETUP.md](./SETUP.md)**.

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm run dev
```

The first Discord account to sign in becomes the admin.

## Permissions

Authorisation lives in SQL, not in the app. The Next.js layer reads the current
role only to decide what to *render* — hiding a link it should not show. It
never decides what a request is *allowed* to do. If the UI is wrong or someone
calls the API directly, the database still refuses.

| Table                | Read                                | Write                                                    |
| -------------------- | ----------------------------------- | -------------------------------------------------------- |
| `profiles`           | everyone                            | own `ingame_name`; admins set role, rank, active status   |
| `remit_logs`         | own rows; officers and admins see all | officers insert (as themselves, always pending); admins update and delete |
| `reputation_entries` | own rows; officers and admins see all | officers insert (as themselves); admins update and delete |
| `audit_log`          | admins only                         | nobody — triggers only                                    |

A few guarantees worth calling out, because they are enforced structurally
rather than by convention:

- **Officers cannot approve their own submissions.** The insert policy pins
  `status` to `pending` and `submitted_by` to the caller's own id.
- **The audit log cannot be forged or erased.** No role holds `insert`,
  `update` or `delete` on `audit_log`. Only `SECURITY DEFINER` triggers write to
  it, so an edit and its audit row commit together or not at all.
- **The last admin cannot be removed.** A trigger rejects any change that would
  leave the crew with zero active admins, which would otherwise need a manual
  SQL fix to recover from.
- **Deactivating a member revokes access immediately.** The role helper checks
  `is_active`, so an inactive officer loses write access without any session
  invalidation.
- **Aggregate reputation is public, individual entries are not.** The roster
  shows everyone's total score, but a member can only read the reasons attached
  to their own entries.

## Layout

```
src/
  app/
    (portal)/          authenticated pages, shared header and nav
      dashboard/       own reputation and remit history
      roster/          searchable, sortable crew roster
      remit/new/       officer: submit a contribution
      reputation/new/  officer: grant or dock reputation
      admin/           members, remit queue, rep ledger, audit log
      settings/        edit your own in-game name
    auth/              OAuth callback, sign-out, error page
    login/             the only public page
  components/
    ui/                shadcn/ui primitives
    admin/ roster/ remit/ reputation/ nav/ shared/
  lib/
    supabase/          browser, server and proxy clients
    actions/           server actions (all writes go through these)
    types/             generated database types plus app-level narrowing
supabase/
  migrations/          schema, RLS policies, triggers, roster view
scripts/
  verify-migrations.mjs  runs the migrations and tests the RLS policies
```

## Scripts

| Command             | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Development server                                                |
| `npm run build`     | Production build                                                  |
| `npm run lint`      | ESLint                                                            |
| `npm run typecheck` | `tsc --noEmit`                                                    |
| `npm run db:verify` | Run migrations against in-process Postgres and test the policies  |
| `npm run db:push`   | Apply migrations to the linked Supabase project                   |
| `npm run db:types`  | Regenerate `src/lib/types/database.types.ts` from the live schema |

### Testing the security model

`npm run db:verify` runs all five migrations against [PGlite](https://pglite.dev)
with Supabase's `auth` schema stubbed in, then exercises the policies as a
member, an officer and an admin — 43 assertions covering things like "an officer
cannot approve remit" and "nobody can erase audit history". No Docker required.

Run it after any change under `supabase/migrations/`. RLS mistakes fail open,
so they are invisible in the UI until someone finds them.

## Design

Near-black surfaces with a single crimson accent (`#d51822`) pulled from the
crew crest, condensed uppercase headings, and tabular figures so money and
reputation columns line up. Dark only — there is no light theme to toggle. Every
table collapses to a stacked mobile layout, since most members check this on a
phone.

## Possible next step

Discord role sync: read the member's roles from your Discord server and set
`role` and `crew_rank` automatically instead of managing them in
**Admin → Members**. Worth doing once the manual flow has proven itself, not
before.
