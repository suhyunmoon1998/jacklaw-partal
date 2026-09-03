import { QuestionnaireSection } from '@/types'

/**
 * Module 1 of the employment-law intake questionnaire — 77 questions.
 *
 * Scope is deliberately narrow: who the client is, who the employer was, when
 * they worked there, what the job was, how they were paid, the usual schedule,
 * how time was recorded, and whether work happened outside the recorded start
 * and end times — plus final wages and wrongful termination for people who have
 * already left. Meal and rest breaks, overtime damages, wage statements,
 * reimbursements, retaliation, leave, harassment, witnesses and document
 * collection are NOT here; they belong to later modules and already exist as
 * assignable question sets (see lib/recommendedQuestions.ts).
 *
 * Q019 `still_employed` is the pivot. A current employee never sees the last-day
 * questions or either of the two closing sections; both carry a section-level
 * gate, so their questions are neither shown nor validated.
 *
 * ── Identifiers ──────────────────────────────────────────────────────────────
 * The packet allows `Q001`–`Q077` "or a documented stable equivalent". This file
 * uses the portal's own convention — a readable id per question — for two
 * reasons that matter more than matching the packet's numbering literally:
 * other code reads answers by name (`email` addresses a client, and
 * `preferred_language` decides which language the firm writes in), and a
 * question whose meaning and answer shape are unchanged keeps its id, so every
 * answer a client already gave still displays. MODULE_1_CROSSWALK below is the
 * explicit mapping in both directions.
 *
 * Where the packet changed a question's answer shape — a select whose choices
 * are worded differently, a single-select that became a checklist — the
 * question takes a NEW id and the retired one is left alone in storage. Nothing
 * is renamed in place, so no stored answer is ever reinterpreted as an answer to
 * a question it was not asked. lib/questionnaireLegacy.ts is what keeps those
 * retired answers readable in the office.
 */

/** The seven-day grid asked for as text, since the portal has no grid control. */
const WEEK_PLACEHOLDER =
  'Monday: 7:00am to 4:00pm\nTuesday: 7:00am to 4:00pm\nWednesday:\nThursday:\nFriday:\nSaturday:\nSunday:'

const WEEK_MINUTES_PLACEHOLDER =
  'Monday: 20 minutes\nTuesday: 15 minutes\nWednesday:\nThursday:\nFriday:\nSaturday:\nSunday:'

/** Every way of putting a time in, offered once as a checklist and once as a pick-one. */
const TIME_ENTRY_METHODS = [
  'Punch card',
  'Swipe or tap a card',
  'Code or button',
  'Finger, hand, or face scan',
  'Phone or tablet app',
  'Work computer or website',
  'Cash register',
  'Paper record',
  'Tell or text someone',
]

/** The methods that involve a named machine, app or system — the gate for Q047. */
const NAMED_SYSTEM_METHODS = [
  'Punch card',
  'Swipe or tap a card',
  'Code or button',
  'Finger, hand, or face scan',
  'Phone or tablet app',
  'Work computer or website',
  'Cash register',
]

const ENTERED_BY_OTHERS = [
  'Owner or boss',
  'Manager or lead',
  'Coworker',
  'Office or payroll worker',
  'The system did it',
  'The schedule time was used',
  'More than one person or way',
  'No one',
  'I do not know',
]

/**
 * Whether the client knows a date exactly, asked before the date itself.
 *
 * The pair exists so the questionnaire never has to pretend a guess is a fact:
 * the client says how sure they are, and then writes the date in whatever form
 * they actually have it. The date field follows any answer to the pair's first
 * question — someone who knows the date exactly still has to write it down.
 */
const KNOWS_DATE = ['Yes', 'No', 'I am not sure']
const ANY_ANSWER_TO = { value: KNOWS_DATE[0], orValues: KNOWS_DATE.slice(1) }

export const QUESTIONNAIRE_SECTIONS: QuestionnaireSection[] = [
  // ── A. Your contact information ────────────────────────────────────────────
  {
    id: 'contact',
    title: 'Your Contact Information',
    questions: [
      { id: 'full_name', label: 'What is your full legal name?', type: 'text', required: true, placeholder: 'As it appears on your ID' },
      { id: 'used_other_name', label: 'Did you use any other name while working at this job?', type: 'yes_no' },
      {
        id: 'other_names',
        label: 'What other name or names did you use?',
        type: 'text',
        showIf: { questionId: 'used_other_name', value: 'yes' },
      },
      { id: 'dob', label: 'What is your date of birth?', type: 'date', required: true },
      { id: 'address', label: 'What is your street address?', type: 'text', required: true },
      { id: 'city_state_zip', label: 'What city, state, and ZIP Code do you live in?', type: 'text', required: true },
      {
        id: 'contact_phones',
        label: 'What phone number should we use to reach you? Do you have another phone number?',
        type: 'text',
        helpText: 'Put the best number first. Add a second number after it if you have one.',
        placeholder: '(310) 555-0000, and (310) 555-0001',
      },
      { id: 'email', label: 'What is your email address?', type: 'text', placeholder: 'you@example.com' },
      {
        id: 'preferred_language',
        label: 'What language would you like us to use with you?',
        type: 'select',
        options: ['English', 'Spanish', 'Chinese', 'Korean', 'Other'],
      },
    ],
  },

  // ── B. The employer ────────────────────────────────────────────────────────
  {
    id: 'employer',
    title: 'The Employer',
    questions: [
      {
        id: 'employer_name',
        label: 'What is the employer or company name?',
        type: 'text',
        required: true,
        helpText: 'Use the name on a paystub or check if you know it.',
      },
      {
        id: 'employer_address',
        label: "What is the employer's street address?",
        type: 'text',
        helpText: '"I do not know" is a fine answer.',
      },
      { id: 'employer_city_state', label: 'What city and state did you work in?', type: 'text' },
      {
        id: 'supervisor_name',
        label: 'What was the name of your main supervisor or manager?',
        type: 'text',
        helpText: '"I do not know the name" is a fine answer.',
      },
      {
        id: 'supervisor_phone',
        label: "What is that person's phone number?",
        type: 'text',
        helpText: '"I do not know" is a fine answer.',
        placeholder: '(310) 555-0000',
      },
      {
        id: 'hr_contact',
        label: 'Who was your HR contact, or what was the HR department called?',
        type: 'text',
        helpText: '"There was no HR" and "I do not know" are both fine answers.',
      },
      {
        id: 'industry',
        label: 'What type of business was this?',
        type: 'text',
        placeholder: 'For example: restaurant, warehouse, construction, retail, or office',
      },
    ],
  },

  // ── C. When you worked there ───────────────────────────────────────────────
  {
    id: 'dates_worked',
    title: 'When You Worked There',
    questions: [
      {
        id: 'start_date_known',
        label: 'Do you know the exact date you started working there?',
        type: 'select',
        options: KNOWS_DATE,
      },
      {
        id: 'start_date',
        label: 'When did you start working there? Give the exact date, your closest guess, or a date range.',
        type: 'text',
        helpText: 'A date, a month and year, a season, or a span — "Spring 2022" and "March to May 2022" are both real answers.',
        showIf: { questionId: 'start_date_known', ...ANY_ANSWER_TO },
      },
      { id: 'still_employed', label: 'Do you still work there?', type: 'yes_no', required: true },
      {
        id: 'end_date_known',
        label: 'Do you know your exact last day of work?',
        type: 'select',
        options: KNOWS_DATE,
        showIf: { questionId: 'still_employed', value: 'no' },
      },
      {
        id: 'end_date',
        label: 'What was your last day of work? Give the exact date, your closest guess, or a date range.',
        type: 'text',
        helpText: 'A date, a month and year, a season, or a span — "late 2023" and "November or December 2023" are both real answers.',
        showIf: { questionId: 'end_date_known', ...ANY_ANSWER_TO },
      },
      {
        id: 'job_type',
        label: 'What type of job was it?',
        type: 'select',
        options: ['Full-time', 'Part-time', 'Temporary', 'Seasonal', 'On-call', 'Other', 'I do not know'],
      },
    ],
  },

  // ── D. Your job and duties ─────────────────────────────────────────────────
  {
    id: 'position',
    title: 'Your Job and Duties',
    questions: [
      { id: 'job_title', label: 'What was your job title?', type: 'text', required: true },
      {
        id: 'job_duties',
        label: 'What work did you normally do?',
        type: 'textarea',
        required: true,
        placeholder: 'List your main duties.',
      },
      {
        id: 'contractor_or_employee',
        label: 'Did the company call you an employee or an independent contractor?',
        type: 'select',
        options: ['Employee', 'Independent contractor', 'Both at different times', 'I do not know'],
      },
      {
        id: 'contractor_wrong',
        label: 'If the company called you an independent contractor, do you believe that was wrong?',
        type: 'select',
        options: ['Yes', 'No', 'I am not sure'],
        showIf: {
          questionId: 'contractor_or_employee',
          value: 'Independent contractor',
          orValues: ['Both at different times'],
        },
      },
      {
        id: 'called_exempt',
        label: "Did the company call you 'exempt' or 'salaried' and say you would not receive overtime pay?",
        type: 'select',
        options: ['Yes', 'No', 'I do not know'],
      },
    ],
  },

  // ── E. How you were paid ───────────────────────────────────────────────────
  {
    id: 'pay_rate',
    title: 'How You Were Paid',
    questions: [
      {
        id: 'pay_calculated',
        label: 'How was your pay calculated?',
        type: 'multiselect',
        options: ['Hourly', 'Salary', 'Day rate', 'Piece rate', 'Commission', 'Other', 'I do not know'],
        helpText: 'Choose everything that applied.',
      },
      {
        id: 'hourly_rate',
        label: 'What was your hourly rate?',
        type: 'text',
        placeholder: '18.00',
        helpText: 'A dollar amount, or "I do not know".',
        showIf: { questionId: 'pay_calculated', value: 'Hourly' },
      },
      {
        id: 'salary_amount',
        label: 'What was your salary amount?',
        type: 'text',
        helpText: 'The amount and how often it was paid, or "I do not know".',
        placeholder: '$60,000 per year',
        showIf: { questionId: 'pay_calculated', value: 'Salary' },
      },
      {
        id: 'other_pay_rates',
        label: 'What other pay rate or rates applied?',
        type: 'text',
        helpText: 'Include each day, piece, or commission rate.',
        showIf: {
          questionId: 'pay_calculated',
          value: 'Day rate',
          orValues: ['Piece rate', 'Commission', 'Other'],
        },
      },
      {
        id: 'pay_received_how',
        label: 'How did you receive your pay?',
        type: 'multiselect',
        options: ['Cash', 'Paper check', 'Direct deposit', 'Payroll card', 'Other'],
        helpText: 'Choose everything that applied.',
      },
      { id: 'tips_received', label: 'Did you receive tips?', type: 'select', options: ['Yes', 'No', 'Sometimes'] },
      {
        id: 'pay_rate_changed',
        label: 'Did your pay rate change while you worked there?',
        type: 'select',
        options: ['Yes', 'No', 'I do not know'],
      },
      {
        id: 'pay_change_notes',
        label: 'What changed, and about when did each change happen?',
        type: 'textarea',
        helpText: 'Add one line for each change.',
        showIf: { questionId: 'pay_rate_changed', value: 'Yes' },
      },
    ],
  },

  // ── F. Your usual work schedule ────────────────────────────────────────────
  {
    id: 'schedule',
    title: 'Your Usual Work Schedule',
    questions: [
      {
        id: 'days_per_week_usual',
        label: 'About how many days per week did you usually work?',
        type: 'text',
        helpText: 'A number, a range, "It changed", or "I do not know".',
      },
      {
        id: 'hours_per_day',
        label: 'About how many hours per day did you usually work?',
        type: 'text',
        helpText: 'A number, a range, "It changed", or "I do not know".',
      },
      {
        id: 'weekly_schedule',
        label: 'On which days did you usually work, and what were your usual start and end times?',
        type: 'textarea',
        helpText: 'One line per day. Leave a day blank if you did not work it.',
        placeholder: WEEK_PLACEHOLDER,
      },
      {
        id: 'schedule_chosen_by',
        label: 'Who chose your workdays and hours?',
        type: 'multiselect',
        options: [
          'Owner or boss',
          'Manager or lead',
          'Office or schedule worker',
          'App or system',
          'Customer or job site',
          'More than one person or way',
          'Other',
          'I do not know',
        ],
        helpText: 'Choose everything that applied.',
      },
      {
        id: 'schedule_delivered_how',
        label: 'How did you get your schedule?',
        type: 'multiselect',
        options: [
          'Paper posted at work',
          'App or website',
          'Text message',
          'Email',
          'Group chat',
          'Phone call',
          'Told in person',
          'It stayed the same',
          'Other',
          'I do not know',
        ],
        helpText: 'Choose everything that applied.',
      },
      {
        id: 'schedule_changed',
        label: 'After you got your schedule, did it ever change?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'I do not know'],
      },
      {
        id: 'schedule_change_asks',
        label: 'Were you ever asked or required to do any of these things?',
        type: 'multiselect',
        options: [
          'Come in on a day off',
          'Come in early',
          'Stay late',
          'Work a different day',
          'Start or end at a different time',
          'Go home early',
          'Call to learn if you worked',
          'Stay ready or on-call',
          'Other',
        ],
        helpText: 'Choose everything that applied.',
        showIf: { questionId: 'schedule_changed', value: 'Yes', orValues: ['Sometimes'] },
      },
    ],
  },

  // ── G. How your work time was recorded ─────────────────────────────────────
  {
    id: 'timekeeping',
    title: 'How Your Work Time Was Recorded',
    questions: [
      {
        id: 'time_recorded_how',
        label: 'How did the employer record your work time?',
        type: 'multiselect',
        options: [
          ...TIME_ENTRY_METHODS,
          'A boss or coworker entered it',
          'No time was kept',
          'Other',
          'I do not know',
        ],
        helpText: 'Choose everything that applied.',
      },
      {
        id: 'entered_own_start',
        label: 'Did you put in your own start time on most workdays?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'No start time was kept', 'I do not know'],
      },
      {
        id: 'start_entered_how',
        label: 'How did you put in your start time?',
        type: 'select',
        options: [...TIME_ENTRY_METHODS, 'More than one way', 'Other', 'I do not know'],
        showIf: { questionId: 'entered_own_start', value: 'Yes', orValues: ['Sometimes'] },
      },
      {
        id: 'start_entered_where',
        label: 'Where did you put in your start time?',
        type: 'select',
        options: [
          'Front door',
          'Work area',
          'Office or break room',
          'Register',
          'Work computer',
          'Company phone or tablet',
          'My own phone',
          'Work car or job site',
          'More than one place',
          'Other',
          'I do not know',
        ],
        showIf: { questionId: 'entered_own_start', value: 'Yes', orValues: ['Sometimes'] },
      },
      {
        id: 'timekeeping_system_name',
        label: 'What was the clock, app, website, or system called?',
        type: 'text',
        helpText: '"I never saw a name" and "I do not know" are both fine answers.',
        showIf: {
          questionId: 'time_recorded_how',
          value: NAMED_SYSTEM_METHODS[0],
          orValues: NAMED_SYSTEM_METHODS.slice(1),
        },
      },
      {
        id: 'start_entered_by_other',
        label: 'When you did not put in your own start time, who did?',
        type: 'select',
        options: ENTERED_BY_OTHERS,
        showIf: {
          questionId: 'entered_own_start',
          value: 'No',
          orValues: ['Sometimes', 'I do not know'],
        },
      },
      {
        id: 'entered_own_end',
        label: 'Did you put in your own end time on most workdays?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'No end time was kept', 'I do not know'],
      },
      {
        id: 'end_entered_same_way',
        label: 'Did you put in your end time the same way as your start time?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'I do not know'],
        // Only worth asking of someone who put in both times themselves.
        showIf: {
          questionId: 'entered_own_end',
          value: 'Yes',
          orValues: ['Sometimes'],
          and: { questionId: 'entered_own_start', value: 'Yes', orValues: ['Sometimes'] },
        },
      },
      {
        id: 'end_entered_differently',
        label: 'If the end time was entered differently, how was it entered?',
        type: 'text',
        showIf: { questionId: 'end_entered_same_way', value: 'No', orValues: ['Sometimes'] },
      },
      {
        id: 'end_entered_by_other',
        label: 'When you did not put in your own end time, who did?',
        type: 'select',
        options: ENTERED_BY_OTHERS,
        showIf: {
          questionId: 'entered_own_end',
          value: 'No',
          orValues: ['Sometimes', 'I do not know'],
        },
      },
      {
        id: 'timekeeping_changed',
        label: 'Did the way your time was kept change during this job?',
        type: 'select',
        options: [
          'No',
          'Yes, it changed over time',
          'Yes, it changed by workday or place',
          'Both',
          'I do not know',
        ],
      },
      {
        id: 'timekeeping_change_details',
        label: 'What changed, and about when?',
        type: 'textarea',
        helpText: 'Add one line for each real change.',
        showIf: {
          questionId: 'timekeeping_changed',
          value: 'Yes, it changed over time',
          orValues: ['Yes, it changed by workday or place', 'Both'],
        },
      },
      {
        id: 'records_altered',
        label: 'Did the employer ever change, alter, or delete your time records?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'I do not know'],
      },
      {
        id: 'alteration_details',
        label: 'What happened to your time records?',
        type: 'textarea',
        helpText: 'Include who changed them, what changed, and about when.',
        showIf: { questionId: 'records_altered', value: 'Yes', orValues: ['Sometimes'] },
      },
    ],
  },

  // ── H. Checking the start and end times ────────────────────────────────────
  {
    id: 'time_check',
    title: 'Checking the Start and End Times',
    questions: [
      {
        id: 'start_times_meaning',
        label: 'Were the start times you gave the times when you began your first work task?',
        type: 'select',
        options: [
          'Yes',
          'No, they were my clock-in times',
          'No, they were my schedule times',
          'No, they were when I arrived',
          'It was different by day',
          'I do not know',
        ],
      },
      {
        id: 'work_before_start',
        label: 'Did you do any work before the start times you gave?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'I do not know'],
      },
      {
        id: 'work_before_start_what',
        label: 'What work did you do before those start times?',
        type: 'textarea',
        placeholder: 'Please explain.',
        showIf: { questionId: 'work_before_start', value: 'Yes', orValues: ['Sometimes'] },
      },
      {
        id: 'work_before_start_minutes',
        label: 'On which days did you do that work, and about how many minutes on each day?',
        type: 'textarea',
        helpText: 'One line per day. Leave a day blank if it did not happen.',
        placeholder: WEEK_MINUTES_PLACEHOLDER,
        showIf: { questionId: 'work_before_start', value: 'Yes', orValues: ['Sometimes'] },
      },
      {
        id: 'end_times_meaning',
        label: 'Were the end times you gave the times when you finished your last work task?',
        type: 'select',
        options: [
          'Yes',
          'No, they were my clock-out times',
          'No, they were my schedule times',
          'No, they were when I left',
          'It was different by day',
          'I do not know',
        ],
      },
      {
        id: 'work_after_end',
        label: 'Did you do any work after the end times you gave?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'I do not know'],
      },
      {
        id: 'work_after_end_what',
        label: 'What did you do after those end times?',
        type: 'multiselect',
        options: [
          'Cleaned or closed',
          'Locked up or turned things off',
          'Counted money or closed a register',
          'Finished papers or messages',
          'Put away tools, keys, food, or supplies',
          'Waited for a boss to check the work',
          'Bag check or safety check',
          'Waited to leave with a group',
          'Helped a customer or coworker',
          'Drove or traveled for work',
          'Other',
          'I do not know',
        ],
        helpText: 'Choose everything that applied.',
        showIf: { questionId: 'work_after_end', value: 'Yes', orValues: ['Sometimes'] },
      },
      {
        id: 'work_after_end_minutes',
        label: 'On which days did you do that work, and about how many minutes on each day?',
        type: 'textarea',
        helpText: 'One line per day. Leave a day blank if it did not happen.',
        placeholder: WEEK_MINUTES_PLACEHOLDER,
        showIf: { questionId: 'work_after_end', value: 'Yes', orValues: ['Sometimes'] },
      },
      {
        id: 'split_shift',
        label: 'Did you leave work and come back, or work two separate shifts, on any day?',
        type: 'select',
        options: ['Yes', 'No', 'I do not know'],
      },
      {
        id: 'split_shift_details',
        label: 'Which day was it, and what were the start and end times for each work period?',
        type: 'textarea',
        helpText: 'Add one line for each day.',
        showIf: { questionId: 'split_shift', value: 'Yes' },
      },
    ],
  },

  // ── I. Final wages — former employees only ─────────────────────────────────
  {
    id: 'final_wages',
    title: 'Final Wages',
    showIf: { questionId: 'still_employed', value: 'no' },
    questions: [
      {
        id: 'employment_ended_how',
        label: 'How did your employment end?',
        type: 'select',
        options: ['Fired', 'Laid off', 'Quit', 'Forced to quit', 'Job or assignment ended', 'Other'],
      },
      {
        id: 'final_wages_on_last_day',
        label: 'Were your final wages paid on your last day of work?',
        type: 'select',
        options: ['Yes', 'No', 'I do not know'],
      },
      {
        id: 'final_wages_paid_when',
        label: 'When were your final wages paid?',
        type: 'text',
        helpText: 'A date, a best estimate, or "I have not received them".',
      },
      {
        id: 'wages_owed',
        label: 'Do you believe the employer still owes you unpaid wages?',
        type: 'select',
        options: ['Yes', 'No', 'I am not sure'],
      },
      {
        id: 'wages_owed_estimate',
        label: 'About how much do you believe is still owed?',
        type: 'text',
        helpText: 'A dollar amount, a best estimate, or "I do not know".',
        placeholder: 'approximately $3,500',
        showIf: { questionId: 'wages_owed', value: 'Yes', orValues: ['I am not sure'] },
      },
    ],
  },

  // ── J. Wrongful termination — former employees only ────────────────────────
  {
    id: 'wrongful_termination',
    title: 'Wrongful Termination',
    showIf: { questionId: 'still_employed', value: 'no' },
    questions: [
      {
        id: 'fired_or_forced',
        label: 'Were you fired or forced to quit?',
        type: 'select',
        options: ['Yes', 'No', 'I am not sure'],
      },
      {
        id: 'reason_given_for_termination',
        label: 'What reason did the employer give for ending your job?',
        type: 'text',
        helpText: '"No reason was given" is a fine answer.',
        showIf: { questionId: 'fired_or_forced', value: 'Yes', orValues: ['I am not sure'] },
      },
      {
        id: 'ended_unlawfully',
        label: 'Do you believe the employer ended your job for an unlawful reason?',
        type: 'select',
        options: ['Yes', 'No', 'I am not sure'],
        showIf: { questionId: 'fired_or_forced', value: 'Yes', orValues: ['I am not sure'] },
      },
      {
        id: 'wrongful_reason_belief',
        label: 'Why do you believe the reason was unlawful?',
        type: 'text',
        showIf: { questionId: 'ended_unlawfully', value: 'Yes' },
      },
      {
        id: 'wrongful_not_sure_details',
        label: 'If you are not sure, what facts make you question why your job ended?',
        type: 'text',
        showIf: { questionId: 'ended_unlawfully', value: 'I am not sure' },
      },
      {
        id: 'written_warnings',
        label: 'Did you receive any written warnings or write-ups before your job ended?',
        type: 'select',
        options: ['Yes', 'No', 'I do not know'],
        showIf: { questionId: 'fired_or_forced', value: 'Yes', orValues: ['I am not sure'] },
      },
    ],
  },
]

/**
 * Packet number to stored id, in packet order.
 *
 * This is the "documented stable equivalent" the packet allows in place of
 * Q001–Q077, and the crosswalk its acceptance checks ask for. It is exported so
 * a test can assert that every packet number has exactly one live question and
 * that the questionnaire is exactly 77 questions long — the file above cannot
 * drift from the packet without that test failing.
 */
export const MODULE_1_CROSSWALK: Record<string, string> = {
  Q001: 'full_name',
  Q002: 'used_other_name',
  Q003: 'other_names',
  Q004: 'dob',
  Q005: 'address',
  Q006: 'city_state_zip',
  Q007: 'contact_phones',
  Q008: 'email',
  Q009: 'preferred_language',
  Q010: 'employer_name',
  Q011: 'employer_address',
  Q012: 'employer_city_state',
  Q013: 'supervisor_name',
  Q014: 'supervisor_phone',
  Q015: 'hr_contact',
  Q016: 'industry',
  Q017: 'start_date_known',
  Q018: 'start_date',
  Q019: 'still_employed',
  Q020: 'end_date_known',
  Q021: 'end_date',
  Q022: 'job_type',
  Q023: 'job_title',
  Q024: 'job_duties',
  Q025: 'contractor_or_employee',
  Q026: 'contractor_wrong',
  Q027: 'called_exempt',
  Q028: 'pay_calculated',
  Q029: 'hourly_rate',
  Q030: 'salary_amount',
  Q031: 'other_pay_rates',
  Q032: 'pay_received_how',
  Q033: 'tips_received',
  Q034: 'pay_rate_changed',
  Q035: 'pay_change_notes',
  Q036: 'days_per_week_usual',
  Q037: 'hours_per_day',
  Q038: 'weekly_schedule',
  Q039: 'schedule_chosen_by',
  Q040: 'schedule_delivered_how',
  Q041: 'schedule_changed',
  Q042: 'schedule_change_asks',
  Q043: 'time_recorded_how',
  Q044: 'entered_own_start',
  Q045: 'start_entered_how',
  Q046: 'start_entered_where',
  Q047: 'timekeeping_system_name',
  Q048: 'start_entered_by_other',
  Q049: 'entered_own_end',
  Q050: 'end_entered_same_way',
  Q051: 'end_entered_differently',
  Q052: 'end_entered_by_other',
  Q053: 'timekeeping_changed',
  Q054: 'timekeeping_change_details',
  Q055: 'records_altered',
  Q056: 'alteration_details',
  Q057: 'start_times_meaning',
  Q058: 'work_before_start',
  Q059: 'work_before_start_what',
  Q060: 'work_before_start_minutes',
  Q061: 'end_times_meaning',
  Q062: 'work_after_end',
  Q063: 'work_after_end_what',
  Q064: 'work_after_end_minutes',
  Q065: 'split_shift',
  Q066: 'split_shift_details',
  Q067: 'employment_ended_how',
  Q068: 'final_wages_on_last_day',
  Q069: 'final_wages_paid_when',
  Q070: 'wages_owed',
  Q071: 'wages_owed_estimate',
  Q072: 'fired_or_forced',
  Q073: 'reason_given_for_termination',
  Q074: 'ended_unlawfully',
  Q075: 'wrongful_reason_belief',
  Q076: 'wrongful_not_sure_details',
  Q077: 'written_warnings',
}
