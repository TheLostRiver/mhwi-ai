/* 概览：一轮决策流程 / 阶段血线 / 计数器 / 关键结论（内容来自 data/<key>.notes.js） */
(function () {
  "use strict";
  const UI = MHWI.ui;
  const esc = UI.esc;

  /** notes 里的轻量标记：[[file.node]] → 代码链接，{{sim:query|文字}} → 模拟器链接，**x** → 强调，空行 → 分段 */
  UI.richText = function (s) {
    return esc(s)
      .replace(/\[\[(\w+)\.(node_\d+)(?:\|([^\]]+))?\]\]/g, (_, f, n, label) => UI.nodeLink(f, n, { label: label || `${f.slice(-2)}.${n.slice(5)}` }))
      .replace(/\{\{sim:([^|}]*)\|([^}]+)\}\}/g, (_, q, label) => `<a href="#/${UI.ctx.key}/sim/${q.replace(/&amp;/g, "&")}">${label}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, "<em>$1</em>")
      .replace(/\n\n/g, '<span class="pb"></span>');
  };

  function stats() {
    const { project } = UI.ctx;
    let nodes = 0, segs = 0, rands = 0, ifs = 0;
    for (const f of Object.values(project.files)) {
      nodes += f.nodes.length;
      const walk = (b) => { for (const s of b) { if (s.t === "seg") segs++; if (s.t === "rand") rands++; if (s.t === "if") ifs++; if (s.br) s.br.forEach((x) => walk(x.b)); } };
      f.nodes.forEach((n) => walk(n.body));
    }
    return [[Object.keys(project.files).length, "THK 文件"], [nodes, "节点"], [ifs, "条件分支"], [rands, "随机块"]];
  }

  function render(view) {
    const { notes, anno } = UI.ctx;
    const st = stats();
    const phases = notes.phaseMarks || [];
    const regs = Object.entries(anno.registers || {});
    view.innerHTML = `
      <div class="reveal">
        <div class="ov-hero">
          <div>
            <div class="section-title">档案摘要 <small>ABSTRACT</small></div>
            <div class="ov-lede">${UI.richText(notes.lede || "")}</div>
          </div>
          <div>
            <div class="stats">${st.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("")}</div>
            ${phases.length ? `<div class="phasebar"><div class="track"></div>
              ${phases.map((m) => `<div class="mark" style="left:${100 - m.hp}%" data-tip="${esc(m.note || "")}"><b>${m.hp}%</b>${esc(m.label)}</div>`).join("")}
              ${(notes.phaseLabels || []).map((l) => `<div class="label" style="left:${l.at}%">${esc(l.zh)}</div>`).join("")}
            </div>` : ""}
          </div>
        </div>
        <div class="ov-grid">
          <section class="panel">
            <h2>一轮决策是怎样跑完的 <small>${esc(anno.entry.file)}.${esc(anno.entry.node)}</small></h2>
            <ol class="flow">${(notes.flow || []).map((f) => `<li class="${f.terminal ? "terminal" : ""}"><b>${esc(f.title)}</b>${f.ref ? UI.nodeLink(f.ref[0], f.ref[1]) : ""}<span class="note">${UI.richText(f.note || "")}</span></li>`).join("")}</ol>
          </section>
          <section class="panel">
            <h2>计数器 <small>REGISTERS</small></h2>
            <table class="grid"><tbody>
              ${regs.map(([k, r]) => `<tr><td class="mono dim" style="white-space:nowrap">${k.replace("RegisterVar", "R")}</td><td><b style="font-weight:600">${esc(r.zh)}</b><div class="muted" style="font-size:12.5px">${esc(r.note || "")}</div></td></tr>`).join("")}
            </tbody></table>
          </section>
        </div>
        <section style="margin-top:24px">
          <div class="section-title">关键结论 <small>FINDINGS · 均可点击跳转到代码或模拟器复现</small></div>
          <div class="findings">${(notes.findings || []).map((f) => `<article class="finding${f.wide ? " wide" : ""}"><h3>${esc(f.title)}</h3><p>${UI.richText(f.body)}</p></article>`).join("")}</div>
        </section>
      </div>`;
  }

  MHWI.views.overview = { render };
})();
