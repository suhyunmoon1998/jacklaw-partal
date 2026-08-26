import { Question } from '@/types'

/**
 * The client information form in Simplified Chinese.
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

export const INTAKE_SECTIONS_ZH: IntakeSection[] = [
  {
    id: 'basic-info',
    title: '基本信息',
    description: '请提供您的个人信息',
    questions: [
      {
        id: 'legal_name',
        label: '法定全名',
        type: 'text',
        placeholder: '与您证件上的姓名一致',
      },
      {
        id: 'other_names',
        label: '使用过的其他姓名（婚前姓、别名等）',
        type: 'text',
        placeholder: '没有请留空',
      },
      {
        id: 'dob',
        label: '出生日期',
        type: 'date',
      },
      {
        id: 'current_address',
        label: '现居地址',
        type: 'textarea',
        placeholder: '街道地址、城市、州、邮政编码',
      },
      {
        id: 'addresses_5_years',
        label: '过去 5 年内您住过的地址',
        type: 'textarea',
        helpText: '请列出每个地址以及居住的时间段',
      },
      {
        id: 'phone_number',
        label: '电话号码',
        type: 'phone',
      },
      {
        id: 'email_address',
        label: '电子邮箱',
        type: 'text',
        placeholder: 'you@example.com',
      },
    ],
  },

  {
    id: 'employment-info',
    title: '工作 / 雇佣信息',
    description: '请告诉我们您的工作情况',
    questions: [
      {
        id: 'current_employer_name',
        label: '现任雇主名称',
        type: 'text',
        placeholder: '目前没有工作请留空',
      },
      {
        id: 'current_employer_address',
        label: '现任雇主地址',
        type: 'text',
      },
      {
        id: 'current_employer_phone',
        label: '现任雇主电话',
        type: 'phone',
      },
      {
        id: 'job_title',
        label: '您的职位名称',
        type: 'text',
      },
      {
        id: 'employment_history',
        label: '您的工作经历（相关时期）',
        type: 'textarea',
        helpText: '请列出以前的工作、时间和雇主',
      },
      {
        id: 'self_employed',
        label: '您是自雇或自己经营生意吗？',
        type: 'yes_no',
      },
      {
        id: 'business_details',
        label: '如果是，请说明您的公司名称和从事的业务',
        type: 'textarea',
        showIf: { questionId: 'self_employed', value: 'yes' },
      },
    ],
  },

  {
    id: 'language',
    title: '语言',
    questions: [
      {
        id: 'english_comfortable',
        label: '您用英语说、读、写是否没有困难？',
        type: 'yes_no',
      },
      {
        id: 'main_language',
        label: '您主要说什么语言？',
        type: 'text',
      },
    ],
  },

  {
    id: 'what-happened',
    title: '事情经过',
    description: '请详细描述事情的经过',
    questions: [
      {
        id: 'what_happened',
        label: '请描述事情的经过。包括日期、时间、地点，并说明事发前、事发时和事发后各发生了什么。',
        type: 'textarea',
        placeholder: '请尽量把您记得的细节都写下来',
      },
    ],
  },

  {
    id: 'witnesses',
    title: '证人 / 其他相关人员',
    description: '请告诉我们有谁知道这件事',
    questions: [
      {
        id: 'witnesses_present',
        label: '亲眼看到经过的人的姓名',
        type: 'textarea',
        placeholder: '没有证人请留空',
      },
      {
        id: 'witnesses_aware',
        label: '知道这件事的人的姓名（即使他们没有亲眼看到）',
        type: 'textarea',
        placeholder: '没有请留空',
      },
      {
        id: 'witnesses_contact',
        label: '证人的联系方式（如果知道）',
        type: 'textarea',
        helpText: '电话、电子邮箱或地址',
      },
      {
        id: 'witnesses_details',
        label: '每个人分别知道些什么？',
        type: 'textarea',
        helpText: '请说明每位证人对这件事知道些什么',
      },
    ],
  },

  {
    id: 'documents-evidence',
    title: '文件 / 证据',
    questions: [
      {
        id: 'has_documents',
        label: '关于这件事，您有照片、视频、短信、电子邮件、录音、笔记、报告、合同、工资单或医疗记录吗？',
        type: 'yes_no',
      },
      {
        id: 'documents_list',
        label: '您手上有哪些文件？',
        type: 'textarea',
        placeholder: '请列出文件种类并简要说明',
        showIf: { questionId: 'has_documents', value: 'yes' },
      },
      {
        id: 'documents_who_has',
        label: '这些文件在谁手上？',
        type: 'textarea',
        helpText: '目前由谁保管这些文件？',
        showIf: { questionId: 'has_documents', value: 'yes' },
      },
    ],
  },

  {
    id: 'statements',
    title: '陈述',
    questions: [
      {
        id: 'has_statements',
        label: '您或其他人有就这件事做过书面、录音或口头陈述吗？',
        type: 'yes_no',
      },
      {
        id: 'statements_details',
        label: '如果有，是什么时候、向谁、以什么形式做的？（书面、录音、口头）',
        type: 'textarea',
        showIf: { questionId: 'has_statements', value: 'yes' },
      },
    ],
  },

  {
    id: 'injuries-harm',
    title: '伤害 / 损害',
    description: '请描述您受到的身体、情绪或精神上的伤害',
    questions: [
      {
        id: 'suffered_harm',
        label: '您是否受到身体、情绪或精神上的伤害？',
        type: 'yes_no',
      },
      {
        id: 'harm_symptoms',
        label: '您出现了哪些症状或问题？',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_start_date',
        label: '这些症状是什么时候开始的？',
        type: 'date',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_ongoing',
        label: '这些问题现在还在持续吗？',
        type: 'yes_no',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_treatment',
        label: '您接受了哪些治疗？（就医、住院、心理治疗等）',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
      {
        id: 'harm_healthcare_providers',
        label: '医生、诊所或医院的名称',
        type: 'textarea',
        showIf: { questionId: 'suffered_harm', value: 'yes' },
      },
    ],
  },

  {
    id: 'lost-wages',
    title: '工资损失 / 收入损失',
    questions: [
      {
        id: 'missed_work',
        label: '您有因为这件事而缺勤吗？',
        type: 'yes_no',
      },
      {
        id: 'missed_dates',
        label: '您缺勤的日期是哪些？',
        type: 'textarea',
        showIf: { questionId: 'missed_work', value: 'yes' },
      },
      {
        id: 'income_lost_amount',
        label: '您损失了多少收入？',
        type: 'text',
        placeholder: '金额（美元）',
        showIf: { questionId: 'missed_work', value: 'yes' },
      },
      {
        id: 'income_calculation',
        label: '这个金额是怎么算出来的？',
        type: 'textarea',
        placeholder: '请写出计算方式（例如：时薪 × 小时数）',
        showIf: { questionId: 'missed_work', value: 'yes' },
      },
    ],
  },

  {
    id: 'other-damages',
    title: '其他损失',
    questions: [
      {
        id: 'property_damage',
        label: '有造成财物损失吗？',
        type: 'yes_no',
      },
      {
        id: 'property_damage_details',
        label: '请说明财物损失的情况和金额',
        type: 'textarea',
        showIf: { questionId: 'property_damage', value: 'yes' },
      },
      {
        id: 'medical_expenses',
        label: '您有医疗或就医方面的花费吗？',
        type: 'yes_no',
      },
      {
        id: 'medical_expenses_amount',
        label: '医疗费用合计',
        type: 'text',
        placeholder: '金额（美元）',
        showIf: { questionId: 'medical_expenses', value: 'yes' },
      },
      {
        id: 'other_expenses',
        label: '还有其他自掏腰包的花费吗？（交通、托儿等）',
        type: 'yes_no',
      },
      {
        id: 'other_expenses_details',
        label: '请说明其他花费的项目和金额',
        type: 'textarea',
        showIf: { questionId: 'other_expenses', value: 'yes' },
      },
    ],
  },

  {
    id: 'insurance',
    title: '保险',
    questions: [
      {
        id: 'has_insurance',
        label: '有任何保险可能与这件事有关吗？',
        type: 'yes_no',
      },
      {
        id: 'insurance_details',
        label: '如果有，是哪家公司、什么险种，是否已经理赔申请？',
        type: 'textarea',
        showIf: { questionId: 'has_insurance', value: 'yes' },
      },
    ],
  },

  {
    id: 'prior-claims',
    title: '以往的索赔 / 诉讼',
    questions: [
      {
        id: 'similar_claim_before',
        label: '您以前提出过类似的索赔吗？',
        type: 'yes_no',
      },
      {
        id: 'similar_lawsuit_before',
        label: '您以前卷入过类似的诉讼吗？',
        type: 'yes_no',
      },
      {
        id: 'workers_comp_claim',
        label: '您提出过工伤赔偿申请吗？',
        type: 'yes_no',
      },
      {
        id: 'prior_claims_details',
        label: '以上任何一项如果是，请说明时间和结果',
        type: 'textarea',
        helpText: '请写上日期和处理结果',
      },
    ],
  },

  {
    id: 'response-other-side',
    title: '您对对方说法的回应',
    description: '如果对方对事情经过有异议，请说明他们哪里说错了',
    questions: [
      {
        id: 'response_to_other_side',
        label: '如果对方说什么都没发生、说是您的错，或说您夸大了损失，请说明他们哪里说错了。请指出支持您说法的事实、证人或文件。',
        type: 'textarea',
      },
    ],
  },

  {
    id: 'pay-schedule',
    title: '工资与班次',
    questions: [
      {
        id: 'pay_type',
        label: '公司是怎么给您发工资的？',
        type: 'select',
        options: [
          '按小时',
          '固定月薪 / 年薪',
          '提成',
          '按件计酬',
          '其他',
        ],
      },
      {
        id: 'pay_rate',
        label: '您的工资标准是多少？',
        type: 'text',
        placeholder: '例如：每小时 $18 或每年 $60,000',
      },
      {
        id: 'usual_workdays',
        label: '您平常在哪几天上班？',
        type: 'text',
        placeholder: '例如：周一至周五',
      },
      {
        id: 'usual_hours',
        label: '您平常每天的工作时间是几点到几点？',
        type: 'text',
        placeholder: '例如：上午 9 点到下午 5 点',
      },
    ],
  },

  {
    id: 'breaks-overtime',
    title: '休息与加班',
    questions: [
      {
        id: 'meal_breaks',
        label: '您能休到用餐时间吗？',
        type: 'yes_no',
      },
      {
        id: 'rest_breaks',
        label: '您能休到工间休息吗？',
        type: 'yes_no',
      },
      {
        id: 'worked_overtime',
        label: '您有加班吗？',
        type: 'yes_no',
      },
      {
        id: 'paid_all_hours',
        label: '您所有的工作时数都拿到工资了吗？',
        type: 'yes_no',
      },
    ],
  },

  {
    id: 'supervisors-hr',
    title: '主管 / 人事',
    questions: [
      {
        id: 'supervisor_name',
        label: '是谁管理您的工作？',
        type: 'text',
      },
      {
        id: 'hr_contact',
        label: '人事或工资由谁负责？',
        type: 'text',
      },
      {
        id: 'complained_to',
        label: '您曾向谁投诉过？如果有的话',
        type: 'text',
      },
    ],
  },

  {
    id: 'termination-discipline',
    title: '解雇 / 处分 / 投诉记录',
    questions: [
      {
        id: 'was_disciplined',
        label: '您有被处分、停职或解雇吗？',
        type: 'yes_no',
      },
      {
        id: 'discipline_date',
        label: '是什么时候？',
        type: 'date',
        showIf: { questionId: 'was_disciplined', value: 'yes' },
      },
      {
        id: 'discipline_reason_given',
        label: '公司给您的理由是什么？',
        type: 'textarea',
        showIf: { questionId: 'was_disciplined', value: 'yes' },
      },
      {
        id: 'prior_complaint',
        label: '在那之前，您有就工资、骚扰、歧视、报复、安全或工作条件投诉过吗？',
        type: 'yes_no',
      },
      {
        id: 'complaint_details',
        label: '如果有，请说明投诉的内容',
        type: 'textarea',
        showIf: { questionId: 'prior_complaint', value: 'yes' },
      },
    ],
  },

  {
    id: 'discrimination-retaliation',
    title: '歧视 / 报复 / 休假 / 工作调整',
    questions: [
      {
        id: 'unfair_treatment',
        label: '您是否因受法律保护的原因而遭受不公平对待？（种族、性别、残疾、年龄、宗教等）',
        type: 'yes_no',
      },
      {
        id: 'unfair_treatment_details',
        label: '如果有，请说明受到的对待',
        type: 'textarea',
        showIf: { questionId: 'unfair_treatment', value: 'yes' },
      },
      {
        id: 'requested_leave',
        label: '您有提出过病假或工作调整的要求吗？',
        type: 'yes_no',
      },
      {
        id: 'leave_requested',
        label: '您提出的要求是什么？',
        type: 'textarea',
        showIf: { questionId: 'requested_leave', value: 'yes' },
      },
      {
        id: 'employer_response',
        label: '雇主是怎么答复的？',
        type: 'textarea',
        showIf: { questionId: 'requested_leave', value: 'yes' },
      },
    ],
  },
]
