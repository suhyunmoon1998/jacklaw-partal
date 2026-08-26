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

import { TranslatedLang } from '@/lib/langs'
import { Question } from '@/types'

export interface RecommendedBank {
  key: string
  /** A clients.case_type value, or 'Any' for banks that suit every case. */
  caseType: string
  /** Suggested name for the set, as the firm's staff would say it. */
  setName: string
  /** The same name in each language a client may read the portal in. */
  setNameTranslations: Partial<Record<TranslatedLang, string>>
  /** Staff-only note on when to send this set. */
  description: string
  questions: Question[]
}

export const RECOMMENDED_BANKS: RecommendedBank[] = [
  {
    key: 'wage_hour',
    caseType: 'Wage & Hour',
    setName: 'Wage & Hour Follow-Up',
    setNameTranslations: {
      es: 'Seguimiento de Salarios y Horas',
      zh: '工资与工时补充问卷',
      ko: '임금·근로시간 추가 질문',
    },
    description:
      'Send after a wage claim intake — reconstructs actual hours worked, off-the-clock time, who controlled breaks, rounding and auto-deduct practices, the client\'s own records, and the payroll system to preserve before access is lost.',
    questions: [
      {
        id: 'wh_week_actual_times',
        label: 'Think of one normal week at this job. Day by day, what time did you actually start working and what time did you actually stop?',
        type: 'textarea',
        required: true,
        helpText: 'We already have your official schedule. Here we want the real times, even where they differ from it. Example: Mon 7:45am to 6:15pm, Tue 8:00am to 5:30pm, Wed off.',
        es: {
          label: 'Piense en una semana normal en este trabajo. Día por día, ¿a qué hora empezó a trabajar realmente y a qué hora terminó realmente?',
          helpText: 'Ya tenemos su horario oficial. Aquí queremos las horas reales, aunque sean distintas. Ejemplo: lunes de 7:45am a 6:15pm, martes de 8:00am a 5:30pm, miércoles libre.',
        },
        zh: {
          label: '请回想这份工作中普通的一周。请按天说明您实际几点开始工作、几点结束。',
          helpText: '我们已经有您的官方排班表。这里想知道的是实际时间，即使与排班表不一致也请如实填写。例如：周一 7:45am 到 6:15pm，周二 8:00am 到 5:30pm，周三休息。',
        },
        ko: {
          label: '이 직장에서 보통의 한 주를 떠올려 주세요. 요일별로 실제 몇 시에 일을 시작하고 몇 시에 마치셨나요?',
          helpText: '공식 근무표는 이미 저희가 가지고 있습니다. 여기서는 실제 시간을 알려주세요. 근무표와 달라도 그대로 적어주시면 됩니다. 예: 월 오전 7:45~오후 6:15, 화 오전 8:00~오후 5:30, 수 휴무.',
        },
      },
      {
        id: 'wh_offclock_any',
        label: 'Did you ever do work at times when you were not clocked in?',
        type: 'yes_no',
        required: true,
        helpText: 'If a manager wrote down your hours, or nobody tracked them, answer for any work that was not counted in your hours.',
        es: {
          label: '¿Alguna vez trabajó horas que no quedaron registradas en el reloj?',
          helpText: 'Si un gerente anotaba sus horas, o si nadie las anotaba, responda por cualquier trabajo que no se contó en sus horas.',
        },
        zh: {
          label: '您是否做过没有打卡记录的工作？',
          helpText: '如果是由经理代为记录工时，或根本没人记录，请就任何没有计入您工时的工作作答。',
        },
        ko: {
          label: '출퇴근 기록에 잡히지 않는 시간에 일하신 적이 있나요?',
          helpText: '매니저가 근무시간을 대신 적었거나 아무도 기록하지 않았다면, 근무시간에 반영되지 않은 모든 일에 대해 답해 주세요.',
        },
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
        es: {
          label: '¿Cuándo pasaba eso? (Seleccione todas las que apliquen)',
          options: [
            'Antes de mi turno: ponerme el uniforme, preparar todo, cargar o esperar a que me abrieran',
            'Después de mi turno: limpiar, cerrar, contar dinero, hacer papeleo o esperar la revisión de bolsa o carro',
            'Durante un descanso para comer o un descanso de 10 minutos',
            'Reuniones, capacitación u orientación',
            'Viajar de un lugar de trabajo a otro durante el día',
            'Llamadas, mensajes o correos del trabajo fuera de mi turno',
            'Llevarme trabajo a casa',
            'Otro'
          ],
        },
        zh: {
          label: '这些情况发生在什么时候？（可多选）',
          options: [
            '上班前 — 换制服、做准备、装货，或等着被放进来',
            '下班后 — 打扫、关店、点钱、做文书，或等着被检查包或车',
            '用餐或工间休息期间',
            '开会、培训或入职培训',
            '工作日在不同工作地点之间往返',
            '下班后接工作电话、短信或邮件',
            '把工作带回家做',
            '其他',
          ],
        },
        ko: {
          label: '그런 일이 언제 있었나요? (해당되는 것 모두 선택)',
          options: [
            '근무 시작 전 — 유니폼 갈아입기, 준비, 짐 싣기, 문 열어주기를 기다리기',
            '근무 종료 후 — 청소, 마감, 정산, 서류 작업, 가방·차량 검사 대기',
            '식사 시간이나 휴식 시간 중',
            '회의, 교육, 오리엔테이션',
            '근무일 중 여러 사업장 사이 이동',
            '근무시간 외 업무 전화·문자·이메일',
            '집에 일을 가져가서 함',
            '기타',
          ],
        },
      },
      {
        id: 'wh_offclock_details',
        label: 'For each one you checked, what did you do and about how many minutes did it take on a normal day?',
        type: 'textarea',
        helpText: 'Example: "Set up my station before clocking in, about 20 minutes every morning. Answered the manager\'s texts at night, about 10 minutes."',
        showIf: { questionId: 'wh_offclock_any', value: 'yes' },
        es: {
          label: 'De cada una que marcó, ¿qué hacía y cuántos minutos le tomaba, más o menos, en un día normal?',
          helpText: 'Ejemplo: "Preparaba mi área antes de marcar entrada, unos 20 minutos cada mañana. Contestaba los mensajes del gerente en la noche, unos 10 minutos."',
        },
        zh: {
          label: '对于您勾选的每一项，请说明您做了什么，平常一天大约花多少分钟？',
          helpText: '例如：“打卡前先整理工作台，每天早上大约 20 分钟。晚上回复经理的短信，大约 10 分钟。”',
        },
        ko: {
          label: '위에서 체크하신 항목별로, 무슨 일을 하셨고 보통 하루에 몇 분 정도 걸렸나요?',
          helpText: '예: "출근 기록 전에 작업대를 정리했고 매일 아침 20분 정도 걸렸습니다. 밤에 매니저 문자에 답했고 10분 정도였습니다."',
        },
      },
      {
        id: 'wh_break_instructions',
        label: 'Who at work told you how meal and rest breaks worked, and what did they tell you?',
        type: 'textarea',
        helpText: 'Include their name and job title if you remember, and their exact words as best you can recall.',
        es: {
          label: '¿Quién en el trabajo le explicó cómo funcionaban los descansos para comer y los descansos, y qué le dijo?',
          helpText: 'Incluya su nombre y su puesto si los recuerda, y sus palabras exactas hasta donde las recuerde.',
        },
        zh: {
          label: '公司里是谁向您说明用餐和工间休息的规定？他们是怎么说的？',
          helpText: '如果记得，请写上对方的姓名和职位，并尽量还原他们的原话。',
        },
        ko: {
          label: '직장에서 누가 식사·휴식 시간 규정을 알려주었고, 뭐라고 하던가요?',
          helpText: '기억나시면 그 사람의 이름과 직책을 적어주시고, 하신 말씀을 기억나는 대로 그대로 적어주세요.',
        },
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
        es: {
          label: 'Si las reglas de los descansos estaban escritas en algún lado, ¿dónde? (Seleccione todas las que apliquen)',
          options: [
            'En un manual del empleado',
            'En un letrero puesto en el trabajo',
            'En un mensaje o aviso en una app del trabajo',
            'En un formulario o política que firmé',
            'En un correo electrónico o carta',
            'En ningún lado que yo sepa',
            'No estoy seguro'
          ],
        },
        zh: {
          label: '休息规定写在哪里？如果有的话。（可多选）',
          options: [
            '员工手册',
            '张贴在工作场所的告示',
            '工作应用里的通知或消息',
            '我签过的表格或规章',
            '电子邮件或信件',
            '据我所知没有写在任何地方',
            '不确定',
          ],
        },
        ko: {
          label: '휴게시간 규정이 어디에 적혀 있었나요? (해당되는 것 모두 선택)',
          options: [
            '취업규칙·직원 안내서',
            '직장에 붙어 있던 안내문',
            '업무용 앱의 공지나 메시지',
            '제가 서명한 양식이나 규정',
            '이메일이나 서면',
            '제가 아는 한 어디에도 없음',
            '잘 모르겠음',
          ],
        },
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
        es: {
          label: 'Durante su descanso para comer, ¿cuáles de estas cosas eran ciertas? (Seleccione todas las que apliquen)',
          options: [
            'Tenía que quedarme en la propiedad o en el lugar de trabajo',
            'Tenía que dejar prendido el radio, el teléfono o el bíper',
            'Tenía que seguir vigilando o cubriendo mi puesto',
            'Se esperaba que estuviera disponible si alguien me necesitaba',
            'Comía en mi escritorio, en mi puesto o en mi carro',
            'Ninguna de estas: podía irme y hacer lo que quisiera'
          ],
        },
        zh: {
          label: '用餐休息期间，以下哪些情况属实？（可多选）',
          options: [
            '我必须留在公司或工地范围内',
            '我必须开着对讲机、手机或传呼机',
            '我必须继续看管或顶替自己的岗位',
            '别人需要我时我得随时能被找到',
            '我在办公桌、岗位上或车里吃饭',
            '以上都没有 — 我可以自由离开、做自己的事',
          ],
        },
        ko: {
          label: '식사 휴게시간 동안 다음 중 해당하는 것은 무엇인가요? (해당되는 것 모두 선택)',
          options: [
            '회사나 작업 현장을 벗어날 수 없었음',
            '무전기·휴대폰·호출기를 켜 두어야 했음',
            '계속 자리를 지키거나 맡아야 했음',
            '누가 찾으면 바로 응해야 하는 분위기였음',
            '책상·작업대·차 안에서 식사했음',
            '해당 없음 — 자유롭게 나가서 원하는 대로 할 수 있었음',
          ],
        },
      },
      {
        id: 'wh_auto_meal_deduction',
        label: 'Was a lunch break subtracted from your hours automatically, even on days you did not take one?',
        type: 'yes_no_unsure',
        helpText: 'For example, 30 minutes came off your total every shift without you clocking out.',
        es: {
          label: '¿Le descontaban automáticamente el descanso para comer de sus horas, aun los días que no lo tomaba?',
          helpText: 'Por ejemplo, le quitaban 30 minutos de su total en cada turno sin que usted marcara salida.',
        },
        zh: {
          label: '即使在您没有休息的日子，公司是否也会自动从您的工时里扣掉午休时间？',
          helpText: '例如，您没有打卡外出，但每个班次的总工时都自动少了 30 分钟。',
        },
        ko: {
          label: '점심시간을 쓰지 않은 날에도 근무시간에서 자동으로 점심시간이 빠졌나요?',
          helpText: '예를 들어, 따로 퇴근 기록을 하지 않았는데도 매 근무마다 총 시간에서 30분이 빠지는 경우입니다.',
        },
      },
      {
        id: 'wh_time_rounding',
        label: 'As far as you could see, were your start and stop times recorded as round numbers instead of the exact minute?',
        type: 'yes_no_unsure',
        helpText: 'For example, you clocked in at 7:52 but your record showed 8:00.',
        es: {
          label: 'Por lo que usted pudo ver, ¿sus horas de entrada y salida se registraban en números redondos en vez del minuto exacto?',
          helpText: 'Por ejemplo, marcó entrada a las 7:52 pero su registro decía 8:00.',
        },
        zh: {
          label: '就您所见，您的上下班时间是不是被记成了整数时间，而不是实际的分钟？',
          helpText: '例如，您 7:52 打的卡，但记录上写的是 8:00。',
        },
        ko: {
          label: '보시기에 출퇴근 시간이 실제 분 단위가 아니라 반올림된 시간으로 기록되었나요?',
          helpText: '예를 들어 7시 52분에 출근 기록을 했는데 기록에는 8시로 남는 경우입니다.',
        },
      },
      {
        id: 'wh_told_to_underreport',
        label: 'Did anyone ever tell you to write down or clock fewer hours than you actually worked?',
        type: 'yes_no',
        helpText: 'For example, being told to clock out and keep working, or to keep your hours under 40.',
        es: {
          label: '¿Alguien le dijo alguna vez que anotara o marcara menos horas de las que realmente trabajó?',
          helpText: 'Por ejemplo, que marcara salida y siguiera trabajando, o que no pasara de 40 horas.',
        },
        zh: {
          label: '有没有人叫您把工时记少、少打卡，比实际工作时间少？',
          helpText: '例如，被要求先打卡下班再继续工作，或被要求把工时控制在 40 小时以内。',
        },
        ko: {
          label: '실제 일한 시간보다 적게 적거나 적게 기록하라는 말을 들으신 적이 있나요?',
          helpText: '예를 들어 퇴근 기록을 찍고 계속 일하라고 하거나, 주 40시간을 넘기지 말라고 하는 경우입니다.',
        },
      },
      {
        id: 'wh_told_to_underreport_details',
        label: 'Who told you, what was their job title, roughly when did this happen, and what exactly did they say?',
        type: 'textarea',
        helpText: 'If it happened more than once, describe each time you remember.',
        showIf: { questionId: 'wh_told_to_underreport', value: 'yes' },
        es: {
          label: '¿Quién se lo dijo, cuál era su puesto, más o menos cuándo pasó y qué le dijo exactamente?',
          helpText: 'Si pasó más de una vez, describa cada vez que recuerde.',
        },
        zh: {
          label: '是谁跟您说的？对方职位是什么？大约什么时候发生的？他们具体说了什么？',
          helpText: '如果不止一次，请把您记得的每一次都写下来。',
        },
        ko: {
          label: '누가 그렇게 말했고, 그 사람의 직책은 무엇이며, 대략 언제 있었던 일이고, 정확히 뭐라고 했나요?',
          helpText: '여러 번 있었다면 기억나는 경우를 각각 적어주세요.',
        },
      },
      {
        id: 'wh_kept_own_records',
        label: 'Did you keep your own record of the hours you worked?',
        type: 'yes_no',
        required: true,
        helpText: 'Something you made yourself — a notebook, notes or photos on your phone, marks on a calendar, or your own copies of timesheets.',
        es: {
          label: '¿Usted llevaba su propio registro de las horas que trabajaba?',
          helpText: 'Algo hecho por usted: un cuaderno, notas o fotos en su teléfono, marcas en un calendario, o sus propias copias de las hojas de horas.',
        },
        zh: {
          label: '您自己有记录过工作时数吗？',
          helpText: '指您自己做的记录 — 笔记本、手机里的备忘或照片、日历上的标记，或您自己留的工时表副本。',
        },
        ko: {
          label: '일한 시간을 본인이 따로 기록해 두셨나요?',
          helpText: '직접 만드신 기록을 말합니다 — 수첩, 휴대폰 메모나 사진, 달력 표시, 본인이 복사해 둔 근무시간표 등입니다.',
        },
      },
      {
        id: 'wh_own_records_details',
        label: 'What kind of record did you keep, what dates does it cover, and do you still have it?',
        type: 'textarea',
        showIf: { questionId: 'wh_kept_own_records', value: 'yes' },
        es: {
          label: '¿Qué tipo de registro llevaba? ¿Qué fechas cubre? ¿Todavía lo tiene?',
        },
        zh: {
          label: '您记录的是什么形式？涵盖哪段时间？现在还留着吗？',
        },
        ko: {
          label: '어떤 형태의 기록이고, 어느 기간을 담고 있으며, 지금도 가지고 계신가요?',
        },
      },
      {
        id: 'wh_payroll_system_name',
        label: 'What was the name of the time clock, app, or website your employer used for your hours and paychecks?',
        type: 'text',
        helpText: 'For example ADP, Paychex, Kronos, Workday, Homebase, or 7shifts. Write "not sure" if you do not remember.',
        es: {
          label: '¿Cómo se llamaba el reloj checador, la app o el sitio web que su empleador usaba para sus horas y sus cheques de pago?',
          helpText: 'Por ejemplo, ADP, Paychex, Kronos, Workday, Homebase o 7shifts. Escriba "no estoy seguro" si no lo recuerda.',
        },
        zh: {
          label: '雇主用来记录工时和发工资的打卡机、应用或网站叫什么名字？',
          helpText: '例如 ADP、Paychex、Kronos、Workday、Homebase 或 7shifts。不记得就写“不确定”。',
        },
        ko: {
          label: '고용주가 근무시간과 급여에 사용한 출퇴근 기록기, 앱, 웹사이트의 이름은 무엇이었나요?',
          helpText: '예: ADP, Paychex, Kronos, Workday, Homebase, 7shifts. 기억나지 않으시면 "모름"이라고 적어주세요.',
        },
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
        es: {
          label: '¿Todavía puede entrar a esa app o sitio web?',
          helpText: 'Si todavía puede entrar, por favor no cambie nada: solo avísenos y le diremos qué guardar.',
          options: [
            'Sí, todavía puedo entrar',
            'No, ya no puedo entrar',
            'Nunca tuve una cuenta',
            'No estoy seguro'
          ],
        },
        zh: {
          label: '您现在还能登录那个应用或网站吗？',
          helpText: '如果还能登录，请不要改动任何内容 — 先告诉我们，我们会说明需要保存哪些资料。',
          options: [
            '可以，我还能登录',
            '不行，已经无法登录',
            '我从来没有登录账号',
            '不确定',
          ],
        },
        ko: {
          label: '그 앱이나 웹사이트에 아직 로그인할 수 있나요?',
          helpText: '아직 로그인이 되신다면 아무것도 바꾸지 마시고 먼저 알려주세요. 무엇을 저장해 두실지 안내해 드리겠습니다.',
          options: [
            '예, 아직 로그인됩니다',
            '아니요, 이제 로그인이 안 됩니다',
            '계정이 아예 없었습니다',
            '잘 모르겠습니다',
          ],
        },
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
        es: {
          label: '¿Cada cuánto le pagaban?',
          options: [
            'Cada semana',
            'Cada dos semanas',
            'Dos veces al mes',
            'Una vez al mes',
            'Variaba, sin fecha fija',
            'No estoy seguro'
          ],
        },
        zh: {
          label: '公司多久发一次工资？',
          options: [
            '每周一次',
            '每两周一次',
            '每月两次',
            '每月一次',
            '不固定 — 没有规律',
            '不确定',
          ],
        },
        ko: {
          label: '급여는 얼마나 자주 받으셨나요?',
          options: [
            '매주',
            '격주',
            '한 달에 두 번',
            '한 달에 한 번',
            '일정하지 않았음',
            '잘 모르겠음',
          ],
        },
      },
      {
        id: 'wh_asked_about_pay',
        label: 'Did you ever ask a manager, supervisor, or the office about a paycheck, your hours, or your breaks?',
        type: 'yes_no',
        helpText: 'Even a casual conversation counts. You do not need to have made a formal complaint.',
        es: {
          label: '¿Alguna vez le preguntó a un gerente, a un supervisor o a la oficina sobre un cheque de pago, sus horas o sus descansos?',
          helpText: 'Hasta una plática informal cuenta. No necesita haber presentado una queja formal.',
        },
        zh: {
          label: '您有没有就工资、工时或休息问题问过经理、主管或办公室？',
          helpText: '随口聊到也算，不需要是正式投诉。',
        },
        ko: {
          label: '급여, 근무시간, 휴게시간에 대해 매니저나 상사, 사무실에 물어보신 적이 있나요?',
          helpText: '지나가는 말로 나눈 대화도 포함됩니다. 정식으로 문제를 제기하셨을 필요는 없습니다.',
        },
      },
      {
        id: 'wh_asked_about_pay_response',
        label: 'Who did you ask, roughly when, how did you ask (in person, text, email), and what did they tell you about the pay or hours?',
        type: 'textarea',
        helpText: 'If you asked more than once, list each time you remember.',
        showIf: { questionId: 'wh_asked_about_pay', value: 'yes' },
        es: {
          label: '¿A quién le preguntó, más o menos cuándo, cómo le preguntó (en persona, mensaje, correo) y qué le dijeron sobre el pago o las horas?',
          helpText: 'Si preguntó más de una vez, mencione cada vez que recuerde.',
        },
        zh: {
          label: '您问的是谁？大约什么时候？以什么方式问的（当面、短信、邮件）？对方就工资或工时怎么答复您？',
          helpText: '如果问过不止一次，请把记得的每一次都列出来。',
        },
        ko: {
          label: '누구에게, 대략 언제, 어떤 방법으로(직접·문자·이메일) 물어보셨고, 급여나 근무시간에 대해 뭐라고 답하던가요?',
          helpText: '여러 번 물어보셨다면 기억나는 경우를 각각 적어주세요.',
        },
      },
    ],
  },
  {
    key: 'wrongful_termination',
    caseType: 'Wrongful Termination',
    setName: 'Termination Details',
    setNameTranslations: {
      es: 'Detalles del Despido',
      zh: '解雇经过详情',
      ko: '해고 경위 상세',
    },
    description:
      'Send after intake to a client who was fired or pushed out — pins down how the firing happened, who said what, the reasons given verbally vs in writing, and any papers they were asked to sign.',
    questions: [
      {
        id: 'wt_told_date',
        label: 'What date were you told your job was ending?',
        type: 'date',
        helpText: 'Your best guess is fine. If that was a different day than your last day at work, use the day you were told.',
        es: {
          label: '¿En qué fecha le dijeron que su trabajo se iba a terminar?',
          helpText: 'Una fecha aproximada está bien. Si ese día fue diferente de su último día de trabajo, ponga el día en que se lo dijeron.',
        },
        zh: {
          label: '公司是哪一天告诉您工作要结束的？',
          helpText: '写大概的日期就可以。如果那天和您最后上班的日子不是同一天，请填被告知的那天。',
        },
        ko: {
          label: '일을 그만두게 된다는 통보를 받은 날짜는 언제인가요?',
          helpText: '대략적인 날짜도 괜찮습니다. 마지막 근무일과 다른 날이라면, 통보받은 날을 적어주세요.',
        },
      },
      {
        id: 'wt_told_by',
        label: 'Who told you? Write their name and job title.',
        type: 'text',
        required: true,
        helpText: 'If more than one person spoke, name the one who did most of the talking.',
        es: {
          label: '¿Quién se lo dijo? Escriba el nombre y el puesto de esa persona.',
          helpText: 'Si habló más de una persona, escriba el nombre de quien habló más.',
        },
        zh: {
          label: '是谁告诉您的？请写下对方的姓名和职位。',
          helpText: '如果不止一个人说话，请写主要说话的那位。',
        },
        ko: {
          label: '누가 통보했나요? 그 사람의 이름과 직책을 적어주세요.',
          helpText: '여러 사람이 말했다면, 주로 이야기한 사람을 적어주세요.',
        },
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
        es: {
          label: '¿Cómo se lo dijeron?',
          options: [
            'En persona',
            'Por llamada telefónica',
            'Por videollamada',
            'Por mensaje de texto',
            'Por correo electrónico',
            'Por carta o aviso en papel',
            'Por un compañero de trabajo u otra persona',
            'Nadie me lo dijo directamente',
            'Otro'
          ],
        },
        zh: {
          label: '公司是以什么方式通知您的？',
          options: [
            '当面',
            '电话',
            '视频通话',
            '短信',
            '电子邮件',
            '纸质信件或通知',
            '通过同事或其他人转达',
            '没有人直接通知我',
            '其他',
          ],
        },
        ko: {
          label: '어떤 방식으로 통보받으셨나요?',
          options: [
            '직접 대면',
            '전화',
            '화상 통화',
            '문자 메시지',
            '이메일',
            '종이 서면이나 통지서',
            '동료나 다른 사람을 통해',
            '아무도 직접 알려주지 않음',
            '기타',
          ],
        },
      },
      {
        id: 'wt_others_present',
        label: 'Was anyone else there when you were told?',
        type: 'yes_no',
        helpText: 'Count anyone in the room, on the phone, or on the video call.',
        es: {
          label: '¿Había alguien más presente cuando se lo dijeron?',
          helpText: 'Incluya a cualquier persona que estaba en la sala, en la llamada o en la videollamada.',
        },
        zh: {
          label: '通知您的时候还有其他人在场吗？',
          helpText: '在场的人、电话上的人、视频通话里的人都算。',
        },
        ko: {
          label: '통보받으실 때 다른 사람도 함께 있었나요?',
          helpText: '같은 자리에 있던 사람, 전화나 화상 통화에 참여한 사람 모두 포함됩니다.',
        },
      },
      {
        id: 'wt_others_present_who',
        label: 'Who else was there? Write their names and job titles.',
        type: 'textarea',
        helpText: 'Add what each person said or did, if you remember.',
        showIf: { questionId: 'wt_others_present', value: 'yes' },
        es: {
          label: '¿Quién más estuvo presente? Escriba el nombre y el puesto de cada persona.',
          helpText: 'Si lo recuerda, agregue qué dijo o hizo cada persona.',
        },
        zh: {
          label: '还有谁在场？请写下他们的姓名和职位。',
          helpText: '如果记得，请一并写下每个人说了什么、做了什么。',
        },
        ko: {
          label: '또 누가 있었나요? 이름과 직책을 적어주세요.',
          helpText: '기억나시면 각자 무슨 말을 했고 어떻게 행동했는지도 함께 적어주세요.',
        },
      },
      {
        id: 'wt_words_used',
        label: 'As best you remember, what exactly did they say to you?',
        type: 'textarea',
        required: true,
        helpText: 'Write it the way you remember hearing it. Include what you asked, how they answered, and whether you had to leave right away.',
        es: {
          label: 'Hasta donde recuerde, ¿qué fue exactamente lo que le dijeron?',
          helpText: 'Escríbalo tal como lo recuerda. Incluya qué preguntó usted, qué le contestaron y si tuvo que irse de inmediato.',
        },
        zh: {
          label: '尽您所能回忆，他们当时具体对您说了什么？',
          helpText: '请按您记得听到的样子写下来。包括您问了什么、他们怎么答的，以及您是否被要求立刻离开。',
        },
        ko: {
          label: '기억나시는 대로, 그들이 정확히 어떤 말을 했나요?',
          helpText: '들으신 그대로 적어주세요. 고객님이 무엇을 물었고 상대가 어떻게 답했는지, 바로 나가야 했는지도 함께 적어주세요.',
        },
      },
      {
        id: 'wt_written_reason',
        label: 'Did you get anything in writing about why your job ended?',
        type: 'yes_no',
        helpText: 'For example a letter, an email, a text, or a form you were handed.',
        es: {
          label: '¿Recibió algo por escrito sobre por qué terminó su trabajo?',
          helpText: 'Por ejemplo, una carta, un correo electrónico, un mensaje de texto o un formulario que le entregaron.',
        },
        zh: {
          label: '关于工作为何结束，您有收到任何书面说明吗？',
          helpText: '例如信件、电子邮件、短信，或交给您的某份表格。',
        },
        ko: {
          label: '일이 끝난 이유에 대해 서면으로 받으신 것이 있나요?',
          helpText: '예: 서한, 이메일, 문자, 건네받은 양식 등입니다.',
        },
      },
      {
        id: 'wt_written_reason_says',
        label: 'What reason did the writing give? Who signed or sent it, and on what date?',
        type: 'textarea',
        helpText: 'If you still have it, keep it. We may ask you to send us a copy.',
        showIf: { questionId: 'wt_written_reason', value: 'yes' },
        es: {
          label: '¿Qué razón daba ese documento? ¿Quién lo firmó o lo envió, y en qué fecha?',
          helpText: 'Si todavía lo tiene, guárdelo. Es posible que le pidamos que nos envíe una copia.',
        },
        zh: {
          label: '书面上写的理由是什么？由谁签署或发出，日期是哪天？',
          helpText: '如果您还留着，请保存好。我们可能会请您发一份副本给我们。',
        },
        ko: {
          label: '그 서면에는 어떤 이유가 적혀 있었나요? 누가 서명하거나 보냈고, 날짜는 언제인가요?',
          helpText: '아직 가지고 계시면 보관해 주세요. 사본을 요청드릴 수 있습니다.',
        },
      },
      {
        id: 'wt_reason_differs',
        label: 'Have you heard a different reason than the one you were first given?',
        type: 'yes_no',
        helpText: 'For example from a manager, a coworker, unemployment paperwork, or someone who called for a job reference.',
        es: {
          label: '¿Ha escuchado una razón distinta a la que le dieron al principio?',
          helpText: 'Por ejemplo, de un gerente, un compañero de trabajo, los papeles del desempleo o alguien que llamó para pedir referencias sobre usted.',
        },
        zh: {
          label: '您后来有听到和最初说法不同的理由吗？',
          helpText: '例如来自经理、同事、失业救济文件，或打电话来做背景调查的人。',
        },
        ko: {
          label: '처음 들으신 것과 다른 이유를 나중에 들으신 적이 있나요?',
          helpText: '예: 매니저, 동료, 실업급여 서류, 평판 조회 전화를 한 사람 등에게서 들은 경우입니다.',
        },
      },
      {
        id: 'wt_reason_differs_details',
        label: 'What was the other reason, and who said it?',
        type: 'textarea',
        helpText: 'Include when you heard it and whether anyone else heard it too.',
        showIf: { questionId: 'wt_reason_differs', value: 'yes' },
        es: {
          label: '¿Cuál fue esa otra razón y quién la dijo?',
          helpText: 'Incluya cuándo la escuchó y si alguien más también la escuchó.',
        },
        zh: {
          label: '另一个理由是什么？是谁说的？',
          helpText: '请写上您是什么时候听到的，以及是否还有其他人也听到了。',
        },
        ko: {
          label: '다른 이유는 무엇이었고, 누가 그렇게 말했나요?',
          helpText: '언제 들으셨는지, 다른 사람도 함께 들었는지도 적어주세요.',
        },
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
        es: {
          label: 'En los 12 meses antes de que terminara su trabajo, ¿cuáles de estas cosas pasaron? Seleccione todas las que apliquen.',
          helpText: 'Un plan de mejora de desempeño es un plan por escrito que le dijeron que siguiera para poder conservar su trabajo.',
          options: [
            'Advertencia o reporte por escrito',
            'Advertencia verbal',
            'Suspensión',
            'Plan de mejora de desempeño',
            'Una mala evaluación de desempeño',
            'Una buena evaluación de desempeño',
            'Un aumento de sueldo',
            'Un bono',
            'Un ascenso o más responsabilidades',
            'Un reconocimiento o una felicitación en público',
            'Me negué a firmar un reporte',
            'Escribí o envié una respuesta diciendo que no estaba de acuerdo con un reporte',
            'Ninguna de estas',
            'No recuerdo'
          ],
        },
        zh: {
          label: '在您工作结束前的 12 个月里，发生过以下哪些情况？可多选。',
          helpText: '“绩效改进计划”是指公司要求您照做、否则无法保住工作的书面计划。',
          options: [
            '书面警告或处分记录',
            '口头警告',
            '停职',
            '绩效改进计划',
            '差评的绩效考核',
            '好评的绩效考核',
            '加薪',
            '奖金',
            '升职或增加职责',
            '获奖或被公开表扬',
            '我拒绝在处分记录上签字',
            '我写了或发了回应，表示不同意处分记录',
            '以上都没有',
            '我不记得了',
          ],
        },
        ko: {
          label: '일을 그만두기 전 12개월 동안 다음 중 있었던 일은 무엇인가요? 해당되는 것 모두 선택하세요.',
          helpText: '성과개선계획(PIP)이란 직장을 유지하려면 따라야 한다고 통보받은 서면 계획을 말합니다.',
          options: [
            '서면 경고·징계 기록',
            '구두 경고',
            '정직',
            '성과개선계획(PIP)',
            '낮은 인사 평가',
            '좋은 인사 평가',
            '임금 인상',
            '보너스',
            '승진 또는 업무 확대',
            '표창이나 공개 칭찬',
            '징계 기록에 서명을 거부함',
            '징계에 동의하지 않는다는 반론을 쓰거나 보냄',
            '해당 없음',
            '기억나지 않음',
          ],
        },
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
        es: {
          label: 'En los 3 meses antes de que terminara su trabajo, ¿pasó alguna de estas cosas? Seleccione todas las que apliquen.',
          helpText: 'Incluya solamente lo que pasó en los últimos 3 meses antes de que terminara su trabajo.',
          options: [
            'Me quejé del pago, las horas o los descansos',
            'Me quejé de la seguridad en el trabajo',
            'Me quejé de trato injusto o de acoso',
            'Reporté algo que yo creía que era ilegal',
            'Me negué a hacer algo que yo creía que estaba mal o era peligroso',
            'Me lastimé en el trabajo o presenté un reclamo por lesión de trabajo',
            'Falté al trabajo por enfermedad o por una lesión',
            'Pedí tiempo libre o un cambio en el trabajo por razones de salud',
            'Le avisé a la empresa que estaba embarazada',
            'Pedí tiempo libre para cuidar a un familiar',
            'Tomé tiempo libre para servir de jurado, ir a la corte o votar',
            'Pedí un cambio en el trabajo por razones religiosas',
            'Pedí ver mis registros de pago o mi expediente de personal',
            'Hablé con compañeros de trabajo sobre el pago o las condiciones de trabajo',
            'Ayudé con la queja o la investigación de otra persona',
            'Ninguna de estas'
          ],
        },
        zh: {
          label: '在您工作结束前的 3 个月里，有发生以下情况吗？可多选。',
          helpText: '只统计工作结束前最后 3 个月内发生的事。',
          options: [
            '我抱怨过工资、工时或休息问题',
            '我抱怨过工作场所的安全问题',
            '我抱怨过受到不公平对待或骚扰',
            '我举报过我认为违法的事',
            '我拒绝做我认为不当或不安全的事',
            '我在工作中受伤，或提出过工伤申请',
            '我因生病或受伤而缺勤',
            '我因健康原因请假或要求调整工作',
            '我告知公司我怀孕了',
            '我请假照顾家人',
            '我因陪审义务、出庭或投票请假',
            '我因宗教原因要求调整工作',
            '我要求查看自己的工资记录或人事档案',
            '我和同事谈论过工资或工作条件',
            '我协助过别人的投诉或调查',
            '以上都没有',
          ],
        },
        ko: {
          label: '일을 그만두기 전 3개월 동안 다음과 같은 일이 있었나요? 해당되는 것 모두 선택하세요.',
          helpText: '일을 그만두기 전 마지막 3개월 안에 있었던 일만 선택해 주세요.',
          options: [
            '급여·근무시간·휴게시간에 대해 문제를 제기함',
            '직장 안전 문제를 제기함',
            '부당한 대우나 괴롭힘에 대해 문제를 제기함',
            '위법하다고 생각한 일을 신고함',
            '부당하거나 위험하다고 생각한 일을 거부함',
            '업무 중 다치거나 산재를 신청함',
            '아프거나 다쳐서 결근함',
            '건강 문제로 휴가나 업무 조정을 요청함',
            '임신 사실을 회사에 알림',
            '가족을 돌보기 위해 휴가를 요청함',
            '배심원·법원 출석·투표를 위해 휴가를 씀',
            '종교적 이유로 업무 조정을 요청함',
            '급여 기록이나 인사 파일 열람을 요청함',
            '동료와 급여나 근로조건에 대해 이야기함',
            '다른 사람의 진정이나 조사에 협조함',
            '해당 없음',
          ],
        },
      },
      {
        id: 'wt_before_events_who_knew',
        label: 'For anything you checked above, who at the company knew about it?',
        type: 'textarea',
        helpText: 'Names and job titles, when they found out, and how you know they knew. Leave blank if you checked nothing.',
        es: {
          label: 'De lo que marcó arriba, ¿quién en la empresa lo sabía?',
          helpText: 'Nombres y puestos, cuándo se enteraron y cómo sabe usted que lo sabían. Deje en blanco si no marcó nada.',
        },
        zh: {
          label: '您上面勾选的任何一项，公司里有谁知道？',
          helpText: '请写姓名和职位、他们何时得知，以及您怎么知道他们知情。如果上面没有勾选任何项，可以留空。',
        },
        ko: {
          label: '위에서 체크하신 일에 대해 회사에서 누가 알고 있었나요?',
          helpText: '이름과 직책, 언제 알게 되었는지, 알고 있었다고 판단하시는 근거를 적어주세요. 위에서 아무것도 체크하지 않으셨다면 비워두셔도 됩니다.',
        },
      },
      {
        id: 'wt_comparator',
        label: 'Do you know a coworker who was in a similar situation and kept their job?',
        type: 'yes_no',
        helpText: 'For example, someone with the same absences, the same mistake, or the same kind of complaint against them.',
        es: {
          label: '¿Conoce a algún compañero de trabajo que estuvo en una situación parecida y conservó su trabajo?',
          helpText: 'Por ejemplo, alguien con las mismas faltas al trabajo, el mismo error o el mismo tipo de queja en su contra.',
        },
        zh: {
          label: '您知道有同事处境相似却保住了工作吗？',
          helpText: '例如，同样缺勤、犯同样的错，或同样被投诉过的人。',
        },
        ko: {
          label: '비슷한 상황이었는데 직장을 유지한 동료를 알고 계신가요?',
          helpText: '예: 결근 횟수가 비슷했거나, 같은 실수를 했거나, 비슷한 문제 제기를 받았던 사람입니다.',
        },
      },
      {
        id: 'wt_comparator_details',
        label: 'Who are they, and what happened to them?',
        type: 'textarea',
        helpText: 'Names and job titles if you know them, who their supervisor was, and how you found out.',
        showIf: { questionId: 'wt_comparator', value: 'yes' },
        es: {
          label: '¿Quién es esa persona y qué pasó con ella?',
          helpText: 'Nombre y puesto si los sabe, quién era el supervisor de esa persona y cómo se enteró usted.',
        },
        zh: {
          label: '那是谁？他们后来怎么样了？',
          helpText: '如果知道，请写上姓名和职位、他们的主管是谁，以及您是怎么知道的。',
        },
        ko: {
          label: '그 사람은 누구이고, 어떻게 되었나요?',
          helpText: '아시는 경우 이름과 직책, 그 사람의 상사가 누구였는지, 어떻게 알게 되셨는지 적어주세요.',
        },
      },
      {
        id: 'wt_papers_offered',
        label: 'On or after your last day, were you asked to sign anything?',
        type: 'yes_no',
        helpText: 'For example severance papers, a resignation letter, an agreement, or a receipt for your final check. Severance means money offered when your job ends, usually in exchange for signing something.',
        es: {
          label: '¿Le pidieron firmar algo en su último día de trabajo o después?',
          helpText: 'Por ejemplo, papeles de indemnización, una carta de renuncia, un acuerdo o un recibo de su último cheque. La indemnización (severance) es dinero que le ofrecen cuando termina su trabajo, casi siempre a cambio de que firme algo.',
        },
        zh: {
          label: '在您最后一天上班当天或之后，公司有没有要您签署什么文件？',
          helpText: '例如离职补偿协议、辞职信、协议书，或最后一笔工资的签收单。“离职补偿”是指工作结束时给的一笔钱，通常需要您签署某份文件才能拿到。',
        },
        ko: {
          label: '마지막 근무일이나 그 이후에 서명하라고 받은 서류가 있나요?',
          helpText: '예: 퇴직 위로금 서류, 사직서, 합의서, 마지막 급여 수령 확인서 등입니다. 퇴직 위로금이란 일이 끝날 때 보통 무언가에 서명하는 조건으로 주는 돈을 말합니다.',
        },
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
        es: {
          label: '¿Qué hizo con esos papeles?',
          helpText: 'Guarde una copia de todo lo que le dieron, aunque no lo haya firmado.',
          options: [
            'Los firmé',
            'No los firmé',
            'Me los llevé a casa y nunca los entregué',
            'Todavía lo estoy pensando',
            'No recuerdo'
          ],
        },
        zh: {
          label: '那些文件您怎么处理了？',
          helpText: '即使没有签，也请把拿到的文件留一份副本。',
          options: [
            '我签了',
            '我没有签',
            '我带回家了，一直没有交回去',
            '我还在考虑',
            '我不记得了',
          ],
        },
        ko: {
          label: '그 서류를 어떻게 하셨나요?',
          helpText: '서명하지 않으셨더라도 받으신 서류는 사본을 보관해 주세요.',
          options: [
            '서명했습니다',
            '서명하지 않았습니다',
            '집에 가져갔고 돌려주지 않았습니다',
            '아직 고민 중입니다',
            '기억나지 않습니다',
          ],
        },
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
        es: {
          label: 'Desde que terminó su trabajo, ¿cuáles de estas cosas han pasado? Seleccione todas las que apliquen.',
          options: [
            'Solicité beneficios de desempleo',
            'Me aprobaron el reclamo de desempleo',
            'Me negaron el reclamo de desempleo',
            'La empresa se opuso a mi reclamo de desempleo',
            'He estado buscando otro trabajo',
            'Ya empecé en otro trabajo',
            'No he podido trabajar',
            'Supe lo que la empresa les dijo a otras personas sobre por qué me fui',
            'La empresa o su abogado se ha comunicado conmigo',
            'Le pedí a la empresa mi expediente de personal o mis registros de pago',
            'Ninguna de estas'
          ],
        },
        zh: {
          label: '工作结束之后，以下哪些情况发生过？可多选。',
          options: [
            '我申请了失业救济金',
            '我的失业救济申请获批了',
            '我的失业救济申请被拒绝了',
            '公司对我的失业救济申请提出了异议',
            '我一直在找其他工作',
            '我已经开始了另一份工作',
            '我一直没办法工作',
            '我听说了公司如何向别人解释我离职的原因',
            '公司或其律师联系过我',
            '我向公司索取过人事档案或工资记录',
            '以上都没有',
          ],
        },
        ko: {
          label: '일을 그만둔 뒤 다음 중 있었던 일은 무엇인가요? 해당되는 것 모두 선택하세요.',
          options: [
            '실업급여를 신청했습니다',
            '실업급여 신청이 승인되었습니다',
            '실업급여 신청이 거부되었습니다',
            '회사가 제 실업급여 신청에 이의를 제기했습니다',
            '다른 일자리를 찾고 있습니다',
            '다른 곳에서 일을 시작했습니다',
            '일을 할 수 없는 상태였습니다',
            '회사가 제 퇴사 이유를 다른 사람에게 어떻게 말했는지 들었습니다',
            '회사나 회사 변호사가 저에게 연락했습니다',
            '회사에 인사 파일이나 급여 기록을 요청했습니다',
            '해당 없음',
          ],
        },
      },
    ],
  },
  {
    key: 'harassment',
    caseType: 'Harassment / Discrimination',
    setName: 'Harassment Follow-Up',
    setNameTranslations: {
      es: 'Seguimiento: Acoso / Discriminación',
      zh: '骚扰与歧视补充问卷',
      ko: '괴롭힘·차별 추가 질문',
    },
    description:
      'Send after reading the intake when the client marked harassment or discrimination — pulls incident-level detail, witnesses, the reporting chain, and what the employer actually did.',
    questions: [
      {
        id: 'hd_harasser_name',
        label: 'Who is the main person who said or did these things?',
        type: 'text',
        required: true,
        helpText: 'First and last name if you know it. A nickname or job title is fine if that is all you have.',
        es: {
          label: '¿Quién es la persona principal que dijo o hizo estas cosas?',
          helpText: 'Nombre y apellido si los sabe. Un apodo o el puesto que tenía está bien si es lo único que tiene.',
        },
        zh: {
          label: '说这些话、做这些事的主要是谁？',
          helpText: '如果知道，请写全名。只知道绰号或职位也可以。',
        },
        ko: {
          label: '그런 말이나 행동을 한 주된 사람은 누구인가요?',
          helpText: '아시면 성과 이름을 적어주세요. 별명이나 직책만 아셔도 괜찮습니다.',
        },
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
        es: {
          label: '¿Qué puesto tenía esa persona comparado con el suyo?',
          options: [
            'Mi supervisor o gerente directo',
            'Un gerente por encima de mi supervisor',
            'Un dueño, directivo o ejecutivo',
            'Un familiar del dueño',
            'Un compañero de trabajo de mi mismo nivel',
            'Alguien a quien yo supervisaba',
            'Un cliente, proveedor o contratista',
            'Otra persona'
          ],
        },
        zh: {
          label: '那个人的职位与您相比是什么关系？',
          options: [
            '我的直属主管或经理',
            '比我主管更高层的经理',
            '老板、高管或负责人',
            '老板的家人',
            '与我同级的同事',
            '我管理的下属',
            '顾客、客户、供应商或承包商',
            '其他人',
          ],
        },
        ko: {
          label: '그 사람의 직위는 고객님과 어떤 관계였나요?',
          options: [
            '직속 상사 또는 매니저',
            '직속 상사보다 위의 관리자',
            '사주, 임원, 경영진',
            '사주의 가족',
            '저와 같은 직급의 동료',
            '제가 관리하던 직원',
            '고객, 거래처, 납품업체, 하청업체 사람',
            '그 밖의 사람',
          ],
        },
      },
      {
        id: 'hd_others_involved',
        label: 'Did anyone else at the company say or do these things to you?',
        type: 'yes_no',
        es: {
          label: '¿Alguien más de la empresa le dijo o le hizo estas cosas?',
        },
        zh: {
          label: '公司里还有其他人对您说过或做过这些事吗？',
        },
        ko: {
          label: '회사의 다른 사람도 고객님께 그런 말이나 행동을 했나요?',
        },
      },
      {
        id: 'hd_others_involved_details',
        label: 'Who else, and what did each person say or do?',
        type: 'textarea',
        helpText: 'Give each person\'s name or job title, and what that person did.',
        showIf: { questionId: 'hd_others_involved', value: 'yes' },
        es: {
          label: '¿Quién más, y qué dijo o hizo cada persona?',
          helpText: 'Ponga el nombre o el puesto de cada persona y lo que hizo.',
        },
        zh: {
          label: '还有谁？每个人分别说了什么、做了什么？',
          helpText: '请写下每个人的姓名或职位，以及那个人具体做了什么。',
        },
        ko: {
          label: '또 누구이며, 각각 어떤 말이나 행동을 했나요?',
          helpText: '각 사람의 이름이나 직책과, 그 사람이 한 행동을 적어주세요.',
        },
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
        es: {
          label: '¿Cuáles de estas cosas le pasaron? (Seleccione todas las que apliquen)',
          helpText: 'Marque todo lo que aplique. No hay respuestas incorrectas.',
          options: [
            'Bromas, comentarios o palabras ofensivas sobre mí o sobre gente como yo',
            'Que me pusieran apodos o me insultaran',
            'Comentarios sobre mi cuerpo, mi apariencia o mi ropa',
            'Comentarios o preguntas sobre mi vida privada o mi vida sexual',
            'Que me invitaran a salir o me pidieran favores sexuales',
            'Que me tocaran o me abrazaran sin que yo quisiera, o que me cerraran el paso',
            'Que me enseñaran o me mandaran fotos, videos o mensajes que yo no quería ver',
            'Que se burlaran de mi acento o mi idioma, o que me dijeran que no lo hablara',
            'Comentarios sobre mi edad, mi religión, mi embarazo o mi condición médica',
            'Amenazas, gritos o que me avergonzaran delante de los demás',
            'Que me vigilaran o me supervisaran más de cerca que a los demás',
            'Que me dejaran fuera de juntas, capacitaciones u oportunidades de trabajo',
            'Que me dieran peores turnos, trabajos más pesados o menos horas que a los demás',
            'Que me pasaran por alto para un aumento, un ascenso o un cambio de puesto',
            'Otra cosa'
          ],
        },
        zh: {
          label: '以下哪些描述符合您的经历？可多选。',
          helpText: '凡是符合的都请勾选。没有所谓答错。',
          options: [
            '针对我或像我这样的人的玩笑、评论或蔑称',
            '辱骂或人身攻击',
            '对我的身材、外貌或衣着的评论',
            '对我的私生活或性生活的评论或追问',
            '约会邀请或性方面的要求',
            '不受欢迎的触碰、拥抱或挡路',
            '被展示或发送我不想看的照片、视频或信息',
            '嘲笑我的口音或母语，或不许我说母语',
            '针对我的年龄、宗教、怀孕或身体状况的评论',
            '威胁、吼叫，或在众人面前羞辱我',
            '比别人受到更严密的监视或盯梢',
            '被排除在会议、培训或工作机会之外',
            '拿到比别人更差的班次、更重的活或更少的工时',
            '加薪、升职或调动被跳过',
            '其他',
          ],
        },
        ko: {
          label: '다음 중 고객님이 겪으신 일에 해당하는 것은 무엇인가요? 해당되는 것 모두 선택하세요.',
          helpText: '해당되는 것은 모두 선택해 주세요. 틀린 답은 없습니다.',
          options: [
            '저나 저와 같은 사람들에 대한 농담·발언·비하 표현',
            '욕설이나 인신공격',
            '제 몸매, 외모, 옷차림에 대한 발언',
            '제 사생활이나 성생활에 대한 발언이나 질문',
            '데이트 요구나 성적인 요구',
            '원치 않는 신체 접촉, 포옹, 길 막기',
            '보고 싶지 않은 사진·영상·메시지를 보여주거나 보냄',
            '제 억양이나 모국어를 흉내 내거나 쓰지 못하게 함',
            '제 나이, 종교, 임신, 건강 상태에 대한 발언',
            '협박, 고함, 사람들 앞에서 망신 주기',
            '다른 사람보다 더 심하게 감시당하거나 확인당함',
            '회의, 교육, 업무 기회에서 배제됨',
            '다른 사람보다 나쁜 근무 시간, 힘든 일, 적은 근무시간을 받음',
            '임금 인상·승진·전보에서 제외됨',
            '그 밖의 것',
          ],
        },
      },
      {
        id: 'hd_first_incident_date',
        label: 'About when did the first incident happen?',
        type: 'date',
        helpText: 'Your best guess is fine. If you only remember the month, pick any day in that month.',
        es: {
          label: '¿Más o menos cuándo pasó la primera vez?',
          helpText: 'Una fecha aproximada está bien. Si solo recuerda el mes, escoja cualquier día de ese mes.',
        },
        zh: {
          label: '第一次发生大约是什么时候？',
          helpText: '写大概的时间就可以。如果只记得月份，选那个月的任意一天即可。',
        },
        ko: {
          label: '처음 일이 있었던 것은 대략 언제인가요?',
          helpText: '대략적인 시기도 괜찮습니다. 월만 기억나시면 그 달의 아무 날짜나 선택하세요.',
        },
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
        es: {
          label: '¿Con qué frecuencia pasaba esto?',
          options: [
            'Todos los días o casi todos los días',
            'Varias veces por semana',
            'Como una vez por semana',
            'Varias veces al mes',
            'Cada pocos meses',
            'Unas pocas veces en total',
            'Una sola vez'
          ],
        },
        zh: {
          label: '这种情况多久发生一次？',
          options: [
            '每天或几乎每天',
            '每周几次',
            '大约每周一次',
            '每月几次',
            '每隔几个月',
            '总共几次',
            '只有一次',
          ],
        },
        ko: {
          label: '그런 일이 얼마나 자주 있었나요?',
          options: [
            '매일 또는 거의 매일',
            '일주일에 몇 번',
            '일주일에 한 번 정도',
            '한 달에 몇 번',
            '몇 달에 한 번',
            '통틀어 몇 번',
            '한 번',
          ],
        },
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
        es: {
          label: '¿Cambió con el tiempo?',
          options: [
            'Empeoró con el tiempo',
            'Siguió más o menos igual',
            'A veces pasaba y a veces no',
            'Disminuyó o paró',
            'No estoy seguro'
          ],
        },
        zh: {
          label: '情况随时间有变化吗？',
          options: [
            '越来越严重',
            '大致维持不变',
            '时有时无',
            '有所缓和或停止了',
            '不确定',
          ],
        },
        ko: {
          label: '시간이 지나면서 달라졌나요?',
          options: [
            '갈수록 심해졌습니다',
            '비슷하게 계속되었습니다',
            '있다가 없다가 했습니다',
            '잦아들거나 멈췄습니다',
            '잘 모르겠습니다',
          ],
        },
      },
      {
        id: 'hd_worst_incident',
        label: 'Tell us about the one incident that stands out the most.',
        type: 'textarea',
        required: true,
        helpText: 'About when it happened, where you were, what was said or done, and what you did right after. Please use the actual words if you remember them, even if they are offensive — the exact words matter. Take your time.',
        es: {
          label: 'Cuéntenos del incidente que más recuerda.',
          helpText: 'Más o menos cuándo pasó, dónde estaba usted, qué se dijo o se hizo, y qué hizo usted justo después. Por favor use las mismas palabras que se dijeron, si las recuerda, aunque sean ofensivas — las palabras exactas importan. Tómese su tiempo.',
        },
        zh: {
          label: '请告诉我们印象最深的那一次。',
          helpText: '大约什么时候、您在哪里、说了或做了什么、事后您怎么做的。如果记得原话，请照原话写下来，即使内容不堪入耳 — 具体用词很重要。请慢慢写。',
        },
        ko: {
          label: '가장 기억에 남는 한 번에 대해 알려주세요.',
          helpText: '대략 언제, 어디에 계셨고, 어떤 말과 행동이 있었으며, 직후에 어떻게 하셨는지 적어주세요. 기억나시면 실제로 오간 말을 그대로 적어주세요. 불쾌한 표현이라도 정확한 표현이 중요합니다. 천천히 쓰셔도 됩니다.',
        },
      },
      {
        id: 'hd_worst_incident_witnesses',
        label: 'Who else was there when that happened?',
        type: 'textarea',
        helpText: 'Names, or a description like \'the tall cook on the night shift\', and what each person would have seen or heard. Write \'no one\' if you were alone.',
        es: {
          label: '¿Quién más estaba ahí cuando pasó eso?',
          helpText: 'Nombres, o una descripción como "el cocinero alto del turno de noche", y qué habría visto o escuchado cada persona. Escriba "nadie" si estaba solo.',
        },
        zh: {
          label: '那件事发生时还有谁在场？',
          helpText: '写姓名，或像“夜班那个高个子厨师”这样的描述，以及每个人可能看到或听到了什么。如果当时只有您一个人，请写“没有人”。',
        },
        ko: {
          label: '그 일이 있을 때 또 누가 있었나요?',
          helpText: '이름을 적으시거나 "야간 근무하던 키 큰 요리사"처럼 설명해 주세요. 각자 무엇을 보고 들었을지도 적어주세요. 혼자 계셨다면 "없음"이라고 적어주세요.',
        },
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
        es: {
          label: '¿A quién de la empresa le contó lo que pasó? (Seleccione todas las que apliquen)',
          options: [
            'Mi supervisor o gerente directo',
            'Un gerente por encima de mi supervisor',
            'Recursos Humanos o la oficina de personal',
            'Un dueño, directivo o ejecutivo',
            'Un encargado o la persona que me entrenó',
            'Un representante del sindicato',
            'Una línea telefónica, aplicación o línea anónima de reportes de la empresa',
            'No le conté a nadie de la empresa'
          ],
        },
        zh: {
          label: '您把这件事告诉了公司里的谁？可多选。',
          options: [
            '我的直属主管或经理',
            '比我主管更高层的经理',
            '人力资源或人事部门',
            '老板、高管或负责人',
            '组长或培训员',
            '工会代表',
            '公司热线、应用或匿名举报渠道',
            '我没有告诉公司里的任何人',
          ],
        },
        ko: {
          label: '회사에서 누구에게 이 일을 알리셨나요? 해당되는 것 모두 선택하세요.',
          options: [
            '직속 상사 또는 매니저',
            '직속 상사보다 위의 관리자',
            '인사팀 또는 인사 담당 부서',
            '사주, 임원, 경영진',
            '조장 또는 교육 담당자',
            '노조 대표',
            '회사 신고 전화·앱·익명 제보 창구',
            '회사의 누구에게도 알리지 않았습니다',
          ],
        },
      },
      {
        id: 'hd_first_report',
        label: 'Tell us about the first time you told someone at the company.',
        type: 'textarea',
        helpText: 'About when it was, exactly who you talked to, what you told them, and whether you said it out loud or sent it by text, email, or a form. If you never told anyone at the company, write that here instead.',
        es: {
          label: 'Cuéntenos de la primera vez que le contó a alguien de la empresa.',
          helpText: 'Más o menos cuándo fue, exactamente con quién habló, qué le dijo, y si lo dijo de palabra o lo mandó por mensaje de texto, correo electrónico o un formulario. Si nunca le contó a nadie de la empresa, escriba eso aquí.',
        },
        zh: {
          label: '请说说您第一次告知公司里某人的情形。',
          helpText: '大约是什么时候、具体找了谁、您告诉了他们什么，以及您是口头说的还是通过短信、邮件或表格提交的。如果您从未告知公司任何人，请在这里说明。',
        },
        ko: {
          label: '회사의 누군가에게 처음 알리셨을 때의 상황을 알려주세요.',
          helpText: '대략 언제였는지, 정확히 누구에게 말했는지, 무엇을 알렸는지, 말로 하셨는지 문자·이메일·양식으로 보내셨는지 적어주세요. 회사의 누구에게도 알리지 않으셨다면 그 사실을 적어주세요.',
        },
      },
      {
        id: 'hd_interviewed',
        label: 'Did anyone at the company sit down with you and ask questions about it?',
        type: 'yes_no_unsure',
        helpText: 'For example, HR, a manager, or someone from outside the company looking into it.',
        es: {
          label: '¿Alguien de la empresa se sentó con usted a hacerle preguntas sobre esto?',
          helpText: 'Por ejemplo, Recursos Humanos, un gerente, o alguien de fuera de la empresa que estaba investigando lo que pasó.',
        },
        zh: {
          label: '公司里有人正式找您坐下来询问过这件事吗？',
          helpText: '例如人力资源、某位经理，或公司外部前来调查的人。',
        },
        ko: {
          label: '회사에서 누군가 고객님을 앉혀 놓고 이 일에 대해 조사한 적이 있나요?',
          helpText: '예: 인사팀, 매니저, 또는 회사 밖에서 조사하러 온 사람 등입니다.',
        },
      },
      {
        id: 'hd_interview_details',
        label: 'Who spoke with you, about when, and what did they ask?',
        type: 'textarea',
        helpText: 'Also tell us if it was recorded, if you signed anything, if you were given a copy, and whether anyone ever told you what they decided.',
        showIf: { questionId: 'hd_interviewed', value: 'yes' },
        es: {
          label: '¿Quién habló con usted, más o menos cuándo, y qué le preguntaron?',
          helpText: 'Díganos también si grabaron la conversación, si firmó algo, si le dieron una copia, y si alguien le dijo qué fue lo que decidieron.',
        },
        zh: {
          label: '是谁跟您谈的？大约什么时候？他们问了些什么？',
          helpText: '也请告诉我们是否有录音、您是否签了什么、有没有拿到副本，以及是否有人告知过您最后的处理结果。',
        },
        ko: {
          label: '누가 면담했고, 대략 언제였으며, 어떤 질문을 하던가요?',
          helpText: '녹음이 있었는지, 서명한 것이 있는지, 사본을 받으셨는지, 결과를 알려준 사람이 있었는지도 함께 적어주세요.',
        },
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
        es: {
          label: 'Después de contarle a la empresa, ¿cuáles de estas cosas pasaron? (Seleccione todas las que apliquen)',
          options: [
            'El comportamiento paró',
            'El comportamiento siguió más o menos igual',
            'El comportamiento empeoró',
            'A la otra persona la cambiaron de lugar, la suspendieron o la despidieron',
            'Me cambiaron de turno, de equipo o de lugar',
            'Me recortaron las horas o el pago',
            'Me cambiaron mis labores',
            'Me levantaron un reporte o me disciplinaron',
            'Me suspendieron',
            'Me despidieron o me sentí forzado a renunciar',
            'Mis compañeros dejaron de hablarme',
            'Nada cambió',
            'Nunca le conté nada a la empresa'
          ],
        },
        zh: {
          label: '您告知公司之后，发生了以下哪些情况？可多选。',
          options: [
            '那些行为停止了',
            '那些行为大致照旧继续',
            '那些行为变本加厉',
            '对方被调走、停职或解雇',
            '我被调到别的班次、团队或地点',
            '我的工时或工资被削减',
            '我的工作职责被改变',
            '我被书面警告或处分',
            '我被停职',
            '我被解雇或被迫辞职',
            '同事们不再和我说话',
            '什么都没有改变',
            '我从未告知公司',
          ],
        },
        ko: {
          label: '회사에 알린 뒤 다음 중 어떤 일이 있었나요? 해당되는 것 모두 선택하세요.',
          options: [
            '그 행동이 멈췄습니다',
            '그 행동이 비슷하게 계속되었습니다',
            '그 행동이 더 심해졌습니다',
            '상대방이 이동·정직·해고되었습니다',
            '제가 다른 근무 시간·팀·지점으로 옮겨졌습니다',
            '제 근무시간이나 급여가 줄었습니다',
            '제 업무 내용이 바뀌었습니다',
            '제가 징계나 서면 경고를 받았습니다',
            '제가 정직당했습니다',
            '해고되거나 그만둘 수밖에 없었습니다',
            '동료들이 저와 말을 하지 않게 되었습니다',
            '달라진 것이 없습니다',
            '회사에 알린 적이 없습니다',
          ],
        },
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
        es: {
          label: '¿Cómo le afectó esto? (Seleccione todas las que apliquen)',
          helpText: 'Comparta solo lo que se sienta cómodo de contar.',
          options: [
            'Problemas para dormir',
            'Ansiedad, pánico o preocupación constante',
            'Sentirme deprimido o sin esperanza',
            'Dolores de cabeza, problemas del estómago u otros síntomas físicos',
            'Cambios en el apetito o en el peso',
            'Evitar ciertos turnos, lugares o personas en el trabajo',
            'Faltar al trabajo o tomar tiempo libre',
            'Problemas para concentrarme o cometer errores en el trabajo',
            'Empecé a tomar medicamentos o me aumentaron la dosis',
            'Empecé a ir a consejería o terapia',
            'Tensión en mi casa o con mi familia',
            'Ninguna de estas',
            'Otra cosa'
          ],
        },
        zh: {
          label: '这件事对您造成了什么影响？可多选。',
          helpText: '只填您愿意说的部分就好。',
          options: [
            '失眠',
            '焦虑、恐慌或持续担忧',
            '感到抑郁或绝望',
            '头痛、肠胃不适或其他身体症状',
            '食欲或体重改变',
            '回避某些班次、场所或工作中的某些人',
            '缺勤或请假',
            '工作时无法集中或频频出错',
            '开始服药或加大药量',
            '开始接受心理咨询或治疗',
            '家庭关系或与家人相处出现压力',
            '以上都没有',
            '其他',
          ],
        },
        ko: {
          label: '이 일이 고객님께 어떤 영향을 주었나요? 해당되는 것 모두 선택하세요.',
          helpText: '말씀하기 편하신 범위에서만 적어주세요.',
          options: [
            '잠을 잘 못 잠',
            '불안, 공황, 계속되는 걱정',
            '우울하거나 절망적인 기분',
            '두통, 소화 문제, 그 밖의 신체 증상',
            '식욕이나 체중의 변화',
            '직장의 특정 시간대·장소·사람을 피하게 됨',
            '결근하거나 휴가를 씀',
            '집중이 어렵거나 업무에서 실수가 늘어남',
            '약을 복용하기 시작했거나 양이 늘어남',
            '상담이나 치료를 받기 시작함',
            '가정이나 가족 관계에 긴장이 생김',
            '해당 없음',
            '그 밖의 것',
          ],
        },
      },
      {
        id: 'hd_medical_care',
        label: 'If you saw a doctor, therapist, or counselor because of this, who did you see and about when?',
        type: 'textarea',
        helpText: 'The name and city of the office and roughly when you started is enough. Leave this blank if you did not see anyone.',
        es: {
          label: 'Si fue con un doctor, terapeuta o consejero por esto, ¿con quién fue y más o menos cuándo?',
          helpText: 'Basta con el nombre y la ciudad del consultorio y más o menos cuándo empezó. Deje esto en blanco si no fue con nadie.',
        },
        zh: {
          label: '如果您因此看过医生、心理师或咨询师，是哪一位？大约什么时候开始的？',
          helpText: '写下诊所名称和所在城市，以及大约何时开始就诊即可。如果没有看过，请留空。',
        },
        ko: {
          label: '이 일로 의사·치료사·상담사를 만나셨다면, 어디에서 누구를 만나셨고 대략 언제부터인가요?',
          helpText: '병원·상담소 이름과 도시, 그리고 대략 언제부터인지만 적어주셔도 됩니다. 만나신 적이 없다면 비워두세요.',
        },
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
        es: {
          label: '¿Qué cosas todavía tiene sobre estos incidentes? (Seleccione todas las que apliquen)',
          helpText: 'Díganos en la última pregunta si algo quedó en un teléfono, correo o cuenta del trabajo a los que ya no tiene acceso.',
          options: [
            'Mensajes de texto o mensajes de voz de esa persona',
            'Correos electrónicos sobre esto',
            'Mensajes de una aplicación de trabajo como Slack, Teams o WhatsApp',
            'Fotos o capturas de pantalla de notas, imágenes o grafiti',
            'Grabaciones de audio o video',
            'Mis propias notas, diario o calendario donde apunté lo que pasó',
            'La queja o el formulario que llené para la empresa',
            'La respuesta por escrito de la empresa a mi queja',
            'La política de la empresa sobre el acoso o los materiales de capacitación que me dieron',
            'Nombres y teléfonos de las personas que lo vieron',
            'No tengo nada por escrito'
          ],
        },
        zh: {
          label: '关于这些事，您现在手上还留有哪些东西？可多选。',
          helpText: '如果某些资料存在您已经无法登录的公司手机、公司邮箱或公司账号里，请在最后一题告诉我们。',
          options: [
            '对方发来的短信或语音留言',
            '与此事有关的电子邮件',
            'Slack、Teams、WhatsApp 等工作应用里的消息',
            '字条、图片或涂鸦的照片或截图',
            '录音或录像',
            '我自己写下经过的笔记、日记或日历',
            '我为公司填写的投诉表或表格',
            '公司对我的投诉做出的书面答复',
            '公司发给我的反骚扰规章或培训材料',
            '目击者的姓名和电话',
            '我没有留下任何书面资料',
          ],
        },
        ko: {
          label: '이 일들에 대해 지금 가지고 계신 것은 무엇인가요? 해당되는 것 모두 선택하세요.',
          helpText: '회사 휴대폰, 회사 이메일, 회사 계정처럼 지금은 접근할 수 없는 곳에 있는 자료가 있다면 마지막 질문에서 알려주세요.',
          options: [
            '그 사람이 보낸 문자나 음성 메시지',
            '이 일과 관련된 이메일',
            'Slack, Teams, WhatsApp 같은 업무용 앱의 메시지',
            '메모·이미지·낙서를 찍은 사진이나 화면 캡처',
            '녹음이나 녹화 파일',
            '무슨 일이 있었는지 적어 둔 제 메모·일기·달력',
            '회사에 제출한 진정서나 양식',
            '제 진정에 대한 회사의 서면 답변',
            '회사가 준 괴롭힘 방지 규정이나 교육 자료',
            '목격한 사람들의 이름과 전화번호',
            '서면으로 가진 것은 없습니다',
          ],
        },
      },
    ],
  },
  {
    key: 'retaliation',
    caseType: 'Retaliation',
    setName: 'Retaliation Follow-Up',
    setNameTranslations: {
      es: 'Seguimiento de Represalias',
      zh: '报复行为补充问卷',
      ko: '보복 조치 추가 질문',
    },
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
        es: {
          label: '¿Cuáles de estas cosas hizo usted mientras trabajaba ahí? Seleccione todas las que apliquen.',
          helpText: 'Preguntamos por cualquier vez que usted dijo algo, hizo una pregunta o se negó a hacer algo en el trabajo, aunque le haya parecido poca cosa.',
          options: [
            'Me quejé con un supervisor o gerente',
            'Me quejé con Recursos Humanos, el dueño o alguien arriba de mi gerente',
            'Me quejé ante una oficina o agencia del gobierno',
            'Me negué a hacer algo que yo creía ilegal o peligroso',
            'Reporté un problema de seguridad o una lesión en el trabajo',
            'Presenté o pregunté sobre un reclamo por lesión en el trabajo',
            'Pregunté sobre mi pago, mis horas o mis descansos',
            'Pedí tiempo libre por mi salud o la salud de un familiar',
            'Pedí un cambio en el trabajo por una condición médica, discapacidad o embarazo',
            'Apoyé a un compañero que se quejó, o contesté preguntas sobre su queja',
            'Hablé con mis compañeros sobre el pago o las condiciones de trabajo',
            'Otra cosa'
          ],
        },
        zh: {
          label: '在那里工作期间，您做过以下哪些事？凡是符合的都请勾选。',
          helpText: '我们想了解的是您在工作中任何一次开口、提问或拒绝的经历 — 即使当时觉得只是小事。',
          options: [
            '向主管或经理投诉',
            '向人力资源、老板或我主管之上的人投诉',
            '向政府部门或机构投诉',
            '拒绝做我认为违法或不安全的事',
            '举报安全隐患或工伤',
            '提出或询问过工伤理赔',
            '询问我的工资、工时或休息',
            '为自己或家人的健康请假',
            '因身体状况、残疾或怀孕要求调整工作',
            '支持投诉的同事，或就其投诉接受询问',
            '和同事谈论工资或工作条件',
            '其他',
          ],
        },
        ko: {
          label: '그곳에서 일하는 동안 다음 중 하신 일은 무엇인가요? 해당되는 것 모두 선택하세요.',
          helpText: '직장에서 목소리를 내거나, 질문하거나, 무언가를 거부하신 모든 경우를 여쭙는 것입니다. 사소해 보였더라도 괜찮습니다.',
          options: [
            '상사나 매니저에게 문제를 제기함',
            '인사팀, 사주, 상사보다 위 사람에게 문제를 제기함',
            '관공서나 정부 기관에 신고함',
            '위법하거나 위험하다고 생각한 일을 거부함',
            '안전 문제나 업무상 부상을 신고함',
            '산재를 신청하거나 문의함',
            '급여, 근무시간, 휴게시간에 대해 문의함',
            '본인이나 가족의 건강을 이유로 휴가를 요청함',
            '질병·장애·임신을 이유로 업무 조정을 요청함',
            '문제를 제기한 동료를 지지하거나 그 조사에 응함',
            '동료와 급여나 근로조건에 대해 이야기함',
            '그 밖의 것',
          ],
        },
      },
      {
        id: 'rt_activity_first_date',
        label: 'About what date did you first do this?',
        type: 'date',
        helpText: 'If you are not sure of the exact day, pick the closest date you can remember.',
        es: {
          label: '¿Más o menos en qué fecha lo hizo por primera vez?',
          helpText: 'Si no está seguro del día exacto, escoja la fecha más cercana que recuerde.',
        },
        zh: {
          label: '您第一次这么做大约是什么日期？',
          helpText: '如果不确定具体是哪天，请选一个您能想起的最接近的日期。',
        },
        ko: {
          label: '처음 그렇게 하신 것은 대략 언제인가요?',
          helpText: '정확한 날짜가 기억나지 않으시면 가장 가까운 날짜를 골라주세요.',
        },
      },
      {
        id: 'rt_activity_to_whom',
        label: 'Who did you go to? List each person\'s name and job title.',
        type: 'textarea',
        helpText: 'A first name and their job is fine if you do not know the last name.',
        es: {
          label: '¿A quién acudió? Anote el nombre y el puesto de cada persona.',
          helpText: 'Si no sabe el apellido, basta con el nombre y el puesto que tenía.',
        },
        zh: {
          label: '您找的是谁？请列出每个人的姓名和职位。',
          helpText: '不知道姓氏的话，写名字和他们的工作也可以。',
        },
        ko: {
          label: '누구에게 가셨나요? 각 사람의 이름과 직책을 적어주세요.',
          helpText: '성을 모르시면 이름과 하는 일만 적어주셔도 됩니다.',
        },
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
        es: {
          label: '¿Cómo lo hizo? Seleccione todas las que apliquen.',
          options: [
            'En persona, hablando',
            'Por llamada telefónica',
            'Por mensaje de texto',
            'Por correo electrónico',
            'Por carta o nota en papel',
            'Por una app de trabajo como Slack, WhatsApp o Teams',
            'Con un formulario de queja de la empresa',
            'Por la línea de quejas o el sitio web de la empresa',
            'Con un formulario enviado a una oficina del gobierno',
            'Otra persona habló por mí',
            'Otro'
          ],
        },
        zh: {
          label: '您是怎么做的？凡是符合的都请勾选。',
          options: [
            '当面口头说的',
            '打电话',
            '短信',
            '电子邮件',
            '纸质信件或字条',
            'Slack、WhatsApp、Teams 等工作聊天软件',
            '公司投诉表',
            '公司热线或网站',
            '递交给政府部门的表格',
            '由别人代我提出',
            '其他',
          ],
        },
        ko: {
          label: '어떤 방법으로 하셨나요? 해당되는 것 모두 선택하세요.',
          options: [
            '직접 만나 말로',
            '전화',
            '문자 메시지',
            '이메일',
            '종이 서한이나 쪽지',
            'Slack, WhatsApp, Teams 같은 업무용 채팅 앱',
            '회사 진정 양식',
            '회사 신고 전화나 웹사이트',
            '관공서에 제출한 양식',
            '다른 사람이 대신 말해줌',
            '기타',
          ],
        },
      },
      {
        id: 'rt_activity_what_said',
        label: 'As best you remember, what did you actually say or write? Use your own words.',
        type: 'textarea',
        required: true,
        helpText: 'Quote yourself if you can. Example: I told Maria we were working through lunch and not getting paid for it.',
        es: {
          label: 'Hasta donde recuerde, ¿qué fue lo que dijo o escribió? Use sus propias palabras.',
          helpText: 'Si puede, repita sus palabras exactas. Ejemplo: Le dije a María que trabajábamos durante la hora de comida y que no nos pagaban esa hora.',
        },
        zh: {
          label: '尽您所能回忆，您当时实际说了或写了什么？请用您自己的话。',
          helpText: '如果可以，请直接引用自己的原话。例如：我跟 Maria 说我们午餐时间都在干活，却没有拿到工资。',
        },
        ko: {
          label: '기억나시는 대로, 실제로 어떤 말이나 글을 쓰셨나요? 고객님의 표현 그대로 적어주세요.',
          helpText: '가능하면 하신 말씀을 그대로 옮겨 적어주세요. 예: 점심시간에도 일하는데 그 시간은 급여가 안 나온다고 마리아에게 말했습니다.',
        },
      },
      {
        id: 'rt_activity_others_present',
        label: 'Was anyone else there, listening, or copied when you did this?',
        type: 'yes_no',
        es: {
          label: '¿Había alguien más presente, escuchando o en copia del mensaje cuando lo hizo?',
        },
        zh: {
          label: '您这么做的时候，还有其他人在场、听到，或被抄送吗？',
        },
        ko: {
          label: '그렇게 하실 때 다른 사람이 함께 있거나, 듣거나, 참조로 받았나요?',
        },
      },
      {
        id: 'rt_activity_others_present_who',
        label: 'Who else was there or copied? List each person and what they saw, heard, or received.',
        type: 'textarea',
        showIf: { questionId: 'rt_activity_others_present', value: 'yes' },
        es: {
          label: '¿Quién más estuvo presente o recibió copia? Anote cada persona y qué vio, escuchó o recibió.',
        },
        zh: {
          label: '还有谁在场或被抄送？请列出每个人，以及他们看到、听到或收到了什么。',
        },
        ko: {
          label: '또 누가 있었거나 참조로 받았나요? 각 사람과 그들이 보고·듣고·받은 것을 적어주세요.',
        },
      },
      {
        id: 'rt_knowledge_who',
        label: 'Which managers, supervisors, or owners do you believe found out about it? List each name and job title.',
        type: 'textarea',
        helpText: 'Include anyone you believe heard about it, even if you never spoke to them yourself.',
        es: {
          label: '¿Qué gerentes, supervisores o dueños cree usted que se enteraron? Anote el nombre y el puesto de cada uno.',
          helpText: 'Incluya a cualquiera que usted crea que se enteró, aunque nunca haya hablado con esa persona.',
        },
        zh: {
          label: '您认为哪些经理、主管或老板知道了这件事？请列出每个人的姓名和职位。',
          helpText: '包括您认为听说过此事的人，即使您本人从未跟他们谈过。',
        },
        ko: {
          label: '어떤 매니저·상사·사주가 이 일을 알게 되었다고 보시나요? 각각의 이름과 직책을 적어주세요.',
          helpText: '직접 이야기한 적이 없더라도 전해 들었을 것으로 보시는 사람을 모두 포함해 주세요.',
        },
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
        es: {
          label: '¿Cómo sabe que se enteraron? Seleccione todas las que apliquen.',
          options: [
            'Me dijeron algo sobre eso',
            'Los escuché hablando de eso',
            'Otra persona me dijo que ellos ya sabían',
            'Se mencionó en una reunión',
            'Lo vi en un correo, un mensaje de texto u otro mensaje',
            'Estaban presentes cuando lo dije',
            'Me mandaron llamar para hablar de eso',
            'Recibí una carta o un correo de respuesta sobre eso',
            'No estoy seguro de cómo se enteraron'
          ],
        },
        zh: {
          label: '您怎么知道他们知情？凡是符合的都请勾选。',
          options: [
            '他们跟我提起过这件事',
            '我听见他们在谈论这件事',
            '有别人告诉我他们知道了',
            '会议上被提起过',
            '我在邮件、短信或消息里看到过',
            '我说的时候他们就在场',
            '我被叫去谈这件事',
            '我收到了关于这件事的回信或回邮',
            '我不确定他们是怎么知道的',
          ],
        },
        ko: {
          label: '그들이 알게 되었다는 것을 어떻게 아셨나요? 해당되는 것 모두 선택하세요.',
          options: [
            '그들이 저에게 그 일을 언급했습니다',
            '그들이 그 일에 대해 이야기하는 것을 들었습니다',
            '다른 사람이 그들이 안다고 알려줬습니다',
            '회의에서 그 이야기가 나왔습니다',
            '이메일·문자·메시지에서 봤습니다',
            '제가 말할 때 그 자리에 있었습니다',
            '그 일로 불려가 이야기를 나눴습니다',
            '그 일에 대한 답장이나 회신을 받았습니다',
            '어떻게 알게 되었는지는 모르겠습니다',
          ],
        },
      },
      {
        id: 'rt_knowledge_proof',
        label: 'Tell us how you learned they knew. Who said what, about when, and who else was around?',
        type: 'textarea',
        helpText: 'Example: About a week later my supervisor told me, I heard you went to HR about me.',
        es: {
          label: 'Cuéntenos cómo supo que ellos ya sabían. ¿Quién dijo qué, más o menos cuándo y quién más estaba cerca?',
          helpText: 'Ejemplo: Como una semana después mi supervisor me dijo: Supe que fuiste a Recursos Humanos a hablar de mí.',
        },
        zh: {
          label: '请说明您是怎么得知他们知情的。谁说了什么、大约什么时候、当时还有谁在场？',
          helpText: '例如：大约一周后，我的主管跟我说，听说你为了我的事去找人事了。',
        },
        ko: {
          label: '그들이 알고 있다는 것을 어떻게 아시게 되었는지 알려주세요. 누가 무슨 말을 했고, 대략 언제였으며, 주변에 누가 있었나요?',
          helpText: '예: 일주일쯤 뒤에 상사가 저에게 "네가 나 때문에 인사팀에 갔다며"라고 했습니다.',
        },
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
        es: {
          label: 'Después de eso, ¿le pasó alguna de estas cosas en el trabajo? Seleccione todas las que apliquen.',
          options: [
            'Me redujeron las horas',
            'Me cambiaron el horario',
            'Me cambiaron de turno, de lugar de trabajo o de departamento',
            'Me dieron el trabajo más pesado, más sucio o el que nadie quería',
            'Me quitaron mis labores de siempre',
            'Me levantaron un reporte o me sancionaron',
            'Me pusieron en un plan de desempeño o me dieron una advertencia final',
            'Me dieron una evaluación peor que antes',
            'Me vigilaban, me seguían o me supervisaban más que antes',
            'Me dejaron fuera de reuniones, mensajes o capacitaciones',
            'Les dijeron a mis compañeros que se alejaran de mí',
            'Me negaron un aumento, un bono o un ascenso',
            'Me bajaron el pago',
            'Me negaron tiempo libre que antes sí me daban',
            'Me gritaron, me insultaron o me amenazaron',
            'Me amenazaron con reportarme a una oficina del gobierno',
            'Me suspendieron o me mandaron a casa',
            'Me despidieron',
            'Me sentí forzado a renunciar',
            'Otra cosa'
          ],
        },
        zh: {
          label: '在那之后，工作上发生了以下哪些情况？凡是符合的都请勾选。',
          options: [
            '我的工时被削减',
            '我的班表被更改',
            '我被调到别的班次、工地或部门',
            '我被分配更重、更脏或没人愿意做的活',
            '我被撤下原本的职责',
            '我被书面警告或处分',
            '我被列入绩效改进计划或收到最后警告',
            '我拿到比以前更差的考核',
            '我比以前受到更多监视、跟踪或盯梢',
            '我被排除在会议、消息或培训之外',
            '同事被交代要远离我',
            '我被拒绝加薪、奖金或升职',
            '我的工资被削减',
            '我以前能请的假被拒绝了',
            '我被吼骂、羞辱或威胁',
            '我被威胁要向政府部门举报',
            '我被停职或被赶回家',
            '我被解雇',
            '我感到被迫辞职',
            '其他',
          ],
        },
        ko: {
          label: '그 뒤로 직장에서 다음과 같은 일이 있었나요? 해당되는 것 모두 선택하세요.',
          options: [
            '근무시간이 줄었습니다',
            '근무 일정이 바뀌었습니다',
            '다른 근무 시간대·현장·부서로 옮겨졌습니다',
            '더 힘들거나 궂거나 아무도 원하지 않는 일을 맡았습니다',
            '원래 하던 업무에서 배제되었습니다',
            '징계나 서면 경고를 받았습니다',
            '성과개선계획이나 최종 경고를 받았습니다',
            '전보다 나쁜 평가를 받았습니다',
            '전보다 감시·미행·확인을 더 받았습니다',
            '회의, 공지, 교육에서 배제되었습니다',
            '동료들이 저를 멀리하라는 말을 들었습니다',
            '임금 인상·보너스·승진에서 제외되었습니다',
            '급여가 깎였습니다',
            '전에는 쓰던 휴가를 거부당했습니다',
            '고함, 모욕, 협박을 당했습니다',
            '관공서에 신고하겠다는 협박을 받았습니다',
            '정직당하거나 집으로 돌려보내졌습니다',
            '해고되었습니다',
            '그만둘 수밖에 없다고 느꼈습니다',
            '그 밖의 것',
          ],
        },
      },
      {
        id: 'rt_first_change_date',
        label: 'About what date did the first of those things happen?',
        type: 'date',
        helpText: 'Your best guess is fine. This helps us line up the timing.',
        es: {
          label: '¿Más o menos en qué fecha pasó la primera de esas cosas?',
          helpText: 'Una fecha aproximada está bien. Esto nos ayuda a ordenar cuándo pasó cada cosa.',
        },
        zh: {
          label: '上面这些事情中，最早的一件大约发生在什么日期？',
          helpText: '写大概的日期就可以。这有助于我们理清时间顺序。',
        },
        ko: {
          label: '그중 첫 번째 일은 대략 언제 있었나요?',
          helpText: '대략적인 날짜도 괜찮습니다. 시간 순서를 파악하는 데 도움이 됩니다.',
        },
      },
      {
        id: 'rt_changes_timeline',
        label: 'Go through each thing you picked, one by one: what happened, about when, and who did it.',
        type: 'textarea',
        helpText: 'A short list is fine. Example: Hours cut about two weeks after, by Maria. Write-up in March, from Luis.',
        es: {
          label: 'Cuéntenos una por una las cosas que marcó: qué pasó, más o menos cuándo y quién lo hizo.',
          helpText: 'Una lista corta está bien. Ejemplo: Me redujeron las horas como dos semanas después, fue María. Reporte en marzo, de Luis.',
        },
        zh: {
          label: '请把您勾选的每一项逐一说明：发生了什么、大约什么时候、是谁做的。',
          helpText: '简单列出即可。例如：大约两周后工时被 Maria 削减。三月被 Luis 书面警告。',
        },
        ko: {
          label: '선택하신 항목을 하나씩, 무슨 일이 있었고 대략 언제였으며 누가 그랬는지 적어주세요.',
          helpText: '간단히 나열하셔도 됩니다. 예: 2주쯤 뒤 마리아가 근무시간을 줄임. 3월에 루이스에게 서면 경고를 받음.',
        },
      },
      {
        id: 'rt_comparator_coworker',
        label: 'Was there a coworker who did the same thing you got in trouble for, but nothing happened to them?',
        type: 'yes_no_unsure',
        helpText: 'For example, someone else who was also late or made the same mistake. Answer no if nothing like that came up.',
        es: {
          label: '¿Hubo algún compañero de trabajo que hizo lo mismo por lo que a usted lo metieron en problemas, pero a esa persona no le pasó nada?',
          helpText: 'Por ejemplo, alguien que también llegó tarde o cometió el mismo error. Conteste no si no pasó nada parecido.',
        },
        zh: {
          label: '有没有同事做了和您被追究相同的事，却什么事都没有？',
          helpText: '例如，别人也迟到，或犯了同样的错。如果没有类似情况，请回答“否”。',
        },
        ko: {
          label: '고객님이 문제 삼긴 것과 똑같은 일을 했는데 아무 일도 없었던 동료가 있었나요?',
          helpText: '예: 똑같이 지각했거나 같은 실수를 한 사람입니다. 그런 일이 없었다면 아니요를 선택하세요.',
        },
      },
      {
        id: 'rt_comparator_detail',
        label: 'Who was that coworker, what did they do, and what happened to them instead?',
        type: 'textarea',
        helpText: 'Name and job title if you know them.',
        showIf: { questionId: 'rt_comparator_coworker', value: 'yes' },
        es: {
          label: '¿Quién fue ese compañero, qué hizo y qué pasó con esa persona?',
          helpText: 'Su nombre y su puesto, si los sabe.',
        },
        zh: {
          label: '那位同事是谁？他们做了什么？后来他们怎么样了？',
          helpText: '如果知道，请写上姓名和职位。',
        },
        ko: {
          label: '그 동료는 누구이고, 무엇을 했으며, 그 사람은 어떻게 되었나요?',
          helpText: '아시면 이름과 직책을 적어주세요.',
        },
      },
      {
        id: 'rt_reason_changed',
        label: 'Did the reason you were given for what happened ever change from one time to the next?',
        type: 'yes_no_unsure',
        helpText: 'For example, first told it was slow business, and later told it was your work.',
        es: {
          label: '¿Alguna vez cambió la razón que le dieron por lo que pasó?',
          helpText: 'Por ejemplo, primero le dijeron que había poco trabajo y después que era por su desempeño.',
        },
        zh: {
          label: '公司给您的解释理由，前后有变过吗？',
          helpText: '例如，起初说是生意清淡，后来又说是您的工作表现。',
        },
        ko: {
          label: '그 일에 대해 회사가 댄 이유가 시점에 따라 달라진 적이 있나요?',
          helpText: '예: 처음에는 장사가 안 된다고 했다가 나중에는 고객님의 업무 태도 때문이라고 하는 경우입니다.',
        },
      },
      {
        id: 'rt_reason_changed_detail',
        label: 'What reason were you given first, what reason came later, and who told you each one?',
        type: 'textarea',
        helpText: 'Include about when each reason was given, and whether it was said out loud or put in writing.',
        showIf: { questionId: 'rt_reason_changed', value: 'yes' },
        es: {
          label: '¿Qué razón le dieron primero, cuál le dieron después y quién le dijo cada una?',
          helpText: 'Diga más o menos cuándo le dieron cada razón y si se la dijeron de palabra o por escrito.',
        },
        zh: {
          label: '最初给的理由是什么？后来的理由是什么？各是谁跟您说的？',
          helpText: '请写上每个理由大约是什么时候说的，以及是口头说的还是写成书面的。',
        },
        ko: {
          label: '처음에는 어떤 이유였고, 나중에는 어떤 이유였으며, 각각 누가 말했나요?',
          helpText: '각 이유가 대략 언제 나왔는지, 말로 한 것인지 서면으로 받은 것인지도 적어주세요.',
        },
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
        es: {
          label: '¿Cuáles de estas cosas todavía tiene? Seleccione todas las que apliquen.',
          helpText: 'Solo lo que usted mismo pueda conseguir: en su teléfono, en su correo o en su casa.',
          options: [
            'Una copia de mi queja o del mensaje que mandé',
            'La respuesta por escrito que me dio la empresa',
            'Mensajes de texto o correos con mi gerente o con Recursos Humanos',
            'Reportes, advertencias o planes de desempeño que me dieron después',
            'Evaluaciones o felicitaciones que recibí antes de decir algo',
            'Horarios o registros de horas que muestran mis horas antes y después',
            'Talones de pago que muestran mi pago antes y después',
            'Mis propias notas, diario o calendario sobre lo que pasó',
            'Fotos, videos o grabaciones de voz',
            'Una carta de recorte de personal, de separación o de despido',
            'Papeles que la empresa me pidió firmar después',
            'Nombres y teléfonos de compañeros que lo vieron',
            'No tengo nada de esto'
          ],
        },
        zh: {
          label: '以下哪些您现在还留着？凡是符合的都请勾选。',
          helpText: '只填您自己拿得到的 — 在您手机里、邮箱里，或家里的东西。',
          options: [
            '我的投诉或我发出的消息的副本',
            '公司给我的书面答复',
            '我与经理或人事往来的短信或邮件',
            '之后收到的处分、警告或绩效改进计划',
            '我开口之前的考核或表扬',
            '显示我前后工时的班表或工时记录',
            '显示我前后工资的工资单',
            '我自己关于经过的笔记、日记或日历',
            '照片、录像或录音',
            '裁员、离职或解雇通知书',
            '事后公司要我签的文件',
            '目击同事的姓名和电话',
            '以上都没有',
          ],
        },
        ko: {
          label: '다음 중 지금 가지고 계신 것은 무엇인가요? 해당되는 것 모두 선택하세요.',
          helpText: '직접 꺼내 보실 수 있는 것만 적어주세요 — 휴대폰, 이메일, 집에 있는 것들입니다.',
          options: [
            '제가 낸 진정서나 보낸 메시지의 사본',
            '회사가 저에게 준 서면 답변',
            '매니저나 인사팀과 주고받은 문자·이메일',
            '그 뒤에 받은 징계, 경고, 성과개선계획',
            '문제를 제기하기 전에 받은 평가나 칭찬',
            '전후 근무시간이 나오는 근무표나 근무 기록',
            '전후 급여가 나오는 급여명세서',
            '무슨 일이 있었는지 적어 둔 제 메모·일기·달력',
            '사진, 영상, 음성 녹음',
            '정리해고·퇴직·해고 통지서',
            '그 뒤에 회사가 서명하라고 준 서류',
            '목격한 동료들의 이름과 전화번호',
            '해당되는 것이 없습니다',
          ],
        },
      },
    ],
  },
  {
    key: 'leave',
    caseType: 'FMLA / Leave Violation',
    setName: 'Leave & Accommodation Follow-Up',
    setNameTranslations: {
      es: 'Seguimiento sobre Licencia y Adaptaciones',
      zh: '休假与工作调整补充问卷',
      ko: '휴가·업무 조정 추가 질문',
    },
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
        es: {
          label: '¿Para qué necesitaba la licencia o el cambio en su trabajo?',
          helpText: 'Seleccione todo lo que aplique, aunque haya pedido más de una cosa a la vez.',
          options: [
            'Mi propia enfermedad, lesión o condición médica',
            'Mi embarazo, el parto o la recuperación después del parto',
            'Estar con un bebé recién nacido o con un hijo recién adoptado o de crianza',
            'Cuidar a un familiar con una condición médica',
            'El fallecimiento de un familiar',
            'Un cambio en mis tareas, mi horario o mi lugar de trabajo por razones de salud',
            'Otra cosa'
          ],
        },
        zh: {
          label: '您需要请假或调整工作是为了什么？',
          helpText: '凡是符合的都请勾选，即使您当时同时提出了不止一项要求。',
          options: [
            '我自己的疾病、伤病或健康状况',
            '我的怀孕、生产或产后恢复',
            '陪伴新生儿，或新收养、寄养的孩子',
            '照顾有健康状况的家人',
            '家中有人过世',
            '因健康原因调整我的职责、班次或工作场所',
            '其他',
          ],
        },
        ko: {
          label: '휴가나 업무 조정이 필요하셨던 이유는 무엇인가요?',
          helpText: '해당되는 것을 모두 선택해 주세요. 한 번에 여러 가지를 함께 요청하셨어도 괜찮습니다.',
          options: [
            '본인의 질병, 부상, 건강 상태',
            '본인의 임신, 출산, 산후 회복',
            '새로 태어났거나 입양·위탁한 아이와 지내기 위해',
            '건강 문제가 있는 가족을 돌보기 위해',
            '가족의 사망',
            '건강상의 이유로 업무·일정·근무 장소를 바꾸기 위해',
            '그 밖의 이유',
          ],
        },
      },
      {
        id: 'lv_employer_size',
        label: 'About how many people worked for this employer while you were there?',
        type: 'select',
        required: true,
        options: [
          'Fewer than 5',
          '5 to 19',
          '20 to 49',
          '50 to 99',
          '100 or more',
          'I am not sure'
        ],
        helpText: 'Your best guess is fine. Count everyone who worked for the company, including people at other locations.',
        es: {
          label: '¿Más o menos cuántas personas trabajaban para este empleador mientras usted estuvo ahí?',
          helpText: 'Un cálculo aproximado está bien. Cuente a todas las personas que trabajaban para la empresa, incluyendo a las de otras sucursales.',
          options: [
            'Menos de 5',
            'De 5 a 19',
            'De 20 a 49',
            'De 50 a 99',
            '100 o más',
            'No estoy seguro'
          ],
        },
        zh: {
          label: '您在职期间，这家雇主大约有多少员工？',
          helpText: '写大概的数字就可以。请把公司所有员工都算上，包括其他分店或分公司的人。',
          options: [
            '少于 5 人',
            '5 到 19 人',
            '20 到 49 人',
            '50 到 99 人',
            '100 人或以上',
            '我不确定',
          ],
        },
        ko: {
          label: '고객님이 근무하실 때 이 고용주에게 직원이 대략 몇 명 있었나요?',
          helpText: '대략적인 숫자도 괜찮습니다. 다른 지점에서 일하는 사람까지 회사 전체 직원을 세어주세요.',
          options: [
            '5명 미만',
            '5~19명',
            '20~49명',
            '50~99명',
            '100명 이상',
            '잘 모르겠습니다',
          ],
        },
      },
      {
        id: 'lv_first_request_date',
        label: 'About when did you first tell someone at work that you needed this?',
        type: 'date',
        helpText: 'Your best guess is fine if you do not remember the exact day. If you asked more than once, use the first time you brought it up.',
        es: {
          label: '¿Más o menos cuándo le avisó por primera vez a alguien en el trabajo que necesitaba esto?',
          helpText: 'Si no recuerda el día exacto, una fecha aproximada está bien. Si lo pidió varias veces, ponga la primera vez que lo mencionó.',
        },
        zh: {
          label: '您第一次告诉公司里的人您需要这个，大约是什么时候？',
          helpText: '不记得确切日期的话，写大概的时间就可以。如果提过不止一次，请填第一次提出的时间。',
        },
        ko: {
          label: '이것이 필요하다고 직장에 처음 알리신 것은 대략 언제인가요?',
          helpText: '정확한 날짜가 기억나지 않으시면 대략적인 시기도 괜찮습니다. 여러 번 말씀하셨다면 처음 꺼내신 때를 적어주세요.',
        },
      },
      {
        id: 'lv_who_i_told',
        label: 'Who was the first person at work you told?',
        type: 'textarea',
        helpText: 'Give their name and job title if you know them. If anyone else was there when you told them, include that person too. Write "no one else" if it was just the two of you.',
        es: {
          label: '¿Quién fue la primera persona en el trabajo a quien le avisó?',
          helpText: 'Ponga el nombre y el puesto de esa persona, si los sabe. Si había alguien más presente cuando le avisó, inclúyalo también. Escriba "nadie más" si solo estaban ustedes dos.',
        },
        zh: {
          label: '您在公司里第一个告诉的人是谁？',
          helpText: '如果知道，请写上姓名和职位。如果您告诉他们时还有别人在场，也请一并写上。如果当时只有你们两人，请写“没有其他人”。',
        },
        ko: {
          label: '직장에서 처음 말씀하신 분은 누구인가요?',
          helpText: '아시면 이름과 직책을 적어주세요. 말씀하실 때 다른 사람이 함께 있었다면 그 사람도 적어주세요. 두 분만 계셨다면 "없음"이라고 적어주세요.',
        },
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
        es: {
          label: '¿Cómo lo pidió?',
          helpText: 'Seleccione todas las formas en que lo pidió. Muchas personas lo piden de varias maneras, o más de una vez.',
          options: [
            'En persona',
            'Por llamada telefónica',
            'Por mensaje de texto',
            'Por correo electrónico',
            'En un formulario de papel de la empresa',
            'En el sitio web o la app de la empresa',
            'Por carta',
            'A través de una compañía externa de licencias o beneficios',
            'Otra persona lo pidió por mí',
            'Otro'
          ],
        },
        zh: {
          label: '您是怎么提出的？',
          helpText: '凡是您用过的方式都请勾选。很多人不只用一种方式，也不只提过一次。',
          options: [
            '当面',
            '打电话',
            '短信',
            '电子邮件',
            '公司提供的纸质表格',
            '公司网站或应用',
            '书面信件',
            '通过外部的休假或福利管理公司',
            '由别人代我提出',
            '其他',
          ],
        },
        ko: {
          label: '어떻게 요청하셨나요?',
          helpText: '사용하신 방법을 모두 선택해 주세요. 여러 방법으로, 또 여러 번 요청하시는 경우가 많습니다.',
          options: [
            '직접 대면',
            '전화',
            '문자 메시지',
            '이메일',
            '회사에서 준 종이 양식',
            '회사 웹사이트나 앱',
            '서면 서한',
            '외부 휴직·복리후생 대행업체를 통해',
            '다른 사람이 대신 요청',
            '기타',
          ],
        },
      },
      {
        id: 'lv_request_details',
        label: 'In your own words, what did you ask for?',
        type: 'textarea',
        required: true,
        helpText: 'For example: the dates you needed off, how long you needed, or the change you needed to your job or schedule. If you asked more than once, describe each time.',
        es: {
          label: 'En sus propias palabras, ¿qué fue lo que pidió?',
          helpText: 'Por ejemplo: las fechas que necesitaba libres, por cuánto tiempo, o el cambio que necesitaba en su trabajo u horario. Si lo pidió varias veces, describa cada vez.',
        },
        zh: {
          label: '请用您自己的话说明，您当时提出的要求是什么？',
          helpText: '例如：您需要哪几天休假、需要多久，或您的工作、班次需要作什么调整。如果提过不止一次，请把每一次都写下来。',
        },
        ko: {
          label: '고객님의 표현으로, 무엇을 요청하셨나요?',
          helpText: '예: 필요한 휴가 날짜, 필요한 기간, 또는 업무나 일정에서 필요했던 변경 사항입니다. 여러 번 요청하셨다면 각각 적어주세요.',
        },
      },
      {
        id: 'lv_forms_given',
        label: 'Did anyone at work give you forms or paperwork to fill out for this?',
        type: 'yes_no',
        es: {
          label: '¿Alguien en el trabajo le dio formularios o papeles para llenar por esto?',
        },
        zh: {
          label: '公司里有人给过您需要填写的表格或文件吗？',
        },
        ko: {
          label: '이 일로 직장에서 작성하라고 준 양식이나 서류가 있었나요?',
        },
      },
      {
        id: 'lv_forms_details',
        label: 'Tell us about the paperwork you were given.',
        type: 'textarea',
        helpText: 'Include who handed it to you, the date you got it, any deadline they set, and the date you turned it back in.',
        showIf: { questionId: 'lv_forms_given', value: 'yes' },
        es: {
          label: 'Cuéntenos sobre los papeles que le dieron.',
          helpText: 'Incluya quién se los entregó, la fecha en que los recibió, si le pusieron una fecha límite y la fecha en que los devolvió.',
        },
        zh: {
          label: '请说明您拿到的那些文件。',
          helpText: '包括是谁交给您的、您拿到的日期、对方设定的截止期限，以及您交回去的日期。',
        },
        ko: {
          label: '받으신 서류에 대해 알려주세요.',
          helpText: '누가 건네주었는지, 받은 날짜, 정해진 기한, 다시 제출한 날짜를 함께 적어주세요.',
        },
      },
      {
        id: 'lv_medical_note_given',
        label: 'Did you give your employer a note or paperwork from a doctor, midwife, or other medical provider?',
        type: 'yes_no',
        es: {
          label: '¿Le entregó a su empleador una nota o papeles de un doctor, partera u otro proveedor médico?',
        },
        zh: {
          label: '您有把医生、助产士或其他医疗人员开的证明或文件交给雇主吗？',
        },
        ko: {
          label: '의사, 조산사, 그 밖의 의료진이 써준 소견서나 서류를 고용주에게 제출하셨나요?',
        },
      },
      {
        id: 'lv_medical_note_details',
        label: 'Tell us about each note you gave them.',
        type: 'textarea',
        helpText: 'Include the date on the note, who you handed it to, and what it said you needed — for example "off work June 3 to July 1" or "no lifting over 20 pounds."',
        showIf: { questionId: 'lv_medical_note_given', value: 'yes' },
        es: {
          label: 'Cuéntenos sobre cada nota que les entregó.',
          helpText: 'Incluya la fecha de la nota, a quién se la entregó y qué decía que usted necesitaba — por ejemplo, "no trabajar del 3 de junio al 1 de julio" o "no levantar más de 20 libras".',
        },
        zh: {
          label: '请分别说明您交出的每一份证明。',
          helpText: '包括证明上的日期、您交给了谁，以及上面写了您需要什么 — 例如“6 月 3 日至 7 月 1 日不宜工作”或“不可搬运超过 20 磅的重物”。',
        },
        ko: {
          label: '제출하신 소견서를 하나씩 알려주세요.',
          helpText: '소견서에 적힌 날짜, 누구에게 제출했는지, 무엇이 필요하다고 적혀 있었는지를 함께 적어주세요. 예: "6월 3일부터 7월 1일까지 근무 불가" 또는 "20파운드 이상 들지 말 것".',
        },
      },
      {
        id: 'lv_options_talk',
        label: 'Did anyone from the company talk with you about other ways to handle it?',
        type: 'yes_no',
        helpText: 'For example, a different schedule, lighter duties, a different job, or a shorter time off.',
        es: {
          label: '¿Alguien de la empresa habló con usted sobre otras maneras de manejar la situación?',
          helpText: 'Por ejemplo, otro horario, tareas más ligeras, otro puesto o una licencia más corta.',
        },
        zh: {
          label: '公司有人跟您讨论过其他处理方式吗？',
          helpText: '例如换个班表、减轻工作、调换职位，或缩短休假时间。',
        },
        ko: {
          label: '회사에서 다른 방식으로 해결하는 방안을 이야기한 사람이 있었나요?',
          helpText: '예: 근무 일정 변경, 업무 경감, 다른 직무, 더 짧은 휴가 등입니다.',
        },
      },
      {
        id: 'lv_options_talk_details',
        label: 'Tell us about that conversation.',
        type: 'textarea',
        helpText: 'Include who was there, when and where it happened, and what each person said. Include anything you suggested as well as anything they suggested.',
        showIf: { questionId: 'lv_options_talk', value: 'yes' },
        es: {
          label: 'Cuéntenos sobre esa conversación.',
          helpText: 'Incluya quiénes estaban presentes, cuándo y dónde fue, y qué dijo cada persona. Incluya lo que usted propuso y también lo que ellos propusieron.',
        },
        zh: {
          label: '请说明那次谈话。',
          helpText: '包括有谁在场、何时何地、每个人说了什么。您自己提出的建议和对方提出的建议都请写上。',
        },
        ko: {
          label: '그 대화에 대해 알려주세요.',
          helpText: '누가 있었는지, 언제 어디서였는지, 각자 무슨 말을 했는지 적어주세요. 고객님이 제안한 내용과 상대가 제안한 내용을 모두 포함해 주세요.',
        },
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
        es: {
          label: 'Al final, ¿qué decidió su empleador sobre lo que usted pidió?',
          options: [
            'Me dio todo lo que pedí',
            'Me dio parte de lo que pedí',
            'Me dijo que no',
            'Nunca me dio una respuesta',
            'Me puso de licencia sin que yo la pidiera',
            'Otra cosa'
          ],
        },
        zh: {
          label: '对于您的要求，雇主最后的决定是什么？',
          options: [
            '完全答应了我的要求',
            '只答应了一部分',
            '拒绝了',
            '一直没有给我答复',
            '让我休了我没有要求的假',
            '其他',
          ],
        },
        ko: {
          label: '고객님의 요청에 대해 고용주는 최종적으로 어떻게 결정했나요?',
          options: [
            '요청한 대로 모두 해주었습니다',
            '요청한 것 중 일부만 해주었습니다',
            '거부했습니다',
            '끝내 답을 주지 않았습니다',
            '제가 요청하지 않은 휴직을 시켰습니다',
            '그 밖의 것',
          ],
        },
      },
      {
        id: 'lv_decision_reason',
        label: 'What reason were you given for that decision?',
        type: 'textarea',
        helpText: 'Write it as close to their words as you can remember. If no reason was ever given, say that.',
        es: {
          label: '¿Qué razón le dieron para esa decisión?',
          helpText: 'Escríbalo con las mismas palabras que le dijeron, lo mejor que recuerde. Si nunca le dieron una razón, escríbalo así.',
        },
        zh: {
          label: '对方给出的理由是什么？',
          helpText: '请尽量按他们的原话写。如果从未给过任何理由，请写明这一点。',
        },
        ko: {
          label: '그 결정에 대해 어떤 이유를 들었나요?',
          helpText: '기억나시는 대로 상대의 표현에 가깝게 적어주세요. 아무 이유도 듣지 못하셨다면 그렇게 적어주세요.',
        },
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
        es: {
          label: '¿Qué pasó cuando terminó su licencia, o cuando ya podía regresar?',
          options: [
            'Regresé al mismo trabajo, con el mismo pago, horas y horario',
            'Regresé, pero algo del trabajo era diferente',
            'No me dejaron regresar',
            'Mi trabajo terminó mientras yo estaba fuera',
            'No regresé por otra razón',
            'Todavía sigo fuera del trabajo',
            'Nunca me dieron la licencia, así que esto no pasó'
          ],
        },
        zh: {
          label: '休假结束时，或您准备回去上班时，发生了什么？',
          options: [
            '我回到了原来的职位、工资、工时和班次',
            '我回去了，但工作上有些地方不一样了',
            '他们不让我回去上班',
            '我休假期间工作就结束了',
            '因为其他原因我没有回去',
            '我目前仍在休假中',
            '我根本没有休到假，所以没有这种情况',
          ],
        },
        ko: {
          label: '휴가가 끝났을 때, 또는 복귀할 준비가 되셨을 때 어떻게 되었나요?',
          options: [
            '같은 직무, 급여, 근무시간, 일정으로 복귀했습니다',
            '복귀는 했지만 일이 달라진 부분이 있었습니다',
            '복귀를 시켜주지 않았습니다',
            '휴가 중에 일이 끝났습니다',
            '다른 이유로 복귀하지 않았습니다',
            '아직 휴가 중입니다',
            '휴가를 받지 못해서 해당되지 않습니다',
          ],
        },
      },
      {
        id: 'lv_return_details',
        label: 'Tell us more about your time off ending and coming back to work.',
        type: 'textarea',
        helpText: 'Include the first and last days you were actually out, who you spoke with about coming back, and anything different about your pay, hours, shift, duties, title, or location. If you never got the time off, just write "did not happen."',
        es: {
          label: 'Cuéntenos más sobre el final de su licencia y su regreso al trabajo.',
          helpText: 'Incluya el primer y el último día que realmente estuvo fuera, con quién habló sobre regresar, y cualquier cambio en su pago, horas, turno, tareas, puesto o lugar de trabajo. Si nunca le dieron la licencia, solo escriba "no pasó".',
        },
        zh: {
          label: '请多说一些关于休假结束和回去上班的情况。',
          helpText: '包括您实际休假的第一天和最后一天、您和谁谈过复职的事，以及工资、工时、班次、职责、职称或工作地点有什么不同。如果您根本没有休到假，写“没有发生”即可。',
        },
        ko: {
          label: '휴가가 끝나고 복귀하신 과정에 대해 더 알려주세요.',
          helpText: '실제로 쉬신 첫날과 마지막 날, 복귀에 대해 이야기한 사람, 급여·근무시간·근무 시간대·업무·직책·근무지에서 달라진 점을 적어주세요. 휴가를 받지 못하셨다면 "해당 없음"이라고만 적어주세요.',
        },
      },
      {
        id: 'lv_comments_made',
        label: 'Did anyone at work say anything to you about your time off, your health, your pregnancy, or when you were coming back?',
        type: 'yes_no',
        helpText: 'This includes anything said while you were out, in person, by phone, or in a message.',
        es: {
          label: '¿Alguien en el trabajo le dijo algo sobre su licencia, su salud, su embarazo o cuándo iba a regresar?',
          helpText: 'Esto incluye lo que le hayan dicho mientras estaba fuera, en persona, por teléfono o por mensaje.',
        },
        zh: {
          label: '公司里有人就您的休假、健康、怀孕，或何时回来上班说过什么吗？',
          helpText: '包括您休假期间当面、电话或消息中说的任何话。',
        },
        ko: {
          label: '직장에서 누군가 고객님의 휴가, 건강, 임신, 복귀 시점에 대해 무슨 말을 한 적이 있나요?',
          helpText: '휴가 중에 직접, 전화로, 메시지로 들은 말도 모두 포함됩니다.',
        },
      },
      {
        id: 'lv_comments_details',
        label: 'Tell us what was said.',
        type: 'textarea',
        helpText: 'Include who said it, when, and who else heard it. Use their words as closely as you can remember, even if the words were rude or upsetting.',
        showIf: { questionId: 'lv_comments_made', value: 'yes' },
        es: {
          label: 'Cuéntenos qué le dijeron.',
          helpText: 'Incluya quién lo dijo, cuándo y quién más lo escuchó. Use las mismas palabras que usaron, lo mejor que recuerde, aunque hayan sido groseras o hirientes.',
        },
        zh: {
          label: '请告诉我们对方说了什么。',
          helpText: '包括是谁说的、什么时候说的、还有谁听到了。请尽量按他们的原话写，即使内容无礼或令人难受。',
        },
        ko: {
          label: '어떤 말을 들으셨는지 알려주세요.',
          helpText: '누가, 언제 했고, 또 누가 들었는지 적어주세요. 무례하거나 불쾌한 말이었더라도 기억나시는 대로 그대로 적어주세요.',
        },
      },
    ],
  },
  {
    key: 'whos_who',
    caseType: 'Any',
    setName: 'Who\'s Who',
    setNameTranslations: {
      es: 'Quién es Quién',
      zh: '关系人一览',
      ko: '관련자 확인',
    },
    description:
      'Send on any case right after the intake comes back, to map every person involved and figure out which of them we can actually reach.',
    questions: [
      {
        id: 'ww_supervisor_title',
        label: 'What is (or was) your main supervisor\'s job title?',
        type: 'text',
        helpText: 'If you are not sure of the official title, describe what they did — for example, shift lead, or the person who ran the floor. If you no longer work there, answer about the time when you did.',
        es: {
          label: '¿Cuál es (o era) el puesto de su supervisor principal?',
          helpText: 'Si no está seguro del título oficial, describa qué hacía — por ejemplo, encargado de turno, o quien estaba a cargo del área de trabajo. Si ya no trabaja ahí, responda sobre cuando sí trabajaba.',
        },
        zh: {
          label: '您主要主管（或当时的主管）的职位名称是什么？',
          helpText: '如果不确定正式职称，请描述他们做什么 — 例如班组长，或是管现场的人。如果您已经离职，请就在职时的情况作答。',
        },
        ko: {
          label: '주로 보고하시던(또는 보고하셨던) 상사의 직책은 무엇인가요?',
          helpText: '정확한 직함을 모르시면 하는 일로 설명해 주세요 — 예: 조장, 현장을 총괄하던 사람. 지금은 그만두셨다면 근무하시던 당시를 기준으로 답해 주세요.',
        },
      },
      {
        id: 'ww_had_other_supervisors',
        label: 'Besides that person, has anyone else supervised you at that job?',
        type: 'yes_no',
        es: {
          label: 'Además de esa persona, ¿alguien más lo ha supervisado en ese trabajo?',
        },
        zh: {
          label: '除了那个人以外，在那份工作中还有别人管过您吗？',
        },
        ko: {
          label: '그 사람 외에 그 직장에서 고객님을 관리한 사람이 또 있었나요?',
        },
      },
      {
        id: 'ww_other_supervisors',
        label: 'List those other supervisors.',
        type: 'textarea',
        helpText: 'For each one: their name, their job title, and roughly when they supervised you. A first name or a nickname is fine if that is all you knew them by.',
        showIf: { questionId: 'ww_had_other_supervisors', value: 'yes' },
        es: {
          label: 'Liste a esos otros supervisores.',
          helpText: 'De cada uno: su nombre, su puesto y más o menos cuándo lo supervisó. Si solo sabe el nombre de pila o un apodo, con eso basta.',
        },
        zh: {
          label: '请列出那些其他的主管。',
          helpText: '每一位请写：姓名、职位，以及大约在什么时期管过您。只知道名字或绰号也可以。',
        },
        ko: {
          label: '그 다른 상사들을 적어주세요.',
          helpText: '각각 이름, 직책, 대략 언제 고객님을 관리했는지 적어주세요. 이름이나 별명만 아셔도 괜찮습니다.',
        },
      },
      {
        id: 'ww_chain_above_supervisor',
        label: 'Who is (or was) above your supervisor? Go as far up as you know.',
        type: 'textarea',
        helpText: 'Names if you know them, or titles like district manager or general manager. One person is fine, and it is fine to say you don\'t know.',
        es: {
          label: '¿Quién está (o estaba) arriba de su supervisor? Mencione hasta donde sepa.',
          helpText: 'Nombres si los sabe, o puestos como gerente de distrito o gerente general. Con una sola persona basta, y está bien decir que no sabe.',
        },
        zh: {
          label: '您主管之上是谁？您知道多少就写到多高。',
          helpText: '知道姓名就写姓名，或写职称，例如区经理、总经理。只写一个人也可以，不知道也没关系。',
        },
        ko: {
          label: '상사보다 위에는 누가 있었나요? 아시는 데까지 위로 적어주세요.',
          helpText: '이름을 아시면 이름을, 모르시면 지역 매니저, 총괄 매니저 같은 직책을 적어주세요. 한 명만 적으셔도 되고, 모르신다고 하셔도 괜찮습니다.',
        },
      },
      {
        id: 'ww_knows_owner',
        label: 'Do you know who owns the company, or who the top boss is?',
        type: 'yes_no',
        es: {
          label: '¿Sabe quién es el dueño de la empresa o el jefe principal?',
        },
        zh: {
          label: '您知道公司的老板是谁，或最高负责人是谁吗？',
        },
        ko: {
          label: '회사의 소유주나 최고 책임자가 누구인지 알고 계신가요?',
        },
      },
      {
        id: 'ww_owner_detail',
        label: 'Tell us who the owner or top boss is.',
        type: 'textarea',
        helpText: 'Their name if you know it, what they do at the company, how you came to know who they are, and whether you ever dealt with them directly.',
        showIf: { questionId: 'ww_knows_owner', value: 'yes' },
        es: {
          label: 'Díganos quién es el dueño o el jefe principal.',
          helpText: 'Su nombre si lo sabe, qué hace en la empresa, cómo se enteró de quién es, y si alguna vez trató directamente con esa persona.',
        },
        zh: {
          label: '请告诉我们老板或最高负责人是谁。',
          helpText: '知道的话请写姓名、他们在公司做什么、您是怎么知道的，以及您是否直接与他们打过交道。',
        },
        ko: {
          label: '소유주나 최고 책임자가 누구인지 알려주세요.',
          helpText: '아시면 이름, 회사에서 하는 일, 어떻게 알게 되셨는지, 직접 상대해 보신 적이 있는지 적어주세요.',
        },
      },
      {
        id: 'ww_office_hr_people',
        label: 'Besides any HR contact you already gave us, who else in the office handles (or handled) paychecks, schedules, hiring paperwork, or employee problems?',
        type: 'textarea',
        helpText: 'Names or job titles both work — for example the office manager, the person who handed out paychecks, or whoever you would go to with a problem. Write "no one else" if that covers it.',
        es: {
          label: 'Además de la persona de Recursos Humanos que ya nos haya dado, ¿quién más en la oficina maneja (o manejaba) los pagos, los horarios, los papeles de contratación o los problemas de los empleados?',
          helpText: 'Nos sirven nombres o puestos — por ejemplo, el gerente de la oficina, la persona que repartía los cheques de pago, o a quien usted iba a ver cuando tenía un problema. Si no hay nadie más, escriba "nadie más".',
        },
        zh: {
          label: '除了您已经告诉我们的人事联系人以外，办公室里还有谁负责（或曾负责）工资、排班、入职文件或员工问题？',
          helpText: '写姓名或职位都可以 — 例如办公室主任、发工资的人，或您有问题时会去找的人。如果没有别人，请写“没有其他人”。',
        },
        ko: {
          label: '이미 알려주신 인사 담당자 외에, 사무실에서 급여·근무 일정·입사 서류·직원 문제를 다루는(또는 다뤘던) 사람은 누구인가요?',
          helpText: '이름이나 직책 어느 쪽도 괜찮습니다 — 예: 사무장, 급여를 나눠주던 사람, 문제가 생기면 찾아가던 사람. 더 없으면 "없음"이라고 적어주세요.',
        },
      },
      {
        id: 'ww_who_was_present',
        label: 'Think about the events you described in your intake. Who else was nearby when they happened?',
        type: 'textarea',
        required: true,
        helpText: 'List everyone you can remember, even if you only know a first name or a nickname, and even people you don\'t think would take your side. If no one else was around, just say so.',
        es: {
          label: 'Piense en lo que describió en su formulario de información. ¿Quién más estaba cerca cuando pasó?',
          helpText: 'Mencione a todos los que recuerde, aunque solo sepa el nombre de pila o un apodo, e incluso a quienes cree que no estarían de su lado. Si no había nadie más, díganoslo.',
        },
        zh: {
          label: '请回想您在初次问卷中描述的那些事。事情发生时附近还有谁？',
          helpText: '请把您记得的人都列出来，即使只知道名字或绰号，也包括您认为不会站在您这边的人。如果当时周围没有别人，说明一下即可。',
        },
        ko: {
          label: '접수 설문에서 말씀하신 일들을 떠올려 주세요. 그 일이 있을 때 주변에 또 누가 있었나요?',
          helpText: '기억나시는 사람을 모두 적어주세요. 이름이나 별명만 아셔도 되고, 고객님 편이 아닐 것 같은 사람도 포함해 주세요. 주변에 아무도 없었다면 그렇게 적어주세요.',
        },
      },
      {
        id: 'ww_coworker_saw_or_heard',
        label: 'Did any coworker ever tell you they saw or heard something that happened to you at work?',
        type: 'yes_no',
        es: {
          label: '¿Alguna vez algún compañero de trabajo le dijo que vio o escuchó algo que le pasó a usted en el trabajo?',
        },
        zh: {
          label: '有同事跟您说过，他们看到或听到了发生在您身上的事吗？',
        },
        ko: {
          label: '직장에서 고객님께 있었던 일을 보거나 들었다고 말해준 동료가 있나요?',
        },
      },
      {
        id: 'ww_coworker_saw_detail',
        label: 'What did they tell you they saw or heard?',
        type: 'textarea',
        helpText: 'Include their name, roughly when they told you, and where the two of you were at the time. If more than one person told you something, include each of them.',
        showIf: { questionId: 'ww_coworker_saw_or_heard', value: 'yes' },
        es: {
          label: '¿Qué le dijeron que vieron o escucharon?',
          helpText: 'Incluya su nombre, más o menos cuándo se lo dijeron, y dónde estaban ustedes en ese momento. Si más de una persona le dijo algo, inclúyalas a todas.',
        },
        zh: {
          label: '他们说他们看到或听到了什么？',
          helpText: '请写上他们的姓名、大约什么时候跟您说的，以及当时你们在哪里。如果不止一个人跟您说过，请把每个人都写上。',
        },
        ko: {
          label: '그분들이 무엇을 보거나 들었다고 하던가요?',
          helpText: '이름, 대략 언제 말해줬는지, 그때 두 분이 어디에 계셨는지 적어주세요. 여러 명이 말해줬다면 각각 적어주세요.',
        },
      },
      {
        id: 'ww_people_left',
        label: 'Do you know anyone who worked there and has since left?',
        type: 'yes_no',
        es: {
          label: '¿Conoce a alguien que trabajaba ahí y que ya se fue?',
        },
        zh: {
          label: '您知道有谁曾在那里工作、后来离开了吗？',
        },
        ko: {
          label: '그곳에서 일하다가 그만둔 사람을 알고 계신가요?',
        },
      },
      {
        id: 'ww_people_left_detail',
        label: 'List the people who have left that job.',
        type: 'textarea',
        helpText: 'For each one, roughly when they left. If you know why they left, or where they work now, include that too.',
        showIf: { questionId: 'ww_people_left', value: 'yes' },
        es: {
          label: 'Liste a las personas que ya se fueron de ese trabajo.',
          helpText: 'De cada una, más o menos cuándo se fue. Si sabe por qué se fue, o dónde trabaja ahora, agréguelo también.',
        },
        zh: {
          label: '请列出那些已经离开的人。',
          helpText: '每一位请写大约什么时候离开的。如果知道他们为什么离开，或现在在哪里工作，也请一并写上。',
        },
        ko: {
          label: '그 직장을 떠난 사람들을 적어주세요.',
          helpText: '각각 대략 언제 그만두었는지 적어주세요. 그만둔 이유나 지금 어디서 일하는지 아시면 함께 적어주세요.',
        },
      },
      {
        id: 'ww_still_in_touch',
        label: 'Are you still in contact with anyone from that job?',
        type: 'yes_no',
        required: true,
        es: {
          label: '¿Sigue en contacto con alguien de ese trabajo?',
        },
        zh: {
          label: '那份工作的人当中，您现在还和谁有联系吗？',
        },
        ko: {
          label: '그 직장 사람들 중 지금도 연락하는 분이 있나요?',
        },
      },
      {
        id: 'ww_contact_details',
        label: 'List the people from that job you are still in contact with.',
        type: 'textarea',
        helpText: 'For each person, tell us how you reach them — phone, text, WhatsApp, social media, or in person — and how you know them, such as worked my shift, trained me, a friend outside of work, or a relative. If you are in a group chat or group text with people from that job, tell us about that too. Checking your phone contacts may help.',
        showIf: { questionId: 'ww_still_in_touch', value: 'yes' },
        es: {
          label: 'Liste a las personas de ese trabajo con las que sigue en contacto.',
          helpText: 'De cada persona, díganos cómo se comunica con ella — teléfono, mensaje de texto, WhatsApp, redes sociales o en persona — y de dónde la conoce, por ejemplo: trabajaba en mi turno, me entrenó, somos amigos fuera del trabajo, o es de mi familia. Si está en un grupo de chat o de mensajes con gente de ese trabajo, cuéntenos de eso también. Revisar los contactos de su teléfono puede ayudarle.',
        },
        zh: {
          label: '请列出那份工作中您仍有联系的人。',
          helpText: '每一位请说明您怎么联系他们 — 电话、短信、WhatsApp、社交媒体或当面 — 以及您和他们是什么关系，例如同班的同事、带我的人、工作以外的朋友，或亲戚。如果您和那份工作的人在同一个群聊或群发短信里，也请告诉我们。翻一翻手机通讯录可能会有帮助。',
        },
        ko: {
          label: '그 직장 사람들 중 지금도 연락하는 분들을 적어주세요.',
          helpText: '각각 어떻게 연락하시는지 — 전화, 문자, 카카오톡·WhatsApp, SNS, 직접 만남 — 그리고 어떤 사이인지 적어주세요. 예: 같은 시간대에 일했음, 저를 가르쳐줬음, 직장 밖 친구, 친척. 그 직장 사람들과 단체 채팅방이 있다면 그것도 알려주세요. 휴대폰 연락처를 확인해 보시면 도움이 됩니다.',
        },
      },
      {
        id: 'ww_told_anyone',
        label: 'Have you talked with anyone about what happened at that job?',
        type: 'yes_no',
        helpText: 'Coworkers, family, friends, a doctor, anyone at all. We already asked about formal complaints — this question is about ordinary conversations too.',
        es: {
          label: '¿Ha hablado con alguien sobre lo que pasó en ese trabajo?',
          helpText: 'Compañeros de trabajo, familiares, amigos, un doctor, quien sea. Ya le preguntamos sobre quejas formales — esta pregunta también incluye las conversaciones normales.',
        },
        zh: {
          label: '关于那份工作发生的事，您和别人谈过吗？',
          helpText: '同事、家人、朋友、医生，任何人都算。正式投诉我们已经问过了 — 这一题问的是日常聊天。',
        },
        ko: {
          label: '그 직장에서 있었던 일에 대해 다른 사람과 이야기하신 적이 있나요?',
          helpText: '동료, 가족, 친구, 의사 등 누구든 해당됩니다. 공식적인 진정은 앞에서 여쭤봤고, 이 질문은 평범한 대화까지 포함합니다.',
        },
      },
      {
        id: 'ww_told_anyone_detail',
        label: 'List the people you talked with about it.',
        type: 'textarea',
        helpText: 'For each one, roughly when you talked and how much you told them. Please also tell us if any of them still works at the company.',
        showIf: { questionId: 'ww_told_anyone', value: 'yes' },
        es: {
          label: 'Liste a las personas con las que habló de esto.',
          helpText: 'De cada una, más o menos cuándo hablaron y cuánto le contó. Díganos también si alguna todavía trabaja en la empresa.',
        },
        zh: {
          label: '请列出您谈过这件事的人。',
          helpText: '每一位请写大约什么时候谈的、您跟他们说到什么程度。也请告诉我们其中是否有人还在那家公司工作。',
        },
        ko: {
          label: '이 일에 대해 이야기하신 분들을 적어주세요.',
          helpText: '각각 대략 언제 이야기했고 어디까지 말씀하셨는지 적어주세요. 그중 아직 그 회사에 다니는 분이 있다면 함께 알려주세요.',
        },
      },
      {
        id: 'ww_contact_cautions',
        label: 'Is there anyone you have named who you would not want us to contact?',
        type: 'yes_no',
        helpText: 'For example, someone who still works there, a relative, or someone you are no longer on good terms with. There is no wrong answer — we just want to know before we reach out to anyone.',
        es: {
          label: 'De las personas que mencionó, ¿hay alguna a la que prefiera que no contactemos?',
          helpText: 'Por ejemplo, alguien que todavía trabaja ahí, un familiar, o alguien con quien ya no se lleva bien. No hay respuesta incorrecta — solo queremos saberlo antes de comunicarnos con alguien.',
        },
        zh: {
          label: '您提到的人当中，有谁是您不希望我们去联系的吗？',
          helpText: '例如还在那里上班的人、亲戚，或已经闹翻的人。这没有标准答案 — 我们只是想在联系任何人之前先了解清楚。',
        },
        ko: {
          label: '말씀해 주신 분들 중에 저희가 연락하지 않았으면 하는 분이 있나요?',
          helpText: '예: 아직 그곳에 다니는 사람, 친척, 사이가 틀어진 사람 등입니다. 정답은 없습니다. 누구에게든 연락드리기 전에 미리 알아두려는 것입니다.',
        },
      },
      {
        id: 'ww_contact_cautions_detail',
        label: 'Who should we be careful about contacting?',
        type: 'textarea',
        helpText: 'Tell us who, and what makes you feel that way — for example, they still work there, or the two of you had a falling out.',
        showIf: { questionId: 'ww_contact_cautions', value: 'yes' },
        es: {
          label: '¿Con quién debemos tener cuidado al comunicarnos?',
          helpText: 'Díganos quién es y por qué se siente así — por ejemplo, todavía trabaja ahí, o ustedes dos terminaron mal.',
        },
        zh: {
          label: '我们在联系谁的时候需要特别谨慎？',
          helpText: '请告诉我们是谁，以及您为什么这么想 — 例如他们还在那里上班，或者你们两人闹过矛盾。',
        },
        ko: {
          label: '어떤 분께 연락할 때 조심해야 할까요?',
          helpText: '누구인지, 그리고 왜 그렇게 느끼시는지 알려주세요 — 예: 아직 그곳에 다닌다, 두 사람 사이가 틀어졌다 등입니다.',
        },
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
