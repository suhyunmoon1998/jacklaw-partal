'use client'

/**
 * Module 2 — wage and hour.
 *
 * Meal and rest breaks, work that never reached a time record, overtime, and
 * what happened when the client asked about any of it. It asks nothing Module 1
 * already established; both write into one answers record, which is what lets a
 * question here be skipped because of an answer given there.
 *
 * Submitting lands on the same thank-you page Module 1 uses. It used to drop
 * the client back on the dashboard with no acknowledgement at all — eighty-six
 * questions answered and nothing on screen to say they had arrived.
 */

import ModuleQuestionnaire from '@/components/ModuleQuestionnaire'

export default function Module2Page() {
  return (
    <ModuleQuestionnaire moduleId="module2" subtitle="Pay & Breaks" />
  )
}
