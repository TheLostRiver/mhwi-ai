/* 界面公共工具：转义、中文释义、链接、交叉引用、提示框 */
(function () {
  "use strict";
  const UI = (MHWI.ui = {});

  UI.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  UI.pct = (p, d = 1) => (p * 100).toFixed(d).replace(/\.0+$/, "") + "%";
  UI.$ = (sel, root = document) => root.querySelector(sel);
  UI.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  UI.ctx = null; // { key, project, anno, notes, xref, globalFile, fileContext }

  UI.setMonster = function (key) {
    const project = MHWI.thk[key];
    const anno = MHWI.anno[key] || {};
    const notes = (MHWI.notes && MHWI.notes[key]) || {};
    const fileContext = {};
    for (const c of project.project.contexts) if (!fileContext[c.file]) fileContext[c.file] = c.context;
    const globalFile = project.project.contexts.find((c) => c.context === "Global").file;
    UI.ctx = { key, project, anno, notes, xref: buildXref(project), globalFile, fileContext };
    MHWI.buildIndex && (project._index = project._index || MHWI.buildIndex(project));
    return UI.ctx;
  };

  function buildXref(project) {
    const callers = {};
    const actionUses = {};
    for (const [fk, f] of Object.entries(project.files)) {
      for (const n of f.nodes) {
        const walk = (body) => {
          for (const st of body) {
            if (st.t === "seg") {
              if (st.call) {
                const k = st.call.file + "." + st.call.node;
                (callers[k] = callers[k] || []).push({ file: fk, node: n.name, line: st.line });
              }
              if (st.act) (actionUses[st.act.name] = actionUses[st.act.name] || []).push({ file: fk, node: n.name, line: st.line });
            }
            if (st.br) st.br.forEach((br) => walk(br.b));
          }
        };
        walk(n.body);
      }
    }
    return { callers, actionUses };
  }

  // ---------- 中文释义 ----------
  UI.actionZh = (name) => {
    const a = UI.ctx.anno.actions && UI.ctx.anno.actions[name];
    return a ? a.zh : name;
  };
  UI.actionCat = (name) => {
    const a = UI.ctx.anno.actions && UI.ctx.anno.actions[name];
    return a ? a.cat : "attack";
  };
  /** 官方内部名（游戏 exe 中为全大写）与逐词直译 */
  UI.actionOfficial = (name) => name.toUpperCase();
  UI.actionLit = (name) => {
    const g = UI.ctx.anno.glossary || {};
    return name.split("_").map((w) => (w in g ? g[w] : w)).join("");
  };
  UI.isMinor = (name) => (UI.ctx.anno.minorCats || []).includes(UI.actionCat(name));

  UI.nodeInfo = (file, node) => (UI.ctx.anno.nodes && UI.ctx.anno.nodes[file + "." + node]) || null;
  UI.nodeTitle = (file, node) => {
    const i = UI.nodeInfo(file, node);
    return i ? i.zh : "";
  };
  UI.fileShort = (file) => file.slice(-2);
  UI.nodeShort = (node) => node.replace("node_", "");
  UI.fileLabel = (file) => {
    const ctxName = UI.ctx.fileContext[file] || "";
    return `${file}${ctxName ? " · " + ctxName : ""}`;
  };

  const CMP = { leq: "≤", gt: ">", "<=": "≤", ">=": "≥", "<": "<", ">": ">", "==": "=", "!=": "≠" };
  /** 条件的中文释义 */
  UI.condZh = function (raw) {
    if (raw == null) return "否则";
    const anno = UI.ctx.anno;
    const c = anno.conditions && anno.conditions[raw];
    if (c) return c.zh;
    const p = MHWI.parseCond(raw);
    switch (p.type) {
      case "dist": return `${p.dim === "2d" ? "水平" : "直线"}距离 ${CMP[p.op]} ${p.v}`;
      case "vdist": return `垂直距离 ${CMP[p.op]} ${p.v}`;
      case "angle": {
        const [a, b] = p.dir === "cw" ? [p.a, p.b] : [(360 - p.b) % 360, (360 - p.a) % 360];
        return `目标在 ${a}°~${b}° ${UI.arcName(a, b)}`;
      }
      case "hp": return `HP ≤ ${p.v}%`;
      case "regCmp": return `${UI.regZh(p.reg)} ${CMP[p.op]} ${p.v}`;
      case "regOp": return `${UI.regZh(p.reg)} ${p.op === "++" ? "+1" : "清零"}`;
    }
    return raw;
  };
  UI.regZh = (reg) => {
    const r = UI.ctx.anno.registers && UI.ctx.anno.registers[reg];
    return r ? `${reg.replace("RegisterVar", "R")}「${r.zh}」` : reg;
  };
  UI.arcName = function (a, b) {
    const mid = a <= b ? (a + b) / 2 : ((a + b + 360) / 2) % 360;
    const span = a <= b ? b - a : b + 360 - a;
    if (span >= 170 && span <= 190 && (mid < 10 || mid > 350)) return "（前方 180°）";
    if (mid < 20 || mid > 340) return "（正面）";
    if (mid > 160 && mid < 200) return "（背后）";
    if (mid >= 20 && mid <= 160) return "（右侧）";
    return "（左侧）";
  };

  // ---------- 链接 ----------
  UI.codeHref = (file, node, line) => `#/${UI.ctx.key}/code/${file}/${node}${line ? "/" + line : ""}`;
  UI.nodeLink = (file, node, opts = {}) => {
    const t = UI.nodeTitle(file, node);
    const label = opts.label || `${UI.fileShort(file)}.${UI.nodeShort(node)}`;
    return `<a class="node" href="${UI.codeHref(file, node, opts.line)}" data-tip="${UI.esc(t || node)}">${UI.esc(label)}</a>`;
  };
  UI.actionChip = (name, extra = "") => {
    const a = UI.ctx.anno.actions && UI.ctx.anno.actions[name];
    const cls = UI.isMinor(name) ? "minor" : a && a.key ? "key" : "";
    const tip = `<b>${UI.esc(UI.actionZh(name))}</b><br>官方内部名 <code>${UI.esc(UI.actionOfficial(name))}</code><br>直译：${UI.esc(UI.actionLit(name))}`;
    return `<span class="chip ${cls} ${extra}" data-tip="${UI.esc(tip)}" data-tip-html="1">${UI.esc(UI.actionZh(name))}</span>`;
  };

  // ---------- 提示框 ----------
  const tip = () => document.getElementById("tooltip");
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    const t = tip();
    if (!el || !t) { if (t) t.hidden = true; return; }
    t.innerHTML = el.getAttribute("data-tip-html") === "1" ? el.dataset.tip : UI.esc(el.dataset.tip);
    t.hidden = false;
  });
  document.addEventListener("mousemove", (e) => {
    const t = tip();
    if (!t || t.hidden) return;
    const x = Math.min(e.clientX + 14, window.innerWidth - t.offsetWidth - 10);
    const y = Math.min(e.clientY + 16, window.innerHeight - t.offsetHeight - 10);
    t.style.left = x + "px";
    t.style.top = y + "px";
  });
})();
