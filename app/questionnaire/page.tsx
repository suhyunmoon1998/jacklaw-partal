'use client'

/**
 * Module 1 — the intake questionnaire every client receives.
 *
 * The screen itself lives in components/ModuleQuestionnaire, which Module 2
 * renders too. Nothing about how a questionnaire behaves belongs to one module.
 */

import ModuleQuestionnaire from '@/components/ModuleQuestionnaire'

export default function QuestionnairePage() {
  return <ModuleQuestionnaire moduleId="module1" subtitle="Questionnaire" />
}
