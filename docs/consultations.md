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
- **Emails**: confirmation (with a calendar file), a reminder the morning
  before (`/api/cron/consultation-reminders`, 16:00 UTC), and cancellation, in
  the client's language. The office gets every booking and cancellation in
  English, with any possible conflict in the subject line.

## Setting it up

### 1. Database

Apply `supabase/migrations/0028_consultations.sql`. It adds
`consultation_hosts`, `consultations` and the `hold_consultation` function, and
nothing else is changed.

### 2. Google Workspace (one time, needs a Workspace super admin)

1. In Google Cloud console, pick or create a project, and enable the
   **Google Calendar API**.
2. **IAM & Admin → Service accounts → Create**. No roles are needed. Open it,
   then **Keys → Add key → JSON**, and keep the file somewhere safe.
3. Copy the service account's **Unique ID** (the numeric client ID).
4. In admin.google.com: **Security → Access and data control → API controls →
   Manage domain-wide delegation → Add new**. Paste the client ID and these two
   scopes, exactly:

   ```
   https://www.googleapis.com/auth/calendar.events,https://www.googleapis.com/auth/calendar.freebusy
   ```

   Removing this entry later turns calendar access off for the portal at once.

### 3. Vercel environment variables

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON key |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `private_key` from the JSON key (the `\n` escapes may stay as they are) |
| `SESSION_SECRET` | already set for client sign-in. The clients' cancel links are signed with it, so changing it makes their links stop working (they can still call). |

`RESEND_API_KEY`, `FIRM_EMAIL`, `FIRM_FROM_EMAIL` and `CRON_SECRET` are the ones the
portal already uses. `CALENDLY_URL` is no longer needed once this is live.

### 4. Hosts

In **Admin → Consultations → Hosts and hours**, add each person who takes
consultations with their **@jacklaw.com** address. Each one starts with
Mon–Fri 9–12 and 1–5. Press **Check calendar** next to each one. "Calendar
read" means it works. `unauthorized_client` means step 2.4 is missing or lists
different scopes.

`/book` tells clients to call the office until the service account is set and at
least one host is active.
