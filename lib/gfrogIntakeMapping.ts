// Maps client intake form questions to GFROG interrogatory numbers
// This allows automatic response generation from intake data

export interface IntakeToGFROGMapping {
  intakeQuestionId: string
  intakeLabel: string
  gfrogNumbers: string[] // e.g., ["1.1", "2.1", "2.2"]
  transformFn?: (answer: string | unknown) => string
}

export const INTAKE_TO_GFROG_MAPPING: IntakeToGFROGMapping[] = [
  // IDENTITY SECTION
  {
    intakeQuestionId: 'legal_name',
    intakeLabel: 'Full Legal Name',
    gfrogNumbers: ['1.1'],
  },
  {
    intakeQuestionId: 'other_names',
    intakeLabel: 'Any Other Names Used',
    gfrogNumbers: ['1.1'],
  },

  // GENERAL BACKGROUND - INDIVIDUAL
  {
    intakeQuestionId: 'legal_name',
    intakeLabel: 'Full Legal Name',
    gfrogNumbers: ['2.1'],
  },
  {
    intakeQuestionId: 'dob',
    intakeLabel: 'Date of Birth',
    gfrogNumbers: ['2.1'],
  },
  {
    intakeQuestionId: 'current_address',
    intakeLabel: 'Current Address',
    gfrogNumbers: ['2.1', '2.2'],
  },
  {
    intakeQuestionId: 'addresses_5_years',
    intakeLabel: 'Addresses in Last 5 Years',
    gfrogNumbers: ['2.2'],
  },
  {
    intakeQuestionId: 'phone_number',
    intakeLabel: 'Phone Number',
    gfrogNumbers: ['2.1'],
  },
  {
    intakeQuestionId: 'email_address',
    intakeLabel: 'Email Address',
    gfrogNumbers: ['2.1'],
  },
  {
    intakeQuestionId: 'main_language',
    intakeLabel: 'Main Language',
    gfrogNumbers: ['2.1'],
  },

  // EMPLOYMENT INFORMATION
  {
    intakeQuestionId: 'current_employer_name',
    intakeLabel: 'Current Employer Name',
    gfrogNumbers: ['2.3', '3.1'],
  },
  {
    intakeQuestionId: 'current_employer_address',
    intakeLabel: 'Current Employer Address',
    gfrogNumbers: ['2.3', '3.2'],
  },
  {
    intakeQuestionId: 'current_employer_phone',
    intakeLabel: 'Current Employer Phone',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'job_title',
    intakeLabel: 'Your Job Title',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'employment_history',
    intakeLabel: 'Employment History',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'self_employed',
    intakeLabel: 'Self-Employed Status',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'business_details',
    intakeLabel: 'Business Details',
    gfrogNumbers: ['2.4', '3.1'],
  },

  // INSURANCE
  {
    intakeQuestionId: 'has_insurance',
    intakeLabel: 'Insurance Coverage',
    gfrogNumbers: ['4.1', '4.2'],
  },
  {
    intakeQuestionId: 'insurance_details',
    intakeLabel: 'Insurance Details',
    gfrogNumbers: ['4.1', '4.2'],
  },

  // INJURIES & HARM
  {
    intakeQuestionId: 'suffered_harm',
    intakeLabel: 'Suffered Harm',
    gfrogNumbers: ['6.1', '6.2'],
  },
  {
    intakeQuestionId: 'harm_symptoms',
    intakeLabel: 'Symptoms or Problems',
    gfrogNumbers: ['6.2'],
  },
  {
    intakeQuestionId: 'harm_start_date',
    intakeLabel: 'When Harm Started',
    gfrogNumbers: ['6.2'],
  },
  {
    intakeQuestionId: 'harm_ongoing',
    intakeLabel: 'Ongoing Problems',
    gfrogNumbers: ['6.4'],
  },
  {
    intakeQuestionId: 'harm_treatment',
    intakeLabel: 'Medical Treatment',
    gfrogNumbers: ['6.3'],
  },
  {
    intakeQuestionId: 'harm_healthcare_providers',
    intakeLabel: 'Healthcare Providers',
    gfrogNumbers: ['6.3', '10.1', '10.2'],
  },

  // PROPERTY DAMAGE
  {
    intakeQuestionId: 'property_damage',
    intakeLabel: 'Property Damage',
    gfrogNumbers: ['7.1', '7.2', '7.3'],
  },
  {
    intakeQuestionId: 'property_damage_details',
    intakeLabel: 'Property Damage Details',
    gfrogNumbers: ['7.2', '7.3'],
  },

  // LOST INCOME
  {
    intakeQuestionId: 'missed_work',
    intakeLabel: 'Missed Work',
    gfrogNumbers: ['8.1', '8.3'],
  },
  {
    intakeQuestionId: 'missed_dates',
    intakeLabel: 'Dates Missed Work',
    gfrogNumbers: ['8.3'],
  },
  {
    intakeQuestionId: 'income_lost_amount',
    intakeLabel: 'Income Lost Amount',
    gfrogNumbers: ['8.3', '8.4'],
  },
  {
    intakeQuestionId: 'income_calculation',
    intakeLabel: 'Income Calculation',
    gfrogNumbers: ['8.3', '8.4'],
  },

  // OTHER DAMAGES
  {
    intakeQuestionId: 'medical_expenses',
    intakeLabel: 'Medical Expenses',
    gfrogNumbers: ['9.1', '9.2'],
  },
  {
    intakeQuestionId: 'medical_expenses_amount',
    intakeLabel: 'Medical Expenses Amount',
    gfrogNumbers: ['9.1', '9.2'],
  },
  {
    intakeQuestionId: 'other_expenses',
    intakeLabel: 'Other Out-of-Pocket Costs',
    gfrogNumbers: ['9.1', '9.2'],
  },
  {
    intakeQuestionId: 'other_expenses_details',
    intakeLabel: 'Other Expenses Details',
    gfrogNumbers: ['9.1', '9.2'],
  },

  // PRIOR MEDICAL HISTORY
  {
    intakeQuestionId: 'prior_medical_history',
    intakeLabel: 'Prior Medical Conditions',
    gfrogNumbers: ['10.1', '10.2'],
  },

  // PRIOR CLAIMS
  {
    intakeQuestionId: 'similar_claim_before',
    intakeLabel: 'Similar Claims Before',
    gfrogNumbers: ['11.1'],
  },
  {
    intakeQuestionId: 'similar_lawsuit_before',
    intakeLabel: 'Similar Lawsuits Before',
    gfrogNumbers: ['11.1'],
  },
  {
    intakeQuestionId: 'workers_comp_claim',
    intakeLabel: 'Workers Comp Claim',
    gfrogNumbers: ['11.1'],
  },
  {
    intakeQuestionId: 'prior_claims_details',
    intakeLabel: 'Prior Claims Details',
    gfrogNumbers: ['11.1', '11.2'],
  },

  // INVESTIGATION
  {
    intakeQuestionId: 'witnesses_present',
    intakeLabel: 'Witnesses Present',
    gfrogNumbers: ['12.2'],
  },
  {
    intakeQuestionId: 'witnesses_aware',
    intakeLabel: 'People Aware',
    gfrogNumbers: ['12.2'],
  },
  {
    intakeQuestionId: 'witnesses_contact',
    intakeLabel: 'Witness Contact Info',
    gfrogNumbers: ['12.2'],
  },
  {
    intakeQuestionId: 'witnesses_details',
    intakeLabel: 'What Witnesses Know',
    gfrogNumbers: ['12.2', '12.3'],
  },
  {
    intakeQuestionId: 'has_documents',
    intakeLabel: 'Has Documents/Evidence',
    gfrogNumbers: ['12.5'],
  },
  {
    intakeQuestionId: 'documents_list',
    intakeLabel: 'Documents List',
    gfrogNumbers: ['12.5'],
  },
  {
    intakeQuestionId: 'has_statements',
    intakeLabel: 'Has Statements',
    gfrogNumbers: ['12.3'],
  },
  {
    intakeQuestionId: 'statements_details',
    intakeLabel: 'Statements Details',
    gfrogNumbers: ['12.3'],
  },

  // INCIDENT DETAILS (General)
  {
    intakeQuestionId: 'what_happened',
    intakeLabel: 'What Happened',
    gfrogNumbers: ['12.1', '12.4', '16.1', '20.4'],
  },

  // PAY AND SCHEDULE
  {
    intakeQuestionId: 'pay_type',
    intakeLabel: 'Pay Type',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'pay_rate',
    intakeLabel: 'Pay Rate',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'usual_workdays',
    intakeLabel: 'Usual Workdays',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'usual_hours',
    intakeLabel: 'Usual Work Hours',
    gfrogNumbers: ['2.3'],
  },

  // BREAKS AND OVERTIME
  {
    intakeQuestionId: 'meal_breaks',
    intakeLabel: 'Meal Breaks',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'rest_breaks',
    intakeLabel: 'Rest Breaks',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'worked_overtime',
    intakeLabel: 'Worked Overtime',
    gfrogNumbers: ['8.8'],
  },
  {
    intakeQuestionId: 'paid_all_hours',
    intakeLabel: 'Paid for All Hours',
    gfrogNumbers: ['8.7', '8.8'],
  },

  // SUPERVISORS/HR
  {
    intakeQuestionId: 'supervisor_name',
    intakeLabel: 'Supervisor Name',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'hr_contact',
    intakeLabel: 'HR Contact',
    gfrogNumbers: ['2.3'],
  },
  {
    intakeQuestionId: 'complained_to',
    intakeLabel: 'Complained To',
    gfrogNumbers: ['2.3'],
  },

  // TERMINATION/DISCIPLINE
  {
    intakeQuestionId: 'was_disciplined',
    intakeLabel: 'Was Disciplined',
    gfrogNumbers: ['16.1'],
  },
  {
    intakeQuestionId: 'discipline_date',
    intakeLabel: 'Discipline Date',
    gfrogNumbers: ['16.1'],
  },
  {
    intakeQuestionId: 'discipline_reason_given',
    intakeLabel: 'Reason Given',
    gfrogNumbers: ['16.1'],
  },
  {
    intakeQuestionId: 'prior_complaint',
    intakeLabel: 'Prior Complaint',
    gfrogNumbers: ['16.1'],
  },
  {
    intakeQuestionId: 'complaint_details',
    intakeLabel: 'Complaint Details',
    gfrogNumbers: ['16.1'],
  },

  // DISCRIMINATION/RETALIATION
  {
    intakeQuestionId: 'unfair_treatment',
    intakeLabel: 'Unfair Treatment',
    gfrogNumbers: ['16.1', '16.2'],
  },
  {
    intakeQuestionId: 'unfair_treatment_details',
    intakeLabel: 'Unfair Treatment Details',
    gfrogNumbers: ['16.1', '16.2'],
  },
  {
    intakeQuestionId: 'requested_leave',
    intakeLabel: 'Requested Leave/Accommodation',
    gfrogNumbers: ['16.1'],
  },
  {
    intakeQuestionId: 'leave_requested',
    intakeLabel: 'What Was Requested',
    gfrogNumbers: ['16.1'],
  },
  {
    intakeQuestionId: 'employer_response',
    intakeLabel: 'Employer Response',
    gfrogNumbers: ['16.1'],
  },

  // RESPONSE TO OTHER SIDE
  {
    intakeQuestionId: 'response_to_other_side',
    intakeLabel: 'Response to Other Side',
    gfrogNumbers: ['15.1', '16.1'],
  },
]

export function getGFROGNumbersForQuestion(intakeQuestionId: string): string[] {
  const mapping = INTAKE_TO_GFROG_MAPPING.find(m => m.intakeQuestionId === intakeQuestionId)
  return mapping?.gfrogNumbers ?? []
}

export function getIntakeQuestionsForGFROG(gfrogNumber: string): IntakeToGFROGMapping[] {
  return INTAKE_TO_GFROG_MAPPING.filter(m => m.gfrogNumbers.includes(gfrogNumber))
}
