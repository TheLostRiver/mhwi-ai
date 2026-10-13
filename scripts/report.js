// 生成出招概率表并写入文档的 <!-- BEGIN:tables --> ... <!-- END:tables --> 区域
// 用法: node scripts/report.js em013_00 docs/em013-fatalis.md
const fs = require("fs");
const path = require("path");
const { MHWI, load, ROOT } = require("./load");

const [key = "em013_00", docArg] = process.argv.slice(2);
const { project, anno } = load(key);
const zh = (n) => (anno.actions[n] ? anno.actions[n].zh : n);
const minor = (n) => anno.actions[n] && anno.minorCats.includes(anno.actions[n].cat);
// 表格里的短名：黑龙的括号多为版本说明，去掉更紧凑；其他怪物括号里是区分招式的信息，保留
const short = (n) => (key === "em013_00" ? zh(n).replace(/（.*?）/g, "") : zh(n));

function dist(state) {
  const res = MHWI.enumerate(project, anno, state, anno.entry);
  return MHWI.summarize(res, minor);
}
function base(over) {
  const s = JSON.parse(JSON.stringify(anno.state.defaults));
  return Object.assign(s, over, { regs: { ...(over.regs || {}) }, flags: { ...(over.flags || {}) } });
}
const pct = (p) => (Math.round(p * 1000) / 10).toString() + "%";

// 把 summarize 的序列压成「招式 x%」列表；连段用 → 连接
function cell(state, top = 6) {
  const s = dist(state);
  return s.sequences
    .slice(0, top)
    .map((q) => `${q.actions.length ? q.actions.map((a) => short(a.name)).join("→") : "（仅后退/转身）"} ${pct(q.prob)}`)
    .join("<br>");
}

const ANGLES = [
  [0, "正面 0°"], [60, "侧前 60°"], [90, "侧面 90°"], [125, "侧后 125°"], [180, "背后 180°"],
];
function table(title, over, dists, angles = ANGLES) {
  const lines = [`#### ${title}`, "", `| 距离 \\ 角度 | ${angles.map((a) => a[1]).join(" | ")} |`, `|---|${angles.map(() => "---").join("|")}|`];
  for (const [d, label] of dists) {
    const row = angles.map(([a]) => cell(base({ ...over, dist: d, angle: a })));
    lines.push(`| **${label}** | ${row.join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

/**
 * 招式可用性总表：在判定等价网格上逐格精确计算，取每个招式在各组合下能达到的最大出现概率。
 * combos: [[列名, 状态覆盖]]；grid: { maxDist, outer, reachable }（outer 为最外一格的上界）
 */
function availability(combos, grid) {
  const th = MHWI.collectThresholds(project, grid.reachable ? anno.entry : undefined);
  const ds = th.dist.filter((d) => d <= grid.maxDist).concat([grid.outer]);
  const maxP = {};
  for (const [label, over] of combos) {
    for (let i = 0; i < ds.length - 1; i++) {
      for (let j = 0; j < th.angle.length - 1; j++) {
        const state = base({ ...over, dist: (ds[i] + ds[i + 1]) / 2, angle: (th.angle[j] + th.angle[j + 1]) / 2 });
        for (const [n, p] of dist(state).marginal) {
          if (minor(n)) continue;
          maxP[n] = maxP[n] || {};
          if (!maxP[n][label] || p > maxP[n][label]) maxP[n][label] = p;
        }
      }
    }
  }
  const lines = [`| 招式 | ${combos.map(([l]) => l).join(" | ")} |`, `|---|${combos.map(() => "---").join("|")}|`];
  for (const n of Object.keys(maxP).sort((a, b) => zh(a).localeCompare(zh(b), "zh"))) {
    lines.push(`| ${zh(n)} | ${combos.map(([l]) => (maxP[n][l] ? pct(maxP[n][l]) : "—")).join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

// 各怪物的报表内容
const REPORTS = {
  em013_00() {
    const L2 = [[300, "≤500"], [700, "500~900"], [1500, "900~2000"], [3000, "2000~3500"], [4000, "3500~4500"], [5500, ">4500"]];
    const L4 = [[300, "≤500"], [750, "500~1000"], [1250, "1000~1500"], [3000, "1500~5000"], [5500, ">5000"]];
    const FLY = [[600, "≤1000"], [3000, "1000~5000"], [5500, ">5000"]];
    const phaseHp = { 1: 100, 2: 60, 3: 45 };
    const out = [];
    out.push("> 以下表格由 `node scripts/report.js` 对 THK 全路径枚举精确计算生成（寄存器全为 0、非开局、未愤怒、无特殊条件）。每格列出本轮出招序列及概率（已略去移动/转身/后退），`A→B` 表示同一轮内的连段。\n");
    for (const ph of [1, 2, 3]) {
      out.push(`### ${["", "一", "二", "三"][ph]}阶段\n`);
      out.push(table(`二足`, { phase: ph, hp: phaseHp[ph], stance: "l2" }, L2));
      out.push(table(`四足`, { phase: ph, hp: phaseHp[ph], stance: "l4" }, L4));
      if (ph > 1) out.push(table(`飞行`, { phase: ph, hp: phaseHp[ph], flying: true }, FLY, [[0, "任意角度"]]));
    }
    out.push("### 招式出现范围（各阶段/姿态下的最大出现概率）\n");
    out.push("在 0~6000 距离、0~359° 的判定等价网格上逐格精确计算，取每个招式在该阶段/姿态下能达到的最大出现概率；`—` 表示主循环在默认条件下不会出这招。\n");
    const stZh = { l2: "二足", l4: "四足", fly: "飞行" };
    const combos = [];
    for (const ph of [1, 2, 3]) for (const st of ["l2", "l4", "fly"]) if (!(ph === 1 && st === "fly")) {
      combos.push([`${ph}阶段${stZh[st]}`, { phase: ph, hp: phaseHp[ph], stance: st === "fly" ? "l2" : st, flying: st === "fly" }]);
    }
    out.push(availability(combos, { maxDist: 6000, outer: 7000 }));
    out.push("### 愤怒的影响\n");
    out.push("愤怒只改变两处版本选择：三连火球（[[em013_55.node_071]]）与蓄力火（[[em013_55.node_107]]），不改变出招权重。\n");
    return out;
  },
  em023_05() {
    const D = [[300, "≤500"], [650, "500~700"], [850, "700~1000"], [1250, "1000~1500"], [1900, "1500~2300"], [3000, ">2300"]];
    const out = [];
    out.push("> 以下表格由 `node scripts/report.js em023_05` 对 THK 全路径枚举精确计算生成：每轮开始时寄存器全为 0（不触发计数型特殊招）、目标是猎人、无特殊条件。每格列出本轮出招序列及概率（已略去移动/转身/侧跳），`A→B` 表示同一轮内的连段。模拟假设：猎人原地不动，冲刺接近后距离 = 停止距离，飞扑/悠悠球/前顶等突进攻击后视为贴身（400、正对）。\n");
    out.push("### 普通 / 愤怒（激昂个体两者主表相同）\n");
    out.push(table("普通", { enraged: false, pump: false }, D));
    out.push("### 超斗气硬化\n");
    out.push(table("硬化", { enraged: true, pump: true }, D));
    out.push("### 招式出现范围（各形态下的最大出现概率）\n");
    out.push("在 0~3500 距离、0~359° 的判定等价网格上逐格精确计算，取每个招式能达到的最大出现概率；`—` 表示主循环在该形态、寄存器为 0 时不会出这招（计数型特殊招见正文）。\n");
    out.push(availability([["普通/愤怒", { enraged: false, pump: false }], ["超斗气硬化", { enraged: true, pump: true }]], { maxDist: 3000, outer: 3500, reachable: true }));
    return out;
  },
  em124_00() {
    const D = [[150, "≤200"], [500, "200~800"], [900, "800~1000"], [1250, "1000~1500"], [1850, "1500~2200"], [2800, "2200~3300"], [3800, ">3300"]];
    const A = [[0, "正面 0°"], [90, "侧面 90°"], [180, "背后 180°"]];
    const out = [];
    out.push("> 以下表格由 `node scripts/report.js em124_00` 对 THK 全路径枚举精确计算生成：历战王任务、寄存器全为 0（不触发转阶段、额外横扫冰、压起身追加）、目标是猎人且 HP>50%、未飞行。每格列出本轮出招序列及概率（已略去移动/转身/滑步），`A→B` 表示同一轮内的连段。「中心」指冰呪龙离区域中心点 <750，「板边」指 >1500（R10=1）。模拟假设：猎人原地不动，冲刺接近后距离 = 停止距离。\n");
    const combos = [
      ["冰0", { ice: 0 }], ["冰1 怒前", { ice: 1 }], ["冰1 怒后", { ice: 1, enraged: true }],
      ["冰2 中心·怒前", { ice: 2 }], ["冰2 中心·怒后", { ice: 2, enraged: true }],
      ["冰2 板边·怒前", { ice: 2, centerDist: 2500 }], ["冰2 板边·怒后", { ice: 2, enraged: true, centerDist: 2500 }],
    ];
    for (const [title, over] of combos) out.push(table(title, over, D, A));
    out.push("### 招式出现范围（各阶段下的最大出现概率）\n");
    out.push("在 0~4400 距离、0~359° 的判定等价网格上逐格精确计算，取每个招式能达到的最大出现概率；`—` 表示该组合下主循环不会出这招。\n");
    out.push(availability(combos, { maxDist: 4400, outer: 5000, reachable: true }));
    return out;
  },
  em057_00() {
    const D = [[200, "≤350"], [600, "350~800"], [900, "800~1000"], [1800, "1000~2500"], [2800, "2500~3000"], [5000, "3000~8000"], [9000, ">8000"]];
    const A = [[0, "正面 0°"], [80, "侧面 80°"], [180, "背后 180°"]];
    const out = [];
    out.push("> 以下表格由 `node scripts/report.js em057_00` 对 THK 全路径枚举精确计算生成：寄存器全为 0、目标是猎人且未倒地、非历战个体（B9 为假）、没有刚打出受击反击、雷狼龙 HP>40%。每格列出本轮出招序列及概率（已略去移动/转身/后撤/后跳），`A→B` 表示同一轮内的连段。模拟假设：猎人原地不动，冲刺/狐步接近后距离 = 停止距离，飞扑/捕食落地后视为贴身（400、正对）。\n");
    const combos = [
      ["未超带电", {}], ["未超带电·刚蓄电", { postCharge: true }], ["未超带电·疲劳", { fatigued: true }],
      ["超带电·怒前", { charged: true }], ["超带电·怒后", { charged: true, enraged: true }],
    ];
    for (const [title, over] of combos) if (title !== "未超带电·疲劳") out.push(table(title, over, D, A));
    out.push("### 招式出现范围（各状态下的最大出现概率）\n");
    out.push("在 0~10000 距离、0~359° 的判定等价网格上逐格精确计算，取每个招式能达到的最大出现概率；`—` 表示该状态下主循环不会出这招。\n");
    out.push(availability(combos, { maxDist: 9000, outer: 10000, reachable: true }));
    return out;
  },
  em050_00() {
    const D = [[300, "≤450"], [650, "450~875"], [1100, "875~1400"], [1800, "1400~2250"], [2600, "2250~3000"], [3250, "3000~3500"], [3800, "3500~4000"]];
    const A = [[0, "正面 0°"], [90, "侧面 90°"], [180, "背后 180°"]];
    const post = { RegisterVar1: 1, RegisterVar2: 5 };
    const out = [];
    out.push("> 以下表格由 `node scripts/report.js em050_00` 对 THK 全路径枚举精确计算生成：属性切换/起降计数都未到阈值（本轮不切换、不起降）、目标是猎人且未倒地、未破角、HP>75%、R8/R9 为 0（上一轮没有普通攻击与大招记忆）。「短连段轮」= R6 为 0（本轮必走短连段），「长连段轮」= 未愤怒时 R6 已满（本轮必走长连段）。每格列出本轮出招序列及概率（已略去移动/转身/后续段），`A→B` 表示同一轮内的连段。模拟假设：猎人原地不动，冲刺/滑翔接近后距离 = 停止距离，拜年、凤凰天翔落地后视为贴身（400、正对）。\n");
    const combos = [
      ["炎·短连段轮", { elem: 1 }], ["炎·长连段轮", { elem: 1, regs: { RegisterVar6: 4 } }],
      ["冰·短连段轮", { elem: 2 }], ["冰·长连段轮", { elem: 2, regs: { RegisterVar6: 4 } }],
      ["龙（由炎）起飞前·短连段轮", { elem: 3, fromFire: true }],
      ["龙 已飞过·短连段轮", { elem: 3, regs: { ...post } }], ["龙 已飞过·长连段轮", { elem: 3, regs: { ...post, RegisterVar6: 4 } }],
      // 空中每轮先滑翔到目标 200 内（G359 → G371），猎人不动时只会出 ≤500 的招；
      // 这里打开 11(900) 跳过滑翔，按「滑翔结束、出招判定时猎人所在距离」计算
      ["炎·空中", { elem: 1, flying: true, flags: { "function#11(900)": true } }],
      ["冰·空中", { elem: 2, flying: true, flags: { "function#11(900)": true } }],
      ["龙·空中", { elem: 3, flying: true, flags: { "function#11(900)": true } }],
    ];
    for (const [title, over] of combos) out.push(table(over.flying ? `${title}（按出招判定时的距离；猎人不动时滑翔后总在 200 内）` : title, over, D, A));
    out.push("### 招式出现范围（各状态下的最大出现概率）\n");
    out.push("在 0~4500 距离、0~359° 的判定等价网格上逐格精确计算，取每个招式能达到的最大出现概率；`—` 表示该状态下主循环不会出这招。\n");
    out.push(availability(combos, { maxDist: 4000, outer: 4500, reachable: true }));
    return out;
  },
};
if (!REPORTS[key]) throw new Error("没有为 " + key + " 配置报表");
const out = REPORTS[key]();

const text = out.join("\n").replace(/\[\[(\w+)\.(node_\d+)\]\]/g, "`$1.$2`");
if (docArg) {
  const docPath = path.resolve(ROOT, docArg);
  const doc = fs.readFileSync(docPath, "utf8");
  const re = /<!-- BEGIN:tables -->[\s\S]*<!-- END:tables -->/;
  if (!re.test(doc)) throw new Error("文档中缺少 BEGIN:tables / END:tables 标记");
  fs.writeFileSync(docPath, doc.replace(re, `<!-- BEGIN:tables -->\n${text}\n<!-- END:tables -->`));
  console.log("已更新", docPath);
} else {
  console.log(text);
}
