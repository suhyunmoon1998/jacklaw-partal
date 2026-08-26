import { Question } from '@/types'

/**
 * The client information form in Korean.
 *
 * Mirrors lib/intakeFormData.ts field for field: same ids, same types, same
 * option order. Generated from the English original so the two cannot drift.
 */
export interface IntakeSection {
  id: string
  title: string
  description?: string
  questions: Question[]
}

export const INTAKE_SECTIONS_KO: IntakeSection[] = [
  {
    id: 'basic-info',
    title: '기본 정보',
    description: '고객님의 개인 정보를 알려주세요',
    questions: [
      {
        id: 'legal_name',
        label: '법적 성명',
        type: 'text',
        placeholder: '신분증에 적힌 그대로',
      },
      {
        id: 'other_names',
        label: '사용하신 다른 이름 (결혼 전 성, 별칭 등)',
        type: 'text',
        placeholder: '해당 없으면 비워두세요',
      },
      {
        id: 'dob',
        label: '생년월일',
        type: 'date',
      },
      {
        id: 'current_address',
        label: '현재 주소',
        type: 'textarea',
        placeholder: '도로명 주소, 도시, 주, 우편번호',
      },
      {
        id: 'addresses_5_years',
        label: '최근 5년간 사셨던 주소',
        type: 'textarea',
        helpText: '주소별로 거주하신 기간을 함께 적어주세요',
      },
      {
        id: 'phone_number',
        label: '전화번호',
        type: 'phone',
      },
      {
        id: 'email_address',
        label: '이메일 주소',
        type: 'text',
        placeholder: 'you@example.com',
      },
    ],
  },

  {
    id: 'employment-info',
    title: '직장 / 근무 정보',
    description: '근무 상황에 대해 알려주세요',
    questions: [
      {
        id: 'current_employer_name',
        label: '현재 근무처 이름',
        type: 'text',
        placeholder: '현재 근무 중이 아니면 비워두세요',
      },
      {
        id: 'current_employer_address',
        label: '현재 근무처 주소',
        type: 'text',
      },
      {
        id: 'current_employer_phone',
        label: '현재 근무처 전화번호',
        type: 'phone',
      },
      {
        id: 'job_title',
        label: '직책 이름',
        type: 'text',
      },
      {
        id: 'employment_history',
        label: '근무 이력 (해당 기간)',
        type: 'textarea',
        helpText: '이전 직장, 근무 기간, 고용주를 적어주세요',
      },
      {
        id: 'self_employed',
        label: '자영업을 하시거나 사업체를 운영하고 계신가요?',
        type: 'yes_no',
      },
      {
        id: 'business_details',
        label: '그렇다면 사업체 이름과 하시는 일을 알려주세요',
        type: 'textarea',
        showIf: { questionId: 'self_employed', value: 'yes' },
      },
    ],
  },

  {
    id: 'language',
    title: '언어',
    questions: [
      {
        id: 'english_comfortable',
        label: '영어로 말하고 읽고 쓰시는 데 불편함이 없으신가요?',
        type: 'yes_no',
      },
      {
        id: 'main_language',
        label: '주로 사용하시는 언어는 무엇인가요?',
        type: 'text',
      },
    ],
  },

  {
    id: 'what-happened',
    title: '무슨 일이 있었나',
    description: '무슨 일이 있었는지 자세히 알려주세요',
    questions: [
      {
        id: 'what_happened',
        label: '무슨 일이 있었는지 설명해 주세요. 날짜, 시간, 장소를 포함하고 그 일 전·중·후에 각각 무슨 일이 있었는지 알려주세요.',
        type: 'textarea',
        placeholder: '기억나시는 만큼 자세히 적어주세요',
      },
    ],
  },

  {
    id: 'witnesses',
    title: '목격자 / 관련된 사람',
    description: '이 일을 알고 있는 사람에 대해 알려주세요',
    questions: [
      {
        id: 'witnesses_present',
        label: '그 일을 직접 본 사람의 이름',
        type: 'textarea',
        placeholder: '목격자가 없으면 비워두세요',
      },
      {
        id: 'witnesses_aware',
        label: '그 일을 알고 있는 사람의 이름 (직접 보지 않았더라도)',
        type: 'textarea',
        placeholder: '해당 없으면 비워두세요',
      },
      {
        id: 'witnesses_contact',
        label: '목격자 연락처 (아시는 경우)',
        type: 'textarea',
        helpText: '전화번호, 이메일, 주소',
      },
      {
        id: 'witnesses_details',
        label: '각각 무엇을 알고 있나요?',
        type: 'textarea',
        helpText: '목격자별로 이 일에 대해 무엇을 알고 있는지 적어주세요',
      },
    ],
  },

  {
    id: 'documents-evidence',
    title: '서류 / 증거',
    questions: [
      {
        id: 'has_documents',
        label: '이 일과 관련된 사진, 영상, 문자, 이메일, 녹음, 메모, 보고서, 계약서, 급여명세서, 진료 기록이 있으신가요?',
        type: 'yes_no',
      },
      {
        id: 'documents_list',
        label: '어떤 서류를 가지고 계신가요?',
        type: 'textarea',
        placeholder: '서류 종류를 나열하고 간단히 설명해 주세요',
        showIf: { questionId: 'has_documents', value: 'yes' },
      },
      {
        id: 'documents_who_has',
        label: '그 서류는 누가 가지고 있나요?',
        type: 'textarea',
        helpText: '현재 누가 보관하고 있나요?',
        showIf: { questionId: 'has_documents', value: 'yes' },
      },
    ],
  },

  {
    id: 'statements',
    title: '진술',
    questions: [
      {
        id: 'has_statements',
        label: '고객님이나 다른 사람이 이 일에 대해 서면·녹음·구두로 진술한 적이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'statements_details',
        label: '있다면 언제, 누구에게, 어떤 형태로 하셨나요? (서면, 녹음, 구두)',
        type: 'textarea',
        showIf: { questionId: 'has_statements', value: 'yes' },
      },
    ],
  },

  {
    id: 'injuries-harm',
    title: '부상 / 피해',
    description: '겪으신 신체적·정서적·정신적 피해를 알려주세요',
    questions: [
      {
        id: 'suffered_harm',
        label: '신체적·정서적·정신적 피해를 입으셨나요?',
        type: 'yes_no',
      },
      {
        id: 'harm_symptoms',
        label: '어떤 증상이나 어려움이 있었나요?',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_start_date',
        label: '언제부터 시작되었나요?',
        type: 'date',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_ongoing',
        label: '그 문제가 지금도 계속되고 있나요?',
        type: 'yes_no',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_treatment',
        label: '어떤 치료를 받으셨나요? (진료, 입원, 상담 등)',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_healthcare_providers',
        label: '의사, 병원, 의원의 이름',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
    ],
  },

  {
    id: 'lost-wages',
    title: '임금 손실 / 소득 손실',
    questions: [
      {
        id: 'missed_work',
        label: '이 일 때문에 결근하신 적이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'missed_dates',
        label: '결근하신 날짜는 언제인가요?',
        type: 'textarea',
        showIf: { questionId: 'missed_work', value: 'yes' },
      },
      {
        id: 'income_lost_amount',
        label: '소득 손실은 얼마인가요?',
        type: 'text',
        placeholder: '금액 (달러)',
        showIf: { questionId: 'missed_work', value: 'yes' },
      },
      {
        id: 'income_calculation',
        label: '그 금액은 어떻게 계산하셨나요?',
        type: 'textarea',
        placeholder: '계산 방식을 적어주세요 (예: 시급 × 시간)',
        showIf: { questionId: 'missed_work', value: 'yes' },
      },
    ],
  },

  {
    id: 'other-damages',
    title: '그 밖의 손해',
    questions: [
      {
        id: 'property_damage',
        label: '재산 피해가 있었나요?',
        type: 'yes_no',
      },
      {
        id: 'property_damage_details',
        label: '재산 피해 내용과 금액을 알려주세요',
        type: 'textarea',
        showIf: { questionId: 'property_damage', value: 'yes' },
      },
      {
        id: 'medical_expenses',
        label: '의료비나 진료비 지출이 있으신가요?',
        type: 'yes_no',
      },
      {
        id: 'medical_expenses_amount',
        label: '의료비 합계',
        type: 'text',
        placeholder: '금액 (달러)',
        showIf: { questionId: 'medical_expenses', value: 'yes' },
      },
      {
        id: 'other_expenses',
        label: '그 밖에 본인 돈으로 쓰신 비용이 있나요? (교통비, 육아비 등)',
        type: 'yes_no',
      },
      {
        id: 'other_expenses_details',
        label: '그 밖의 비용 항목과 금액을 알려주세요',
        type: 'textarea',
        showIf: { questionId: 'other_expenses', value: 'yes' },
      },
    ],
  },

  {
    id: 'insurance',
    title: '보험',
    questions: [
      {
        id: 'has_insurance',
        label: '이 일과 관련이 있을 만한 보험이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'insurance_details',
        label: '있다면 어느 보험사, 어떤 종류이며, 청구를 하셨나요?',
        type: 'textarea',
        showIf: { questionId: 'has_insurance', value: 'yes' },
      },
    ],
  },

  {
    id: 'prior-claims',
    title: '이전의 청구 / 소송',
    questions: [
      {
        id: 'similar_claim_before',
        label: '전에 비슷한 청구를 하신 적이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'similar_lawsuit_before',
        label: '전에 비슷한 소송에 관여하신 적이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'workers_comp_claim',
        label: '산재 보상을 신청하신 적이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'prior_claims_details',
        label: '위 항목 중 해당되는 것이 있다면 시기와 결과를 알려주세요',
        type: 'textarea',
        helpText: '날짜와 처리 결과를 함께 적어주세요',
      },
    ],
  },

  {
    id: 'response-other-side',
    title: '상대방 주장에 대한 반박',
    description: '상대방이 고객님의 설명을 부인한다면, 왜 그것이 틀렸는지 설명해 주세요',
    questions: [
      {
        id: 'response_to_other_side',
        label: '상대방이 아무 일도 없었다고 하거나, 고객님 잘못이라고 하거나, 피해를 부풀렸다고 한다면 왜 그것이 틀렸는지 설명해 주세요. 고객님 입장을 뒷받침하는 사실, 목격자, 서류를 알려주세요.',
        type: 'textarea',
      },
    ],
  },

  {
    id: 'pay-schedule',
    title: '급여와 근무 일정',
    questions: [
      {
        id: 'pay_type',
        label: '급여를 어떤 방식으로 받으셨나요?',
        type: 'select',
        options: [
          '시급',
          '고정 급여 (월급/연봉)',
          '수수료 (커미션)',
          '개수당 (피스레이트)',
          '기타',
        ],
      },
      {
        id: 'pay_rate',
        label: '급여 수준은 어떻게 되나요?',
        type: 'text',
        placeholder: '예: 시간당 $18 또는 연 $60,000',
      },
      {
        id: 'usual_workdays',
        label: '보통 어떤 요일에 근무하셨나요?',
        type: 'text',
        placeholder: '예: 월요일~금요일',
      },
      {
        id: 'usual_hours',
        label: '보통 하루 근무 시간은 몇 시부터 몇 시까지였나요?',
        type: 'text',
        placeholder: '예: 오전 9시부터 오후 5시까지',
      },
    ],
  },

  {
    id: 'breaks-overtime',
    title: '휴게시간과 초과근무',
    questions: [
      {
        id: 'meal_breaks',
        label: '식사 휴게시간을 쓰실 수 있었나요?',
        type: 'yes_no',
      },
      {
        id: 'rest_breaks',
        label: '휴식시간을 쓰실 수 있었나요?',
        type: 'yes_no',
      },
      {
        id: 'worked_overtime',
        label: '초과근무를 하셨나요?',
        type: 'yes_no',
      },
      {
        id: 'paid_all_hours',
        label: '일하신 모든 시간에 대해 급여를 받으셨나요?',
        type: 'yes_no',
      },
    ],
  },

  {
    id: 'supervisors-hr',
    title: '상사 / 인사',
    questions: [
      {
        id: 'supervisor_name',
        label: '누가 고객님을 관리했나요?',
        type: 'text',
      },
      {
        id: 'hr_contact',
        label: '인사나 급여는 누가 담당했나요?',
        type: 'text',
      },
      {
        id: 'complained_to',
        label: '문제를 제기하셨다면 누구에게 하셨나요?',
        type: 'text',
      },
    ],
  },

  {
    id: 'termination-discipline',
    title: '해고 / 징계 / 문제 제기 이력',
    questions: [
      {
        id: 'was_disciplined',
        label: '징계, 정직, 해고를 당하신 적이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'discipline_date',
        label: '언제였나요?',
        type: 'date',
        showIf: { questionId: 'was_disciplined', value: 'yes' },
      },
      {
        id: 'discipline_reason_given',
        label: '어떤 이유를 들으셨나요?',
        type: 'textarea',
        showIf: { questionId: 'was_disciplined', value: 'yes' },
      },
      {
        id: 'prior_complaint',
        label: '그 일이 있기 전에 임금, 괴롭힘, 차별, 보복, 안전, 근로조건에 대해 문제를 제기하신 적이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'complaint_details',
        label: '있다면 그 내용을 알려주세요',
        type: 'textarea',
        showIf: { questionId: 'prior_complaint', value: 'yes' },
      },
    ],
  },

  {
    id: 'discrimination-retaliation',
    title: '차별 / 보복 / 휴가 / 편의 제공',
    questions: [
      {
        id: 'unfair_treatment',
        label: '법으로 보호되는 사유 때문에 부당한 대우를 받으셨나요? (인종, 성별, 장애, 나이, 종교 등)',
        type: 'yes_no',
      },
      {
        id: 'unfair_treatment_details',
        label: '있다면 어떤 대우였는지 알려주세요',
        type: 'textarea',
        showIf: { questionId: 'unfair_treatment', value: 'yes' },
      },
      {
        id: 'requested_leave',
        label: '의료 휴가나 편의 제공을 요청하신 적이 있나요?',
        type: 'yes_no',
      },
      {
        id: 'leave_requested',
        label: '무엇을 요청하셨나요?',
        type: 'textarea',
        showIf: { questionId: 'requested_leave', value: 'yes' },
      },
      {
        id: 'employer_response',
        label: '고용주는 어떻게 대응했나요?',
        type: 'textarea',
        showIf: { questionId: 'requested_leave', value: 'yes' },
      },
    ],
  },
]
