<div align="center">
  <img src="public/vanta-crest.png" alt="Vanta" width="96" height="96" />
  <h1>Vanta Portal</h1>
  <p>Member portal for the Vanta FiveM roleplay crew — remit logs and reputation, with Discord sign-in.</p>
</div>

---

## What it does

Tracks two things per crew member, plus the accountability trail around them:

- **Remit logs** — contributions submitted for the org. Anyone can log their own,
  an Enforcer or above can log one on another member's behalf, an admin approves
  it, and only approved remit counts toward a member's total.
- **Reputation** — a job-progression ladder. Each tier has payout rates and
  crafting unlocks; Enforcers and above place members on a tier, and admins edit
  the ladder itself.
- **Audit log** — every privileged edit, void and rank change, written by
  database triggers rather than application code.

Members sign in with Discord. There are no passwords to manage and no accounts
to create by hand: a profile row is provisioned automatically the first time
someone signs in, at the lowest rank.

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

The first Discord account to sign in becomes the Kingpin.

## Ranks

There is one ladder, and rank is the permission. A member's rank is the only
thing that decides what they can do, and only an admin can change it.

| Rank        | Can do                                                                        |
| ----------- | ----------------------------------------------------------------------------- |
| `Prospect`  | Log their own remit and view the reputation ladder                             |
| `Operator`  | The above, plus the roster and their current reputation tier                   |
| `Enforcer`  | The above, plus log remit for any member and set reputation tiers              |
| `Captain`   | The same as Enforcer                                                          |
| `Underboss` | Everything: set ranks, approve remit, edit the ladder, read the audit log      |
| `Kingpin`   | The same as Underboss, and the only rank that can appoint another Kingpin      |

New accounts start as `Prospect` and are promoted by hand in
**Admin → Members**.

## Permissions

Authorisation lives in SQL, not in the app. The Next.js layer reads the current
rank only to decide what to *render* — hiding a link it should not show. It
never decides what a request is *allowed* to do. If the UI is wrong or someone
calls the API directly, the database still refuses.

| Table                | Read                                     | Write                                                    |
| -------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `profiles`           | own row; `Operator`+ see the whole roster | own `ingame_name`; admins set rank and active status      |
| `remit_logs`         | own rows; `Enforcer`+ see all            | anyone inserts for themselves, `Enforcer`+ for any member, always pending; admins update and delete |
| `rep_tiers`          | everyone                                 | admins insert/update/delete                               |
| `member_rep`         | everyone                                 | `Enforcer`+ set a member's current tier                   |
| `audit_log`          | admins only                              | nobody — triggers only                                    |

A few guarantees worth calling out, because they are enforced structurally
rather than by convention:

- **Nobody can approve their own submissions.** Both insert policies pin
  `status` to `pending` and `submitted_by` to the caller's own id.
- **A Prospect cannot log money against anyone else.** The policy open to them
  pins `member_id` to the caller too, so the only row they can create is their
  own.
- **The audit log cannot be forged or erased.** No role holds `insert`,
  `update` or `delete` on `audit_log`. Only `SECURITY DEFINER` triggers write to
  it, so an edit and its audit row commit together or not at all.
- **The last Kingpin cannot be removed.** A trigger rejects any change that
  would leave the crew with zero active Kingpins, which would otherwise need a
  manual SQL fix to recover from.
- **Only a Kingpin can appoint a Kingpin.** Otherwise an Underboss could promote
  themselves level with the person who appointed them, then demote them.
- **Deactivating a member revokes access immediately.** The rank helper checks
  `is_active`, so an inactive Captain loses write access without any session
  invalidation.
- **Reputation is a current tier, not a score.** The roster shows each member's
  ladder level; there is no accumulating points history.

## Layout

```
src/
  app/
    (portal)/          authenticated pages, shared header and nav
      dashboard/       own tier, payouts and remit history
      roster/          searchable, sortable crew roster
      rep-tiers/       full reputation ladder (every member)
      remit/mine/      log a contribution for yourself (any rank)
      remit/new/       Enforcer+: log a contribution for another member
      reputation/new/  Enforcer+: place a member on a tier
      admin/           members, remit queue, ladder editor, audit log
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

`npm run db:verify` runs every migration against [PGlite](https://pglite.dev)
with Supabase's `auth` schema stubbed in, then exercises the policies at each
rank — 56 assertions covering things like "a Prospect cannot log remit for anyone
else", "a Captain cannot approve remit" and "nobody can erase audit history". No
Docker required.

Run it after any change under `supabase/migrations/`. RLS mistakes fail open,
so they are invisible in the UI until someone finds them.

## Design

Near-black surfaces with a single crimson accent (`#d51822`) pulled from the
crew crest, condensed uppercase headings, and tabular figures so money columns
line up. Dark only — there is no light theme to toggle. Every
table collapses to a stacked mobile layout, since most members check this on a
phone.

## Possible next step

Discord role sync: read the member's roles from your Discord server and set
their rank automatically instead of managing it in **Admin → Members**. Worth
doing once the manual flow has proven itself, not before.
