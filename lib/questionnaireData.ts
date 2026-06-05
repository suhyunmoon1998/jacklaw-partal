import { QuestionnaireSection } from '@/types'

/**
 * Employment Law Intake Questionnaire — 20 Sections
 * California-focused. For general use as a starting template.
 * All questions are generic screening questions — not legal advice.
 */
export const QUESTIONNAIRE_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'contact',
    title: 'Contact Information',
    questions: [
      { id: 'full_name', label: 'Full Legal Name', type: 'text', required: true, placeholder: 'As it appears on your ID' },
      { id: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { id: 'address', label: 'Street Address', type: 'text', required: true },
      { id: 'city_state_zip', label: 'City, State, ZIP Code', type: 'text', required: true },
      { id: 'alt_phone', label: 'Alternative Phone Number', type: 'phone', placeholder: '(555) 000-0000' },
      { id: 'email', label: 'Email Address', type: 'text', placeholder: 'you@example.com' },
      { id: 'preferred_language', label: 'Preferred Language', type: 'select', options: ['English', 'Spanish', 'Other'] },
    ],
  },
  {
    id: 'employer',
    title: 'Employer Information',
    questions: [
      { id: 'employer_name', label: 'Employer / Company Name', type: 'text', required: true },
      { id: 'employer_address', label: 'Employer Street Address', type: 'text' },
      { id: 'employer_city_state', label: 'City, State', type: 'text' },
      { id: 'supervisor_name', label: 'Supervisor / Manager Name', type: 'text' },
      { id: 'supervisor_phone', label: "Supervisor's Phone (if known)", type: 'phone', placeholder: '(555) 000-0000' },
      { id: 'hr_contact', label: 'HR Contact Name or Department', type: 'text' },
      { id: 'industry', label: 'Type of Business / Industry', type: 'text', placeholder: 'e.g., Restaurant, Retail, Construction' },
    ],
  },
  {
    id: 'dates_worked',
    title: 'Dates Worked',
    questions: [
      { id: 'start_date', label: 'Date You Started Working', type: 'date', required: true },
      { id: 'still_employed', label: 'Are you still employed there?', type: 'yes_no', required: true },
      { id: 'end_date', label: 'If no, what was your last day of work?', type: 'date', showIf: { questionId: 'still_employed', value: 'no' } },
      { id: 'employment_type', label: 'Type of Employment', type: 'select', options: ['Full-Time', 'Part-Time', 'Seasonal', 'Temporary / Staffing Agency', 'Contract', 'Other'] },
    ],
  },
  {
    id: 'position',
    title: 'Job Position and Duties',
    questions: [
      { id: 'job_title', label: 'Your Job Title', type: 'text', required: true },
      { id: 'job_duties', label: 'Describe Your Job Duties', type: 'textarea', required: true, placeholder: 'What did you do on a typical day?' },
      { id: 'classification', label: 'Were you classified as an employee or independent contractor?', type: 'select', options: ['Employee', 'Independent Contractor', 'Not Sure'] },
      { id: 'misclassified', label: 'Do you believe you were misclassified as an independent contractor?', type: 'yes_no' },
      { id: 'exempt', label: 'Were you told you were an "exempt" or "salaried" employee not entitled to overtime?', type: 'yes_no' },
    ],
  },
  {
    id: 'pay_rate',
    title: 'Pay Rate',
    questions: [
      { id: 'pay_type', label: 'How were you paid?', type: 'select', required: true, options: ['Hourly', 'Salary', 'Commission', 'Piece Rate', 'Day Rate', 'Other'] },
      { id: 'hourly_rate', label: 'Hourly Rate (if applicable)', type: 'text', placeholder: 'e.g., $18.00 per hour' },
      { id: 'salary_amount', label: 'Salary Amount (if applicable)', type: 'text', placeholder: 'e.g., $60,000 per year' },
      { id: 'received_tips', label: 'Did you receive tips?', type: 'yes_no' },
      { id: 'pay_changed', label: 'Did your pay rate change at any point during your employment?', type: 'yes_no' },
      { id: 'pay_change_notes', label: 'Describe any changes to your pay', type: 'textarea', showIf: { questionId: 'pay_changed', value: 'yes' } },
    ],
  },
  {
    id: 'schedule',
    title: 'Schedule',
    questions: [
      { id: 'days_per_week', label: 'How many days per week did you typically work?', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7'] },
      { id: 'hours_per_day', label: 'How many hours per day did you typically work?', type: 'text', placeholder: 'e.g., 9 hours per day' },
      { id: 'schedule_type', label: 'What was your schedule like?', type: 'select', options: ['Regular (same days/hours each week)', 'Rotating Shifts', 'On-Call', 'Irregular / Variable', 'Other'] },
      { id: 'schedule_notes', label: 'Describe your typical work schedule', type: 'textarea', placeholder: 'e.g., Monday-Friday, 7am to 4pm' },
    ],
  },
  {
    id: 'timekeeping',
    title: 'Timekeeping Method',
    questions: [
      { id: 'timekeeping_method', label: 'How did your employer track your work hours?', type: 'select', options: ['Time Clock / Badge Scanner', 'Biometric (fingerprint / face scan)', 'Paper Timesheets', 'Electronic Timesheets / App', 'Manager Recorded Hours', 'No Formal Tracking', 'Other'] },
      { id: 'clock_in_out', label: 'Did you personally clock in and clock out?', type: 'yes_no' },
      { id: 'employer_altered', label: 'Did your employer ever change, alter, or delete your time records?', type: 'yes_no' },
      { id: 'alteration_details', label: 'Describe what happened with your time records', type: 'textarea', showIf: { questionId: 'employer_altered', value: 'yes' } },
    ],
  },
  {
    id: 'meal_breaks',
    title: 'Meal Breaks',
    questions: [
      { id: 'meal_break_provided', label: 'Were you provided a full 30-minute uninterrupted meal break?', type: 'yes_no', required: true },
      { id: 'meal_break_5hrs', label: 'Were meal breaks provided when you worked more than 5 hours?', type: 'yes_no' },
      { id: 'meal_break_10hrs', label: 'Were you provided a second meal break when working more than 10 hours?', type: 'yes_no' },
      { id: 'meal_break_interrupted', label: 'Were your meal breaks interrupted or cut short by work?', type: 'yes_no' },
      { id: 'meal_break_pressure', label: 'Were you pressured, required, or expected to skip meal breaks?', type: 'yes_no' },
      { id: 'meal_premium_paid', label: 'Were you paid one hour of extra pay ("premium pay") for missed or late meal breaks?', type: 'yes_no' },
    ],
  },
  {
    id: 'rest_breaks',
    title: 'Rest Breaks',
    questions: [
      { id: 'rest_break_provided', label: 'Were you provided paid 10-minute rest breaks?', type: 'yes_no', required: true },
      { id: 'rest_break_frequency', label: 'Were rest breaks provided for approximately every 4 hours worked?', type: 'yes_no' },
      { id: 'rest_break_skipped', label: 'Did you regularly skip rest breaks?', type: 'yes_no' },
      { id: 'rest_break_pressure', label: 'Were you pressured or expected to skip rest breaks?', type: 'yes_no' },
      { id: 'rest_premium_paid', label: 'Were you paid one hour of extra pay for missed rest breaks?', type: 'yes_no' },
    ],
  },
  {
    id: 'overtime',
    title: 'Overtime',
    questions: [
      { id: 'worked_over_8', label: 'Did you regularly work more than 8 hours in a single day?', type: 'yes_no' },
      { id: 'worked_over_12', label: 'Did you regularly work more than 12 hours in a single day?', type: 'yes_no' },
      { id: 'worked_over_40', label: 'Did you regularly work more than 40 hours in a week?', type: 'yes_no' },
      { id: 'paid_overtime', label: 'Were you paid time-and-a-half (1.5x) for overtime hours?', type: 'yes_no' },
      { id: 'paid_double_time', label: 'Were you paid double time (2x) for hours beyond 12 in a day?', type: 'yes_no' },
      { id: 'overtime_notes', label: 'Any additional notes about overtime or hours worked?', type: 'textarea' },
    ],
  },
  {
    id: 'final_wages',
    title: 'Final Wages',
    questions: [
      { id: 'separation_type', label: 'How did your employment end (or is it ongoing)?', type: 'select', options: ['Still Employed', 'I Was Terminated / Fired', 'I Resigned / Quit', 'Laid Off', 'Contract Ended', 'Other'] },
      { id: 'final_wages_timely', label: 'If separated, were your final wages paid on your last day of work?', type: 'yes_no' },
      { id: 'final_wages_date', label: 'When were your final wages paid? (if known)', type: 'date' },
      { id: 'wages_still_owed', label: 'Do you believe you are still owed unpaid wages?', type: 'yes_no' },
      { id: 'wages_owed_estimate', label: 'Estimated amount still owed (if known)', type: 'text', placeholder: 'e.g., approximately $3,500', showIf: { questionId: 'wages_still_owed', value: 'yes' } },
    ],
  },
  {
    id: 'wage_statements',
    title: 'Wage Statements / Paystubs',
    questions: [
      { id: 'received_paystubs', label: 'Did you receive a paystub each pay period?', type: 'yes_no' },
      { id: 'paystubs_accurate', label: 'Were the hours and wages on your paystubs accurate?', type: 'yes_no' },
      { id: 'paystub_issues', label: 'What information was missing or incorrect on your paystubs? (Select all that apply)', type: 'multiselect', options: ["Employer's name / address", "Employee's name or ID number", 'Gross wages earned', 'Net wages', 'Total hours worked', 'Hourly pay rate', 'Deductions itemized', 'Pay period begin/end dates', 'Nothing was missing / N/A'] },
      { id: 'have_paystubs', label: 'Do you still have copies of your paystubs?', type: 'yes_no' },
    ],
  },
  {
    id: 'reimbursements',
    title: 'Reimbursements / Tools / Uniforms',
    questions: [
      { id: 'paid_for_tools', label: 'Did you pay out of pocket for tools, equipment, or supplies required for your job?', type: 'yes_no' },
      { id: 'tools_reimbursed', label: 'Were you reimbursed for these expenses?', type: 'yes_no', showIf: { questionId: 'paid_for_tools', value: 'yes' } },
      { id: 'uniform_required', label: 'Were you required to wear a specific uniform?', type: 'yes_no' },
      { id: 'uniform_paid_by_you', label: 'Did you pay for your own uniform?', type: 'yes_no', showIf: { questionId: 'uniform_required', value: 'yes' } },
      { id: 'drove_for_work', label: 'Did you use your personal vehicle for work?', type: 'yes_no' },
      { id: 'mileage_reimbursed', label: 'Were you reimbursed for mileage?', type: 'yes_no', showIf: { questionId: 'drove_for_work', value: 'yes' } },
      { id: 'other_expenses', label: 'Describe any other out-of-pocket business expenses', type: 'textarea' },
    ],
  },
  {
    id: 'wrongful_termination',
    title: 'Wrongful Termination',
    questions: [
      { id: 'was_terminated', label: 'Were you terminated or forced to resign?', type: 'yes_no' },
      { id: 'reason_given_for_termination', label: 'What reason were you given for your termination?', type: 'textarea', showIf: { questionId: 'was_terminated', value: 'yes' } },
      { id: 'believe_wrongful', label: 'Do you believe you were wrongfully or unlawfully terminated?', type: 'yes_no' },
      { id: 'wrongful_reason_belief', label: 'Why do you believe the termination was unlawful?', type: 'textarea', showIf: { questionId: 'believe_wrongful', value: 'yes' } },
      { id: 'received_written_warnings', label: 'Did you receive written warnings or write-ups before the termination?', type: 'yes_no' },
    ],
  },
  {
    id: 'retaliation',
    title: 'Retaliation',
    questions: [
      { id: 'made_complaint', label: 'Did you report a violation, file a complaint, or object to something you believed was illegal or wrong?', type: 'yes_no' },
      { id: 'complaint_subject', label: 'What did you report or complain about?', type: 'textarea', showIf: { questionId: 'made_complaint', value: 'yes' } },
      { id: 'negative_after_complaint', label: 'Did anything negative happen to you after you made the complaint?', type: 'yes_no' },
      { id: 'retaliation_description', label: 'Describe what negative actions occurred', type: 'textarea', showIf: { questionId: 'negative_after_complaint', value: 'yes' } },
    ],
  },
  {
    id: 'disability_leave',
    title: 'Disability / Medical Leave / Pregnancy',
    questions: [
      { id: 'took_medical_leave', label: 'Did you take medical or disability leave at any point?', type: 'yes_no' },
      { id: 'leave_approved', label: 'Was your leave approved by your employer?', type: 'yes_no', showIf: { questionId: 'took_medical_leave', value: 'yes' } },
      { id: 'leave_denied_retaliated', label: 'Were you denied leave or punished for taking leave?', type: 'yes_no', showIf: { questionId: 'took_medical_leave', value: 'yes' } },
      { id: 'requested_accommodation', label: 'Did you request a disability-related work accommodation?', type: 'yes_no' },
      { id: 'accommodation_denied', label: 'Was your accommodation request denied or ignored?', type: 'yes_no', showIf: { questionId: 'requested_accommodation', value: 'yes' } },
      { id: 'was_pregnant', label: 'Were you pregnant during your employment?', type: 'yes_no' },
      { id: 'pregnancy_different_treatment', label: 'Were you treated differently because of your pregnancy?', type: 'yes_no', showIf: { questionId: 'was_pregnant', value: 'yes' } },
    ],
  },
  {
    id: 'harassment',
    title: 'Harassment / Discrimination',
    questions: [
      { id: 'experienced_harassment', label: 'Did you experience harassment or discrimination in the workplace?', type: 'yes_no' },
      { id: 'harassment_type', label: 'What type of harassment or discrimination? (Select all that apply)', type: 'multiselect', options: ['Race / Color', 'National Origin / Ancestry', 'Sex / Gender', 'Sexual Harassment', 'Pregnancy', 'Age (40 or older)', 'Physical or Mental Disability', 'Religion', 'Sexual Orientation', 'Gender Identity / Expression', 'Military or Veteran Status', 'Other'], showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'harassment_description', label: 'Describe what happened, including dates if known', type: 'textarea', showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'reported_to_employer', label: 'Did you report the harassment or discrimination to your employer or HR?', type: 'yes_no', showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'employer_response', label: 'How did your employer respond to your report?', type: 'textarea', showIf: { questionId: 'reported_to_employer', value: 'yes' } },
    ],
  },
  {
    id: 'witnesses',
    title: 'Witnesses',
    questions: [
      { id: 'has_witnesses', label: 'Are there any witnesses who saw what happened and can support your claims?', type: 'yes_no' },
      { id: 'witness_list', label: 'List witnesses and contact information (if known)', type: 'textarea', helpText: 'Include name, relationship to you, and what they witnessed. You do not need to have all of this information.', showIf: { questionId: 'has_witnesses', value: 'yes' } },
      { id: 'coworkers_same_issues', label: 'Did other coworkers experience the same or similar issues?', type: 'yes_no' },
      { id: 'coworkers_details', label: 'Describe what you know about other coworkers\' experiences', type: 'textarea', showIf: { questionId: 'coworkers_same_issues', value: 'yes' } },
    ],
  },
  {
    id: 'documents_available',
    title: 'Documents You Have',
    questions: [
      { id: 'available_documents', label: 'Which of the following documents do you currently have? (Select all that apply)', type: 'multiselect', options: ['Paystubs', 'W-2 Forms', '1099 Forms', 'Time Records / Timesheets', 'Work Schedules', 'Text Messages', 'Emails', 'Termination Letter', "Doctor's Notes / Medical Records", 'Photographs or Videos', 'Company Handbook or Policies', 'Employment Contract or Offer Letter', 'Performance Reviews', 'Warning Letters / Write-Ups', 'Other Documents'] },
      { id: 'documents_notes', label: 'Any notes about your documents?', type: 'textarea', helpText: 'For example: "I have paystubs from Jan 2024 to Dec 2024 but nothing before that."' },
    ],
  },
  {
    id: 'additional',
    title: 'Additional Information',
    questions: [
      { id: 'prior_agency_complaints', label: 'Have you filed any complaints with a government agency (e.g., DLSE, DFEH/CRD, EEOC, Labor Commissioner)?', type: 'yes_no' },
      { id: 'agency_complaint_details', label: 'Please describe the complaint, agency name, and outcome if known', type: 'textarea', showIf: { questionId: 'prior_agency_complaints', value: 'yes' } },
      { id: 'prior_attorneys', label: 'Have you consulted with or hired any other attorneys about this matter?', type: 'yes_no' },
      { id: 'statute_of_limitations', label: 'Do you know if there are any deadlines approaching for your claims?', type: 'yes_no' },
      { id: 'additional_notes', label: 'Is there anything else you would like us to know about your situation?', type: 'textarea', helpText: 'Please share any other information that may be important to your case. There are no wrong answers.', placeholder: 'Any other details you think are important...' },
    ],
  },
]
