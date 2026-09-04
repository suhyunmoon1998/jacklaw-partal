import { QuestionnaireSection } from '@/types'

/**
 * The intake questionnaire in Korean — Module 1.
 *
 * Only what the client reads lives here: the section title, the question label,
 * the help text, the placeholder, and the words shown for each answer choice.
 * Ids, types, required flags, option VALUES and skip logic all come from
 * lib/questionnaireData.ts and are merged over this file at read time by
 * questionnaireSections(); see the note there for why the structure is owned in
 * one place. A question missing from this file falls back to English rather
 * than disappearing.
 */
export const QUESTIONNAIRE_SECTIONS_KO: QuestionnaireSection[] = [
  {
    id: "contact",
    title: "고객님의 연락처 정보",
    questions: [
      { id: "full_name", label: "법적 성명(전체 이름)이 무엇입니까?", type: "text", placeholder: "신분증에 기재된 것과 동일하게 적어 주십시오" },
      { id: "used_other_name", label: "이 직장에서 근무하는 동안 다른 이름을 사용하신 적이 있습니까?", type: "yes_no" },
      { id: "other_names", label: "어떤 다른 이름을 사용하셨습니까? (여러 개인 경우 모두 적어 주십시오)", type: "text" },
      { id: "dob", label: "생년월일이 언제입니까?", type: "date" },
      { id: "address", label: "거주하시는 주소(도로명 주소)가 무엇입니까?", type: "text" },
      { id: "city_state_zip", label: "어느 도시, 주(State), 우편번호(ZIP Code)에 거주하십니까?", type: "text" },
      { id: "contact_phones", label: "연락드릴 전화번호는 무엇입니까? 다른 전화번호도 있으십니까?", type: "text", helpText: "가장 연락이 잘 되는 번호를 먼저 적어 주십시오. 다른 번호가 있으면 그 뒤에 적어 주십시오.", placeholder: "(310) 555-0000, and (310) 555-0001" },
      { id: "email", label: "이메일 주소가 무엇입니까?", type: "text", placeholder: "you@example.com" },
      { id: "preferred_language", label: "저희가 고객님과 소통할 때 어떤 언어를 사용하기를 원하십니까?", type: "select", options: ["영어", "스페인어", "중국어", "한국어", "기타"] },
    ],
  },
  {
    id: "employer",
    title: "고용주 정보",
    questions: [
      { id: "employer_name", label: "고용주 또는 회사 이름은 무엇입니까?", type: "text", helpText: "알고 계신 경우, 급여명세서나 수표에 적힌 이름을 적어 주십시오." },
      { id: "employer_address", label: "고용주의 주소는 무엇입니까?", type: "text", helpText: "\"모릅니다\"라고 답하셔도 괜찮습니다." },
      { id: "employer_city_state", label: "어느 도시와 주(state)에서 근무하셨습니까?", type: "text" },
      { id: "supervisor_name", label: "주로 보고하던 상사 또는 매니저의 이름은 무엇이었습니까?", type: "text", helpText: "\"이름을 모릅니다\"라고 답하셔도 괜찮습니다." },
      { id: "supervisor_phone", label: "그 분의 전화번호는 무엇입니까?", type: "text", helpText: "\"모릅니다\"라고 답하셔도 괜찮습니다.", placeholder: "(310) 555-0000" },
      { id: "hr_contact", label: "인사(HR) 담당자는 누구였습니까? 또는 인사 부서의 명칭은 무엇이었습니까?", type: "text", helpText: "\"인사 부서가 없었습니다\" 또는 \"모릅니다\"라고 답하셔도 괜찮습니다." },
      { id: "industry", label: "어떤 종류의 사업체였습니까?", type: "text", placeholder: "예: 식당, 창고, 건설, 소매점, 사무실" },
    ],
  },
  {
    id: "dates_worked",
    title: "근무 기간",
    questions: [
      { id: "start_date_known", label: "그곳에서 일을 시작한 정확한 날짜를 알고 계십니까?", type: "select", options: ["예", "아니요", "잘 모르겠습니다"] },
      { id: "start_date", label: "그곳에서 언제부터 일하기 시작하셨습니까? 정확한 날짜, 기억나는 대략적인 시기, 또는 기간으로 적어 주십시오.", type: "text", helpText: "날짜, 연월, 계절, 또는 기간 모두 괜찮습니다 — \"2022년 봄\", \"2022년 3월부터 5월까지\" 같은 답변도 모두 유효한 답변입니다." },
      { id: "still_employed", label: "지금도 그곳에서 일하고 계십니까?", type: "yes_no" },
      { id: "end_date_known", label: "마지막으로 근무한 정확한 날짜를 알고 계십니까?", type: "select", options: ["예", "아니요", "잘 모르겠습니다"] },
      { id: "end_date", label: "마지막으로 근무한 날은 언제였습니까? 정확한 날짜, 기억나는 대략적인 시기, 또는 기간으로 적어 주십시오.", type: "text", helpText: "날짜, 연월, 계절, 또는 기간 모두 괜찮습니다 — \"2023년 말\", \"2023년 11월 또는 12월\" 같은 답변도 모두 유효한 답변입니다." },
      { id: "job_type", label: "어떤 형태의 일자리였습니까?", type: "select", options: ["정규직(풀타임)", "시간제(파트타임)", "임시직", "계절직", "호출 근무(온콜)", "기타", "잘 모르겠습니다"] },
    ],
  },
  {
    id: "position",
    title: "귀하의 직무와 업무 내용",
    questions: [
      { id: "job_title", label: "귀하의 직책(직위 명칭)은 무엇이었습니까?", type: "text" },
      { id: "job_duties", label: "평소에 어떤 일을 하셨습니까?", type: "textarea", placeholder: "주요 업무를 적어 주십시오." },
      { id: "contractor_or_employee", label: "회사는 귀하를 직원(employee)으로 불렀습니까, 아니면 독립 계약자(independent contractor)로 불렀습니까?", type: "select", options: ["직원(employee)", "독립 계약자(independent contractor)", "시기에 따라 둘 다", "모르겠습니다"] },
      { id: "contractor_wrong", label: "회사가 귀하를 독립 계약자로 불렀다면, 그 분류가 잘못되었다고 생각하십니까?", type: "select", options: ["예", "아니요", "잘 모르겠습니다"] },
      { id: "called_exempt", label: "회사가 귀하를 'exempt'(초과근무 수당 면제 대상) 또는 'salaried'(월급제)라고 부르면서 초과근무 수당을 받지 못한다고 말했습니까?", type: "select", options: ["예", "아니요", "모르겠습니다"] },
    ],
  },
  {
    id: "pay_rate",
    title: "급여 지급 방식",
    questions: [
      { id: "pay_calculated", label: "급여는 어떤 방식으로 계산되었습니까?", type: "multiselect", options: ["시급", "월급(연봉) 형태의 고정 급여", "일당", "성과급(개수당 지급)", "커미션(판매 수수료)", "기타", "\"모릅니다\""], helpText: "해당되는 항목을 모두 선택해 주십시오." },
      { id: "hourly_rate", label: "시급은 얼마였습니까?", type: "text", helpText: "금액을 적어 주시고, 모르시면 \"모릅니다\"라고 적어 주십시오.", placeholder: "18.00" },
      { id: "salary_amount", label: "고정 급여 금액은 얼마였습니까?", type: "text", helpText: "금액과 지급 주기를 적어 주시고, 모르시면 \"모릅니다\"라고 적어 주십시오.", placeholder: "$60,000 per year" },
      { id: "other_pay_rates", label: "그 밖에 적용된 급여 단가가 있으면 무엇이었습니까?", type: "text", helpText: "일당, 개수당 단가, 커미션 비율을 각각 적어 주십시오." },
      { id: "pay_received_how", label: "급여를 어떤 방법으로 받으셨습니까?", type: "multiselect", options: ["현금", "종이 수표", "계좌 자동 입금", "급여 카드", "기타"], helpText: "해당되는 항목을 모두 선택해 주십시오." },
      { id: "tips_received", label: "팁을 받으셨습니까?", type: "select", options: ["예", "아니요", "가끔 받았습니다"] },
      { id: "pay_rate_changed", label: "그곳에서 일하시는 동안 급여 단가가 바뀐 적이 있습니까?", type: "select", options: ["예", "아니요", "\"모릅니다\""] },
      { id: "pay_change_notes", label: "무엇이 어떻게 바뀌었고, 각 변경은 대략 언제 있었습니까?", type: "textarea", helpText: "변경 사항마다 한 줄씩 적어 주십시오." },
    ],
  },
  {
    id: "schedule",
    title: "평소 근무 일정",
    questions: [
      { id: "days_per_week_usual", label: "평소에 일주일에 며칠 정도 근무하셨습니까?", type: "text", helpText: "숫자, 대략적인 범위, \"바뀌었습니다\", 또는 \"모르겠습니다\" 라고 적어 주십시오." },
      { id: "hours_per_day", label: "평소에 하루에 몇 시간 정도 근무하셨습니까?", type: "text", helpText: "숫자, 대략적인 범위, \"바뀌었습니다\", 또는 \"모르겠습니다\" 라고 적어 주십시오." },
      { id: "weekly_schedule", label: "평소에 어떤 요일에 근무하셨고, 보통 몇 시에 시작해서 몇 시에 끝나셨습니까?", type: "textarea", helpText: "요일마다 한 줄씩 적어 주십시오. 근무하지 않은 요일은 비워 두십시오.", placeholder: "월요일: 7:00am ~ 4:00pm\n화요일: 7:00am ~ 4:00pm\n수요일:\n목요일:\n금요일:\n토요일:\n일요일:" },
      { id: "schedule_chosen_by", label: "근무 요일과 근무 시간은 누가 정했습니까?", type: "multiselect", options: ["사업주 또는 사장", "매니저 또는 팀장", "사무실 직원 또는 일정 담당자", "앱 또는 시스템", "고객 또는 작업 현장", "여러 사람 또는 여러 가지 방법", "기타", "모르겠습니다"], helpText: "해당되는 것을 모두 선택해 주십시오." },
      { id: "schedule_delivered_how", label: "근무 일정은 어떤 방법으로 받으셨습니까?", type: "multiselect", options: ["직장에 붙여 놓은 종이", "앱 또는 웹사이트", "문자 메시지", "이메일", "단체 채팅방", "전화 통화", "직접 말로 전달받음", "일정이 항상 같았음", "기타", "모르겠습니다"], helpText: "해당되는 것을 모두 선택해 주십시오." },
      { id: "schedule_changed", label: "근무 일정을 받은 후에 일정이 바뀐 적이 있습니까?", type: "select", options: ["예", "아니요", "때때로 있었습니다", "모르겠습니다"] },
      { id: "schedule_change_asks", label: "다음과 같은 요구를 받거나 그렇게 해야 했던 적이 있습니까?", type: "multiselect", options: ["쉬는 날에 출근하기", "평소보다 일찍 출근하기", "늦게까지 남아서 일하기", "다른 요일에 근무하기", "다른 시간에 시작하거나 끝내기", "일찍 퇴근하기", "근무가 있는지 확인하려고 전화하기", "대기하거나 호출을 기다리기", "기타"], helpText: "해당되는 것을 모두 선택해 주십시오." },
    ],
  },
  {
    id: "timekeeping",
    title: "근무 시간이 어떻게 기록되었는지",
    questions: [
      { id: "time_recorded_how", label: "고용주는 귀하의 근무 시간을 어떤 방법으로 기록했습니까?", type: "multiselect", options: ["펀치 카드(종이 카드에 시간 찍기)", "카드를 긋거나 카드를 대는 방식", "번호(코드) 입력 또는 버튼 누르기", "지문, 손, 또는 얼굴 인식", "휴대폰 또는 태블릿 앱", "회사 컴퓨터 또는 웹사이트", "금전등록기(계산대)", "종이에 기록", "누군가에게 말하거나 문자로 알림", "상사나 동료가 대신 입력", "시간을 전혀 기록하지 않음", "기타", "\"모르겠습니다\""], helpText: "해당되는 것을 모두 선택해 주십시오." },
      { id: "entered_own_start", label: "대부분의 근무일에 귀하가 직접 출근 시간을 입력하셨습니까?", type: "select", options: ["예", "아니요", "때때로 그랬습니다", "출근 시간을 전혀 기록하지 않았습니다", "\"모르겠습니다\""] },
      { id: "start_entered_how", label: "출근 시간을 어떤 방법으로 입력하셨습니까?", type: "select", options: ["펀치 카드(종이 카드에 시간 찍기)", "카드를 긋거나 카드를 대는 방식", "번호(코드) 입력 또는 버튼 누르기", "지문, 손, 또는 얼굴 인식", "휴대폰 또는 태블릿 앱", "회사 컴퓨터 또는 웹사이트", "금전등록기(계산대)", "종이에 기록", "누군가에게 말하거나 문자로 알림", "여러 가지 방법", "기타", "\"모르겠습니다\""] },
      { id: "start_entered_where", label: "출근 시간을 어디에서 입력하셨습니까?", type: "select", options: ["출입구(정문)", "작업 장소", "사무실 또는 휴게실", "계산대", "회사 컴퓨터", "회사 휴대폰 또는 태블릿", "제 개인 휴대폰", "회사 차량 또는 현장", "두 곳 이상", "기타", "\"모르겠습니다\""] },
      { id: "timekeeping_system_name", label: "그 출퇴근 기록기, 앱, 웹사이트 또는 시스템의 이름은 무엇이었습니까?", type: "text", helpText: "\"이름을 본 적이 없습니다\" 또는 \"모르겠습니다\"라고 답하셔도 괜찮습니다." },
      { id: "start_entered_by_other", label: "귀하가 직접 출근 시간을 입력하지 않은 경우에는 누가 입력했습니까?", type: "select", options: ["사장 또는 상사", "매니저 또는 조장(반장)", "동료", "사무실 직원 또는 급여 담당자", "시스템이 자동으로 입력했습니다", "근무 일정표의 시간이 그대로 사용되었습니다", "여러 사람 또는 여러 가지 방법", "아무도 입력하지 않았습니다", "\"모르겠습니다\""] },
      { id: "entered_own_end", label: "대부분의 근무일에 귀하가 직접 퇴근 시간을 입력하셨습니까?", type: "select", options: ["예", "아니요", "때때로 그랬습니다", "퇴근 시간을 전혀 기록하지 않았습니다", "\"모르겠습니다\""] },
      { id: "end_entered_same_way", label: "퇴근 시간도 출근 시간과 같은 방법으로 입력하셨습니까?", type: "select", options: ["예", "아니요", "때때로 그랬습니다", "\"모르겠습니다\""] },
      { id: "end_entered_differently", label: "퇴근 시간을 다른 방법으로 입력한 경우, 어떤 방법으로 입력했습니까?", type: "text" },
      { id: "end_entered_by_other", label: "귀하가 직접 퇴근 시간을 입력하지 않은 경우에는 누가 입력했습니까?", type: "select", options: ["사장 또는 상사", "매니저 또는 조장(반장)", "동료", "사무실 직원 또는 급여 담당자", "시스템이 자동으로 입력했습니다", "근무 일정표의 시간이 그대로 사용되었습니다", "한 사람 이상 또는 여러 가지 방법", "아무도 입력하지 않았습니다", "\"모르겠습니다\""] },
      { id: "timekeeping_changed", label: "이 직장에서 일하는 동안 근무 시간을 기록하는 방법이 바뀐 적이 있습니까?", type: "select", options: ["아니요", "예, 시간이 지나면서 바뀌었습니다", "예, 근무일이나 근무 장소에 따라 달랐습니다", "둘 다 해당됩니다", "\"모르겠습니다\""] },
      { id: "timekeeping_change_details", label: "무엇이 바뀌었고, 대략 언제 바뀌었습니까?", type: "textarea", helpText: "실제로 바뀐 내용마다 한 줄씩 적어 주십시오." },
      { id: "records_altered", label: "고용주가 귀하의 근무 시간 기록을 고치거나 바꾸거나 삭제한 적이 있습니까?", type: "select", options: ["예", "아니요", "때때로 있었습니다", "\"모르겠습니다\""] },
      { id: "alteration_details", label: "귀하의 근무 시간 기록에 무슨 일이 있었습니까?", type: "textarea", helpText: "누가 고쳤는지, 무엇이 바뀌었는지, 대략 언제였는지 함께 적어 주십시오." },
    ],
  },
  {
    id: "time_check",
    title: "근무 시작 시간과 종료 시간 확인",
    questions: [
      { id: "start_times_meaning", label: "알려주신 시작 시간은 첫 업무를 실제로 시작한 시각이었습니까?", type: "select", options: ["예", "아니요, 출근 기록(clock-in)을 찍은 시각입니다", "아니요, 근무표에 적힌 시각입니다", "아니요, 직장에 도착한 시각입니다", "날마다 달랐습니다", "\"모르겠습니다\""] },
      { id: "work_before_start", label: "알려주신 시작 시간 이전에 한 일이 있었습니까?", type: "select", options: ["예", "아니요", "가끔 있었습니다", "\"모르겠습니다\""] },
      { id: "work_before_start_what", label: "그 시작 시간 이전에 어떤 일을 하셨습니까?", type: "textarea", placeholder: "설명해 주십시오." },
      { id: "work_before_start_minutes", label: "어느 요일에 그 일을 하셨고, 각 요일마다 대략 몇 분이었습니까?", type: "textarea", helpText: "요일마다 한 줄씩 적어 주십시오. 해당 사항이 없는 요일은 비워 두십시오.", placeholder: "월요일: 20분\n화요일: 15분\n수요일:\n목요일:\n금요일:\n토요일:\n일요일:" },
      { id: "end_times_meaning", label: "알려주신 종료 시간은 마지막 업무를 실제로 끝낸 시각이었습니까?", type: "select", options: ["예", "아니요, 퇴근 기록(clock-out)을 찍은 시각입니다", "아니요, 근무표에 적힌 시각입니다", "아니요, 직장을 나선 시각입니다", "날마다 달랐습니다", "\"모르겠습니다\""] },
      { id: "work_after_end", label: "알려주신 종료 시간 이후에 한 일이 있었습니까?", type: "select", options: ["예", "아니요", "가끔 있었습니다", "\"모르겠습니다\""] },
      { id: "work_after_end_what", label: "그 종료 시간 이후에 무엇을 하셨습니까?", type: "multiselect", options: ["청소 또는 마감 정리를 했습니다", "문을 잠그거나 기계·전원을 껐습니다", "돈을 세거나 계산대를 마감했습니다", "서류나 메시지 처리를 마무리했습니다", "공구, 열쇠, 음식, 물품 등을 정리해 두었습니다", "상사가 작업을 확인해 줄 때까지 기다렸습니다", "소지품 검사 또는 안전 점검을 받았습니다", "다 같이 나가려고 기다렸습니다", "손님이나 동료를 도왔습니다", "업무 때문에 운전하거나 이동했습니다", "기타", "\"모르겠습니다\""], helpText: "해당되는 것을 모두 선택해 주십시오." },
      { id: "work_after_end_minutes", label: "어느 요일에 그 일을 하셨고, 각 요일마다 대략 몇 분이었습니까?", type: "textarea", helpText: "요일마다 한 줄씩 적어 주십시오. 해당 사항이 없는 요일은 비워 두십시오.", placeholder: "월요일: 20분\n화요일: 15분\n수요일:\n목요일:\n금요일:\n토요일:\n일요일:" },
      { id: "split_shift", label: "하루 중에 직장을 나갔다가 다시 돌아오거나, 나누어진 두 번의 근무를 하신 날이 있었습니까?", type: "select", options: ["예", "아니요", "\"모르겠습니다\""] },
      { id: "split_shift_details", label: "어느 요일이었고, 각 근무 시간대의 시작 시간과 종료 시간은 언제였습니까?", type: "textarea", helpText: "해당되는 날마다 한 줄씩 적어 주십시오." },
    ],
  },
  {
    id: "final_wages",
    title: "마지막 임금(퇴직 시 임금)",
    questions: [
      { id: "employment_ended_how", label: "근무는 어떻게 끝나게 되었습니까?", type: "select", options: ["해고당함", "정리해고(감원)됨", "본인이 그만둠", "그만두도록 강요당함", "일 또는 배정된 업무가 끝남", "기타"] },
      { id: "final_wages_on_last_day", label: "마지막 근무일에 마지막 임금을 받으셨습니까?", type: "select", options: ["예", "아니요", "\"모르겠습니다\""] },
      { id: "final_wages_paid_when", label: "마지막 임금은 언제 지급되었습니까?", type: "text", helpText: "날짜를 적어 주시고, 정확히 기억나지 않으면 대략적인 날짜를 적어 주십시오. 아직 받지 못하셨다면 \"아직 받지 못했습니다\"라고 적어 주십시오." },
      { id: "wages_owed", label: "회사가 아직 지급하지 않은 임금이 남아 있다고 생각하십니까?", type: "select", options: ["예", "아니요", "확실하지 않습니다"] },
      { id: "wages_owed_estimate", label: "아직 받지 못한 금액은 대략 얼마라고 생각하십니까?", type: "text", helpText: "금액을 적어 주시고, 정확히 모르시면 대략적인 금액을 적어 주십시오. 전혀 모르시는 경우에는 \"모르겠습니다\"라고 적어 주십시오.", placeholder: "약 $3,500" },
    ],
  },
  {
    id: "wrongful_termination",
    title: "부당 해고",
    questions: [
      { id: "fired_or_forced", label: "해고를 당하셨거나, 어쩔 수 없이 그만두게 되셨습니까?", type: "select", options: ["예", "아니요", "잘 모르겠습니다"] },
      { id: "reason_given_for_termination", label: "회사에서 일을 그만두게 된 이유를 무엇이라고 말했습니까?", type: "text", helpText: "아무 이유도 듣지 못하셨다면 \"이유를 말해주지 않았습니다\"라고 적으셔도 괜찮습니다." },
      { id: "ended_unlawfully", label: "회사가 법에 어긋나는 이유로 귀하를 일에서 내보냈다고 생각하십니까?", type: "select", options: ["예", "아니요", "잘 모르겠습니다"] },
      { id: "wrongful_reason_belief", label: "그 이유가 법에 어긋난다고 생각하시는 까닭은 무엇입니까?", type: "text" },
      { id: "wrongful_not_sure_details", label: "확실하지 않으시다면, 어떤 일들 때문에 그만두게 된 이유에 의문이 드십니까?", type: "text" },
      { id: "written_warnings", label: "일을 그만두기 전에 서면 경고나 경고장(징계 기록)을 받으신 적이 있습니까?", type: "select", options: ["예", "아니요", "\"모르겠습니다\""] },
    ],
  },
]
