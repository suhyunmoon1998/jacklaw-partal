# JackLaw Portal

Client portal for 866 JACK LAW, a California plaintiff-side employment firm.
Next.js App Router, Supabase, Vitest. `npm run build` and `npx vitest run`
before any commit; both are expected to pass.

## The rule the whole design rests on

**A model is never asked what the law says.** It is handed the text and asked
whether these facts meet it. Everything below follows from that:

- Claim elements are written in `lib/authority/claims.ts`, by hand, each one
  naming the provision it is read out of. Never generated.
- Statutes, IWC Wage Orders and CACI are held in full in `lib/authority/` and
  quoted into prompts. `quote()` prints "NOT ON FILE. Do not state what this
  provision says" for anything missing, and that is the intended behaviour.
- Case holdings in `lib/authority/cases.ts` carry a verbatim quote, and
  `test/cases.test.ts` fails the build if any quote is not in the stored
  opinion. Each also records what it does **not** decide.
- No reporter page numbers: neither source carries them, and a citation that
  looks right and is wrong is worse than none. A test forbids them.
- Which IWC Wage Order governs is proposed (`lib/wageOrderChoice.ts`), never
  decided. `confirmed` is typed `false`. An attorney settles it.

When an element cannot be reached, the honest output is `needs authority` with
what is missing. Do not make it reachable by loosening a prompt.

## The layers, bottom up

| File | What it does |
|---|---|
| `lib/factExtraction.ts` → `factStore.ts` | Answers → atomic facts, verbatim kept in the client's own language, provenance mandatory |
| `lib/claimMatrix.ts` | Facts → claim elements, against quoted authority |
| `lib/evidenceSpine.ts` | Chronology, the corpus's nine anomalies, the evidence spine |
| `lib/followUp.ts` + `followUpShape.ts` | Next questions for the client; `vet()` rejects jargon, compound questions, missing "I don't know" |
| `lib/followUpStore.ts` | Writes a round as a **draft** question set — the portal already hides drafts, and that is the review gate |
| `lib/caseReading.ts` + `caseReadingStore.ts` | Runs the above in four stages and keeps the result |

Shape modules (`*Shape.ts`) exist because importing a value from an engine
pulls the Anthropic SDK and `node:fs` into the browser bundle. Admin panels
import the shape, never the engine.

## Practical constraints

- **Vercel Hobby caps a request at 300s.** Readings are staged. Do not
  un-stage them.
- **A new table needs explicit `service_role` grants** or PostgREST answers
  "permission denied" and a paid-for reading is silently lost. Copy the
  pattern in `supabase/migrations/0015_case_readings.sql`.
- **Closed sets belong in checking, not in an output schema.** A provider
  enforces a schema all-or-nothing, so one bad enum value costs the whole
  call. See `vet()` in `followUpShape.ts`.
- Shared prompt prefixes are cached (`cache_control`). Keep the stable part
  first even where it reads backwards.

## Models

`lib/models.ts`, one env var each. The defaults were measured against a real
file with the Opus reading stored for comparison — matrix and spine on Sonnet
were materially worse, the Wage Order was identical and faster. Move one the
same way: run it against a client already read and diff the findings.

## Cost

David has raised token spend twice. Say the expected scale — agents, rough
tokens — before a workflow, a fan-out, or a full re-reading, and wait. Prefer
verifying a fix against output already on disk to re-running a reading.
