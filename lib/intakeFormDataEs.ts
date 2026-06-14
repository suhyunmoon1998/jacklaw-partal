import { Question } from '@/types'

export interface IntakeSection {
  id: string
  title: string
  description?: string
  questions: Question[]
}

export const INTAKE_SECTIONS_ES: IntakeSection[] = [
  {
    id: 'basic-info',
    title: 'Información Básica',
    description: 'Por favor proporcione su información personal',
    questions: [
      {
        id: 'legal_name',
        label: 'Nombre Legal Completo',
        type: 'text',
        placeholder: 'Como aparece en su ID',
      },
      {
        id: 'other_names',
        label: 'Otros Nombres Utilizados (nombre de soltera, apodos, etc.)',
        type: 'text',
        placeholder: 'Deje en blanco si no aplica',
      },
      {
        id: 'dob',
        label: 'Fecha de Nacimiento',
        type: 'date',
      },
      {
        id: 'current_address',
        label: 'Dirección Actual',
        type: 'textarea',
        placeholder: 'Calle, ciudad, estado, código postal',
      },
      {
        id: 'addresses_5_years',
        label: 'Direcciones Donde Ha Vivido en los Últimos 5 Años',
        type: 'textarea',
        helpText: 'Enumere cada dirección y las fechas que vivió allí',
      },
      {
        id: 'phone_number',
        label: 'Número de Teléfono',
        type: 'phone',
      },
      {
        id: 'email_address',
        label: 'Correo Electrónico',
        type: 'text',
        placeholder: 'su@correo.com',
      },
    ],
  },

  {
    id: 'employment-info',
    title: 'Información de Empleo / Trabajo',
    description: 'Por favor cuéntenos sobre su empleo',
    questions: [
      {
        id: 'current_employer_name',
        label: 'Nombre del Empleador Actual',
        type: 'text',
        placeholder: 'Deje en blanco si no está empleado actualmente',
      },
      {
        id: 'current_employer_address',
        label: 'Dirección del Empleador Actual',
        type: 'text',
      },
      {
        id: 'current_employer_phone',
        label: 'Teléfono del Empleador Actual',
        type: 'phone',
      },
      {
        id: 'job_title',
        label: 'Su Puesto',
        type: 'text',
      },
      {
        id: 'employment_history',
        label: 'Su Historial de Empleo (para el período relevante)',
        type: 'textarea',
        helpText: 'Enumere empleos anteriores, fechas y empleadores',
      },
      {
        id: 'self_employed',
        label: '¿Es trabajador por cuenta propia u dueño de negocio?',
        type: 'yes_no',
      },
      {
        id: 'business_details',
        label: 'Si es así, por favor describa el nombre de su negocio y tipo de trabajo',
        type: 'textarea',
        showIf: { questionId: 'self_employed', value: 'yes' },
      },
    ],
  },

  {
    id: 'language',
    title: 'Idioma',
    questions: [
      {
        id: 'english_comfortable',
        label: '¿Se siente cómodo hablando, leyendo y escribiendo en inglés?',
        type: 'yes_no',
      },
      {
        id: 'main_language',
        label: '¿Qué idioma habla principalmente?',
        type: 'text',
      },
    ],
  },

  {
    id: 'what-happened',
    title: 'Qué Pasó',
    description: 'Por favor describa el incidente en detalle',
    questions: [
      {
        id: 'what_happened',
        label: 'Describa qué pasó. Incluya fechas, horas, lugares, y explique qué pasó antes, durante y después del incidente.',
        type: 'textarea',
        placeholder: 'Por favor proporcione tanto detalle como pueda recordar',
      },
    ],
  },

  {
    id: 'witnesses',
    title: 'Testigos / Otras Personas Involucradas',
    description: 'Cuéntenos sobre cualquiera que conozca sobre lo que sucedió',
    questions: [
      {
        id: 'witnesses_present',
        label: 'Nombres de cualquiera que haya visto lo que pasó',
        type: 'textarea',
        placeholder: 'Deje en blanco si no hay testigos',
      },
      {
        id: 'witnesses_aware',
        label: 'Nombres de cualquiera que sepa sobre lo que pasó (aunque no lo hayan visto)',
        type: 'textarea',
        placeholder: 'Deje en blanco si no aplica',
      },
      {
        id: 'witnesses_contact',
        label: 'Información de contacto de los testigos (si se conoce)',
        type: 'textarea',
        helpText: 'Teléfono, correo electrónico o dirección',
      },
      {
        id: 'witnesses_details',
        label: '¿Qué sabe cada persona?',
        type: 'textarea',
        helpText: 'Describa lo que cada testigo sabe sobre el incidente',
      },
    ],
  },

  {
    id: 'documents-evidence',
    title: 'Documentos / Evidencia',
    questions: [
      {
        id: 'has_documents',
        label: '¿Tiene fotos, videos, mensajes de texto, correos electrónicos, grabaciones, notas, informes, contratos, recibos de pago o registros médicos relacionados con este asunto?',
        type: 'yes_no',
      },
      {
        id: 'documents_list',
        label: '¿Qué documentos tiene?',
        type: 'textarea',
        showIf: { questionId: 'has_documents', value: 'yes' },
        placeholder: 'Enumere los tipos de documentos y descríbalos brevemente',
      },
      {
        id: 'documents_who_has',
        label: '¿Quién tiene estos documentos?',
        type: 'textarea',
        showIf: { questionId: 'has_documents', value: 'yes' },
        helpText: '¿Quién tiene posesión de los documentos?',
      },
    ],
  },

  {
    id: 'statements',
    title: 'Declaraciones',
    questions: [
      {
        id: 'has_statements',
        label: '¿Usted o alguien más hizo alguna declaración escrita, grabada o verbal sobre el incidente?',
        type: 'yes_no',
      },
      {
        id: 'statements_details',
        label: 'Si es así, ¿cuándo, a quién, y en qué forma? (escrita, grabada, verbal)',
        type: 'textarea',
        showIf: { questionId: 'has_statements', value: 'yes' },
      },
    ],
  },

  {
    id: 'injuries-harm',
    title: 'Lesiones / Daño',
    description: 'Por favor describa cualquier daño físico, emocional o mental que sufrió',
    questions: [
      {
        id: 'suffered_harm',
        label: '¿Sufrió algún daño físico, emocional o mental?',
        type: 'yes_no',
      },
      {
        id: 'harm_symptoms',
        label: '¿Qué síntomas o problemas tuvo?',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_start_date',
        label: '¿Cuándo comenzaron?',
        type: 'date',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_ongoing',
        label: '¿Estos problemas continúan?',
        type: 'yes_no',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_treatment',
        label: '¿Qué tratamiento recibió? (médicos, hospitales, terapia, etc.)',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_healthcare_providers',
        label: 'Nombres de médicos, clínicas u hospitales',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
    ],
  },

  {
    id: 'lost-wages',
    title: 'Salarios Perdidos / Ingresos Perdidos',
    questions: [
      {
        id: 'missed_work',
        label: '¿Faltó al trabajo por este incidente?',
        type: 'yes_no',
      },
      {
        id: 'missed_dates',
        label: '¿Qué fechas faltó al trabajo?',
        type: 'textarea',
        showIf: { questionId: 'missed_work', value: 'yes' },
      },
      {
        id: 'income_lost_amount',
        label: '¿Cuántos ingresos perdió?',
        type: 'text',
        showIf: { questionId: 'missed_work', value: 'yes' },
        placeholder: 'Cantidad en dólares',
      },
      {
        id: 'income_calculation',
        label: '¿Cómo está calculando esa cantidad?',
        type: 'textarea',
        showIf: { questionId: 'missed_work', value: 'yes' },
        placeholder: 'Muestre su cálculo (por ejemplo, tarifa por hora × horas)',
      },
    ],
  },

  {
    id: 'other-damages',
    title: 'Otros Daños',
    questions: [
      {
        id: 'property_damage',
        label: '¿Hubo daños a la propiedad?',
        type: 'yes_no',
      },
      {
        id: 'property_damage_details',
        label: 'Describa el daño a la propiedad y la cantidad',
        type: 'textarea',
        showIf: { questionId: 'property_damage', value: 'yes' },
      },
      {
        id: 'medical_expenses',
        label: '¿Tiene gastos médicos o de atención médica?',
        type: 'yes_no',
      },
      {
        id: 'medical_expenses_amount',
        label: 'Gastos médicos totales',
        type: 'text',
        showIf: { questionId: 'medical_expenses', value: 'yes' },
        placeholder: 'Cantidad en dólares',
      },
      {
        id: 'other_expenses',
        label: '¿Tiene otros costos de su bolsillo? (viaje, cuidado de niños, etc.)',
        type: 'yes_no',
      },
      {
        id: 'other_expenses_details',
        label: 'Describa otros gastos y cantidades',
        type: 'textarea',
        showIf: { questionId: 'other_expenses', value: 'yes' },
      },
    ],
  },

  {
    id: 'insurance',
    title: 'Seguros',
    questions: [
      {
        id: 'has_insurance',
        label: '¿Hay algún seguro que pueda estar relacionado con este asunto?',
        type: 'yes_no',
      },
      {
        id: 'insurance_details',
        label: 'Si es así, ¿qué compañía, qué tipo de seguro, y se hizo un reclamo?',
        type: 'textarea',
        showIf: { questionId: 'has_insurance', value: 'yes' },
      },
    ],
  },

  {
    id: 'prior-claims',
    title: 'Reclamos Previos / Demandas',
    questions: [
      {
        id: 'similar_claim_before',
        label: '¿Ha hecho un reclamo similar antes?',
        type: 'yes_no',
      },
      {
        id: 'similar_lawsuit_before',
        label: '¿Ha estado involucrado en una demanda similar?',
        type: 'yes_no',
      },
      {
        id: 'workers_comp_claim',
        label: '¿Ha presentado un reclamo de compensación de trabajadores?',
        type: 'yes_no',
      },
      {
        id: 'prior_claims_details',
        label: 'Si respondió sí a lo anterior, ¿cuándo y cuál fue el resultado?',
        type: 'textarea',
        helpText: 'Incluya fechas y resultados',
      },
    ],
  },

  {
    id: 'response-other-side',
    title: 'Su Respuesta a la Otra Parte',
    description: 'Si la otra parte disputa su versión de los eventos, explique por qué están equivocados',
    questions: [
      {
        id: 'response_to_other_side',
        label: 'Si la otra parte dice que nada pasó, o que fue su culpa, o que sus daños están exagerados, explique por qué eso es incorrecto. Identifique hechos, testigos o documentos que apoyen su posición.',
        type: 'textarea',
      },
    ],
  },

  {
    id: 'pay-schedule',
    title: 'Pago y Horario',
    questions: [
      {
        id: 'pay_type',
        label: '¿Cómo fue pagado?',
        type: 'select',
        options: ['Salario por hora', 'Salario', 'Comisión', 'Tarifa por pieza', 'Otro'],
      },
      {
        id: 'pay_rate',
        label: '¿Cuál era su tasa de pago?',
        type: 'text',
        placeholder: 'por ejemplo, $18/hora o $60,000 por año',
      },
      {
        id: 'usual_workdays',
        label: '¿Cuáles eran sus días laborales habituales?',
        type: 'text',
        placeholder: 'por ejemplo, lunes a viernes',
      },
      {
        id: 'usual_hours',
        label: '¿Cuáles eran sus horas de trabajo habituales por día?',
        type: 'text',
        placeholder: 'por ejemplo, 9 AM a 5 PM',
      },
    ],
  },

  {
    id: 'breaks-overtime',
    title: 'Descansos y Horas Extra',
    questions: [
      {
        id: 'meal_breaks',
        label: '¿Pudo tomar descansos de comida?',
        type: 'yes_no',
      },
      {
        id: 'rest_breaks',
        label: '¿Pudo tomar descansos de descanso?',
        type: 'yes_no',
      },
      {
        id: 'worked_overtime',
        label: '¿Trabajó horas extra?',
        type: 'yes_no',
      },
      {
        id: 'paid_all_hours',
        label: '¿Fue pagado por todas las horas trabajadas?',
        type: 'yes_no',
      },
    ],
  },

  {
    id: 'supervisors-hr',
    title: 'Supervisores / RRHH',
    questions: [
      {
        id: 'supervisor_name',
        label: '¿Quién lo supervisaba?',
        type: 'text',
      },
      {
        id: 'hr_contact',
        label: '¿Quién manejaba RRHH o nómina?',
        type: 'text',
      },
      {
        id: 'complained_to',
        label: '¿A quién se quejó, si es que lo hizo?',
        type: 'text',
      },
    ],
  },

  {
    id: 'termination-discipline',
    title: 'Terminación / Disciplina / Historial de Quejas',
    questions: [
      {
        id: 'was_disciplined',
        label: '¿Fue disciplinado, suspendido o despedido?',
        type: 'yes_no',
      },
      {
        id: 'discipline_date',
        label: '¿Cuándo?',
        type: 'date',
        showIf: { questionId: 'was_disciplined', value: 'yes' },
      },
      {
        id: 'discipline_reason_given',
        label: '¿Cuál fue la razón que le dieron?',
        type: 'textarea',
        showIf: { questionId: 'was_disciplined', value: 'yes' },
      },
      {
        id: 'prior_complaint',
        label: '¿Se quejó sobre salarios, acoso, discriminación, represalia, seguridad o condiciones de trabajo antes de que eso sucediera?',
        type: 'yes_no',
      },
      {
        id: 'complaint_details',
        label: 'Si es así, describa la queja',
        type: 'textarea',
        showIf: { questionId: 'prior_complaint', value: 'yes' },
      },
    ],
  },

  {
    id: 'discrimination-retaliation',
    title: 'Discriminación / Represalia / Licencia / Acomodación',
    questions: [
      {
        id: 'unfair_treatment',
        label: '¿Fue tratado injustamente debido a una razón protegida? (raza, género, discapacidad, edad, religión, etc.)',
        type: 'yes_no',
      },
      {
        id: 'unfair_treatment_details',
        label: 'Si es así, describa el trato',
        type: 'textarea',
        showIf: { questionId: 'unfair_treatment', value: 'yes' },
      },
      {
        id: 'requested_leave',
        label: '¿Solicitó una licencia médica o una acomodación?',
        type: 'yes_no',
      },
      {
        id: 'leave_requested',
        label: '¿Qué fue solicitado?',
        type: 'textarea',
        showIf: { questionId: 'requested_leave', value: 'yes' },
      },
      {
        id: 'employer_response',
        label: '¿Cómo respondió el empleador?',
        type: 'textarea',
        showIf: { questionId: 'requested_leave', value: 'yes' },
      },
    ],
  },
]
