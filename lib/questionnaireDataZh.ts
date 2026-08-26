import { QuestionnaireSection } from '@/types'

/**
 * The default onboarding questionnaire in Simplified Chinese.
 *
 * Mirrors lib/questionnaireData.ts question for question: same ids, same types,
 * same option order. Only what the client reads changes. `showIf` is left off
 * here because it is carried by the English file's structure — the values it
 * tests ('yes', 'no', 'not_sure') are stored literals and never translated, so
 * skip logic behaves identically in every language.
 */
export const QUESTIONNAIRE_SECTIONS_ZH: QuestionnaireSection[] = [
  {
    id: 'contact',
    title: '联系信息',
    questions: [
      { id: 'full_name', label: '法定全名', type: 'text', required: true, placeholder: '与您证件上的姓名一致' },
      { id: 'dob', label: '出生日期', type: 'date', required: true },
      { id: 'address', label: '街道地址', type: 'text', required: true },
      { id: 'city_state_zip', label: '城市、州、邮政编码', type: 'text', required: true },
      { id: 'alt_phone', label: '备用电话号码', type: 'phone', placeholder: '(555) 000-0000' },
      { id: 'email', label: '电子邮箱', type: 'text', placeholder: 'you@example.com' },
      { id: 'preferred_language', label: '首选语言', type: 'select', options: ['英语', '西班牙语', '中文', '韩语', '其他'] },
    ],
  },
  {
    id: 'employer',
    title: '雇主信息',
    questions: [
      { id: 'employer_name', label: '雇主 / 公司名称', type: 'text', required: true },
      { id: 'employer_address', label: '雇主街道地址', type: 'text' },
      { id: 'employer_city_state', label: '城市、州', type: 'text' },
      { id: 'supervisor_name', label: '主管 / 经理姓名', type: 'text' },
      { id: 'supervisor_phone', label: '主管电话（如果知道）', type: 'phone', placeholder: '(555) 000-0000' },
      { id: 'hr_contact', label: '人力资源联系人姓名或部门', type: 'text' },
      { id: 'industry', label: '行业 / 业务类型', type: 'text', placeholder: '例如：餐饮、零售、建筑' },
    ],
  },
  {
    id: 'dates_worked',
    title: '工作日期',
    questions: [
      { id: 'start_date', label: '开始工作的日期', type: 'date' },
      { id: 'start_date_unsure', label: '不确定具体的入职日期？', type: 'yes_no' },
      { id: 'start_date_approx', label: '大致的入职日期', type: 'text', placeholder: '例如：“2022年春天”或“2022年3月左右”', showIf: { questionId: 'start_date_unsure', value: 'yes' } },
      { id: 'still_employed', label: '您现在还在那里工作吗？', type: 'yes_no', required: true },
      { id: 'end_date', label: '最后一天上班的日期', type: 'date', showIf: { questionId: 'still_employed', value: 'no' } },
      { id: 'end_date_unsure', label: '不确定具体的最后工作日？', type: 'yes_no', showIf: { questionId: 'still_employed', value: 'no' } },
      { id: 'end_date_approx', label: '大致的最后工作日', type: 'text', placeholder: '例如：“2023年年底”或“2023年11月左右”', showIf: { questionId: 'end_date_unsure', value: 'yes' } },
      { id: 'employment_type', label: '雇佣类型', type: 'select', options: ['全职', '兼职', '季节性', '临时工 / 派遣公司', '合同工', '其他'] },
    ],
  },
  {
    id: 'position',
    title: '职位与工作内容',
    questions: [
      { id: 'job_title', label: '您的职位名称', type: 'text', required: true },
      { id: 'job_duties', label: '请描述您的工作内容', type: 'textarea', required: true, placeholder: '平常一天您都做些什么？' },
      { id: 'classification', label: '您被归类为雇员还是独立承包人？', type: 'select', options: ['雇员', '独立承包人', '不确定'] },
      { id: 'misclassified', label: '您是否认为自己被错误地归类为独立承包人？', type: 'yes_no' },
      { id: 'exempt', label: '公司是否告诉过您，您属于“豁免”或“月薪”员工、无权获得加班费？', type: 'yes_no' },
    ],
  },
  {
    id: 'pay_rate',
    title: '工资标准',
    questions: [
      { id: 'pay_type', label: '公司是怎么给您发工资的？', type: 'select', required: true, options: ['按小时', '固定月薪 / 年薪', '提成', '按件计酬', '按天计酬', '其他'] },
      { id: 'hourly_rate', label: '小时工资（如适用）', type: 'currency', placeholder: '18.00' },
      { id: 'salary_amount', label: '固定薪资金额（如适用）', type: 'text', placeholder: '例如：每年 $60,000' },
      { id: 'received_tips', label: '您有收到小费吗？', type: 'yes_no' },
      { id: 'pay_changed', label: '在职期间您的工资标准有变动过吗？', type: 'yes_no' },
      { id: 'pay_change_notes', label: '请说明工资的变动情况', type: 'textarea', showIf: { questionId: 'pay_changed', value: 'yes' } },
    ],
  },
  {
    id: 'schedule',
    title: '工作班次',
    questions: [
      { id: 'days_per_week', label: '您通常每周工作几天？', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7'] },
      { id: 'hours_per_day', label: '您通常每天工作几小时？', type: 'text', placeholder: '例如：每天 9 小时' },
      { id: 'schedule_type', label: '您的班次是什么样的？', type: 'select', options: ['固定（每周同样的日子和时间）', '轮班', '随叫随到', '不规律 / 变动', '其他'] },
      { id: 'schedule_notes', label: '请描述您平常的工作班次', type: 'textarea', placeholder: '例如：周一至周五，早上 7 点到下午 4 点' },
    ],
  },
  {
    id: 'timekeeping',
    title: '工时记录方式',
    questions: [
      { id: 'timekeeping_method', label: '雇主是如何记录您的工作时间的？', type: 'select', options: ['打卡机 / 刷卡', '生物识别（指纹 / 人脸）', '纸质工时表', '电子工时表 / 应用程序', '由经理代为记录', '没有正式记录', '其他'] },
      { id: 'clock_in_out', label: '上下班的卡是您本人打的吗？', type: 'yes_no' },
      { id: 'employer_altered', label: '雇主是否曾修改、更动或删除您的工时记录？', type: 'yes_no' },
      { id: 'alteration_details', label: '请描述您的工时记录发生了什么', type: 'textarea', showIf: { questionId: 'employer_altered', value: 'yes' } },
    ],
  },
  {
    id: 'meal_breaks',
    title: '用餐休息',
    questions: [
      { id: 'meal_break_provided', label: '公司是否让您享有完整、不受打扰的 30 分钟用餐休息？', type: 'yes_no', required: true },
      { id: 'meal_break_5hrs', label: '当您工作超过 5 小时时，公司是否提供用餐休息？', type: 'yes_no' },
      { id: 'meal_break_10hrs', label: '当您工作超过 10 小时时，公司是否提供第二次用餐休息？', type: 'yes_no' },
      { id: 'meal_break_interrupted', label: '您的用餐休息是否曾被工作打断或缩短？', type: 'yes_no' },
      { id: 'meal_break_pressure', label: '您是否曾被施压、被要求或被默认应当放弃用餐休息？', type: 'yes_no' },
      { id: 'meal_premium_paid', label: '对于错过或延后的用餐休息，公司是否支付过一小时的额外补偿金（“premium pay”）？', type: 'yes_no' },
    ],
  },
  {
    id: 'rest_breaks',
    title: '工间休息',
    questions: [
      { id: 'rest_break_provided', label: '公司是否提供带薪的 10 分钟工间休息？', type: 'yes_no', required: true },
      { id: 'rest_break_frequency', label: '大约每工作 4 小时，公司是否给一次工间休息？', type: 'yes_no' },
      { id: 'rest_break_skipped', label: '您是否经常没有休息就继续工作？', type: 'yes_no' },
      { id: 'rest_break_pressure', label: '您是否曾被施压或被默认应当放弃工间休息？', type: 'yes_no' },
      { id: 'rest_premium_paid', label: '对于错过的工间休息，公司是否支付过一小时的额外补偿金？', type: 'yes_no' },
    ],
  },
  {
    id: 'overtime',
    title: '加班',
    questions: [
      { id: 'worked_over_8', label: '您是否经常一天工作超过 8 小时？', type: 'yes_no' },
      { id: 'worked_over_12', label: '您是否经常一天工作超过 12 小时？', type: 'yes_no' },
      { id: 'worked_over_40', label: '您是否经常一周工作超过 40 小时？', type: 'yes_no' },
      { id: 'paid_overtime', label: '加班时数公司是否按 1.5 倍工资支付？', type: 'yes_no' },
      { id: 'paid_double_time', label: '一天超过 12 小时的部分，公司是否按 2 倍工资支付？', type: 'yes_no' },
      { id: 'overtime_notes', label: '关于加班或工作时数，还有其他要补充的吗？', type: 'textarea' },
    ],
  },
  {
    id: 'final_wages',
    title: '最后工资',
    questions: [
      { id: 'separation_type', label: '您的雇佣关系是怎么结束的（或仍在继续）？', type: 'select', options: ['仍在职', '我被解雇 / 被开除', '我主动辞职', '被裁员', '合同到期', '其他'] },
      { id: 'final_wages_timely', label: '如果已离职，最后一笔工资是否在最后上班日当天付清？', type: 'yes_no' },
      { id: 'final_wages_date', label: '最后一笔工资是什么时候付的？（如果知道）', type: 'date' },
      { id: 'wages_still_owed', label: '您是否认为公司仍欠您未付的工资？', type: 'yes_no' },
      { id: 'wages_owed_estimate', label: '仍被拖欠的估计金额（如果知道）', type: 'text', placeholder: '例如：大约 $3,500', showIf: { questionId: 'wages_still_owed', value: 'yes' } },
    ],
  },
  {
    id: 'wage_statements',
    title: '工资单',
    questions: [
      { id: 'received_paystubs', label: '每个发薪周期您都有收到工资单吗？', type: 'yes_no' },
      { id: 'paystubs_accurate', label: '工资单上的工时和工资准确吗？', type: 'yes_no' },
      { id: 'paystub_issues', label: '您的工资单上缺少或写错了哪些信息？（可多选）', type: 'multiselect', options: ['雇主名称 / 地址', '员工姓名或工号', '税前工资总额', '税后实发工资', '工作总时数', '小时工资标准', '各项扣款明细', '发薪周期起止日期', '没有缺漏 / 不适用'] },
      { id: 'have_paystubs', label: '您现在还留着工资单吗？', type: 'yes_no' },
    ],
  },
  {
    id: 'reimbursements',
    title: '费用报销 / 工具 / 制服',
    questions: [
      { id: 'paid_for_tools', label: '工作所需的工具、设备或用品，您有自掏腰包购买过吗？', type: 'yes_no' },
      { id: 'tools_reimbursed', label: '这些费用公司报销了吗？', type: 'yes_no', showIf: { questionId: 'paid_for_tools', value: 'yes' } },
      { id: 'uniform_required', label: '公司是否要求您穿特定的制服？', type: 'yes_no' },
      { id: 'uniform_paid_by_you', label: '制服是您自己出钱买的吗？', type: 'yes_no', showIf: { questionId: 'uniform_required', value: 'yes' } },
      { id: 'drove_for_work', label: '您有为了工作使用自己的车吗？', type: 'yes_no' },
      { id: 'mileage_reimbursed', label: '公司有报销您的里程费吗？', type: 'yes_no', showIf: { questionId: 'drove_for_work', value: 'yes' } },
      { id: 'other_expenses', label: '请描述其他自掏腰包的公务开销', type: 'textarea' },
    ],
  },
  {
    id: 'wrongful_termination',
    title: '非法解雇',
    showIf: { questionId: 'still_employed', value: 'no' },
    questions: [
      { id: 'was_terminated', label: '您是被解雇，还是被迫辞职？', type: 'yes_no' },
      { id: 'reason_given_for_termination', label: '公司给您的解雇理由是什么？', type: 'textarea', showIf: { questionId: 'was_terminated', value: 'yes' } },
      { id: 'believe_wrongful', label: '您是否认为这次解雇属于不当或违法解雇？', type: 'yes_no_unsure' },
      { id: 'wrongful_reason_belief', label: '您为什么认为这次解雇是违法的？', type: 'textarea', showIf: { questionId: 'believe_wrongful', value: 'yes' } },
      { id: 'wrongful_not_sure_details', label: '是什么让您拿不准？请提供任何有助于我们判断的细节。', type: 'textarea', showIf: { questionId: 'believe_wrongful', value: 'not_sure' } },
      { id: 'received_written_warnings', label: '被解雇之前，您有收到过书面警告或处分记录吗？', type: 'yes_no' },
    ],
  },
  {
    id: 'retaliation',
    title: '报复行为',
    questions: [
      { id: 'made_complaint', label: '您是否举报过违规、提出过投诉，或对您认为违法或不当的事情提出过异议？', type: 'yes_no' },
      { id: 'complaint_subject', label: '您举报或投诉的是什么事？', type: 'textarea', showIf: { questionId: 'made_complaint', value: 'yes' } },
      { id: 'negative_after_complaint', label: '投诉之后，您有没有遭遇任何不利对待？', type: 'yes_no' },
      { id: 'retaliation_description', label: '请描述发生了哪些不利对待', type: 'textarea', showIf: { questionId: 'negative_after_complaint', value: 'yes' } },
    ],
  },
  {
    id: 'disability_leave',
    title: '残疾 / 病假 / 怀孕',
    questions: [
      { id: 'involves_disability', label: '您的情况是否涉及残疾、身体状况、病假或怀孕？', type: 'yes_no', required: true },
      { id: 'took_medical_leave', label: '您是否曾请过病假或伤残假？', type: 'yes_no', showIf: { questionId: 'involves_disability', value: 'yes' } },
      { id: 'leave_approved', label: '您的请假雇主批准了吗？', type: 'yes_no', showIf: { questionId: 'took_medical_leave', value: 'yes' } },
      { id: 'leave_denied_retaliated', label: '您是否被拒绝请假，或因为请假而受到处罚？', type: 'yes_no', showIf: { questionId: 'took_medical_leave', value: 'yes' } },
      { id: 'requested_accommodation', label: '您是否曾就残疾提出过工作上的便利安排请求？', type: 'yes_no', showIf: { questionId: 'involves_disability', value: 'yes' } },
      { id: 'accommodation_denied', label: '您的便利安排请求是否被拒绝或被置之不理？', type: 'yes_no', showIf: { questionId: 'requested_accommodation', value: 'yes' } },
      { id: 'was_pregnant', label: '在职期间您怀孕过吗？', type: 'yes_no', showIf: { questionId: 'involves_disability', value: 'yes' } },
      { id: 'pregnancy_different_treatment', label: '您是否因为怀孕而受到不同的对待？', type: 'yes_no', showIf: { questionId: 'was_pregnant', value: 'yes' } },
    ],
  },
  {
    id: 'harassment',
    title: '骚扰 / 歧视',
    questions: [
      { id: 'experienced_harassment', label: '您在工作场所是否遭遇过骚扰或歧视？', type: 'yes_no' },
      { id: 'harassment_type', label: '属于哪种骚扰或歧视？（可多选）', type: 'multiselect', options: ['种族 / 肤色', '国籍 / 祖籍', '性别', '性骚扰', '怀孕', '年龄（40 岁及以上）', '身体或精神残疾', '宗教', '性取向', '性别认同 / 性别表达', '现役或退伍军人身份', '其他'], showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'harassment_description', label: '请描述发生了什么，如果记得请写上日期', type: 'textarea', showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'reported_to_employer', label: '您有把骚扰或歧视报告给雇主或人力资源部门吗？', type: 'yes_no', showIf: { questionId: 'experienced_harassment', value: 'yes' } },
      { id: 'employer_response', label: '雇主对您的报告是如何处理的？', type: 'textarea', showIf: { questionId: 'reported_to_employer', value: 'yes' } },
    ],
  },
  {
    id: 'witnesses',
    title: '证人',
    questions: [
      { id: 'has_witnesses', label: '有没有人亲眼看到事情经过、可以为您作证？', type: 'yes_no' },
      { id: 'witness_list', label: '请列出证人及联系方式（如果知道）', type: 'textarea', helpText: '请写上姓名、与您的关系，以及他们看到了什么。不必全部都知道。', showIf: { questionId: 'has_witnesses', value: 'yes' } },
      { id: 'coworkers_same_issues', label: '其他同事是否遇到过相同或类似的问题？', type: 'yes_no' },
      { id: 'coworkers_details', label: '请说明您所知道的其他同事的遭遇', type: 'textarea', showIf: { questionId: 'coworkers_same_issues', value: 'yes' } },
    ],
  },
  {
    id: 'documents_available',
    title: '您持有的文件',
    questions: [
      { id: 'available_documents', label: '以下文件您目前手上有哪些？（可多选）', type: 'multiselect', options: ['工资单', 'W-2 表格', '1099 表格', '工时记录 / 工时表', '排班表', '短信', '电子邮件', '解雇通知书', '医生证明 / 医疗记录', '照片或视频', '公司员工手册或规章', '劳动合同或录用信', '绩效考核', '警告信 / 处分记录', '其他文件'] },
      { id: 'documents_notes', label: '关于这些文件还有什么要说明的吗？', type: 'textarea', helpText: '例如：“我有 2024 年 1 月到 12 月的工资单，之前的没有。”' },
    ],
  },
  {
    id: 'additional',
    title: '补充信息',
    questions: [
      { id: 'prior_agency_complaints', label: '您是否曾向政府机构提出过投诉（例如 DLSE、DFEH/CRD、EEOC、劳工专员办公室）？', type: 'yes_no' },
      { id: 'agency_complaint_details', label: '请说明投诉内容、受理机构名称，以及结果（如果知道）', type: 'textarea', showIf: { questionId: 'prior_agency_complaints', value: 'yes' } },
      { id: 'prior_attorneys', label: '关于这件事，您是否咨询或聘请过其他律师？', type: 'yes_no' },
      { id: 'statute_of_limitations', label: '您是否知道自己的索赔有临近的期限？', type: 'yes_no' },
      { id: 'additional_notes', label: '关于您的情况，还有什么想让我们知道的吗？', type: 'textarea', helpText: '任何可能对案件重要的信息都欢迎提供。没有所谓答错。', placeholder: '您认为重要的其他细节…' },
    ],
  },
]
