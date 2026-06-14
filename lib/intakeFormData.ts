import { Question } from '@/types'

export interface IntakeSection {
  id: string
  title: string
  description?: string
  questions: Question[]
}

export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Please provide your personal information',
    questions: [
      {
        id: 'legal_name',
        label: 'Full Legal Name',
        type: 'text',
        placeholder: 'As it appears on your ID',
      },
      {
        id: 'other_names',
        label: 'Any Other Names Used (maiden name, nicknames, etc.)',
        type: 'text',
        placeholder: 'Leave blank if not applicable',
      },
      {
        id: 'dob',
        label: 'Date of Birth',
        type: 'date',
      },
      {
        id: 'current_address',
        label: 'Current Address',
        type: 'textarea',
        placeholder: 'Street address, city, state, ZIP',
      },
      {
        id: 'addresses_5_years',
        label: 'Addresses Where You Have Lived in the Last 5 Years',
        type: 'textarea',
        helpText: 'List each address and the dates you lived there',
      },
      {
        id: 'phone_number',
        label: 'Phone Number',
        type: 'phone',
      },
      {
        id: 'email_address',
        label: 'Email Address',
        type: 'text',
        placeholder: 'your@email.com',
      },
    ],
  },

  {
    id: 'employment-info',
    title: 'Employment / Work Information',
    description: 'Please tell us about your employment',
    questions: [
      {
        id: 'current_employer_name',
        label: 'Current Employer Name',
        type: 'text',
        placeholder: 'Leave blank if not currently employed',
      },
      {
        id: 'current_employer_address',
        label: 'Current Employer Address',
        type: 'text',
      },
      {
        id: 'current_employer_phone',
        label: 'Current Employer Phone',
        type: 'phone',
      },
      {
        id: 'job_title',
        label: 'Your Job Title',
        type: 'text',
      },
      {
        id: 'employment_history',
        label: 'Your Employment History (for the relevant time period)',
        type: 'textarea',
        helpText: 'List previous jobs, dates, and employers',
      },
      {
        id: 'self_employed',
        label: 'Are you self-employed or own a business?',
        type: 'yes_no',
      },
      {
        id: 'business_details',
        label: 'If yes, please describe your business name and type of work',
        type: 'textarea',
        showIf: { questionId: 'self_employed', value: 'yes' },
      },
    ],
  },

  {
    id: 'language',
    title: 'Language',
    questions: [
      {
        id: 'english_comfortable',
        label: 'Are you comfortable speaking, reading, and writing in English?',
        type: 'yes_no',
      },
      {
        id: 'main_language',
        label: 'What language do you mainly speak?',
        type: 'text',
      },
    ],
  },

  {
    id: 'what-happened',
    title: 'What Happened',
    description: 'Please describe the incident in detail',
    questions: [
      {
        id: 'what_happened',
        label: 'Describe what happened. Include dates, times, locations, and explain what happened before, during, and after the incident.',
        type: 'textarea',
        placeholder: 'Please provide as much detail as you can remember',
      },
    ],
  },

  {
    id: 'witnesses',
    title: 'Witnesses / Other People Involved',
    description: 'Tell us about anyone who knows about what happened',
    questions: [
      {
        id: 'witnesses_present',
        label: 'Names of anyone who saw what happened',
        type: 'textarea',
        placeholder: 'Leave blank if no witnesses',
      },
      {
        id: 'witnesses_aware',
        label: 'Names of anyone who knows about what happened (even if they did not see it)',
        type: 'textarea',
        placeholder: 'Leave blank if not applicable',
      },
      {
        id: 'witnesses_contact',
        label: 'Contact information for witnesses (if known)',
        type: 'textarea',
        helpText: 'Phone, email, or address',
      },
      {
        id: 'witnesses_details',
        label: 'What does each person know?',
        type: 'textarea',
        helpText: 'Describe what each witness knows about the incident',
      },
    ],
  },

  {
    id: 'documents-evidence',
    title: 'Documents / Evidence',
    questions: [
      {
        id: 'has_documents',
        label: 'Do you have any photos, videos, text messages, emails, recordings, notes, reports, contracts, pay stubs, or medical records related to this matter?',
        type: 'yes_no',
      },
      {
        id: 'documents_list',
        label: 'What documents do you have?',
        type: 'textarea',
        showIf: { questionId: 'has_documents', value: 'yes' },
        placeholder: 'List the types of documents and describe them briefly',
      },
      {
        id: 'documents_who_has',
        label: 'Who has these documents?',
        type: 'textarea',
        showIf: { questionId: 'has_documents', value: 'yes' },
        helpText: 'Who has possession of the documents?',
      },
    ],
  },

  {
    id: 'statements',
    title: 'Statements',
    questions: [
      {
        id: 'has_statements',
        label: 'Did you or anyone else make any written, recorded, or verbal statements about the incident?',
        type: 'yes_no',
      },
      {
        id: 'statements_details',
        label: 'If yes, when, to whom, and in what form? (written, recorded, verbal)',
        type: 'textarea',
        showIf: { questionId: 'has_statements', value: 'yes' },
      },
    ],
  },

  {
    id: 'injuries-harm',
    title: 'Injuries / Harm',
    description: 'Please describe any physical, emotional, or mental harm you suffered',
    questions: [
      {
        id: 'suffered_harm',
        label: 'Did you suffer any physical, emotional, or mental harm?',
        type: 'yes_no',
      },
      {
        id: 'harm_symptoms',
        label: 'What symptoms or problems did you have?',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_start_date',
        label: 'When did they start?',
        type: 'date',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_ongoing',
        label: 'Are these problems ongoing?',
        type: 'yes_no',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_treatment',
        label: 'What treatment did you receive? (doctors, hospitals, therapy, etc.)',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_healthcare_providers',
        label: 'Names of doctors, clinics, or hospitals',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
    ],
  },

  {
    id: 'lost-wages',
    title: 'Lost Wages / Lost Income',
    questions: [
      {
        id: 'missed_work',
        label: 'Did you miss work because of this incident?',
        type: 'yes_no',
      },
      {
        id: 'missed_dates',
        label: 'What dates did you miss work?',
        type: 'textarea',
        showIf: { questionId: 'missed_work', value: 'yes' },
      },
      {
        id: 'income_lost_amount',
        label: 'How much income did you lose?',
        type: 'text',
        showIf: { questionId: 'missed_work', value: 'yes' },
        placeholder: 'Dollar amount',
      },
      {
        id: 'income_calculation',
        label: 'How are you calculating that amount?',
        type: 'textarea',
        showIf: { questionId: 'missed_work', value: 'yes' },
        placeholder: 'Show your calculation (e.g., hourly rate × hours)',
      },
    ],
  },

  {
    id: 'other-damages',
    title: 'Other Damages',
    questions: [
      {
        id: 'property_damage',
        label: 'Was there any property damage?',
        type: 'yes_no',
      },
      {
        id: 'property_damage_details',
        label: 'Describe the property damage and amount',
        type: 'textarea',
        showIf: { questionId: 'property_damage', value: 'yes' },
      },
      {
        id: 'medical_expenses',
        label: 'Do you have medical or healthcare expenses?',
        type: 'yes_no',
      },
      {
        id: 'medical_expenses_amount',
        label: 'Total medical expenses',
        type: 'text',
        showIf: { questionId: 'medical_expenses', value: 'yes' },
        placeholder: 'Dollar amount',
      },
      {
        id: 'other_expenses',
        label: 'Any other out-of-pocket costs? (travel, childcare, etc.)',
        type: 'yes_no',
      },
      {
        id: 'other_expenses_details',
        label: 'Describe other expenses and amounts',
        type: 'textarea',
        showIf: { questionId: 'other_expenses', value: 'yes' },
      },
    ],
  },

  {
    id: 'insurance',
    title: 'Insurance',
    questions: [
      {
        id: 'has_insurance',
        label: 'Is there any insurance that may relate to this matter?',
        type: 'yes_no',
      },
      {
        id: 'insurance_details',
        label: 'If yes, what company, what type of insurance, and was a claim made?',
        type: 'textarea',
        showIf: { questionId: 'has_insurance', value: 'yes' },
      },
    ],
  },

  {
    id: 'prior-claims',
    title: 'Prior Claims / Lawsuits',
    questions: [
      {
        id: 'similar_claim_before',
        label: 'Have you ever made a similar claim before?',
        type: 'yes_no',
      },
      {
        id: 'similar_lawsuit_before',
        label: 'Have you ever been involved in a similar lawsuit?',
        type: 'yes_no',
      },
      {
        id: 'workers_comp_claim',
        label: 'Have you filed a workers\' compensation claim?',
        type: 'yes_no',
      },
      {
        id: 'prior_claims_details',
        label: 'If yes to any above, when and what was the result?',
        type: 'textarea',
        helpText: 'Include dates and outcomes',
      },
    ],
  },

  {
    id: 'response-other-side',
    title: 'Your Response to the Other Side',
    description: 'If the other side disputes your version of events, explain why they are wrong',
    questions: [
      {
        id: 'response_to_other_side',
        label: 'If the other side says nothing happened, or that it was your fault, or that your damages are exaggerated, explain why that is wrong. Identify facts, witnesses, or documents that support your position.',
        type: 'textarea',
      },
    ],
  },

  {
    id: 'pay-schedule',
    title: 'Pay and Schedule',
    questions: [
      {
        id: 'pay_type',
        label: 'How were you paid?',
        type: 'select',
        options: ['Hourly', 'Salary', 'Commission', 'Piece rate', 'Other'],
      },
      {
        id: 'pay_rate',
        label: 'What was your rate of pay?',
        type: 'text',
        placeholder: 'e.g., $18/hour or $60,000 per year',
      },
      {
        id: 'usual_workdays',
        label: 'What were your usual workdays?',
        type: 'text',
        placeholder: 'e.g., Monday–Friday',
      },
      {
        id: 'usual_hours',
        label: 'What were your usual work hours per day?',
        type: 'text',
        placeholder: 'e.g., 9 AM to 5 PM',
      },
    ],
  },

  {
    id: 'breaks-overtime',
    title: 'Breaks and Overtime',
    questions: [
      {
        id: 'meal_breaks',
        label: 'Were you able to take meal breaks?',
        type: 'yes_no',
      },
      {
        id: 'rest_breaks',
        label: 'Were you able to take rest breaks?',
        type: 'yes_no',
      },
      {
        id: 'worked_overtime',
        label: 'Did you work overtime?',
        type: 'yes_no',
      },
      {
        id: 'paid_all_hours',
        label: 'Were you paid for all hours worked?',
        type: 'yes_no',
      },
    ],
  },

  {
    id: 'supervisors-hr',
    title: 'Supervisors / HR',
    questions: [
      {
        id: 'supervisor_name',
        label: 'Who supervised you?',
        type: 'text',
      },
      {
        id: 'hr_contact',
        label: 'Who handled HR or payroll?',
        type: 'text',
      },
      {
        id: 'complained_to',
        label: 'Who did you complain to, if anyone?',
        type: 'text',
      },
    ],
  },

  {
    id: 'termination-discipline',
    title: 'Termination / Discipline / Complaint History',
    questions: [
      {
        id: 'was_disciplined',
        label: 'Were you disciplined, suspended, or fired?',
        type: 'yes_no',
      },
      {
        id: 'discipline_date',
        label: 'When?',
        type: 'date',
        showIf: { questionId: 'was_disciplined', value: 'yes' },
      },
      {
        id: 'discipline_reason_given',
        label: 'What reason were you given?',
        type: 'textarea',
        showIf: { questionId: 'was_disciplined', value: 'yes' },
      },
      {
        id: 'prior_complaint',
        label: 'Did you complain about wages, harassment, discrimination, retaliation, safety, or working conditions before that happened?',
        type: 'yes_no',
      },
      {
        id: 'complaint_details',
        label: 'If yes, describe the complaint',
        type: 'textarea',
        showIf: { questionId: 'prior_complaint', value: 'yes' },
      },
    ],
  },

  {
    id: 'discrimination-retaliation',
    title: 'Discrimination / Retaliation / Leave / Accommodation',
    questions: [
      {
        id: 'unfair_treatment',
        label: 'Were you treated unfairly because of a protected reason? (race, gender, disability, age, religion, etc.)',
        type: 'yes_no',
      },
      {
        id: 'unfair_treatment_details',
        label: 'If yes, describe the treatment',
        type: 'textarea',
        showIf: { questionId: 'unfair_treatment', value: 'yes' },
      },
      {
        id: 'requested_leave',
        label: 'Did you request medical leave or an accommodation?',
        type: 'yes_no',
      },
      {
        id: 'leave_requested',
        label: 'What was requested?',
        type: 'textarea',
        showIf: { questionId: 'requested_leave', value: 'yes' },
      },
      {
        id: 'employer_response',
        label: 'How did the employer respond?',
        type: 'textarea',
        showIf: { questionId: 'requested_leave', value: 'yes' },
      },
    ],
  },
]
