/*
 * 雷狼龙 Zinogre (em057_00) 注释库
 *
 * 电量（蓄电）由通用组件 cpEmBarrierParam 管理：0~100，层级阈值 [0, 99, 100] 写在 em057.dtt_unq 开头，
 * 电量升到 100 时进入超带电、降到 0 时解除（exe：uEm057 的层级回调 0x140a26500）。各动作的增减值见 em057.actp2
 * （mIncBarrierValue / mDecBarrierValue，用 tools/actp2.py 读取）。
 *
 * 来源与可信度标记:
 *   [代码]  直接由 THK 反编译结果读出，确定
 *   [数据]  游戏数据文件（actp2 / dtt_unq）读出，确定
 *   [exe]   游戏 exe（版本 421810）逆向分析，见 docs/em057-zinogre.md「exe 逆向」一节
 *   [攻略]  腾讯新闻 爱游戏的Solay（2020-07-22）/ 游民星空 SweetPotatoH（2020-05-17，转自 NGA）
 *   [推测]  本项目根据代码结构推断，未经实机验证
 */
(function () {
  const G = "em057_55"; // Global（THK 55）
  const M = "em057_00"; // Combat_Main（THK 00）

  // 冲刺/狐步接近：最后一个参数是停止距离，执行后猎人距离视为该值（模拟器假设猎人原地不动）
  const approach = (s, a) => { if (a.length >= 5 && s.dist > a[4]) { s.dist = a[4]; s.angle = 0; } };
  // 转身类动作结束后正对目标
  const face = (s) => { s.angle = 0; };
  // 飞扑、捕食等扑向目标的攻击：落地后视为贴身（模拟假设：距离 400、正对）
  const LUNGE = 400;
  const lunge = (s) => { s.dist = Math.min(s.dist, LUNGE); s.angle = 0; };
  // 超带电接近 G064 的前跳：由 G064 的距离分档（1300 一次短跳、1800 两次短跳、2400 一次长跳、3000 长跳+短跳）反推，
  // 短跳约 500、长跳约 1400，跳完都落在 1000 内（模拟假设）
  const step = (d) => (s) => { s.dist = Math.max(LUNGE, s.dist - d); s.angle = 0; };

  // ---------- 动作 ----------
  const actions = {
    // 蓄电（电量 0~100，每 25 为社区所说的「一层/一个单位」）
    lightning_charge_min: { zh: "小蓄电（+25）", cat: "state", key: true, note: "actp2：mIncBarrierValue 25。社区：抬头蓄电，时间长" },
    short_lightning_charge: { zh: "倒地追击蓄电（+25）", cat: "state", key: true, note: "actp2：SHORT_LIGHTNING_CHARGE +25。只在目标倒地（helpless_0）且未超带电时出现（主控 node_013~015）" },
    lightning_charge_max: { zh: "大蓄电（+50）", cat: "state", key: true, note: "actp2：+50。只出现在连段末尾（前顶→后跳→飞扑→大蓄电 等）。腾讯称「快速蓄电」，游民称「大充」" },
    charge_trans: { zh: "进入超带电（演出）", cat: "state", note: "actp2：CHARGE_TRANS +100。电量满 100 后程序切到 THK_60：清除刚蓄电标记 → 后跳转身 → 本动作" },
    charge_trans2: { zh: "进入超带电（愤怒时）", cat: "state", note: "Rage_Enter：已超带电时用它代替普通威吓进入愤怒" },
    catch_success_lightning: { zh: "捕食成功·蓄电（+50）", cat: "attack", note: "按住猎人后蓄电，actp2：CATCH_SUCCESS_LIGHTNING_END +50" },
    catch_success_strong_punch_lightning: { zh: "捕食成功·雷拳（超带电）", cat: "attack" },
    // 招牌招式
    back_showered_attack: { zh: "背砸", cat: "attack", key: true },
    multi_combo_attack_start2: { zh: "连续灌篮（怒前）", cat: "attack", key: true, note: "超带电专属。腾讯称「二连灌篮」" },
    multi_combo_attack_start3: { zh: "连续灌篮（怒后）", cat: "attack", key: true, note: "超带电且愤怒时的版本" },
    lightning_ball: { zh: "电球", cat: "attack" },
    lightning_ball_2_ren: { zh: "双电球", cat: "attack", key: true },
    lightning_ball_circular: { zh: "电球环绕", cat: "attack", key: true },
    lightning_ball_to_fox: { zh: "电球（接狐步）", cat: "attack" },
    lightning_ball_2_ren_to_fox: { zh: "双电球（接狐步）", cat: "attack" },
    lightning_ball_end_to_fox: { zh: "电球收招（狐步）", cat: "attack" },
    lightning_ball_end_2_ren_to_fox: { zh: "双电球收招（狐步）", cat: "attack" },
    // 体术
    jab: { zh: "前顶", cat: "attack", key: true },
    punch_l: { zh: "轻拳（左）", cat: "attack" }, punch_r: { zh: "轻拳（右）", cat: "attack" },
    punch_l_lightning: { zh: "轻拳（左·超带电）", cat: "attack" }, punch_r_lightning: { zh: "轻拳（右·超带电）", cat: "attack" },
    punch_combo_continue_l: { zh: "轻拳派生（左）", cat: "attack" }, punch_combo_continue_r: { zh: "轻拳派生（右）", cat: "attack" },
    punch_combo_continue_l_lightning: { zh: "轻拳派生（左·超带电）", cat: "attack" }, punch_combo_continue_r_lightning: { zh: "轻拳派生（右·超带电）", cat: "attack" },
    strong_punch_l: { zh: "重拳（左）", cat: "attack" }, strong_punch_r: { zh: "重拳（右）", cat: "attack" },
    strong_punch_l_lightning: { zh: "重拳（左·超带电）", cat: "attack" }, strong_punch_r_lightning: { zh: "重拳（右·超带电）", cat: "attack" },
    strong_punch_combo_continue_l: { zh: "重拳派生（左）", cat: "attack" }, strong_punch_combo_continue_r: { zh: "重拳派生（右）", cat: "attack" },
    strong_punch_combo_continue_l_lightning: { zh: "重拳派生（左·超带电）", cat: "attack" }, strong_punch_combo_continue_r_lightning: { zh: "重拳派生（右·超带电）", cat: "attack" },
    shoulder_tackle: { zh: "铁山靠", cat: "attack" },
    somersault: { zh: "托马斯回旋（翻身砸尾）", cat: "attack" },
    tail_attack: { zh: "尾砸", cat: "attack" },
    turn_tail_attack: { zh: "翻身甩尾", cat: "attack" },
    check_tail_attack: { zh: "回头甩尾", cat: "attack" },
    side_attack: { zh: "侧撞", cat: "attack" },
    below_attack: { zh: "低身扫击", cat: "attack" },
    dash_attack: { zh: "龙车（冲撞）", cat: "attack" },
    jump_attack: { zh: "飞扑", cat: "attack", effect: lunge },
    jump_attack_lightning: { zh: "飞扑（超带电）", cat: "attack", effect: lunge },
    jump_attack_tired: { zh: "飞扑（疲劳）", cat: "attack", effect: lunge },
    catch_attack: { zh: "捕食（扑压）", cat: "attack", key: true, effect: lunge },
    catch_adjust: { zh: "捕食·按住", cat: "attack" },
    catch_miss: { zh: "捕食落空", cat: "attack" },
    jump_attack_wall_up: { zh: "跳上高处攻击", cat: "attack" }, jump_attack_wall_down: { zh: "跳下高处攻击", cat: "attack" },
    predatory_attack: { zh: "捕猎（非战斗）", cat: "attack" },
    // 状态 / 特殊
    threat: { zh: "威吓", cat: "special" }, short_threat: { zh: "短威吓", cat: "special" }, growl: { zh: "低吼", cat: "special" },
    search: { zh: "索敌", cat: "special" }, battle_search: { zh: "战斗索敌", cat: "special" }, lost_search: { zh: "丢失目标索敌", cat: "special" },
    search_bushes: { zh: "翻草丛", cat: "special" }, sniff_s: { zh: "嗅（短）", cat: "special" }, sniff_l: { zh: "嗅（长）", cat: "special" },
    marking: { zh: "做记号", cat: "special", note: "actp2：mDecBarrierValue 10" },
    idle_tired: { zh: "疲劳喘气", cat: "special" }, refresh: { zh: "抖身清醒", cat: "special" },
    eat: { zh: "进食", cat: "special" }, drink: { zh: "喝水", cat: "special" }, sleep: { zh: "睡眠", cat: "special" },
    loss_appetite: { zh: "食欲不振", cat: "special" }, sunbath: { zh: "晒太阳", cat: "special" }, moonlight_bath: { zh: "晒月光", cat: "special" },
    dying_sleep: { zh: "濒死睡眠", cat: "special" }, dying_walk: { zh: "濒死步行", cat: "move" },
    damage_drop_to_ground: { zh: "坠地", cat: "special" }, return_fall_floor: { zh: "从落穴返回", cat: "special" },
    ride_rage_head: { zh: "骑乘·甩头", cat: "special" }, ride_rage_head_lv2: { zh: "骑乘·甩头 2", cat: "special" },
    ride_rage_body: { zh: "骑乘·甩身", cat: "special" }, ride_rage_body_lv2: { zh: "骑乘·甩身 2", cat: "special" },
    ride_rage_tail: { zh: "骑乘·甩尾", cat: "special" }, ride_rage_tail_lv2: { zh: "骑乘·甩尾 2", cat: "special" },
    ride_rage_crash_head: { zh: "骑乘·撞头", cat: "special" }, ride_rage_crash_head_lv2: { zh: "骑乘·撞头 2", cat: "special" },
    ride_rage_crash_body: { zh: "骑乘·撞身", cat: "special" }, ride_rage_crash_body_lv2: { zh: "骑乘·撞身 2", cat: "special" },
    ride_rage_crash_tail: { zh: "骑乘·撞尾", cat: "special" }, ride_rage_crash_tail_lv2: { zh: "骑乘·撞尾 2", cat: "special" },
    ride_tired: { zh: "骑乘·疲劳", cat: "special" },
    // 移动 / 转身
    dash: { zh: "冲刺", cat: "move", effect: approach },
    fox_walk: { zh: "狐步（绕行接近）", cat: "move", effect: approach },
    fox_walk_from_lightning_ball: { zh: "狐步（电球后）", cat: "move", effect: approach },
    walk: { zh: "步行", cat: "move", effect: approach }, battle_walk: { zh: "战斗步行", cat: "move", effect: approach },
    tired_walk: { zh: "疲劳步行", cat: "move", effect: approach },
    front_step_short: { zh: "前跳（短）", cat: "move", effect: step(500) },
    front_step_long: { zh: "前跳（长）", cat: "move", effect: step(1400) },
    back_step: { zh: "后撤步", cat: "turn" },
    back_turn: { zh: "后跳转身", cat: "turn", effect: face },
    normal_turn: { zh: "转身", cat: "turn", effect: face }, quick_turn: { zh: "快速转身", cat: "turn", effect: face },
    same_direction_btof: { zh: "跳转朝向（背→正）", cat: "turn", effect: face },
    same_direction_stof: { zh: "跳转朝向（侧→正）", cat: "turn", effect: face },
  };
  const EMS = { em002: "火龙", em018: "黑狼鸟", em063: "碎龙", em080: "斩龙", em100_01: "雷颚龙" };
  for (const [em, zh] of Object.entries(EMS)) {
    for (const k of ["mediation", "first"]) actions[`grapple_with_${em}_${k}`] = { zh: `领地争夺·${zh}`, cat: "special" };
  }

  const glossary = {
    lightning: "雷", charge: "蓄电", min: "小", max: "大", short: "短", trans: "转换", trans2: "转换2", catch: "捕食", success: "成功",
    end: "收招", strong: "重", punch: "拳", combo: "连段", "continue": "派生", l: "左", r: "右", jab: "前顶", shoulder: "肩", tackle: "撞",
    somersault: "空翻", tail: "尾", attack: "攻击", turn: "转身", check: "回头", side: "侧", below: "低身", dash: "冲刺", jump: "跳",
    tired: "疲劳", adjust: "按住", miss: "落空", wall: "墙", up: "上", down: "下", back: "后", showered: "背砸", multi: "多段",
    start2: "起手2", start3: "起手3", ball: "球", "2": "2", ren: "连", circular: "环绕", to: "到", fox: "狐", walk: "步行", from: "从",
    predatory: "捕猎", threat: "威吓", growl: "低吼", search: "索敌", battle: "战斗", lost: "丢失", bushes: "草丛", sniff: "嗅", s: "短",
    marking: "记号", idle: "待机", refresh: "清醒", eat: "进食", drink: "喝水", sleep: "睡", loss: "失去", appetite: "食欲",
    sunbath: "晒太阳", moonlight: "月光", bath: "浴", dying: "濒死", damage: "受击", drop: "落", ground: "地面", "return": "返回",
    fall: "落", floor: "地板", ride: "骑乘", rage: "暴怒", head: "头", body: "身", crash: "撞", lv2: "2级", front: "前", step: "步",
    long: "长", quick: "快速", normal: "普通", same: "同", direction: "方向", btof: "背→正", stof: "侧→正", grapple: "缠斗",
    "with": "与", mediation: "调停", first: "首次",
  };

  // ---------- 条件 ----------
  const flagOr = (s, k, d) => (s.flags && k in s.flags ? !!s.flags[k] : d);
  const conditions = {
    "function#101()": { zh: "超带电", src: "exe", note: "exe：雷狼龙专属函数 101 = uEm057 +0x20908（超带电标志）。电量组件层级升到最高（电量 100）时由 0x140a2bfc0 置 1，层级降回 0 时由 0x140a2c160 清 0", eval: (s) => !!s.charged },
    "function#10A()": { zh: "刚蓄电（蓄电后的下一轮）", src: "exe", note: "exe：10A() 读 +0x20a58；当前动作为 51/52/53/109（短蓄电/小蓄电/大蓄电/捕食成功蓄电）时由 0x140a29100 置 1，THK 用 10A(1) 清除。为真时主控改用一张不含「冲撞/后跳→蓄电」的表", eval: (s) => !!s.postCharge },
    "function#10A(1)": { zh: "清除「刚蓄电」标记（副作用）" },
    "function#102()": { zh: "连段中标记置位（副作用）", src: "exe", note: "exe：+0x20909 = 1；连段节点在招式前后成对调用 102/103" },
    "function#103()": { zh: "连段中标记清除（副作用）", src: "exe", note: "exe：+0x20909 = 0；主控每轮开头先调用一次" },
    "function#104()": { zh: "上一击命中的猎人处于受击状态（推测）", src: "推测", toggle: true, note: "exe：104 取命中记录（+0x1d700 参数槽 3/4），找到被命中的猎人并检查其状态字 +0x894c 的 0x18 位。连段中为真时（1000 内）20% 插入捕食" },
    "function#105()": { zh: "刚打出受击反击", src: "exe", toggle: true, note: "exe：105() 读 +0x20944；动作 121/123/129/131（DAMAGE_COUNTER_ATTACK 系列，受击后的反击）开始时由 0x140a28470 置 1。超带电且愤怒时，下一轮开头 G136 必接追击连段 G139" },
    "function#105(1)": { zh: "连段中被打出反击", src: "exe", note: "exe：105(1) 还要求连段标记 +0x20909；主控每轮开头已用 103() 清除该标记，所以在 G136 中恒为假", eval: () => false },
    "function#106()": { zh: "反击追击方向标记（+0x20946，初始为真）", src: "exe", toggle: true, default: true, note: "exe：106() 读 +0x20946，106(1) 取反；对象初始化为 1，置位处未找到" },
    "function#106(1)": { zh: "反击追击方向标记为假", src: "exe", eval: (s) => !flagOr(s, "function#106()", true) },
    "function#107(1)": { zh: "改以反击来源为目标（副作用）", src: "exe", note: "exe：107 读 +0x209e8 保存的对象，有效时把 AI 目标设为它", eval: () => true },
    "function#108()": { zh: "反击追击分支标记（+0x20a08，初始为真）", src: "exe", toggle: true, default: true, note: "exe：108() 读 +0x20a08；对象初始化为 1。为真时追击连段先接捕食判定再出拳" },
    "function#B9()": { zh: "历战个体（推测）", src: "推测", toggle: true, note: "exe：B9() 读 AI 对象 +0x8e6；刷怪时由任务怪物数据写入，指引之地（stage 109）按地区等级判定后置 1，紧邻 SharpPluginLoader 标注的难度索引 +0x8AC——推测为「历战」标志。雷狼龙初始化 0x140a27f10 在它为真时把电量直接设为上限（开场即超带电），超带电期间的伤害累计也会多乘一个倍率。THK 中：冲撞/后跳之后的 15% 分支在 1000 内出前顶连段 G122，否则出重拳" },
    "function#2D(1)": { zh: "目标是随从猫", src: "exe", toggle: true, note: "exe：2D(1) 检查目标对象标志 bit14（uOtomo）。为真时主控改走 node_061 的随从猫攻击表" },
    "function#45()": { zh: "当前动作带特殊属性（跳过大型怪检查）", src: "推测", toggle: true },
    "function#5D()": { zh: "丢失目标视野（烟雾弹）", toggle: true },
    "function#38(0,10008)": { zh: "特定任务（全局值 == 10008）", src: "exe", toggle: true, note: "exe：38(op,v) 用通用比较函数比较全局对象 +0xae3c 与 v，推测为任务 ID。只影响大型怪同场的反应与 G004 计数" },
    "function#CF()": { zh: "CF()（G004 计数满后调用）" },
    "function#CE(1,1)": { zh: "CE(1,1)" },
    "function#30(2)": { zh: "30(2)：同场怪物条件", toggle: true },
    "function#3C()": { zh: "白天（推测）", src: "推测", toggle: true, note: "为真晒太阳，否则晒月光" },
    "function#7F(5)": { zh: "钩爪抓在部位 5", src: "推测", toggle: true },
    "function#7F(6)": { zh: "钩爪抓在部位 6", src: "推测", toggle: true },
    "self.enraged()": { zh: "愤怒", eval: (s) => !!s.enraged },
    "self.fatigued()": { zh: "疲劳", eval: (s) => !!s.fatigued },
    "self.target.helpless_0()": { zh: "目标倒地 / 受击硬直", toggle: true, note: "为真时：未超带电 → 本轮攻击后必出倒地追击蓄电（+25）；超带电 → 50% 追加一次攻击" },
    "self.target.pinned()": { zh: "捕食命中（目标被按住）", toggle: true },
    "self.target.helpless_1()": { zh: "被按住的目标无法挣脱", toggle: true },
    "self.target(55)": { zh: "钩爪挂在身上", toggle: true, note: "主控 node_000：直接走 G018 钩爪反击（冲撞/低身扫击/尾砸）" },
    "self.target(0)": { zh: "目标状态 0（推测：攀爬/挂壁）", src: "推测", toggle: true },
    "self.target(0) @ parameter2:1": { zh: "目标状态 0（参数 2 = 1）", src: "推测", toggle: true },
    "self.target(3)": { zh: "目标状态 3（索敌相关）", toggle: true }, "self.target(4)": { zh: "目标状态 4（索敌相关）", toggle: true },
    "self.target(7)": { zh: "目标状态 7", toggle: true }, "self.target(10)": { zh: "目标状态 10", toggle: true },
    "self.target(11)": { zh: "目标状态 11", toggle: true }, "self.target(12)": { zh: "目标状态 12", toggle: true },
    "self.target(13)": { zh: "目标已力尽（推测）", src: "推测", toggle: true },
    "self.target(14)": { zh: "目标状态 14（推测：攀爬/挂壁）", src: "推测", toggle: true },
    "self.target(39)": { zh: "目标状态 39", toggle: true }, "self.target(52)": { zh: "目标状态 52", toggle: true },
    "self.target.in_combat()": { zh: "目标（怪物）在战斗中", toggle: true },
    "self.in_combat()": { zh: "自身在战斗中", toggle: true },
    "self.above_target()": { zh: "在目标上方", toggle: true },
    "self.mounted()": { zh: "被骑乘", toggle: true },
    "self.targetEnemy(target_em.random_player_or_cat)": { zh: "随机选择猎人/随从为目标（副作用）" },
    "self.targetEnemy(target_em.any_monster)": { zh: "以附近的大型怪为目标" },
    "self.in_map(st.Ancient_Forest).in_area(2)": { zh: "位于古代树森林 区域 2", toggle: true },
    "self.in_map(st.Ancient_Forest).in_area(13)": { zh: "位于古代树森林 区域 13", toggle: true },
    "self.in_map(st.Special_Arena).in_area(-1)": { zh: "位于斗技场", toggle: true },
    "self.in_map(st.Challenge_Arena).in_area(-1)": { zh: "位于竞技场", toggle: true },
  };

  // ---------- 寄存器 ----------
  const registers = {
    RegisterVar0: { zh: "疲劳喘气计数", note: "疲劳时的攻击表末尾 node_009：R0≤3 时 +1，否则清零并喘气（G180）——疲劳期间每 5 轮喘一次" },
    RegisterVar1: { zh: "特定任务计数", note: "G004：全局值 == 10008 时每轮 +1，≥3 后调用 CF()" },
    RegisterVar2: { zh: "连续灌篮冷却", note: "G120 打出连续灌篮时 +1；下一轮 node_026 看到非 0 就清零而不判定，所以灌篮不会连续两轮出现" },
    RegisterVar3: { zh: "THK_28 计数", note: "≥15 时清零" },
    RegisterVar4: { zh: "大型怪同场换区计数", note: "G015/G016：≥3 时清零并强制换区" },
    RegisterVar5: { zh: "骑乘计数", note: "Mount（THK 11）中轮换甩头/甩身/甩尾" },
    RegisterVar6: { zh: "换区计数", note: "Combat_Area_Change（THK 17）" },
  };

  // ---------- THK 上下文 ----------
  const contexts = {
    Combat_Main: "战斗主控：每轮 清连段标记 → 反击追击 G136 → 大型怪/烟雾/选目标 → 按目标状态分流 → node_010 主攻击（开头侧跳 → 连段判定 → 按 超带电/愤怒/目标倒地/疲劳/距离 查表 → 倒地追击）",
    Combat_Enter: "进入战斗", Search: "搜索", Discover: "发现目标", Rage_Enter: "进入愤怒（超带电时 charge_trans2，否则威吓）",
    Exhaust_Enter: "进入疲劳", Exhaust_End: "疲劳结束", Mount: "被骑乘", Concealment: "隐蔽", Non_Combat_Main: "非战斗主控",
    Non_Combat_Hit: "非战斗受击", Combat_Area_Change: "战斗中换区", Combat_Critical_HP: "濒死", Combat_Turf_War_A: "领地争夺 A",
    Combat_Turf_War_B: "领地争夺 B", Combat_Blinded: "闪光致盲", Combat_Blinded_Recovery: "致盲恢复", Target_Lost: "丢失目标",
    THK_60: "进入超带电：电量满 100 后切入，清除「刚蓄电」标记 → 后跳转身 G061 → 进电演出 G072",
    Global: "Global 招式库（THK 55，214 个节点）",
  };

  // ---------- 节点标题 ----------
  const nodes = {};
  const put = (file, id, zh, note) => { nodes[`${file}.node_${String(id).padStart(3, "0")}`] = note ? { zh, note } : { zh }; };
  [
    [0, "每轮总控", "103() 清连段标记 → G004 特定任务计数 → G136 反击追击 → node_001 大型怪/选目标 → 目标状态 3/4 索敌、钩爪 G018、12/14/11/0 高低差处理，否则 node_010 主攻击"],
    [1, "大型怪检查 + 选目标"], [2, "选目标（烟雾弹时索敌）"], [3, "目标状态 3/4：索敌"],
    [4, "目标状态 12：跳上高处 / 飞扑"], [5, "目标状态 14：跳上高处"], [6, "目标状态 11：冲刺 + 飞扑"], [7, "目标状态 0：跳上/跳下高处"],
    [8, "烟雾弹：索敌"], [9, "疲劳喘气计数 R0", "R0≤3 时 +1，否则清零并喘气 G180（疲劳期间每 5 轮一次）"],
    [10, "主攻击流程", "高低差 >450 先冲刺；目标是随从猫 → node_061；开头侧跳 059/060 → 连段判定 022 → 按 超带电/目标倒地/愤怒/疲劳/距离（350/1000/3000/8000）查表 → 倒地追击 011"],
    [11, "倒地追击", "目标倒地时：未超带电 100% → 012（倒地追击蓄电）；超带电 50% → 012（追加攻击）"],
    [12, "倒地追击：按状态与距离分表"],
    [13, "倒地追击·未超带电 ≤350（倒地追击蓄电 100%）"], [14, "倒地追击·未超带电 ≤1000（倒地追击蓄电 100%）"], [15, "倒地追击·未超带电 ≤3000（倒地追击蓄电 100%）"],
    [16, "倒地追击·超带电怒前 ≤350"], [17, "倒地追击·超带电怒前 ≤1000"], [18, "倒地追击·超带电怒前 ≤3000"],
    [19, "倒地追击·超带电怒后 ≤350"], [20, "倒地追击·超带电怒后 ≤1000"], [21, "倒地追击·超带电怒后 ≤3000"],
    [22, "连段判定", "超带电 3000 内 → 怒后 025 / 怒前 024；未超带电 800 内且不疲劳 → 023"],
    [23, "未超带电：正面 40% 前顶连段 G122（含大蓄电）"],
    [24, "超带电怒前连段", "先判定连续灌篮 026；1000 外 30% G128 / 10% 冲刺+027；正面 20% G124 / 10% G125 / 10% G134；侧后 40% G126；其余 60% 走普通表"],
    [25, "超带电怒后连段", "先判定连续灌篮 026；1000 外 30% G133 / 10% 冲刺+028；正面 35% G130 / 15% G131 / 20% G135；侧后 40% G132"],
    [26, "连续灌篮判定（R2）", "R2=0 时：HP≤40% 怒后 30% / 怒前 10%，否则 怒后 25% / 怒前 5% → G120；R2≠0 时清零（冷却一轮）"],
    [27, "冲刺接近 → 怒前连段"], [28, "冲刺接近 → 怒后连段"],
    [29, "未超带电 ≤350", "10A（刚蓄电）时用前半张表并清除标记；否则后半张表（含 冲撞→蓄电 G101、后跳→蓄电 G117）"],
    [30, "未超带电 ≤350（疲劳）"], [31, "未使用"], [32, "未超带电 350~1000"], [33, "未超带电 350~1000（疲劳）"], [34, "未使用"],
    [35, "未超带电 1000~3000"], [36, "未超带电 1000~3000（疲劳）"], [37, "未使用"], [38, "未超带电 3000~8000"], [39, "未超带电 3000~8000（疲劳）"],
    [40, "未超带电 >8000"], [41, "未超带电 >8000（疲劳）"],
    [42, "超带电怒前 ≤350"], [43, "超带电怒后 ≤350"], [44, "超带电怒前 ≤350（目标倒地）"], [45, "超带电怒后 ≤350（目标倒地）"],
    [46, "超带电怒前 350~1000"], [47, "超带电怒后 350~1000"], [48, "超带电怒前 350~1000（目标倒地）"], [49, "超带电怒后 350~1000（目标倒地）"],
    [50, "超带电怒前 1000~3000"], [51, "超带电怒后 1000~3000"],
    [52, "电球之后：1000 外追加冲撞/连段"], [53, "电球环绕之后：1000 外追加冲撞/连段"], [54, "电球之后（同 052）"],
    [55, "超带电怒前 1000~3000（目标倒地）"], [56, "超带电怒后 1000~3000（目标倒地）"], [57, "超带电 3000~8000"], [58, "超带电 >8000"],
    [59, "开头侧跳（未超带电）", "1000 内、不疲劳、目标未倒地：20% 跳转朝向 G067"],
    [60, "开头侧跳（超带电）", "同上 35%"],
    [61, "目标是随从猫：按距离分表"],
  ].forEach((a) => put(M, ...a));
  [
    [4, "特定任务计数（R1）"], [6, "大型怪同场"], [18, "钩爪反击", "钩爪抓在部位 5/6：冲撞 30% / 低身扫击 30% / 尾砸 40%；否则 尾砸 30% / 翻身甩尾 30% / 冲撞 20% / 低身扫击 20%"],
    [37, "背后时后撤或转身"], [38, "身后时后撤或转身"], [39, "后撤步"],
    [46, "冲刺接近（600 内停）"], [47, "冲刺接近（700 内停）"], [48, "冲刺接近（800 内停）"], [52, "冲刺接近（3000 内停）"],
    [55, "冲刺接近（高低差）"], [61, "后跳转身"], [62, "后跳转身（连段中）"],
    [64, "超带电接近", "400 内后撤；1000 内跳转朝向；1300 内短前跳；1800 内两次短前跳；2400 内长前跳；3000 内长+短前跳；更远冲刺"],
    [67, "跳转朝向（侧跳）"], [68, "狐步接近"], [69, "狐步接近（电球后）"],
    [70, "倒地追击蓄电（+25）"], [71, "小蓄电（+25）"], [72, "进入超带电（THK_60 调用）"], [73, "进入超带电（愤怒时）"],
    [74, "前顶"], [75, "轻拳（左）"], [77, "轻拳（右）"], [79, "重拳（左）"], [82, "重拳（右）"], [85, "铁山靠"],
    [90, "尾砸"], [92, "托马斯回旋"], [94, "侧撞"], [96, "背砸（4000 外冲刺、400 内后跳）"], [98, "低身扫击"], [99, "龙车"],
    [101, "龙车 → 85% 小蓄电 / 15% G103", "G103：历战（B9）时 1000 内前顶连段 G122，否则重拳；3000 内飞扑；更远小蓄电"],
    [103, "龙车后的 15% 分支"], [104, "同 G103（未使用）"], [102, "同 G101（未使用）"], [105, "飞扑（3000 外冲刺、400 内后跳）"], [106, "飞扑"],
    [107, "电球（怒后电球环绕，否则 60% 电球 / 40% 双电球）"], [110, "电球环绕（1000 内先后跳）"],
    [111, "电球接狐步（怒后电球环绕）"], [112, "电球 → 狐步"], [113, "双电球 → 狐步"],
    [114, "捕食（500 内后撤、1000 外冲刺）"], [115, "捕食"], [116, "大蓄电（+50）"],
    [117, "后跳 → 85% 小蓄电 / 15% G118", "G118 同 G103"], [118, "后跳后的 15% 分支"],
    [120, "连续灌篮（R2+1）"], [121, "连段中捕食判定", "104()（上一击命中的猎人处于受击状态）且 1000 内：20% 捕食并结束本轮"],
    [122, "前顶连段（未超带电）", "前顶 → 捕食判定 → 正面：后跳 → 飞扑 → 大蓄电；背后：翻身甩尾；侧面：铁山靠"],
    [123, "轻拳连段（未使用）"], [124, "前顶连段（超带电怒前）", "正面：后跳 → 飞扑 → 重拳；背后：翻身甩尾；侧面：铁山靠"],
    [125, "轻拳连段（超带电怒前）", "正面：重拳派生；侧后：尾砸 → 托马斯回旋"],
    [126, "回头甩尾连段（超带电怒前）", "回头甩尾 → 正面：铁山靠；正后方：尾砸 → 龙车；其余：翻身甩尾"], [127, "翻身甩尾连段（未使用）"], [128, "飞扑连段（超带电怒前）", "飞扑 → 正面：轻拳 → 重拳派生；背后：翻身甩尾；侧面：侧撞"], [129, "电球连段（未使用）"],
    [130, "前顶连段（超带电怒后）", "正面：后跳 → 飞扑 → 重拳 → 背砸；背后：翻身甩尾 → 托马斯回旋；侧面：铁山靠 → 托马斯回旋"],
    [131, "轻拳连段（超带电怒后）", "正面：轻拳派生 → 重拳派生；侧后：尾砸 → 托马斯回旋 → 背砸"],
    [132, "回头甩尾连段（超带电怒后）", "回头甩尾 → 正面：铁山靠 → 托马斯回旋；正后方：尾砸 → 龙车 → 背砸；其余：翻身甩尾 → 托马斯回旋"], [133, "飞扑连段（超带电怒后）", "飞扑 → 正面：轻拳 → 重拳派生 → 背砸；背后：翻身甩尾 → 托马斯回旋；侧面：侧撞 → 托马斯回旋"], [134, "轻拳三连（超带电怒前）", "轻拳 → 轻拳派生 → 正面：重拳派生；侧后：尾砸 → 托马斯回旋"], [135, "农夫四拳（超带电怒后）", "轻拳 → 轻拳派生 → 正面：重拳派生 → 重拳派生；侧后：尾砸 → 托马斯回旋 → 背砸"],
    [136, "反击追击判定", "超带电、愤怒且刚打出受击反击（105）→ G139"],
    [137, "反击追击（未使用）"], [138, "反击追击（未使用）"],
    [139, "反击追击连段", "108 为真：捕食判定后出拳连段（正面）或尾砸 → 背砸；否则重拳 → 背砸 / 托马斯回旋 → 重拳"],
    [180, "疲劳喘气"], [182, "威吓"], [184, "低吼"],
  ].forEach((a) => put(G, ...a));

  MHWI.registerAnno("em057_00", {
    monster: { key: "em057_00", em: "em057", zh: "雷狼龙", full: "雷狼龙", en: "Zinogre", internalId: 94 },
    scope: "zinogre",
    actions, conditions, registers, contexts, nodes, glossary,
    movesHeader: "招式（社区俗称）",
    movesNote: "「招式」一列是社区俗称（参考腾讯新闻 爱游戏的Solay、游民星空 SweetPotatoH 的攻略，如前顶、铁山靠、托马斯回旋、背砸）。蓄电量来自 em057.actp2。",
    entry: { file: M, node: "node_000" },
    state: {
      defaults: { charged: false, enraged: false, fatigued: false, postCharge: false, hp: 100, dist: 800, angle: 0, vert: 0, regs: {}, flags: {} },
      controls: [
        {
          id: "ch", zh: "电量",
          options: [
            { id: "0", zh: "未超带电", note: "电量 <100：主表含 冲撞→蓄电、后跳→蓄电；目标倒地时出倒地追击蓄电" },
            { id: "1", zh: "超带电", note: "电量到 100 进入，降到 0 解除：换成超带电表，出背砸、电球、连续灌篮与各种连段" },
          ],
          get: (s) => (s.charged ? "1" : "0"),
          set: (s, v) => { s.charged = v === "1"; },
        },
      ],
      checks: [
        { id: "rage", key: "enraged", zh: "愤怒" },
        { id: "fat", key: "fatigued", zh: "疲劳" },
        { id: "post", key: "postCharge", zh: "刚蓄电" },
      ],
      common: ["self.target.helpless_0()", "function#105()", "function#B9()", "function#104()", "function#2D(1)", "self.target(55)", "self.target.pinned()", "function#108()", "function#106()", "function#5D()"],
      presets: [["正面 300", 300, 0], ["正面 700", 700, 0], ["正面 1500", 1500, 0], ["侧面 600", 600, 80], ["背后 500", 500, 180], ["中距离 2500", 2500, 0], ["远处 5000", 5000, 0]],
    },
    // 俯视示意轮廓（游戏单位，原点为判定视点，前方为 -y）
    silhouette: (s) => {
      const k = s.charged ? 1.08 : 1;
      const body = [[0, -1050], [110, -1000], [150, -830], [230, -650], [300, -350], [280, 0], [230, 300], [150, 560], [0, 600]];
      const fore = [[200, -640], [420 * k, -720], [470 * k, -560], [300, -430]];
      const hind = [[220, 230], [430 * k, 300], [430 * k, 480], [230, 460]];
      const tail = [[60, 560], [100, 900], [70, 1250], [0, 1350]];
      const flip = (pts) => pts.map(([x, y]) => [-x, y]);
      return [
        { cls: "wing", pts: fore }, { cls: "wing", pts: flip(fore) },
        { cls: "wing", pts: hind }, { cls: "wing", pts: flip(hind) },
        { cls: "body", pts: tail, mirror: true },
        { cls: "body", pts: body, mirror: true },
      ];
    },
    minorCats: ["move", "turn"],
    simNote: "模拟假设猎人原地不动：冲刺/狐步接近后距离 = 该动作的停止距离；转身后正对目标；飞扑、捕食落地后视为贴身（距离 400、正对）；超带电接近的前跳按短跳约 500、长跳约 1400 计算（由 G064 的距离分档反推）。龙车穿过目标，不改变距离。「刚蓄电」= 上一轮出过蓄电（10A），只影响一轮。",
    scale: { bodyLength: 2400, ringMax: 3500 },
  });
})();
