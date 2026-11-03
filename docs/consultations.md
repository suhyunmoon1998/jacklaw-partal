# Free consultations (/book)

The portal's own booking page, in place of the Calendly link. A client picks a
time on `/book`, the portal puts it on a host's Google calendar with a Meet
link, runs a conflict check, and emails both sides. Code is in
`lib/consultations/`; the admin side is **Admin → Consultations**.

## How it decides

- **Times offered**: inside a host's weekly hours (Pacific), at least 12 hours
  ahead, up to 21 days out, 30 minutes long on a half-hour grid, with 15
  minutes kept clear of anything on the host's Google calendar. All of these
  are in `lib/consultations/config.ts`.
- **Who takes it**: of the hosts free at that time, the one with the fewest
  upcoming consultations.
- **Conflict check**: the client's name, phone, the employer they name and the
  other people they list are compared with every client (name, phone, and the
  intake's employer, supervisor and HR contact) and every earlier consultation,
  cancelled ones included. Matches are shown to the office to review. Nothing is
  declined automatically, and "no matches" means only that no names matched.
- **Hosts' addresses stay private**: the client is not a guest on the host's
  calendar event (a guest could see the organizer's address). They get the
  Meet link from the portal's own emails, and the host admits them when they
  ask to join.
- **Emails**: confirmation (with a calendar file), a reminder the morning
  before (`/api/cron/consultation-reminders`, 16:00 UTC), and cancellation, in
  the client's language. The office gets every booking and cancellation in
  English (to `FIRM_EMAIL`, `CONSULTATION_ALERT_EMAILS` and the host), with any possible conflict in the subject line.

## Setting it up

### 1. Database

Apply `supabase/migrations/0028_consultations.sql`. It adds
`consultation_hosts`, `consultations` and the `hold_consultation` function, and
nothing else is changed.

### 2. Google Cloud: a service account the portal signs in as, without a key

The jacklaw.com organization forbids service account keys
(`iam.disableServiceAccountKeyCreation`, inherited by every project), so the
portal signs in keylessly: the Vercel function's own OIDC token is exchanged
through a workload identity pool, and IAM signs the delegation JWT for it
(`lib/consultations/google.ts`). Everything below is in the **jacklaw-portal**
Google Cloud project; its owner can do all of it.

1. Enable the **Google Calendar API**, **IAM Service Account Credentials API**
   and **Security Token Service API**.
2. **IAM & Admin → Service accounts → Create**: `portal-calendar`, no roles.
   Note its **Unique ID** (the numeric OAuth 2 client ID) for step 3.
3. **IAM & Admin → Workload Identity Federation → Create pool**: pool ID
   `vercel`, with an **OpenID Connect** provider, provider ID `vercel`:

   | Field | Value |
   |---|---|
   | Issuer (URL) | `https://oidc.vercel.com/suhyunmoon1998-5505s-projects` |
   | Allowed audiences | `https://vercel.com/suhyunmoon1998-5505s-projects` |
   | Attribute mapping | `google.subject` = `assertion.sub` |
   | Attribute condition | `assertion.sub == "owner:suhyunmoon1998-5505s-projects:project:jacklaw-portal:environment:production"` |

   The condition is what limits this to the portal's production deployments:
   preview deployments and every other Vercel project are refused.
4. On the `portal-calendar` service account, **Permissions → Grant access**:
   principal
   `principal://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/vercel/subject/owner:suhyunmoon1998-5505s-projects:project:jacklaw-portal:environment:production`,
   role **Service Account Token Creator**.

### 3. Google Workspace: domain-wide delegation (a super admin)

In admin.google.com: **Security → Access and data control → API controls →
Manage domain-wide delegation → Add new**. Paste the service account's Unique ID
and these two scopes, exactly:

```
https://www.googleapis.com/auth/calendar.events,https://www.googleapis.com/auth/calendar.freebusy
```

Removing this entry later turns calendar access off for the portal at once.

### 4. Vercel environment variables

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `portal-calendar@jacklaw-portal.iam.gserviceaccount.com` |
| `GOOGLE_WORKLOAD_IDENTITY_PROVIDER` | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/vercel/providers/vercel` |
| `CONSULTATION_ALERT_EMAILS` | `jack@jacklaw.com` — also emailed every booking, change and cancellation (comma-separated for more than one). Kept apart from `FIRM_EMAIL`, which also gets every intake. |
| `SESSION_SECRET` | already set for client sign-in. The clients' cancel links are signed with it, so changing it makes their links stop working (they can still call). |

Neither Google value is a secret. Vercel's OIDC tokens must be on for the
project (Settings → Security; on by default, team issuer mode). For local
development only, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` may be set instead of
the provider, where an organization policy allows a key at all.

`RESEND_API_KEY`, `FIRM_EMAIL`, `FIRM_FROM_EMAIL` and `CRON_SECRET` are the ones the
portal already uses. `CALENDLY_URL` is no longer needed once this is live.

### 5. Hosts

In **Admin → Consultations → Hosts and hours**, add each person who takes
consultations with their **@jacklaw.com** address. Each one starts with
Mon–Fri 9–5, the office hours. Press **Check calendar** next to each one. "Calendar
read" means it works. Otherwise it says which step Google refused:
"did not accept the Vercel identity" is the pool or provider (step 2.3),
"Signing as … was refused" is the Token Creator grant or a disabled API (2.4,
2.1), and `unauthorized_client` is the delegation (step 3) missing or listing
different scopes.

`/book` tells clients to call the office until the service account is set and at
least one host is active.
