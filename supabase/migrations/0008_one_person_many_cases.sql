-- One person can be on more than one case.
--
-- A client who is suing two employers needs two client rows, and that is not a
-- workaround: a row carries one set of questionnaire answers, and the dates,
-- pay, schedule and managers are different for each employer. Merging them into
-- one row would file both employers' facts as if they were one job.
--
-- What was wrong was the phone number. UNIQUE (phone) forced the office to
-- invent a second number for the same person, which meant that person could not
-- sign in to their second case at all — the number on file did not exist — and
-- the two rows read as two different people.
--
-- So the uniqueness goes. The lookup returns every case on that number and the
-- portal asks which one; where there is only one, nothing about signing in
-- changes. The index stays, because looking a client up by phone is what the
-- sign-in page does on every attempt.

alter table public.clients drop constraint if exists clients_phone_key;

create index if not exists clients_phone_idx on public.clients (phone);
