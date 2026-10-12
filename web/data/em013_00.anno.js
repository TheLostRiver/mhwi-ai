/*
 * 黑龙 Fatalis (em013_00) 注释库
 *
 * 来源与可信度标记:
 *   [代码]  直接由 THK 反编译结果读出，确定
 *   [xlsx]  黑龙THK注释.xlsx（社区玩家实测注释）
 *   [B站]   九世深渊《黑龙AI重构的最后一块拼图》bilibili opus/932887546921222162
 *   [exe]   游戏 exe（版本 421810）逆向分析，见 docs/em013-fatalis.md「exe 逆向」一节
 *   [推测]  本项目根据代码结构推断，未经实机验证
 */
(function () {
  const G = "em013_55"; // Global（THK 55）
  const M = "em013_00"; // Combat_Main（THK 00）

  // ---------- 动作 ----------
  // cat: move 移动 / turn 转身后退 / attack 攻击 / state 状态切换 / special 特殊
  const actions = {
    // 二足（l2）
    l2_walk: { zh: "二足步行", cat: "move" },
    l2_back_walk: { zh: "二足后退", cat: "turn" },
    l2_far_back_walk: { zh: "二足大幅后退", cat: "turn" },
    l2_turn: { zh: "二足转身", cat: "turn" },
    l2_search: { zh: "二足索敌", cat: "special" },
    l2_threat: { zh: "二足威吓", cat: "special" },
    l2_bind_voice: { zh: "二足咆哮", cat: "special" },
    l2_switch_l4: { zh: "趴下（二足→四足）", cat: "state" },
    l2_landing: { zh: "二足降落", cat: "state" },
    l2_switch_fly_take_off: { zh: "原地起飞", cat: "state" },
    l2_back_jump_breath_start: { zh: "后仰跳投（后跳吐息并起飞）", cat: "attack" },
    l2_stage_breath_start: { zh: "1→2 转阶段演出", cat: "state" },
    l2_stage_breath_start_02: { zh: "2→3 转阶段演出", cat: "state" },
    l2_final_mode_stage_breath_start: { zh: "三阶段终极形态大招（xlsx：3阶段三次飞）", cat: "attack" },
    l2_near_scratch: { zh: "小拍（近）", cat: "attack" },
    l2_far_scratch: { zh: "小拍（远）", cat: "attack" },
    l2_near_side_scratch: { zh: "大拍（近）", cat: "attack" },
    l2_far_side_scratch: { zh: "大拍（远）", cat: "attack" },
    l2_tail_swing: { zh: "甩尾（扫尾）", cat: "attack" },
    l2_quick_breath: { zh: "吐痰", cat: "attack" },
    l2_breath_single: { zh: "单火球", cat: "attack" },
    l2_breath_multi_start_01: { zh: "三连火球（怒后）", cat: "attack" },
    l2_breath_multi_start_02: { zh: "三连火球（快速）", cat: "attack" },
    l2_high_power_three_breath_multi_start: { zh: "三连火球（三阶段怒后强化）", cat: "attack" },
    l2_special_wide_range_fire_shoot: { zh: "扇形火（扇火）", cat: "attack", key: true },
    l2_vertical_escape_dust_explosion_start: { zh: "正面地毯火", cat: "attack" },
    l2_far_dust_explosion_start: { zh: "侧面地毯火", cat: "attack" },
    l2_line_fire_shoot: { zh: "直线火（xlsx：烧裤裆）", cat: "attack" },
    l2_snake_fire_shoot: { zh: "二足前进火", cat: "attack" },
    l2_multi_swing_dust_explosion: { zh: "二足左右火", cat: "attack" },
    l2_under_breath: { zh: "孕吐（向下喷火）", cat: "attack" },
    l2_switch_l4_under_breath: { zh: "孕吐并转四足", cat: "attack" },
    l2_switch_l4_body_press: { zh: "下压（并转四足）", cat: "attack" },
    l2_rush_start: { zh: "二足车（冲撞）", cat: "attack" },
    l2_rush_turn_start: { zh: "二足转身车", cat: "attack" },
    l2_switch_l4_rush_start: { zh: "二足车并转四足", cat: "attack" },
    l2_switch_l4_rush_turn_start: { zh: "二足转身车并转四足", cat: "attack" },
    l2_high_ground_breath: { zh: "高台火", cat: "attack" },
    l2_high_ground_zero_range_breath: { zh: "高台蓄力火", cat: "attack" },
    l2_high_ground_wide_breath: { zh: "高台横扫火", cat: "attack" },
    l2_high_ground_single_bite: { zh: "高台单咬", cat: "attack" },
    l2_high_ground_bite_1: { zh: "高台咬", cat: "attack" },
    l2_high_ground_breath_for_dragon_lance_wall: { zh: "高台火（击龙枪城墙版）", cat: "attack" },
    l2_high_ground_zero_range_breath_for_dragon_lance_wall: { zh: "高台蓄力火（击龙枪城墙版）", cat: "attack" },
    l2_high_ground_wide_breath_for_dragon_lance_wall: { zh: "高台横扫火（击龙枪城墙版）", cat: "attack" },
    l2_new_catch_attack_start: { zh: "捕食（抓人）", cat: "attack" },
    l2_new_catch_success: { zh: "捕食成功", cat: "attack" },
    l2_new_catch_const: { zh: "捕食持续", cat: "attack" },
    l2_new_catch_miss: { zh: "捕食落空", cat: "attack" },
    l2_catch_release: { zh: "捕食释放", cat: "attack" },
    l2_ride_rage_body: { zh: "骑乘挣扎（身体）", cat: "special" },
    l2_ride_rage_head: { zh: "骑乘挣扎（头）", cat: "special" },
    l2_ride_rage_tail: { zh: "骑乘挣扎（尾）", cat: "special" },
    l2_ride_tired: { zh: "骑乘疲劳", cat: "special" },
    l2_ride_finish_bind_voice: { zh: "骑乘结束咆哮", cat: "special" },
    // 四足（l4）
    l4_walk: { zh: "四足步行", cat: "move" },
    l4_back_walk: { zh: "四足后退", cat: "turn" },
    l4_far_back_walk: { zh: "四足大幅后退", cat: "turn" },
    l4_turn: { zh: "四足转身", cat: "turn" },
    l4_search: { zh: "四足索敌", cat: "special" },
    l4_threat: { zh: "四足威吓", cat: "special" },
    l4_bind_voice: { zh: "四足咆哮", cat: "special" },
    l4_switch_l2: { zh: "站起（四足→二足，xlsx：很奇怪的站起）", cat: "state" },
    l4_switch_l2_short: { zh: "站起（四足→二足）", cat: "state" },
    l4_landing: { zh: "四足降落", cat: "state" },
    l4_switch_fly_take_off: { zh: "四足原地起飞", cat: "state" },
    l4_stage_breath_start: { zh: "1→2 转阶段演出（四足）", cat: "state" },
    l4_stage_breath_start_02: { zh: "2→3 转阶段演出（四足）", cat: "state" },
    l4_final_mode_stage_breath_start: { zh: "三阶段终极形态大招（四足）", cat: "attack" },
    l4_short_bite: { zh: "小咬", cat: "attack" },
    l4_near_fire_bite: { zh: "大咬（近）", cat: "attack" },
    l4_far_fire_bite: { zh: "大咬（远）", cat: "attack" },
    l4_tail_slam: { zh: "尾砸", cat: "attack" },
    l4_quick_breath: { zh: "四足正面快速地毯（左）", cat: "attack" },
    l4_quick_breath_r: { zh: "四足正面快速地毯（右）", cat: "attack" },
    l4_breath_single: { zh: "四足单火球", cat: "attack" },
    l4_breath_multi_start_01: { zh: "四足三连火球（怒后）", cat: "attack" },
    l4_breath_multi_start_02: { zh: "四足三连火球（快速）", cat: "attack" },
    l4_far_dust_explosion_start: { zh: "四足侧面地毯火", cat: "attack" },
    l4_front_swing_breath: { zh: "四足前进火", cat: "attack" },
    l4_back_swing_breath: { zh: "四足后退火", cat: "attack" },
    l4_rush_start: { zh: "四足车", cat: "attack" },
    l4_rush_turn_start: { zh: "四足转身车", cat: "attack" },
    l4_switch_l2_rush_start: { zh: "四足车并站起", cat: "attack" },
    l4_switch_l2_rush_turn_start: { zh: "四足转身车并站起", cat: "attack" },
    l4_zero_range_breath: { zh: "蓄力火（趴下）", cat: "attack" },
    l4_zero_range_back_breath_start: { zh: "后撤蓄力火", cat: "attack" },
    l4_switch_l2_zero_range_breath: { zh: "起身蓄力火", cat: "attack" },
    l4_switch_l2_zero_range_back_breath_start: { zh: "起身后撤蓄力火", cat: "attack" },
    l4_switch_l2_high_power_three_breath_multi_start: { zh: "起身怒后蓄力三连（三阶段）", cat: "attack" },
    l4_all_angle_breath: { zh: "360° 喷火", cat: "attack" },
    l4_all_angle_breath_l: { zh: "360° 喷火（左）", cat: "attack" },
    l4_range_reset_dust_explosion_start: { zh: "后撤地毯火", cat: "attack" },
    l4_switch_l2_range_reset_dust_explosion_start: { zh: "后撤地毯火并站起", cat: "attack" },
    // 飞行
    glide_combat: { zh: "滑翔移动", cat: "move" },
    fly_turn: { zh: "空中转身", cat: "turn" },
    fly_bind_voice: { zh: "空中咆哮", cat: "special" },
    fly_breath_single: { zh: "飞天单火球", cat: "attack" },
    fly_breath_multi_start_01: { zh: "飞天三连火球（怒后）", cat: "attack" },
    fly_breath_multi_start_02: { zh: "飞天三连火球（快速）", cat: "attack" },
    fly_zigzag_breath: { zh: "Z 字火", cat: "attack" },
    fly_vertical_breath: { zh: "飞天直线火", cat: "attack" },
    fly_under_breath: { zh: "飞天孕吐", cat: "attack" },
    fly_assault_start: { zh: "俯冲（蓄力火连段）", cat: "attack" },
    fly_switch_l2_assault_start: { zh: "俯冲落地", cat: "attack" },
  };

  // ---------- 官方内部名逐词直译 ----------
  // 动作名是 Capcom 开发内部标识（游戏 exe 中可搜到 L2_SPECIAL_WIDE_RANGE_FIRE_SHOOT 等大写字符串），
  // 游戏文本里没有面向玩家的官方招式名，这里按词直译供参考。
  const glossary = {
    l2: "二足", l4: "四足", fly: "飞行", glide: "滑翔", combat: "战斗", special: "特殊", wide: "宽", range: "范围", fire: "火焰",
    shoot: "射出", breath: "吐息", single: "单发", multi: "连发", start: "起手", vertical: "纵向", escape: "后撤", dust: "粉尘",
    explosion: "爆炸", far: "远", near: "近", side: "侧", scratch: "爪击", tail: "尾", swing: "挥扫", slam: "砸", bite: "咬",
    quick: "快速", under: "下方", switch: "切换至", body: "身体", press: "压", rush: "冲撞", turn: "转身", back: "后",
    jump: "跳", take: "起", off: "飞", landing: "降落", stage: "舞台", final: "最终", mode: "形态", high: "高", ground: "台",
    power: "强力", three: "三", zero: "零", all: "全", angle: "角度", front: "前", reset: "重置", assault: "突袭",
    zigzag: "之字", snake: "蛇行", line: "直线", catch: "捕获", new: "新", success: "成功", miss: "落空", const: "持续",
    release: "释放", ride: "骑乘", rage: "暴怒", tired: "疲劳", finish: "结束", bind: "束缚", voice: "声", threat: "威吓",
    search: "索敌", walk: "步行", dragon: "龙", lance: "枪", wall: "墙", for: "用", short: "短", r: "右", l: "左",
    head: "头", attack: "攻击", "01": "1", "02": "2", "1": "1",
  };

  // ---------- 条件 ----------
  // eval: 绑定到模拟器状态；toggle: 在界面上作为开关（默认值 default）
  const conditions = {
    "function#101()": { zh: "二足站立", src: "xlsx", eval: (s) => s.stance === "l2" },
    "function#101(1)": { zh: "四足趴伏", src: "xlsx", eval: (s) => s.stance === "l4" },
    "function#103()": { zh: "一阶段", src: "xlsx", eval: (s) => s.phase === 1 },
    "function#103(1)": { zh: "二阶段", src: "xlsx", eval: (s) => s.phase === 2 },
    "function#106()": { zh: "非三阶段", src: "代码", note: "Global 四足招式里 106() 走前进/后退火、否则走 360°（三阶段专属），可确定 106(x) 即「是否进入三阶段」", eval: (s) => s.phase !== 3 },
    "function#106(1)": { zh: "三阶段", src: "xlsx", eval: (s) => s.phase === 3 },
    "self.flying()": { zh: "飞行中", eval: (s) => !!s.flying },
    "self.enraged()": { zh: "愤怒", eval: (s) => !!s.enraged },
    "function#104()": { zh: "一阶段·目标在高台", src: "xlsx", toggle: true },
    "function#104(1)": { zh: "二三阶段·目标在高台", src: "xlsx", toggle: true },
    "function#10E()": { zh: "开局保护：AI 出招计数 < 5", src: "exe", toggle: true, note: "exe 逆向：黑龙专属条件处理函数中 10E = 调参表 em013.dtt_unq 的阈值(5) > 开局计数。计数在每次切换到 AI 选择的新动作时 +1（上限 100），二足咆哮 L2_BIND_VOICE 和动作自身衔接的后续段不计；黑龙发现目标进入战斗(CombatFind/LeadFind)时清零，但同区域内有猎人仍在其仇恨列表中（仇恨值曾达阈值）时跳过清零：丢烟雾弹后重新索敌不清零，回归球离开再回来会清零。为真时扇火类节点改为随机出单火球/三连/地毯/直线火" },
    "function#10D()": { zh: "与目标之间有遮挡", src: "xlsx", toggle: true, note: "实测包括：躲在掩体后、攀附高台绳网、使用弩炮/速射炮、喝药磨刀被挡住视线等。为真时远距离大概率出车" },
    "function#102(3)": { zh: "一阶段·处于瓦砾区", src: "xlsx", toggle: true },
    "function#102(2)": { zh: "瓦砾区相关（副作用调用）", src: "推测", toggle: true },
    "function#2D(1)": { zh: "未知条件 2D(1)", src: "xlsx", toggle: true, note: "xlsx：正常一局测试从未出现。为真时地面主表换成 node_157 一组" },
    "function#110(2)": { zh: "未知条件 110(2)", src: "xlsx", toggle: true, note: "xlsx：正常一局测试从未出现" },
    "function#10A()": { zh: "未知条件 10A", src: "xlsx", toggle: true, note: "xlsx 猜测与击龙枪有关" },
    "function#111()": { zh: "对空判定前提（三阶段，疑似战斗时间较长）", src: "xlsx", toggle: true },
    "function#112(0,1)": { zh: "刚被钩爪猛撞倒地", src: "exe", toggle: true, note: "exe 逆向：112(p1,p2) = p2 ≥ 「自上次被钩爪猛撞倒地(L2/FLY_SWITCH_L4_DAMAGE_CLAW_GRAB_DOWN)以来的出招计数」。112(0,1) 即倒地后紧接着的判定。xlsx 曾猜测为角色滑坡或投石机全弹" },
    "function#113(3,40)": { zh: "未知条件 113(3,40)", src: "xlsx", toggle: true, note: "xlsx：正常一局测试从未出现" },
    "function#5D()": { zh: "丢失目标视野（烟雾弹）", src: "xlsx", toggle: true },
    "function#108()": { zh: "未知条件 108（与 quest 51612 配合）", src: "代码", toggle: true },
    "function#109()": { zh: "未知副作用 109", toggle: true },
    "function#10B()": { zh: "正在终极形态吐息 / 击龙枪倒地 / 四足咆哮", src: "exe", toggle: true, note: "exe 逆向：当前动作是 FLY_STAGE_BREATH_FINAL_MODE_02、击龙枪倒地(231~233) 或 L4_BIND_VOICE 时为真；Rage_Enter 里据此跳过愤怒咆哮" },
    "function#10C()": { zh: "索敌后的副作用调用", src: "推测", toggle: true },
    "function#114()": { zh: "捕食相关副作用", src: "推测", toggle: true },
    "function#10F()": { zh: "捕食相关副作用", src: "推测", toggle: true },
    "function#7F()": { zh: "钩爪抓附部位判定 7F()", src: "推测", toggle: true },
    "function#7F(4)": { zh: "钩爪抓附部位判定 7F(4)", src: "推测", toggle: true },
    "function#7F(6)": { zh: "钩爪抓附部位判定 7F(6)", src: "推测", toggle: true },
    "function#7F(37)": { zh: "钩爪抓附部位判定 7F(37)", src: "推测", toggle: true },
    "function#7F(38)": { zh: "钩爪抓附部位判定 7F(38)", src: "推测", toggle: true },
    "self.target(3)": { zh: "目标类型 3（未知，与索敌有关）", src: "xlsx", toggle: true },
    "self.target(4)": { zh: "目标类型 4（未知，与索敌有关）", src: "xlsx", toggle: true },
    "self.target(55)": { zh: "钩爪挂在身上", src: "xlsx", toggle: true },
    "self.target(7)": { zh: "目标类型 7", toggle: true },
    "self.target.helpless_0()": { zh: "目标处于受击硬直（坐倒/击飞/被压后起身）", src: "B站", toggle: true },
    "self.target.helpless_1()": { zh: "目标无法行动 1", toggle: true },
    "self.target.pinned()": { zh: "目标被压住", toggle: true },
    "self.above_target()": { zh: "目标在上方（对空判定；xlsx：水潭等低处不成立）", src: "xlsx", toggle: true },
    "self.part(1).is_broken(1)": { zh: "部位1 已破坏（推测左翼）", src: "推测", toggle: true, note: "两翼都破坏时：飞行中会立即降落，地面不再累计起飞计数（破翼不飞）" },
    "self.part(2).is_broken(1)": { zh: "部位2 已破坏（推测右翼）", src: "推测", toggle: true },
    "self.quest_id(51612)": { zh: "任务 51612「黑龙」（讨伐黑龙·5 次力尽）", src: "代码", toggle: true, note: "任务名取自解包的 q51612_chS.gmd；该任务一阶段使用专属的姿态计数节点 00.node_011，并在进入战斗时调用 G139" },
    "self.mounted()": { zh: "被骑乘", toggle: true },
    "self.mount_stabbed()": { zh: "骑乘中被刺", toggle: true },
  };

  // ---------- 寄存器 ----------
  const registers = {
    RegisterVar0: { zh: "二足攻击计数", note: "二足每轮 +1，四足清零。一阶段 ≥7 后每轮 10% 转四足，≥15 必转；二三阶段 ≥7 必转（1000 内 65% 下压 / 35% 孕吐，否则车）" },
    RegisterVar1: { zh: "四足攻击计数", note: "四足每轮 +1，二足清零。一阶段 ≥7 后每轮 10% 站起，≥15 必站；二三阶段 ≥7 必站（1000 内起身蓄力火，否则四足车）" },
    RegisterVar2: { zh: "一阶段高台判定计数", note: "目标连续两次判定都在高台才进入一阶段高台攻击 AI" },
    RegisterVar3: { zh: "地面攻击计数（起飞）", note: "二三阶段地面每轮 +1；≥35 后每轮 10% 起飞，≥50 必起飞；起飞/后仰跳投时清零" },
    RegisterVar4: { zh: "飞行攻击计数（降落）", note: "飞行每轮 +1；≥3 后每轮 15% 降落，≥7 必降落；地面攻击或任何降落动作清零" },
    RegisterVar5: { zh: "一阶段二足额外车计数", note: "一阶段二足且 5000 内每轮 +1；≥7 后每轮 15% 额外出车并清零" },
    RegisterVar6: { zh: "一阶段高台招计数", note: "00.node_046：前 3 次高台攻击不出横扫火，之后每次 20% 横扫火并清零；≥7 分支因判断顺序成为死代码" },
    RegisterVar7: { zh: "三阶段 HP≤40% 大招已触发" },
    RegisterVar8: { zh: "三阶段 HP≤25% 大招已触发" },
    RegisterVar9: { zh: "三阶段 HP≤5% 大招已触发" },
    RegisterVar10: { zh: "上一招是吐痰", note: "吐痰 +1；为 1 时二三阶段二足改用不含吐痰的表并清零 → 不会连续吐痰" },
    RegisterVar11: { zh: "上一招是四足车", note: "四足车 +1；为 1 时四足改用不含车的表并清零 → 不会连续四足车" },
    RegisterVar12: { zh: "骑乘攻击计数", note: "≥12 时骑乘吼（xlsx：未验证）" },
    RegisterVar13: { zh: "110(2) 条件下计数", note: "条件 110(2) 持续时每轮 +1，≥2 后大概率出车/直线火" },
    RegisterVar14: { zh: "骑乘轮次", note: "控制骑乘攻击轮次" },
  };

  // ---------- THK 上下文 ----------
  const contexts = {
    Combat_Main: "战斗主控：每轮决策从 node_000 开始，选完一招后 reset 重新判定",
    Combat_Enter: "进入战斗",
    Search: "搜索",
    Discover: "发现目标",
    Rage_Enter: "进入愤怒",
    Mount: "骑乘",
    Concealment: "隐蔽",
    Non_Combat_Main: "非战斗主控",
    Non_Combat_Hit: "非战斗受击",
    Target_Lost: "丢失目标",
    Global: "Global 招式库（THK 55）：所有具体招式与公共子程序",
  };

  // ---------- 节点标题 ----------
  const nodes = {};
  const put = (file, id, zh, note) => { nodes[`${file}.node_${String(id).padStart(3, "0")}`] = note ? { zh, note } : { zh }; };

  // Global（55）
  [
    [0, "空入口（conclude）"], [1, "移动到区域 14"], [2, "移动到区域 14"], [3, "向区域 19 步行接近"],
    [4, "反钩爪攻击 AI", "钩爪挂身时由主控 node_000 调用。飞行中：35% 俯冲落地 / 15% 直线火 / 15% 孕吐 / 35% Z 火；地面按抓附部位分到 005~010"],
    [5, "反钩爪（二足 A）"], [6, "反钩爪（二足 B）"], [7, "反钩爪（二足 C）"],
    [8, "反钩爪（四足 A）"], [9, "反钩爪（四足 B）"], [10, "反钩爪（四足 C）"],
    [11, "索敌"], [12, "咆哮"], [13, "威吓"], [14, "直接趴下"], [15, "站起（xlsx：很奇怪的站起）"], [16, "正常站起"],
    [17, "若在飞行则降落"], [18, "降落（清零飞行计数 R4）"], [19, "四足降落"],
    [20, "起飞判定入口"], [21, "二足起飞（1500 内后仰跳投，否则原地起飞；清零 R3）"], [22, "四足起飞（清零 R3）"],
    [23, "1→2 转阶段"], [24, "2→3 转阶段"], [25, "三阶段 HP 阈值大招（xlsx：3阶段三次飞）"],
  ].forEach((a) => put(G, ...a));
  for (let i = 26; i <= 45; i++) put(G, i, i <= 35 ? "二足接近步行" : i <= 42 ? "四足接近步行" : "接近步行");
  for (let i = 46; i <= 49; i++) put(G, i, "滑翔移动");
  for (let i = 50; i <= 61; i++) put(G, i, "转身 / 后退调整");
  put(G, 52, "转身（目标不在正面时先转身）", "B站：转身和后退不会单独构成一轮决策的结尾，而是攻击的前置动作");
  put(G, 56, "转身与远距离重置（大拍使用）");
  put(G, 59, "后退（贴太近时先后退）");
  put(G, 60, "大幅后退");
  [
    [62, "吐痰", "R10 +1：下一轮二三阶段二足会改用不含吐痰的表"],
    [63, "吐痰 → 35% 接扇火", "吐痰后若目标在前方 180° 且距离 >800，35% 进入 node_064"],
    [64, "扇火（开局时改为随机招）", "开局阶段 10E() 为真：25% 单火球 / 15% 三连 / 30% 正面地毯 / 30% 直线火；否则扇火"],
    [65, "小拍"], [66, "大拍"],
    [67, "大拍 → 35% 接扇火", "大拍后若目标在前方 180°（270°~90°）且距离 >800，35% 进入 node_068（扇火）"],
    [68, "扇火（开局时改为随机招）"], [69, "甩尾"], [70, "单火球"],
    [71, "三连火球（按阶段/愤怒选择版本）", "三阶段：愤怒→强化三连(074)，否则快速三连(072)；一二阶段：愤怒→怒后三连(073)，否则快速三连(072)"],
    [72, "三连火球（快速）"], [73, "三连火球（怒后）"], [74, "三连火球（三阶段怒后强化）"],
    [75, "正面地毯（必要时先后退/转身）"], [76, "直线火（xlsx：烧裤裆）"],
    [77, "孕吐（一阶段原地，二三阶段转四足）"], [78, "孕吐 → 35% 接扇火"], [79, "扇火（开局时改为随机招）"],
    [80, "侧面地毯"], [81, "扇火（开局时改为随机招；先后退/转身）", "B站称之为「最金的 81 代码」：主表里直接出扇火的入口"],
    [82, "二足车（一阶段直车，二三阶段转身车）"], [83, "二足车"], [84, "二足转身车"],
    [85, "二足前进火"], [86, "二足左右火"],
    [87, "正面地毯 → 必接扇火", "地毯后若目标在前方 180° 且距离 >800，必定进入 node_088（扇火）"],
    [88, "扇火（开局时改为随机招）"],
    [89, "单火球 + 扇火 连携", "唯一使用 comboSetting:1 的连携；xlsx：实机黑龙未使用（没有任何节点调用它）"],
    [90, "后仰跳投（清零 R3）"], [91, "下压（转四足）"], [92, "四足正面快速地毯"], [93, "小咬（必要时先后退）"],
    [94, "大咬"], [95, "尾砸"], [96, "四足单火球"], [97, "四足三连火球"], [98, "四足三连（快速）"], [99, "四足三连（怒后）"],
    [100, "四足侧面地毯"], [101, "四足前进火 / 后退火（按距离与角度）"], [102, "四足前进火"], [103, "四足后退火"],
    [104, "四足车（R11 +1）"], [105, "四足车"], [106, "四足转身车"],
    [107, "蓄力火（按阶段/愤怒/破翼选择版本）"], [108, "起身蓄力火"],
    [109, "蓄力火（趴下）"], [110, "后撤蓄力火"], [111, "起身蓄力火"], [112, "起身后撤蓄力火"], [113, "起身怒后蓄力三连（三阶段）"],
    [114, "360° 喷火（三阶段）"], [115, "后撤地毯"],
    [116, "飞天单火球"], [117, "飞天三连"], [118, "飞天三连（快速）"], [119, "飞天三连（怒后）"],
    [120, "Z 字火"], [121, "飞天直线火"], [122, "飞天孕吐"], [123, "俯冲（清零 R4）"], [124, "俯冲落地（清零 R4）"],
    [125, "高台火"], [126, "高台蓄力火"], [127, "高台横扫火"], [128, "高台单咬"], [129, "高台咬"],
    [130, "高台火（击龙枪城墙版）"], [131, "高台蓄力火（击龙枪城墙版）"], [132, "高台横扫火（击龙枪城墙版）"],
    [133, "捕食"], [134, "捕食判定"], [135, "捕食起手"], [136, "捕食成功"], [137, "捕食持续"], [138, "捕食落空"],
    [139, "开场首招（仅任务 51612「黑龙」）", "Combat_Main 不调用；由 Combat_Enter / Non_Combat_Main / Target_Lost 在任务 51612 且 109() 时调用：先降落/站起，900 内走 140、否则走 141"],
    [140, "近距离随机招集成（小拍/大拍/直线火/前进火）"], [141, "远距离随机招集成（单火球/三连/地毯/直线火）"],
    [142, "清零骑乘计数 R12（每轮开头调用）"],
  ].forEach((a) => put(G, ...a));

  // Combat_Main（00）
  [
    [0, "总控：每轮决策入口", "顺序：清骑乘计数 → 烟雾/丢失目标 → 10A → 一二阶段血量 → 三阶段血量 → 起飞降落计数 → 一阶段瓦砾 → 目标类型 → 钩爪 → 飞行/地面攻击 AI，最后 reset"],
    [1, "丢失目标判定（烟雾弹）", "5D() 为真时重新选目标并走 node_007；否则 35%/65% 重新选择目标"],
    [2, "起飞/降落判定入口（双翼都破坏时飞行中直接降落，地面不再累计起飞计数）"],
    [3, "起飞/降落计数器", "飞行：R4 +1，≥3 后 15% 降落、≥7 必降；地面（二三阶段）：R3 +1，≥35 后 10% 起飞、≥50 必起飞"],
    [4, "降落方式（高台时直接降落，否则俯冲落地）"],
    [6, "目标类型 3/4 时的回位/索敌"], [7, "丢失目标后降落并索敌"],
    [8, "飞行攻击 AI", "依次检查 110(2) 特殊攻击、二三阶段高台、5% 捕食，然后按距离 1000/5000 分到 056~061"],
    [9, "地面攻击 AI", "依次：降落、一阶段高台、二三阶段高台、112 特殊、110(2) 特殊、转姿态计数、一阶段额外车、2D(1) 表、5% 捕食、遮挡、对空，最后按 姿态×阶段×距离 进入主攻击表，结束前调用 node_109（受击追加）"],
    [10, "姿态切换计数入口"],
    [11, "姿态切换（一阶段·quest 51612 版）"],
    [12, "姿态切换（一阶段）", "二足 R0≥7 后每轮 10% 趴下（1000 内为下压），≥15 必定；四足 R1 同理站起（1000 内为起身蓄力火）"],
    [13, "姿态切换（二三阶段）", "R0/R1 ≥7 必定切换：二足 1000 内 65% 下压 / 35% 孕吐，否则车；四足 1000 内起身蓄力火，否则四足车"],
    [14, "一二阶段血量检测", "一阶段 HP≤77% → 1转2；二阶段 HP≤49% → 2转3（飞行中先降落）"],
    [15, "一阶段二足额外车", "5000 内二足每轮 R5 +1，≥7 后每轮 15% 出车并 reset"],
    [16, "三阶段二足 5% 捕食判定"],
    [17, "三阶段血量检测", "HP≤40% / ≤25% / ≤5% 各触发一次 node_025 终极形态大招（R7/R8/R9 记录是否已触发）"],
    [18, "110(2) 条件下的全状态攻击", "R13 计数；≥2 后大概率车/俯冲；遮挡 10D() 时必车"],
    [19, "对空攻击判定", "三阶段 111() 且目标在上方、垂直距离 >300 时进入"], [20, "对空（二足）：50% 车 / 10% 下压"], [21, "对空（四足）：60% 车"],
    [22, "112 特殊条件入口"], [23, "112(0,1) 四足特殊攻击"], [24, "112 特殊表（一阶段）"], [25, "112 特殊表（二阶段）"], [26, "112 特殊表（三阶段）"],
    [27, "10A 条件下的攻击", "xlsx：10A 测试未出现过，因为是三阶段代码，大概率和击龙枪有关"],
    [28, "10A 攻击表分发"], [29, "10A 表 ≤500"], [30, "10A 表 ≤900"], [31, "10A 表 ≤2000"], [32, "10A 表 ≤3500"], [33, "10A 表 ≤4500"], [34, "10A 表 >4500"],
    [35, "一阶段反瓦砾 AI", "目标在一阶段瓦砾 102(3) 中：远则车，然后出火球类攻击"], [36, "瓦砾：远距离车"], [37, "瓦砾：火球攻击"],
    [38, "遮挡时的攻击（10D）", "与目标之间有遮挡且距离在中远距离时进入 039/040，大概率车"], [39, "遮挡攻击（二足）"], [40, "遮挡攻击（四足）"],
    [41, "一阶段高台攻击 AI", "R2：连续两次判定目标在高台才进入"], [42, "高台：先站起"], [43, "高台：接近或车"], [44, "高台攻击按距离分发"],
    [45, "高台 ≤1500"], [46, "高台招选择（R6）", "前 3 次高台攻击不出横扫火；R6≥3 后每次 20% 横扫火并清零。注意 R6≥7 分支排在 ≥3 之后，永远不会执行（死代码），所以不存在「7 招必横扫火」"], [47, "高台 ≤2500：步行接近"], [48, "高台 ≤5000"], [49, "高台 >5000"], [50, "高台招（远）"],
    [51, "二三阶段高台攻击 AI"], [52, "高台（飞行）"], [53, "高台（二足）：城墙版高台招或车"], [54, "高台（四足）：站起或车"],
    [56, "飞行表 ≤1000（一二阶段）"], [57, "飞行表 ≤5000（一二阶段）"], [58, "飞行表 >5000（一二阶段）"],
    [59, "飞行表 ≤1000（三阶段）"], [60, "飞行表 ≤5000（三阶段）"], [61, "飞行表 >5000（三阶段）"],
    [109, "受击追加攻击", "目标处于受击硬直 helpless_0() 时 50% 再出一招（B站称「压起身连招」）；二三阶段另有 113(3,40) 条件 30%/50%"],
    [110, "追加攻击（二足）分发"], [136, "追加攻击（四足）分发"],
    [157, "2D(1) 条件下的地面攻击表分发"],
  ].forEach((a) => put(M, ...a));

  // 主攻击表（由 node_009 按 姿态×阶段×距离 分发；与 node_009 的分支逐一对应）
  const tables = (first, label, bands) => bands.forEach((b, i) => put(M, first + i, `主表 ${label} ${b}`));
  tables(63, "二足·一阶段", ["≤500", "≤900", "≤2000", "≤4500", ">4500"]);
  tables(68, "二足·二阶段", ["≤500", "≤900", "≤2000", "≤4500", ">4500"]);
  tables(73, "二足·二阶段·刚吐过痰", ["≤500", "≤900", "≤2000", "≤4500"]);
  tables(77, "二足·三阶段", ["≤500", "≤900", "≤2000", "≤3500", "≤4500", ">4500"]);
  tables(83, "二足·三阶段·刚吐过痰", ["≤500", "≤900", "≤2000", "≤3500", "≤4500"]);
  const bands4 = ["≤500", "≤1000", "≤1500", "≤5000", ">5000"];
  tables(89, "四足·一阶段", bands4);
  tables(94, "四足·一阶段·刚车过", bands4);
  tables(99, "四足·二阶段", bands4);
  tables(104, "四足·三阶段", bands4);
  const fill = (from, to, zh) => { for (let i = from; i <= to; i++) if (!nodes[`${M}.node_${String(i).padStart(3, "0")}`]) put(M, i, zh); };
  fill(111, 135, "追加攻击表（二足）");
  fill(137, 156, "追加攻击表（四足）");
  fill(158, 192, "2D(1) 地面攻击表");

  MHWI.registerAnno("em013_00", {
    monster: { key: "em013_00", em: "em013", zh: "黑龙", full: "黑龙 米拉博雷亚斯", en: "Fatalis", internalId: 101 },
    scope: "fatalis",
    actions, conditions, registers, contexts, nodes, glossary,
    movesHeader: "招式（社区俗称）",
    movesNote: "「招式」一列是社区俗称（参考 xlsx 与 B 站资料）。",
    entry: { file: M, node: "node_000" },
    // 模拟器状态
    state: {
      defaults: { phase: 1, stance: "l2", flying: false, enraged: false, hp: 100, dist: 800, angle: 0, vert: 0, regs: {}, flags: {} },
      phases: [
        { id: 1, zh: "一阶段", hp: 100, note: "HP≤77% 时转二阶段" },
        { id: 2, zh: "二阶段", hp: 60, note: "HP≤49% 时转三阶段；开始累计起飞计数" },
        { id: 3, zh: "三阶段", hp: 45, note: "HP≤40%/25%/5% 各触发一次终极形态大招" },
      ],
      stances: [{ id: "l2", zh: "二足" }, { id: "l4", zh: "四足" }],
      // 模拟器控件（URL 参数 ph / st / rage 与旧链接兼容）
      controls: [
        {
          id: "ph", zh: "阶段",
          options: [{ id: "1", zh: "一阶段", note: "HP≤77% 时转二阶段" }, { id: "2", zh: "二阶段", note: "HP≤49% 时转三阶段；开始累计起飞计数" }, { id: "3", zh: "三阶段", note: "HP≤40%/25%/5% 各触发一次终极形态大招" }],
          get: (s) => String(s.phase),
          set: (s, v) => { s.phase = +v; s.hp = { 1: 100, 2: 60, 3: 45 }[v]; },
        },
        {
          id: "st", zh: "姿态",
          options: [{ id: "l2", zh: "二足" }, { id: "l4", zh: "四足" }, { id: "fly", zh: "飞行" }],
          get: (s) => (s.flying ? "fly" : s.stance),
          set: (s, v) => { s.flying = v === "fly"; if (v !== "fly") s.stance = v; },
        },
      ],
      checks: [{ id: "rage", key: "enraged", zh: "愤怒" }],
      common: ["function#10E()", "function#10D()", "self.target.helpless_0()", "self.target(55)", "function#104()", "function#104(1)", "function#5D()", "self.part(1).is_broken(1)", "self.part(2).is_broken(1)", "function#102(3)"],
      presets: [["头前 1500", 1500, 0], ["头下 600", 600, 0], ["胸侧 400", 400, 70], ["侧面 1200", 1200, 90], ["背后 800", 800, 180], ["远处 4000", 4000, 0]],
    },
    // 罗盘上的俯视示意轮廓（游戏单位，原点为判定视点，前方为 -y）
    silhouette: (s) => {
      const head = s.stance === "l4" && !s.flying ? 1150 : 900;
      const body = [[0, -head - 120], [70, -head], [60, -head + 220], [110, -380], [230, -80], [210, 260], [90, 700], [40, 1500], [0, 2000]];
      const span = s.flying ? 1900 : 1500;
      const wing = (k) => [[150, -260], [span, -420], [span - 80, 120], [span * 0.6, 40], [span * 0.45, 420], [200, 260]].map(([x, y]) => [k * x, y]);
      return [{ cls: "wing", pts: wing(1) }, { cls: "wing", pts: wing(-1) }, { cls: "body", pts: body, mirror: true }];
    },
    // 统计出招时忽略的动作类别（移动/转身后退）
    minorCats: ["move", "turn"],
    // 平面图上的参考尺度（游戏单位，100 ≈ 1 米）
    scale: { bodyLength: 2400, ringMax: 5000 },
  });
})();
