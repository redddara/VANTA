# Vanta Portal — Setup

Start to finish this takes about 20 minutes. You need a Supabase account, a
Discord account and a Vercel account. All three are free at this size.

Work through the sections in order — the Discord step needs a URL that Supabase
only gives you in step 1.

---

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click
   **New project**.
2. Name it `vanta-portal`, pick the region closest to your crew, and set a
   database password. Save that password in your password manager — you need it
   in step 3 and Supabase will not show it again.
3. Wait for provisioning to finish (roughly two minutes).

Once it is up, go to **Project Settings → API** and copy these two values:

| Dashboard label   | Goes into                       |
| ----------------- | ------------------------------- |
| Project URL       | `NEXT_PUBLIC_SUPABASE_URL`      |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Then create your local env file:

```bash
cp .env.example .env.local
```

and paste the two values in.

> The anon key is safe in the browser. It only grants what the row level
> security policies allow, which is why this project uses no service-role key
> anywhere.

While you are in Project Settings, note your **Reference ID** (also visible in
the project URL as `https://<ref>.supabase.co`). You need it in the next step.

---

## 2. Apply the database migrations

Everything — tables, policies, triggers, the roster view — lives in
`supabase/migrations/`. Push it with the Supabase CLI, which is already a dev
dependency of this project.

```bash
npx supabase login          # opens a browser to authorise the CLI
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push             # applies every migration in order
```

`db:push` prompts for the database password from step 1.

**Verify it worked.** In the Supabase dashboard open **Table Editor**; you
should see `profiles`, `remit_logs`, `reputation_entries` and `audit_log`, each
showing an **RLS enabled** badge. Under **Database → Views** you should see
`member_summary`.

### If you would rather not use the CLI

Open **SQL Editor** in the dashboard and run each file in
`supabase/migrations/` by hand, in filename order. There are five, and they must
run in sequence because later ones depend on tables and functions created
earlier.

---

## 3. Set up Discord OAuth

This is the fiddly part, because two dashboards have to agree on one URL.

### 3a. Copy the callback URL out of Supabase

In the Supabase dashboard go to **Authentication → Sign In / Providers →
Discord**. Toggle it **on**. Supabase shows a **Callback URL (for OAuth)** that
looks like:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Copy it. Leave the tab open — you come back to it in step 3c.

### 3b. Create the Discord application

1. Go to
   [discord.com/developers/applications](https://discord.com/developers/applications)
   and click **New Application**. Name it `Vanta Portal`.
2. In the left sidebar open **OAuth2**.
3. Under **Redirects**, click **Add Redirect** and paste the Supabase callback
   URL from step 3a exactly — no trailing slash, `https` not `http`. Click
   **Save Changes**.
4. Still on the **OAuth2** page, copy the **Client ID**.
5. Click **Reset Secret**, confirm, and copy the **Client Secret**. Discord only
   shows this once.

> The single most common cause of a failed login is a redirect URL that does not
> match byte for byte. If sign-in fails, compare these two strings first.

### 3c. Paste the credentials into Supabase

Back on the Supabase **Discord** provider page:

- **Client ID** → the Discord Client ID from step 3b
- **Client Secret** → the Discord Client Secret from step 3b

Click **Save**.

### 3d. Tell Supabase which redirects to trust

Go to **Authentication → URL Configuration** and set:

- **Site URL**: `http://localhost:3000` for now. Change this to your Vercel URL
  after step 5.
- **Redirect URLs**: add both of these, one per line:

```
http://localhost:3000/**
https://YOUR-VERCEL-DOMAIN.vercel.app/**
```

The wildcard covers `/auth/callback` plus the `?next=` parameter the portal uses
to send members back to the page they asked for.

---

## 4. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Sign in with
Discord**.

**The first account to sign in automatically becomes the admin.** Make sure that
is you. Every account after that is created as a plain `member`, and you promote
them from **Admin → Members**.

If you signed in with the wrong account first, fix it in the Supabase SQL
Editor:

```sql
update public.profiles set role = 'admin'
where discord_username = 'your_discord_handle';
```

---

## 5. Deploy to Vercel

1. Push this repository to GitHub.
2. At [vercel.com/new](https://vercel.com/new), import the repository. Vercel
   detects Next.js on its own — leave the build settings alone.
3. Before deploying, expand **Environment Variables** and add:

   | Name                            | Value                        |
   | ------------------------------- | ---------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | your Project URL             |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key         |

4. Click **Deploy**.

Once it is live, go back to Supabase → **Authentication → URL Configuration**
and change **Site URL** to your Vercel domain, keeping both entries in the
Redirect URLs list so local development keeps working.

### Using a custom domain

Add the domain in Vercel, then set one more environment variable so the OAuth
redirect points at the right origin:

```
NEXT_PUBLIC_SITE_URL=https://vanta.yourdomain.com
```

Add that domain to the Supabase Redirect URLs list too.

---

## Day-to-day operation

There is nothing to maintain: no cron jobs, no workers, no server. Supabase
handles the database and auth, Vercel rebuilds on every push to `main`.

**Roles**

| Role      | Can do                                                                     |
| --------- | -------------------------------------------------------------------------- |
| `member`  | See the roster and their own remit and reputation history                   |
| `officer` | The above, plus submit remit and grant or dock reputation                   |
| `admin`   | Everything, plus approve remit, manage members, and read the audit log      |

**Retiring a member** — set them to inactive in **Admin → Members** rather than
deleting them. They drop off the roster and lose all write access immediately,
but their remit and reputation history stays intact and their totals still
appear in the audit trail.

---

## Changing the schema later

After editing anything under `supabase/migrations/`:

```bash
npm run db:verify   # runs the migrations and the RLS test suite locally
npm run db:push     # applies them to Supabase
npm run db:types    # regenerates src/lib/types/database.types.ts
```

`db:verify` runs every migration against an in-process Postgres and asserts that
the policies still deny what they are supposed to deny. Run it before pushing;
a broken RLS policy fails open and will not show up in the UI.

---

## Troubleshooting

**"Missing environment variable NEXT_PUBLIC_SUPABASE_URL"**
`.env.local` is missing or the dev server was started before you created it.
Restart `npm run dev`. On Vercel, add the variable and redeploy — env changes do
not apply to existing deployments.

**Sign-in bounces to "Sign-in failed"**
The Discord redirect URL does not match the Supabase callback URL. Recheck steps
3a and 3b character by character.

**Signed in but the portal says the account is inactive**
An admin set `is_active = false`. Reactivate in **Admin → Members**, or in SQL:
`update public.profiles set is_active = true where discord_username = '...';`

**A page is empty when it should have data**
Almost always RLS working as intended — the signed-in role cannot see those
rows. Confirm the account's role in **Admin → Members**.

**Signed in but no profile row exists**
The `on_auth_user_created` trigger did not fire, which means migration
`20260805000005` was not applied. Re-run `npm run db:push`, then delete the user
under **Authentication → Users** and sign in again.
