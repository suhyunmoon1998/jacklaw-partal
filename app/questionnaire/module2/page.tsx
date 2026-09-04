'use client'

/**
 * Module 2 — wage and hour.
 *
 * Meal and rest breaks, work that never reached a time record, overtime, and
 * what happened when the client asked about any of it. It asks nothing Module 1
 * already established; both write into one answers record, which is what lets a
 * question here be skipped because of an answer given there.
 */

import ModuleQuestionnaire from '@/components/ModuleQuestionnaire'

export default function Module2Page() {
  return (
    <ModuleQuestionnaire
      moduleId="module2"
      subtitle="Pay & Breaks"
      submitHref="/dashboard"
    />
  )
}
