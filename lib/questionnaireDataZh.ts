import { QuestionnaireSection } from '@/types'

/**
 * The intake questionnaire in Chinese — Module 1.
 *
 * Only what the client reads lives here: the section title, the question label,
 * the help text, the placeholder, and the words shown for each answer choice.
 * Ids, types, required flags, option VALUES and skip logic all come from
 * lib/questionnaireData.ts and are merged over this file at read time by
 * questionnaireSections(); see the note there for why the structure is owned in
 * one place. A question missing from this file falls back to English rather
 * than disappearing.
 */
export const QUESTIONNAIRE_SECTIONS_ZH: QuestionnaireSection[] = [
  {
    id: "contact",
    title: "您的联系方式",
    questions: [
      { id: "full_name", label: "您的法定全名是什么？", type: "text", placeholder: "请按证件上的写法填写" },
      { id: "used_other_name", label: "在这份工作期间，您是否使用过其他名字？", type: "yes_no" },
      { id: "other_names", label: "您使用过的其他名字是什么？（可填写多个）", type: "text" },
      { id: "dob", label: "您的出生日期是？", type: "date" },
      { id: "address", label: "您的街道地址是？", type: "text" },
      { id: "city_state_zip", label: "您居住的城市、州和邮政编码（ZIP Code）是？", type: "text" },
      { id: "contact_phones", label: "我们可以打哪个电话号码联系您？您还有另一个电话号码吗？", type: "text", helpText: "请把最方便联系到您的号码写在前面。如果还有第二个号码，请写在后面。", placeholder: "(310) 555-0000，另一个是 (310) 555-0001" },
      { id: "email", label: "您的电子邮箱地址是？", type: "text", placeholder: "you@example.com" },
      { id: "preferred_language", label: "您希望我们用哪种语言与您沟通？", type: "select", options: ["英语", "西班牙语", "中文", "韩语", "其他"] },
    ],
  },
  {
    id: "employer",
    title: "雇主信息",
    questions: [
      { id: "employer_name", label: "雇主或公司的名称是什么？", type: "text", helpText: "如果知道，请填写工资单或支票上的名称。" },
      { id: "employer_address", label: "雇主的详细地址（街道地址）是什么？", type: "text", helpText: "如果不清楚，填写" },
      { id: "employer_city_state", label: "您工作的城市和州是哪里？", type: "text" },
      { id: "supervisor_name", label: "您主要的主管或经理叫什么名字？", type: "text", helpText: "如果不清楚，填写" },
      { id: "supervisor_phone", label: "这位主管的电话号码是什么？", type: "text", helpText: "如果不清楚，填写", placeholder: "(310) 555-0000" },
      { id: "hr_contact", label: "您的人事（HR）联系人是谁？或者人事部门叫什么名称？", type: "text", helpText: "如果公司没有人事部门，填写" },
      { id: "industry", label: "这家公司属于哪一类行业？", type: "text", placeholder: "例如：餐馆、仓库、建筑、零售或办公室" },
    ],
  },
  {
    id: "dates_worked",
    title: "您在那里工作的时间",
    questions: [
      { id: "start_date_known", label: "您知道自己开始在那里工作的确切日期吗？", type: "select", options: ["知道", "不知道", "我不确定"] },
      { id: "start_date", label: "您是什么时候开始在那里工作的？可以填写确切日期、您认为最接近的时间，或者一个时间范围。", type: "text", helpText: "可以是具体某一天、某年某月、某个季节，或者一段时间——填“2022年春季”或“2022年3月到5月”都可以。" },
      { id: "still_employed", label: "您现在还在那里工作吗？", type: "yes_no" },
      { id: "end_date_known", label: "您知道自己最后一天上班的确切日期吗？", type: "select", options: ["知道", "不知道", "我不确定"] },
      { id: "end_date", label: "您最后一天上班是哪一天？可以填写确切日期、您认为最接近的时间，或者一个时间范围。", type: "text", helpText: "可以是具体某一天、某年某月、某个季节，或者一段时间——填“2023年年底”或“2023年11月或12月”都可以。" },
      { id: "job_type", label: "这份工作属于哪种类型？", type: "select", options: ["全职", "兼职（非全职）", "临时工", "季节性工作", "随叫随到（待召）", "其他", "“我不知道”"] },
    ],
  },
  {
    id: "position",
    title: "您的工作与职责",
    questions: [
      { id: "job_title", label: "您的职位名称是什么？", type: "text" },
      { id: "job_duties", label: "您平时做哪些工作？", type: "textarea", placeholder: "请列出您的主要工作职责。" },
      { id: "contractor_or_employee", label: "公司把您称作雇员（员工），还是独立承包人（独立合同工）？", type: "select", options: ["雇员（员工）", "独立承包人（独立合同工）", "不同时期两种都有", "\"我不知道\""] },
      { id: "contractor_wrong", label: "如果公司把您称作独立承包人，您认为这样的认定是错误的吗？", type: "select", options: ["是", "不是", "我不确定"] },
      { id: "called_exempt", label: "公司是否说您属于\"豁免\"（exempt）或\"拿固定薪水\"（salaried）人员，因此不会给您加班费？", type: "select", options: ["是", "不是", "\"我不知道\""] },
    ],
  },
  {
    id: "pay_rate",
    title: "您的工资是怎么发放的",
    questions: [
      { id: "pay_calculated", label: "您的工资是怎么计算的？", type: "multiselect", options: ["按小时计算", "按固定薪水（月薪、年薪等）", "按天计算", "按件计算", "按提成（佣金）", "其他", "我不知道"], helpText: "请选出所有符合您情况的选项。" },
      { id: "hourly_rate", label: "您的时薪是多少？", type: "text", helpText: "请填写具体金额；如果不清楚，就写\"我不知道\"。", placeholder: "18.00" },
      { id: "salary_amount", label: "您的固定薪水是多少？", type: "text", helpText: "请写金额和发放的频率（多久发一次）；如果不清楚，就写\"我不知道\"。", placeholder: "$60,000 per year" },
      { id: "other_pay_rates", label: "还有哪些其他的计酬标准？", type: "text", helpText: "请把每一项日薪、计件价格或提成比例都写出来。" },
      { id: "pay_received_how", label: "您是通过什么方式拿到工资的？", type: "multiselect", options: ["现金", "纸质支票", "银行转账（直接存入账户）", "工资卡", "其他"], helpText: "请选出所有符合您情况的选项。" },
      { id: "tips_received", label: "您有收到小费吗？", type: "select", options: ["有", "没有", "有时候有"] },
      { id: "pay_rate_changed", label: "在那里工作期间，您的工资标准有变动过吗？", type: "select", options: ["有", "没有", "我不知道"] },
      { id: "pay_change_notes", label: "具体变了什么？每次变动大概是什么时候？", type: "textarea", helpText: "每次变动写一行。" },
    ],
  },
  {
    id: "schedule",
    title: "您平时的工作时间安排",
    questions: [
      { id: "days_per_week_usual", label: "您平时每周大约工作几天？", type: "text", helpText: "可以写一个数字、一个范围、\"不固定\"，或者\"我不知道\"。" },
      { id: "hours_per_day", label: "您平时每天大约工作几个小时？", type: "text", helpText: "可以写一个数字、一个范围、\"不固定\"，或者\"我不知道\"。" },
      { id: "weekly_schedule", label: "您平时在哪几天上班？平时的上班和下班时间是几点？", type: "textarea", helpText: "每天写一行。如果那天不上班，就留空。", placeholder: "星期一：7:00am 到 4:00pm\n星期二：7:00am 到 4:00pm\n星期三：\n星期四：\n星期五：\n星期六：\n星期日：" },
      { id: "schedule_chosen_by", label: "是谁决定您上班的日子和时间？", type: "multiselect", options: ["老板或业主", "经理或组长", "办公室人员或排班人员", "手机应用或系统", "客户或工地", "不止一个人或不止一种方式", "其他", "我不知道"], helpText: "符合的都可以选。" },
      { id: "schedule_delivered_how", label: "您是怎么知道自己的排班的？", type: "multiselect", options: ["工作场所贴出的纸质排班表", "手机应用或网站", "短信", "电子邮件", "群聊", "电话", "当面口头告知", "一直不变", "其他", "我不知道"], helpText: "符合的都可以选。" },
      { id: "schedule_changed", label: "在您拿到排班之后，排班有没有被改动过？", type: "select", options: ["有", "没有", "有时候会", "我不知道"] },
      { id: "schedule_change_asks", label: "公司有没有要求或叫您做过以下这些事？", type: "multiselect", options: ["在休息日来上班", "提前来上班", "留下来加班", "换到别的日子上班", "换成别的时间上班或下班", "提前回家", "打电话来问自己那天要不要上班", "随时待命（on-call）", "其他"], helpText: "符合的都可以选。" },
    ],
  },
  {
    id: "timekeeping",
    title: "您的工作时间是如何记录的",
    questions: [
      { id: "time_recorded_how", label: "雇主用什么方式记录您的工作时间？", type: "multiselect", options: ["打卡钟（纸质考勤卡）", "刷卡或感应卡", "输入代码或按按钮", "指纹、手掌或人脸识别", "手机或平板应用程序", "工作电脑或网站", "收银机", "纸质记录", "口头告知或发短信给某人", "由老板或同事代为输入", "没有记录工时", "其他", "我不知道"], helpText: "请选出所有符合的情况。" },
      { id: "entered_own_start", label: "大多数工作日，上班时间是您自己输入的吗？", type: "select", options: ["是", "否", "有时是", "没有记录上班时间", "我不知道"] },
      { id: "start_entered_how", label: "您用什么方式输入上班时间？", type: "select", options: ["打卡钟（纸质考勤卡）", "刷卡或感应卡", "输入代码或按按钮", "指纹、手掌或人脸识别", "手机或平板应用程序", "工作电脑或网站", "收银机", "纸质记录", "口头告知或发短信给某人", "不止一种方式", "其他", "我不知道"] },
      { id: "start_entered_where", label: "您在哪里输入上班时间？", type: "select", options: ["大门口", "工作区域", "办公室或休息室", "收银台", "工作电脑", "公司的手机或平板", "我自己的手机", "公司车辆或工地", "不止一个地点", "其他", "我不知道"] },
      { id: "timekeeping_system_name", label: "这台打卡机、应用程序、网站或系统叫什么名字？", type: "text", helpText: "回答\"我从没见过名字\"或\"我不知道\"都可以。" },
      { id: "start_entered_by_other", label: "如果不是您自己输入上班时间，那是谁输入的？", type: "select", options: ["老板或雇主本人", "经理或组长", "同事", "办公室人员或工资发放人员", "系统自动记录", "按排班表的时间填写", "不止一个人或不止一种方式", "没有人", "我不知道"] },
      { id: "entered_own_end", label: "大多数工作日，下班时间是您自己输入的吗？", type: "select", options: ["是", "否", "有时是", "没有记录下班时间", "我不知道"] },
      { id: "end_entered_same_way", label: "您输入下班时间的方式和输入上班时间的方式一样吗？", type: "select", options: ["一样", "不一样", "有时一样", "我不知道"] },
      { id: "end_entered_differently", label: "如果下班时间的输入方式不同，是怎么输入的？", type: "text" },
      { id: "end_entered_by_other", label: "如果不是您自己输入下班时间，那是谁输入的？", type: "select", options: ["老板或雇主本人", "经理或组长", "同事", "办公室人员或工资发放人员", "系统自动记录", "按排班表的时间填写", "不止一个人或不止一种方式", "没有人", "我不知道"] },
      { id: "timekeeping_changed", label: "在这份工作期间，记录工时的方式有没有改变过？", type: "select", options: ["没有", "有，随着时间推移改变过", "有，不同工作日或不同地点方式不同", "两种情况都有", "我不知道"] },
      { id: "timekeeping_change_details", label: "改变了什么？大约在什么时候？", type: "textarea", helpText: "每一次实际发生的改变请单独写一行。" },
      { id: "records_altered", label: "雇主有没有修改、更改或删除过您的工时记录？", type: "select", options: ["有", "没有", "有时有", "我不知道"] },
      { id: "alteration_details", label: "您的工时记录发生了什么情况？", type: "textarea", helpText: "请说明是谁改的、改了什么，以及大约在什么时候。" },
    ],
  },
  {
    id: "time_check",
    title: "核对上班和下班时间",
    questions: [
      { id: "start_times_meaning", label: "您填写的上班时间，是您开始做第一项工作的时间吗？", type: "select", options: ["是", "不是，那是我打卡上班的时间", "不是，那是排班表上的时间", "不是，那是我到达的时间", "每天情况不一样", "我不知道"] },
      { id: "work_before_start", label: "在您填写的上班时间之前，您有做过任何工作吗？", type: "select", options: ["有", "没有", "有时候有", "我不知道"] },
      { id: "work_before_start_what", label: "在那些上班时间之前，您做了哪些工作？", type: "textarea", placeholder: "请说明。" },
      { id: "work_before_start_minutes", label: "您在哪几天做了这些工作？每天大约做了多少分钟？", type: "textarea", helpText: "每天写一行。如果那天没有发生，就留空。", placeholder: "星期一：20 分钟\n星期二：15 分钟\n星期三：\n星期四：\n星期五：\n星期六：\n星期日：" },
      { id: "end_times_meaning", label: "您填写的下班时间，是您做完最后一项工作的时间吗？", type: "select", options: ["是", "不是，那是我打卡下班的时间", "不是，那是排班表上的时间", "不是，那是我离开的时间", "每天情况不一样", "我不知道"] },
      { id: "work_after_end", label: "在您填写的下班时间之后，您有做过任何工作吗？", type: "select", options: ["有", "没有", "有时候有", "我不知道"] },
      { id: "work_after_end_what", label: "在那些下班时间之后，您做了什么？", type: "multiselect", options: ["打扫或收工关店", "锁门或关闭设备", "数钱或结算收银机", "处理完文件或信息", "收好工具、钥匙、食物或用品", "等主管检查工作", "接受包裹检查或安全检查", "等着和大家一起离开", "帮助顾客或同事", "为工作开车或外出", "其他", "我不知道"], helpText: "符合的都请选上。" },
      { id: "work_after_end_minutes", label: "您在哪几天做了这些工作？每天大约做了多少分钟？", type: "textarea", helpText: "每天写一行。如果那天没有发生，就留空。", placeholder: "星期一：20 分钟\n星期二：15 分钟\n星期三：\n星期四：\n星期五：\n星期六：\n星期日：" },
      { id: "split_shift", label: "有没有哪一天，您离开工作后又回来上班，或者分成两段班次工作？", type: "select", options: ["有", "没有", "我不知道"] },
      { id: "split_shift_details", label: "是哪一天？每一段工作的开始和结束时间分别是几点？", type: "textarea", helpText: "每一天写一行。" },
    ],
  },
  {
    id: "final_wages",
    title: "最后一次工资结算",
    questions: [
      { id: "employment_ended_how", label: "您的工作是怎样结束的？", type: "select", options: ["被解雇", "被裁员", "自己辞职", "被迫辞职", "工作或派遣任务到期结束", "其他"] },
      { id: "final_wages_on_last_day", label: "您最后一天上班时，公司有没有把最后一次工资付清？", type: "select", options: ["有", "没有", "我不知道"] },
      { id: "final_wages_paid_when", label: "您的最后一次工资是什么时候拿到的？", type: "text", helpText: "可以写具体日期、大概时间，或者写\"我还没有收到\"。" },
      { id: "wages_owed", label: "您认为公司现在还欠着您没付的工资吗？", type: "select", options: ["是", "不是", "我不确定"] },
      { id: "wages_owed_estimate", label: "您认为大概还有多少工资没付？", type: "text", helpText: "可以写具体金额、大概数目，或者写\"我不知道\"。", placeholder: "大约 $3,500" },
    ],
  },
  {
    id: "wrongful_termination",
    title: "非法解雇",
    questions: [
      { id: "fired_or_forced", label: "您是被解雇，还是被迫辞职的？", type: "select", options: ["是", "不是", "我不确定"] },
      { id: "reason_given_for_termination", label: "雇主给出的解除您工作的理由是什么？", type: "text", helpText: "如果雇主没有说明理由，填写\"没有给出任何理由\"也可以。" },
      { id: "ended_unlawfully", label: "您认为雇主结束您的工作是出于违法的理由吗？", type: "select", options: ["是", "不是", "我不确定"] },
      { id: "wrongful_reason_belief", label: "您为什么认为这个理由是违法的？", type: "text" },
      { id: "wrongful_not_sure_details", label: "如果您不确定，是哪些情况让您对工作结束的原因产生怀疑？", type: "text" },
      { id: "written_warnings", label: "在您的工作结束之前，您是否收到过任何书面警告或书面处分记录？", type: "select", options: ["是", "没有", "我不知道"] },
    ],
  },
]
