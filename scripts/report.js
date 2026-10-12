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
    out.push("> 以下表格由 `node scripts/report.js em023_05` 对 THK 全路径枚举精确计算生成：每轮开始时寄存器全为 0（不触发计数型特殊招）、目标是猎人、无特殊条件。每格列出本轮出招序列及概率（已略去移动/转身/侧跳），`A→B` 表示同一轮内的连段。模拟假设：猎人原地不动，冲刺接近后距离 = 停止距离，飞扑/翻滚跳砸/猛冲等突进攻击后视为贴身（400、正对）。\n");
    out.push("### 普通 / 愤怒（激昂个体两者主表相同）\n");
    out.push(table("普通", { enraged: false, pump: false }, D));
    out.push("### 超斗气硬化\n");
    out.push(table("硬化", { enraged: true, pump: true }, D));
    out.push("### 招式出现范围（各形态下的最大出现概率）\n");
    out.push("在 0~3500 距离、0~359° 的判定等价网格上逐格精确计算，取每个招式能达到的最大出现概率；`—` 表示主循环在该形态、寄存器为 0 时不会出这招（计数型特殊招见正文）。\n");
    out.push(availability([["普通/愤怒", { enraged: false, pump: false }], ["超斗气硬化", { enraged: true, pump: true }]], { maxDist: 3000, outer: 3500, reachable: true }));
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
