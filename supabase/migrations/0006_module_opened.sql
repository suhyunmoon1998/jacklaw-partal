-- When the client actually opened a step we sent them.
--
-- Sending is now a step: the office hands over Step 1, then Step 2, and the
-- client works through them one at a time. Two things needed a record of the
-- opening and neither had one.
--
-- The client's side needs it to mark a step "New" and stop marking it once they
-- have been in. A badge driven by browser storage would say "New" again on
-- their second device and never again after they cleared their history, which
-- is exactly backwards for the one client who reads the portal on a phone at
-- work and a laptop at home.
--
-- The office's side needs it more. "Sent four days ago, never opened" is the
-- difference between a client who is stuck and a client who is ignoring us, and
-- until now the admin panel could not tell them apart.
--
-- Schema-qualified, like 0005. This database's search_path puts another
-- project's schema first, so an unqualified ALTER finds the wrong table or none
-- at all, and PostgREST then answers "could not find the table" rather than
-- saying what actually went wrong.

alter table public.client_module_sends
  add column if not exists opened_at timestamptz;

-- Every row that exists right now was written before anyone was counting: one
-- send from the admin panel today, and fifteen from the backfill in 0005 that
-- stamped each client's own signup date. Ten of those clients have been in and
-- answered questions; six have finished and submitted.
--
-- Left null, all sixteen would light up "New" on the morning this ships —
-- announcing as newly arrived a questionnaire some of them completed seven
-- weeks ago. "New" has to mean new, so these are marked as already seen. It is
-- the truer statement of the two: we do not know the hour they first opened it,
-- but we know perfectly well it was not today.
update public.client_module_sends
   set opened_at = sent_at
 where opened_at is null;

-- PostgREST caches the schema and will keep answering as though the column does
-- not exist, which surfaces as a failed select rather than as a missing field.
notify pgrst, 'reload schema';
