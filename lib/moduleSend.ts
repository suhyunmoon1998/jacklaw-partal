import { getSupabase } from '@/lib/supabase'
import { Lang, isLang } from '@/lib/langs'
import { ModuleDefinition, ModuleId, moduleById, moduleQuestionCount, stepName } from '@/lib/modules'
import { lookupClientEmail, lookupClientLanguage, sendAssignmentEmail } from '@/lib/sendAssignmentEmail'
import { readSteps } from '@/lib/clientSteps'
import { isConfigured, sendSms } from '@/lib/twilio'
import { SmsTarget, chooseSmsTarget, lookupClientSms, stepInviteSms } from '@/lib/assignmentInvite'

/**
 * Handing a client one of the numbered modules — the admin panel's Send
 * button, and the same send when Eleanor makes it after Jack approves it.
 *
 * Kept in one place so there is one way a module goes out: the same record,
 * the same text, the same email, in the same order, whoever pressed the button.
 */

export const asModule = (value: unknown): ModuleId | null =>
  value === 'module1' || value === 'module2' || value === 'module3' ? value : null

/**
 * Where to send the client.
 *
 * Normally the questionnaire itself. But the office can hand out Step 2 while
 * Step 1 is unfinished, and then the module's own address is a locked door: the
 * client taps a link from their attorney, logs in, and is refused. So a module
 * that will land locked links to the dashboard instead, where the step they can
 * actually do is the live card and the new one is visibly waiting behind it.
 */
export const moduleLink = (origin: string, moduleId: ModuleId, blocked: boolean) =>
  blocked ? `${origin}/dashboard` : `${origin}${moduleById(moduleId)?.href ?? '/dashboard'}`

/** The step this module would sit behind for this client, if any. */
export async function blockedByStep(clientId: string, moduleId: ModuleId): Promise<number | null> {
  const views = await readSteps(clientId)
  const mine = views.find(v => v.id === moduleId)
  if (!mine) return null
  // Computed as though it were already sent, because the office is asking what
  // will happen when they press Send.
  const earlier = views.find(v => v.step < mine.step && v.sentAt !== null && v.state !== 'done')
  return earlier?.step ?? null
}

export type ModuleSendInput = {
  clientId: string
  moduleId: ModuleId
  /** Undefined: the address on file. Present-but-empty: the office cleared the box on purpose. */
  email?: string
  /** Undefined: the number on file. */
  phone?: string
  /** False: no text at all. */
  sms?: boolean
  lang?: unknown
  /** Where the module's own link points. */
  linkOrigin: string
  /** The public address the text links to. */
  textOrigin: string
}

export type ModuleSendPlan = {
  clientId: string
  moduleId: ModuleId
  clientName: string
  definition: ModuleDefinition
  to: string
  lang: Lang
  target: SmsTarget
  blockedBy: number | null
  link: string
  textOrigin: string
}

export type Outcome = { status: number; body: Record<string, unknown> }

/**
 * Everything a send would do, worked out and checked, with nothing written or
 * sent. The office's mistakes are refused here, before anything is recorded.
 */
export async function planModuleSend(input: ModuleSendInput): Promise<{ ok: true; plan: ModuleSendPlan } | { ok: false; outcome: Outcome }> {
  const { clientId, moduleId } = input
  const definition = moduleById(moduleId)
  if (!definition?.built) {
    return {
      ok: false,
      outcome: { status: 400, body: { error: `${definition?.name ?? 'That module'} has not been built yet, so it cannot be sent.` } },
    }
  }

  const { data: client } = await getSupabase()
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return { ok: false, outcome: { status: 404, body: { error: 'Client not found.' } } }

  const to = typeof input.email === 'string' ? input.email.trim() : await lookupClientEmail(clientId)
  const lang: Lang = isLang(input.lang) ? input.lang : await lookupClientLanguage(clientId)

  const target =
    input.sms === false
      ? { phone: '', reason: 'off' as const }
      : chooseSmsTarget(input.phone, await lookupClientSms(clientId))

  // Said before anything is recorded, because both of these are the office
  // mistyping or forgetting — not a state the client should be put into.
  if (target.reason === 'unusable') {
    return {
      ok: false,
      outcome: { status: 400, body: { error: `That does not look like a phone number: ${String(input.phone).trim()}` } },
    }
  }
  if (target.reason === 'opted-out' && input.phone) {
    return {
      ok: false,
      outcome: {
        status: 400,
        body: {
          error:
            `${client.name ?? 'This client'} replied STOP to our texts, so this office cannot text them. ` +
            'Send it by email, or open it to them and pass the link on yourself.',
        },
      },
    }
  }
  const blockedBy = await blockedByStep(clientId, moduleId)
  return {
    ok: true,
    plan: {
      clientId,
      moduleId,
      clientName: client.name ?? '',
      definition,
      to,
      lang,
      target,
      blockedBy,
      link: moduleLink(input.linkOrigin, moduleId, blockedBy !== null),
      textOrigin: input.textOrigin,
    },
  }
}

/**
 * Records that the module was handed to this client, then texts and emails
 * them the link. The record is what the client's own portal reads to decide
 * whether to offer the module at all, so it is written even when the email
 * fails — the office can copy the link and send it themselves, and the client
 * can still get in.
 */
export async function performModuleSend(plan: ModuleSendPlan, createdBy: 'admin' | 'eleanor'): Promise<Outcome> {
  const { clientId, moduleId, definition, to, lang, blockedBy, link } = plan

  // Recorded first. A module the client cannot open is worse than one they were
  // told about twice, and the office may well be sending the link by hand.
  const { error: writeError } = await getSupabase()
    .from('client_module_sends')
    .upsert(
      {
        client_id: clientId,
        module_id: moduleId,
        sent_at: new Date().toISOString(),
        sent_to: to || null,
        sent_lang: lang,
        created_by: createdBy,
      },
      { onConflict: 'client_id,module_id' }
    )

  if (writeError) {
    console.error('module send write failed:', writeError)
    return { status: 500, body: { error: 'Could not record the send.', link } }
  }

  // Text first, email second. This office's reminder ladder is two texts and a
  // telephone call because that is how its clients are actually reached, and
  // the send that starts the ladder was reaching them by email alone — so a
  // client with no email address got a module they were never told about.
  const phone = plan.target.phone
  const texted = !phone
    ? null
    : isConfigured()
      ? await sendSms(
          phone,
          stepInviteSms(lang, plan.clientName, { name: stepName(definition, lang), minutes: definition.minutes }, plan.textOrigin)
        )
      : { ok: false as const, error: 'Texting is not switched on for this portal yet.' }

  if (!to.includes('@')) {
    return {
      status: 200,
      body: {
        sent: Boolean(texted?.ok),
        sms: texted?.ok ? phone : null,
        smsError: texted && !texted.ok ? texted.error : undefined,
        recorded: true,
        link,
        lang,
        blockedBy,
        // The second half of this sentence has to change when the step lands
        // locked, or the office is told to hand over a link that will refuse the
        // client — and told it by the same screen that just warned them.
        error:
          texted?.ok
            ? undefined
            : blockedBy === null
              ? 'No email address and no text could be sent. The step is open to them — copy the link and send it yourself.'
              : `No email address and no text could be sent. The step is recorded, but stays locked until Step ${blockedBy} is submitted; the link goes to their step list.`,
      },
    }
  }

  try {
    await sendAssignmentEmail({
      to,
      clientName: plan.clientName || 'there',
      // "Step 2 · Questions about your pay and breaks", in their language —
      // not the office's internal row name.
      setName: stepName(definition, lang),
      questionCount: moduleQuestionCount(moduleId),
      link,
      lang,
    })
  } catch (err) {
    console.error('module send email failed:', err)
    // The text may still have arrived, and if it did the client has the link.
    return {
      status: 200,
      body: {
        sent: Boolean(texted?.ok),
        sms: texted?.ok ? phone : null,
        recorded: true,
        link,
        lang,
        blockedBy,
        error: texted?.ok
          ? undefined
          : err instanceof Error
            ? err.message
            : 'Could not send the email.',
        emailError: err instanceof Error ? err.message : 'Could not send the email.',
      },
    }
  }

  return {
    status: 200,
    body: {
      sent: true,
      recorded: true,
      email: to,
      sms: texted?.ok ? phone : null,
      smsError: texted && !texted.ok ? texted.error : undefined,
      link,
      lang,
      blockedBy,
    },
  }
}
