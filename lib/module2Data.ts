import { QuestionnaireSection } from '@/types'

/**
 * Module 2 of the intake questionnaire — wage and hour, 86 questions.
 *
 * Follows Module 1 and never repeats it. Everything Module 1 already
 * established — the employer, the dates, whether they still work there, the
 * job, the pay, the usual schedule, how time was recorded, what happened either
 * side of the recorded start and end — is read from the same answers record
 * rather than asked again, which is why Module 2 answers live in the same blob
 * under `m2_` ids. A gate here can name a Module 1 question directly.
 *
 * Scope: meal breaks, paid rest breaks, finding and sizing off-the-clock work,
 * overtime and double time, and retaliation for asking about any of it. Final
 * wages and wrongful termination stay in Module 1. The workplace who's-who and
 * the witness inventory are Module 3.
 *
 * ── Two shapes the portal did not have before ─────────────────────────────────
 * Section D is asked once per kind of unpaid work the worker named, not once.
 * `repeatFor` expands it before render (lib/repeatSections.ts), so each pattern
 * gets its own copy of every id and its own answers.
 *
 * A few questions take their choices from what the worker already picked rather
 * than from a list written here — `optionsFrom`. "Which kind happened most
 * often" can only offer the kinds this worker named.
 *
 * ── Identifiers ───────────────────────────────────────────────────────────────
 * The packet allows M2Q001–M2Q086 "or a documented stable equivalent with a
 * complete crosswalk". As in Module 1 the portal's own readable-id convention is
 * used, and MODULE_2_CROSSWALK at the foot of this file is the mapping. The
 * `m2_` prefix is what keeps these ids from ever colliding with Module 1's in
 * the shared answers record.
 */

/** Escapes that appear on nearly every date question in this module. */
const APPROX_DATE_HELP =
  'An exact date, your best guess, a month or season, or something that happened at work — "the week the new manager started" is a real answer. "Not sure" is fine.'

const APPROX_END_HELP =
  'An exact date, your best guess, "still happening", or something that happened at work. "Not sure" is fine.'

const DAYS_0_7 = ['0', '1', '2', '3', '4', '5', '6', '7', 'It changed', 'Not sure']

const MEAL_ASKED = { value: 'Every day', orValues: ['Some days', 'Not sure'] }

/** A meal answer that shows the break was worked through, cut short or watched. */
const MEAL_INTERRUPTED = [
  'A boss or worker asked me a question',
  'I helped a customer, patient, resident, or other person',
  'I answered a work phone, radio, text, alarm, or door',
  'I watched a counter, machine, work area, or people',
  'I signed for a delivery or did a quick task',
  'I had to stay ready in case work came up',
  'I kept working while I ate',
  'A boss told me to wait, skip the meal, or finish work first',
  'Work was too busy, or no one could cover for me',
  'Something else happened',
  'Not sure',
]

const REST_TAKEN = { value: '1', orValues: ['2', '3 or more', 'It changed', 'Not sure'] }

/** The five checklists that between them find unpaid work. */
const OFF_CLOCK_SOURCES = [
  'm2_before_clock_in',
  'm2_after_clock_out',
  'm2_away_from_job',
  'm2_unclocked_meetings',
  'm2_wait_and_travel',
]

const NOT_SURE_ONLY = ['Not sure']
const NONE_OR_NOT_SURE = ['None of these', 'Not sure']

export const MODULE_2_SECTIONS: QuestionnaireSection[] = [
  // ── A. Meal breaks ─────────────────────────────────────────────────────────
  {
    id: 'm2_meal_breaks',
    title: 'Meal Breaks',
    questions: [
      {
        id: 'm2_meal_given',
        label: 'On days you worked more than five hours, did you get a meal break?',
        type: 'select',
        options: ['Every day', 'Some days', 'No', 'My workdays were not over five hours', 'Not sure'],
      },
      {
        id: 'm2_meal_start_time',
        label: 'About what time did your first meal break usually start?',
        type: 'text',
        helpText: 'A time, or "it changed", or "I did not get a meal". "Not sure" is fine.',
        placeholder: 'around 12:30pm',
        showIf: { questionId: 'm2_meal_given', ...MEAL_ASKED },
      },
      {
        id: 'm2_meal_minutes_free',
        label: 'How many minutes passed before you had to do any work again?',
        type: 'select',
        options: [
          '30 minutes or more',
          '20-29 minutes',
          '10-19 minutes',
          'Less than 10 minutes',
          'No meal',
          'It changed',
          'Not sure',
        ],
        showIf: { questionId: 'm2_meal_given', ...MEAL_ASKED },
      },
      {
        id: 'm2_meal_where',
        label: 'Where did you usually eat your meal?',
        type: 'text',
        placeholder: 'For example: lunch room, desk, register, vehicle, or outside',
        showIf: { questionId: 'm2_meal_given', ...MEAL_ASKED },
      },
      {
        id: 'm2_meal_what_happened',
        label: 'During the meal, which of these happened?',
        type: 'multiselect',
        options: [
          'I did no work and did not have to stay ready',
          'I chose to work, but no one asked or expected me to',
          ...MEAL_INTERRUPTED,
        ],
        exclusiveOptions: NOT_SURE_ONLY,
        helpText: 'Choose everything that happened.',
        showIf: { questionId: 'm2_meal_given', ...MEAL_ASKED },
      },
      {
        id: 'm2_meal_could_leave',
        label: 'Could you leave the job site during the meal if you wanted to?',
        type: 'select',
        options: ['Yes', 'No', 'Only with permission', 'Not sure'],
        showIf: { questionId: 'm2_meal_given', ...MEAL_ASKED },
      },
      {
        id: 'm2_meal_redone',
        label: 'If work stopped your meal, did you later get a new, full 30-minute meal break?',
        type: 'select',
        options: ['Every time', 'Sometimes', 'Never', 'Not sure', 'This did not happen'],
        // Only worth asking of someone whose meal was actually interrupted.
        showIf: {
          questionId: 'm2_meal_what_happened',
          value: MEAL_INTERRUPTED[0],
          orValues: MEAL_INTERRUPTED.slice(1),
        },
      },
      {
        id: 'm2_meal_days_per_week',
        label:
          'In a normal week, on how many workdays did you miss a meal, start it late, get less than 30 minutes, work during it, or have to stay ready?',
        type: 'select',
        options: DAYS_0_7,
        showIf: {
          questionId: 'm2_meal_given',
          value: 'Every day',
          orValues: ['Some days', 'No', 'Not sure'],
        },
      },
      {
        id: 'm2_meal_problem_start',
        label: 'About when did the meal-break problem start?',
        type: 'text',
        helpText: APPROX_DATE_HELP,
        showIf: {
          questionId: 'm2_meal_days_per_week',
          value: '1',
          orValues: ['2', '3', '4', '5', '6', '7', 'It changed', 'Not sure'],
        },
      },
      {
        id: 'm2_meal_problem_end',
        label: 'About when did the meal-break problem stop, if it stopped?',
        type: 'text',
        helpText: APPROX_END_HELP,
        showIf: {
          questionId: 'm2_meal_days_per_week',
          value: '1',
          orValues: ['2', '3', '4', '5', '6', '7', 'It changed', 'Not sure'],
        },
      },
      {
        id: 'm2_second_meal_given',
        label: 'On days you worked more than 10 hours, did you get a second 30-minute meal break?',
        type: 'select',
        options: [
          'Every day',
          'Some days',
          'No',
          'I did not work more than 10 hours',
          'Not sure',
        ],
        // Asked unless the worker has already said their days did not even reach
        // five hours, which is the one earlier answer that rules ten out. Module
        // 1 records the usual day as free text ("about 9 hours", "it varied") and
        // Module 2's overtime answers come two sections later, so nothing else
        // can decide it — and a day that MIGHT have run past ten is a day this
        // has to be asked about. The last choice is the way out for everyone
        // else.
        showIf: {
          questionId: 'm2_meal_given',
          value: 'Every day',
          orValues: ['Some days', 'No', 'Not sure'],
        },
        helpText:
          'If your days were never longer than 10 hours, say so — the last choice is there for that.',
      },
      {
        id: 'm2_second_meal_time',
        label: 'About what time did the second meal usually start?',
        type: 'text',
        helpText: 'A time, or "it changed". "Not sure" is fine.',
        showIf: { questionId: 'm2_second_meal_given', value: 'Every day', orValues: ['Some days'] },
      },
      {
        id: 'm2_meal_waiver',
        label: 'Did you sign a paper saying you would skip a meal or work during it?',
        type: 'select',
        options: [
          'No',
          'Yes, to skip a meal',
          'Yes, to work while eating',
          'I signed something but do not know what it said',
          'Not sure',
        ],
        showIf: {
          questionId: 'm2_meal_given',
          value: 'Every day',
          orValues: ['Some days', 'No', 'Not sure'],
        },
      },
    ],
  },

  // ── B. Paid rest breaks ────────────────────────────────────────────────────
  {
    id: 'm2_rest_breaks',
    title: 'Paid Rest Breaks',
    questions: [
      {
        id: 'm2_rest_count',
        label: 'On a normal workday, how many paid 10-minute rest breaks did you get?',
        type: 'select',
        options: ['0', '1', '2', '3 or more', 'It changed', 'Not sure'],
        helpText: 'Module 1 has your usual hours per day — answer for a day of that length.',
      },
      {
        id: 'm2_rest_full_ten',
        label: 'Did each rest break last a full 10 minutes?',
        type: 'select',
        options: ['Every break', 'Some breaks', 'No', 'Not sure'],
        showIf: { questionId: 'm2_rest_count', ...REST_TAKEN },
      },
      {
        id: 'm2_rest_what_happened',
        label: 'During a rest break, which of these happened?',
        type: 'multiselect',
        options: [
          'I did no work and used the time for myself',
          'I had to clock out',
          'I answered a question or helped a supervisor, coworker, customer, or vendor',
          'I answered a work phone, radio, text, alarm, or door',
          'I watched a counter, machine, area, or people',
          'I had to stay ready in case work came up',
          'I had to ask before taking the break',
          'I was told to wait or was told no',
          'Work was too busy, or no one could cover',
          'The break was added to lunch or put at the start or end of the shift',
          'A bathroom trip was counted as my rest break',
          'Something else happened',
          'Not sure',
        ],
        exclusiveOptions: NOT_SURE_ONLY,
        helpText: 'Choose everything that happened.',
        showIf: { questionId: 'm2_rest_count', ...REST_TAKEN },
      },
      {
        id: 'm2_rest_phone',
        label: 'Could you use your personal phone during a rest break?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'Not sure'],
        showIf: { questionId: 'm2_rest_count', ...REST_TAKEN },
      },
      {
        id: 'm2_rest_leave_site',
        label: 'Could you leave the work site during a rest break?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'Not sure'],
        showIf: { questionId: 'm2_rest_count', ...REST_TAKEN },
      },
      {
        id: 'm2_rest_eat_drink',
        label: 'Could you eat or drink during a rest break?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'Not sure'],
        showIf: { questionId: 'm2_rest_count', ...REST_TAKEN },
      },
      {
        id: 'm2_rest_days_per_week',
        label: 'In a normal week, on how many workdays did you miss a rest break or lose part of one?',
        type: 'select',
        options: DAYS_0_7,
      },
      {
        id: 'm2_rest_problem_start',
        label: 'About when did the rest-break problem start?',
        type: 'text',
        helpText: APPROX_DATE_HELP,
        showIf: {
          questionId: 'm2_rest_days_per_week',
          value: '1',
          orValues: ['2', '3', '4', '5', '6', '7', 'It changed', 'Not sure'],
        },
      },
      {
        id: 'm2_rest_problem_end',
        label: 'About when did the rest-break problem stop, if it stopped?',
        type: 'text',
        helpText: APPROX_END_HELP,
        showIf: {
          questionId: 'm2_rest_days_per_week',
          value: '1',
          orValues: ['2', '3', '4', '5', '6', '7', 'It changed', 'Not sure'],
        },
      },
    ],
  },

  // ── C. Find the off-the-clock work ─────────────────────────────────────────
  {
    id: 'm2_find_off_clock',
    title: 'Work You Were Not Paid For',
    questions: [
      {
        id: 'm2_worked_off_clock',
        label: 'Did you ever do any work when you were not clocked in?',
        type: 'select',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        helpText:
          'Whatever you answer, the next questions still ask about particular things. Some of them may not have felt like work at the time.',
      },
      {
        id: 'm2_before_clock_in',
        label: 'Before you clocked in, did you ever do any of these things?',
        type: 'multiselect',
        options: [
          'Opened a door or gate',
          'Turned off an alarm or turned on lights',
          'Got keys, tools, food, papers, or supplies',
          'Started a computer, register, machine, or work vehicle',
          'Put on required work clothes or safety gear',
          'Set up, stocked, cleaned, or prepared something',
          'Read work notes, messages, or assignments',
          'Joined a meeting or talked about the shift',
          'Helped a customer or another worker',
          'Waited for a boss, keys, equipment, or the clock',
          'Something else',
          'None of these',
          'Not sure',
        ],
        exclusiveOptions: NONE_OR_NOT_SURE,
        helpText: 'Choose everything you did.',
      },
      {
        id: 'm2_after_clock_out',
        label: 'After you clocked out, did you ever do any of these things?',
        type: 'multiselect',
        options: [
          'Cleaned or stocked',
          'Closed or locked a door or gate',
          'Turned off lights or set an alarm',
          'Shut down a computer, register, machine, or vehicle',
          'Counted money, tips, or products',
          'Finished notes, reports, or other papers',
          'Gave information to the next shift',
          'Helped a customer, boss, or worker',
          'Waited for a bag check or security check',
          'Waited for someone to let you leave',
          'Something else',
          'None of these',
          'Not sure',
        ],
        exclusiveOptions: NONE_OR_NOT_SURE,
        helpText: 'Choose everything you did.',
      },
      {
        id: 'm2_away_from_job',
        label:
          'Away from the job, did you ever do any of these things without adding the time to your work record?',
        type: 'multiselect',
        options: [
          'Answered a work call',
          'Read or answered a work text',
          'Read or answered an email or app message',
          'Checked a schedule, route, or assignment',
          'Filled out papers or reports',
          'Sent photos or work information',
          'Helped a customer or worker',
          'Did online training',
          'Used your own phone or computer for work',
          'Something else',
          'None of these',
          'Not sure',
        ],
        exclusiveOptions: NONE_OR_NOT_SURE,
        helpText: 'Choose everything you did.',
      },
      {
        id: 'm2_unclocked_meetings',
        label: 'Did you ever attend any of these while you were not clocked in?',
        type: 'multiselect',
        options: [
          'Staff meeting',
          'Shift meeting',
          'Safety talk',
          'Training',
          'Orientation',
          'Review or write-up meeting',
          'Talk with the last or next shift',
          'Something else',
          'None of these',
          'Not sure',
        ],
        exclusiveOptions: NONE_OR_NOT_SURE,
        helpText: 'Choose everything you attended.',
      },
      {
        id: 'm2_wait_and_travel',
        label:
          'After you reached the place where the company told you to report, did you have to wait, walk, ride, or drive before you could clock in?',
        type: 'multiselect',
        options: [
          'Waited at a gate or security check',
          'Waited for a boss or lead worker',
          'Waited for keys, tools, a vehicle, or equipment',
          'Rode in a required company bus or van',
          'Drove or walked from one company area to another',
          'Waited for a customer, load, route, or assignment',
          'Something else',
          'No',
          'Not sure',
        ],
        exclusiveOptions: ['No', 'Not sure'],
        helpText:
          'Do not count the normal trip from home to the first place the company told you to report.',
      },
      {
        id: 'm2_most_frequent_pattern',
        label: 'Which kind of unpaid work happened most often?',
        type: 'select',
        optionsFrom: OFF_CLOCK_SOURCES,
        helpText: 'These are the things you just picked. Choose the one that happened most.',
      },
      {
        id: 'm2_another_pattern',
        label: 'Did another kind of unpaid work also happen often?',
        type: 'select',
        options: ['Yes', 'No', 'Not sure'],
        showIf: { questionId: 'm2_most_frequent_pattern', answered: true },
      },
      {
        id: 'm2_other_frequent_patterns',
        label: 'Which other kind of unpaid work also happened often?',
        type: 'multiselect',
        optionsFrom: OFF_CLOCK_SOURCES,
        helpText: 'Choose every other one that happened often.',
        showIf: { questionId: 'm2_another_pattern', value: 'Yes' },
      },
    ],
  },

  // ── D. One copy per kind of unpaid work ────────────────────────────────────
  {
    id: 'm2_pattern',
    title: 'About This Unpaid Work',
    repeatFor: {
      fromQuestionIds: ['m2_most_frequent_pattern', 'm2_other_frequent_patterns'],
      titleTemplate: 'Unpaid Work — {instance}',
    },
    questions: [
      {
        id: 'm2_p_what',
        label: 'What exactly did you do when this unpaid work happened?',
        type: 'textarea',
      },
      {
        id: 'm2_p_who_asked',
        label: 'Who asked you to do this work or made the rule?',
        type: 'select',
        options: [
          'Owner',
          'Boss or manager',
          'Lead worker',
          'Customer or client',
          'Company rule or system',
          'No one directly asked',
          'Someone else',
          'Not sure',
        ],
      },
      {
        id: 'm2_p_why_did_it',
        label: 'If no one directly asked you, why did you do the work?',
        type: 'multiselect',
        options: [
          'The job could not start without it',
          'The job could not close without it',
          'The work had to be finished',
          'A customer was waiting',
          'The next shift needed it',
          'There was no one else to do it',
          'I thought I would get in trouble if I did not do it',
          'Everyone did it this way',
          'I wanted to help, but no one expected it',
          'It was my own choice',
          'Something else',
          'Not sure',
        ],
        exclusiveOptions: NOT_SURE_ONLY,
        showIf: {
          questionId: 'm2_p_who_asked',
          value: 'No one directly asked',
          orValues: ['Someone else', 'Not sure'],
        },
      },
      {
        id: 'm2_p_if_not_done',
        label: 'What would most likely happen if you did not do it?',
        type: 'select',
        options: [
          'Nothing',
          'The job would not be ready',
          'The work would be left unfinished',
          'A customer would complain',
          'A boss would be upset',
          'I might be written up',
          'My hours or shifts might be cut',
          'The next shift would have a problem',
          'Something else',
          'Not sure',
        ],
      },
      {
        id: 'm2_p_could_wait',
        label: 'Could you wait and do the task after you clocked in or before you clocked out?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'Not sure'],
      },
      {
        id: 'm2_p_free_during_wait',
        label: 'If this involved waiting or travel, could you leave or use the time for yourself?',
        type: 'select',
        options: ['Yes', 'No', 'Only partly', 'Not sure'],
      },
      {
        id: 'm2_p_who_knew',
        label: 'Who knew you were doing this work?',
        type: 'multiselect',
        options: [
          'Owner',
          'Manager',
          'Lead worker',
          'Payroll or office worker',
          'Coworker',
          'Customer or client',
          'No one that I know of',
          'Someone else',
          'Not sure',
        ],
        exclusiveOptions: ['No one that I know of', 'Not sure'],
      },
      {
        id: 'm2_p_how_they_knew',
        label: 'How did that person know?',
        type: 'multiselect',
        options: [
          'Saw me doing it',
          'Told me to do it',
          'I told the person',
          'Got my call, text, email, or report',
          'Used the work after I finished it',
          'Knew the opening or closing work had to be done',
          'Saw a camera, computer, gate, GPS, sales, or alarm record',
          'Saw it happen many times',
          'Something else',
          'Not sure',
        ],
        exclusiveOptions: NOT_SURE_ONLY,
        showIf: {
          questionId: 'm2_p_who_knew',
          value: 'Owner',
          orValues: ['Manager', 'Lead worker', 'Payroll or office worker', 'Coworker', 'Customer or client', 'Someone else'],
        },
      },
      {
        id: 'm2_p_records',
        label: 'What records may show this work?',
        type: 'multiselect',
        options: [
          'Time record',
          'Schedule',
          'Text or group chat',
          'Call log or voicemail',
          'Email',
          'Work app',
          'Computer login',
          'Register or sales record',
          'Alarm, door, badge, or gate record',
          'Camera video',
          'GPS or vehicle record',
          'Customer, delivery, or job record',
          'Photo or video',
          'Personal notes or calendar',
          'Pay stub or bank record',
          'Another record',
          'None that I know of',
          'Not sure',
        ],
        exclusiveOptions: ['None that I know of', 'Not sure'],
      },
      {
        id: 'm2_p_could_clock_in_first',
        label: 'Could you clock in before you started this work?',
        type: 'select',
        options: ['Always', 'Sometimes', 'No', 'Not sure', 'This does not apply'],
      },
      {
        id: 'm2_p_why_not_clock_in',
        label: 'Why did you not clock in first?',
        type: 'multiselect',
        options: [
          'The system blocked an early clock-in',
          'The clock was not near the first task',
          'I could not reach the clock until after the task',
          'A boss had to approve it',
          'Early clock-ins were not allowed',
          'I was told to wait until my shift time',
          'Extra time or overtime needed approval',
          'The clock or app did not work',
          'I forgot',
          'I chose not to',
          'Something else',
          'Not sure',
        ],
        exclusiveOptions: NOT_SURE_ONLY,
        showIf: {
          questionId: 'm2_p_could_clock_in_first',
          value: 'Sometimes',
          orValues: ['No', 'Not sure'],
        },
      },
      {
        id: 'm2_p_could_stay_clocked_in',
        label: 'Could you stay clocked in until every work task was done?',
        type: 'select',
        options: ['Always', 'Sometimes', 'No', 'Not sure', 'This does not apply'],
      },
      {
        id: 'm2_p_why_clocked_out_early',
        label: 'Why did you clock out before all the work was done?',
        type: 'multiselect',
        options: [
          'A boss told me to clock out',
          'The system clocked me out',
          'I had to clock out at the set end time',
          'Extra time or overtime was not allowed',
          'I felt pressure to clock out',
          'The register, tips, or work system had to close first',
          'The time clock was far from the last task',
          'I forgot',
          'I chose to',
          'Something else',
          'Not sure',
        ],
        exclusiveOptions: NOT_SURE_ONLY,
        showIf: {
          questionId: 'm2_p_could_stay_clocked_in',
          value: 'Sometimes',
          orValues: ['No', 'Not sure'],
        },
      },
      {
        id: 'm2_p_rule_against',
        label: 'Did the company say that workers should not work while clocked out?',
        type: 'select',
        options: ['Yes', 'No', 'Not sure'],
      },
      {
        id: 'm2_p_boss_allowed_anyway',
        label: 'Even with that rule, did a boss still see, ask for, allow, or use the work?',
        type: 'select',
        options: ['Yes', 'No', 'Maybe', 'Not sure'],
        showIf: { questionId: 'm2_p_rule_against', value: 'Yes' },
      },
      {
        id: 'm2_p_told_anyone',
        label: 'Did you ever tell anyone this time was missing or ask to be paid?',
        type: 'select',
        options: ['Yes', 'No', 'Not sure'],
      },
      {
        id: 'm2_p_told_who',
        label: 'Who did you tell?',
        type: 'text',
        helpText: 'A name, a first name, a job title, a nickname, or a clear description.',
        showIf: { questionId: 'm2_p_told_anyone', value: 'Yes' },
      },
      {
        id: 'm2_p_told_when',
        label: 'About when did you tell that person?',
        type: 'text',
        helpText: APPROX_DATE_HELP,
        showIf: { questionId: 'm2_p_told_anyone', value: 'Yes' },
      },
      {
        id: 'm2_p_told_how',
        label: 'How did you tell that person?',
        type: 'select',
        options: [
          'In person',
          'Phone call',
          'Text',
          'Email',
          'Group chat',
          'Written complaint',
          'Government claim',
          'Other',
          'Not sure',
        ],
        showIf: { questionId: 'm2_p_told_anyone', value: 'Yes' },
      },
      {
        id: 'm2_p_told_what_said',
        label: 'What did you say?',
        type: 'textarea',
        helpText: 'Your own words, as close as you remember them.',
        showIf: { questionId: 'm2_p_told_anyone', value: 'Yes' },
      },
      {
        id: 'm2_p_told_result',
        label: 'What happened after you told that person?',
        type: 'textarea',
        showIf: { questionId: 'm2_p_told_anyone', value: 'Yes' },
      },
      {
        id: 'm2_p_started',
        label: 'About when did this unpaid work start happening?',
        type: 'text',
        helpText: APPROX_DATE_HELP,
      },
      {
        id: 'm2_p_stopped',
        label: 'About when did it stop happening, if it stopped?',
        type: 'text',
        helpText: APPROX_END_HELP,
      },
      {
        id: 'm2_p_days_per_week',
        label: 'During a normal week, on how many days did this happen?',
        type: 'number_range',
        helpText:
          'Your best guess is enough on its own. If you can, add the smallest and largest numbers that would still seem right.',
      },
      {
        id: 'm2_p_minutes_per_day',
        label: 'On a day when it happened, about how many unpaid minutes did it take?',
        type: 'number_range',
        helpText:
          'Your best guess is enough on its own. If you can, add the smallest and largest numbers that would still seem right.',
      },
      {
        id: 'm2_p_how_sure',
        label: 'How sure are you about the number of unpaid minutes?',
        type: 'select',
        options: ['Exact', 'Close guess', 'Wide range', 'Not sure'],
      },
      {
        id: 'm2_p_pattern_changed',
        label:
          'Did this pattern change because of a different boss, job, work place, schedule, rule, holiday, or other event?',
        type: 'select',
        options: ['Yes', 'No', 'Not sure'],
      },
      {
        id: 'm2_p_what_changed',
        label: 'What changed, and about when did it change?',
        type: 'textarea',
        helpText: 'One line for each big change, with about when it happened.',
        showIf: { questionId: 'm2_p_pattern_changed', value: 'Yes', orValues: ['Not sure'] },
      },
    ],
  },

  // ── E. Overtime ────────────────────────────────────────────────────────────
  {
    id: 'm2_overtime',
    title: 'Overtime',
    questions: [
      {
        id: 'm2_over_8_hours',
        label:
          'Counting all your work, even when the clock was off, how often did you work more than eight hours in one day?',
        type: 'select',
        options: ['Never', '1-2 days in a normal week', '3-4 days', '5 or more days', 'It changed', 'Not sure'],
      },
      {
        id: 'm2_over_12_hours',
        label: 'How often did you work more than 12 hours in one day?',
        type: 'select',
        options: [
          'Never',
          'Less than once a month',
          'A few times a month',
          'A few times a week',
          'It changed',
          'Not sure',
        ],
      },
      {
        id: 'm2_over_40_hours',
        label: 'How often did you work more than 40 hours in one week?',
        type: 'select',
        options: [
          'Never',
          'Less than once a month',
          '1-2 weeks in a normal month',
          '3-4 weeks',
          'It changed',
          'Not sure',
        ],
      },
      {
        id: 'm2_seven_days_running',
        label: 'Did you ever work seven days in a row?',
        type: 'select',
        options: ['No', 'Yes, once or twice', 'Yes, many times', 'Not sure'],
      },
      {
        id: 'm2_all_hours_on_stub',
        label: 'Were all the hours you worked shown on your pay stub or pay record?',
        type: 'select',
        options: ['Every time', 'Sometimes', 'No', 'I did not get a pay record', 'Not sure'],
      },
      {
        id: 'm2_overtime_on_stub',
        label:
          'For hours over eight in one day or over 40 in one week, did the pay record show overtime pay for every extra hour?',
        type: 'select',
        options: ['Every time', 'Sometimes', 'No', 'I did not get a pay record', 'Not sure'],
        // Asked unless both the daily and the weekly answer were Never.
        // Asked unless the worker never went over eight in a day AND never over
        // forty in a week; one of the two is enough.
        showIf: {
          questionId: 'm2_over_8_hours',
          value: '1-2 days in a normal week',
          orValues: ['3-4 days', '5 or more days', 'It changed', 'Not sure'],
          or: {
            questionId: 'm2_over_40_hours',
            value: 'Less than once a month',
            orValues: ['1-2 weeks in a normal month', '3-4 weeks', 'It changed', 'Not sure'],
          },
        },
      },
      {
        id: 'm2_ever_paid_overtime',
        label: 'Did you ever receive overtime pay?',
        type: 'select',
        options: ['Yes', 'No', 'Sometimes', 'Not sure'],
        // Asked unless the worker never went over eight in a day AND never over
        // forty in a week; one of the two is enough.
        showIf: {
          questionId: 'm2_over_8_hours',
          value: '1-2 days in a normal week',
          orValues: ['3-4 days', '5 or more days', 'It changed', 'Not sure'],
          or: {
            questionId: 'm2_over_40_hours',
            value: 'Less than once a month',
            orValues: ['1-2 weeks in a normal month', '3-4 weeks', 'It changed', 'Not sure'],
          },
        },
      },
      {
        id: 'm2_double_time_on_stub',
        label:
          'For hours over 12 in one day, did the pay record show double time — twice your normal rate — for every hour over 12?',
        type: 'select',
        options: ['Every time', 'Sometimes', 'No', 'I did not get a pay record', 'Not sure'],
        showIf: {
          questionId: 'm2_over_12_hours',
          value: 'Less than once a month',
          orValues: ['A few times a month', 'A few times a week', 'It changed', 'Not sure'],
        },
      },
      {
        id: 'm2_union_or_alt_schedule',
        label: 'Did a union contract or a written four-day, 10-hour work plan cover this job?',
        type: 'select',
        options: ['No', 'Union contract', 'Written four-day, 10-hour plan', 'Both', 'Maybe', 'Not sure'],
      },
    ],
  },

  // ── F. Retaliation after asking about pay or breaks ────────────────────────
  {
    id: 'm2_retaliation',
    title: 'After You Asked About Pay or Breaks',
    questions: [
      {
        id: 'm2_spoke_up',
        label: 'Did you ever do any of these things?',
        type: 'multiselect',
        options: [
          'I asked for missing pay',
          'I asked about overtime pay',
          'I said my time record was wrong',
          'I asked for a full meal or rest break',
          'I said a break was missed, late, short, or stopped',
          'I refused to work without pay',
          'I helped another worker speak up',
          'I filed or said I might file a claim',
          'None of these',
          'Not sure',
        ],
        exclusiveOptions: NONE_OR_NOT_SURE,
        helpText: 'Choose everything you did.',
      },
      {
        id: 'm2_spoke_up_what',
        label: 'What did you say or ask?',
        type: 'textarea',
        helpText: 'Your own words, as close as you remember them.',
        showIf: {
          questionId: 'm2_spoke_up',
          value: 'I asked for missing pay',
          orValues: [
            'I asked about overtime pay',
            'I said my time record was wrong',
            'I asked for a full meal or rest break',
            'I said a break was missed, late, short, or stopped',
            'I refused to work without pay',
            'I helped another worker speak up',
            'I filed or said I might file a claim',
          ],
        },
      },
      {
        id: 'm2_spoke_up_who_heard',
        label: 'Who heard you or got your message?',
        type: 'text',
        helpText: 'A name, a first name, a job title, a nickname, or a clear description.',
        showIf: { questionId: 'm2_spoke_up_what', answered: true },
      },
      {
        id: 'm2_spoke_up_when',
        label: 'About when did you say it?',
        type: 'text',
        helpText: APPROX_DATE_HELP,
        showIf: { questionId: 'm2_spoke_up_what', answered: true },
      },
      {
        id: 'm2_spoke_up_how',
        label: 'How did you say it?',
        type: 'select',
        options: [
          'In person',
          'Phone call',
          'Text',
          'Email',
          'Group chat',
          'Written complaint',
          'Government claim',
          'Other',
          'Not sure',
        ],
        showIf: { questionId: 'm2_spoke_up_what', answered: true },
      },
      {
        id: 'm2_company_immediate_response',
        label: 'What did the company do right after you spoke up?',
        type: 'select',
        options: [
          'Fixed the problem',
          'Said it would check',
          'Did nothing',
          'Said I was wrong',
          'Argued with me',
          'Warned or threatened me',
          'Something else',
          'Not sure',
        ],
        showIf: { questionId: 'm2_spoke_up_what', answered: true },
      },
      {
        id: 'm2_what_changed_after',
        label: 'After you spoke up, what changed at work?',
        type: 'select',
        options: [
          'Nothing changed',
          'Something got better',
          'Something got worse',
          'Some things got better and some got worse',
          'Not sure',
        ],
        showIf: { questionId: 'm2_spoke_up_what', answered: true },
      },
      {
        id: 'm2_what_got_worse',
        label: 'What got worse after you spoke up?',
        type: 'multiselect',
        options: [
          'I was fired or laid off',
          'My hours were cut',
          'My pay was cut',
          'I got worse days or shifts',
          'I got harder or worse work',
          'I was written up or disciplined',
          'I was suspended',
          'I was moved to a lower job',
          'I was transferred',
          'I lost a promotion, leave, or other chance',
          'I was watched more closely',
          'I was left out or treated badly',
          'I was threatened',
          'Someone used my immigration status against me',
          'I felt forced to quit',
          'Something else happened',
          'Nothing got worse',
          'Not sure',
        ],
        exclusiveOptions: ['Nothing got worse', 'Not sure'],
        showIf: {
          questionId: 'm2_what_changed_after',
          value: 'Something got worse',
          orValues: ['Some things got better and some got worse', 'Not sure'],
        },
      },
      {
        id: 'm2_first_bad_thing',
        label: 'What was the first bad thing that happened after you spoke up?',
        type: 'select',
        optionsFrom: ['m2_what_got_worse'],
        helpText: 'These are the things you just picked. Choose the one that happened first.',
      },
      {
        id: 'm2_first_bad_when',
        label: 'About when did that happen?',
        type: 'text',
        helpText: APPROX_DATE_HELP,
        showIf: { questionId: 'm2_first_bad_thing', answered: true },
      },
      {
        id: 'm2_who_decided',
        label: 'Who made or approved that choice?',
        type: 'text',
        helpText: 'A name, a job title, a nickname, or a clear description.',
        showIf: { questionId: 'm2_first_bad_thing', answered: true },
      },
      {
        id: 'm2_decider_knew',
        label: 'Did that person know you had spoken up about your pay or breaks?',
        type: 'select',
        options: ['Yes', 'No', 'Maybe', 'Not sure'],
        showIf: { questionId: 'm2_first_bad_thing', answered: true },
      },
      {
        id: 'm2_how_you_know_they_knew',
        label: 'How do you know that person knew?',
        type: 'textarea',
        showIf: { questionId: 'm2_decider_knew', value: 'Yes', orValues: ['Maybe'] },
      },
      {
        id: 'm2_company_reason',
        label: 'What reason did the company give for what it did?',
        type: 'text',
        helpText: '"No reason was given" is a real answer. So is "not sure".',
        showIf: { questionId: 'm2_first_bad_thing', answered: true },
      },
      {
        id: 'm2_reason_given_before',
        label: 'Had the company given you that reason before you spoke up?',
        type: 'select',
        options: ['Yes', 'No', 'Not sure'],
        showIf: { questionId: 'm2_first_bad_thing', answered: true },
      },
      {
        id: 'm2_anyone_linked_it',
        label: 'Did anyone say or write that the bad action happened because you spoke up?',
        type: 'select',
        options: ['Yes', 'No', 'Maybe', 'Not sure'],
        showIf: { questionId: 'm2_first_bad_thing', answered: true },
      },
      {
        id: 'm2_what_was_said',
        label: 'What exactly was said or written?',
        type: 'textarea',
        showIf: { questionId: 'm2_anyone_linked_it', value: 'Yes', orValues: ['Maybe'] },
      },
      {
        id: 'm2_retaliation_records',
        label: 'What records may help show what happened?',
        type: 'multiselect',
        options: [
          'Text',
          'Email',
          'Group chat',
          'Pay record',
          'Time record',
          'Schedule',
          'Write-up',
          'Warning',
          'Job-ending paper',
          'Photo or video',
          'Other',
          'None yet',
          'Not sure',
        ],
        exclusiveOptions: ['None yet', 'Not sure'],
        showIf: { questionId: 'm2_first_bad_thing', answered: true },
      },
    ],
  },
]
