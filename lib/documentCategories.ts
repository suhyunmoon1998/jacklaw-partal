/**
 * Display names for the document categories a client files uploads under.
 *
 * The category is stored on the document row, so translating the list itself
 * would file a Chinese client's paystubs under a different category name than
 * an English client's, and the office would be looking at one shelf under four
 * labels. These are display labels only, matched to DOCUMENT_CATEGORIES BY
 * POSITION — the English string stays what is written to the database. It is
 * the same rule the question sets follow for their options.
 */

import { Lang, TranslatedLang } from '@/lib/langs'
import { DOCUMENT_CATEGORIES } from '@/lib/mockData'

const CATEGORY_LABELS: Record<TranslatedLang, string[]> = {
  es: [
    'Talones de pago',
    'Formularios W-2',
    'Formularios 1099',
    'Registros de horas / Hojas de tiempo',
    'Horarios de trabajo',
    'Mensajes de texto',
    'Correos electrónicos',
    'Carta de despido',
    'Notas del médico / Registros médicos',
    'Fotografías / Videos',
    'Manual o políticas de la empresa',
    'Contrato de trabajo',
    'Evaluaciones de desempeño',
    'Cartas de advertencia / Amonestaciones',
    'Otros documentos',
  ],
  zh: [
    '工资单',
    'W-2 表格',
    '1099 表格',
    '工时记录 / 工时表',
    '排班表',
    '短信',
    '电子邮件',
    '解雇通知书',
    '医生证明 / 医疗记录',
    '照片 / 视频',
    '公司员工手册 / 规章',
    '劳动合同',
    '绩效考核',
    '警告信 / 处分记录',
    '其他文件',
  ],
  ko: [
    '급여명세서',
    'W-2 양식',
    '1099 양식',
    '근무시간 기록 / 타임시트',
    '근무 일정표',
    '문자 메시지',
    '이메일',
    '해고 통지서',
    '의사 소견서 / 진료 기록',
    '사진 / 동영상',
    '회사 취업규칙 / 사규',
    '근로계약서',
    '인사 평가서',
    '경고장 / 징계 기록',
    '기타 서류',
  ],
}

/**
 * One category as a client should read it.
 *
 * A list whose length has drifted from the English is ignored rather than
 * shifted by one, which would put the wrong label on every category after the
 * gap. Unknown categories — one renamed since a document was filed — come back
 * as they were stored.
 */
export function documentCategoryLabel(category: string, lang: Lang): string {
  if (lang === 'en') return category
  const labels = CATEGORY_LABELS[lang as TranslatedLang]
  if (!labels || labels.length !== DOCUMENT_CATEGORIES.length) return category
  const index = DOCUMENT_CATEGORIES.indexOf(category)
  return index === -1 ? category : labels[index]
}
