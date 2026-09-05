'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import MascotWatermark from '@/components/MascotWatermark'
import { getSession } from '@/lib/auth'
import { Assignment, Session } from '@/types'
import { QUESTIONNAIRE_SECTIONS } from '@/lib/questionnaireData'
import { MODULE_2_SECTIONS } from '@/lib/module2Data'
import { ModuleId, moduleById, moduleSectionCount } from '@/lib/modules'
import {
  ModuleProgress,
  ModuleSend,
  StepView,
  allSentStepsDone,
  overallPercent,
  stepViews,
  unseenStep,
  visibleSteps,
} from '@/lib/moduleSteps'
import { FIRM_PHONE_LABEL, FIRM_PHONE_LABEL_HYPHENATED, FIRM_PHONE_TEL } from '@/lib/contact'
import { useLanguage } from '@/lib/i18n'
import { localizeName } from '@/lib/questionLogic'

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null)
  /**
   * Null while we do not yet know. Never an empty list standing in for a failed
   * read — the steps are the only way into every questionnaire, and guessing
   * "nothing was sent" would lock the client out of their own case.
   */
  const [steps, setSteps] = useState<StepView[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [documentCount, setDocumentCount] = useState(0)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const router = useRouter()
  const { t, tf, lang } = useLanguage()

  /**
   * One load, not three.
   *
   * A step's state is half progress and half send record, and the two arriving
   * separately is how the screen paints a frame that was never true — an
   * unstarted Step 1 for a client who submitted it in July, or a "New" badge on
   * a step they finished. Both halves land together or neither is drawn.
   */
  const load = useCallback(async (clientId: string) => {
    setLoadFailed(false)
    try {
      const [state, docs, modules] = await Promise.all([
        fetch(`/api/questionnaire?clientId=${encodeURIComponent(clientId)}`).then(r => r.json()),
        fetch(`/api/documents?clientId=${encodeURIComponent(clientId)}`).then(r => r.json()),
        fetch(`/api/modules?clientId=${encodeURIComponent(clientId)}`).then(r => r.json()),
      ])

      if (modules?.ok !== true) {
        setLoadFailed(true)
        return
      }

      const sends: Partial<Record<ModuleId, ModuleSend>> = {}
      for (const row of modules.sends ?? []) {
        sends[row.moduleId as ModuleId] = { sentAt: row.sentAt, openedAt: row.openedAt ?? null }
      }

      const q = state?.state
      const progress: Partial<Record<ModuleId, ModuleProgress>> = {
        module1: {
          submitted: Boolean(q?.submitted),
          // Clamped downstream, because a client who started the questionnaire
          // when it had twenty sections still carries those indices and would
          // otherwise be told they are 190% done.
          completedSections: q?.completedSections ?? [],
          totalSections: QUESTIONNAIRE_SECTIONS.length,
        },
        module2: {
          submitted: Boolean(q?.module2?.submitted),
          completedSections: q?.module2?.completedSections ?? [],
          totalSections: MODULE_2_SECTIONS.length,
        },
      }

      setDocumentCount(docs?.documents?.length ?? 0)
      setSteps(stepViews(sends, progress))
    } catch {
      setLoadFailed(true)
    }
  }, [])

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/client'); return }
    setSession(s)
    load(s.clientId)

    // Question sets the office assigned to this client specifically. Kept apart
    // from the steps above — each has its own status, and a failure here costs
    // the client nothing that is already on their screen.
    fetch(`/api/assignments?clientId=${encodeURIComponent(s.clientId)}`)
      .then(r => r.json())
      .then(({ assignments }) => setAssignments(assignments ?? []))
      .catch(() => setAssignments([]))
  }, [router, load])

  if (!session || (!steps && !loadFailed)) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showLogout />
      <main className="flex-1 px-4 pt-5 pb-8 max-w-2xl mx-auto w-full">
        <div className="mb-5">
          <div className="animate-shimmer h-8 w-48 rounded-xl mb-2" />
          <div className="animate-shimmer h-4 w-64 rounded-xl" />
        </div>
        <div className="animate-shimmer h-16 rounded-2xl mb-5" />
        <div className="animate-shimmer h-40 rounded-2xl mb-4" />
        <div className="space-y-3 mb-5">
          <div className="animate-shimmer h-24 rounded-2xl" />
          <div className="animate-shimmer h-24 rounded-2xl" />
        </div>
        <div className="animate-shimmer h-32 rounded-2xl" />
      </main>
    </div>
  )

  const views = steps ?? []
  const shown = visibleSteps(views)
  const unseen = unseenStep(views)
  const caughtUp = allSentStepsDone(views)
  const progressPercent = overallPercent(views)

  const goTo = (view: StepView) => {
    const href = moduleById(view.id)?.href
    if (href) router.push(href)
  }

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col animate-fade-in">
      <MascotWatermark />

      <div className="relative z-20">
        <Header showLogout />
      </div>

      <main className="relative z-10 flex-1 px-4 pt-5 pb-8 pb-safe max-w-2xl mx-auto w-full">
        {/* Welcome */}
        <div className="mb-5 animate-slide-up">
          <h2 className="text-2xl font-bold text-black">{t('hello')} {session.name} 👋</h2>
          <p className="text-gray-500 text-sm mt-0.5">{t('welcome_portal')}</p>
        </div>

        {/* What this portal is for, and how to actually reach the office */}
        <div className="mb-5 bg-gold/5 border border-gold/30 rounded-2xl p-4 flex gap-3 animate-slide-up stagger-1">
          <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 text-sm leading-relaxed">
            <strong className="text-black font-semibold">{t('emergency')}</strong> {t('emergency_sub')}{' '}
            <a
              href={FIRM_PHONE_TEL}
              className="text-gold font-bold underline underline-offset-2 whitespace-nowrap py-3.5 hover:text-gold-dark active:text-gold-dark"
            >
              {FIRM_PHONE_LABEL}
            </a>.
          </p>
        </div>

        {/* The read that failed. Said plainly, with the way back, rather than
            drawing a portal with nothing in it. */}
        {loadFailed && (
          <div className="mb-5 bg-white border-2 border-gray-200 rounded-2xl p-5 animate-slide-up">
            <p className="font-semibold text-black">{t('qs_save_failed')}</p>
            <p className="text-sm text-gray-500 mt-1.5">{t('qs_save_failed_sub')}</p>
            <button onClick={() => session && load(session.clientId)} className="btn-primary mt-4">
              {t('qs_retry')}
            </button>
          </div>
        )}

        {/* A step arrived and they have not been in yet. The one thing on this
            screen that is genuinely news. */}
        {unseen && (
          <button
            onClick={() => goTo(unseen)}
            className="w-full mb-5 bg-black rounded-2xl p-4 flex items-center gap-3 text-left animate-slide-up stagger-1 active:scale-[0.98] transition-transform"
          >
            <span className="w-9 h-9 rounded-full bg-gold flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
              </svg>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-white font-semibold text-sm">{t('step_banner')}</span>
              <span className="block text-white/60 text-xs mt-0.5 truncate">
                {tf('step_short', { n: unseen.step })} · {t(moduleById(unseen.id)!.titleKey)}
              </span>
            </span>
            <span className="text-gold font-bold text-sm shrink-0">{t('step_banner_open')}</span>
          </button>
        )}

        {/* Case summary card */}
        <div className="card mb-5 animate-slide-up stagger-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">{t('your_case')}</p>
              <p className="text-black font-bold text-lg leading-tight">{session.caseType}</p>
            </div>
            {/* Reads the steps, not Module 1 alone. The old card could say
                "✓ Submitted · 100%" in green directly above a Step 2 the client
                had not started. */}
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ml-3 ${
              caughtUp
                ? 'bg-green-100 text-green-700'
                : progressPercent > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {caughtUp ? t('status_all_caught_up') : progressPercent > 0 ? t('status_in_progress') : t('status_not_started')}
            </span>
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{t('your_progress')}</span>
              <span className={caughtUp ? 'text-green-600 font-semibold' : 'text-gold font-semibold'}>
                {progressPercent}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${caughtUp ? 'bg-green-500' : 'bg-gold'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-400">
              {documentCount === 0 ? t('no_docs') : `${documentCount} document${documentCount !== 1 ? 's' : ''} uploaded`}
            </span>
          </div>
        </div>

        {/* The steps. Exactly one of them is a card with a button on it; the
            rest are quiet rows. A client should be able to answer "what do I do
            now" without reading anything. */}
        {shown.length > 0 && (
          <div className="mb-5">
            <div className="px-1 mb-1">
              <h3 className="font-bold text-black">{t('steps_title')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('steps_sub')}</p>
            </div>

            {caughtUp && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-2xl p-4 animate-slide-up">
                <p className="font-semibold text-green-800 text-sm">{t('step_all_done')}</p>
                <p className="text-sm text-green-700/80 mt-1 leading-relaxed">{t('step_all_done_sub')}</p>
              </div>
            )}

            <div className="mt-3 space-y-2.5">
              {shown.map(view => {
                const mod = moduleById(view.id)!
                const title = t(mod.titleKey)

                if (view.state === 'open') {
                  return (
                    <button
                      key={view.id}
                      onClick={() => goTo(view)}
                      className="w-full bg-white border-2 border-gold rounded-2xl p-5 text-left flex items-start gap-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] group animate-slide-up stagger-3"
                    >
                      <span className="w-10 h-10 rounded-full bg-gold text-white font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {view.step}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-black">{title}</span>
                          {view.isNew && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold text-white uppercase tracking-wide">
                              {t('step_new')}
                            </span>
                          )}
                        </span>
                        <span className="block text-sm text-gray-500 mt-0.5">{t(mod.subKey)}</span>
                        <span className="block text-xs text-gray-400 mt-1.5">
                          {view.finishedNotSubmitted
                            ? t('step_submit_now')
                            : tf('step_time', {
                                n: moduleSectionCount(view.id),
                                min: mod.minutes[0],
                                max: mod.minutes[1],
                              })}
                        </span>

                        {view.percent > 0 && (
                          <span className="flex items-center gap-2 mt-3">
                            <span className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <span className="block h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${view.percent}%` }} />
                            </span>
                            <span className="text-xs text-gray-400 tabular-nums">{view.percent}%</span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-sm font-bold text-gold mt-3">
                          {view.percent > 0 ? t('step_continue') : t('step_start')}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  )
                }

                // Everything else is a row: done, waiting on an earlier step, or
                // not sent. No question count and no time estimate on work they
                // cannot start — that is only discouraging.
                const done = view.state === 'done'
                const detail = done
                  ? t('step_done')
                  : view.state === 'waiting'
                  ? tf('m_locked', { n: view.blockedBy ?? 1 })
                  : view.built
                  ? t('step_unsent')
                  : t('step_soon')

                const row = (
                  <>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold tabular-nums ${
                      done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? '✓' : view.step}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block font-medium truncate ${done ? 'text-black' : 'text-gray-500'}`}>{title}</span>
                      <span className="block text-xs text-gray-400 mt-0.5 truncate">{detail}</span>
                    </span>
                    {done && (
                      <span className="text-xs font-semibold text-gold shrink-0">{t('step_view')}</span>
                    )}
                  </>
                )

                return done ? (
                  <button
                    key={view.id}
                    onClick={() => goTo(view)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-left flex items-center gap-3 hover:border-gold/50 active:scale-[0.99] transition-all"
                  >
                    {row}
                  </button>
                ) : (
                  <div
                    key={view.id}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3"
                  >
                    {row}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Documents */}
        <button
          onClick={() => router.push('/documents')}
          className="w-full mb-5 bg-white border-2 border-transparent hover:border-gold rounded-2xl p-5 text-left flex items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] group animate-slide-up stagger-4"
        >
          <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gold group-active:bg-gold transition-colors">
            <svg className="w-6 h-6 text-gold group-hover:text-white group-active:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-black">{t('upload_documents')}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {documentCount > 0
                ? `${documentCount} file${documentCount !== 1 ? 's' : ''} uploaded`
                : 'Paystubs, texts, emails, and more'}
            </p>
          </div>
          <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Question sets assigned to this client */}
        {assignments.length > 0 && (
          <div className="mb-5 animate-slide-up stagger-4">
            <div className="flex items-baseline justify-between gap-3 mb-2 px-1">
              <h3 className="font-bold text-black">{t('qs_your_questionnaires')}</h3>
              <span className="text-xs text-gray-400">{assignments.length}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3 px-1">{t('qs_your_questionnaires_sub')}</p>

            <div className="space-y-3">
              {assignments.map(a => {
                const done = a.status === 'completed'
                const started = a.status === 'in_progress' || a.answeredCount > 0
                const label = done ? t('qs_completed') : started ? t('qs_in_progress') : t('qs_not_started')
                const action = done ? t('qs_view') : started ? t('qs_continue') : t('qs_start')
                const pct = a.questionCount > 0 ? Math.round((a.answeredCount / a.questionCount) * 100) : 0

                return (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/questionnaire/${a.id}`)}
                    className="w-full bg-white border-2 border-transparent hover:border-gold rounded-2xl p-5 text-left transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-black truncate">
                          {localizeName(a.questionSetName, a.questionSetNameTranslations, lang)}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {a.questionCount} {a.questionCount === 1 ? t('qs_question') : t('qs_questions')}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                        done ? 'bg-green-100 text-green-700' : started ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {label}
                      </span>
                    </div>

                    {!done && a.questionCount > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums">{pct}%</span>
                      </div>
                    )}

                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold">
                      {action}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Contact Office */}
        <div className="bg-black rounded-2xl p-5 mb-6 animate-slide-up stagger-5">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-white font-semibold">{t('contact_office')}</p>
          </div>
          <p className="text-white/60 text-sm mb-4 leading-relaxed">{t('contact_msg')}</p>
          <a
            href={FIRM_PHONE_TEL}
            className="flex items-center justify-center gap-2 w-full bg-gold text-white font-bold py-4 rounded-xl hover:bg-gold-dark active:bg-gold-dark transition-colors text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {FIRM_PHONE_LABEL_HYPHENATED}
          </a>
        </div>

        {/* White halo keeps this legible where it overlaps the watermark */}
        <p className="text-center text-xs text-gray-500 pb-2 [text-shadow:0_1px_8px_#fff,0_0_3px_#fff]">
          Law Offices of Jack D. Josephson, APC<br />
          California Employment Law · Attorney-Client Confidential
        </p>
      </main>
    </div>
  )
}
