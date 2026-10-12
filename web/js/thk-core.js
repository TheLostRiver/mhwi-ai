/*
 * THK 解释器核心：条件求值 + 随机分支全路径枚举（精确概率）。
 * 浏览器里挂在 window.MHWI 上；Node 里 require 后得到同一个对象。
 *
 * 执行语义（参考 Leviathon 语言规范）:
 *   段内顺序 函数 → 流程控制 → 动作 → 调用 → 指令
 *   无流程控制的函数是内联条件：为假则跳过本段剩余部分（副作用函数恒为假）
 *   >> 调用压栈，return 出栈；reset 回到当前上下文 THK 的第一个节点（= 本轮决策结束）
 *   节点执行到 endf 仍未 return 则停机（视为本轮结束）
 */
(function (root) {
  "use strict";

  const MHWI = root.MHWI || (root.MHWI = {});
  MHWI.thk = MHWI.thk || {};
  MHWI.anno = MHWI.anno || {};
  MHWI.views = MHWI.views || {};
  MHWI.registerThk = (data) => { MHWI.thk[data.key] = data; };
  MHWI.registerAnno = (key, data) => { MHWI.anno[key] = data; };

  // ---------- 条件解析 ----------
  const RE = {
    dist: /^self\.distance_(2d|3d)(?:_recalc)?_to_target\(\)\.(leq|gt)\((\d+)\)$/,
    vdist: /^self\.vertical_distance_to_target\(\)\.(leq|gt)\((\d+)\)$/,
    angle: /^self\.angle_2d_(cw|ccw)_between\((\d+),(\d+)\)$/,
    hp: /^self\.hp_percent\(\)\.leq\((\d+)\)$/,
    regCmp: /^\[(\w+) (==|<=|<|>=|>|!=) (\d+)\]$/,
    regOp: /^\[(\w+) (\|-|\+\+)\]$/,
  };

  /** 把条件字符串解析成结构；同一字符串只解析一次 */
  const condCache = new Map();
  function parseCond(str) {
    let c = condCache.get(str);
    if (c) return c;
    let m;
    if ((m = RE.dist.exec(str))) c = { type: "dist", dim: m[1], op: m[2], v: +m[3] };
    else if ((m = RE.vdist.exec(str))) c = { type: "vdist", op: m[1], v: +m[2] };
    else if ((m = RE.angle.exec(str))) c = { type: "angle", dir: m[1], a: +m[2], b: +m[3] };
    else if ((m = RE.hp.exec(str))) c = { type: "hp", v: +m[1] };
    else if ((m = RE.regCmp.exec(str))) c = { type: "regCmp", reg: m[1], op: m[2], v: +m[3] };
    else if ((m = RE.regOp.exec(str))) c = { type: "regOp", reg: m[1], op: m[2] };
    else c = { type: "flag", key: str };
    c.raw = str;
    condCache.set(str, c);
    return c;
  }

  function inArc(angle, a, b) {
    return a <= b ? angle >= a && angle <= b : angle >= a || angle <= b;
  }

  function cmp(op, x, v) {
    switch (op) {
      case "leq": case "<=": return x <= v;
      case "gt": case ">": return x > v;
      case "<": return x < v;
      case ">=": return x >= v;
      case "==": return x === v;
      case "!=": return x !== v;
    }
    throw new Error("未知比较符 " + op);
  }

  /**
   * 求值条件。state: { dist, vert, angle, hp, regs:{}, flags:{} , ...怪物自定义 }
   * anno.conditions[raw].eval(state) 可覆盖默认语义（用于怪物专属函数，如黑龙的阶段判定）。
   */
  function evalCond(str, state, anno) {
    const c = parseCond(str);
    const custom = anno && anno.conditions && anno.conditions[str];
    if (custom && custom.eval) return !!custom.eval(state);
    switch (c.type) {
      case "dist": {
        const d = c.dim === "2d" ? state.dist : Math.hypot(state.dist, state.vert || 0);
        return cmp(c.op, d, c.v);
      }
      case "vdist": return cmp(c.op, Math.abs(state.vert || 0), c.v);
      case "angle": {
        const ang = c.dir === "cw" ? state.angle : (360 - state.angle) % 360;
        return inArc(ang, c.a, c.b);
      }
      case "hp": return state.hp <= c.v;
      case "regCmp": return cmp(c.op, state.regs[c.reg] || 0, c.v);
      case "regOp":
        state.regs[c.reg] = c.op === "++" ? (state.regs[c.reg] || 0) + 1 : 0;
        return false;
      case "flag": {
        if (state.flags && c.key in state.flags) return !!state.flags[c.key];
        if (custom && "default" in custom) return !!custom.default;
        return false;
      }
    }
    return false;
  }

  // ---------- 执行 ----------
  class Limit extends Error {}

  /**
   * 单次执行：choices 为随机分支选择前缀；超出前缀时取第一个非零分支并记录。
   * 返回 { actions, end, decisions:[{opts:[idx...], pick, weights}], prob, trace, regs }
   */
  function runOnce(project, anno, state0, entry, choices, opts) {
    const state = { ...state0, regs: { ...state0.regs }, flags: state0.flags };
    const files = project.files;
    const index = project._index || (project._index = buildIndex(project));
    const actions = [];
    const trace = [];
    const decisions = [];
    let prob = 1;
    let steps = 0;
    const maxSteps = opts.maxSteps || 4000;
    const maxDepth = opts.maxDepth || 64;
    const maxRepeat = opts.maxRepeat || 2;

    function execBody(body, where, depth) {
      for (const st of body) {
        if (++steps > maxSteps) throw new Limit("步数超限");
        if (st.t === "seg") {
          if (st.fn !== undefined && !evalCond(st.fn, state, anno)) continue;
          if (st.act) {
            actions.push({ name: st.act.name, args: st.act.args, file: where.file, node: where.node, line: st.line });
            trace.push({ file: where.file, node: where.node, line: st.line, kind: "act", name: st.act.name, depth });
          }
          if (st.call) {
            const sig = execNode(st.call.file, st.call.node, depth + 1);
            if (sig !== "return") return sig;
          }
          if (st.dir) return st.dir;
        } else if (st.t === "if") {
          for (let i = 0; i < st.br.length; i++) {
            const br = st.br[i];
            if (br.c === null || evalCond(br.c, state, anno)) {
              trace.push({ file: where.file, node: where.node, line: st.line, kind: "if", branch: i, cond: br.c, depth });
              const sig = execBody(br.b, where, depth);
              if (sig) return sig;
              break;
            }
          }
        } else if (st.t === "rand") {
          const weights = st.br.map((b) => b.p);
          const nonzero = weights.map((w, i) => (w > 0 ? i : -1)).filter((i) => i >= 0);
          if (!nonzero.length) continue;
          const k = decisions.length;
          const pick = k < choices.length ? choices[k] : nonzero[0];
          decisions.push({ opts: nonzero, pick });
          const total = opts.normalize ? weights.reduce((a, b) => a + b, 0) : 100;
          prob *= weights[pick] / total;
          trace.push({ file: where.file, node: where.node, line: st.line, kind: "rand", branch: pick, p: weights[pick], weights, depth });
          const sig = execBody(st.br[pick].b, where, depth);
          if (sig) return sig;
        } else if (st.t === "conclude") {
          return "conclude";
        }
      }
      return null;
    }

    function execNode(file, node, depth) {
      if (depth > maxDepth) throw new Limit("调用过深");
      const n = index[file] && index[file][node];
      if (!n) throw new Error(`找不到节点 ${file}.${node}`);
      const where = { file, node };
      trace.push({ file, node, kind: "enter", depth });
      for (let rep = 0; ; rep++) {
        const sig = execBody(n.body, where, depth);
        if (sig === "repeat") {
          if (rep >= maxRepeat) throw new Limit("repeat 循环（距离不变时会无限追击）");
          continue;
        }
        return sig === null ? "halt" : sig;
      }
    }

    let end;
    try {
      end = execNode(entry.file, entry.node, 0);
    } catch (e) {
      if (!(e instanceof Limit)) throw e;
      end = "limit:" + e.message;
    }
    return { actions, end, decisions, prob, trace, regs: state.regs };
  }

  function buildIndex(project) {
    const idx = {};
    for (const [fk, f] of Object.entries(project.files)) {
      idx[fk] = {};
      for (const n of f.nodes) idx[fk][n.name] = n;
    }
    return idx;
  }

  /** 枚举全部随机路径，返回带精确概率的结果列表 */
  function enumerate(project, anno, state, entry, opts = {}) {
    const results = [];
    const stack = [[]];
    const maxPaths = opts.maxPaths || 20000;
    while (stack.length) {
      const prefix = stack.pop();
      const r = runOnce(project, anno, state, entry, prefix, opts);
      results.push(r);
      if (results.length > maxPaths) throw new Error("路径数超限");
      for (let j = r.decisions.length - 1; j >= prefix.length; j--) {
        const d = r.decisions[j];
        for (const alt of d.opts) {
          if (alt === d.pick) continue;
          stack.push(r.decisions.slice(0, j).map((x) => x.pick).concat([alt]));
        }
      }
    }
    return results;
  }

  /** 按动作序列合并路径 */
  function summarize(results, isMinor) {
    const seqs = new Map();
    const marginal = new Map();
    let total = 0;
    for (const r of results) {
      total += r.prob;
      const main = r.actions.filter((a) => !isMinor || !isMinor(a.name));
      const key = main.map((a) => a.name).join(" > ") + " | " + r.end;
      let e = seqs.get(key);
      if (!e) seqs.set(key, (e = { key, actions: main, all: r.actions, end: r.end, prob: 0, paths: [] }));
      e.prob += r.prob;
      e.paths.push(r);
      const seen = new Set();
      for (const a of r.actions) {
        if (seen.has(a.name)) continue;
        seen.add(a.name);
        marginal.set(a.name, (marginal.get(a.name) || 0) + r.prob);
      }
    }
    return {
      total,
      sequences: [...seqs.values()].sort((a, b) => b.prob - a.prob),
      marginal: [...marginal.entries()].sort((a, b) => b[1] - a[1]),
    };
  }

  /** 收集项目里出现过的距离/角度阈值，用于把平面切成判定等价的扇区 */
  function collectThresholds(project) {
    const dist = new Set([0]);
    const ang = new Set([0, 360]);
    const visit = (s) => {
      if (!s) return;
      const c = parseCond(s);
      if (c.type === "dist" && c.dim === "2d") dist.add(c.v);
      if (c.type === "angle") {
        const a = c.dir === "cw" ? c.a : (360 - c.b) % 360;
        const b = c.dir === "cw" ? c.b : (360 - c.a) % 360;
        ang.add(a); ang.add(b);
      }
    };
    const walk = (body) => {
      for (const st of body) {
        if (st.t === "seg") visit(st.fn);
        if (st.br) for (const br of st.br) { visit(br.c); walk(br.b); }
      }
    };
    for (const f of Object.values(project.files)) for (const n of f.nodes) walk(n.body);
    return { dist: [...dist].sort((a, b) => a - b), angle: [...ang].sort((a, b) => a - b) };
  }

  Object.assign(MHWI, { parseCond, evalCond, runOnce, enumerate, summarize, collectThresholds, buildIndex });
  if (typeof module !== "undefined" && module.exports) module.exports = MHWI;
})(typeof window !== "undefined" ? window : globalThis);
