import { QuestionnaireSection } from '@/types'

/**
 * The default onboarding questionnaire in Korean.
 *
 * Mirrors lib/questionnaireData.ts question for question: same ids, same types,
 * same option order. Only what the client reads changes. The values `showIf`
 * tests ('yes', 'no', 'not_sure') are stored literals and never translated, so
 * skip logic behaves identically in every language.
 */
export const QUESTIONNAIRE_SECTIONS_KO: QuestionnaireSection[] = [
  {
    id: 'contact',
    title: '연락처 정보',
    questions: [
      { id: 'full_name', label: '법적 성명', type: 'text', required: true, placeholder: '신분증에 적힌 그대로' },
      { id: 'dob', label: '생년월일', type: 'date', required: true },
      { id: 'address', label: '주소', type: 'text', required: true },
      { id: 'city_state_zip', label: '도시, 주, 우편번호', type: 'text', required: true },
      { id: 'alt_phone', label: '다른 연락처', type: 'phone', placeholder: '(555) 000-0000' },
      { id: 'email', label: '이메일 주소', type: 'text', placeholder: 'you@example.com' },
      { id: 'preferred_language', label: '선호하는 언어', type: 'select', options: ['영어', '스페인어', '중국어', '한국어', '기타'] },
    ],
  },
  {
    id: 'employer',
    title: '고용주 정보',
    questions: [
      { id: 'employer_name', label: '고용주 / 회사 이름', type: 'text', required: true },
      { id: 'employer_address', label: '회사 주소', type: 'text' },
      { id: 'employer_city_state', label: '도시, 주', type: 'text' },
      { id: 'supervisor_name', label: '상사 / 매니저 이름', type: 'text' },
      { id: 'supervisor_phone', label: '상사 전화번호 (아시는 경우)', type: 'phone', placeholder: '(555) 000-0000' },
      { id: 'hr_contact', label: '인사팀 담당자 이름 또는 부서', type: 'text' },
      { id: 'industry', label: '업종 / 사업 종류', type: 'text', placeholder: '예: 음식점, 소매, 건설' },
    ],
  },
  {
    id: 'dates_worked',
    title: '근무 기간',
    questions: [
      { id: 'start_date', label: '일을 시작한 날짜', type: 'date' },
      { id: 'start_date_unsure', label: '시작한 날짜가 정확히 기억나지 않으세요?', type: 'yes_no' },
      { id: 'start_date_approx', label: '대략적인 시작 시기', type: 'text', placeholder: '예: "2022년 봄" 또는 "2022년 3월쯤"', showIf: { questionId: 'start_date_unsure', value: 'yes' } },
      { id: 'still_employed', label: '지금도 그곳에서 일하고 계신가요?', type: 'yes_no', required: true },
      { id: 'end_date', label: '마지막으로 일한 날', type: 'date', showIf: { questionId: 'still_employed', value: 'no' } },
      { id: 'end_date_unsure', label: '마지막 근무일이 정확히 기억나지 않으세요?', type: 'yes_no', showIf: { questionId: 'still_employed', value: 'no' } },
      { id: 'end_date_approx', label: '대략적인 마지막 근무 시기', type: 'text', placeholder: '예: "2023년 말" 또는 "2023년 11월쯤"', showIf: { questionId: 'end_date_unsure', value: 'yes' } },
      { id: 'employment_type', label: '고용 형태', type: 'select', options: ['정규직 (풀타임)', '파트타임', '시즌직', '임시직 / 인력 파견업체', '계약직', '기타'] },
    ],
  },
  {
    id: 'position',
    title: '직책과 담당 업무',
    questions: [
      { id: 'job_title', label: '직책 이름', type: 'text', required: true },
      { id: 'job_duties', label: '담당하신 업무를 설명해 주세요', type: 'textarea', required: true, placeholder: '평소 하루에 어떤 일을 하셨나요?' },
      { id: 'classification', label: '직원으로 분류되셨나요, 독립 계약자로 분류되셨나요?', type: 'select', options: ['직원', '독립 계약자', '잘 모르겠음'] },
      { id: 'misclassified', label: '독립 계약자로 잘못 분류되었다고 생각하시나요?', type: 'yes_no' },
      { id: 'exempt', label: '"면제(exempt)" 직원 또는 월급제라서 초과근무 수당 대상이 아니라는 말을 들으셨나요?', type: 'yes_no' },
    ],
  },
  {
    id: 'pay_rate',
    title: '급여',
    questions: [
      { id: 'pay_type', label: '급여를 어떤 방식으로 받으셨나요?', type: 'select', required: true, options: ['시급', '고정 급여 (월급/연봉)', '수수료 (커미션)', '개수당 (피스레이트)', '일당', '기타'] },
      { id: 'hourly_rate', label: '시급 (해당되는 경우)', type: 'currency', placeholder: '18.00' },
      { id: 'salary_amount', label: '고정 급여 액수 (해당되는 경우)', type: 'text', placeholder: '예: 연 $60,000' },
      { id: 'received_tips', label: '팁을 받으셨나요?', type: 'yes_no' },
      { id: 'pay_changed', label: '근무 중에 급여가 바뀐 적이 있나요?', type: 'yes_no' },
      { id: 'pay_change_notes', label: '급여가 어떻게 바뀌었는지 알려주세요', type: 'textarea', showIf: { questionId: 'pay_changed', value: 'yes' } },
    ],
  },
  {
    id: 'schedule',
    title: '근무 일정',
    questions: [
      { id: 'days_per_week', label: '보통 일주일에 며칠 일하셨나요?', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7'] },
      { id: 'hours_per_day', label: '보통 하루에 몇 시간 일하셨나요?', type: 'text', placeholder: '예: 하루 9시간' },
      { id: 'schedule_type', label: '근무 일정은 어떤 형태였나요?', type: 'select', options: ['고정 (매주 같은 요일·시간)', '교대 근무', '온콜 (호출 대기)', '불규칙 / 유동적', '기타'] },
      { id: 'schedule_notes', label: '평소 근무 일정을 설명해 주세요', type: 'textarea', placeholder: '예: 월요일~금요일, 오전 7시부터 오후 4시까지' },
    ],
  },
  {
    id: 'timekeeping',
    title: '근무시간 기록 방식',
    questions: [
      { id: 'timekeeping_method', label: '고용주는 근무시간을 어떻게 기록했나요?', type: 'select', options: ['출퇴근 기록기 / 카드 스캐너', '생체 인식 (지문 / 얼굴)', '종이 근무시간표', '전자 근무시간표 / 앱', '매니저가 대신 기록', '공식적인 기록 없음', '기타'] },
      { id: 'clock_in_out', label: '출퇴근 기록을 본인이 직접 하셨나요?', type: 'yes_no' },
      { id: 'employer_altered', label: '고용주가 근무시간 기록을 바꾸거나 지운 적이 있나요?', type: 'yes_no' },
      { id: 'alteration_details', label: '근무시간 기록에 무슨 일이 있었는지 설명해 주세요', type: 'textarea', showIf: { questionId: 'employer_altered', value: 'yes' } },
    ],
  },
  {
    id: 'meal_breaks',
    title: '식사 휴게시간',
    questions: [
      { id: 'meal_break_provided', label: '방해받지 않는 30분 식사 휴게시간을 온전히 받으셨나요?', type: 'yes_no', required: true },
      { id: 'meal_break_5hrs', label: '5시간을 넘겨 일한 날에는 식사 휴게시간이 주어졌나요?', type: 'yes_no' },
      { id: 'meal_break_10hrs', label: '10시간을 넘겨 일한 날에는 두 번째 식사 휴게시간이 주어졌나요?', type: 'yes_no' },
      { id: 'meal_break_interrupted', label: '식사 휴게시간이 업무 때문에 중단되거나 짧아진 적이 있나요?', type: 'yes_no' },
      { id: 'meal_break_pressure', label: '식사 휴게시간을 건너뛰도록 압박받거나, 요구받거나, 그래야 하는 분위기였나요?', type: 'yes_no' },
      { id: 'meal_premium_paid', label: '놓치거나 늦어진 식사 휴게시간에 대해 1시간분 추가 수당(premium pay)을 받으셨나요?', type: 'yes_no' },
    ],
  },
  {
    id: 'rest_breaks',
    title: '휴식시간',
    questions: [
      { id: 'rest_break_provided', label: '유급 10분 휴식시간을 받으셨나요?', type: 'yes_no', required: true },
      { id: 'rest_break_frequency', label: '대략 4시간 근무마다 휴식시간이 주어졌나요?', type: 'yes_no' },
      { id: 'rest_break_skipped', label: '휴식시간을 자주 건너뛰셨나요?', type: 'yes_no' },
      { id: 'rest_break_pressure', label: '휴식시간을 건너뛰도록 압박받거나 그래야 하는 분위기였나요?', type: 'yes_no' },
      { id: 'rest_premium_paid', label: '놓친 휴식시간에 대해 1시간분 추가 수당을 받으셨나요?', type: 'yes_no' },
    ],
  },
  {
    id: 'overtime',
    title: '초과근무',
    questions: [
      { id: 'worked_over_8', label: '하루 8시간을 넘겨 일하는 날이 잦았나요?', type: 'yes_no' },
      { id: 'worked_over_12', label: '하루 12시간을 넘겨 일하는 날이 잦았나요?', type: 'yes_no' },
      { id: 'worked_over_40', label: '한 주에 40시간을 넘겨 일하는 경우가 잦았나요?', type: 'yes_no' },
      { id: 'paid_overtime', label: '초과근무 시간에 대해 1.5배 수당을 받으셨나요?', type: 'yes_no' },
      { id: 'paid_double_time', label: '하루 12시간을 넘긴 시간에 대해 2배 수당을 받으셨나요?', type: 'yes_no' },
      { id: 'overtime_notes', label: '초과근무나 근무시간에 대해 더 알려주실 내용이 있나요?', type: 'textarea' },
    ],
  },
  {
    id: 'final_wages',
    title: '마지막 급여',
    questions: [
      { id: 'separation_type', label: '고용 관계가 어떻게 끝났나요 (아니면 계속되고 있나요)?', type: 'select', options: ['아직 재직 중', '해고당함', '자진 퇴사', '정리해고', '계약 만료', '기타'] },
      { id: 'final_wages_timely', label: '퇴사하셨다면, 마지막 급여를 마지막 근무일에 받으셨나요?', type: 'yes_no' },
      { id: 'final_wages_date', label: '마지막 급여는 언제 지급되었나요? (아시는 경우)', type: 'date' },
      { id: 'wages_still_owed', label: '아직 받지 못한 임금이 있다고 생각하시나요?', type: 'yes_no' },
      { id: 'wages_owed_estimate', label: '아직 못 받은 것으로 추정되는 금액 (아시는 경우)', type: 'text', placeholder: '예: 대략 $3,500', showIf: { questionId: 'wages_still_owed', value: 'yes' } },
    ],
  },
  {
    id: 'wage_statements',
    title: '급여명세서 (페이스텁)',
    questions: [
      { id: 'received_paystubs', label: '급여를 받을 때마다 급여명세서를 받으셨나요?', type: 'yes_no' },
      { id: 'paystubs_accurate', label: '급여명세서의 근무시간과 임금이 정확했나요?', type: 'yes_no' },
      { id: 'paystub_issues', label: '급여명세서에서 빠졌거나 틀린 정보는 무엇인가요? (해당되는 것 모두 선택)', type: 'multiselect', options: ['고용주 이름 / 주소', '직원 이름 또는 사번', '세전 총임금', '세후 실수령액', '총 근무시간', '시급', '공제 항목 내역', '급여 기간 시작·종료일', '빠진 것 없음 / 해당 없음'] },
      { id: 'have_paystubs', label: '급여명세서 사본을 아직 가지고 계신가요?', type: 'yes_no' },
    ],
  },
  {
    id: 'reimbursements',
    title: '비용 정산 / 장비 / 유니폼',
    questions: [
      { id: 'paid_for_tools', label: '업무에 필요한 공구, 장비, 물품을 본인 돈으로 사신 적이 있나요?', type: 'yes_no' },
      { id: 'tools_reimbursed', label: '그 비용을 회사에서 돌려받으셨나요?', type: 'yes_no', showIf: { questionId: 'paid_for_tools', value: 'yes' } },
      { id: 'uniform_required', label: '지정된 유니폼을 입어야 했나요?', type: 'yes_no' },
      { id: 'uniform_paid_by_you', label: '유니폼 값을 본인이 내셨나요?', type: 'yes_no', showIf: { questionId: 'uniform_required', value: 'yes' } },
      { id: 'drove_for_work', label: '업무에 본인 차량을 사용하셨나요?', type: 'yes_no' },
      { id: 'mileage_reimbursed', label: '주행거리 비용을 정산받으셨나요?', type: 'yes_no', showIf: { questionId: 'drove_for_work', value: 'yes' } },
      { id: 'other_expenses', label: '본인 돈으로 부담한 다른 업무 비용이 있으면 알려주세요', type: 'textarea' },
    ],
  },
  {
    id: 'wrongful_termination',
    title: '부당해고',
    showIf: { questionId: 'still_employed', value: 'no' },
    questions: [
      { id: 'was_terminated', label: '해고당하셨나요, 아니면 사직을 강요받으셨나요?', type: 'yes_no' },
      { id: 'reason_given_for_termination', label: '회사가 밝힌 해고 사유는 무엇이었나요?', type: 'textarea', showIf: { questionId: 'was_terminated', value: 'yes' } },
      { id: 'believe_wrongful', label: '이 해고가 부당하거나 위법하다고 생각하시나요?', type: 'yes_no_unsure' },
      { id: 'wrongful_reason_belief', label: '왜 위법한 해고라고 생각하시나요?', type: 'textarea', showIf: { questionId: 'believe_wrongful', value: 'yes' } },
      { id: 'wrongful_not_sure_details', label: '어떤 점이 애매하신가요? 판단에 도움이 될 만한 내용을 알려주세요.', type: 'textarea', showIf: { questionId: 'believe_wrongful', value: 'not_sure' } },
      { id: 'received_written_warnings', label: '해고 전에 서면 경고나 징계 기록을 받으신 적이 있나요?', type: 'yes_no' },
    ],
  },
  {
    id: 'retaliation',
    title: '보복 조치',
    questions: [
      { id: 'made_complaint', label: '위반 사항을 신고하거나, 진정을 제기하거나, 위법·부당하다고 생각한 일에 이의를 제기하신 적이 있나요?', type: 'yes_no' },
      { id: 'complaint_subject', label: '무엇을 신고하거나 문제 제기하셨나요?', type: 'textarea', showIf: { questionId: 'made_complaint', value: 'yes' } },
      { id: 'negative_after_complaint', label: '문제 제기 후에 불이익을 받으신 일이 있나요?', type: 'yes_no' },
      { id: 'retaliation_description', label: '어떤 불이익이 있었는지 설명해 주세요', type: 'textarea', showIf: { questionId: 'negative_after_complaint', value: 'yes' } },
    ],
  },
  {
    id: 'disability_leave',
    title: '장애 / 의료 휴가 / 임신',
    questions: [
      { id: 'involves_disability', label: '이번 일이 장애, 건강 상태, 의료 휴가 또는 임신과 관련이 있나요?', type: 'yes_no', required: true },
      { id: 'took_medical_leave', label: '병가나 장애 휴가를 사용하신 적이 있나요?', type: 'yes_no', showIf: { questionId: 'involves_disability', value: 'yes' } },
      { id: 'leave_approved', label: '휴가를 고용주가 승인했나요?', type: 'yes_no', showIf: { questionId: 'took_medical_leave', value: 'yes' } },
      { id: 'leave_denied_retaliated', label: '휴가를 거부당하거나, 휴가를 썼다는 이유로 불이익을 받으셨나요?', type: 'yes_no', showIf: { questionId: 'took_medical_leave', value: 'yes' } },
      { id: 'requested_accommodation', label: '장애와 관련해 업무상 편의 제공을 요청하신 적이 있나요?', type: 'yes_no', showIf: { questionId: 'involves_disability', value: 'yes' } },
      { id: 'accommodation_denied', label: '그 편의 제공 요청이 거부되거나 묵살되었나요?', type: 'yes_no', showIf: { questionId: 'requested_accommodation', value: 'yes' } },
      { id: 'was_pregnant', label: '근무 중에 임신하신 적이 있나요?', type: 'yes_no', showIf: { questionId: 'involves_disability', value: 'yes' } },
      { id: 'pregnancy_different_treatment', label: '임신을 이유로 다른 대우를 받으셨나요?', type: 'yes_no', showIf: { questionId: 'was_pregnant', value: 'yes' } },
    ],
  },
  {
    id: 'harassment',
    title: '괴롭힘 / 차별',
    questions: [
      { id: 'experienced_harassment', label: '직장에서 괴롭힘이나 차별을 겪으셨나요?', type: 'yes_no' },
      { id: 'harassment_type', label: '어떤 종류의 괴롭힘 또는 차별이었나요? (해당되는 것 모두 선택)', type: 'multiselect', options: ['인종 / 피부색', '출신 국가 / 혈통', '성별', '성희롱', '임신', '나이 (40세 이상)', '신체적·정신적 장애', '종교', '성적 지향', '성 정체성 / 성 표현', '군 복무 또는 제대군인 신분', '기타'], showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'harassment_description', label: '무슨 일이 있었는지 설명해 주세요. 날짜를 아시면 함께 적어주세요', type: 'textarea', showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'reported_to_employer', label: '괴롭힘이나 차별을 고용주나 인사팀에 알리셨나요?', type: 'yes_no', showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'employer_response', label: '고용주는 그 신고에 어떻게 대응했나요?', type: 'textarea', showIf: { questionId: 'reported_to_employer', value: 'yes' } },
    ],
  },
  {
    id: 'witnesses',
    title: '목격자',
    questions: [
      { id: 'has_witnesses', label: '무슨 일이 있었는지 보았고 고객님 주장을 뒷받침해 줄 사람이 있나요?', type: 'yes_no' },
      { id: 'witness_list', label: '목격자와 연락처를 적어주세요 (아시는 경우)', type: 'textarea', helpText: '이름, 고객님과의 관계, 무엇을 보았는지 적어주세요. 전부 다 아실 필요는 없습니다.', showIf: { questionId: 'has_witnesses', value: 'yes' } },
      { id: 'coworkers_same_issues', label: '다른 동료들도 같거나 비슷한 일을 겪었나요?', type: 'yes_no' },
      { id: 'coworkers_details', label: '다른 동료들의 상황에 대해 아시는 내용을 알려주세요', type: 'textarea', showIf: { questionId: 'coworkers_same_issues', value: 'yes' } },
    ],
  },
  {
    id: 'documents_available',
    title: '가지고 계신 서류',
    questions: [
      { id: 'available_documents', label: '다음 서류 중 지금 가지고 계신 것은 무엇인가요? (해당되는 것 모두 선택)', type: 'multiselect', options: ['급여명세서', 'W-2 양식', '1099 양식', '근무시간 기록 / 타임시트', '근무 일정표', '문자 메시지', '이메일', '해고 통지서', '의사 소견서 / 진료 기록', '사진 또는 동영상', '회사 취업규칙 또는 사규', '근로계약서 또는 채용 제안서', '인사 평가서', '경고장 / 징계 기록', '기타 서류'] },
      { id: 'documents_notes', label: '서류에 대해 알려주실 내용이 있나요?', type: 'textarea', helpText: '예: "2024년 1월부터 12월까지 급여명세서는 있는데 그 전 것은 없습니다."' },
    ],
  },
  {
    id: 'additional',
    title: '추가 정보',
    questions: [
      { id: 'prior_agency_complaints', label: '정부 기관에 진정을 제기하신 적이 있나요? (예: DLSE, DFEH/CRD, EEOC, 노동청)', type: 'yes_no' },
      { id: 'agency_complaint_details', label: '진정 내용, 기관 이름, 결과(아시는 경우)를 알려주세요', type: 'textarea', showIf: { questionId: 'prior_agency_complaints', value: 'yes' } },
      { id: 'prior_attorneys', label: '이 사안으로 다른 변호사와 상담하시거나 선임하신 적이 있나요?', type: 'yes_no' },
      { id: 'statute_of_limitations', label: '고객님의 청구에 다가오는 기한이 있는지 알고 계신가요?', type: 'yes_no' },
      { id: 'additional_notes', label: '고객님 상황에 대해 저희가 더 알아야 할 내용이 있을까요?', type: 'textarea', helpText: '사건에 중요할 수 있는 어떤 내용이든 알려주세요. 틀린 답은 없습니다.', placeholder: '중요하다고 생각하시는 다른 내용…' },
    ],
  },
]
