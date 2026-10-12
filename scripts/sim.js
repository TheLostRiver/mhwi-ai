// 命令行出招概率计算
// 用法: node scripts/sim.js em013_00 phase=1 stance=l2 dist=800 angle=0 [enraged=1] [flying=1] [hp=60]
//       [R0=7] [flag:"function#10E()"=1] [--paths] [--all]
const { MHWI, load } = require("./load");

const [key = "em013_00", ...rest] = process.argv.slice(2);
const { project, anno } = load(key);
const state = JSON.parse(JSON.stringify(anno.state.defaults));
let showPaths = false;
let showAll = false;
for (const arg of rest) {
  if (arg === "--paths") { showPaths = true; continue; }
  if (arg === "--all") { showAll = true; continue; }
  const eq = arg.lastIndexOf("=");
  const k = arg.slice(0, eq);
  const v = arg.slice(eq + 1);
  if (k.startsWith("flag:")) state.flags[k.slice(5)] = v === "1" || v === "true";
  else if (/^R\d+$/.test(k)) state.regs["RegisterVar" + k.slice(1)] = +v;
  else if (k === "stance") state.stance = v;
  else state[k] = v === "true" ? true : v === "false" ? false : isNaN(+v) ? v : +v;
}
if (state.flying === 1) state.flying = true;
if (state.enraged === 1) state.enraged = true;

const zh = (name) => (anno.actions[name] ? anno.actions[name].zh : name);
const minor = (name) => !showAll && anno.actions[name] && anno.minorCats.includes(anno.actions[name].cat);
const results = MHWI.enumerate(project, anno, state, anno.entry);
const sum = MHWI.summarize(results, minor);
const pct = (p) => (p * 100).toFixed(2).padStart(6) + "%";

console.log(`状态: ${JSON.stringify(state)}`);
console.log(`路径数 ${results.length}，概率和 ${sum.total.toFixed(6)}\n`);
console.log("== 本轮出招序列 ==");
for (const s of sum.sequences) {
  const seq = s.actions.length ? s.actions.map((a) => zh(a.name)).join(" → ") : "（无攻击动作）";
  console.log(`${pct(s.prob)}  ${seq}${s.end === "reset" ? "" : "  [" + s.end + "]"}`);
  if (showPaths) for (const p of s.paths.slice(0, 3)) console.log("          " + p.trace.filter((t) => t.kind === "enter").map((t) => `${t.file.slice(-2)}.${t.node.slice(5)}`).join(" > "));
}
console.log("\n== 各动作出现概率 ==");
for (const [name, p] of sum.marginal) if (!minor(name)) console.log(`${pct(p)}  ${zh(name)}  (${name})`);
