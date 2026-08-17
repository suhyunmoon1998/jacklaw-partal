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
  /** The same name in Spanish, for clients reading the portal in Spanish. */
  setNameEs: string
  /** Staff-only note on when to send this set. */
  description: string
  questions: Question[]
}

export const RECOMMENDED_BANKS: RecommendedBank[] = [
  {
    key: 'wage_hour',
    caseType: 'Wage & Hour',
    setName: 'Wage & Hour Follow-Up',
    setNameEs: 'Seguimiento de Salarios y Horas',
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
      },
      {
        id: 'wh_own_records_details',
        label: 'What kind of record did you keep, what dates does it cover, and do you still have it?',
        type: 'textarea',
        showIf: { questionId: 'wh_kept_own_records', value: 'yes' },
        es: {
          label: '¿Qué tipo de registro llevaba? ¿Qué fechas cubre? ¿Todavía lo tiene?',
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
      },
    ],
  },
  {
    key: 'wrongful_termination',
    caseType: 'Wrongful Termination',
    setName: 'Termination Details',
    setNameEs: 'Detalles del Despido',
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
      },
    ],
  },
  {
    key: 'harassment',
    caseType: 'Harassment / Discrimination',
    setName: 'Harassment Follow-Up',
    setNameEs: 'Seguimiento: Acoso / Discriminación',
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
      },
      {
        id: 'hd_others_involved',
        label: 'Did anyone else at the company say or do these things to you?',
        type: 'yes_no',
        es: {
          label: '¿Alguien más de la empresa le dijo o le hizo estas cosas?',
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
      },
    ],
  },
  {
    key: 'retaliation',
    caseType: 'Retaliation',
    setName: 'Retaliation Follow-Up',
    setNameEs: 'Seguimiento de Represalias',
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
      },
      {
        id: 'rt_activity_others_present',
        label: 'Was anyone else there, listening, or copied when you did this?',
        type: 'yes_no',
        es: {
          label: '¿Había alguien más presente, escuchando o en copia del mensaje cuando lo hizo?',
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
      },
    ],
  },
  {
    key: 'leave',
    caseType: 'FMLA / Leave Violation',
    setName: 'Leave & Accommodation Follow-Up',
    setNameEs: 'Seguimiento sobre Licencia y Adaptaciones',
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
      },
      {
        id: 'lv_forms_given',
        label: 'Did anyone at work give you forms or paperwork to fill out for this?',
        type: 'yes_no',
        es: {
          label: '¿Alguien en el trabajo le dio formularios o papeles para llenar por esto?',
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
      },
      {
        id: 'lv_medical_note_given',
        label: 'Did you give your employer a note or paperwork from a doctor, midwife, or other medical provider?',
        type: 'yes_no',
        es: {
          label: '¿Le entregó a su empleador una nota o papeles de un doctor, partera u otro proveedor médico?',
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
      },
    ],
  },
  {
    key: 'whos_who',
    caseType: 'Any',
    setName: 'Who\'s Who',
    setNameEs: 'Quién es Quién',
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
      },
      {
        id: 'ww_had_other_supervisors',
        label: 'Besides that person, has anyone else supervised you at that job?',
        type: 'yes_no',
        es: {
          label: 'Además de esa persona, ¿alguien más lo ha supervisado en ese trabajo?',
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
      },
      {
        id: 'ww_knows_owner',
        label: 'Do you know who owns the company, or who the top boss is?',
        type: 'yes_no',
        es: {
          label: '¿Sabe quién es el dueño de la empresa o el jefe principal?',
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
      },
      {
        id: 'ww_coworker_saw_or_heard',
        label: 'Did any coworker ever tell you they saw or heard something that happened to you at work?',
        type: 'yes_no',
        es: {
          label: '¿Alguna vez algún compañero de trabajo le dijo que vio o escuchó algo que le pasó a usted en el trabajo?',
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
      },
      {
        id: 'ww_people_left',
        label: 'Do you know anyone who worked there and has since left?',
        type: 'yes_no',
        es: {
          label: '¿Conoce a alguien que trabajaba ahí y que ya se fue?',
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
      },
      {
        id: 'ww_still_in_touch',
        label: 'Are you still in contact with anyone from that job?',
        type: 'yes_no',
        required: true,
        es: {
          label: '¿Sigue en contacto con alguien de ese trabajo?',
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
