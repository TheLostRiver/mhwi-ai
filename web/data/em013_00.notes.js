/*
 * 黑龙 (em013_00) 概览与资料对照文本。
 * 标记: [[file.node_xxx]] 代码链接；{{sim:查询串|文字}} 模拟器链接；**强调**
 * 所有概率均由 scripts/sim.js / 网页模拟器对 THK 全路径枚举得到。
 */
MHWI.notes = MHWI.notes || {};
MHWI.notes.em013_00 = {
  lede:
    "黑龙的战斗 AI 由 14 个 THK 组成，核心只有两个：**Combat_Main（00）**负责每一轮「先做各种检查、再按 姿态×阶段×距离 查表选招」，" +
    "**Global（55）**是 142 个招式子程序。每选完一招就 reset 回到 [[em013_00.node_000]] 重新判定；" +
    "**距离决定用哪张表，角度只在表内挪动约 25~30% 的权重**，计数器（寄存器）控制转姿态、起飞降落与防连发。",

  phaseMarks: [
    { hp: 77, label: "1→2", note: "一阶段 HP≤77% 转二阶段（node_014）" },
    { hp: 49, label: "2→3", note: "二阶段 HP≤49% 转三阶段（node_014）" },
    { hp: 40, label: "大招", note: "三阶段 HP≤40% 终极形态大招（node_017，R7）" },
    { hp: 25, label: "大招", note: "三阶段 HP≤25%（R8）" },
    { hp: 5, label: "大招", note: "三阶段 HP≤5%（R9）" },
  ],
  phaseLabels: [
    { at: 11.5, zh: "一阶段" },
    { at: 37, zh: "二阶段" },
    { at: 85, zh: "三阶段" },
  ],

  flow: [
    { title: "清零骑乘计数", ref: ["em013_55", "node_142"], note: "R12 归零" },
    { title: "丢失目标 / 烟雾弹", ref: ["em013_00", "node_001"], note: "5D() 为真时重新选目标；否则 35%/65% 两种目标选择方式" },
    { title: "10A 特殊攻击（三阶段）", ref: ["em013_00", "node_027"], note: "10A() 从未在实战中出现（xlsx 推测与击龙枪有关）" },
    { title: "一二阶段血量检测", ref: ["em013_00", "node_014"], note: "HP≤77% → 1转2；HP≤49% → 2转3，然后 reset" },
    { title: "三阶段血量检测", ref: ["em013_00", "node_017"], note: "HP≤40/25/5% 各触发一次终极形态大招" },
    { title: "起飞 / 降落计数", ref: ["em013_00", "node_002"], note: "双翼都破坏：飞行中立即降落、地面不再累计起飞计数" },
    { title: "一阶段瓦砾", ref: ["em013_00", "node_035"], note: "目标在瓦砾区 102(3)：远则车，再出火球类" },
    { title: "目标类型 / 钩爪", ref: ["em013_55", "node_004"], note: "钩爪挂在身上 target(55) → 反钩爪 AI，然后 reset" },
    { title: "飞行攻击 AI", ref: ["em013_00", "node_008"], note: "飞行中：按 1000 / 5000 距离分表" },
    { title: "地面攻击 AI", ref: ["em013_00", "node_009"], note: "高台 → 112 → 110(2) → **转姿态计数** → 一阶段额外车 → 2D(1) → 5% 捕食 → 遮挡 → 对空 → **主攻击表** → 受击追加" },
    { title: "reset，下一轮从头判定", terminal: true, note: "连段（地毯→扇火、受击追加等）发生在攻击节点内部，所以**连段之间不会再做烟雾/血量/钩爪/高台检测**" },
  ],

  findings: [
    {
      title: "开局不扇火：不是 15~18 秒，而是前 5 次 AI 出招",
      body: "反编译游戏 exe 得到 10E() 的真实逻辑：**开局计数 < 5**。阈值 5 写在 em013.dtt_unq 调参表里（代码默认 3）。黑龙每切换到一个 AI 选择的新动作，计数 +1（转身、后退也算）；**二足咆哮**和动作自身衔接的后续段（如车的起手→冲刺→收招）不计。每次发现目标进入战斗时清零，所以丢失目标后重新发现，会再次获得 5 次开局保护。社区说的 15~18 秒，正好是 5 招左右的时长。",
    },
    {
      title: "扇火有三个入口",
      body: "① 主表直接扇火（[[em013_55.node_081]]，一阶段头前 20%）；② 连段：正面地毯**必接**扇火（[[em013_55.node_087]]），大拍/吐痰/孕吐 **35%** 接扇火，但都要求目标在**前方 180° 且距离 >800**；③ 受击追加。开局 10E() 期间所有扇火节点改为随机招。{{sim:ph=1&st=l2&d=1500&a=0&hp=100&heat=l2_special_wide_range_fire_shoot&rng=3500|看扇火热力图}}",
    },
    {
      title: "一阶段转四足是 10%，不是 15%",
      body: "二足计数 R0 ≥7 后每轮 **10%** 趴下（1000 内为下压），≥15 必定（[[em013_00.node_012]]）。二三阶段 ≥7 直接必转（[[em013_00.node_013]]）。B 站文章正文写的 15% 与代码不符，xlsx 的 10% 正确。",
    },
    {
      title: "一阶段从不吐痰",
      body: "一阶段二足主表里吐痰（[[em013_55.node_062]]）的权重全部是 **0**；二阶段起吐痰最高可达 **50%**，并由 R10 保证不会连续两次吐痰。{{sim:ph=2&st=l2&d=700&a=0&hp=60&heat=l2_quick_breath&rng=3500|看二阶段吐痰分布}}",
    },
    {
      title: "四足贴脸时可能只后退、不攻击",
      body: "一阶段四足 ≤500 的正面/背后表有 **10%** 直接调用无条件后退 [[em013_55.node_059]]，这一轮就以后退结束。与 B 站第五章「转身和后退不会成为一轮的结尾」的说法不同。{{sim:ph=1&st=l4&d=300&a=0&hp=100&rng=2000|复现}}",
    },
    {
      title: "起飞 / 降落节奏",
      body: "二阶段起地面每轮 R3+1：35~49 每轮 10% 起飞，50 必飞（1500 内为后仰跳投）。飞行每轮 R4+1：≥3 后每轮 15% 降落，≥7 必降；所有降落/俯冲都会清零 R4（[[em013_00.node_003]]）。",
    },
    {
      title: "三阶段：5% 捕食把一切 ×0.95",
      body: "三阶段二足在 3500 内每轮先做 5% 捕食判定（[[em013_00.node_016]]），所以三阶段二足所有招式概率都是二阶段同表的 0.95 倍（例如头前扇火 30% → 28.5%）。360° 喷火只在三阶段四足出现（胸侧最高 40%）。",
    },
    {
      title: "受击追加：一阶段也有",
      body: "目标处于受击硬直 helpless_0() 时，本轮结束前再 **50%** 追加一次攻击（[[em013_00.node_109]]），这个判断排在阶段判断之前，所以三个阶段都生效。追加表里大拍/吐痰/孕吐仍带 35% 接扇火。",
    },
    {
      title: "高台横扫火的「7 招必出」是死代码",
      body: "[[em013_00.node_046]] 先判 R6≥3 再判 R6≥7，≥7 分支永远不会执行。真实逻辑：前 3 次高台攻击不出横扫火，之后每次 20% 横扫火并清零。",
    },
    {
      title: "任务 51612「黑龙」有专属 AI",
      body: "解包任务文本确认 51612 是「黑龙 · 讨伐黑龙（5 次力尽）」。该任务进入战斗时会用开场招式 [[em013_55.node_139]]，一阶段姿态计数走 [[em013_00.node_011]]（多一个 108() 检查）。",
    },
    {
      title: "遮挡会把远距离变成车",
      body: "10D()（与目标之间有遮挡）为真、二足 900~6000 或四足 1500~6000 时，进入遮挡 AI 并 reset（[[em013_00.node_038]]），大概率出车。",
    },
  ],

  sources: [
    { claim: "一阶段二足 7 招后有 15% 概率转四足", source: "B站", verdict: "diff", detail: "代码是 random(10)：≥7 后每轮 10%，≥15 必转 [[em013_00.node_012]]" },
    { claim: "一阶段 7 招后 10% 转状态，15 招必转；二三阶段 7 招必转", source: "xlsx", verdict: "ok", detail: "[[em013_00.node_012]] [[em013_00.node_013]]" },
    { claim: "二三阶段二足 7 招必转：1000 内 65% 下压 / 35% 孕吐，否则车", source: "B站", verdict: "ok", detail: "[[em013_00.node_013]]" },
    { claim: "二三阶段四足 7 招必转：1000 内起身蓄力火，否则车", source: "B站", verdict: "ok", detail: "[[em013_00.node_013]]" },
    { claim: "一阶段第 7 招后 15% 额外车，车后需再 7 招", source: "B站", verdict: "ok", detail: "R5 ≥7 后 random(15)，出车时清零 [[em013_00.node_015]]" },
    { claim: "地面 35~49 招 10% 起飞，50 招必飞", source: "xlsx", verdict: "ok", detail: "[[em013_00.node_003]]" },
    { claim: "飞行 3 招后 15% 降落，7 招必降", source: "B站", verdict: "ok", detail: "[[em013_00.node_003]]" },
    { claim: "降落被打断可继续飞行攻击（降落代码会重置 R4）", source: "B站", verdict: "ok", detail: "G018/G019/G123/G124 都清零 R4" },
    { claim: "一阶段头前：直接扇火 20%、地毯扇火连段 10%、三连 17%", source: "B站", verdict: "ok", detail: "{{sim:ph=1&st=l2&d=1500&a=0&hp=100&rng=3500|模拟器复现}}" },
    { claim: "扇火：头前 20%，正背面 10%，其余 15%", source: "B站", verdict: "ok", detail: "指直接扇火（[[em013_55.node_081]]）；头前另有 10% 地毯连段。三阶段整体 ×0.95" },
    { claim: "三连：头前 15%，侧面 20%，其余 15%", source: "B站", verdict: "ok", detail: "二三阶段如此；一阶段头前为 17%" },
    { claim: "大拍、痰、孕吐有 35% 转扇火（800 外）", source: "B站", verdict: "ok", detail: "另需目标在前方 180°（270°~90°）[[em013_55.node_067]] [[em013_55.node_063]] [[em013_55.node_078]]" },
    { claim: "连段地毯必接扇火", source: "B站", verdict: "ok", detail: "[[em013_55.node_087]] 条件同上" },
    { claim: "所有条件攻击都没有连段扇火", source: "B站", verdict: "ok", detail: "条件攻击调用的是不带连段的 G066/G075；但 node_018/037 可直接调用扇火 G081" },
    { claim: "受击（坐倒/击飞/起身）时 50% 追加攻击", source: "B站", verdict: "ok", detail: "[[em013_00.node_109]]" },
    { claim: "113(3,40)：二阶段 30%、三阶段 50% 追加", source: "xlsx", verdict: "ok", detail: "[[em013_00.node_109]]" },
    { claim: "转身和后退不会成为一轮决策的结尾", source: "B站", verdict: "diff", detail: "一阶段四足 ≤500 正面/背后表有 10% 只调用后退 [[em013_55.node_059]] 然后结束本轮" },
    { claim: "四足 1500 内为近战区", source: "B站", verdict: "ok", detail: "四足距离分带 500/1000/1500/5000" },
    { claim: "三阶段两侧胸下 360° 喷火 40%", source: "B站", verdict: "ok", detail: "{{sim:ph=3&st=l4&d=400&a=90&hp=45&heat=l4_all_angle_breath_l&rng=2000|复现}}" },
    { claim: "趴下蓄力火：头前 20%，背面与侧背面 10%，其余 15%", source: "B站", verdict: "partial", detail: "三阶段四足 ≤1000：正面与侧面（30°~90°）都是 20%，背面/侧后 10%，没有 15% 的区间" },
    { claim: "飞行远距离 Z 火 35%", source: "B站", verdict: "ok", detail: "{{sim:ph=2&st=fly&d=2000&a=0&hp=60&rng=5000|复现}}" },
    { claim: "目标在高台时：30% 单火球+降落，15% 单火球不降落", source: "B站", verdict: "ok", detail: "[[em013_00.node_052]]" },
    { claim: "三阶段头下（飞行）Z 火 20%", source: "B站", verdict: "ok", detail: "[[em013_00.node_059]]" },
    { claim: "钩爪上身时飞行中 35% 直接俯冲", source: "B站", verdict: "ok", detail: "[[em013_55.node_004]]" },
    { claim: "额外 5% 捕食判定（2D(1) 与飞行时跳过）", source: "xlsx", verdict: "partial", detail: "还要求三阶段、二足、非 10A、距离 ≤3500 [[em013_00.node_016]]" },
    { claim: "110(2)：30% 俯冲，攻击 2 次后 50% 俯冲", source: "xlsx", verdict: "partial", detail: "飞行 ≤1000 时 30%，>1000 时 20%；R13≥2 后 50% [[em013_00.node_018]]" },
    { claim: "高台招 R6：7 招必横扫火", source: "xlsx", verdict: "diff", detail: "≥7 分支排在 ≥3 之后，是死代码；实际 ≥3 后每次 20% [[em013_00.node_046]]" },
    { claim: "单火球+扇火连携（089）实机未使用", source: "xlsx", verdict: "ok", detail: "全项目没有任何节点调用 [[em013_55.node_089]]" },
    { claim: "139 在总控中没有导向节点", source: "xlsx", verdict: "partial", detail: "Combat_Main 确实不调用，但 Combat_Enter / Non_Combat_Main / Target_Lost 在任务 51612 中会调用 [[em013_55.node_139]]" },
    { claim: "骑乘攻击 12 次后吼", source: "xlsx", verdict: "ok", detail: "R12 ≥12 [[em013_11.node_017]]" },
    { claim: "开局约 15~18 秒不扇火", source: "B站", verdict: "partial", detail: "现象吻合但机制不是计时：exe 中 10E() = 开局计数 < 5（em013.dtt_unq），计的是 AI 出招次数，咆哮与动作内部衔接不计；按每招约 3 秒，5 招≈15~18 秒" },
    { claim: "function#10E()：黑龙开局 18s（或者 15s）", source: "xlsx", verdict: "partial", detail: "同上：是前 5 次 AI 出招，不是固定秒数；发现目标进入战斗时清零" },
    { claim: "function#112(0,1)：疑似角色滑坡或投石机全弹", source: "xlsx", verdict: "diff", detail: "exe：112(p1,p2) = p2 ≥ 自上次被钩爪猛撞倒地以来的出招计数，112(0,1) 即刚被钩爪猛撞倒地 [[em013_00.node_023]]" },
  ],

  references: [
    { title: "黑龙THK注释.xlsx", url: "https://github.com/TheLostRiver/mhwi-ai", note: "社区玩家的节点/寄存器/条件注释（本仓库根目录）" },
    { title: "九世深渊：黑龙AI重构的最后一块拼图，黑龙THK文件主要分支完全解读", url: "https://www.bilibili.com/opus/932887546921222162", note: "2024-05-21" },
    { title: "AsteriskAmpersand / Leviathon", url: "https://github.com/AsteriskAmpersand/Leviathon", note: "THK 编译/反编译器（GPLv3）" },
    { title: "Leviathon Language Reference", url: "https://github.com/Ezekial711/MonsterHunterWorldModding/wiki/Leviathon-Language-Reference", note: "nack 语言与执行语义" },
    { title: "MonsterHunterWorldModding Wiki", url: "https://github.com/Ezekial711/MonsterHunterWorldModding/wiki", note: "THK / 怪物 AI 资料汇总" },
    { title: "JodoZT / MHWNoChunk", url: "https://github.com/JodoZT/MHWNoChunk", note: "chunk 解包逻辑来源" },
  ],
};
