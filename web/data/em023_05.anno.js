/*
 * 激昂金狮子 Furious Rajang (em023_05) 注释库
 *
 * 激昂金狮子的 thklst 只替换了战斗主控 em023_00（05/data），其余 33 个 THK（含 Global 招式库 em023_55）
 * 与普通金狮子共用（00/data）。Global 里用 function#D0(5)「亚种编号 = 5」区分激昂个体专属的招式版本。
 *
 * 来源与可信度标记:
 *   [代码]  直接由 THK 反编译结果读出，确定
 *   [exe]   游戏 exe（版本 421810）逆向分析，见 docs/em023-furious-rajang.md「exe 逆向」一节
 *   [推测]  本项目根据代码结构推断，未经实机验证
 */
(function () {
  const G = "em023_55"; // Global（THK 55，与普通金狮子共用）
  const M = "em023_00"; // Combat_Main（激昂金狮子专属，05/data/em023_00）

  // 冲刺/步行接近：最后一个参数是停止距离，执行后猎人距离视为该值（模拟器假设猎人原地不动）
  const approach = (s, a) => { if (a.length >= 5 && s.dist > a[4]) { s.dist = a[4]; s.angle = 0; } };
  // 转身类动作结束后正对目标
  const face = (s) => { s.angle = 0; };
  // 扑向目标的突进攻击：落地后视为贴身（模拟假设：距离 400、正对目标）
  const LUNGE = 400;
  const lunge = (s) => { s.dist = Math.min(s.dist, LUNGE); s.angle = 0; };

  // ---------- 动作 ----------
  // cat: move 移动 / turn 转身·侧跳 / attack 攻击 / state 状态切换 / special 特殊
  const actions = {
    // 气功炮 / 气弹
    ex_kiai_beam: { zh: "气功炮（激昂版）", cat: "attack", key: true },
    kiai_beam: { zh: "气功炮", cat: "attack" },
    jump_kiai_bullet: { zh: "跳跃气弹", cat: "attack" },
    swing_kiai_beam_r: { zh: "横扫气功炮", cat: "attack" },
    swing_kiai_beam_r2: { zh: "横扫气功炮（背向）", cat: "attack" },
    jump_kiai_multi_bullet_start: { zh: "跳跃连发气弹", cat: "attack" },
    grab_wall_swing_kiai_beam_r: { zh: "抓墙横扫气功炮（右）", cat: "attack" },
    grab_wall_swing_kiai_beam_l: { zh: "抓墙横扫气功炮（左）", cat: "attack" },
    grab_wall_swing_kiai_beam_to_idle_r: { zh: "抓墙横扫气功炮（右·直接收招）", cat: "attack" },
    grab_wall_swing_kiai_beam_to_idle_l: { zh: "抓墙横扫气功炮（左·直接收招）", cat: "attack" },
    // 拳击
    dempsey_attack: { zh: "摇摆冲拳", cat: "attack" },
    dempsey_attack_2: { zh: "摇摆冲拳（近）", cat: "attack" },
    dempsey_attack_3: { zh: "摇摆冲拳（对怪物）", cat: "attack" },
    quadruple_punch_b: { zh: "四连拳·雷断层（向右）", cat: "attack", key: true },
    quadruple_punch_d: { zh: "四连拳·雷断层（向左）", cat: "attack", key: true },
    triple_punch_b: { zh: "三连拳（向右）", cat: "attack" },
    triple_punch_d: { zh: "三连拳（向左）", cat: "attack" },
    turn_hook_l: { zh: "转身勾拳（左）", cat: "attack" },
    turn_hook_r: { zh: "转身勾拳（右）", cat: "attack" },
    head_butt: { zh: "头槌", cat: "attack" },
    back_kick: { zh: "后踢", cat: "attack" },
    jump_punch_5way_thunder: { zh: "跳跃锤地·五向雷", cat: "attack", key: true, effect: lunge },
    dive_punch_start: { zh: "飞扑锤击（侧向）", cat: "attack", effect: lunge },
    dive_punch_start3: { zh: "飞扑锤击", cat: "attack", effect: lunge },
    // 体术
    spin_attack: { zh: "回旋攻击", cat: "attack" },
    spin_attack_straight: { zh: "回旋攻击（正面）", cat: "attack" },
    jump_rolling_attack: { zh: "翻滚跳砸", cat: "attack", effect: lunge },
    ex_jump_rolling_attack: { zh: "翻滚跳砸（激昂版）", cat: "attack", effect: lunge },
    body_press: { zh: "泰山压顶", cat: "attack", effect: lunge },
    rush_long_horn: { zh: "猛冲（远）", cat: "attack", effect: lunge },
    rush_long_horn_2: { zh: "猛冲", cat: "attack", effect: lunge },
    zigzag_step: { zh: "之字步突进", cat: "attack", effect: lunge },
    zigzag_step_2: { zh: "之字步突进（远）", cat: "attack", effect: lunge },
    zigzag_step_straight: { zh: "之字步突进（正面）", cat: "attack", effect: lunge },
    dig_up_ground_straight: { zh: "掀地投石", cat: "attack" },
    special_jump_attack: { zh: "大跳跃强袭（硬化专属）", cat: "attack", key: true, effect: lunge },
    jump_attack_wall_up: { zh: "跳上高处攻击", cat: "attack" },
    jump_attack_wall_down: { zh: "跳下高处攻击", cat: "attack" },
    damage_down_avoid_success_attack: { zh: "倒地回避后反击", cat: "attack" },
    // 抓取
    catch_attack_straight: { zh: "抓取（正面扑抓）", cat: "attack", key: true },
    catch_attack: { zh: "抓取（转身扑抓）", cat: "attack" },
    catch_attack_miss_l: { zh: "抓取落空", cat: "attack" },
    catch_attack_success_l: { zh: "抓取成功", cat: "attack" },
    catch_finish_punch_l: { zh: "抓取·终结拳", cat: "attack" },
    ex_n_catch_attack_success_l: { zh: "抓取成功（激昂）", cat: "attack" },
    ex_n_catch_finish_punch_l: { zh: "抓取·终结拳（激昂）", cat: "attack" },
    ex_catch_attack_success_l: { zh: "抓取成功（激昂·硬化）", cat: "attack" },
    ex_catch_attack_success_punch_l: { zh: "抓取·终结（激昂·硬化，社区称零距离嘴炮）", cat: "attack" },
    catch_claw_attack_l: { zh: "反钩爪抓取（左）", cat: "attack" },
    catch_claw_attack_r: { zh: "反钩爪抓取（右）", cat: "attack" },
    catch_claw_attack_miss_l: { zh: "反钩爪抓取落空", cat: "attack" },
    catch_claw_attack_success_l: { zh: "反钩爪抓取成功", cat: "attack" },
    ex_n_catch_claw_attack_success_l: { zh: "反钩爪抓取成功（激昂·左）", cat: "attack" },
    ex_n_catch_claw_attack_success_r: { zh: "反钩爪抓取成功（激昂·右）", cat: "attack" },
    ex_catch_claw_attack_success_l: { zh: "反钩爪抓取成功（激昂·硬化·左）", cat: "attack" },
    ex_catch_claw_attack_success_r: { zh: "反钩爪抓取成功（激昂·硬化·右）", cat: "attack" },
    ex_n_catch_finish_punch_r: { zh: "抓取·终结拳（激昂·右）", cat: "attack" },
    ex_catch_attack_success_punch_r: { zh: "抓取·终结（激昂·硬化·右）", cat: "attack" },
    // 状态
    pump_up: { zh: "超斗气硬化（进入）", cat: "state", key: true },
    attack_chance: { zh: "捶胸（破绽）", cat: "special" },
    attack_chance2: { zh: "捶胸（破绽·激昂版）", cat: "special" },
    roar: { zh: "咆哮", cat: "special" },
    threat: { zh: "威吓", cat: "special" },
    threat_short: { zh: "威吓（短）", cat: "special" },
    intimidation: { zh: "愤怒吼叫", cat: "special" },
    marking: { zh: "标记", cat: "special" },
    refresh: { zh: "恢复", cat: "special" },
    idle_tired: { zh: "疲劳喘息", cat: "special" },
    sniff_combat_s: { zh: "嗅探（短）", cat: "special" },
    sniff_s: { zh: "嗅探（短·非战斗）", cat: "special" },
    sniff_combat_l: { zh: "嗅探（长）", cat: "special" },
    sniff_l: { zh: "嗅探（长·非战斗）", cat: "special" },
    half_lost_search_front: { zh: "丢失目标·向前索敌", cat: "special" },
    half_lost_search_back: { zh: "丢失目标·回头索敌", cat: "special" },
    lost_search: { zh: "丢失目标索敌", cat: "special" },
    peep_grass_search: { zh: "草丛搜索", cat: "special" },
    life_search_1: { zh: "环境搜索 1", cat: "special" }, life_search_2: { zh: "环境搜索 2", cat: "special" },
    life_search_3: { zh: "环境搜索 3", cat: "special" }, life_search_4: { zh: "环境搜索 4", cat: "special" },
    life_search_5: { zh: "环境搜索 5", cat: "special" },
    eat: { zh: "进食", cat: "special" }, drink: { zh: "饮水", cat: "special" }, sleep: { zh: "睡眠", cat: "special" },
    sunbath: { zh: "晒太阳", cat: "special" }, dying_sleep: { zh: "濒死睡眠", cat: "special" },
    return_fall_floor: { zh: "落地恢复", cat: "special" },
    predator_attack: { zh: "捕食攻击", cat: "special" }, predator_attack3: { zh: "捕食攻击 3", cat: "special" },
    predator_give_up: { zh: "放弃捕食", cat: "special" }, predator_eat: { zh: "捕食进食", cat: "special" },
    ride_rage_head: { zh: "骑乘·甩头", cat: "special" }, ride_rage_body: { zh: "骑乘·甩身", cat: "special" },
    ride_rage_crash_head: { zh: "骑乘·撞头", cat: "special" }, ride_rage_crash_body: { zh: "骑乘·撞身", cat: "special" },
    ride_rage_crash_head_lv2: { zh: "骑乘·撞头 2", cat: "special" }, ride_rage_crash_body_lv2: { zh: "骑乘·撞身 2", cat: "special" },
    ride_tired: { zh: "骑乘·疲劳", cat: "special" }, ride_wait: { zh: "骑乘·停顿", cat: "special" },
    // 移动 / 转身
    dash: { zh: "奔跑", cat: "move", effect: approach },
    dash_combat: { zh: "冲刺接近", cat: "move", effect: approach },
    dash_tired: { zh: "疲劳奔跑", cat: "move", effect: approach },
    walk: { zh: "步行", cat: "move", effect: approach },
    walk_combat: { zh: "战斗步行", cat: "move", effect: approach },
    walk_tired: { zh: "疲劳步行", cat: "move", effect: approach },
    dying_walk: { zh: "濒死移动", cat: "move" },
    fox_walk: { zh: "潜行", cat: "move" },
    quick_turn: { zh: "快速转身", cat: "turn", effect: face },
    turn: { zh: "转身", cat: "turn", effect: face },
    back_turn: { zh: "后跃转身", cat: "turn", effect: face },
    back_turn_short: { zh: "小后跃转身", cat: "turn", effect: face },
    back_turn_straight: { zh: "后跃（正面）", cat: "turn", effect: face },
    step_l: { zh: "左侧跳", cat: "turn" },
    step_r: { zh: "右侧跳", cat: "turn" },
    step_front: { zh: "前跳", cat: "turn" },
  };
  // 领地争夺（grapple_with_emXXX_*）
  const EMS = { em002: "火龙", em018: "黑狼鸟", em102: "毒妖鸟", em110: "浮眠龙", em111: "风漂龙", em011: "麒麟", em103: "灭尽龙", em024: "钢龙", em124: "冰呪龙", em026: "炎妃龙", em027: "炎王龙", em115: "尸套龙", em125: "溟波龙", em043: "恐暴龙" };
  const grapple = { first: "起手", start: "起手", adjust_wait: "对位", mediation: "接续" };
  for (const [em, zh] of Object.entries(EMS)) {
    for (const [k, z] of Object.entries(grapple)) actions[`grapple_with_${em}_${k}`] = { zh: `领地争夺·${zh}（${z}）`, cat: "special" };
  }

  // 逐词直译用词表
  const glossary = {
    ex: "激昂", n: "常态", kiai: "气合", beam: "光线", bullet: "弹", multi: "多发", start: "起手", swing: "挥扫", grab: "抓", wall: "墙",
    to: "到", idle: "待机", dempsey: "登普西", attack: "攻击", quadruple: "四连", triple: "三连", punch: "拳", turn: "转身", hook: "勾拳",
    head: "头", butt: "槌", back: "后", kick: "踢", jump: "跳", "5way": "五向", thunder: "雷", dive: "飞扑", spin: "回旋", straight: "直",
    rolling: "翻滚", body: "身体", press: "压", rush: "猛冲", long: "长", horn: "角", zigzag: "之字", step: "步", dig: "挖", up: "起",
    ground: "地面", special: "特殊", down: "下", damage: "受击", avoid: "回避", success: "成功", catch: "抓取", miss: "落空", finish: "终结",
    claw: "钩爪", pump: "膨胀", chance: "机会", roar: "咆哮", threat: "威吓", short: "短", intimidation: "威慑", marking: "标记",
    refresh: "恢复", tired: "疲劳", sniff: "嗅", combat: "战斗", s: "短", l: "左", r: "右", b: "B", d: "D", half: "半", lost: "丢失",
    search: "搜索", front: "前", peep: "窥", grass: "草", life: "生活", eat: "吃", drink: "喝", sleep: "睡", sunbath: "日光浴",
    dying: "濒死", walk: "走", dash: "冲刺", fox: "狐步", quick: "快速", ride: "骑乘", rage: "暴怒", crash: "撞", lv2: "2级", wait: "等待",
    predator: "捕食", give: "放弃", return: "返回", fall: "掉落", floor: "地面", grapple: "缠斗", with: "与", first: "首次", mediation: "调停",
    adjust: "调整", start3: "起手3", r2: "右2", "2": "2", "3": "3", "1": "1",
  };

  // ---------- 条件 ----------
  const conditions = {
    // 形态
    "function#101()": { zh: "超斗气硬化中", src: "exe", note: "exe：金狮子专属处理函数中 101() = uEm023[+0x20a90]。该标志由 pump_up 动作置位，置位函数要求怪物处于愤怒状态；硬化结束时清除", eval: (s) => !!s.pump },
    "function#102()": { zh: "本次愤怒尚未硬化过", src: "exe", toggle: true, default: true, note: "exe：102() = (uEm023[+0x20a98] == 0)。硬化中且愤怒时每帧把该标志锁存为 1，硬化结束时清零 → 每次愤怒最多硬化一次", eval: (s) => !s.pump && ("function#102()" in s.flags ? !!s.flags["function#102()"] : true) },
    "self.enraged()": { zh: "愤怒", eval: (s) => !!(s.enraged || s.pump) },
    "function#D0(5)": { zh: "激昂个体（亚种编号 = 5）", src: "exe", note: "exe：通用函数 D0(p) = 怪物亚种编号 == p。全部怪物的 THK 里只有金狮子（em023_05 激昂）与黑狼鸟（em018_05 伤痕黑狼鸟）用到 D0(5)，两者的 05 号亚种都存在。激昂金狮子恒为真", eval: () => true },
    "self.fatigued()": { zh: "疲劳", toggle: true },
    "self.in_combat()": { zh: "战斗中", eval: () => true },
    "self.hp_percent().leq(25)": { zh: "HP ≤ 25%" },
    // 目标
    "function#2D()": { zh: "目标是猎人", src: "exe", toggle: true, default: true, note: "exe：2D(0) 检查当前目标对象类型标志的 bit0；金狮子所有计数型特殊招（抓取、连发气弹、硬化特殊跳等）都以它为前提，推测为「目标是猎人/随从」" },
    "function#2D(1)": { zh: "目标类型标志 bit14（未知）", src: "exe", toggle: true, note: "exe：2D(1) 检查目标类型标志的 bit14。为真时主控改走 node_143 → 161~166 另一套攻击表" },
    "function#2D(2)": { zh: "目标是怪物", src: "exe", toggle: true, note: "exe：2D(2) 检查目标类型标志的 bit1；为真时摇摆冲拳换成对怪物版本" },
    "self.target.helpless_0()": { zh: "目标处于受击硬直", toggle: true },
    "self.target.pinned()": { zh: "抓取命中（目标被按住）", toggle: true, note: "抓取类动作后判定：为真走抓取成功分支，否则抓取落空" },
    "self.target.mudded()": { zh: "目标被泥浆困住", toggle: true },
    "self.target.in_combat()": { zh: "目标（怪物）在战斗中", toggle: true },
    "self.targetEnemy(target_em.any_monster)": { zh: "附近有其他大型怪物（领地争夺）", toggle: true },
    "self.above_target()": { zh: "目标在下方", toggle: true },
    "function#5D()": { zh: "丢失目标视野（烟雾弹）", toggle: true },
    "function#45()": { zh: "当前动作带特殊属性（跳过每轮前置检查）", src: "推测", toggle: true, note: "exe：45() 读取怪物当前动作的属性位并与全局掩码比较。为真且 R8=0 时，主控跳过反钩爪、硬化、领地争夺、选目标等前置检查" },
    "function#104()": { zh: "刚倒地回避成功", src: "exe", toggle: true, note: "exe：104() = 当前动作 == 200 TO_DAMAGE_DOWN_AVOID_SUCCESS。被打出硬化后倒地前碰到墙壁就会抓墙，此时激昂个体 100% 出抓墙横扫气功炮" },
    "function#106()": { zh: "需要恢复（106，虚函数）", src: "exe", toggle: true, note: "exe：106() 调用 uEm023 虚表 +0xc68；为真时出 refresh" },
    "function#2C(0,30)": { zh: "2C(0,30)：恒为假", src: "exe", note: "exe：2C 只在参数 1 = 2 时才比较数值，参数 1 为 0 时直接返回假 → node_104 的这两个分支是死代码", eval: () => false },
    "function#2C(0,60)": { zh: "2C(0,60)：恒为假", src: "exe", eval: () => false },
    "function#7F(1)": { zh: "钩爪抓在部位 1（推测左臂）", src: "推测", toggle: true },
    "function#7F(4)": { zh: "钩爪抓在部位 4（推测右臂）", src: "推测", toggle: true },
    "function#7F(2)": { zh: "钩爪抓在部位 2", src: "推测", toggle: true },
    "function#7F(3)": { zh: "钩爪抓在部位 3", src: "推测", toggle: true },
    "self.target(55)": { zh: "钩爪挂在身上", toggle: true },
    "self.target(3)": { zh: "目标类型 3（索敌相关）", toggle: true },
    "self.target(4)": { zh: "目标类型 4（索敌相关）", toggle: true },
    "self.target(0)": { zh: "目标在特殊地形（类型 0，推测高低差）", src: "推测", toggle: true },
    "self.target(0) @ parameter2:1": { zh: "目标在特殊地形（类型 0，参数 2 = 1）", src: "推测", toggle: true },
    "self.target(11)": { zh: "目标在特殊地形（类型 11）", src: "推测", toggle: true },
    "self.target(12)": { zh: "目标在特殊地形（类型 12）", src: "推测", toggle: true },
    "self.target(14)": { zh: "目标在特殊地形（类型 14）", src: "推测", toggle: true },
    "self.target(44)": { zh: "目标类型 44（2D(1) 攻击表用）", toggle: true },
    "self.target(52)": { zh: "目标类型 52（先冲刺接近）", toggle: true },
    "self.defense_downed()": { zh: "防御力下降", toggle: true },
    "function#31(49,3000)": { zh: "31(49,3000)：附近有特定目标", toggle: true },
    "self.quest_id(63149)": { zh: "任务 63149「MHW活动：力与技」", src: "代码", toggle: true, note: "任务名取自解包的 q63149_chS.gmd。该任务中激昂金狮子愤怒后 R12≥3 即硬化，不看血量" },
    "self.quest_id(51601)": { zh: "任务 51601「出来吧，破坏的化身」", src: "代码", toggle: true, note: "金狮子剧情任务；只在普通金狮子主控中使用" },
    "function#107()": { zh: "一次性事件标志 107", src: "exe", toggle: true, note: "exe：读到为真后立即清零" },
    "function#103()": { zh: "抓取命中处理（副作用）", src: "exe" },
    "function#109(3000,1)": { zh: "硬化抓取终结前的处理（副作用）", src: "exe", note: "exe：109(p1,p2) 遍历被抓目标以外、距离 p1 以内的其他猎人做距离判断；只在硬化抓取成功后调用，推测与零距离气功炮的波及/朝向有关" },
    "self.in_map(st.Elder_Recess).in_area(3)": { zh: "位于龙结晶之地 区域 3", toggle: true },
    "self.in_map(st.Ancient_Forest).in_area(13)": { zh: "位于古代树森林 区域 13", toggle: true },
    "self.in_map(st.Special_Arena).in_area(-1)": { zh: "位于斗技场", toggle: true },
    "self.in_map(st.Challenge_Arena).in_area(-1)": { zh: "位于竞技场", toggle: true },
    "self.in_map(st.Guiding_Lands).in_area(-1)": { zh: "位于导虫秘境", toggle: true },
    "self.targetEnemy(48)": { zh: "以抓住的目标为目标（副作用）" },
    "self.targetEnemy(target_em.random_player_or_cat)": { zh: "随机选择猎人/随从为目标（副作用）" },
    "self.targetEnemy(target_em.current_ai_target)": { zh: "以当前 AI 目标为目标（副作用）" },
    "self.clearTarget()": { zh: "清除目标（副作用）" },
    "self.force_area_change2()": { zh: "强制换区（副作用）" },
  };

  // ---------- 寄存器 ----------
  const registers = {
    RegisterVar12: { zh: "硬化计数", note: "愤怒且本次愤怒未硬化过(102)时每轮 +1；每轮开头（计数前）检查，达到阈值就出 pump_up 进入超斗气硬化并清零，即愤怒后先出满 8/6/4/2 轮招。阈值：HP>75% 为 8，≤75% 为 6，≤50% 为 4，≤25% 为 2（任务 63149 固定为 3）。进入愤怒时清零" },
    RegisterVar14: { zh: "抓取计数", note: "R15=0 时每轮 +1。≥5 后每轮 30% 尝试正面抓取（目标须在正前方锥形内、500~1400 距离）；≥15 时置 R15，下一轮必定抓取。代码里 ≥8/≥10 的 50%/70% 分支排在 ≥5 之后，是死代码" },
    RegisterVar15: { zh: "抓取待发", note: "为 1 时本轮必定抓取：正前方锥形内直接抓，否则按距离选择 前跳/翻滚跳砸/飞扑锤击 接抓取" },
    RegisterVar10: { zh: "硬化特殊跳计数", note: "超斗气硬化中且 R11=0 时每轮 +1；≥5 后 50%、≥6 后 75%、≥7 必定置 R11" },
    RegisterVar11: { zh: "硬化特殊跳待发", note: "为 1 时本轮出大跳跃强袭（≤300 先后跃，≤700 先猛冲，>2000 先冲刺）" },
    RegisterVar4: { zh: "连发气弹计数", note: "R5=0 时每轮 +1；≥4 后 10%、≥8 后 30%、≥12 必定置 R5" },
    RegisterVar5: { zh: "连发气弹待发", note: "为 1 时本轮出跳跃连发气弹（>1000 时再 30% 接飞扑锤击）" },
    RegisterVar1: { zh: "近身计数", note: "目标在 1000 内且 R2=0 时每轮 +1；≥4 后 10%、≥10 后 30%、≥16 必定置 R2" },
    RegisterVar2: { zh: "近身特殊招待发", note: "为 1 且目标在 1000 内时出 node_049：50% 猛冲 / 50% 后跃+翻滚跳砸" },
    RegisterVar13: { zh: "侧跳计数", note: "2000 内每轮 +1；700 内 ≥3、700~2000 ≥2 时清零并出 侧跳/后踢 → 70% 头槌（1200~1500 任意角度；550~1200 要求目标偏离正面 45° 以上）→ 按距离追加一招，然后 reset" },
    RegisterVar6: { zh: "反钩爪抓取冷却", note: "反钩爪抓取后 +1，之后每轮 +1；≥3 后每轮 10%、≥7 后 20%、≥11 后 50%、≥15 必定清零（清零后才能再次反钩爪抓取）" },
    RegisterVar8: { zh: "跳过前置检查的令牌", note: "换区、残血、Combat_THK_41 等上下文 +1；45() 为真时用掉一个令牌才执行前置检查" },
    RegisterVar9: { zh: "气功炮次数", note: "每次气功炮 +1；普通金狮子主控用它切换攻击表，激昂金狮子主控不读取" },
    RegisterVar3: { zh: "领地争夺计数", note: "与其他大型怪物对峙时累加，≥6/≥10 时强制换区" },
    RegisterVar16: { zh: "骑乘/盲目轮次" },
    RegisterVar17: { zh: "首次换区标志" },
    RegisterVar7: { zh: "非战斗行为计数" },
    RegisterVar0: { zh: "THK_28 计数" },
  };

  // ---------- THK 上下文 ----------
  const contexts = {
    Combat_Main: "战斗主控（激昂专属）：每轮决策从 node_000 开始，前置检查后按 距离×形态 查表，选完一招后 reset",
    Combat_Enter: "进入战斗",
    Search: "搜索",
    Discover: "发现目标",
    Rage_Enter: "进入愤怒：清零硬化计数 R12，后跃 + 愤怒吼叫",
    Exhaust_Enter: "进入疲劳",
    Exhaust_End: "疲劳结束",
    Mount: "被骑乘",
    Concealment: "隐蔽",
    Non_Combat_Main: "非战斗主控",
    Non_Combat_Hit: "非战斗受击",
    Combat_Area_Change: "战斗中换区",
    Combat_Critical_HP: "濒死：走向睡眠区域",
    Combat_Turf_War_A: "领地争夺 A",
    Combat_Turf_War_B: "领地争夺 B",
    Combat_Blinded: "闪光致盲",
    Combat_Blinded_Recovery: "致盲恢复",
    Target_Lost: "丢失目标",
    Global: "Global 招式库（THK 55）：与普通金狮子共用，用 D0(5) 区分激昂版本",
  };

  // ---------- 节点标题 ----------
  const nodes = {};
  const put = (file, id, zh, note) => { nodes[`${file}.node_${String(id).padStart(3, "0")}`] = note ? { zh, note } : { zh }; };

  // Combat_Main（激昂专属）
  [
    [0, "总控：每轮决策入口", "先 node_002（反钩爪/硬化/领地争夺/选目标），再 node_003（目标地形 → 各计数器 → 按距离×形态查表），最后 reset"],
    [1, "随机选目标并抓取（未被调用）", "普通金狮子主控的同位置节点调用的是 Global 中不存在的节点 401；激昂版改为 G011 抓取，但两者都没有任何节点调用"],
    [2, "每轮前置检查 A", "45() 为真时须用掉 R8 令牌才执行；依次：倒地回避/恢复 G104 → 硬化判定 G089 → 反钩爪抓取 G102 → 领地争夺 G146 → 选目标/烟雾弹 G237"],
    [3, "每轮前置检查 B + 主攻击表分发", "目标特殊地形 → 计数器累加（R12/R14/R10/R4/R1）→ 高低差 G245 → 抓取 G093/G092 → 硬化特殊跳 G099 → 连发气弹 G101 → 近身特殊招 G109 → 2D(1) G143 → 侧跳 G096；最后按距离 500/700/1000/1500/2300 与 硬化/愤怒/普通 进入 004~021"],
    [4, "主表 普通 ≤500"], [5, "主表 普通 500~700"], [6, "主表 普通 700~1000"], [7, "主表 普通 1000~1500"], [8, "主表 普通 1500~2300"],
    [9, "主表 普通 >2300：冲刺接近后按距离追加", "10% 冲到 500 / 10% 冲到 700 / 20% 冲到 1000 / 60% 冲到 1500，然后 G060：侧跳 + 按新距离出一招"],
    [10, "主表 愤怒 ≤500（= 普通表）"], [11, "主表 愤怒 500~700（= 普通表）"], [12, "主表 愤怒 700~1000（= 普通表）"],
    [13, "主表 愤怒 1000~1500（= 普通表）"], [14, "主表 愤怒 1500~2300（= 普通表）"], [15, "主表 愤怒 >2300（= 普通表）"],
    [16, "主表 硬化 ≤500"], [17, "主表 硬化 500~700"], [18, "主表 硬化 700~1000"], [19, "主表 硬化 1000~1500"], [20, "主表 硬化 1500~2300"],
    [21, "主表 硬化 >2300（= 普通表）"],
  ].forEach((a) => put(M, ...a));

  // Global（55）
  [
    [1, "摇摆冲拳（硬化时 700 内后方 70% 接四连拳）", "对怪物 2D(2) 用对怪物版；700 内为近距离版，激昂+硬化且目标在背后半圈(90°~270°)时 70% 接四连拳·雷断层"],
    [2, "回旋攻击 → 捶胸", "目标在背后时先转身；1000 内且不在正面 ±30° 时用普通版，否则正面版；之后捶胸（破绽）"],
    [3, "回旋攻击（正面）→ 捶胸"],
    [4, "翻滚跳砸 → 按距离追加", "激昂个体用激昂版；之后 G059 按距离再出一招"],
    [5, "泰山压顶 → 捶胸"],
    [6, "转身勾拳"],
    [7, "头槌 → 按距离追加"],
    [8, "猛冲 → 追加", "1500 内用近版；之后（非 2D(1)）1000 内 60% 捶胸 / 40% 气功炮，1500 内 30% 捶胸 / 20% 气功炮 / 50% 无"],
    [9, "猛冲（近版，无追加）"],
    [10, "之字步突进", "1200 内且目标偏离正面 >60° 时改为猛冲；1200~2500 / >2500 用两种之字步（先转身）"],
    [11, "抓取", "先冲到 1300 内；按距离判断目标是否在正前方锥形内（±30°/25°/20°/15°/10°）：在则转身+正面扑抓，否则转身扑抓。命中后：激昂+硬化 → 硬化版终结（社区称零距离嘴炮）；激昂 → 激昂版终结拳；落空接捶胸"],
    [12, "抓取（转身扑抓版）"],
    [13, "转身勾拳 → 四连拳（激昂）/ 三连拳", "激昂个体：转身勾拳，硬化中且 700 内再接四连拳·雷断层；普通金狮子：三连拳或掀地投石"],
    [14, "大跳跃强袭"], [15, "后跃 → 大跳跃强袭"], [16, "猛冲 → 大跳跃强袭"], [17, "冲刺 → 大跳跃强袭"],
    [18, "气功炮（激昂版）", "先 R9+1；激昂个体用激昂版"],
    [19, "跳跃气弹"], [20, "横扫气功炮"], [21, "跳跃连发气弹"],
    [22, "飞扑锤击（近距离改为 50% 前跳/翻滚跳砸接飞扑）→ 侧跳追加表 066"],
    [23, "飞扑锤击 → 按距离追加", "1000 内：50% G030 / 50% G031；2300 内直接飞扑；更远先冲刺；之后 G059 按距离再出一招"],
    [24, "跳跃锤地·五向雷"],
    [25, "五向雷组合", "1000 内 50% 先后跳；然后 1000 内 G043、2300 内直接五向雷、更远先冲刺"],
    [26, "（1000 内先猛冲）→ 气功炮"],
    [27, "（1000 内先猛冲）→ 跳跃连发气弹 → 30% 飞扑", "1000 外再 30% 接飞扑锤击 G022"],
    [30, "猛冲 → 飞扑锤击"], [31, "后跃 → 翻滚跳砸 → 飞扑锤击"], [32, "冲刺 → 飞扑锤击"],
    [38, "跳跃连发气弹 → 30% 飞扑"], [39, "1000 外 30% 接飞扑锤击"],
    [41, "后跃 → 五向雷"], [43, "猛冲 → 五向雷（500 内先后跃）"], [44, "冲刺 → 五向雷"],
    [45, "侧跳 / 后踢（按距离与角度）"], [46, "侧跳（普通金狮子）"], [47, "侧跳（左右）"],
    [48, "侧跳 / 后踢（激昂）", "先冲到 1200 内；700 内：侧面 60% 侧跳 / 20% 换侧 / 20% 后踢，背后 50% 后踢 / 20% / 30% 前跳"],
    [49, "近身特殊招：50% 猛冲 / 50% 后跃+翻滚跳砸"],
    [50, "（无）"], [51, "侧跳（反向）"], [52, "侧跳（远离目标）"],
    [53, "正前方锥形内的侧跳"], [54, "侧跳 / 后踢（远距离表前置）"],
    [55, "左侧跳"], [56, "右侧跳"], [57, "前跳"], [58, "后踢"],
    [59, "追加攻击：按距离分发", "≤500 → 061，≤700 → 062，≤1000 → 063，≤1500 → 064，否则 065"],
    [60, "侧跳 + 追加攻击", "先 G054 侧跳/后踢，再按距离 061~065（2300 外不追加）"],
    [61, "追加表 ≤500"], [62, "追加表 500~700"], [63, "追加表 700~1000"], [64, "追加表 1000~1500"], [65, "追加表 >1500"],
    [66, "飞扑后追加：按距离分发"], [67, "飞扑后追加 ≤500"], [68, "飞扑后追加 500~700"], [69, "飞扑后追加 700~1000"], [70, "飞扑后追加 1000~1500"], [71, "飞扑后追加 >1500"],
    [72, "二段追加：按距离分发"], [73, "二段追加 ≤500"], [74, "二段追加 500~700"], [75, "二段追加 700~1000"], [76, "二段追加 1000~1500"], [77, "二段追加 >1500"],
    [78, "侧跳 → 头槌 → 追加", "激昂个体在 1200 内且目标不在正前方 ±45° 时直接按距离追加；否则 侧跳/后踢 + G097"],
    [80, "后跃 → 翻滚跳砸 → 追加"],
    [83, "侧跳 → 抓取"], [84, "翻滚跳砸 → 抓取"], [85, "飞扑锤击 → 抓取"], [86, "冲刺 → 抓取（按距离）"],
    [87, "捶胸（破绽）"], [88, "超斗气硬化（pump_up）"],
    [89, "硬化判定", "愤怒且 102()（本次愤怒尚未硬化）时：R12 达到阈值（HP>75%: 8 / ≤75%: 6 / ≤50%: 4 / ≤25%: 2；任务 63149: 3）→ 清零并出 pump_up"],
    [90, "硬化计数 R12 +1（愤怒且未硬化过）"],
    [91, "抓取计数 R14 +1（R15=0 时）"],
    [92, "抓取判定（按距离）", "目标非硬直/被按住且为猎人：R15≥1 时按距离出抓取组合并 reset；否则 R14≥15 时置 R15"],
    [93, "抓取判定（正前方）", "R15≥1 → G094；R14≥5 → 30% G094。≥8/≥10 分支排在 ≥5 之后，永远不会执行"],
    [94, "正前方锥形内抓取", "目标在 500~1400 且处于正前方锥形内时：清零 R14/R15，抓取并 reset；否则返回"],
    [95, "受击硬直时抓取（未被调用）"],
    [96, "侧跳计数 R13", "2000 内每轮 +1；700 内 ≥3、700~2000 ≥2 时：侧跳/后踢 → G097 头槌 → G059 追加 → reset"],
    [97, "70% 头槌 → 追加 → reset", "激昂个体：550~1200 时目标须偏离正面 45° 以上，1200~1500 任意角度；之后 G059 按距离追加"],
    [98, "硬化特殊跳计数 R10 +1（硬化中且 R11=0）"],
    [99, "硬化特殊跳判定", "硬化中：R11≥1 → 大跳跃强袭并 reset；否则 R10 ≥5/6/7 时 50%/75%/100% 置 R11"],
    [100, "连发气弹计数 R4 +1（R5=0 时）"],
    [101, "连发气弹判定", "R5≥1 → G038 跳跃连发气弹并 reset；否则 R4 ≥12/8/4 时 100%/30%/10% 置 R5"],
    [102, "反钩爪抓取判定（R6 冷却）", "R6=0 时按 HP 以 60%/30%/80%/50%/30%（HP >80/≤80/≤60/≤40/≤20）进入 G103；R6≥1 时每轮推进冷却"],
    [103, "反钩爪抓取", "钩爪抓在部位 1/4 时转身抓取挂在手臂上的猎人；之后（无论是否抓到）部位 1/4 时 50% 摇摆冲拳 / 50% 回旋，部位 2/3 时 50% 后踢 / 50% 回旋"],
    [104, "倒地回避 / 恢复", "104()（刚倒地回避成功）时：激昂个体 100% 抓墙横扫气功炮（2C 分支恒假）；普通金狮子倒地回避反击。106() 时恢复"],
    [105, "倒地回避后反击"], [106, "抓墙横扫气功炮（直接收招）"], [107, "抓墙横扫气功炮 → 倒地回避反击"],
    [108, "近身计数 R1 +1（1000 内且 R2=0）"],
    [109, "近身特殊招判定", "1000 内：R2≥1 → G049；否则 R1 ≥16/10/4 时 100%/30%/10% 置 R2"],
    [110, "R9 +1（气功炮次数）"], [111, "R9 清零"],
    [112, "特殊地形攻击"], [113, "气功炮"], [114, "转身（战斗中为快速转身）"],
    [115, "转身（偏离 >10°）"], [116, "转身（偏离 >30°）"], [117, "转身（偏离 >60°）"], [118, "转身（偏离 >80°）"],
    [119, "转身（目标在背后半圈）"], [120, "转身（偏离 >100°）"], [121, "转身（偏离 >120°）"],
    [122, "后跃转身"], [123, "后跃（正面）"], [124, "小后跃转身"], [125, "800 内小后跃，否则转身"],
    [126, "回旋攻击 → 捶胸"], [127, "泰山压顶 → 捶胸"], [128, "（背后先转身勾拳）掀地投石"], [129, "转身勾拳 → 四连拳（激昂）"],
    [143, "2D(1) 时改用 161~166 攻击表"], [144, "2D(1)：非硬化时 60% 侧跳+头槌"], [145, "550~1000 时 50% 头槌"],
    [146, "领地争夺 / 其他怪物", "附近有其他大型怪物时按种类选择应对（威吓/咆哮/攻击）；防御力下降时 50% 对当前目标放气功炮"],
    [152, "防御力下降时 50% 气功炮"], [159, "强制换区"],
    [161, "2D(1) 攻击表分发"], [162, "2D(1) 表 ≤500"], [163, "2D(1) 表 500~700"], [164, "2D(1) 表 700~1000"], [165, "2D(1) 表 1000~1500"], [166, "2D(1) 表 >1500"],
    [172, "嗅探（短）"], [173, "嗅探（长）"], [174, "恢复"], [175, "疲劳喘息"], [176, "咆哮"], [177, "威吓（短）"], [178, "威吓"], [179, "愤怒吼叫"],
    [237, "选目标 / 泥浆 / 烟雾弹", "每轮随机选择猎人或随从为目标；目标被泥浆困住时冲到 1500 内放气功炮；烟雾弹 5D() 时清除目标、回头/向前索敌"],
    [238, "丢失目标后的索敌方向"], [241, "目标类型 3/4：移动到区域 19 并索敌"], [244, "R8 +1"],
    [245, "高低差处理", "目标类型 52 或垂直距离 >450（龙结晶之地区域 3 为 >400）时：冲到 500 内并 侧跳+追加一招；不 reset，之后继续本轮选招"],
    [246, "目标类型 12：特殊地形"], [247, "古代树区域 13 的地形攻击"], [248, "目标类型 0/14：高低差攻击"],
    [249, "跳上/跳下高处攻击"], [250, "跳上高处或冲过去"], [251, "75% 气功炮 / 25% 泰山压顶（疲劳时必泰山压顶）"],
    [252, "目标类型 11：冲刺后地形攻击"], [253, "钩爪挂身时的反击", "硬化：30% 转身勾拳→四连拳 / 40% 摇摆冲拳 / 30% 回旋；否则 30% 泰山压顶 / 40% 摇摆冲拳 / 30% 回旋"],
  ].forEach((a) => put(G, ...a));
  for (let i = 207; i <= 234; i++) if (!nodes[`${G}.node_${i}`]) put(G, i, "冲刺接近（最多 3 次）");

  MHWI.registerAnno("em023_05", {
    monster: { key: "em023_05", em: "em023", zh: "激昂金狮子", full: "激昂金狮子", en: "Furious Rajang", internalId: 92 },
    scope: "rajang",
    actions, conditions, registers, contexts, nodes, glossary,
    movesHeader: "招式（中文名）",
    movesNote: "「招式」一列的中文名由本项目按内部名与攻略/wiki 的招式描述拟定（如「超解」即五向雷、硬化抓取即「零距离嘴炮」）。",
    entry: { file: M, node: "node_000" },
    state: {
      defaults: { enraged: false, pump: false, hp: 100, dist: 800, angle: 0, vert: 0, regs: {}, flags: {} },
      controls: [
        {
          id: "m", zh: "形态",
          options: [
            { id: "n", zh: "普通", note: "激昂金狮子始终是金毛形态；这里指未愤怒" },
            { id: "r", zh: "愤怒", note: "激昂个体的愤怒主表与普通主表完全相同；愤怒只影响硬化计数" },
            { id: "p", zh: "超斗气硬化", note: "pump_up 之后：双臂硬化，主表换成硬化表并开始累计大跳跃强袭计数（必须在愤怒中）" },
          ],
          get: (s) => (s.pump ? "p" : s.enraged ? "r" : "n"),
          set: (s, v) => { s.pump = v === "p"; s.enraged = v !== "n"; },
        },
      ],
      checks: [],
      common: ["function#102()", "function#2D()", "self.target.helpless_0()", "self.target.pinned()", "self.target(55)", "function#7F(1)", "function#7F(4)", "function#104()", "function#5D()", "self.fatigued()", "self.quest_id(63149)"],
      presets: [["正面 400", 400, 0], ["正面 900", 900, 0], ["正面 1300", 1300, 0], ["侧面 800", 800, 90], ["背后 600", 600, 180], ["中距离 2000", 2000, 0], ["远处 3000", 3000, 0]],
    },
    // 俯视示意轮廓（游戏单位，原点为判定视点，前方为 -y）
    silhouette: (s) => {
      const arm = s.pump ? 520 : 470;
      const body = [[0, -520], [90, -500], [130, -420], [300, -330], [330, -150], [260, 120], [230, 360], [120, 460], [0, 470]];
      const armL = [[260, -300], [arm, -360], [arm + 60, -560], [arm - 40, -620], [arm - 100, -420], [240, -180]];
      const leg = [[150, 330], [330, 380], [360, 600], [260, 620], [160, 470]];
      const tail = [[30, 440], [70, 700], [40, 1050], [0, 1100]];
      const flip = (pts) => pts.map(([x, y]) => [-x, y]);
      return [
        { cls: "wing", pts: armL }, { cls: "wing", pts: flip(armL) },
        { cls: "wing", pts: leg }, { cls: "wing", pts: flip(leg) },
        { cls: "body", pts: tail, mirror: true },
        { cls: "body", pts: body, mirror: true },
      ];
    },
    minorCats: ["move", "turn"],
    // 模拟器提示：动作对站位的影响是近似模型
    simNote: "模拟假设猎人原地不动：冲刺/步行接近后距离 = 该动作的停止距离；转身后正对目标；飞扑、翻滚跳砸、猛冲、之字步、泰山压顶、大跳跃强袭、五向雷等突进攻击落地后视为贴身（距离 400、正对）。追加攻击按此距离查表。",
    scale: { bodyLength: 1500, ringMax: 3500 },
  });
})();
