/**
 * Questions the intake questionnaire used to ask, and no longer does.
 *
 * Module 1 narrowed the questionnaire and reworded parts of it. Answers given
 * to the retired questions are still in storage — nothing was deleted — but
 * nothing renders them any more, and an answer the office cannot see may as
 * well have been thrown away. This is the label to print beside each one.
 *
 * Two kinds of id are in here: questions Module 1 dropped altogether (meal
 * breaks, harassment, witnesses — later modules), and questions Module 1 kept
 * but whose answer shape changed, which took a new id rather than being
 * reinterpreted in place.
 *
 * Nothing writes to these ids. When the later modules land, an id may leave
 * this file for a real questionnaire again; until then this is what keeps an
 * existing client's file readable.
 */

export interface LegacyQuestion {
  /** The section it was asked under, for grouping it the way it was answered. */
  section: string
  label: string
}

export const LEGACY_QUESTIONS: Record<string, LegacyQuestion> = {
  alt_phone: { section: "Contact Information", label: "Alternative Phone Number" },
  start_date_unsure: { section: "Dates Worked", label: "Not sure of the exact date you started?" },
  start_date_approx: { section: "Dates Worked", label: "Approximate Start Date" },
  end_date_unsure: { section: "Dates Worked", label: "Not sure of the exact last day?" },
  end_date_approx: { section: "Dates Worked", label: "Approximate Last Day Working" },
  employment_type: { section: "Dates Worked", label: "Type of Employment" },
  classification: { section: "Job Position and Duties", label: "Were you classified as an employee or independent contractor?" },
  misclassified: { section: "Job Position and Duties", label: "Do you believe you were misclassified as an independent contractor?" },
  exempt: { section: "Job Position and Duties", label: "Were you told you were an \"exempt\" or \"salaried\" employee not entitled to overtime?" },
  pay_type: { section: "Pay Rate", label: "How were you paid?" },
  received_tips: { section: "Pay Rate", label: "Did you receive tips?" },
  pay_changed: { section: "Pay Rate", label: "Did your pay rate change at any point during your employment?" },
  days_per_week: { section: "Schedule", label: "How many days per week did you typically work?" },
  schedule_type: { section: "Schedule", label: "What was your schedule like?" },
  schedule_notes: { section: "Schedule", label: "Describe your typical work schedule" },
  timekeeping_method: { section: "Timekeeping Method", label: "How did your employer track your work hours?" },
  clock_in_out: { section: "Timekeeping Method", label: "Did you personally clock in and clock out?" },
  employer_altered: { section: "Timekeeping Method", label: "Did your employer ever change, alter, or delete your time records?" },
  meal_break_provided: { section: "Meal Breaks", label: "Were you provided a full 30-minute uninterrupted meal break?" },
  meal_break_5hrs: { section: "Meal Breaks", label: "Were meal breaks provided when you worked more than 5 hours?" },
  meal_break_10hrs: { section: "Meal Breaks", label: "Were you provided a second meal break when working more than 10 hours?" },
  meal_break_interrupted: { section: "Meal Breaks", label: "Were your meal breaks interrupted or cut short by work?" },
  meal_break_pressure: { section: "Meal Breaks", label: "Were you pressured, required, or expected to skip meal breaks?" },
  meal_premium_paid: { section: "Meal Breaks", label: "Were you paid one hour of extra pay (\"premium pay\") for missed or late meal breaks?" },
  rest_break_provided: { section: "Rest Breaks", label: "Were you provided paid 10-minute rest breaks?" },
  rest_break_frequency: { section: "Rest Breaks", label: "Were rest breaks provided for approximately every 4 hours worked?" },
  rest_break_skipped: { section: "Rest Breaks", label: "Did you regularly skip rest breaks?" },
  rest_break_pressure: { section: "Rest Breaks", label: "Were you pressured or expected to skip rest breaks?" },
  rest_premium_paid: { section: "Rest Breaks", label: "Were you paid one hour of extra pay for missed rest breaks?" },
  worked_over_8: { section: "Overtime", label: "Did you regularly work more than 8 hours in a single day?" },
  worked_over_12: { section: "Overtime", label: "Did you regularly work more than 12 hours in a single day?" },
  worked_over_40: { section: "Overtime", label: "Did you regularly work more than 40 hours in a week?" },
  paid_overtime: { section: "Overtime", label: "Were you paid time-and-a-half (1.5x) for overtime hours?" },
  paid_double_time: { section: "Overtime", label: "Were you paid double time (2x) for hours beyond 12 in a day?" },
  overtime_notes: { section: "Overtime", label: "Any additional notes about overtime or hours worked?" },
  separation_type: { section: "Final Wages", label: "How did your employment end (or is it ongoing)?" },
  final_wages_timely: { section: "Final Wages", label: "If separated, were your final wages paid on your last day of work?" },
  final_wages_date: { section: "Final Wages", label: "When were your final wages paid? (if known)" },
  wages_still_owed: { section: "Final Wages", label: "Do you believe you are still owed unpaid wages?" },
  received_paystubs: { section: "Wage Statements / Paystubs", label: "Did you receive a paystub each pay period?" },
  paystubs_accurate: { section: "Wage Statements / Paystubs", label: "Were the hours and wages on your paystubs accurate?" },
  paystub_issues: { section: "Wage Statements / Paystubs", label: "What information was missing or incorrect on your paystubs? (Select all that apply)" },
  have_paystubs: { section: "Wage Statements / Paystubs", label: "Do you still have copies of your paystubs?" },
  paid_for_tools: { section: "Reimbursements / Tools / Uniforms", label: "Did you pay out of pocket for tools, equipment, or supplies required for your job?" },
  tools_reimbursed: { section: "Reimbursements / Tools / Uniforms", label: "Were you reimbursed for these expenses?" },
  uniform_required: { section: "Reimbursements / Tools / Uniforms", label: "Were you required to wear a specific uniform?" },
  uniform_paid_by_you: { section: "Reimbursements / Tools / Uniforms", label: "Did you pay for your own uniform?" },
  drove_for_work: { section: "Reimbursements / Tools / Uniforms", label: "Did you use your personal vehicle for work?" },
  mileage_reimbursed: { section: "Reimbursements / Tools / Uniforms", label: "Were you reimbursed for mileage?" },
  other_expenses: { section: "Reimbursements / Tools / Uniforms", label: "Describe any other out-of-pocket business expenses" },
  was_terminated: { section: "Wrongful Termination", label: "Were you terminated or forced to resign?" },
  believe_wrongful: { section: "Wrongful Termination", label: "Do you believe you were wrongfully or unlawfully terminated?" },
  received_written_warnings: { section: "Wrongful Termination", label: "Did you receive written warnings or write-ups before the termination?" },
  made_complaint: { section: "Retaliation", label: "Did you report a violation, file a complaint, or object to something you believed was illegal or wrong?" },
  complaint_subject: { section: "Retaliation", label: "What did you report or complain about?" },
  negative_after_complaint: { section: "Retaliation", label: "Did anything negative happen to you after you made the complaint?" },
  retaliation_description: { section: "Retaliation", label: "Describe what negative actions occurred" },
  involves_disability: { section: "Disability / Medical Leave / Pregnancy", label: "Does your situation involve a disability, medical condition, medical leave, or pregnancy?" },
  took_medical_leave: { section: "Disability / Medical Leave / Pregnancy", label: "Did you take medical or disability leave at any point?" },
  leave_approved: { section: "Disability / Medical Leave / Pregnancy", label: "Was your leave approved by your employer?" },
  leave_denied_retaliated: { section: "Disability / Medical Leave / Pregnancy", label: "Were you denied leave or punished for taking leave?" },
  requested_accommodation: { section: "Disability / Medical Leave / Pregnancy", label: "Did you request a disability-related work accommodation?" },
  accommodation_denied: { section: "Disability / Medical Leave / Pregnancy", label: "Was your accommodation request denied or ignored?" },
  was_pregnant: { section: "Disability / Medical Leave / Pregnancy", label: "Were you pregnant during your employment?" },
  pregnancy_different_treatment: { section: "Disability / Medical Leave / Pregnancy", label: "Were you treated differently because of your pregnancy?" },
  experienced_harassment: { section: "Harassment / Discrimination", label: "Did you experience harassment or discrimination in the workplace?" },
  harassment_type: { section: "Harassment / Discrimination", label: "What type of harassment or discrimination? (Select all that apply)" },
  harassment_description: { section: "Harassment / Discrimination", label: "Describe what happened, including dates if known" },
  reported_to_employer: { section: "Harassment / Discrimination", label: "Did you report the harassment or discrimination to your employer or HR?" },
  employer_response: { section: "Harassment / Discrimination", label: "How did your employer respond to your report?" },
  has_witnesses: { section: "Witnesses", label: "Are there any witnesses who saw what happened and can support your claims?" },
  witness_list: { section: "Witnesses", label: "List witnesses and contact information (if known)" },
  coworkers_same_issues: { section: "Witnesses", label: "Did other coworkers experience the same or similar issues?" },
  coworkers_details: { section: "Witnesses", label: "Describe what you know about other coworkers' experiences" },
  available_documents: { section: "Documents You Have", label: "Which of the following documents do you currently have? (Select all that apply)" },
  documents_notes: { section: "Documents You Have", label: "Any notes about your documents?" },
  prior_agency_complaints: { section: "Additional Information", label: "Have you filed any complaints with a government agency (e.g., DLSE, DFEH/CRD, EEOC, Labor Commissioner)?" },
  agency_complaint_details: { section: "Additional Information", label: "Please describe the complaint, agency name, and outcome if known" },
  prior_attorneys: { section: "Additional Information", label: "Have you consulted with or hired any other attorneys about this matter?" },
  statute_of_limitations: { section: "Additional Information", label: "Do you know if there are any deadlines approaching for your claims?" },
  additional_notes: { section: "Additional Information", label: "Is there anything else you would like us to know about your situation?" },
}

/**
 * The answers on file that no live question accounts for, in the order the old
 * questionnaire asked them, grouped by their old section.
 *
 * An answer whose id is not known here either is still returned, under its own
 * id — an unknown key is a fact about the record, and hiding it would repeat
 * the mistake this file exists to fix.
 */
export function legacyAnswerGroups(
  answers: Record<string, unknown>,
  liveIds: Set<string>
): { section: string; entries: { id: string; label: string; value: unknown }[] }[] {
  const order = Object.keys(LEGACY_QUESTIONS)
  const groups = new Map<string, { id: string; label: string; value: unknown }[]>()

  const keys = Object.keys(answers).sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib)
  })

  for (const id of keys) {
    if (liveIds.has(id)) continue
    const value = answers[id]
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    const known = LEGACY_QUESTIONS[id]
    const section = known?.section ?? 'Other answers on file'
    if (!groups.has(section)) groups.set(section, [])
    groups.get(section)!.push({ id, label: known?.label ?? id, value })
  }

  return Array.from(groups, ([section, entries]) => ({ section, entries }))
}

/** Every id the live questionnaire owns, for the `liveIds` argument above. */
export function liveQuestionIds(sections: { questions: { id: string }[] }[]): Set<string> {
  return new Set(sections.flatMap(s => s.questions.map(q => q.id)))
}
