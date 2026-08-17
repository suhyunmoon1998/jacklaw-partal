/**
 * Suggested follow-up questions, grouped by the case type on a client's file.
 *
 * These are a starting point for building a question set, not a questionnaire in
 * their own right — an admin picks the ones they want and edits freely. They
 * deliberately go past the default onboarding intake (lib/questionnaireData.ts)
 * rather than repeating it: the firm sends these once they have read the intake
 * and want specifics.
 *
 * caseType matches the values on clients.case_type. 'Any' banks are offered for
 * every client regardless of case type.
 */

import { Question } from '@/types'

export interface RecommendedBank {
  key: string
  /** A clients.case_type value, or 'Any' for banks that suit every case. */
  caseType: string
  /** Suggested name for the set, as the firm's staff would say it. */
  setName: string
  /** Staff-only note on when to send this set. */
  description: string
  questions: Question[]
}

export const RECOMMENDED_BANKS: RecommendedBank[] = [
  {
    key: 'wage_hour',
    caseType: 'Wage & Hour',
    setName: 'Wage & Hour Follow-Up',
    description:
      'Send after a wage claim intake — reconstructs actual hours worked, off-the-clock time, who controlled breaks, rounding and auto-deduct practices, the client\'s own records, and the payroll system to preserve before access is lost.',
    questions: [
      {
        id: 'wh_week_actual_times',
        label: 'Think of one normal week at this job. Day by day, what time did you actually start working and what time did you actually stop?',
        type: 'textarea',
        required: true,
        helpText: 'We already have your official schedule. Here we want the real times, even where they differ from it. Example: Mon 7:45am to 6:15pm, Tue 8:00am to 5:30pm, Wed off.',
      },
      {
        id: 'wh_offclock_any',
        label: 'Did you ever do work at times when you were not clocked in?',
        type: 'yes_no',
        required: true,
        helpText: 'If a manager wrote down your hours, or nobody tracked them, answer for any work that was not counted in your hours.',
      },
      {
        id: 'wh_offclock_types',
        label: 'When did that happen? (Select all that apply)',
        type: 'multiselect',
        options: [
          'Before my shift — changing into a uniform, setting up, loading, or waiting to be let in',
          'After my shift — cleaning, closing, counting money, paperwork, or waiting for a bag or car check',
          'During a meal or rest break',
          'Meetings, training, or orientation',
          'Traveling between job sites during the workday',
          'Work calls, texts, or emails outside my shift',
          'Taking work home',
          'Other'
        ],
        showIf: { questionId: 'wh_offclock_any', value: 'yes' },
      },
      {
        id: 'wh_offclock_details',
        label: 'For each one you checked, what did you do and about how many minutes did it take on a normal day?',
        type: 'textarea',
        helpText: 'Example: "Set up my station before clocking in, about 20 minutes every morning. Answered the manager\'s texts at night, about 10 minutes."',
        showIf: { questionId: 'wh_offclock_any', value: 'yes' },
      },
      {
        id: 'wh_break_instructions',
        label: 'Who at work told you how meal and rest breaks worked, and what did they tell you?',
        type: 'textarea',
        helpText: 'Include their name and job title if you remember, and their exact words as best you can recall.',
      },
      {
        id: 'wh_break_rules_written',
        label: 'Where were the break rules written down, if anywhere? (Select all that apply)',
        type: 'multiselect',
        options: [
          'An employee handbook',
          'A sign posted at work',
          'A message or notice in a work app',
          'A form or policy I signed',
          'An email or letter',
          'Nowhere that I know of',
          'Not sure'
        ],
      },
      {
        id: 'wh_meal_break_restrictions',
        label: 'During your meal break, which of these were true? (Select all that apply)',
        type: 'multiselect',
        options: [
          'I had to stay on the property or job site',
          'I had to keep a radio, phone, or pager on',
          'I had to keep watching or covering my station',
          'I was expected to be available if someone needed me',
          'I ate at my desk, station, or vehicle',
          'None of these — I was free to leave and do what I wanted'
        ],
      },
      {
        id: 'wh_auto_meal_deduction',
        label: 'Was a lunch break subtracted from your hours automatically, even on days you did not take one?',
        type: 'yes_no_unsure',
        helpText: 'For example, 30 minutes came off your total every shift without you clocking out.',
      },
      {
        id: 'wh_time_rounding',
        label: 'As far as you could see, were your start and stop times recorded as round numbers instead of the exact minute?',
        type: 'yes_no_unsure',
        helpText: 'For example, you clocked in at 7:52 but your record showed 8:00.',
      },
      {
        id: 'wh_told_to_underreport',
        label: 'Did anyone ever tell you to write down or clock fewer hours than you actually worked?',
        type: 'yes_no',
        helpText: 'For example, being told to clock out and keep working, or to keep your hours under 40.',
      },
      {
        id: 'wh_told_to_underreport_details',
        label: 'Who told you, what was their job title, roughly when did this happen, and what exactly did they say?',
        type: 'textarea',
        helpText: 'If it happened more than once, describe each time you remember.',
        showIf: { questionId: 'wh_told_to_underreport', value: 'yes' },
      },
      {
        id: 'wh_kept_own_records',
        label: 'Did you keep your own record of the hours you worked?',
        type: 'yes_no',
        required: true,
        helpText: 'Something you made yourself — a notebook, notes or photos on your phone, marks on a calendar, or your own copies of timesheets.',
      },
      {
        id: 'wh_own_records_details',
        label: 'What kind of record did you keep, what dates does it cover, and do you still have it?',
        type: 'textarea',
        showIf: { questionId: 'wh_kept_own_records', value: 'yes' },
      },
      {
        id: 'wh_payroll_system_name',
        label: 'What was the name of the time clock, app, or website your employer used for your hours and paychecks?',
        type: 'text',
        helpText: 'For example ADP, Paychex, Kronos, Workday, Homebase, or 7shifts. Write "not sure" if you do not remember.',
      },
      {
        id: 'wh_payroll_system_access',
        label: 'Can you still log in to that app or website?',
        type: 'select',
        options: [
          'Yes, I can still log in',
          'No, I cannot log in anymore',
          'I never had a login',
          'Not sure'
        ],
        helpText: 'If you can still log in, please do not change anything — just tell us, and we will let you know what to save.',
      },
      {
        id: 'wh_pay_schedule',
        label: 'How often were you paid?',
        type: 'select',
        options: [
          'Every week',
          'Every two weeks',
          'Twice a month',
          'Once a month',
          'It varied — no regular schedule',
          'Not sure'
        ],
      },
      {
        id: 'wh_asked_about_pay',
        label: 'Did you ever ask a manager, supervisor, or the office about a paycheck, your hours, or your breaks?',
        type: 'yes_no',
        helpText: 'Even a casual conversation counts. You do not need to have made a formal complaint.',
      },
      {
        id: 'wh_asked_about_pay_response',
        label: 'Who did you ask, roughly when, how did you ask (in person, text, email), and what did they tell you about the pay or hours?',
        type: 'textarea',
        helpText: 'If you asked more than once, list each time you remember.',
        showIf: { questionId: 'wh_asked_about_pay', value: 'yes' },
      },
    ],
  },
  {
    key: 'wrongful_termination',
    caseType: 'Wrongful Termination',
    setName: 'Termination Details',
    description:
      'Send after intake to a client who was fired or pushed out — pins down how the firing happened, who said what, the reasons given verbally vs in writing, and any papers they were asked to sign.',
    questions: [
      {
        id: 'wt_told_date',
        label: 'What date were you told your job was ending?',
        type: 'date',
        helpText: 'Your best guess is fine. If that was a different day than your last day at work, use the day you were told.',
      },
      {
        id: 'wt_told_by',
        label: 'Who told you? Write their name and job title.',
        type: 'text',
        required: true,
        helpText: 'If more than one person spoke, name the one who did most of the talking.',
      },
      {
        id: 'wt_how_told',
        label: 'How were you told?',
        type: 'select',
        options: [
          'In person',
          'Phone call',
          'Video call',
          'Text message',
          'Email',
          'Letter or notice on paper',
          'Through a coworker or someone else',
          'No one told me directly',
          'Other'
        ],
      },
      {
        id: 'wt_others_present',
        label: 'Was anyone else there when you were told?',
        type: 'yes_no',
        helpText: 'Count anyone in the room, on the phone, or on the video call.',
      },
      {
        id: 'wt_others_present_who',
        label: 'Who else was there? Write their names and job titles.',
        type: 'textarea',
        helpText: 'Add what each person said or did, if you remember.',
        showIf: { questionId: 'wt_others_present', value: 'yes' },
      },
      {
        id: 'wt_words_used',
        label: 'As best you remember, what exactly did they say to you?',
        type: 'textarea',
        required: true,
        helpText: 'Write it the way you remember hearing it. Include what you asked, how they answered, and whether you had to leave right away.',
      },
      {
        id: 'wt_written_reason',
        label: 'Did you get anything in writing about why your job ended?',
        type: 'yes_no',
        helpText: 'For example a letter, an email, a text, or a form you were handed.',
      },
      {
        id: 'wt_written_reason_says',
        label: 'What reason did the writing give? Who signed or sent it, and on what date?',
        type: 'textarea',
        helpText: 'If you still have it, keep it. We may ask you to send us a copy.',
        showIf: { questionId: 'wt_written_reason', value: 'yes' },
      },
      {
        id: 'wt_reason_differs',
        label: 'Have you heard a different reason than the one you were first given?',
        type: 'yes_no',
        helpText: 'For example from a manager, a coworker, unemployment paperwork, or someone who called for a job reference.',
      },
      {
        id: 'wt_reason_differs_details',
        label: 'What was the other reason, and who said it?',
        type: 'textarea',
        helpText: 'Include when you heard it and whether anyone else heard it too.',
        showIf: { questionId: 'wt_reason_differs', value: 'yes' },
      },
      {
        id: 'wt_performance_record',
        label: 'In the 12 months before your job ended, which of these happened? Select all that apply.',
        type: 'multiselect',
        options: [
          'Written warning or write-up',
          'Verbal warning',
          'Suspension',
          'Performance improvement plan',
          'A bad performance review',
          'A good performance review',
          'A raise',
          'A bonus',
          'A promotion or more responsibility',
          'An award or public praise',
          'I refused to sign a write-up',
          'I wrote or sent a reply saying I disagreed with a write-up',
          'None of these',
          'I do not remember'
        ],
        helpText: 'A performance improvement plan is a written plan you were told to follow in order to keep your job.',
      },
      {
        id: 'wt_before_events',
        label: 'In the 3 months before your job ended, did any of these happen? Select all that apply.',
        type: 'multiselect',
        options: [
          'I complained about pay, hours, or breaks',
          'I complained about safety at work',
          'I complained about being treated unfairly, or about harassment',
          'I reported something I believed was illegal',
          'I refused to do something I believed was wrong or unsafe',
          'I was hurt at work, or filed a claim for a work injury',
          'I missed work because I was sick or injured',
          'I asked for time off, or a change at work, for a health reason',
          'I told the company I was pregnant',
          'I asked for time off to care for a family member',
          'I took time off for jury duty, court, or voting',
          'I asked for a change at work for a religious reason',
          'I asked to see my pay records or my personnel file',
          'I talked with coworkers about pay or working conditions',
          'I helped with someone else\'s complaint or investigation',
          'None of these'
        ],
        helpText: 'Only count things that happened in the last 3 months before your job ended.',
      },
      {
        id: 'wt_before_events_who_knew',
        label: 'For anything you checked above, who at the company knew about it?',
        type: 'textarea',
        helpText: 'Names and job titles, when they found out, and how you know they knew. Leave blank if you checked nothing.',
      },
      {
        id: 'wt_comparator',
        label: 'Do you know a coworker who was in a similar situation and kept their job?',
        type: 'yes_no',
        helpText: 'For example, someone with the same absences, the same mistake, or the same kind of complaint against them.',
      },
      {
        id: 'wt_comparator_details',
        label: 'Who are they, and what happened to them?',
        type: 'textarea',
        helpText: 'Names and job titles if you know them, who their supervisor was, and how you found out.',
        showIf: { questionId: 'wt_comparator', value: 'yes' },
      },
      {
        id: 'wt_papers_offered',
        label: 'On or after your last day, were you asked to sign anything?',
        type: 'yes_no',
        helpText: 'For example severance papers, a resignation letter, an agreement, or a receipt for your final check. Severance means money offered when your job ends, usually in exchange for signing something.',
      },
      {
        id: 'wt_papers_signed',
        label: 'What did you do with the papers?',
        type: 'select',
        options: [
          'I signed them',
          'I did not sign them',
          'I took them home and never gave them back',
          'I am still deciding',
          'I do not remember'
        ],
        helpText: 'Keep a copy of anything you were given, even if you did not sign it.',
        showIf: { questionId: 'wt_papers_offered', value: 'yes' },
      },
      {
        id: 'wt_since_then',
        label: 'Since your job ended, which of these have happened? Select all that apply.',
        type: 'multiselect',
        options: [
          'I applied for unemployment benefits',
          'My unemployment claim was approved',
          'My unemployment claim was denied',
          'The company fought my unemployment claim',
          'I have been looking for other work',
          'I have started another job',
          'I have not been able to work',
          'I heard what the company told other people about why I left',
          'The company or its lawyer has contacted me',
          'I asked the company for my personnel file or pay records',
          'None of these'
        ],
      },
    ],
  },
  {
    key: 'harassment',
    caseType: 'Harassment / Discrimination',
    setName: 'Harassment Follow-Up',
    description:
      'Send after reading the intake when the client marked harassment or discrimination — pulls incident-level detail, witnesses, the reporting chain, and what the employer actually did.',
    questions: [
      {
        id: 'hd_harasser_name',
        label: 'Who is the main person who said or did these things?',
        type: 'text',
        required: true,
        helpText: 'First and last name if you know it. A nickname or job title is fine if that is all you have.',
      },
      {
        id: 'hd_harasser_role',
        label: 'What was that person\'s job compared to yours?',
        type: 'select',
        options: [
          'My direct supervisor or manager',
          'A manager above my supervisor',
          'An owner, officer, or executive',
          'A family member of the owner',
          'A coworker at my level',
          'Someone I supervised',
          'A customer, client, vendor, or contractor',
          'Someone else'
        ],
      },
      {
        id: 'hd_others_involved',
        label: 'Did anyone else at the company say or do these things to you?',
        type: 'yes_no',
      },
      {
        id: 'hd_others_involved_details',
        label: 'Who else, and what did each person say or do?',
        type: 'textarea',
        helpText: 'Give each person\'s name or job title, and what that person did.',
        showIf: { questionId: 'hd_others_involved', value: 'yes' },
      },
      {
        id: 'hd_conduct_types',
        label: 'Which of these describe what happened to you? Select all that apply.',
        type: 'multiselect',
        options: [
          'Jokes, comments, or slurs about me or people like me',
          'Name-calling or insults',
          'Comments about my body, appearance, or clothing',
          'Comments or questions about my private life or sex life',
          'Requests for dates or sexual favors',
          'Unwanted touching, hugging, or blocking my way',
          'Being shown or sent photos, videos, or messages I did not want to see',
          'Mocking my accent or my language, or telling me not to speak it',
          'Comments about my age, religion, pregnancy, or medical condition',
          'Threats, yelling, or being embarrassed in front of others',
          'Being watched or checked on more closely than other people',
          'Being left out of meetings, training, or work opportunities',
          'Getting worse shifts, harder jobs, or fewer hours than others',
          'Being passed over for a raise, promotion, or transfer',
          'Something else'
        ],
        helpText: 'Pick everything that applies. There are no wrong answers.',
      },
      {
        id: 'hd_first_incident_date',
        label: 'About when did the first incident happen?',
        type: 'date',
        helpText: 'Your best guess is fine. If you only remember the month, pick any day in that month.',
      },
      {
        id: 'hd_how_often',
        label: 'How often did this happen?',
        type: 'select',
        options: [
          'Every day or almost every day',
          'A few times a week',
          'About once a week',
          'A few times a month',
          'Every few months',
          'A few times in total',
          'One time'
        ],
      },
      {
        id: 'hd_over_time',
        label: 'Did it change over time?',
        type: 'select',
        options: [
          'It got worse over time',
          'It stayed about the same',
          'It came and went',
          'It eased off or stopped',
          'Not sure'
        ],
      },
      {
        id: 'hd_worst_incident',
        label: 'Tell us about the one incident that stands out the most.',
        type: 'textarea',
        required: true,
        helpText: 'About when it happened, where you were, what was said or done, and what you did right after. Please use the actual words if you remember them, even if they are offensive — the exact words matter. Take your time.',
      },
      {
        id: 'hd_worst_incident_witnesses',
        label: 'Who else was there when that happened?',
        type: 'textarea',
        helpText: 'Names, or a description like \'the tall cook on the night shift\', and what each person would have seen or heard. Write \'no one\' if you were alone.',
      },
      {
        id: 'hd_reported_to',
        label: 'Who at the company did you tell about it? Select all that apply.',
        type: 'multiselect',
        options: [
          'My direct supervisor or manager',
          'A manager above my supervisor',
          'HR or the personnel office',
          'An owner, officer, or executive',
          'A lead worker or trainer',
          'A union representative',
          'A company hotline, app, or anonymous report line',
          'I did not tell anyone at the company'
        ],
      },
      {
        id: 'hd_first_report',
        label: 'Tell us about the first time you told someone at the company.',
        type: 'textarea',
        helpText: 'About when it was, exactly who you talked to, what you told them, and whether you said it out loud or sent it by text, email, or a form. If you never told anyone at the company, write that here instead.',
      },
      {
        id: 'hd_interviewed',
        label: 'Did anyone at the company sit down with you and ask questions about it?',
        type: 'yes_no_unsure',
        helpText: 'For example, HR, a manager, or someone from outside the company looking into it.',
      },
      {
        id: 'hd_interview_details',
        label: 'Who spoke with you, about when, and what did they ask?',
        type: 'textarea',
        helpText: 'Also tell us if it was recorded, if you signed anything, if you were given a copy, and whether anyone ever told you what they decided.',
        showIf: { questionId: 'hd_interviewed', value: 'yes' },
      },
      {
        id: 'hd_after_report',
        label: 'After you told the company, which of these happened? Select all that apply.',
        type: 'multiselect',
        options: [
          'The behavior stopped',
          'The behavior continued about the same',
          'The behavior got worse',
          'The other person was moved, suspended, or let go',
          'I was moved to a different shift, team, or location',
          'My hours or pay were cut',
          'My job duties changed',
          'I was written up or disciplined',
          'I was suspended',
          'I was fired or felt forced to quit',
          'Coworkers stopped talking to me',
          'Nothing changed',
          'I never told the company'
        ],
      },
      {
        id: 'hd_effects',
        label: 'How did this affect you? Select all that apply.',
        type: 'multiselect',
        options: [
          'Trouble sleeping',
          'Anxiety, panic, or constant worry',
          'Feeling depressed or hopeless',
          'Headaches, stomach problems, or other physical symptoms',
          'Changes in appetite or weight',
          'Avoiding certain shifts, places, or people at work',
          'Missing work or taking time off',
          'Trouble concentrating or making mistakes at work',
          'Started or increased medication',
          'Started counseling or therapy',
          'Strain at home or with my family',
          'None of these',
          'Something else'
        ],
        helpText: 'Only share what you are comfortable sharing.',
      },
      {
        id: 'hd_medical_care',
        label: 'If you saw a doctor, therapist, or counselor because of this, who did you see and about when?',
        type: 'textarea',
        helpText: 'The name and city of the office and roughly when you started is enough. Leave this blank if you did not see anyone.',
      },
      {
        id: 'hd_evidence_kept',
        label: 'What do you still have about these incidents? Select all that apply.',
        type: 'multiselect',
        options: [
          'Text messages or voicemails from the person',
          'Emails about it',
          'Messages from a work app like Slack, Teams, or WhatsApp',
          'Photos or screenshots of notes, images, or graffiti',
          'Audio or video recordings',
          'My own notes, journal, or calendar where I wrote down what happened',
          'The complaint or form I filled out for the company',
          'The company\'s written answer to my complaint',
          'The company\'s harassment policy or training materials I was given',
          'Names and phone numbers of people who saw it',
          'I do not have anything in writing'
        ],
        helpText: 'Tell us in the last question if something is on a work phone, work email, or work account you can no longer get into.',
      },
    ],
  },
  {
    key: 'retaliation',
    caseType: 'Retaliation',
    setName: 'Retaliation Follow-Up',
    description:
      'Send after intake when the client says they spoke up and something changed at work — pins down the exact complaint, who found out and how the client knows, the timing of each change, comparators, and whether the employer\'s reason shifted.',
    questions: [
      {
        id: 'rt_activity_types',
        label: 'Which of these did you do while working there? Pick everything that applies.',
        type: 'multiselect',
        required: true,
        options: [
          'Complained to a supervisor or manager',
          'Complained to HR, the owner, or someone above my manager',
          'Complained to a government office or agency',
          'Refused to do something I believed was illegal or unsafe',
          'Reported a safety problem or an injury at work',
          'Filed or asked about a work injury claim',
          'Asked about my pay, my hours, or my breaks',
          'Asked for time off for my health or a family member\'s health',
          'Asked for a change at work because of a medical condition, disability, or pregnancy',
          'Backed up a coworker who complained, or answered questions about their complaint',
          'Talked with coworkers about pay or working conditions',
          'Something else'
        ],
        helpText: 'We are asking about any time you spoke up, asked a question, or refused something at work — even if it seemed small.',
      },
      {
        id: 'rt_activity_first_date',
        label: 'About what date did you first do this?',
        type: 'date',
        helpText: 'If you are not sure of the exact day, pick the closest date you can remember.',
      },
      {
        id: 'rt_activity_to_whom',
        label: 'Who did you go to? List each person\'s name and job title.',
        type: 'textarea',
        helpText: 'A first name and their job is fine if you do not know the last name.',
      },
      {
        id: 'rt_activity_how_made',
        label: 'How did you do it? Pick everything that applies.',
        type: 'multiselect',
        options: [
          'In person, out loud',
          'Phone call',
          'Text message',
          'Email',
          'Letter or note on paper',
          'Work chat app such as Slack, WhatsApp, or Teams',
          'Company complaint form',
          'Company hotline or website',
          'Form sent to a government office',
          'Someone else spoke for me',
          'Other'
        ],
      },
      {
        id: 'rt_activity_what_said',
        label: 'As best you remember, what did you actually say or write? Use your own words.',
        type: 'textarea',
        required: true,
        helpText: 'Quote yourself if you can. Example: I told Maria we were working through lunch and not getting paid for it.',
      },
      {
        id: 'rt_activity_others_present',
        label: 'Was anyone else there, listening, or copied when you did this?',
        type: 'yes_no',
      },
      {
        id: 'rt_activity_others_present_who',
        label: 'Who else was there or copied? List each person and what they saw, heard, or received.',
        type: 'textarea',
        showIf: { questionId: 'rt_activity_others_present', value: 'yes' },
      },
      {
        id: 'rt_knowledge_who',
        label: 'Which managers, supervisors, or owners do you believe found out about it? List each name and job title.',
        type: 'textarea',
        helpText: 'Include anyone you believe heard about it, even if you never spoke to them yourself.',
      },
      {
        id: 'rt_knowledge_how',
        label: 'How do you know they found out? Pick everything that applies.',
        type: 'multiselect',
        options: [
          'They said something to me about it',
          'I heard them talking about it',
          'Someone else told me they knew',
          'It was brought up in a meeting',
          'I saw it in an email, text, or message',
          'They were there when I said it',
          'I was called in to talk about it',
          'I got a letter or email back about it',
          'I am not sure how they found out'
        ],
      },
      {
        id: 'rt_knowledge_proof',
        label: 'Tell us how you learned they knew. Who said what, about when, and who else was around?',
        type: 'textarea',
        helpText: 'Example: About a week later my supervisor told me, I heard you went to HR about me.',
      },
      {
        id: 'rt_changes_list',
        label: 'After that, did any of these happen to you at work? Pick everything that applies.',
        type: 'multiselect',
        options: [
          'My hours were cut',
          'My schedule was changed',
          'I was moved to a different shift, job site, or department',
          'I was given harder, dirtier, or unwanted work',
          'I was taken off my usual duties',
          'I was written up or disciplined',
          'I was put on a performance plan or final warning',
          'I got a worse review than before',
          'I was watched, followed, or checked on more than before',
          'I was left out of meetings, messages, or trainings',
          'Coworkers were told to stay away from me',
          'I was denied a raise, bonus, or promotion',
          'My pay was cut',
          'I was denied time off I used to get',
          'I was yelled at, insulted, or threatened',
          'I was threatened with being reported to a government office',
          'I was suspended or sent home',
          'I was fired',
          'I felt forced to quit',
          'Something else'
        ],
      },
      {
        id: 'rt_first_change_date',
        label: 'About what date did the first of those things happen?',
        type: 'date',
        helpText: 'Your best guess is fine. This helps us line up the timing.',
      },
      {
        id: 'rt_changes_timeline',
        label: 'Go through each thing you picked, one by one: what happened, about when, and who did it.',
        type: 'textarea',
        helpText: 'A short list is fine. Example: Hours cut about two weeks after, by Maria. Write-up in March, from Luis.',
      },
      {
        id: 'rt_comparator_coworker',
        label: 'Was there a coworker who did the same thing you got in trouble for, but nothing happened to them?',
        type: 'yes_no_unsure',
        helpText: 'For example, someone else who was also late or made the same mistake. Answer no if nothing like that came up.',
      },
      {
        id: 'rt_comparator_detail',
        label: 'Who was that coworker, what did they do, and what happened to them instead?',
        type: 'textarea',
        helpText: 'Name and job title if you know them.',
        showIf: { questionId: 'rt_comparator_coworker', value: 'yes' },
      },
      {
        id: 'rt_reason_changed',
        label: 'Did the reason you were given for what happened ever change from one time to the next?',
        type: 'yes_no_unsure',
        helpText: 'For example, first told it was slow business, and later told it was your work.',
      },
      {
        id: 'rt_reason_changed_detail',
        label: 'What reason were you given first, what reason came later, and who told you each one?',
        type: 'textarea',
        helpText: 'Include about when each reason was given, and whether it was said out loud or put in writing.',
        showIf: { questionId: 'rt_reason_changed', value: 'yes' },
      },
      {
        id: 'rt_evidence_kept',
        label: 'Which of these do you still have? Pick everything that applies.',
        type: 'multiselect',
        options: [
          'A copy of my complaint or the message I sent',
          'The company\'s written answer to me',
          'Texts or emails with my manager or HR',
          'Write-ups, warnings, or performance plans I got afterward',
          'Reviews or praise from before I spoke up',
          'Schedules or time records showing my hours before and after',
          'Paystubs showing my pay before and after',
          'My own notes, journal, or calendar about what happened',
          'Photos, videos, or voice recordings',
          'A layoff, separation, or termination letter',
          'Papers the company asked me to sign afterward',
          'Names and phone numbers of coworkers who saw it',
          'I do not have any of these'
        ],
        helpText: 'Only what you can get to yourself — on your phone, your email, or at home.',
      },
    ],
  },
  {
    key: 'leave',
    caseType: 'FMLA / Leave Violation',
    setName: 'Leave & Accommodation Follow-Up',
    description:
      'Send after intake when the client asked for medical leave, pregnancy leave, family care leave, or a change at work for a health reason — pins down who they told, what paperwork moved, what was decided and why, and what happened when they came back.',
    questions: [
      {
        id: 'lv_leave_reason',
        label: 'What did you need the time off or the change at work for?',
        type: 'multiselect',
        required: true,
        options: [
          'My own illness, injury, or health condition',
          'My pregnancy, childbirth, or recovery afterward',
          'Bonding with a new baby or a newly adopted or foster child',
          'Caring for a family member with a health condition',
          'A death in my family',
          'A change to my duties, schedule, or workplace for a health reason',
          'Something else'
        ],
        helpText: 'Choose everything that applies, even if you asked for more than one thing at the same time.',
      },
      {
        id: 'lv_employer_size',
        label: 'About how many people worked for this employer while you were there?',
        type: 'select',
        required: true,
        options: ['Fewer than 5', '5 to 19', '20 to 49', '50 to 99', '100 or more', 'I am not sure'],
        helpText: 'Your best guess is fine. Count everyone who worked for the company, including people at other locations.',
      },
      {
        id: 'lv_first_request_date',
        label: 'About when did you first tell someone at work that you needed this?',
        type: 'date',
        helpText: 'Your best guess is fine if you do not remember the exact day. If you asked more than once, use the first time you brought it up.',
      },
      {
        id: 'lv_who_i_told',
        label: 'Who was the first person at work you told?',
        type: 'textarea',
        helpText: 'Give their name and job title if you know them. If anyone else was there when you told them, include that person too. Write "no one else" if it was just the two of you.',
      },
      {
        id: 'lv_request_methods',
        label: 'How did you ask?',
        type: 'multiselect',
        options: [
          'In person',
          'By phone call',
          'By text message',
          'By email',
          'On a paper form from the company',
          'On a company website or app',
          'By letter',
          'Through an outside leave or benefits company',
          'Someone else asked for me',
          'Other'
        ],
        helpText: 'Choose every way you asked. Many people ask more than one way, or more than once.',
      },
      {
        id: 'lv_request_details',
        label: 'In your own words, what did you ask for?',
        type: 'textarea',
        required: true,
        helpText: 'For example: the dates you needed off, how long you needed, or the change you needed to your job or schedule. If you asked more than once, describe each time.',
      },
      {
        id: 'lv_forms_given',
        label: 'Did anyone at work give you forms or paperwork to fill out for this?',
        type: 'yes_no',
      },
      {
        id: 'lv_forms_details',
        label: 'Tell us about the paperwork you were given.',
        type: 'textarea',
        helpText: 'Include who handed it to you, the date you got it, any deadline they set, and the date you turned it back in.',
        showIf: { questionId: 'lv_forms_given', value: 'yes' },
      },
      {
        id: 'lv_medical_note_given',
        label: 'Did you give your employer a note or paperwork from a doctor, midwife, or other medical provider?',
        type: 'yes_no',
      },
      {
        id: 'lv_medical_note_details',
        label: 'Tell us about each note you gave them.',
        type: 'textarea',
        helpText: 'Include the date on the note, who you handed it to, and what it said you needed — for example "off work June 3 to July 1" or "no lifting over 20 pounds."',
        showIf: { questionId: 'lv_medical_note_given', value: 'yes' },
      },
      {
        id: 'lv_options_talk',
        label: 'Did anyone from the company talk with you about other ways to handle it?',
        type: 'yes_no',
        helpText: 'For example, a different schedule, lighter duties, a different job, or a shorter time off.',
      },
      {
        id: 'lv_options_talk_details',
        label: 'Tell us about that conversation.',
        type: 'textarea',
        helpText: 'Include who was there, when and where it happened, and what each person said. Include anything you suggested as well as anything they suggested.',
        showIf: { questionId: 'lv_options_talk', value: 'yes' },
      },
      {
        id: 'lv_employer_decision',
        label: 'What did your employer finally decide about your request?',
        type: 'select',
        required: true,
        options: [
          'Gave me everything I asked for',
          'Gave me part of what I asked for',
          'Said no',
          'Never gave me an answer',
          'Put me on time off I did not ask for',
          'Something else'
        ],
      },
      {
        id: 'lv_decision_reason',
        label: 'What reason were you given for that decision?',
        type: 'textarea',
        helpText: 'Write it as close to their words as you can remember. If no reason was ever given, say that.',
      },
      {
        id: 'lv_return_status',
        label: 'What happened when your time off ended, or when you were ready to come back?',
        type: 'select',
        options: [
          'I went back to the same job, pay, hours, and schedule',
          'I went back, but something about the job was different',
          'They would not let me come back',
          'My job ended while I was out',
          'I never went back for another reason',
          'I am still out',
          'I never got the time off, so this did not happen'
        ],
      },
      {
        id: 'lv_return_details',
        label: 'Tell us more about your time off ending and coming back to work.',
        type: 'textarea',
        helpText: 'Include the first and last days you were actually out, who you spoke with about coming back, and anything different about your pay, hours, shift, duties, title, or location. If you never got the time off, just write "did not happen."',
      },
      {
        id: 'lv_comments_made',
        label: 'Did anyone at work say anything to you about your time off, your health, your pregnancy, or when you were coming back?',
        type: 'yes_no',
        helpText: 'This includes anything said while you were out, in person, by phone, or in a message.',
      },
      {
        id: 'lv_comments_details',
        label: 'Tell us what was said.',
        type: 'textarea',
        helpText: 'Include who said it, when, and who else heard it. Use their words as closely as you can remember, even if the words were rude or upsetting.',
        showIf: { questionId: 'lv_comments_made', value: 'yes' },
      },
    ],
  },
  {
    key: 'whos_who',
    caseType: 'Any',
    setName: 'Who\'s Who',
    description:
      'Send on any case right after the intake comes back, to map every person involved and figure out which of them we can actually reach.',
    questions: [
      {
        id: 'ww_supervisor_title',
        label: 'What is (or was) your main supervisor\'s job title?',
        type: 'text',
        helpText: 'If you are not sure of the official title, describe what they did — for example, shift lead, or the person who ran the floor. If you no longer work there, answer about the time when you did.',
      },
      {
        id: 'ww_had_other_supervisors',
        label: 'Besides that person, has anyone else supervised you at that job?',
        type: 'yes_no',
      },
      {
        id: 'ww_other_supervisors',
        label: 'List those other supervisors.',
        type: 'textarea',
        helpText: 'For each one: their name, their job title, and roughly when they supervised you. A first name or a nickname is fine if that is all you knew them by.',
        showIf: { questionId: 'ww_had_other_supervisors', value: 'yes' },
      },
      {
        id: 'ww_chain_above_supervisor',
        label: 'Who is (or was) above your supervisor? Go as far up as you know.',
        type: 'textarea',
        helpText: 'Names if you know them, or titles like district manager or general manager. One person is fine, and it is fine to say you don\'t know.',
      },
      {
        id: 'ww_knows_owner',
        label: 'Do you know who owns the company, or who the top boss is?',
        type: 'yes_no',
      },
      {
        id: 'ww_owner_detail',
        label: 'Tell us who the owner or top boss is.',
        type: 'textarea',
        helpText: 'Their name if you know it, what they do at the company, how you came to know who they are, and whether you ever dealt with them directly.',
        showIf: { questionId: 'ww_knows_owner', value: 'yes' },
      },
      {
        id: 'ww_office_hr_people',
        label: 'Besides any HR contact you already gave us, who else in the office handles (or handled) paychecks, schedules, hiring paperwork, or employee problems?',
        type: 'textarea',
        helpText: 'Names or job titles both work — for example the office manager, the person who handed out paychecks, or whoever you would go to with a problem. Write "no one else" if that covers it.',
      },
      {
        id: 'ww_who_was_present',
        label: 'Think about the events you described in your intake. Who else was nearby when they happened?',
        type: 'textarea',
        required: true,
        helpText: 'List everyone you can remember, even if you only know a first name or a nickname, and even people you don\'t think would take your side. If no one else was around, just say so.',
      },
      {
        id: 'ww_coworker_saw_or_heard',
        label: 'Did any coworker ever tell you they saw or heard something that happened to you at work?',
        type: 'yes_no',
      },
      {
        id: 'ww_coworker_saw_detail',
        label: 'What did they tell you they saw or heard?',
        type: 'textarea',
        helpText: 'Include their name, roughly when they told you, and where the two of you were at the time. If more than one person told you something, include each of them.',
        showIf: { questionId: 'ww_coworker_saw_or_heard', value: 'yes' },
      },
      {
        id: 'ww_people_left',
        label: 'Do you know anyone who worked there and has since left?',
        type: 'yes_no',
      },
      {
        id: 'ww_people_left_detail',
        label: 'List the people who have left that job.',
        type: 'textarea',
        helpText: 'For each one, roughly when they left. If you know why they left, or where they work now, include that too.',
        showIf: { questionId: 'ww_people_left', value: 'yes' },
      },
      {
        id: 'ww_still_in_touch',
        label: 'Are you still in contact with anyone from that job?',
        type: 'yes_no',
        required: true,
      },
      {
        id: 'ww_contact_details',
        label: 'List the people from that job you are still in contact with.',
        type: 'textarea',
        helpText: 'For each person, tell us how you reach them — phone, text, WhatsApp, social media, or in person — and how you know them, such as worked my shift, trained me, a friend outside of work, or a relative. If you are in a group chat or group text with people from that job, tell us about that too. Checking your phone contacts may help.',
        showIf: { questionId: 'ww_still_in_touch', value: 'yes' },
      },
      {
        id: 'ww_told_anyone',
        label: 'Have you talked with anyone about what happened at that job?',
        type: 'yes_no',
        helpText: 'Coworkers, family, friends, a doctor, anyone at all. We already asked about formal complaints — this question is about ordinary conversations too.',
      },
      {
        id: 'ww_told_anyone_detail',
        label: 'List the people you talked with about it.',
        type: 'textarea',
        helpText: 'For each one, roughly when you talked and how much you told them. Please also tell us if any of them still works at the company.',
        showIf: { questionId: 'ww_told_anyone', value: 'yes' },
      },
      {
        id: 'ww_contact_cautions',
        label: 'Is there anyone you have named who you would not want us to contact?',
        type: 'yes_no',
        helpText: 'For example, someone who still works there, a relative, or someone you are no longer on good terms with. There is no wrong answer — we just want to know before we reach out to anyone.',
      },
      {
        id: 'ww_contact_cautions_detail',
        label: 'Who should we be careful about contacting?',
        type: 'textarea',
        helpText: 'Tell us who, and what makes you feel that way — for example, they still work there, or the two of you had a falling out.',
        showIf: { questionId: 'ww_contact_cautions', value: 'yes' },
      },
    ],
  },
]

/** Banks for one case type, with the case-agnostic ones after them. */
export function banksForCaseType(caseType: string): RecommendedBank[] {
  const matching = RECOMMENDED_BANKS.filter(b => b.caseType === caseType)
  const universal = RECOMMENDED_BANKS.filter(b => b.caseType === 'Any')
  return [...matching, ...universal]
}

/** Every case type that has at least one bank, in the order they are defined. */
export function recommendedCaseTypes(): string[] {
  return Array.from(new Set(RECOMMENDED_BANKS.map(b => b.caseType)))
}
