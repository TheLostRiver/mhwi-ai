/* 出招模拟器：设定状态与站位 → 枚举 THK 全部随机路径 → 精确出招概率 */
(function () {
  "use strict";
  const UI = MHWI.ui;
  const esc = UI.esc;
  const SIZE = 600;
  const C = SIZE / 2;
  const R = 272;
  const RANGES = [2000, 3500, 5000, 7000];

  const store = {}; // 每只怪物各自的模拟状态

  function getStore() {
    const key = UI.ctx.key;
    if (!store[key]) {
      const d = UI.ctx.anno.state.defaults;
      store[key] = {
        s: JSON.parse(JSON.stringify(d)),
        range: 3500,
        heat: defaultHeat(),
        open: -1,
      };
    }
    return store[key];
  }

  function defaultHeat() {
    const acts = UI.ctx.anno.actions || {};
    return Object.keys(acts).find((k) => acts[k].key) || "";
  }

  // ---------- URL 编码（便于分享某个状态） ----------
  // 状态控件由各怪物注释的 state.controls（分段按钮）/ state.checks（勾选）描述
  const controls = () => UI.ctx.anno.state.controls || [];
  const checks = () => UI.ctx.anno.state.checks || [];

  function encodeState(st) {
    const s = st.s;
    const q = new URLSearchParams();
    for (const c of controls()) q.set(c.id, c.get(s));
    q.set("d", Math.round(s.dist)); q.set("a", Math.round(s.angle));
    if (s.vert) q.set("v", s.vert);
    for (const c of checks()) if (s[c.key]) q.set(c.id, 1);
    q.set("hp", s.hp);
    for (const [k, v] of Object.entries(s.regs)) if (v) q.set(k.replace("RegisterVar", "R"), v);
    const flags = Object.entries(s.flags).filter(([, v]) => v).map(([k]) => k);
    if (flags.length) q.set("f", flags.join("|"));
    if (st.heat) q.set("heat", st.heat);
    q.set("rng", st.range);
    return q.toString();
  }
  function decodeState(st, str) {
    if (!str) return;
    const q = new URLSearchParams(str);
    const s = st.s;
    for (const c of controls()) if (q.has(c.id)) c.set(s, q.get(c.id));
    if (q.has("d")) s.dist = +q.get("d");
    if (q.has("a")) s.angle = +q.get("a");
    s.vert = q.has("v") ? +q.get("v") : 0;
    for (const c of checks()) s[c.key] = q.has(c.id);
    if (q.has("hp")) s.hp = +q.get("hp");
    s.regs = {};
    for (const [k, v] of q) if (/^R\d+$/.test(k)) s.regs["RegisterVar" + k.slice(1)] = +v;
    s.flags = {};
    if (q.has("f")) for (const f of q.get("f").split("|")) s.flags[f] = true;
    if (q.has("heat")) st.heat = q.get("heat");
    if (q.has("rng")) st.range = +q.get("rng");
  }

  // ---------- 计算 ----------
  function run(state) {
    const { project, anno } = UI.ctx;
    const results = MHWI.enumerate(project, anno, state, anno.entry);
    return MHWI.summarize(results, UI.isMinor);
  }

  function heatCells(st) {
    const { project, anno } = UI.ctx;
    const th = project._thresholds || (project._thresholds = MHWI.collectThresholds(project, anno.entry));
    const dists = th.dist.filter((d) => d < st.range).concat([st.range]);
    const angs = th.angle;
    const cells = [];
    for (let i = 0; i < dists.length - 1; i++) {
      for (let j = 0; j < angs.length - 1; j++) cells.push({ d0: dists[i], d1: dists[i + 1], a0: angs[j], a1: angs[j + 1], p: 0 });
    }
    // 近处先算：玩家最关心的区域先出结果
    return cells;
  }
  function cellProb(st, c) {
    const { project, anno } = UI.ctx;
    const state = { ...st.s, regs: { ...st.s.regs }, dist: (c.d0 + c.d1) / 2, angle: (c.a0 + c.a1) / 2 };
    let p = 0;
    for (const r of MHWI.enumerate(project, anno, state, anno.entry, { lite: true })) if (r.actions.some((a) => a.name === st.heat)) p += r.prob;
    return p;
  }

  // ---------- 几何 ----------
  const pt = (r, deg) => {
    const t = (deg * Math.PI) / 180;
    return [C + r * Math.sin(t), C - r * Math.cos(t)];
  };
  function sector(r0, r1, a0, a1) {
    const large = a1 - a0 > 180 ? 1 : 0;
    const [x1, y1] = pt(r1, a0), [x2, y2] = pt(r1, a1);
    if (r0 <= 0.5) return `M${C},${C} L${x1},${y1} A${r1},${r1} 0 ${large} 1 ${x2},${y2} Z`;
    const [x3, y3] = pt(r0, a1), [x4, y4] = pt(r0, a0);
    return `M${x1},${y1} A${r1},${r1} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 ${large} 0 ${x4},${y4} Z`;
  }
  function heatColor(p) {
    if (p <= 0) return "rgba(255,91,31,0)";
    const t = Math.min(1, p / 0.5); // 50% 以上满色
    if (t < 0.6) return `rgba(255,91,31,${(0.12 + t * 1.1).toFixed(3)})`;
    const u = (t - 0.6) / 0.4;
    const g = Math.round(91 + (241 - 91) * u), b = Math.round(31 + (201 - 31) * u);
    return `rgba(255,${g},${b},0.85)`;
  }

  /** 怪物俯视示意轮廓：anno.silhouette(state) 返回 [{cls, pts:[[x,y]...], mirror}]（游戏单位，原点为判定视点，前方为 -y） */
  function silhouette(k, s) {
    const P = ([x, y]) => `${(C + x * k).toFixed(1)},${(C + y * k).toFixed(1)}`;
    const polys = UI.ctx.anno.silhouette ? UI.ctx.anno.silhouette(s) : [];
    return polys.map((g) => {
      const pts = g.mirror ? g.pts.concat(g.pts.slice().reverse().map(([x, y]) => [-x, y])) : g.pts;
      return `<polygon class="${g.cls}" points="${pts.map(P).join(" ")}"/>`;
    }).join("");
  }

  // ---------- 渲染 ----------
  let root, st;

  function render(view, params) {
    root = view;
    st = getStore();
    if (params[0]) decodeState(st, params[0]);
    view.innerHTML = `
      <div class="sim reveal">
        <aside class="ctrl panel" id="sim-ctrl"></aside>
        <section class="panel radar-wrap">
          <h2>威胁罗盘 <small>TOP-DOWN · 点击或拖动设定猎人位置</small><span class="info" data-tip="扇区按 THK 中出现过的全部距离/角度阈值切分，每格取中点精确计算；轮廓仅为示意。角度从${esc(UI.ctx.anno.monster.zh)}正面顺时针计（右侧为正）。距离为游戏单位（约 1 = 1cm）。">i</span></h2>
          <div class="readout" id="readout"></div>
          <svg class="radar" id="radar" viewBox="0 0 ${SIZE} ${SIZE}"></svg>
          <div class="radar-legend">
            <span>热力：</span><button type="button" class="dd-btn" id="heat-btn" aria-haspopup="listbox" aria-expanded="false"><i class="dd-swatch"></i><span class="dd-val"></span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>
            <span class="grad" data-tip="颜色：0% → 50% 及以上"></span><span class="dim">0~50%</span><span class="busy">计算中…</span>
            <span class="seg" id="range-seg">${RANGES.map((r) => `<button data-r="${r}">${r}</button>`).join("")}</span>
          </div>
          ${UI.ctx.anno.simNote ? `<p class="sim-note">${esc(UI.ctx.anno.simNote)}</p>` : ""}
        </section>
        <section class="results panel" id="results"></section>
      </div>`;
    renderControls();
    buildRadar();
    UI.$("#heat-btn").onclick = (e) => { e.stopPropagation(); openHeatMenu(); };
    UI.$("#range-seg").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      st.range = +b.dataset.r;
      buildRadar();
      refresh(true);
    };
    refresh(true);
  }

  function update(view, params) {
    if (params[0]) decodeState(st, params[0]);
    renderControls();
    buildRadar();
    refresh(true);
  }

  function renderControls() {
    const { anno } = UI.ctx;
    const s = st.s;
    const segs = controls().map((c) => {
      const cur = c.get(s);
      const btns = c.options.map((o) => `<button data-ctl="${esc(c.id)}" data-opt="${esc(o.id)}" class="${cur === o.id ? "on" : ""}"${o.note ? ` data-tip="${esc(o.note)}"` : ""}>${esc(o.zh)}</button>`).join("");
      return `<div class="field"><span class="lbl">${esc(c.zh)}</span><div class="seg">${btns}</div></div>`;
    }).join("");
    const chks = checks().map((c) => `<div class="field"><label${c.note ? ` data-tip="${esc(c.note)}"` : ""}><input type="checkbox" data-check="${esc(c.key)}" ${s[c.key] ? "checked" : ""}> ${esc(c.zh)}</label></div>`).join("");
    const conds = Object.entries(anno.conditions || {}).filter(([, c]) => c.toggle);
    const common = anno.state.common || [];
    const flagOn = (raw, c) => (raw in s.flags ? s.flags[raw] : !!c.default);
    const toggle = ([raw, c]) => `<label data-tip="${esc((c.note || c.zh) + "  ·  " + raw)}"><input type="checkbox" data-flag="${esc(raw)}" ${flagOn(raw, c) ? "checked" : ""}><span>${esc(c.zh)} ${c.src ? `<span class="tag src-${esc(c.src)}">${esc(c.src)}</span>` : ""}<code>${esc(raw)}</code></span></label>`;
    const regs = Object.entries(anno.registers || {}).map(([k, r]) =>
      `<span data-tip="${esc(r.note || r.zh)}">${esc(r.zh)} <span class="rn">${k.replace("RegisterVar", "R")}</span></span>${UI.stepper({ min: 0, max: 99, step: 1, "data-reg": k, value: s.regs[k] || 0 })}`).join("");
    const presets = anno.state.presets || [
      ["头前 1500", 1500, 0], ["头下 600", 600, 0], ["侧面 1200", 1200, 90], ["背后 800", 800, 180], ["远处 4000", 4000, 0],
    ];
    UI.$("#sim-ctrl").innerHTML = `
      <h2>状态 <small>STATE</small></h2>
      ${segs}${chks}
      <div class="field"><span class="lbl">HP <b id="hp-v" class="mono">${s.hp}%</b></span><input type="range" id="hp" min="0" max="100" value="${s.hp}" style="--fill:${s.hp}%"></div>
      <div class="field"><span class="lbl">猎人站位</span>
        <div class="row">${UI.stepper({ id: "dist", step: 50, min: 0, value: Math.round(s.dist) })} 距离</div>
        <div class="row" style="margin-top:6px">${UI.stepper({ id: "angle", step: 5, value: Math.round(s.angle) })} 角度°</div>
        <div class="row" style="margin-top:6px">${UI.stepper({ id: "vert", step: 50, value: s.vert || 0 })} 高度差</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">${presets.map(([n, d, a]) => `<button class="btn" data-pd="${d}" data-pa="${a}">${n}</button>`).join("")}</div>
      </div>
      <details class="fold"><summary>计数器（寄存器）</summary><div class="regs">${regs}</div></details>
      <details class="fold" open><summary>常见条件</summary><div class="toggles">${conds.filter(([r]) => common.includes(r)).map(toggle).join("")}</div></details>
      <details class="fold"><summary>其他 / 未知条件</summary><div class="toggles">${conds.filter(([r]) => !common.includes(r)).map(toggle).join("")}</div></details>
      <div style="display:flex;gap:8px"><button class="btn" id="reset">重置</button><button class="btn" id="share" data-tip="复制当前状态链接">复制链接</button></div>`;

    const ctrl = UI.$("#sim-ctrl");
    ctrl.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.ctl) {
        controls().find((c) => c.id === b.dataset.ctl).set(s, b.dataset.opt);
      } else if (b.dataset.pd) {
        s.dist = +b.dataset.pd; s.angle = +b.dataset.pa;
      } else if (b.id === "reset") {
        st.s = JSON.parse(JSON.stringify(anno.state.defaults));
      } else if (b.id === "share") {
        navigator.clipboard && navigator.clipboard.writeText(location.href);
        b.textContent = "已复制";
        setTimeout(() => (b.textContent = "复制链接"), 1200);
        return;
      } else return;
      renderControls();
      refresh(true);
    };
    ctrl.oninput = (e) => {
      const t = e.target;
      if (t.id === "hp") { s.hp = +t.value; UI.$("#hp-v").textContent = s.hp + "%"; }
      else if (t.id === "dist") s.dist = Math.max(0, +t.value || 0);
      else if (t.id === "angle") { s.angle = ((+t.value || 0) % 360 + 360) % 360; if (+t.value !== s.angle) t.value = s.angle; }
      else if (t.id === "vert") s.vert = +t.value || 0;
      else if (t.dataset.check) { checks().find((c) => c.key === t.dataset.check).apply?.(s, t.checked); s[t.dataset.check] = t.checked; }
      else if (t.dataset.flag) s.flags[t.dataset.flag] = t.checked;
      else if (t.dataset.reg) s.regs[t.dataset.reg] = +t.value || 0;
      else return;
      // 热力图只依赖站位以外的状态
      refresh(t.id !== "dist" && t.id !== "angle");
    };
  }

  function buildRadar() {
    const svg = UI.$("#radar");
    const k = R / st.range;
    const th = UI.ctx.project._thresholds || (UI.ctx.project._thresholds = MHWI.collectThresholds(UI.ctx.project, UI.ctx.anno.entry));
    const rings = th.dist.filter((d) => d > 0 && d <= st.range);
    const major = new Set([500, 900, 1000, 1500, 2000, 3500, 4500, 5000]);
    let g = `<g id="cells"></g>`;
    g += rings.map((d) => `<circle class="ring ${major.has(d) ? "major" : ""}" cx="${C}" cy="${C}" r="${d * k}"/>`).join("");
    g += `<circle class="ring major" cx="${C}" cy="${C}" r="${R}"/>`;
    g += th.angle.filter((a) => a < 360).map((a) => { const [x, y] = pt(R, a); return `<line class="ray" x1="${C}" y1="${C}" x2="${x}" y2="${y}"/>`; }).join("");
    let lastY = 1e9;
    g += rings.filter((d) => major.has(d)).map((d) => {
      const [x, y] = pt(d * k, 200);
      if (lastY - y < 12) return "";
      lastY = y;
      return `<text class="ring-label" x="${x + 3}" y="${y}">${d}</text>`;
    }).join("");
    g += `<text class="compass" x="${C}" y="16" text-anchor="middle">正面 0°</text>
          <text class="compass" x="${SIZE - 6}" y="${C + 4}" text-anchor="end">右 90°</text>
          <text class="compass" x="${C}" y="${SIZE - 6}" text-anchor="middle">背后 180°</text>
          <text class="compass" x="6" y="${C + 4}">左 270°</text>`;
    g += `<g id="sil">${silhouette(k, st.s)}</g>`;
    g += `<g class="hunter" id="hunter"><circle class="halo" r="9"/><circle class="core" r="5.5"/></g>`;
    svg.innerHTML = g;

    const toState = (e) => {
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * SIZE - C;
      const y = ((e.clientY - rect.top) / rect.height) * SIZE - C;
      const r = Math.min(Math.hypot(x, y), R);
      st.s.dist = Math.round(r / k / 10) * 10;
      st.s.angle = Math.round(((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360);
      UI.$("#dist").value = st.s.dist;
      UI.$("#angle").value = st.s.angle;
      refresh(false);
    };
    let drag = false;
    svg.onpointerdown = (e) => { drag = true; svg.setPointerCapture(e.pointerId); toState(e); };
    svg.onpointermove = (e) => { if (drag) toState(e); };
    svg.onpointerup = () => { drag = false; };
  }

  let heatTimer = 0;
  function refresh(recalcHeat) {
    const s = st.s;
    const k = R / st.range;
    // 猎人位置
    const [hx, hy] = pt(Math.min(s.dist * k, R), s.angle);
    const hunter = UI.$("#hunter");
    hunter.setAttribute("transform", `translate(${hx},${hy})`);
    UI.$("#sil").innerHTML = silhouette(k, s);
    const zone = UI.arcName(s.angle, s.angle).replace(/[（）]/g, "");
    const tags = controls().map((c) => (c.options.find((o) => o.id === c.get(s)) || {}).zh)
      .concat(checks().filter((c) => s[c.key]).map((c) => c.zh)).filter(Boolean).concat([`HP ${s.hp}%`]);
    UI.$("#readout").innerHTML = `<span>距离 <b>${Math.round(s.dist)}</b></span><span>角度 <b>${Math.round(s.angle)}°</b> ${zone}</span><span>${esc(tags.join(" · "))}</span>`;
    renderResults();
    history.replaceState(null, "", `#/${UI.ctx.key}/sim/${encodeState(st)}`);
    if (recalcHeat) {
      clearTimeout(heatTimer);
      heatTimer = setTimeout(renderHeat, 30);
    }
  }

  // 热力图分批计算：每批约 12ms，边算边上色；状态变化时作废旧任务
  let heatGen = 0;
  function renderHeat() {
    UI.$("#heat-btn .dd-val").textContent = st.heat ? UI.actionZh(st.heat) : "（无）";
    UI.$$("#range-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.r === st.range));
    const cells = heatCells(st);
    const k = R / st.range;
    const box = UI.$("#cells");
    box.innerHTML = cells.map((c, i) =>
      `<path class="cell" data-i="${i}" d="${sector(c.d0 * k, c.d1 * k, c.a0, c.a1)}" fill="${heatColor(0)}"><title>${c.d0}~${c.d1} · ${c.a0}°~${c.a1}°</title></path>`).join("");
    const gen = ++heatGen;
    const els = box.children;
    const wrap = UI.$(".radar-wrap");
    if (!st.heat) { wrap && wrap.classList.remove("computing"); return; }
    wrap && wrap.classList.add("computing");
    let i = 0;
    const step = () => {
      if (gen !== heatGen || !els.length) return;
      const t0 = performance.now();
      while (i < cells.length && performance.now() - t0 < 12) {
        const c = cells[i];
        c.p = cellProb(st, c);
        const el = els[i];
        el.setAttribute("fill", heatColor(c.p));
        el.firstChild.textContent = `${c.d0}~${c.d1} · ${c.a0}°~${c.a1}° · ${UI.pct(c.p)}`;
        i++;
      }
      if (i < cells.length) setTimeout(step, 0);
      else wrap && wrap.classList.remove("computing");
    };
    step();
  }

  /** 热力招式选择：按类别分组，组内按当前站位的出现概率排序 */
  function openHeatMenu() {
    const CAT = { attack: "攻击", state: "状态切换", special: "特殊" };
    const used = Object.keys(UI.ctx.xref.actionUses).filter((n) => !UI.isMinor(n));
    const p = (n) => st.marginal.get(n) || 0;
    const items = [{ value: "", label: "（无）", group: "" }];
    for (const [cat, title] of Object.entries(CAT)) {
      used.filter((n) => UI.actionCat(n) === cat)
        .sort((a, b) => p(b) - p(a) || UI.actionZh(a).localeCompare(UI.actionZh(b), "zh"))
        .forEach((n) => items.push({ value: n, label: UI.actionZh(n), sub: n, group: title, meta: p(n) ? UI.pct(p(n)) : "—", dim: !p(n) }));
    }
    UI.dropdown.open(UI.$("#heat-btn"), {
      items, value: st.heat, minWidth: 320, placeholder: "搜索招式（中文 / 内部名）", caption: "右侧数字：当前站位下本轮出这招的概率",
      onSelect: (v) => { st.heat = v; refresh(true); },
    });
  }

  function renderResults() {
    const res = run(st.s);
    st.marginal = new Map(res.marginal);
    const box = UI.$("#results");
    const seqs = res.sequences.slice(0, 40);
    const rows = seqs.map((q, i) => {
      const chips = q.actions.length ? q.actions.map((a) => UI.actionChip(a.name)).join('<span class="arrow">→</span>') : '<span class="dim">（本轮无攻击，仅移动/转身）</span>';
      const end = q.end !== "reset" ? `<span class="end">[${esc(q.end)}]</span>` : "";
      return `<div class="seqrow ${st.open === i ? "open" : ""}" data-i="${i}"><div class="bar" style="width:${(q.prob * 100).toFixed(2)}%"></div><span class="pct">${UI.pct(q.prob)}</span><div class="chips">${chips}${end}</div></div>` +
        (st.open === i ? renderTrace(q.paths.sort((a, b) => b.prob - a.prob)[0]) : "");
    }).join("");
    const marg = res.marginal.filter(([n]) => !UI.isMinor(n)).map(([n, p]) =>
      `<span class="n ${n === st.heat ? "sel" : ""}" data-heat="${n}" style="cursor:pointer" data-tip="${esc(n)} · 点击查看热力分布">${esc(UI.actionZh(n))}<i style="width:${p * 100}%"></i></span><span class="p">${UI.pct(p)}</span>`).join("");
    box.innerHTML = `
      <h2>本轮出招 <small>EXACT · ${res.sequences.reduce((a, q) => a + q.paths.length, 0)} 条路径</small></h2>
      <h3>动作序列（含连段，已略去移动/转身）</h3>
      <div class="seqs">${rows || '<span class="dim">无结果</span>'}</div>
      <h3 style="margin-top:18px">各动作出现概率</h3>
      <div class="marg">${marg}</div>`;
    box.onclick = (e) => {
      const r = e.target.closest(".seqrow");
      if (r) { st.open = st.open === +r.dataset.i ? -1 : +r.dataset.i; renderResults(); return; }
      const h = e.target.closest("[data-heat]");
      if (h) { st.heat = h.dataset.heat; refresh(true); }
    };
  }

  function renderTrace(path) {
    if (!path) return "";
    const lines = [];
    for (const t of path.trace) {
      const pad = `padding-left:${t.depth * 14}px`;
      if (t.kind === "enter") {
        const title = UI.nodeTitle(t.file, t.node);
        lines.push(`<div class="t enter" style="${pad}">${UI.nodeLink(t.file, t.node)} <span class="muted">${esc(title)}</span></div>`);
      } else if (t.kind === "if") {
        lines.push(`<div class="t if" style="${pad};padding-left:${t.depth * 14 + 18}px"><a href="${UI.codeHref(t.file, t.node, t.line)}">✓</a> ${esc(UI.condZh(t.cond))}</div>`);
      } else if (t.kind === "rand") {
        lines.push(`<div class="t rand" style="padding-left:${t.depth * 14 + 18}px"><a href="${UI.codeHref(t.file, t.node, t.line)}">🎲</a> 随机 ${t.p}% <span class="dim">(${t.weights.join("/")})</span></div>`);
      } else if (t.kind === "act") {
        lines.push(`<div class="t act" style="padding-left:${t.depth * 14 + 18}px">▶ ${esc(UI.actionZh(t.name))} <span class="dim mono">${esc(t.name)}</span></div>`);
      }
    }
    return `<div class="trace">${lines.join("")}</div>`;
  }

  MHWI.views.sim = { render, update };
})();
