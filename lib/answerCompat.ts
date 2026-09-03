import { AnswerValue } from '@/types'

/**
 * Answers stored in the language the client read the questionnaire in.
 *
 * Until Module 1, each language had its own copy of the questionnaire and the
 * answer CHOICES were translated along with everything else — so a Spanish
 * reader who picked their language did not store "Spanish", they stored
 * "Español", and a Korean reader stored "한국어". The English file is now the
 * one source of stored values, which is what lets skip logic mean the same
 * thing in four languages; it also means those older records hold values the
 * questionnaire no longer offers.
 *
 * Left alone, such an answer would show as an empty dropdown, count as
 * unanswered against a required question, and route as though it were never
 * given. This maps it back to the choice it was.
 *
 * The table is generated from the four questionnaire files as they stood before
 * Module 1, pairing each language's option with the English one in the same
 * position — the pairing those files were built to guarantee. Free text is not
 * in here and needs nothing: a paragraph typed in Korean is the answer, in any
 * version of the questionnaire.
 *
 * Nothing here writes to the database. Normalising happens on read, so the row
 * keeps the words the client actually chose until they change that answer
 * themselves.
 */
const LEGACY_OPTION_VALUES: Record<string, Record<string, string>> = {
  "available_documents": {
    "1099 表格": "1099 Forms",
    "1099 양식": "1099 Forms",
    "carta de despido": "Termination Letter",
    "cartas de advertencia / reportes": "Warning Letters / Write-Ups",
    "contrato de empleo u oferta de trabajo": "Employment Contract or Offer Letter",
    "correos electrónicos": "Emails",
    "evaluaciones de desempeño": "Performance Reviews",
    "formularios 1099": "1099 Forms",
    "formularios w-2": "W-2 Forms",
    "fotografías o videos": "Photographs or Videos",
    "horarios de trabajo": "Work Schedules",
    "manual del empleado o políticas": "Company Handbook or Policies",
    "mensajes de texto": "Text Messages",
    "notas médicas / expedientes médicos": "Doctor's Notes / Medical Records",
    "otros documentos": "Other Documents",
    "registros de tiempo / hojas de horas": "Time Records / Timesheets",
    "talones de pago": "Paystubs",
    "w-2 表格": "W-2 Forms",
    "w-2 양식": "W-2 Forms",
    "公司员工手册或规章": "Company Handbook or Policies",
    "其他文件": "Other Documents",
    "劳动合同或录用信": "Employment Contract or Offer Letter",
    "医生证明 / 医疗记录": "Doctor's Notes / Medical Records",
    "工时记录 / 工时表": "Time Records / Timesheets",
    "工资单": "Paystubs",
    "排班表": "Work Schedules",
    "照片或视频": "Photographs or Videos",
    "电子邮件": "Emails",
    "短信": "Text Messages",
    "绩效考核": "Performance Reviews",
    "解雇通知书": "Termination Letter",
    "警告信 / 处分记录": "Warning Letters / Write-Ups",
    "경고장 / 징계 기록": "Warning Letters / Write-Ups",
    "근로계약서 또는 채용 제안서": "Employment Contract or Offer Letter",
    "근무 일정표": "Work Schedules",
    "근무시간 기록 / 타임시트": "Time Records / Timesheets",
    "급여명세서": "Paystubs",
    "기타 서류": "Other Documents",
    "문자 메시지": "Text Messages",
    "사진 또는 동영상": "Photographs or Videos",
    "의사 소견서 / 진료 기록": "Doctor's Notes / Medical Records",
    "이메일": "Emails",
    "인사 평가서": "Performance Reviews",
    "해고 통지서": "Termination Letter",
    "회사 취업규칙 또는 사규": "Company Handbook or Policies",
  },
  "classification": {
    "contratista independiente": "Independent Contractor",
    "empleado": "Employee",
    "no estoy seguro": "Not Sure",
    "不确定": "Not Sure",
    "独立承包人": "Independent Contractor",
    "雇员": "Employee",
    "독립 계약자": "Independent Contractor",
    "잘 모르겠음": "Not Sure",
    "직원": "Employee",
  },
  "employment_type": {
    "agencia de personal": "Temporary / Staffing Agency",
    "contrato": "Contract",
    "otro": "Other",
    "temporal / estacional": "Seasonal",
    "tiempo completo": "Full-Time",
    "tiempo parcial": "Part-Time",
    "临时工 / 派遣公司": "Temporary / Staffing Agency",
    "全职": "Full-Time",
    "其他": "Other",
    "兼职": "Part-Time",
    "合同工": "Contract",
    "季节性": "Seasonal",
    "계약직": "Contract",
    "기타": "Other",
    "시즌직": "Seasonal",
    "임시직 / 인력 파견업체": "Temporary / Staffing Agency",
    "정규직 (풀타임)": "Full-Time",
    "파트타임": "Part-Time",
  },
  "harassment_type": {
    "acoso sexual": "Sexual Harassment",
    "discapacidad física o mental": "Physical or Mental Disability",
    "edad (40 años o más)": "Age (40 or older)",
    "embarazo": "Pregnancy",
    "estatus militar o veterano": "Military or Veteran Status",
    "identidad / expresión de género": "Gender Identity / Expression",
    "orientación sexual": "Sexual Orientation",
    "origen nacional / ascendencia": "National Origin / Ancestry",
    "otro": "Other",
    "raza / color": "Race / Color",
    "religión": "Religion",
    "sexo / género": "Sex / Gender",
    "其他": "Other",
    "国籍 / 祖籍": "National Origin / Ancestry",
    "宗教": "Religion",
    "年龄（40 岁及以上）": "Age (40 or older)",
    "怀孕": "Pregnancy",
    "性别": "Sex / Gender",
    "性别认同 / 性别表达": "Gender Identity / Expression",
    "性取向": "Sexual Orientation",
    "性骚扰": "Sexual Harassment",
    "现役或退伍军人身份": "Military or Veteran Status",
    "种族 / 肤色": "Race / Color",
    "身体或精神残疾": "Physical or Mental Disability",
    "군 복무 또는 제대군인 신분": "Military or Veteran Status",
    "기타": "Other",
    "나이 (40세 이상)": "Age (40 or older)",
    "성 정체성 / 성 표현": "Gender Identity / Expression",
    "성별": "Sex / Gender",
    "성적 지향": "Sexual Orientation",
    "성희롱": "Sexual Harassment",
    "신체적·정신적 장애": "Physical or Mental Disability",
    "인종 / 피부색": "Race / Color",
    "임신": "Pregnancy",
    "종교": "Religion",
    "출신 국가 / 혈통": "National Origin / Ancestry",
  },
  "pay_type": {
    "comisión": "Commission",
    "otro": "Other",
    "por día": "Day Rate",
    "por hora": "Hourly",
    "por pieza": "Piece Rate",
    "salario fijo": "Salary",
    "其他": "Other",
    "固定月薪 / 年薪": "Salary",
    "按件计酬": "Piece Rate",
    "按天计酬": "Day Rate",
    "按小时": "Hourly",
    "提成": "Commission",
    "개수당 (피스레이트)": "Piece Rate",
    "고정 급여 (월급/연봉)": "Salary",
    "기타": "Other",
    "수수료 (커미션)": "Commission",
    "시급": "Hourly",
    "일당": "Day Rate",
  },
  "paystub_issues": {
    "deducciones detalladas": "Deductions itemized",
    "fechas del período de pago": "Pay period begin/end dates",
    "nada faltaba / no aplica": "Nothing was missing / N/A",
    "nombre / dirección del empleador": "Employer's name / address",
    "nombre o número de empleado": "Employee's name or ID number",
    "salario bruto": "Gross wages earned",
    "salario neto": "Net wages",
    "tarifa de pago por hora": "Hourly pay rate",
    "total de horas trabajadas": "Total hours worked",
    "发薪周期起止日期": "Pay period begin/end dates",
    "各项扣款明细": "Deductions itemized",
    "员工姓名或工号": "Employee's name or ID number",
    "小时工资标准": "Hourly pay rate",
    "工作总时数": "Total hours worked",
    "没有缺漏 / 不适用": "Nothing was missing / N/A",
    "税前工资总额": "Gross wages earned",
    "税后实发工资": "Net wages",
    "雇主名称 / 地址": "Employer's name / address",
    "고용주 이름 / 주소": "Employer's name / address",
    "공제 항목 내역": "Deductions itemized",
    "급여 기간 시작·종료일": "Pay period begin/end dates",
    "빠진 것 없음 / 해당 없음": "Nothing was missing / N/A",
    "세전 총임금": "Gross wages earned",
    "세후 실수령액": "Net wages",
    "시급": "Hourly pay rate",
    "직원 이름 또는 사번": "Employee's name or ID number",
    "총 근무시간": "Total hours worked",
  },
  "preferred_language": {
    "chino": "Chinese",
    "coreano": "Korean",
    "español": "Spanish",
    "inglés": "English",
    "otro": "Other",
    "中文": "Chinese",
    "其他": "Other",
    "英语": "English",
    "西班牙语": "Spanish",
    "韩语": "Korean",
    "기타": "Other",
    "스페인어": "Spanish",
    "영어": "English",
    "중국어": "Chinese",
    "한국어": "Korean",
  },
  "schedule_type": {
    "disponibilidad": "On-Call",
    "otro": "Other",
    "regular (mismos días/horas cada semana)": "Regular (same days/hours each week)",
    "turnos rotativos": "Rotating Shifts",
    "不规律 / 变动": "Irregular / Variable",
    "其他": "Other",
    "固定（每周同样的日子和时间）": "Regular (same days/hours each week)",
    "轮班": "Rotating Shifts",
    "随叫随到": "On-Call",
    "고정 (매주 같은 요일·시간)": "Regular (same days/hours each week)",
    "교대 근무": "Rotating Shifts",
    "기타": "Other",
    "불규칙 / 유동적": "Irregular / Variable",
    "온콜 (호출 대기)": "On-Call",
  },
  "separation_type": {
    "fui dado de baja": "Laid Off",
    "fui despedido": "I Was Terminated / Fired",
    "otro": "Other",
    "renuncié": "I Resigned / Quit",
    "sigo empleado": "Still Employed",
    "terminó el contrato": "Contract Ended",
    "仍在职": "Still Employed",
    "其他": "Other",
    "合同到期": "Contract Ended",
    "我主动辞职": "I Resigned / Quit",
    "我被解雇 / 被开除": "I Was Terminated / Fired",
    "被裁员": "Laid Off",
    "계약 만료": "Contract Ended",
    "기타": "Other",
    "아직 재직 중": "Still Employed",
    "자진 퇴사": "I Resigned / Quit",
    "정리해고": "Laid Off",
    "해고당함": "I Was Terminated / Fired",
  },
  "timekeeping_method": {
    "biométrico (huella digital / reconocimiento facial)": "Biometric (fingerprint / face scan)",
    "el gerente registraba las horas": "Manager Recorded Hours",
    "hojas de tiempo electrónicas / app": "Electronic Timesheets / App",
    "hojas de tiempo en papel": "Paper Timesheets",
    "otro": "Other",
    "reloj / escáner de tarjeta": "Time Clock / Badge Scanner",
    "sin control formal": "No Formal Tracking",
    "其他": "Other",
    "打卡机 / 刷卡": "Time Clock / Badge Scanner",
    "没有正式记录": "No Formal Tracking",
    "生物识别（指纹 / 人脸）": "Biometric (fingerprint / face scan)",
    "由经理代为记录": "Manager Recorded Hours",
    "电子工时表 / 应用程序": "Electronic Timesheets / App",
    "纸质工时表": "Paper Timesheets",
    "공식적인 기록 없음": "No Formal Tracking",
    "기타": "Other",
    "매니저가 대신 기록": "Manager Recorded Hours",
    "생체 인식 (지문 / 얼굴)": "Biometric (fingerprint / face scan)",
    "전자 근무시간표 / 앱": "Electronic Timesheets / App",
    "종이 근무시간표": "Paper Timesheets",
    "출퇴근 기록기 / 카드 스캐너": "Time Clock / Badge Scanner",
  },
}

/** Ids this can repair, exported so a test can hold the table to the questionnaire. */
export const COMPATIBLE_QUESTION_IDS = Object.keys(LEGACY_OPTION_VALUES)

function canonicalOption(questionId: string, value: string): string {
  const table = LEGACY_OPTION_VALUES[questionId]
  if (!table) return value
  return table[value.trim().toLowerCase()] ?? value
}

/**
 * One answer as the questionnaire would store it today.
 *
 * A value that is already current, or that this does not recognise, is returned
 * exactly as it came in — an unknown answer is left to be seen, never dropped.
 */
export function canonicalAnswer(questionId: string, value: AnswerValue): AnswerValue {
  if (Array.isArray(value)) {
    const mapped = value.map(v => canonicalOption(questionId, v))
    return mapped.every((v, i) => v === value[i]) ? value : mapped
  }
  return canonicalOption(questionId, value)
}

/**
 * A client's answers with any older language's choices read as the choices they
 * were. The argument is not modified; a record with nothing to repair comes
 * back with the same values it went in with.
 */
export function canonicalAnswers(
  answers: Record<string, AnswerValue>
): Record<string, AnswerValue> {
  const out: Record<string, AnswerValue> = {}
  for (const [id, value] of Object.entries(answers)) {
    out[id] = value === null || value === undefined ? value : canonicalAnswer(id, value)
  }
  return out
}
