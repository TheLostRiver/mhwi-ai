/*
 * 煌黑龙 Alatreon (em050_00) 注释库
 *
 * 煌黑龙没有任何计时机制：属性切换、起飞/降落、终结审判全部按「轮数」计数（每轮 = 主控一次决策，通常是 1~3 招的连段）。
 * 属性（活性）存在 uEm050 +0x208e0（0 无活性 / 1 炎 / 2 冰 / 3 龙），只由动作（转龙、审判）与属性压制倒地改写。
 *
 * 来源与可信度标记:
 *   [代码]  直接由 THK 反编译结果读出，确定
 *   [exe]   游戏 exe（版本 421810）逆向分析，见 docs/em050-alatreon.md「exe 逆向」一节
 *   [rentry] noderoo《Alatreon AI Observations》（2024-03-26）
 *   [攻略]  游民星空 雨酱《煌黑龙招式拆解及打法详解》（2020-07-21）、Mr独行远方《煌黑龙起飞机制探究》（2020-08-27）、
 *           巴哈姆特 肆伍陸《煌黑龍攻略情報彙整》
 *   [推测]  本项目根据代码结构推断，未经实机验证
 */
(function () {
  const G = "em050_55"; // Global（THK 55）
  const M = "em050_00"; // Combat_Main（THK 00）

  // 冲刺/滑翔接近：第一个参数为 2 时第 5 个参数是停止距离，否则第 4 个（模拟器假设猎人原地不动）
  const approach = (s, a) => {
    const stop = a[0] === 2 ? a[4] : a[3];
    if (stop !== undefined && a.length >= 4 && s.dist > stop) { s.dist = stop; s.angle = 0; }
  };
  const face = (s) => { s.angle = 0; };
  // 扑向目标的攻击：落地后视为贴身（模拟假设：距离 400、正对）
  const lunge = (s) => { s.dist = Math.min(s.dist, 400); s.angle = 0; };
  const fly = (s) => { s.flying = true; };
  const land = (s) => { s.flying = false; };

  // ---------- 动作 ----------
  const actions = {
    // 属性切换 / 审判
    elemental_explosion_to_fire: { zh: "终结审判（之后转炎）", cat: "state", key: true, effect: (s) => { s.elem = 1; s.flying = false; } },
    elemental_explosion_to_ice: { zh: "终结审判（之后转冰）", cat: "state", key: true, effect: (s) => { s.elem = 2; s.flying = false; } },
    mode_change_to_dragon_ground: { zh: "魔龙炼化（转龙活性）", cat: "state", key: true, effect: (s) => { s.elem = 3; } },
    mode_change_to_dragon_fly: { zh: "魔龙炼化（空中转龙，实际不会触发）", cat: "state", effect: (s) => { s.elem = 3; } },
    mode_change_to_fire: { zh: "转炎活性（开场）", cat: "state" }, mode_change_to_ice: { zh: "转冰活性（开场）", cat: "state" },
    // 炎
    big_fire_ball: { zh: "地爆三星（大火球三连爆）", cat: "attack", key: true },
    straight_fire_laser_ground: { zh: "极炎加农（地面直线火焰）", cat: "attack", key: true },
    straight_fire_laser_fly: { zh: "阳炎加农（空中直线火焰）", cat: "attack" },
    sweep_fire_laser_turn: { zh: "爆炎灭碎阵（横扫火焰）", cat: "attack", key: true },
    hot_blast: { zh: "绝对熔点领域（对地圆形火焰，降落）", cat: "attack", key: true, effect: land },
    rotate_fire_laser: { zh: "天灭玄舞击（空中旋转火焰）", cat: "attack" },
    winding_fire_laser: { zh: "炎阳怒息（空中横扫火焰）", cat: "attack" },
    fire_breath_ground: { zh: "火球吐息（地面）", cat: "attack" },
    back_step_fire_breath_to_ground: { zh: "后跳火球吐息", cat: "attack" },
    back_step_fire_breath_to_fly: { zh: "后跳火球起飞（炎活性起飞招）", cat: "attack", effect: fly },
    fire_breath_fly: { zh: "火球吐息（空中）", cat: "attack" }, triple_fire_breath: { zh: "三连火球（空中，未使用）", cat: "attack" },
    under_fire_breath_to_fly: { zh: "对地火焰吐息（空中）", cat: "attack" }, under_fire_breath_to_ground: { zh: "对地火焰吐息（落地，未使用）", cat: "attack", effect: land },
    // 冰
    ice_breath_ground: { zh: "冻牙炮（直线冰锥·地面）", cat: "attack" }, ice_breath_fly: { zh: "冻牙炮（空中）", cat: "attack" },
    ice_breath_3way_ground: { zh: "三向冰锥（地面）", cat: "attack" }, ice_breath_3way_fly: { zh: "冰牙连弹击（空中扩散冰锥）", cat: "attack" },
    ice_machinegun_breath: { zh: "极冰连牙（冰锥机关炮）", cat: "attack" },
    ice_meteor: { zh: "寒岭天冰（冰锥雨，冰活性起飞招）", cat: "attack", key: true, effect: fly },
    round_ice_breath: { zh: "环形冰吐息", cat: "attack" },
    under_freeze_breath_g2g: { zh: "绝对零度领域（对地冻结吐息·地面）", cat: "attack", key: true },
    under_freeze_breath_to_fly: { zh: "对地冻结吐息（空中）", cat: "attack" }, under_freeze_breath_to_ground: { zh: "对地冻结吐息（落地，未使用）", cat: "attack", effect: land },
    freeze_laser: { zh: "钻石冰尘（直线冰雾）", cat: "attack", key: true },
    // 水（炎/冰活性空中都会用）
    water_breath: { zh: "水弹（空中）", cat: "attack" },
    water_breath_3way: { zh: "月华·雹雨（空中扩散水弹）", cat: "attack" },
    water_machinegun_breath: { zh: "断空·落星（水流机关炮）", cat: "attack" },
    straight_water_laser: { zh: "照星·崩流（空中直线水流）", cat: "attack" },
    rotate_water_laser: { zh: "沧海·螺旋（空中旋转水流）", cat: "attack" },
    winding_water_laser: { zh: "水神·青龙（空中横扫水流）", cat: "attack" },
    // 雷
    new_homing_thunder_start: { zh: "雷鸣缚封招（跟踪雷）", cat: "attack", key: true },
    // 跟踪雷每一道随机纵/横，归为「后续段」以免同一招拆成多条序列
    new_homing_thunder_vertical: { zh: "跟踪雷·纵", cat: "sub" }, new_homing_thunder_horizontal: { zh: "跟踪雷·横", cat: "sub" },
    new_homing_thunder_vertical_last: { zh: "跟踪雷·纵（最后一道）", cat: "sub" }, new_homing_thunder_horizontal_last: { zh: "跟踪雷·横（最后一道）", cat: "sub" },
    wave_thunder: { zh: "骤雷天鸣剡（五排雷）", cat: "attack", key: true },
    around_thunder: { zh: "周身落雷", cat: "attack" }, around_thunder2: { zh: "周身落雷 2", cat: "attack" },
    // 龙 / 体术
    scratch: { zh: "闪裂绝掌击（耳刮子）", cat: "attack" },
    head_sweep: { zh: "魔神双连击（甩头）", cat: "attack" },
    turn_reversal_combat: { zh: "转身", cat: "turn", effect: face }, tail_whip: { zh: "甩尾", cat: "attack" },
    short_step_head_butt: { zh: "小步头槌", cat: "attack" },
    rush_once: { zh: "龙车（单次）", cat: "attack" }, rush_once2: { zh: "龙车（单次）2", cat: "attack" },
    rush_twice_start: { zh: "真·龙车（来回两次）", cat: "attack", key: true }, rush_twice_start2: { zh: "真·龙车 2", cat: "attack" },
    rush_once_to_fly: { zh: "龙车起飞（未使用）", cat: "attack", effect: fly }, rush_once_to_fly2: { zh: "龙车起飞 2（未使用）", cat: "attack", effect: fly },
    press_attack: { zh: "魔王狱空破（拜年）", cat: "attack", key: true, effect: lunge },
    back_step_glide_attack: { zh: "凤凰天翔（空中急袭）", cat: "attack", effect: lunge },
    dragon_nova_ground: { zh: "龍魂黯滅殺（龙魂释放·地面）", cat: "attack", key: true },
    dragon_nova_fly: { zh: "龍魂黯滅殺（龙魂释放·空中）", cat: "attack", key: true, effect: lunge },
    rush_fly: { zh: "煌尘疾风（空中龙车）", cat: "attack" }, rush_fly2: { zh: "煌尘疾风 2", cat: "attack" },
    rush_fly_to_ground: { zh: "空中龙车降落", cat: "attack", effect: land },
    dragon_punch_start: { zh: "胧月刹空击（空中叩击）", cat: "attack", key: true },
    dragon_punch_loop: { zh: "空中叩击·追加", cat: "sub" }, dragon_punch_end: { zh: "空中叩击·落下", cat: "sub" },
    tail_sweep: { zh: "空中扫尾", cat: "attack" },
    // 状态 / 特殊
    chance: { zh: "破绽（喘息）", cat: "special" }, unique_chance_fly: { zh: "破绽（空中）", cat: "special" },
    threat_short: { zh: "威吓", cat: "special" }, threat_short_fly: { zh: "威吓（空中）", cat: "special" },
    discover: { zh: "发现", cat: "special" }, discover_fly: { zh: "发现（空中）", cat: "special" },
    search_fly: { zh: "索敌（空中）", cat: "special" }, combat_search: { zh: "战斗索敌", cat: "special" },
    lost_search: { zh: "丢失目标索敌", cat: "special" }, life_search: { zh: "环顾", cat: "special" }, anger_search: { zh: "愤怒索敌", cat: "special" },
    refresh: { zh: "清醒", cat: "special" },
    die: { zh: "死亡（内部名，含义未确认）", cat: "special", note: "只出现在 G376：目标状态 0/14（猎人攀墙或乘翼龙/滑索）且煌黑龙 above_area 时的边缘分支" },
    ride_rage_head: { zh: "骑乘·甩头", cat: "special" }, ride_rage_head_lv2: { zh: "骑乘·甩头 2", cat: "special" },
    ride_rage_body: { zh: "骑乘·甩身", cat: "special" }, ride_rage_body_lv2: { zh: "骑乘·甩身 2", cat: "special" },
    ride_rage_crash_head: { zh: "骑乘·撞头", cat: "special" }, ride_rage_crash_head_lv2: { zh: "骑乘·撞头 2", cat: "special" },
    ride_rage_crash_body: { zh: "骑乘·撞身", cat: "special" }, ride_rage_crash_body_lv2: { zh: "骑乘·撞身 2", cat: "special" },
    ride_tired: { zh: "骑乘·疲劳", cat: "special" },
    // 移动 / 转身 / 起降
    take_off: { zh: "起飞", cat: "move", effect: fly }, take_off_switch_pattern_by_dist: { zh: "起飞（按距离）", cat: "move", effect: fly },
    landing: { zh: "降落", cat: "move", effect: land }, sudden_rise: { zh: "急速上升", cat: "move", effect: fly }, sudden_drop: { zh: "急速下降", cat: "move", effect: land },
    dash: { zh: "冲刺", cat: "move", effect: approach }, dash_no_interrupt: { zh: "冲刺（不可打断）", cat: "move", effect: approach },
    walk: { zh: "步行", cat: "move", effect: approach },
    glide: { zh: "滑翔", cat: "move", effect: approach }, glide_combat: { zh: "滑翔接近", cat: "move", effect: approach },
    glide_direct_move: { zh: "滑翔移动", cat: "move", effect: approach },
    turn: { zh: "转身", cat: "turn", effect: face }, turn_fly: { zh: "空中转身", cat: "turn", effect: face },
    quick_turn: { zh: "快速转身", cat: "turn", effect: face }, quick_turn_fly: { zh: "空中快速转身", cat: "turn", effect: face },
    back_turn: { zh: "后退转身", cat: "turn", effect: face },
    turn_step_front_l: { zh: "前滑步（左）", cat: "turn" }, turn_step_front_r: { zh: "前滑步（右）", cat: "turn" },
    turn_step_back_l: { zh: "后滑步（左）", cat: "turn" }, turn_step_back_r: { zh: "后滑步（右）", cat: "turn" },
    turn_step_side_l: { zh: "侧滑步（左）", cat: "turn" }, turn_step_side_r: { zh: "侧滑步（右）", cat: "turn" },
    step_back_fly: { zh: "空中后退", cat: "turn" }, short_up_step_fly: { zh: "空中小上升", cat: "turn" }, short_down_step_fly: { zh: "空中小下降", cat: "turn" },
  };

  const glossary = {
    elemental: "属性", explosion: "爆发", to: "到", fire: "炎", ice: "冰", mode: "模式", change: "切换", dragon: "龙", ground: "地面",
    fly: "空中", big: "大", ball: "球", straight: "直线", laser: "激光", sweep: "横扫", turn: "转身", hot: "灼热", blast: "爆发",
    rotate: "旋转", winding: "蜿蜒", breath: "吐息", back: "后", step: "步", triple: "三连", under: "对地", "3way": "三向",
    machinegun: "机关炮", meteor: "流星", round: "环形", freeze: "冻结", g2g: "地对地", water: "水", new: "新", homing: "追踪",
    thunder: "雷", start: "起手", vertical: "纵", horizontal: "横", last: "最后", wave: "波", around: "周身", scratch: "拍击",
    head: "头", reversal: "反转", combat: "战斗", tail: "尾", whip: "鞭", short: "小", butt: "槌", rush: "冲撞", once: "一次",
    once2: "一次2", twice: "两次", start2: "起手2", press: "压", attack: "攻击", glide: "滑翔", nova: "新星", punch: "拳",
    loop: "循环", end: "结束", chance: "破绽", unique: "专属", threat: "威吓", discover: "发现", search: "索敌", lost: "丢失",
    life: "生活", anger: "愤怒", refresh: "清醒", die: "死亡", ride: "骑乘", rage: "暴怒", body: "身", crash: "撞", lv2: "2级",
    tired: "疲劳", take: "起", off: "飞", "switch": "切换", pattern: "模式", by: "按", dist: "距离", landing: "降落",
    sudden: "急", rise: "升", drop: "降", dash: "冲刺", no: "不", interrupt: "打断", walk: "步行", direct: "直接", move: "移动",
    quick: "快速", front: "前", side: "侧", l: "左", r: "右", up: "上", down: "下", once_to: "一次到", "2": "2",
  };

  // ---------- 条件 ----------
  const fromFire = (s) => (s.elem === 1 ? true : s.elem === 2 ? false : !!s.fromFire);
  const conditions = {
    "function#101(1)": { zh: "炎活性", src: "exe", note: "exe：煌黑龙专属函数 101(p) = 属性 +0x208e0 == p（0 无活性、1 炎、2 冰、3 龙）", eval: (s) => s.elem === 1 },
    "function#101(2)": { zh: "冰活性", src: "exe", eval: (s) => s.elem === 2 },
    "function#101(3)": { zh: "龙活性", src: "exe", eval: (s) => s.elem === 3 },
    "function#101()": { zh: "无活性", src: "exe", note: "属性压制倒地期间属性为 0", eval: (s) => s.elem === 0 },
    "function#101(4)": { zh: "属性 == 4（不存在，恒假）", src: "exe", note: "属性只有 0~3，所以 101(4) 恒假，后面的 35% 破绽分支是死代码", eval: () => false },
    "function#102()": { zh: "本次龙活性已破角", src: "exe", toggle: true, note: "exe：102() 读 +0x208f8；部位破坏回调 0x1404c8530 在破坏事件 bit0 为真时置 1，0x1404c89c0 清零。为真时终结审判回到原来的属性，否则换到另一个属性" },
    "function#103(3,40)": { zh: "目标 HP ≤ 40%", src: "exe", toggle: true, note: "exe：103(op,v) 取目标血量比例 ×100 后用通用比较函数比较，op=3 为 ≤（与冰呪龙的 10E 相同）" },
    "function#104()": { zh: "本周期的炎/冰是炎", src: "exe", note: "exe：104(p) = +0x20a94 == p；属性设置函数 0x1404c6450 切到炎时写 0、切到冰时写 1、切到龙时不变。所以 104() 表示「当前（或转龙之前）的炎/冰属性是炎」", eval: fromFire },
    "self.flying()": { zh: "飞行中", eval: (s) => !!s.flying },
    "self.enraged()": { zh: "愤怒", eval: (s) => !!s.enraged },
    "self.fatigued()": { zh: "疲劳", toggle: true },
    "self.target.helpless_0()": { zh: "目标倒地 / 受击硬直", toggle: true, note: "普通攻击表开头 40% 跳过普通攻击；每轮末 50% 不换目标再来一轮" },
    "self.target.helpless_1()": { zh: "目标处于另一种受击状态（被压制等）", toggle: true },
    "self.target(44)": { zh: "目标是随从猫", src: "exe", toggle: true, note: "exe：目标标志 bit14（uOtomo）。为真时不走追加攻击（019~023 等）" },
    "self.target(55)": { zh: "钩爪挂在身上", toggle: true },
    "function#7F()": { zh: "钩爪抓附（任意部位）", src: "推测", toggle: true, note: "为真时龙大招必出 魔王狱空破（拜年）" },
    "function#7F(3)": { zh: "钩爪抓在部位 3", src: "推测", toggle: true },
    "function#7F(14)": { zh: "钩爪抓在部位 14", src: "推测", toggle: true },
    "function#7F(16)": { zh: "钩爪抓在部位 16", src: "推测", toggle: true },
    "function#AF(5000)": { zh: "离下方地面 ≤ 5000（可直接降落）", src: "exe", toggle: true, default: true, note: "exe：AF(h) 取怪物下方地面高度，高度差 ≤ h 为真；否则先飞到区域空中中心再降落" },
    "function#5D()": { zh: "丢失目标视野（烟雾弹）", toggle: true },
    "function#52(0,2)": { zh: "52(0,2)：寻路/区域查询", src: "exe", toggle: true, note: "exe：通用函数 52 做导航区域查询（含义未确认）。为真时审判前先冲刺到最近的入口附近" },
    "function#52(0,4)": { zh: "52(0,4)：寻路/区域查询", toggle: true },
    "function#54()": { zh: "54()：寻路相关（副作用）" },
    "function#11(900)": { zh: "与目标高度差 ≤ 900（推测）", src: "推测", toggle: true, note: "exe：通用函数 11(h) 比较怪物高度与另一坐标（推测为目标）的高度差 ≤ h。飞行时 G359 在它为真且不在区域上空时不滑翔接近，否则每轮先 G371 滑翔到离目标 200 处" },
    "function#11(1000)": { zh: "与目标高度差 ≤ 1000（推测）", src: "推测", toggle: true },
    "function#11(1500)": { zh: "与目标高度差 ≤ 1500（推测）", src: "推测", toggle: true }, "function#11(500)": { zh: "与目标高度差 ≤ 500（推测）", src: "推测", toggle: true },
    "function#AD()": { zh: "AD()", toggle: true },
    "self.above_area()": { zh: "在区域上空", toggle: true },
    "self.target(0)": { zh: "目标状态 0（参数 2 ≠ 1，含义未确认）", src: "推测", toggle: true, note: "exe：self.target(N) 是通用函数 0x2E「目标状态 N」（0x141338000）。参数 2 = 1 时检查猎人攀附墙壁（见下一条）；参数 2 ≠ 1 时走另一段代码，未确认。THK 中导向跳上/跳下高处攻击" },
    "self.target(0) @ parameter2:1": { zh: "猎人攀附在墙壁/藤蔓上", src: "exe", toggle: true, note: "exe：猎人 +0x8944 bit6，由攀墙（cActWallStart / cActWallMovingStart）、抓藤（cActWallGrabStart）、被打到墙上（cActDamageWall）等动作置位" },
    "self.target(3)": { zh: "目标状态 3（索敌相关）", toggle: true }, "self.target(4)": { zh: "目标状态 4（索敌相关）", toggle: true },
    "self.target(11)": { zh: "目标状态 11", toggle: true }, "self.target(12)": { zh: "目标状态 12", toggle: true },
    "self.target(14)": { zh: "猎人乘翼龙/滑索移动中", src: "exe", toggle: true, note: "exe：猎人 +0x8944 bit4。是定时状态：翼龙移动开始（cActYokuryuStart）、滑索（cActRopeWay）、cActWallFastTravelGo 调用 0x141f70da0 写入时长并置位，到时清除" }, "self.target(52)": { zh: "目标状态 52", toggle: true },
    "self.target.mudded()": { zh: "目标被泥浆困住", toggle: true },
    "self.targetEnemy(50)": { zh: "沿用上一个目标（副作用）" },
    "self.targetEnemy(target_em.random_player_or_cat)": { zh: "随机选择猎人/随从为目标（副作用）" },
    "self.in_map(st.Secluded_Valley_Alatreon).in_area(-1)": { zh: "位于秘境（煌黑龙专用地图）", toggle: true },
    "// -Illegal Context was commented out 'endr'": { zh: "（反编译器注释：原文此处多一个 endr，已被 Leviathon 注释掉，无实际作用）", eval: () => false },
  };

  // ---------- 寄存器 ----------
  const registers = {
    RegisterVar0: { zh: "属性切换计数", src: "rentry", note: "G195：地面每轮 +1（飞行时不计）。审判 0 次 ≥15、1 次 ≥13、2 次以上 ≥11 时切换：炎/冰 → 转龙，龙 → 终结审判。第一次审判前：炎/冰 HP≤55% 时 ≥4、龙 HP≤20% 时 ≥9 即切换（G196）。切换时清零" },
    RegisterVar1: { zh: "空中轮数", note: "G202：空中每轮 +1。审判 1 次时满 4 降落，否则满 6 降落（超过则快速降落）；第一次审判前 HP 达到阈值时满 2 就降落（G203）。属性切换时清零" },
    RegisterVar2: { zh: "本属性的地面轮数", note: "G202：地面每轮 +1。还没飞过（R1=0）时：龙 ≥4、炎/冰 ≥12 起飞（G204）。龙活性下 ≥4 也表示「已起飞过」，换用 059/068 混合属性表与 087 固定轮换的大招。属性切换时清零" },
    RegisterVar3: { zh: "空中长连段节奏", note: "node_008：空中每轮 +1，≤1 短连段、≥3 长连段，中间 65/35；愤怒与否两支完全相同" },
    RegisterVar4: { zh: "空中普通攻击记忆", note: "143/148：上一轮出过普通攻击（=1）时 60% 跳过" },
    RegisterVar5: { zh: "空中大招记忆", note: "157 炎系空中大招后 R5 = 1（本轮无普通攻击时 0）、158 冰系后 = 2（同）、159 龙系（炎/冰活性）后 = 3、160 龙系（龙活性）后 = 4。154~156 据此让龙系与炎/冰系空中大招交替：刚出过龙系必出炎/冰系，刚出过带普通攻击的炎/冰系必出龙系，其余 65/35；R3 清零的那一轮清掉 1/2" },
    RegisterVar6: { zh: "地面长连段节奏", note: "node_005：地面每轮 +1，未愤怒满 5、愤怒满 4 必出长连段（node_007）并清零；炎/冰 ≤2、龙 ≤1 时只出短连段（node_006），中间 60/40" },
    RegisterVar7: { zh: "终结审判次数", src: "rentry", note: "G197 每次审判 +1，决定 R0 / R1 的阈值；HP 提前切换只在 R7=0 时有效" },
    RegisterVar8: { zh: "地面普通攻击记忆", note: "015/025/037/047/059/068：0 = 上轮没出普通攻击，1 = 出过单段，2 = 出过两段；避免同一种长度连出" },
    RegisterVar9: { zh: "属性大招记忆", note: "1 炎、2 冰、3 雷、5 龙（炎/冰阶段）、6 龙（龙阶段）；下一轮对应大招权重为 0。龙活性起飞后（R2≥4）由 G087 按 龙→冰→雷→炎 固定轮换" },
    RegisterVar10: { zh: "不换目标再来一轮", note: "node_004：目标倒地 / 被压制 / HP≤40% 时 50% 置 1，node_003 末尾 repeat（属性/起飞计数照样增加）" },
    RegisterVar11: { zh: "破绽标志（死代码）", note: "只在主控 node_001 读取，任何 THK 都不会给它加值" },
    RegisterVar12: { zh: "骑乘计数", note: "Mount（THK 11）" }, RegisterVar13: { zh: "骑乘计数", note: "Mount（THK 11）" },
    RegisterVar14: { zh: "一次性威吓（死代码）", note: "只在 G248 中使用（第一次调用时威吓），但 G248 没有被任何节点调用" },
  };

  // ---------- THK 上下文 ----------
  const contexts = {
    Combat_Main: "战斗主控：每轮 选目标 → 属性切换计数 G195 → 特殊情况 G359 → 起降计数 G202 → 空中连段 G008 / 地面连段 G005 → 不换目标再来一轮判定 node_004",
    Combat_Enter: "进入战斗", Search: "搜索", Discover: "发现目标", Rage_Enter: "进入愤怒", Mount: "被骑乘", Concealment: "隐蔽",
    Non_Combat_Main: "非战斗主控", Non_Combat_Hit: "非战斗受击", Target_Lost: "丢失目标", Combat_Blinded: "闪光致盲",
    Combat_Blinded_Recovery: "致盲恢复", Global: "Global 招式库（THK 55，383 个节点）",
  };

  // ---------- 节点标题 ----------
  const nodes = {};
  const put = (file, id, zh, note) => { nodes[`${file}.node_${String(id).padStart(3, "0")}`] = note ? { zh, note } : { zh }; };
  [
    [0, "每轮总控", "node_001 破绽（死代码）→ node_002 选目标 → node_003 本轮决策"],
    [1, "R11 破绽（死代码）", "R11 在任何 THK 里都不会被加值"],
    [2, "选目标", "清零 R10；35% 沿用目标、65% 随机选猎人/随从"],
    [3, "本轮决策", "G195 属性切换计数 → G359 特殊情况 → G202 起降计数 → 空中 G008 / 地面 G005 → node_004；R10>0 时 repeat 再来一轮"],
    [4, "不换目标再来一轮（R10）", "R10 已置位则清零；否则目标不是随从猫/索敌状态时：目标倒地、被压制或 HP≤40%（103(3,40)）→ 50% 置 R10"],
  ].forEach((a) => put(M, ...a));
  [
    [1, "飞行中则降落", "离地 ≤5000（AF）直接降落，否则先飞到区域空中中心"], [2, "地面则起飞"], [3, "飞到空中中心后降落"],
    [5, "地面连段：短 / 长（R6）", "R6 每轮 +1：炎/冰 ≤2、龙 ≤1 走短连段 006；未愤怒 ≥5 / 愤怒 ≥4 走长连段 007 并清零；中间 60% 短 / 40% 长；>4000 直接长连段"],
    [6, "短连段：普通攻击 + 属性大招", "炎 015 + 080；冰 037 + 081；龙：起飞前按本周期属性用 015/037，起飞后（R2≥4）059；然后 084"],
    [7, "长连段：普通攻击 + 属性大招", "炎 025 + 082；冰 047 + 083；龙：起飞前 025/047，起飞后 068；然后 084"],
    [8, "空中连段：短 / 长（R3）", "R3 每轮 +1：≤1 短 009、≥3 长 010 并清零、中间 65/35；愤怒与否两支相同"],
    [9, "空中短连段"], [10, "空中长连段"],
    [12, "拜年（龙大招，R9≠5/6 时）"], [13, "拜年（追加用）"], [14, "后跳滑翔攻击（R9≠5/6 时）"],
    [15, "炎·短连段普通攻击", "目标倒地 40% 跳过；按 R8：0 → 50% 单段 017 / 50% 两段 018；1 → 50% 跳过 / 50% 两段；2 → 50% 跳过 / 50% 单段"],
    [16, "跳过普通攻击（R8=0）"], [17, "炎·单段普通攻击（R8=1）"], [18, "炎·两段普通攻击（R8=2）"],
    [19, "追加攻击"], [20, "追加攻击"], [21, "追加攻击"], [22, "追加攻击"], [23, "追加攻击"], [24, "远距离：冲刺后攻击"],
    [25, "炎·长连段普通攻击", "目标倒地 40% 跳过；R8=1 → 三段 028；R8=2 → 两段 027；否则 50/50"],
    [27, "炎·长连段（两段）"], [28, "炎·长连段（三段）"], [36, "远距离：冲刺后攻击"],
    [37, "冰·短连段普通攻击"], [47, "冰·长连段普通攻击"], [59, "龙（起飞后）·短连段普通攻击"], [68, "龙（起飞后）·长连段普通攻击"],
    [80, "炎·短连段后的属性大招（R9）", "≤1400：炎 30 / 雷 30 / 龙 40；>1400：炎 70 / 雷 30；上一个是哪类，这次那类权重为 0"],
    [81, "冰·短连段后的属性大招（R9）"], [82, "炎·长连段后的属性大招（R9）"], [83, "冰·长连段后的属性大招（R9）"],
    [84, "龙活性的属性大招", "起飞后（R2≥4）→ 087 固定轮换；否则按本周期属性 085 / 086"],
    [85, "龙（由炎转来）·属性大招", "炎 30 / 雷 35 / 龙 35"], [86, "龙（由冰转来）·属性大招", "冰 30 / 雷 35 / 龙 35"],
    [87, "龙（起飞后）·属性大招固定轮换", "R9：龙 → 冰 → 雷 → 炎 → 龙 …（不随机）"],
    [88, "炎大招（R9=1）", "按 HP >75% / ≤75% / ≤40% 选 089/090/091：地爆三星、极炎加农、爆炎灭碎阵"],
    [92, "冰大招（R9=2）", "按 HP 选 093/094/095：绝对零度领域、三向冰锥、钻石冰尘"],
    [96, "雷大招（R9=3）", "按 HP 选 097/098/099：跟踪雷 / 五排雷"],
    [100, "雷大招（另一版本，未使用）"],
    [101, "龙大招（炎/冰活性中，R9=5）", "钩爪抓附时必出拜年；≤450 拜年、≤900 50% 拜年 / 50% 甩头或甩尾、≤1400 甩头/甩尾、更远凤凰天翔"],
    [102, "龙大招（龙活性中，R9=6）", "≤450 45% 拜年 / 55% 龙魂释放；≤900 25 / 20 甩头甩尾 / 55；≤1400 65 甩头甩尾 / 35 龙魂；更远凤凰天翔"],
    [103, "记下 R9（龙大招）"],
    [106, "耳刮子"], [107, "小步头槌"], [108, "甩头 / 转身甩尾"], [111, "龙车"], [112, "龙车 2"], [115, "真·龙车"], [116, "真·龙车 2"],
    [117, "拜年"], [118, "凤凰天翔"], [119, "龙魂释放（地面）"], [120, "火球吐息"], [121, "后跳火球吐息"], [122, "后跳火球起飞"],
    [123, "地爆三星"], [124, "极炎加农"], [125, "爆炎灭碎阵 → 破绽"], [126, "环形冰吐息"], [128, "绝对零度领域"],
    [129, "冻牙炮"], [130, "三向冰锥 → 破绽"], [131, "钻石冰尘 → 破绽"], [132, "寒岭天冰（冰锥雨）"],
    [135, "周身落雷"], [136, "跟踪雷 2 道"], [137, "跟踪雷 3 道"], [138, "跟踪雷（愤怒 3 道，否则 2 道）"], [139, "五排雷 → 威吓"],
    [140, "终结审判 → 炎（未使用）"], [141, "终结审判 → 冰（未使用）"], [105, "滑步（未使用）"], [113, "龙车起飞（未使用）"], [114, "龙车起飞 2（未使用）"], [127, "侧滑步冻牙炮（未使用）"], [162, "空中扫尾"], [172, "三连火球（未使用）"],
    [143, "炎·空中普通攻击（R4）"], [148, "冰·空中普通攻击（R4）"], [154, "炎·空中大招（R5）"], [155, "冰·空中大招（R5）"], [156, "龙·空中大招（R5）"],
    [157, "炎系空中大招", "阳炎加农 / 天灭玄舞击 / 炎阳怒息 / 水流机关炮"], [158, "冰系空中大招", "照星·崩流 / 沧海·螺旋 / 水神·青龙 / 极冰连牙"],
    [159, "龙系空中大招", "钩爪抓附时必出空中叩击；≤500 162、≤1000 50/50、更远空中叩击"],
    [165, "空中龙车降落"], [166, "空中叩击（愤怒 3 下，否则 2 下）"], [169, "龙魂释放（空中）"], [175, "绝对熔点领域（降落）"],
    [195, "属性切换计数（R0）", "地面每轮 R0+1：审判 0 次 ≥15、1 次 ≥13、2 次以上 ≥11 → G197"],
    [196, "第一次审判前的血量提前切换", "炎/冰 HP≤55% 且 R0≥4、龙 HP≤20% 且 R0≥9 → G197"],
    [197, "属性切换", "龙：降落 → R7+1 → 终结审判（破角回到原属性，否则换另一个）；炎/冰：转龙 G201。清零 R0/R1/R2"],
    [198, "审判前冲刺到最近入口（52(0,2) 时）"],
    [199, "终结审判 → 炎"], [200, "终结审判 → 冰"], [201, "转龙活性（魔龙炼化）"],
    [202, "起降计数（R1 / R2）", "空中：R1+1，审判 1 次满 4、否则满 6 降落；地面：R2+1，没飞过时 龙 ≥4、炎/冰 ≥12 起飞"],
    [203, "第一次审判前的血量提前降落", "空中第 2 轮起：炎/冰 HP≤55%、龙 HP≤20% → 降落"],
    [204, "起飞招", "炎：后跳火球起飞；冰：寒岭天冰；龙：由炎转来 寒岭天冰，由冰转来 后跳火球起飞"],
    [205, "降落招", "炎：绝对熔点领域；冰：空中龙车降落；龙：由炎转来 空中龙车降落，由冰转来 绝对熔点领域"],
    [206, "快速降落（空中龙车降落）"],
    [248, "一次性威吓（R14，未被调用）"], [258, "破绽"],
    [359, "特殊情况", "烟雾弹索敌、目标状态 3/4 索敌、钩爪挂身 380、目标在高处 365~367、泥浆 377；飞行中每轮先滑翔到离目标 200 处（371）；地面高低差 >450 时冲刺接近（360/370）"], [371, "飞行中滑翔接近（动作参数：停在离目标 200 处）"],
    [376, "目标在高处够不到（含 die 动作）"], [377, "目标被泥浆困住"], [380, "钩爪挂身反击"], [381, "钩爪反击（抓附中）"],
  ].forEach((a) => put(G, ...a));

  MHWI.registerAnno("em050_00", {
    monster: { key: "em050_00", em: "em050", zh: "煌黑龙", full: "煌黑龙", en: "Alatreon", internalId: 87 },
    scope: "alatreon",
    actions, conditions, registers, contexts, nodes, glossary,
    movesHeader: "招式（社区俗称）",
    movesNote: "「招式」一列的四字名称来自游民星空 雨酱《煌黑龙招式拆解及打法详解》，与内部动作名按描述对应；对应不确定的保留内部名直译。水属性招式在炎、冰活性的空中都会使用。",
    entry: { file: M, node: "node_000" },
    // 不换目标再来一轮：node_003 末尾 R10>0 时 repeat
    repeatEnds: [`${M}.node_003`],
    endLabels: { again: "随后不换目标再走一轮" },
    state: {
      defaults: { elem: 1, fromFire: true, enraged: false, flying: false, hp: 100, dist: 800, angle: 0, vert: 0, regs: {}, flags: {} },
      controls: [
        {
          id: "el", zh: "活性",
          options: [
            { id: "1", zh: "炎", note: "炎活性：不出冰招；空中会用水属性招式" },
            { id: "2", zh: "冰", note: "冰活性：不出炎招；空中会用水属性招式" },
            { id: "3", zh: "龙", note: "龙活性：起飞前沿用本周期炎/冰的普通攻击表，起飞后换成混合表，大招按 龙→冰→雷→炎 固定轮换" },
          ],
          get: (s) => String(s.elem),
          set: (s, v) => { s.elem = +v; },
        },
        {
          id: "src", zh: "本周期（龙活性用）",
          options: [
            { id: "f", zh: "由炎转龙", note: "104() 为真：龙活性起飞前用炎表；审判时破角回炎、否则转冰" },
            { id: "i", zh: "由冰转龙", note: "104() 为假：龙活性起飞前用冰表；审判时破角回冰、否则转炎" },
          ],
          get: (s) => (s.fromFire ? "f" : "i"),
          set: (s, v) => { s.fromFire = v === "f"; },
        },
        {
          id: "ph", zh: "本活性进度",
          options: [
            { id: "pre", zh: "起飞前", note: "R1=0、R2=0：还没飞过" },
            { id: "post", zh: "已飞过", note: "R1=1、R2=5：已起飞并降落（龙活性换用混合表与大招固定轮换）" },
          ],
          get: (s) => ((s.regs.RegisterVar1 || 0) > 0 ? "post" : "pre"),
          set: (s, v) => {
            if (v === "post") { s.regs.RegisterVar1 = 1; s.regs.RegisterVar2 = 5; }
            else { delete s.regs.RegisterVar1; delete s.regs.RegisterVar2; }
          },
        },
      ],
      checks: [
        { id: "rage", key: "enraged", zh: "愤怒" },
        { id: "fly", key: "flying", zh: "飞行" },
      ],
      common: ["function#102()", "self.target.helpless_0()", "function#103(3,40)", "self.target(44)", "function#7F()", "self.target(55)", "function#5D()", "function#52(0,2)"],
      presets: [["正面 400", 400, 0], ["正面 800", 800, 0], ["正面 1200", 1200, 0], ["侧面 800", 800, 90], ["背后 600", 600, 180], ["中距离 2000", 2000, 0], ["远处 3200", 3200, 0]],
    },
    silhouette: (s) => {
      const span = s.flying ? 2300 : 1900;
      const body = [[0, -1500], [110, -1400], [100, -1150], [180, -750], [300, -300], [270, 250], [150, 700], [80, 1400], [50, 2000], [0, 2350]];
      const horn = (k) => [[k * 60, -1420], [k * 260, -1700], [k * 150, -1380]];
      const wing = (k) => [[200, -500], [span, -700], [span - 150, -150], [span * 0.62, -100], [span * 0.48, 420], [260, 200]].map(([x, y]) => [k * x, y]);
      return [{ cls: "wing", pts: wing(1) }, { cls: "wing", pts: wing(-1) }, { cls: "wing", pts: horn(1) }, { cls: "wing", pts: horn(-1) }, { cls: "body", pts: body, mirror: true }];
    },
    minorCats: ["move", "turn", "sub"],
    simNote: "模拟假设猎人原地不动：冲刺/滑翔接近后距离 = 停止距离，转身后正对目标（飞行时每轮先滑翔到离目标 200 处，所以空中出招与距离基本无关）；拜年、凤凰天翔、空中龙魂释放落地后视为贴身（400、正对）；龙车穿过目标，不改变距离。属性切换与起降由计数器决定（展开「计数器」可设定 R0/R1/R2/R7），本轮若触发切换或起降，就只做这一件事。",
    scale: { bodyLength: 3800, ringMax: 4500 },
  });
})();
