import { QuestionnaireSection } from '@/types'

/**
 * The intake questionnaire in Spanish — Module 1.
 *
 * Only what the client reads lives here: the section title, the question label,
 * the help text, the placeholder, and the words shown for each answer choice.
 * Ids, types, required flags, option VALUES and skip logic all come from
 * lib/questionnaireData.ts and are merged over this file at read time by
 * questionnaireSections(); see the note there for why the structure is owned in
 * one place. A question missing from this file falls back to English rather
 * than disappearing.
 */
export const QUESTIONNAIRE_SECTIONS_ES: QuestionnaireSection[] = [
  {
    id: "contact",
    title: "Sus datos de contacto",
    questions: [
      { id: "full_name", label: "¿Cuál es su nombre legal completo?", type: "text", placeholder: "Tal como aparece en su identificación" },
      { id: "used_other_name", label: "¿Usó usted algún otro nombre mientras trabajaba en este empleo?", type: "yes_no" },
      { id: "other_names", label: "¿Qué otro nombre u otros nombres usó?", type: "text" },
      { id: "dob", label: "¿Cuál es su fecha de nacimiento?", type: "date" },
      { id: "address", label: "¿Cuál es la dirección de su domicilio (calle y número)?", type: "text" },
      { id: "city_state_zip", label: "¿En qué ciudad, estado y código postal (ZIP Code) vive?", type: "text" },
      { id: "contact_phones", label: "¿A qué número de teléfono podemos llamarle? ¿Tiene otro número de teléfono?", type: "text", helpText: "Escriba primero el mejor número para localizarle. Si tiene un segundo número, agréguelo después.", placeholder: "(310) 555-0000, and (310) 555-0001" },
      { id: "email", label: "¿Cuál es su correo electrónico?", type: "text", placeholder: "usted@ejemplo.com" },
      { id: "preferred_language", label: "¿En qué idioma prefiere que le hablemos y le escribamos?", type: "select", options: ["Inglés", "Español", "Chino", "Coreano", "Otro"] },
    ],
  },
  {
    id: "employer",
    title: "El empleador",
    questions: [
      { id: "employer_name", label: "¿Cuál es el nombre del empleador o de la compañía?", type: "text", helpText: "Use el nombre que aparece en un talón de pago o en un cheque, si lo sabe." },
      { id: "employer_address", label: "¿Cuál es la dirección del empleador (calle y número)?", type: "text", helpText: "\"No lo sé\" es una respuesta válida." },
      { id: "employer_city_state", label: "¿En qué ciudad y estado trabajó usted?", type: "text" },
      { id: "supervisor_name", label: "¿Cómo se llamaba su supervisor o gerente principal?", type: "text", helpText: "\"No sé el nombre\" es una respuesta válida." },
      { id: "supervisor_phone", label: "¿Cuál es el número de teléfono de esa persona?", type: "text", helpText: "\"No lo sé\" es una respuesta válida.", placeholder: "(310) 555-0000" },
      { id: "hr_contact", label: "¿Quién era su contacto en Recursos Humanos, o cómo se llamaba ese departamento?", type: "text", helpText: "\"No había Recursos Humanos\" y \"No lo sé\" son respuestas válidas." },
      { id: "industry", label: "¿Qué tipo de negocio era?", type: "text", placeholder: "Por ejemplo: restaurante, bodega o almacén, construcción, tienda u oficina" },
    ],
  },
  {
    id: "dates_worked",
    title: "Cuándo trabajó usted allí",
    questions: [
      { id: "start_date_known", label: "¿Sabe usted la fecha exacta en que empezó a trabajar allí?", type: "select", options: ["Sí", "No", "No estoy seguro(a)"] },
      { id: "start_date", label: "¿Cuándo empezó a trabajar allí? Puede dar la fecha exacta, lo más aproximado que recuerde o un rango de fechas.", type: "text", helpText: "Puede ser una fecha, un mes y año, una temporada o un periodo: \"primavera de 2022\" y \"de marzo a mayo de 2022\" son respuestas válidas." },
      { id: "still_employed", label: "¿Todavía trabaja usted allí?", type: "yes_no" },
      { id: "end_date_known", label: "¿Sabe usted cuál fue exactamente su último día de trabajo?", type: "select", options: ["Sí", "No", "No estoy seguro(a)"] },
      { id: "end_date", label: "¿Cuál fue su último día de trabajo? Puede dar la fecha exacta, lo más aproximado que recuerde o un rango de fechas.", type: "text", helpText: "Puede ser una fecha, un mes y año, una temporada o un periodo: \"finales de 2023\" y \"noviembre o diciembre de 2023\" son respuestas válidas." },
      { id: "job_type", label: "¿Qué tipo de trabajo era?", type: "select", options: ["Tiempo completo", "Medio tiempo", "Temporal", "Por temporada", "De guardia (lo llamaban cuando lo necesitaban)", "Otro", "No lo sé"] },
    ],
  },
  {
    id: "position",
    title: "Su trabajo y sus tareas",
    questions: [
      { id: "job_title", label: "¿Cuál era su puesto de trabajo?", type: "text" },
      { id: "job_duties", label: "¿Qué trabajo hacía normalmente?", type: "textarea", placeholder: "Escriba sus tareas principales." },
      { id: "contractor_or_employee", label: "¿La empresa lo consideraba empleado o contratista independiente?", type: "select", options: ["Empleado", "Contratista independiente", "Las dos cosas, en distintos momentos", "No lo sé"] },
      { id: "contractor_wrong", label: "Si la empresa lo llamaba contratista independiente, ¿usted cree que eso estaba mal?", type: "select", options: ["Sí", "No", "No estoy seguro"] },
      { id: "called_exempt", label: "¿La empresa le dijo que usted era 'exento' o 'asalariado' y que no le pagarían horas extras?", type: "select", options: ["Sí", "No", "No lo sé"] },
    ],
  },
  {
    id: "pay_rate",
    title: "Cómo le pagaban",
    questions: [
      { id: "pay_calculated", label: "¿Cómo se calculaba su pago?", type: "multiselect", options: ["Por hora", "Salario fijo", "Por día", "Por pieza", "Por comisión", "Otro", "\"No sé\""], helpText: "Elija todo lo que corresponda." },
      { id: "hourly_rate", label: "¿Cuánto le pagaban por hora?", type: "text", helpText: "Una cantidad en dólares, o \"No sé\".", placeholder: "18.00" },
      { id: "salary_amount", label: "¿De cuánto era su salario?", type: "text", helpText: "La cantidad y cada cuánto se la pagaban, o \"No sé\".", placeholder: "$60,000 al año" },
      { id: "other_pay_rates", label: "¿Qué otra tarifa o tarifas de pago le aplicaban?", type: "text", helpText: "Incluya cada tarifa por día, por pieza o por comisión." },
      { id: "pay_received_how", label: "¿Cómo recibía su pago?", type: "multiselect", options: ["En efectivo", "Cheque de papel", "Depósito directo", "Tarjeta de nómina", "Otro"], helpText: "Elija todo lo que corresponda." },
      { id: "tips_received", label: "¿Recibía propinas?", type: "select", options: ["Sí", "No", "A veces"] },
      { id: "pay_rate_changed", label: "¿Cambió su tarifa de pago mientras trabajaba ahí?", type: "select", options: ["Sí", "No", "\"No sé\""] },
      { id: "pay_change_notes", label: "¿Qué cambió y más o menos cuándo ocurrió cada cambio?", type: "textarea", helpText: "Escriba una línea por cada cambio." },
    ],
  },
  {
    id: "schedule",
    title: "Su horario de trabajo habitual",
    questions: [
      { id: "days_per_week_usual", label: "¿Aproximadamente cuántos días por semana trabajaba usted normalmente?", type: "text", helpText: "Puede poner un número, un rango, \"Cambiaba\" o \"No lo sé\"." },
      { id: "hours_per_day", label: "¿Aproximadamente cuántas horas por día trabajaba usted normalmente?", type: "text", helpText: "Puede poner un número, un rango, \"Cambiaba\" o \"No lo sé\"." },
      { id: "weekly_schedule", label: "¿Qué días trabajaba usted normalmente, y a qué hora empezaba y terminaba?", type: "textarea", helpText: "Una línea por cada día. Deje el día en blanco si no trabajaba ese día.", placeholder: "Lunes: 7:00am a 4:00pm\nMartes: 7:00am a 4:00pm\nMiércoles:\nJueves:\nViernes:\nSábado:\nDomingo:" },
      { id: "schedule_chosen_by", label: "¿Quién decidía sus días y sus horas de trabajo?", type: "multiselect", options: ["El dueño o el jefe", "Un gerente o encargado", "Alguien de la oficina o quien hacía los horarios", "Una aplicación o un sistema", "El cliente o el lugar de trabajo", "Más de una persona o de una manera", "Otro", "No lo sé"], helpText: "Marque todas las opciones que correspondan." },
      { id: "schedule_delivered_how", label: "¿Cómo se enteraba usted de su horario?", type: "multiselect", options: ["Un papel puesto en el trabajo", "Una aplicación o un sitio web", "Mensaje de texto", "Correo electrónico", "Chat de grupo", "Llamada telefónica", "Se lo decían en persona", "Siempre era el mismo", "Otro", "No lo sé"], helpText: "Marque todas las opciones que correspondan." },
      { id: "schedule_changed", label: "Después de recibir su horario, ¿alguna vez cambiaba?", type: "select", options: ["Sí", "No", "A veces", "No lo sé"] },
      { id: "schedule_change_asks", label: "¿Alguna vez le pidieron o le exigieron hacer alguna de estas cosas?", type: "multiselect", options: ["Ir a trabajar en su día de descanso", "Llegar más temprano", "Quedarse hasta más tarde", "Trabajar otro día", "Empezar o terminar a otra hora", "Irse a casa antes de tiempo", "Llamar para saber si le tocaba trabajar", "Estar listo o disponible por si lo llamaban", "Otro"], helpText: "Marque todas las opciones que correspondan." },
    ],
  },
  {
    id: "timekeeping",
    title: "Cómo se registraba su tiempo de trabajo",
    questions: [
      { id: "time_recorded_how", label: "¿Cómo registraba el empleador su tiempo de trabajo?", type: "multiselect", options: ["Tarjeta de marcar (reloj checador)", "Pasar o tocar una tarjeta", "Código o botón", "Escaneo del dedo, de la mano o de la cara", "Aplicación en teléfono o tableta", "Computadora del trabajo o sitio web", "Caja registradora", "Registro en papel", "Avisarle a alguien o mandarle un mensaje de texto", "Un jefe o un compañero lo anotaba", "No se llevaba ningún registro de horas", "Otro", "No sé"], helpText: "Escoja todas las opciones que correspondan." },
      { id: "entered_own_start", label: "¿Anotaba usted mismo su hora de entrada casi todos los días de trabajo?", type: "select", options: ["Sí", "No", "A veces", "No se llevaba registro de la hora de entrada", "No sé"] },
      { id: "start_entered_how", label: "¿Cómo anotaba su hora de entrada?", type: "select", options: ["Tarjeta de marcar (reloj checador)", "Pasar o tocar una tarjeta", "Código o botón", "Escaneo del dedo, de la mano o de la cara", "Aplicación en teléfono o tableta", "Computadora del trabajo o sitio web", "Caja registradora", "Registro en papel", "Avisarle a alguien o mandarle un mensaje de texto", "De más de una manera", "Otro", "No sé"] },
      { id: "start_entered_where", label: "¿Dónde anotaba su hora de entrada?", type: "select", options: ["En la puerta de entrada", "En el área de trabajo", "En la oficina o en la sala de descanso", "En la caja registradora", "En la computadora del trabajo", "En un teléfono o tableta de la empresa", "En mi propio teléfono", "En el carro del trabajo o en el sitio de trabajo", "En más de un lugar", "Otro", "No sé"] },
      { id: "timekeeping_system_name", label: "¿Cómo se llamaba el reloj, la aplicación, el sitio web o el sistema?", type: "text", helpText: "\"Nunca vi un nombre\" y \"No sé\" son respuestas válidas." },
      { id: "start_entered_by_other", label: "Cuando usted no anotaba su propia hora de entrada, ¿quién la anotaba?", type: "select", options: ["El dueño o el jefe", "El gerente o el encargado", "Un compañero de trabajo", "Alguien de la oficina o de nómina", "El sistema lo hacía solo", "Se usaba la hora del horario programado", "Más de una persona o más de una manera", "Nadie", "No sé"] },
      { id: "entered_own_end", label: "¿Anotaba usted mismo su hora de salida casi todos los días de trabajo?", type: "select", options: ["Sí", "No", "A veces", "No se llevaba registro de la hora de salida", "No sé"] },
      { id: "end_entered_same_way", label: "¿Anotaba su hora de salida de la misma manera que su hora de entrada?", type: "select", options: ["Sí", "No", "A veces", "No sé"] },
      { id: "end_entered_differently", label: "Si la hora de salida se anotaba de otra manera, ¿cómo se anotaba?", type: "text" },
      { id: "end_entered_by_other", label: "Cuando usted no anotaba su propia hora de salida, ¿quién la anotaba?", type: "select", options: ["El dueño o el jefe", "El gerente o el encargado", "Un compañero de trabajo", "Alguien de la oficina o de nómina", "El sistema lo hacía solo", "Se usaba la hora del horario programado", "Más de una persona o más de una manera", "Nadie", "No sé"] },
      { id: "timekeeping_changed", label: "¿Cambió la forma de registrar su tiempo durante este trabajo?", type: "select", options: ["No", "Sí, cambió con el tiempo", "Sí, cambiaba según el día de trabajo o el lugar", "Ambas cosas", "No sé"] },
      { id: "timekeeping_change_details", label: "¿Qué cambió y más o menos cuándo?", type: "textarea", helpText: "Agregue una línea por cada cambio que en verdad ocurrió." },
      { id: "records_altered", label: "¿Alguna vez el empleador cambió, alteró o borró sus registros de horas?", type: "select", options: ["Sí", "No", "A veces", "No sé"] },
      { id: "alteration_details", label: "¿Qué pasó con sus registros de horas?", type: "textarea", helpText: "Indique quién los cambió, qué se cambió y más o menos cuándo." },
    ],
  },
  {
    id: "time_check",
    title: "Verificación de las horas de entrada y salida",
    questions: [
      { id: "start_times_meaning", label: "Las horas de entrada que usted indicó, ¿eran la hora en que empezó su primera tarea de trabajo?", type: "select", options: ["Sí", "No, eran las horas en que marqué mi entrada", "No, eran las horas de mi horario asignado", "No, eran las horas en que llegué", "Cambiaba según el día", "\"No sé\""] },
      { id: "work_before_start", label: "¿Hizo usted algún trabajo antes de las horas de entrada que indicó?", type: "select", options: ["Sí", "No", "A veces", "\"No sé\""] },
      { id: "work_before_start_what", label: "¿Qué trabajo hizo usted antes de esas horas de entrada?", type: "textarea", placeholder: "Por favor explique." },
      { id: "work_before_start_minutes", label: "¿En qué días hizo usted ese trabajo y aproximadamente cuántos minutos cada día?", type: "textarea", helpText: "Una línea por día. Deje el día en blanco si no ocurrió.", placeholder: "Lunes: 20 minutos\nMartes: 15 minutos\nMiércoles:\nJueves:\nViernes:\nSábado:\nDomingo:" },
      { id: "end_times_meaning", label: "Las horas de salida que usted indicó, ¿eran la hora en que terminó su última tarea de trabajo?", type: "select", options: ["Sí", "No, eran las horas en que marqué mi salida", "No, eran las horas de mi horario asignado", "No, eran las horas en que me fui", "Cambiaba según el día", "\"No sé\""] },
      { id: "work_after_end", label: "¿Hizo usted algún trabajo después de las horas de salida que indicó?", type: "select", options: ["Sí", "No", "A veces", "\"No sé\""] },
      { id: "work_after_end_what", label: "¿Qué hizo usted después de esas horas de salida?", type: "multiselect", options: ["Limpié o cerré el lugar", "Puse llave o apagué las cosas", "Conté dinero o cerré la caja registradora", "Terminé papeles o mensajes", "Guardé herramientas, llaves, comida o materiales", "Esperé a que un jefe revisara el trabajo", "Revisión de bolsas o revisión de seguridad", "Esperé para salir junto con un grupo", "Ayudé a un cliente o a un compañero de trabajo", "Manejé o viajé por motivos de trabajo", "Otra cosa", "\"No sé\""], helpText: "Elija todo lo que aplique en su caso." },
      { id: "work_after_end_minutes", label: "¿En qué días hizo usted ese trabajo y aproximadamente cuántos minutos cada día?", type: "textarea", helpText: "Una línea por día. Deje el día en blanco si no ocurrió.", placeholder: "Lunes: 20 minutos\nMartes: 15 minutos\nMiércoles:\nJueves:\nViernes:\nSábado:\nDomingo:" },
      { id: "split_shift", label: "¿Hubo algún día en que usted salió del trabajo y regresó, o trabajó dos turnos separados?", type: "select", options: ["Sí", "No", "\"No sé\""] },
      { id: "split_shift_details", label: "¿Qué día fue y cuáles fueron las horas de entrada y de salida de cada período de trabajo?", type: "textarea", helpText: "Agregue una línea por cada día." },
    ],
  },
  {
    id: "final_wages",
    title: "Salarios finales",
    questions: [
      { id: "employment_ended_how", label: "¿Cómo terminó su empleo?", type: "select", options: ["Me despidieron", "Me cesaron por recorte de personal", "Renuncié", "Me obligaron a renunciar", "Terminó el trabajo o la asignación", "Otro"] },
      { id: "final_wages_on_last_day", label: "¿Le pagaron su salario final el último día que trabajó?", type: "select", options: ["Sí", "No", "\"No lo sé\""] },
      { id: "final_wages_paid_when", label: "¿Cuándo le pagaron su salario final?", type: "text", helpText: "Una fecha, su mejor cálculo, o \"No los he recibido\"." },
      { id: "wages_owed", label: "¿Cree usted que el empleador todavía le debe salarios sin pagar?", type: "select", options: ["Sí", "No", "No estoy seguro(a)"] },
      { id: "wages_owed_estimate", label: "¿Aproximadamente cuánto cree que todavía le deben?", type: "text", helpText: "Una cantidad en dólares, su mejor cálculo, o \"No lo sé\".", placeholder: "aproximadamente $3,500" },
    ],
  },
  {
    id: "wrongful_termination",
    title: "Despido injustificado",
    questions: [
      { id: "fired_or_forced", label: "¿Lo despidieron o lo obligaron a renunciar?", type: "select", options: ["Sí", "No", "No estoy seguro"] },
      { id: "reason_given_for_termination", label: "¿Qué razón le dio el empleador para terminar su trabajo?", type: "text", helpText: "\"No me dieron ninguna razón\" es una respuesta válida." },
      { id: "ended_unlawfully", label: "¿Cree usted que el empleador terminó su trabajo por una razón ilegal?", type: "select", options: ["Sí", "No", "No estoy seguro"] },
      { id: "wrongful_reason_belief", label: "¿Por qué cree que la razón fue ilegal?", type: "text" },
      { id: "wrongful_not_sure_details", label: "Si no está seguro, ¿qué hechos lo hacen dudar sobre el motivo por el que terminó su trabajo?", type: "text" },
      { id: "written_warnings", label: "¿Recibió advertencias o reportes por escrito antes de que terminara su trabajo?", type: "select", options: ["Sí", "No", "No lo sé"] },
    ],
  },
]
