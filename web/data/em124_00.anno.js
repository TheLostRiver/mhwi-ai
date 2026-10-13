/*
 * 历战王冰呪龙 Arch-Tempered Velkhana (em124_00) 注释库
 *
 * 历战王与普通冰呪龙共用同一套 THK：战斗主控 node_000 用 self.current_quest().is_rank(rank.AT) 分流，
 * Global 里大量节点同样按「是否历战王」选择 ex_ 版本招式。本注释与模拟器以历战王路径为主。
 *
 * 来源与可信度标记:
 *   [代码]  直接由 THK 反编译结果读出，确定
 *   [xlsx]  王冰THK注释.xlsx（社区玩家注释）
 *   [B站]   九世深渊《雪花沉睡 历战王冰呪龙战斗AI全解析》bilibili opus/953519534698921990
 *   [exe]   游戏 exe（版本 421810）逆向分析，见 docs/em124-at-velkhana.md「exe 逆向」一节
 *   [推测]  本项目根据代码结构推断，未经实机验证
 */
(function () {
  const G = "em124_55"; // Global（THK 55）
  const M = "em124_00"; // Combat_Main（THK 00）

  // 冲刺/滑翔接近：第一个参数为 2 时第 5 个参数是停止距离，否则第 4 个（模拟器假设猎人原地不动）
  const approach = (s, a) => {
    const stop = a[0] === 2 ? a[4] : a[3];
    if (stop !== undefined && a.length >= 4 && s.dist > stop) { s.dist = stop; s.angle = 0; }
  };
  const face = (s) => { s.angle = 0; };

  // ---------- 动作 ----------
  const actions = {
    // 招牌招式
    ex_rotate_ice_wall_breath_seq: { zh: "六脉（旋转冰墙吐息）", cat: "attack", key: true },
    ex_rotate_ice_wall_breath: { zh: "六脉（单发版）", cat: "attack" },
    ex_area_breath: { zh: "推推冰（直线冰爆）", cat: "attack", key: true },
    area_breath: { zh: "推推冰（普通版）", cat: "attack" },
    sweep_180_breath_turn: { zh: "横扫冰（180°）", cat: "attack", key: true },
    sweep_180_breath: { zh: "横扫冰", cat: "attack" },
    sweep_180_breath_lb: { zh: "横扫冰（左后）", cat: "attack" }, sweep_180_breath_lf: { zh: "横扫冰（左前）", cat: "attack" },
    sweep_180_breath_rb: { zh: "横扫冰（右后）", cat: "attack" }, sweep_180_breath_rf: { zh: "横扫冰（右前）", cat: "attack" },
    sweep_90_breath: { zh: "小范围横扫冰", cat: "attack" },
    ex_ice_wave_start: { zh: "造蛋糕（地面冰波）", cat: "attack", key: true },
    ice_wave_start: { zh: "造蛋糕（普通版）", cat: "attack" },
    ex_ice_wave_start_fly: { zh: "造蛋糕（空中转圈）", cat: "attack" },
    ice_wave_start_fly: { zh: "造蛋糕（空中·普通版）", cat: "attack" },
    freeze_breath: { zh: "粘鼠板（冻结吐息）", cat: "attack", key: true },
    freeze_breath_front: { zh: "粘鼠板（正面）", cat: "attack" },
    freeze_breath_to_attack: { zh: "冻结尾刺（粘住后追击）", cat: "attack" },
    freeze_breath_miss: { zh: "粘鼠板未中", cat: "attack" },
    ex_ice_block_breath_to_ground: { zh: "远距离冰爆（平行冰爆）", cat: "attack" },
    ice_block_breath_to_ground: { zh: "远距离冰爆（普通版）", cat: "attack" },
    ex_ice_block_breath: { zh: "冰块吐息", cat: "attack" }, ice_block_breath: { zh: "冰块吐息（普通版）", cat: "attack" },
    ex_ice_drop: { zh: "落冰", cat: "attack" }, ice_drop: { zh: "落冰（普通版）", cat: "attack" },
    ex_special_breath_attack_start: { zh: "大招（历战王）", cat: "attack", key: true },
    special_breath_attack_start: { zh: "大招", cat: "attack" }, special_breath_attack_start_2: { zh: "大招（濒死版）", cat: "attack" },
    straight_breath: { zh: "直线吐息", cat: "attack" }, combo_straight_breath: { zh: "二连直线吐息", cat: "attack" },
    vertical_breath: { zh: "纵向吐息", cat: "attack" },
    vertical_breath_fly: { zh: "空中吐息", cat: "attack" }, vertical_breath_fly_to_ground: { zh: "空中吐息（落地）", cat: "attack" },
    // 体术
    adjust_bite: { zh: "咬", cat: "attack" },
    rush: { zh: "车（冲撞）", cat: "attack" }, rush_2: { zh: "车 2", cat: "attack" }, rush3: { zh: "车 3", cat: "attack" },
    rush4: { zh: "车 4", cat: "attack" }, rush5: { zh: "车 5", cat: "attack" }, ex_rush_halt: { zh: "车（无后摇）", cat: "attack" },
    rush_fly: { zh: "空中车", cat: "attack" },
    back_step_pierce: { zh: "后撤尾刺", cat: "attack" }, back_step_pierce_2: { zh: "后撤尾刺 2", cat: "attack" },
    ex_back_step_pierce2: { zh: "后撤尾刺（历战王）", cat: "attack" }, ex_back_step_pierce_halt: { zh: "后撤尾刺（无后摇）", cat: "attack" },
    tail_sting: { zh: "尾刺", cat: "attack" }, combo_tail_sting: { zh: "二连尾刺", cat: "attack" },
    tail_swing: { zh: "回旋尾刺", cat: "attack" }, combo_tail_swing: { zh: "连段回旋尾刺", cat: "attack" },
    ex_tail_swing_halt: { zh: "回旋尾刺（无后摇）", cat: "attack" }, ex_combo_tail_swing_halt: { zh: "连段回旋尾刺（无后摇）", cat: "attack" },
    lost_tail_swing: { zh: "回旋尾刺（丢失目标）", cat: "attack" },
    fly_tail_sting_to_ground: { zh: "飞天尾刺（落地）", cat: "attack" }, fly_tail_sting: { zh: "飞天尾刺", cat: "attack" },
    fly_tail_sting_fly_start: { zh: "空中尾刺", cat: "attack" },
    combo_fly_tail_sting: { zh: "连段飞天尾刺", cat: "attack" }, combo_fly_tail_sting_to_ground: { zh: "连段飞天尾刺（落地）", cat: "attack" },
    tail_swing_fly: { zh: "空中回旋尾刺", cat: "attack" },
    jump_attack_wall_up: { zh: "跳上高处攻击", cat: "attack" }, jump_attack_wall_down: { zh: "跳下高处攻击", cat: "attack" },
    freeze_combat_zako_breath: { zh: "场景横扫冰（地面）", cat: "attack" }, freeze_yokuryu_zako_breath: { zh: "场景横扫冰（空中）", cat: "attack" },
    // 状态
    barrier_up: { zh: "冰甲强化（冰0→冰1）", cat: "state", key: true }, barrier_up_fly: { zh: "冰甲强化（空中）", cat: "state" },
    barrier_max: { zh: "冰甲全开（→冰2）", cat: "state" }, barrier_max_fly: { zh: "冰甲全开（空中）", cat: "state" },
    take_off: { zh: "起飞", cat: "state" }, landing: { zh: "降落", cat: "state" }, sudden_rise: { zh: "急速上升", cat: "state" },
    sudden_drop: { zh: "急速下降", cat: "state" }, take_off_switch_pattern_by_dist: { zh: "起飞（按距离）", cat: "state" },
    chance: { zh: "摇头（破绽）", cat: "special" }, chance_fly: { zh: "摇头（空中破绽）", cat: "special" },
    threat_short: { zh: "威吓", cat: "special" }, threat_short_fly: { zh: "威吓（空中）", cat: "special" },
    anger_search: { zh: "高抬头索敌", cat: "special" }, combat_search: { zh: "探头索敌", cat: "special" },
    lost_search: { zh: "摇头索敌", cat: "special" }, search_fly: { zh: "空中索敌", cat: "special" }, life_search: { zh: "环顾", cat: "special" },
    discover: { zh: "发现", cat: "special" }, discover_fly: { zh: "发现（空中）", cat: "special" },
    discover_roar: { zh: "发现咆哮", cat: "special" }, discover_roar_2: { zh: "发现咆哮 2", cat: "special" },
    discover_roar_fly: { zh: "发现咆哮（空中）", cat: "special" }, discover_roar_fly_2: { zh: "发现咆哮（空中）2", cat: "special" },
    marking: { zh: "造冰标记", cat: "special" }, rest: { zh: "坐姿休息", cat: "special" }, sleep: { zh: "睡眠", cat: "special" },
    dying_sleep: { zh: "濒死睡眠", cat: "special" }, refresh: { zh: "摇头清醒", cat: "special" }, tired: { zh: "疲劳", cat: "special" },
    damage_low: { zh: "头硬（小硬直）", cat: "special" }, damage_high_fly: { zh: "空中大硬直", cat: "special" },
    event_fence_break: { zh: "撞防护壁", cat: "special" }, event_fence_break_quest_fail: { zh: "撞防护壁（任务失败）", cat: "special" },
    ride_rage_head: { zh: "骑乘·甩头", cat: "special" }, ride_rage_head_lv2: { zh: "骑乘·甩头 2", cat: "special" },
    ride_rage_body: { zh: "骑乘·甩身", cat: "special" }, ride_rage_body_lv2: { zh: "骑乘·甩身 2", cat: "special" },
    ride_rage_crash_head: { zh: "骑乘·撞头", cat: "special" }, ride_rage_crash_head_lv2: { zh: "骑乘·撞头 2", cat: "special" },
    ride_rage_crash_body: { zh: "骑乘·撞身", cat: "special" }, ride_rage_crash_body_lv2: { zh: "骑乘·撞身 2", cat: "special" },
    ride_tired: { zh: "骑乘·疲劳", cat: "special" },
    // 移动 / 转身
    dash: { zh: "冲刺", cat: "move", effect: approach },
    glide_combat: { zh: "滑翔接近", cat: "move", effect: approach },
    glide_direct_move: { zh: "滑翔移动", cat: "move", effect: approach },
    glide: { zh: "滑翔", cat: "move" }, walk: { zh: "步行", cat: "move", effect: approach },
    dying_walk: { zh: "濒死步行", cat: "move" }, dying_walk_fly: { zh: "濒死飞行", cat: "move" }, dying_glide_direct_move: { zh: "濒死滑翔", cat: "move" },
    quick_turn: { zh: "快速转身", cat: "turn", effect: face }, quick_turn_fly: { zh: "空中快速转身", cat: "turn", effect: face },
    turn: { zh: "转身", cat: "turn", effect: face }, turn_fly: { zh: "空中转身", cat: "turn", effect: face },
    back_turn: { zh: "后退转身", cat: "turn", effect: face },
    turn_step_front_l: { zh: "前滑步（左）", cat: "turn" }, turn_step_front_r: { zh: "前滑步（右）", cat: "turn" },
    turn_step_back_l: { zh: "后滑步（左）", cat: "turn" }, turn_step_back_r: { zh: "后滑步（右）", cat: "turn" },
    turn_step_side_l: { zh: "侧滑步（左）", cat: "turn" }, turn_step_side_r: { zh: "侧滑步（右）", cat: "turn" },
    turn_step_front_far_l: { zh: "远前滑步（左）", cat: "turn" }, turn_step_front_far_r: { zh: "远前滑步（右）", cat: "turn" },
    turn_step_l_fly: { zh: "空中侧步（左）", cat: "turn" }, turn_step_r_fly: { zh: "空中侧步（右）", cat: "turn" },
    step_back_fly: { zh: "空中后退", cat: "turn" }, short_up_step_fly: { zh: "空中小上升", cat: "turn" }, short_down_step_fly: { zh: "空中小下降", cat: "turn" },
  };
  const EMS = { em023: "金狮子", em024: "钢龙", em026: "炎妃龙", em027: "炎王龙", em043_05: "怒恐暴龙", em103_05: "黑灭龙" };
  for (const [em, zh] of Object.entries(EMS)) {
    for (const k of ["glide", "mediation", "attacker_first", "attacker_mediation", "first", "mediation_threat"]) {
      actions[`grapple_with_${em}_${k}`] = { zh: `领地争夺·${zh}`, cat: "special" };
    }
  }

  const glossary = {
    ex: "历战王", rotate: "旋转", ice: "冰", wall: "墙", breath: "吐息", seq: "连续", area: "范围", sweep: "横扫", "180": "180", "90": "90",
    turn: "转身", wave: "波", start: "起手", fly: "飞行", freeze: "冻结", front: "前", to: "到", attack: "攻击", miss: "未中",
    block: "块", ground: "地面", drop: "落下", special: "特殊", straight: "直线", combo: "连续", vertical: "纵向", adjust: "调整",
    bite: "咬", rush: "冲撞", rush3: "冲撞3", rush4: "冲撞4", rush5: "冲撞5", halt: "急停", back: "后", step: "步", pierce: "穿刺",
    pierce2: "穿刺2", tail: "尾", sting: "刺", swing: "回旋", lost: "丢失", jump: "跳", up: "上", down: "下", barrier: "冰甲",
    max: "最大", take: "起", off: "飞", landing: "降落", sudden: "急", rise: "升", switch: "切换", pattern: "模式", by: "按", dist: "距离",
    chance: "机会", threat: "威吓", short: "短", anger: "愤怒", search: "索敌", combat: "战斗", life: "生活", discover: "发现",
    roar: "咆哮", marking: "标记", rest: "休息", sleep: "睡", dying: "濒死", refresh: "清醒", tired: "疲劳", damage: "受击", low: "小",
    high: "大", event: "事件", fence: "栅栏", break: "破坏", quest: "任务", fail: "失败", ride: "骑乘", rage: "暴怒", head: "头",
    body: "身", crash: "撞", lv2: "2级", dash: "冲刺", glide: "滑翔", direct: "直接", move: "移动", walk: "步行", quick: "快速",
    side: "侧", far: "远", l: "左", r: "右", lb: "左后", lf: "左前", rb: "右后", rf: "右前", zako: "杂鱼", yokuryu: "翼龙",
    grapple: "缠斗", with: "与", glide2: "滑翔", mediation: "调停", attacker: "攻方", first: "首次", "2": "2",
  };

  // ---------- 条件 ----------
  const inArc = (x, a, b) => (a <= b ? x >= a && x <= b : x >= a || x <= b);
  const conditions = {
    "self.current_quest().is_rank(rank.AT)": { zh: "历战王任务", src: "代码", toggle: true, default: true, note: "主控 node_000 与 Global 里大量节点用它切换历战王专属分支；关掉即普通冰呪龙" },
    "function#101()": { zh: "冰0（无冰甲）", src: "exe", note: "exe：冰呪龙专属处理函数中 101(p) = 冰甲对象（+0x20928）的等级 == p", eval: (s) => s.ice === 0 },
    "function#101(1)": { zh: "冰1", src: "exe", eval: (s) => s.ice === 1 },
    "function#101(2)": { zh: "冰2", src: "exe", eval: (s) => s.ice === 2 },
    "function#101(4)": { zh: "身上有冰甲（冰1 或冰2）", src: "exe", note: "exe：101(4) = 冰甲等级 ≥ 1", eval: (s) => s.ice >= 1 },
    "self.enraged()": { zh: "愤怒", eval: (s) => !!s.enraged },
    "self.flying()": { zh: "飞行中", eval: (s) => !!s.flying },
    "function#10E(3,50)": { zh: "目标 HP ≤ 50%", src: "exe", toggle: true, note: "exe：10E(op,v) 取当前目标的血量比例 ×100（猎人取 +0x7630 的血量组件，当前值/最大值），再用通用比较函数按 op 比较；op=3 为 ≤。xlsx 与 B 站解释为「敌人被击飞」，并不准确" },
    "function#10F(750)": { zh: "冰呪龙离地区中心 < 750", src: "exe", note: "exe：10F(d) = 冰呪龙到所在区域中心点的水平距离 < d", eval: (s) => s.centerDist < 750 },
    "function#10F(1250)": { zh: "冰呪龙离地区中心 < 1250", src: "exe", eval: (s) => s.centerDist < 1250 },
    "function#10F(1500)": { zh: "冰呪龙离地区中心 < 1500", src: "exe", eval: (s) => s.centerDist < 1500 },
    "function#10F(1750)": { zh: "冰呪龙离地区中心 < 1750", src: "exe", eval: (s) => s.centerDist < 1750 },
    "function#10F(1825)": { zh: "冰呪龙离地区中心 < 1825", src: "exe", eval: (s) => s.centerDist < 1825 },
    "function#110(315,45)": { zh: "地区中心在冰呪龙前方", src: "exe", note: "exe：110(a,b) = 区域中心点相对冰呪龙朝向的顺时针角度在 a~b 之间", eval: (s) => inArc(s.centerAngle, 315, 45) },
    "function#110(135,225)": { zh: "地区中心在冰呪龙后方", src: "exe", eval: (s) => inArc(s.centerAngle, 135, 225) },
    "function#110(45,135)": { zh: "地区中心在冰呪龙右侧", src: "exe", eval: (s) => inArc(s.centerAngle, 45, 135) },
    "function#111()": { zh: "以地区中心为目标位置（副作用）", src: "exe", note: "exe：111() 取区域中心点并把 AI 目标位置设到那里，恒真；横扫冰节点用它让冰呪龙「车」向中心再横扫", eval: () => true },
    "function#7D()": { zh: "冰呪龙血量低于濒死线（推测捕获线）", src: "exe", toggle: true, note: "exe：比较怪物自身血量比例与一个区分单人/多人的阈值。为真时转阶段直接冰甲全开（冰2）" },
    "self.target(44)": { zh: "目标是随从猫", src: "exe", toggle: true, note: "exe：目标状态 0x2C 检查目标对象标志 bit14，该位属于 uOtomo（随从猫）。对随从猫时改用 node_010 攻击表、不触发额外横扫冰等" },
    "self.target(55)": { zh: "钩爪挂在身上", src: "xlsx", toggle: true, note: "exe：目标状态 0x37 读取猎人 +0x7668 的子对象并与当前怪物比较，与 xlsx「钩爪」一致" },
    "self.target(57)": { zh: "被粘鼠板黏住", src: "xlsx", toggle: true },
    "self.target(3)": { zh: "目标状态 3（索敌相关）", toggle: true },
    "self.target(4)": { zh: "目标状态 4（索敌相关）", toggle: true },
    "self.target(0)": { zh: "目标状态 0（参数 2 ≠ 1，含义未确认）", src: "推测", toggle: true, note: "exe：self.target(N) 是通用函数 0x2E「目标状态 N」（0x141338000）。参数 2 = 1 时检查猎人攀附墙壁（见下一条）；参数 2 ≠ 1 时走另一段代码，未确认。THK 中导向跳上/跳下高处攻击" },
    "self.target(0) @ parameter2:1": { zh: "猎人攀附在墙壁/藤蔓上", src: "exe", toggle: true, note: "exe：猎人 +0x8944 bit6，由攀墙（cActWallStart / cActWallMovingStart）、抓藤（cActWallGrabStart）、被打到墙上（cActDamageWall）等动作置位" },
    "self.target(14)": { zh: "猎人乘翼龙/滑索移动中", src: "exe", toggle: true, note: "exe：猎人 +0x8944 bit4。是定时状态：翼龙移动开始（cActYokuryuStart）、滑索（cActRopeWay）、cActWallFastTravelGo 调用 0x141f70da0 写入时长并置位，到时清除" },
    "self.target(11)": { zh: "目标状态 11", toggle: true },
    "self.target(12)": { zh: "目标状态 12", toggle: true },
    "self.target(13)": { zh: "目标已力尽（推测）", src: "推测", toggle: true },
    "self.target(52)": { zh: "目标状态 52", toggle: true },
    "self.target.helpless_0()": { zh: "目标处于受击硬直（倒地/击飞）", toggle: true },
    "self.target.mudded()": { zh: "目标被泥浆困住", toggle: true },
    "self.target.in_combat()": { zh: "目标（怪物）在战斗中", toggle: true },
    "function#5D()": { zh: "丢失目标视野（烟雾弹）", toggle: true },
    "function#7F(-999)": { zh: "钩爪抓附在身上（任意部位）", src: "推测", toggle: true },
    "self.above_area()": { zh: "在区域上空", toggle: true },
    "function#AF(5000)": { zh: "AF(5000)：可直接降落", toggle: true },
    "self.targetEnemy(50)": { zh: "沿用上一个目标（副作用）" },
    "self.targetEnemy(target_em.random_player_or_cat)": { zh: "随机选择猎人/随从为目标（副作用）" },
    "self.in_map(st.Elder_Recess).in_area(1)": { zh: "龙结晶之地 区域 1", toggle: true },
    "self.in_map(st.Elder_Recess).in_area(2)": { zh: "龙结晶之地 区域 2", toggle: true },
    "self.in_map(st.Elder_Recess).in_area(4)": { zh: "龙结晶之地 区域 4", toggle: true },
    "self.in_map(st.Elder_Recess).in_area(5)": { zh: "龙结晶之地 区域 5", toggle: true },
    "self.in_map(st.Elder_Recess).in_area(6)": { zh: "龙结晶之地 区域 6", toggle: true },
    "self.in_map(st.Elder_Recess).in_area(7)": { zh: "龙结晶之地 区域 7", toggle: true },
    "self.in_map(st.Elder_Recess).in_area(8)": { zh: "龙结晶之地 区域 8", toggle: true },
  };

  // ---------- 寄存器 ----------
  const registers = {
    RegisterVar0: { zh: "冰0 转阶段计数", src: "xlsx", note: "冰0 时每轮 +1（G115），HP>80% ≥8、≤80% ≥7、≤60% ≥6、≤40% ≥5、≤20% ≥4 时转阶段（G279）；历战王 HP≤40% 直接升冰2，否则升冰1" },
    RegisterVar1: { zh: "冰1 转阶段计数", note: "冰1 时每轮 +1；HP>80% ≥11、≤80% ≥8、≤60% ≥6、≤40% ≥5、≤20% ≥4 时升冰2" },
    RegisterVar2: { zh: "冰2 大招计数", note: "冰2 时每轮 +1；HP>75% ≥12、≤75% ≥11、≤50% ≥10、≤30% ≥9 时放大招（G109，清零）。飞行中不判定" },
    RegisterVar3: { zh: "冰1 额外横扫冰计数", note: "每轮末 G119 +1；冰1 ≥5 时清零并出 车/后撤尾刺 → 横扫冰；冰0/冰2 每轮清零。另影响 G143 冲刺概率（冰1）" },
    RegisterVar7: { zh: "冲刺接近 / 落冰标志", note: "G143 冲刺接近后 =1（部分横扫冰、直线吐息在近距离改走近战分支）；粘鼠板等之后 =2（下一轮开头必落冰）；落冰后 =3" },
    RegisterVar8: { zh: "压起身追加", note: "每轮末（node_005）：目标 HP≤50% 或受击硬直时，冰1 50%、冰2 100% +1 → 不换目标立即再走一轮攻击（仍会累计转阶段计数）" },
    RegisterVar9: { zh: "招式序列", note: "bit0：尾刺派生交替（0 飞天尾刺→造蛋糕，1 回旋尾刺→粘鼠板）；bit1：六脉/推推冰爆前置交替（0 车，1 后撤尾刺）。两位互不影响，从不清零" },
    RegisterVar10: { zh: "是否在板边", note: "G001 计算：冰呪龙离区域中心点超过半径（龙结晶之地各区 1250 到 1825 不等，其他地图 1500）时为 1。为 0（在中心）时冰2 出六脉，否则出推推冰爆" },
    RegisterVar6: { zh: "大型怪同场计数" },
    RegisterVar4: { zh: "（非历战王使用）" },
    RegisterVar5: { zh: "（非历战王使用）" },
  };

  // ---------- THK 上下文 ----------
  const contexts = {
    Combat_Main: "战斗主控：node_000 按是否历战王分流；历战王每轮 选目标 → 落冰 → 条件检测 → 转阶段计数 → 冲刺 → 按冰阶段查表 → 额外横扫冰 → 压起身计数",
    Combat_Enter: "进入战斗", Search: "搜索", Discover: "发现目标", Rage_Enter: "进入愤怒", Mount: "被骑乘",
    Concealment: "隐蔽", Non_Combat_Main: "非战斗主控", Non_Combat_Hit: "非战斗受击", Combat_Area_Change: "战斗中换区",
    Combat_Critical_HP: "濒死", Combat_Turf_War_A: "领地争夺 A", Combat_Turf_War_B: "领地争夺 B",
    Combat_Blinded: "闪光致盲", Combat_Blinded_Recovery: "致盲恢复", Target_Lost: "丢失目标",
    Global: "Global 招式库（THK 55，440 个节点）",
  };

  // ---------- 节点标题 ----------
  const nodes = {};
  const put = (file, id, zh, note) => { nodes[`${file}.node_${String(id).padStart(3, "0")}`] = note ? { zh, note } : { zh }; };
  [
    [0, "总控：按是否历战王分流", "历战王 → node_002；普通冰呪龙 → node_001"],
    [1, "普通冰呪龙每轮流程"],
    [2, "历战王每轮流程", "清零 R8 → 大型怪同场 G432 → 烟雾 G181 → 选目标 node_003 → 攻击 node_004"],
    [3, "选目标", "R7=3（刚落冰）时沿用目标；否则 50% 随机选猎人/随从、50% 沿用"],
    [4, "历战王攻击流程", "落冰 G141 → 条件检测 G402 → 转阶段计数 G115 → 飞行 → G046 → 冲刺 G143 → 主攻击 node_006 → 额外横扫冰 G119 → 压起身计数 node_005；R8>0 时 repeat 重走"],
    [5, "压起身计数 R8", "冰0：清零。冰1/冰2：R8 有值则清零；否则目标 HP≤50%（10E(3,50)）或受击硬直时 冰1 50% / 冰2 100% R8+1"],
    [6, "按冰阶段分发主攻击表", "目标是随从猫 → 010；冰2 → 009；冰1 → 008；冰0 → 007"],
    [7, "主攻击表·冰0", "≤1600：50% 终结攻击 / 30% 咬连段+终结 / 10% 咬+空中连招 / 10% 空中连招；>1600：50% / 40% / 10% 三连尾刺+终结"],
    [8, "主攻击表·冰1", "≤2200：40% 终结 G150 / 30% 咬连段+终结 G174 / 30% 三连尾刺+终结 G175（G178 权重 0）；>2200 70/15/15"],
    [9, "主攻击表·冰2", "≤2200：怒后 65% 终结 / 35% 三连尾刺+终结；怒前 45% / 25% 咬连段+终结 / 30% 三连尾刺+终结；>2200 75/25"],
    [10, "主攻击表·目标为随从猫"], [11, "飞行时：空中吐息落地"],
    [12, "普通冰呪龙：按冰阶段分发"], [13, "普通冰呪龙·冰0 表"], [14, "普通冰呪龙·冰1 表"], [15, "普通冰呪龙·冰2 表"], [16, "普通冰呪龙·目标为随从猫"],
    [17, "普通冰呪龙：飞行时"],
  ].forEach((a) => put(M, ...a));
  [
    [1, "计算是否在板边（R10）", "R10 = 冰呪龙离区域中心点 ≥ 半径：龙结晶之地 区域1/5/7 1500、区域2/6 1250、区域4 1750、区域8 1825，其他地图 1500"],
    [2, "冰2：六脉/推推冰爆 或 车/后撤尾刺+横扫冰", "中心 60% G004 / 40% G025；板边 40% / 60%"],
    [3, "冰2：车/后撤尾刺前置的 六脉/推推冰爆 或 横扫冰", "随从猫 → G004；中心 55% G008 / 45% G025；板边 40% / 60%"],
    [4, "冰2：中心六脉 / 板边推推冰爆"],
    [5, "冰2：单独六脉（板边改出其他招）", "中心：≤800 咬+六脉，≤1500 瞬发六脉，更远 冲刺+咬+六脉。板边：怒后 20% 直线吐息 / 20% 尾刺派生 / 20% 第二下尾刺派生 / 40% 横扫冰组合；怒前 50% 尾刺派生 / 50% 横扫冰组合"],
    [6, "咬 + 六脉（单发）"],
    [7, "推推冰（冰2 ≤800 先咬）"],
    [8, "冰2：前置车/后撤尾刺（中心 → 六脉，板边 → 推推冰爆）"],
    [9, "板边：按 R9 选 车 / 后撤尾刺 → 咬 → 推推冰爆", "return 之后还残留两段执行不到的代码"],
    [10, "车 → 咬 → 推推冰爆（R9 置 bit1）"], [11, "后撤尾刺 → 咬 → 推推冰爆（R9 清 bit1）"],
    [12, "中心：按 R9 选 车 / 后撤尾刺 → 咬 → 六脉", "return 之后还残留两段执行不到的代码"],
    [13, "车 → 咬 → 六脉（R9 置 bit1）"], [14, "后撤尾刺 → 咬 → 六脉（R9 清 bit1）"], [15, "车 → 咬 → 六脉（单发）"],
    [16, "咬连段：按地区中心方位选 车+咬 / 后撤尾刺+咬", "离中心 <750 时 50/50；否则选能回到中心的那招（中心在前且目标在前 → 车，目标在后 → 后撤尾刺…）"],
    [17, "中心在前方时"], [18, "中心在后方时"], [19, "中心在右侧时"], [20, "中心在左侧时"],
    [21, "车 4 → 咬"], [22, "车 3 → 咬"], [23, "后撤尾刺 → 咬（>1300 先冲刺）"],
    [25, "横扫冰组合", "在中心，或板边但本轮开头冲刺过（R7=1）→ G029 后撤尾刺+造蛋糕/冰爆；板边 → G026 车（无后摇）+横扫冰"],
    [26, "车（无后摇）→ 横扫冰（朝向地区中心）"], [27, "同 026（未使用）"], [28, "同 026，换目标方式不同"],
    [29, "后撤尾刺（无后摇）→ ≤800 造蛋糕 / 否则远距离冰爆"],
    [30, "造蛋糕"], [31, "粘鼠板（R7=2，之后下一轮必落冰）", "随从猫：50% 直线吐息 / 50% 无派生尾刺"],
    [32, "远距离冰爆（>2200 先冲刺）"],
    [33, "直线吐息（冲刺接近后 ≤1300 改走 035）"], [34, "横扫冰（冲刺接近后 ≤1600 改走 035）"],
    [35, "冲刺接近后的近战分支", "冰0：≤1000 35% 回旋尾刺 / 65% 无派生尾刺，否则直线吐息；冰1：≤800 40% 造蛋糕 / 60% 尾刺派生，否则 40% 推推冰 / 60% 尾刺派生；冰2：20% 推推冰 / 40% 尾刺派生 / 40% 横扫冰组合"],
    [36, "尾刺派生（按 R9 bit0：飞天尾刺→造蛋糕 / 回旋尾刺→粘鼠板）"],
    [37, "飞天尾刺 → 空中造蛋糕（R9 置 bit0）"], [38, "回旋尾刺 → 粘鼠板（>850 改推推冰；R9 清 bit0）"],
    [39, "第二下尾刺派生（按 R9 bit0）"], [40, "尾刺 → 飞天尾刺 → 空中造蛋糕"], [41, "尾刺 → 回旋尾刺 → 粘鼠板"],
    [42, "R9 bit0 置 1（下次尾刺派生为粘鼠板）"], [43, "R9 bit0 清 0（下次为造蛋糕）"],
    [44, "R9 bit1 置 1（下次前置为后撤尾刺）"], [45, "R9 bit1 清 0（下次前置为车）"],
    [46, "飞行中先降落"], [50, "车"], [52, "车（按距离）"], [53, "后撤尾刺"], [55, "后撤尾刺（按距离）"],
    [58, "回旋尾刺"], [65, "无派生尾刺集成"], [69, "造蛋糕（历战王版）"], [70, "落冰（历战王版）"], [71, "直线吐息"], [72, "二连直线吐息"],
    [73, "小范围横扫冰"], [74, "横扫冰"], [80, "直线吐息集成"], [84, "横扫冰集成（历战王）"], [85, "粘鼠板"], [86, "粘鼠板后续：粘住则冻结尾刺"],
    [101, "空中连招（飞天尾刺→空中招→吐息落地）"], [102, "空中连招（两次空中招）"],
    [109, "冰2 大招", "≤1250 后退、更远冲刺，然后历战王大招 + 破绽；清零 R2，R7=2，之后 G142 落冰"],
    [113, "按目标方位滑步"],
    [115, "转阶段计数器", "冰0：R0+1 → G116；冰1：R1+1 → G117；冰2：R2+1 → G118"],
    [116, "冰0 转阶段判定"], [117, "冰1 转阶段判定"], [118, "冰2 大招判定"],
    [119, "冰1 额外横扫冰", "R3+1；冰1 且 R3≥5：清零并 车/后撤尾刺 → 横扫冰；否则 G126 压起身横扫冰。冰0/冰2 清零 R3"],
    [125, "横扫冰（冰1/冰2 用 180° 横扫）"],
    [126, "压起身横扫冰（冰1）", "目标 HP≤50% 或受击硬直时：冰1 25% 车/后撤尾刺 → 横扫冰；冰2 分支权重全为 0（无效代码）"],
    [129, "车 / 后撤尾刺（按地区中心方位）"], [130, "中心在前"], [131, "中心在后"], [132, "中心在右"], [133, "中心在左"],
    [141, "额外落冰", "飞行/冰0 时不判定；R7=2（粘鼠板、大招之后）必落冰；冰2 >2200 且 ≤4400 25%、冰1 15% 落冰"],
    [142, "落冰（R7=3）"],
    [143, "远距离冲刺接近（R7=1）", ">1300 且 ≤3300：冰0 75%；冰1/冰2 按 R3：≥4 100%、≥2 50%、否则 25%（冰2 的 R3 每轮清零，固定 25%）；>3300 必冲刺"],
    [144, "咬连段（按冰阶段）"], [149, "三连尾刺 / 冰爆（按冰阶段）"],
    [150, "终结攻击：按冰阶段分发", "历战王：冰2 → 170，冰1 → 165，冰0 → 162"],
    [162, "终结攻击·冰0"], [165, "终结攻击·冰1（按愤怒）"], [166, "终结攻击·冰1·怒前"], [167, "终结攻击·冰1·怒后"],
    [170, "终结攻击·冰2（按愤怒）"], [171, "终结攻击·冰2·怒前"], [172, "终结攻击·冰2·怒后"],
    [174, "咬连段 → 终结攻击"], [175, "三连尾刺/冰爆 → 终结攻击"], [178, "咬连段 → 三连尾刺 → 终结攻击"],
    [181, "烟雾弹 AI"], [233, "冲刺接近（>700，最多 5 次）"], [239, "冲刺接近（>1900，最多 5 次）"],
    [279, "转阶段（历战王 → G280）"],
    [280, "历战王转阶段", "血量低于濒死线 7D() 或 HP≤40% 或已有冰甲 → 冰甲全开（冰2）；否则冰甲强化（冰1）+ 破绽"],
    [402, "条件检测（开头）"], [404, "历战王条件检测（开头）", "烟雾 → 410；目标状态 3/4 → 411；钩爪 7F(-999) → 429；目标状态 0/14/11、泥浆、飞行、目标状态 52 各有处理；否则 408"],
    [405, "条件检测（连段中）"], [407, "历战王条件检测（连段中）"],
    [429, "钩爪抓附时的反击"], [432, "大型怪同场 AI"],
  ].forEach((a) => put(G, ...a));

  MHWI.registerAnno("em124_00", {
    monster: { key: "em124_00", em: "em124", zh: "历战王冰呪龙", full: "历战王冰呪龙", en: "Arch-Tempered Velkhana", internalId: 79 },
    scope: "velkhana",
    actions, conditions, registers, contexts, nodes, glossary,
    movesHeader: "招式（社区俗称）",
    movesNote: "「招式」一列是社区俗称（参考 王冰THK注释.xlsx 与 B 站资料，如六脉、推推冰、造蛋糕、粘鼠板）。",
    entry: { file: M, node: "node_000" },
    // 压起身追加：node_004 末尾 R8>0 时 repeat，等于不换目标立即再走一轮攻击
    repeatEnds: [`${M}.node_004`],
    endLabels: { again: "随后不换目标再走一轮（压起身追加）" },
    state: {
      defaults: { ice: 1, enraged: false, flying: false, centerDist: 300, centerAngle: 0, hp: 100, dist: 800, angle: 0, vert: 0, regs: {}, flags: {} },
      controls: [
        {
          id: "ice", zh: "冰甲",
          options: [
            { id: "0", zh: "冰0", note: "无冰甲：历战王开局后的初始形态之一；HP≤40% 转阶段直接升冰2" },
            { id: "1", zh: "冰1", note: "冰甲强化后；R1 计数满后升冰2" },
            { id: "2", zh: "冰2", note: "冰甲全开；R2 计数满后放大招" },
          ],
          get: (s) => String(s.ice),
          set: (s, v) => { s.ice = +v; },
        },
        {
          id: "c", zh: "冰呪龙位置",
          options: [
            { id: "in", zh: "中心 <750", note: "离区域中心点 <750：R10=0（中心），车/后撤尾刺随机选" },
            { id: "mid", zh: "离中心 ≥750 且 <1500", note: "仍算中心（R10=0），但车/后撤尾刺按中心方位选择" },
            { id: "out", zh: "板边 >1825", note: "R10=1：冰2 出推推冰爆而不是六脉" },
          ],
          get: (s) => (s.centerDist < 750 ? "in" : s.centerDist < 1500 ? "mid" : "out"),
          set: (s, v) => { s.centerDist = { in: 300, mid: 1000, out: 2500 }[v]; },
        },
        {
          id: "ca", zh: "中心方位",
          options: [{ id: "0", zh: "前" }, { id: "90", zh: "右" }, { id: "180", zh: "后" }, { id: "270", zh: "左" }],
          get: (s) => String(s.centerAngle),
          set: (s, v) => { s.centerAngle = +v; },
        },
      ],
      checks: [
        { id: "rage", key: "enraged", zh: "愤怒" },
        { id: "fly", key: "flying", zh: "飞行" },
      ],
      common: ["self.current_quest().is_rank(rank.AT)", "function#10E(3,50)", "self.target.helpless_0()", "self.target(44)", "function#7F(-999)", "function#5D()", "function#7D()"],
      presets: [["正面 500", 500, 0], ["正面 1200", 1200, 0], ["侧面 900", 900, 90], ["背后 800", 800, 180], ["中距离 2000", 2000, 0], ["远处 3500", 3500, 0]],
    },
    silhouette: (s) => {
      const span = s.flying ? 2100 : 1700;
      const body = [[0, -1350], [90, -1250], [80, -1050], [150, -650], [260, -250], [230, 250], [120, 650], [60, 1300], [40, 1900], [0, 2200]];
      const wing = (k) => [[180, -450], [span, -650], [span - 120, -150], [span * 0.62, -120], [span * 0.48, 380], [230, 150]].map(([x, y]) => [k * x, y]);
      return [{ cls: "wing", pts: wing(1) }, { cls: "wing", pts: wing(-1) }, { cls: "body", pts: body, mirror: true }];
    },
    minorCats: ["move", "turn"],
    simNote: "模拟假设猎人原地不动：冲刺/滑翔接近后距离 = 停止距离，转身后正对目标；攻击本身造成的位移不模拟。「冰呪龙位置」指冰呪龙自身离区域中心点的距离（模拟器按非龙结晶之地的 1500 半径计算 R10），「中心方位」是中心点在冰呪龙朝向的哪一侧。",
    scale: { bodyLength: 3000, ringMax: 5000 },
  });
})();
