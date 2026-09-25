# Reader feedback: setup

Comments, 👍/👎 and view counts for articles, Observatory decks and podcast episodes.
Until step 2 is done, the feature stays switched off and the site looks exactly as before.

| Piece | File |
|---|---|
| Database: tables, rules, rate limits, moderation | `supabase/schema.sql` |
| Email to the owner on every comment or reply | `supabase/functions/notify-comment/index.ts` |
| Browser widget | `js/feedback.js` (+ styles at the end of `css/style.css`) |
| On/off switch and public keys | `js/feedback-config.js` |
| Moderation page | `/admin/` |

> **Never commit the notification email address.** This repo is the public website.
> The address lives only in the Supabase secret `NOTIFY_EMAIL` (step 7).

---

## 1. Create the Supabase project (free)

1. Sign up at <https://supabase.com> and create a project named `otsullu`. Pick a US West region and save the database password somewhere safe.
2. Open **Project Settings → API**. Copy the **Project URL** and the **anon / publishable** key.
   Both are public by design. The database rules decide what the browser can do.

## 2. Switch the feature on

Put both values in `js/feedback-config.js`:

```js
supabaseUrl:     'https://YOUR-PROJECT-REF.supabase.co',
supabaseAnonKey: 'YOUR-ANON-OR-PUBLISHABLE-KEY',
```

## 3. Create the database

In **SQL Editor → New query**, paste all of `supabase/schema.sql` and click **Run**.
The script can be re-run safely after later updates.

## 4. Allow sign-in to come back to the site

In **Authentication → URL Configuration**:

- **Site URL:** `https://otsullu.com`
- **Redirect URLs:** `https://otsullu.com/**` and, for local testing, `http://localhost:8000/**`

## 5. Google sign-in

1. Go to <https://console.cloud.google.com> and create a project named "OTS Ullu".
2. **APIs & Services → OAuth consent screen:** choose External, app name "OTS Ullu", and home page `https://otsullu.com`.
   Google can show the *user support email* to people signing in, so use an address you don't mind being public.
   Publish the app, so it isn't left in "Testing" mode.
3. **Credentials → Create credentials → OAuth client ID → Web application.**
   Under *Authorized redirect URIs*, add: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
4. Copy the client ID and secret into **Supabase → Authentication → Providers → Google**, and enable it.

## 6. Microsoft sign-in

1. Go to <https://portal.azure.com>, then **App registrations → New registration**, with name "OTS Ullu".
   For *Supported account types*, choose **Accounts in any organizational directory and personal Microsoft accounts**.
   For *Redirect URI (Web)*, use `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
2. **Certificates & secrets → New client secret.** Copy the secret **Value** right away, because it's shown only once.
3. In **Supabase → Authentication → Providers → Azure**, paste the *Application (client) ID* and the secret.
   Leave *Azure Tenant URL* empty, then enable the provider.
4. Client secrets expire (24 months at most). Set a calendar reminder to renew yours.

LinkedIn can be added later. Enable **LinkedIn (OIDC)** in Supabase, then add `'linkedin_oidc'` to `providers` in `js/feedback-config.js`.

## 7. Email notifications

1. Create a free account at <https://resend.com>. Under **Domains → Add domain**, add `otsullu.com`.
   Then add the DNS records Resend shows you at your domain registrar. Wait until Resend shows the domain as **Verified**.
2. **API Keys → Create API key** with *Sending access*.
3. In Supabase, go to **Edge Functions → Deploy a new function → Via Editor**. Name it `notify-comment`.
   Paste in `supabase/functions/notify-comment/index.ts` and deploy.
   Then open the function's **Details** and turn **Verify JWT** OFF. The function checks its own secret instead.
4. **Edge Functions → Secrets.** Add each of these:

   | Name | Value |
   |---|---|
   | `NOTIFY_EMAIL` | the address that should receive notifications |
   | `RESEND_API_KEY` | the key from step 2 |
   | `WEBHOOK_SECRET` | a long random string; make one with `[guid]::NewGuid()` in PowerShell |
   | `NOTIFY_FROM` | `OTS Ullu <notifications@otsullu.com>` |

5. Connect new comments to the function. In **SQL Editor**, run the following after replacing the two placeholders.
   Don't save the filled-in version in this repo.

   ```sql
   create extension if not exists pg_net;

   create or replace function fb.notify_comment() returns trigger
   language plpgsql security definer set search_path = '' as $$
   begin
     perform net.http_post(
       url     := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify-comment',
       headers := jsonb_build_object('Content-Type', 'application/json',
                                     'x-webhook-secret', 'YOUR-WEBHOOK-SECRET'),
       body    := jsonb_build_object('type', 'INSERT', 'record', jsonb_build_object('id', new.id)));
     return new;
   end $$;

   drop trigger if exists comments_notify on fb.comments;
   create trigger comments_notify after insert on fb.comments
     for each row execute function fb.notify_comment();
   ```

## 8. Make yourself the moderator

Sign in once on the site with the account you'll use to moderate. Then run this in **SQL Editor**, with that account's email filled in:

```sql
insert into fb.profiles (id, display_name, avatar_url, is_admin)
select u.id,
       left(coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)), 40),
       u.raw_user_meta_data ->> 'avatar_url',
       true
  from auth.users u
 where lower(u.email) = lower('YOUR-SIGN-IN-EMAIL')
on conflict (id) do update set is_admin = true;
```

Now `https://otsullu.com/admin/` shows every comment, with **Hide**, **Remove**, **Restore**, **Block user** and the full edit history.
Your comments also get a **Post as OTS Ullu** checkbox, which shows them with the Official badge.

## 9. Check it end to end

1. Open a deck in the Observatory, give it a 👍, then click **Rate & comment** and post a comment.
2. Check that the notification email arrives.
3. Check that `/admin/` lists the comment.

If the email doesn't arrive, look at **Edge Functions → notify-comment → Logs**.

---

## How it behaves

- **Views:** one per visitor per item every 30 minutes. A podcast "play" counts after 30 seconds of listening.
  Site-wide visits (homepage footer) are all page views added together.
  Unique counts come from a random ID stored in the visitor's browser, so a person using two devices counts twice.
- **Bots:** crawlers and headless browsers aren't counted, which includes the Playwright PDF generator.
  The widget is also hidden when a page is printed.
- **Limits:** 5 comments per 10 minutes and 40 per day per person.
  Links aren't allowed until someone has 3 comments that are more than a day old.
  Each network can add at most 5 new votes per item per day. Comments are capped at 2,000 characters.
- **Nothing is hard-deleted:** author deletes and moderator hides or removals only change a status.
  The original text and every edit stay in `fb.comment_history`.
- **Free tier:** Supabase pauses a free project after 7 days with no activity. Normal site traffic keeps it active.

## Backups

The free tier has no downloadable backups. To take a manual one, get the connection string from **Project Settings → Database**, then run:

```powershell
pg_dump "postgresql://postgres:PASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres" --schema=fb -Fc -f feedback-backup.dump
```

Keep backup files out of this repo. The Pro plan ($25/month) adds automatic daily backups.
