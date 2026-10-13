/* THK 代码浏览：节点列表 / 带中文释义的代码 / 交叉引用 */
(function () {
  "use strict";
  const UI = MHWI.ui;
  const esc = UI.esc;
  let filterText = "";

  function searchText(file, n) {
    if (n._search) return n._search;
    const acts = new Set();
    const walk = (b) => { for (const s of b) { if (s.t === "seg" && s.act) acts.add(UI.actionZh(s.act.name) + " " + s.act.name); if (s.br) s.br.forEach((x) => walk(x.b)); } };
    walk(n.body);
    return (n._search = `${file} ${n.name} ${UI.nodeTitle(file, n.name)} ${[...acts].join(" ")}`.toLowerCase());
  }

  function fileOrder() {
    const { project } = UI.ctx;
    const seen = new Set();
    const order = [];
    const g = UI.ctx.globalFile;
    for (const c of project.project.contexts) {
      if (seen.has(c.file) || !project.files[c.file]) continue;
      seen.add(c.file);
      order.push(c.file);
    }
    // 主控与 Global 放最前
    order.sort((a, b) => (a === UI.ctx.anno.entry.file ? -1 : b === UI.ctx.anno.entry.file ? 1 : a === g ? -1 : b === g ? 1 : 0));
    return order;
  }

  function renderList() {
    const { project, anno } = UI.ctx;
    const f = filterText.toLowerCase();
    return fileOrder().map((fk) => {
      const ctxName = UI.ctx.fileContext[fk] || "";
      const zhCtx = (anno.contexts && anno.contexts[ctxName]) || "";
      const nodes = project.files[fk].nodes.filter((n) => !f || searchText(fk, n).includes(f));
      if (!nodes.length) return "";
      return `<div class="file"><div class="fh" data-tip="${esc(zhCtx)}">${esc(ctxName)}<small>${fk}</small></div>` +
        nodes.map((n) => `<a class="n" data-k="${fk}.${n.name}" href="${UI.codeHref(fk, n.name)}"><span>${UI.nodeShort(n.name)}</span><span>${esc(UI.nodeTitle(fk, n.name) || "—")}</span></a>`).join("") + "</div>";
    }).join("");
  }

  // ---------- 代码渲染 ----------
  function condHtml(raw) {
    const cls = raw.startsWith("[") ? "reg" : "cond";
    return `<span class="${cls}">${esc(raw)}</span>`;
  }
  function gloss(text, cls = "") { return text ? `<span class="gloss ${cls}">${esc(text)}</span>` : ""; }

  function renderBody(body, file, depth, out) {
    const ind = "    ".repeat(depth);
    for (const st of body) {
      if (st.t === "seg") {
        const parts = [];
        const gl = [];
        if (st.fn) { parts.push(condHtml(st.fn)); gl.push(UI.condZh(st.fn)); }
        if (st.act) {
          parts.push(`<span class="kw">-&gt;</span> <span class="act">${UI.ctx.anno.scope || "monster"}.${esc(st.act.name)}(${st.act.args.join(",")})</span>`);
          gl.push("▶ " + UI.actionZh(st.act.name));
        }
        if (st.call) {
          const label = st.call.file === file ? st.call.node : (st.call.file === UI.ctx.globalFile ? "Global" : st.call.file) + "." + st.call.node;
          parts.push(`<span class="kw">&gt;&gt;</span> <a class="call" href="${UI.codeHref(st.call.file, st.call.node)}">${esc(label)}</a>`);
          const t = UI.nodeTitle(st.call.file, st.call.node);
          if (t) gl.push("→ " + t);
        }
        if (st.dir) parts.push(`${parts.length ? '<span class="kw">=&gt;</span> ' : ""}<span class="dir">${st.dir}</span>`);
        if (st.meta) parts.push(`<span class="meta">@ ${esc(st.meta)}</span>`);
        out.push({ line: st.line, html: ind + parts.join(" ") + gloss(gl.join("　"), st.act ? "act" : st.call ? "call" : "") });
      } else if (st.t === "conclude") {
        out.push({ html: ind + '<span class="dir">conclude</span>' + gloss("本上下文无可执行代码，交还控制") });
      } else if (st.t === "if") {
        st.br.forEach((br, i) => {
          const kw = i === 0 ? "if" : br.c === null ? "else" : "elif";
          out.push({ line: i === 0 ? st.line : undefined, html: `${ind}<span class="kw">${kw}</span>${br.c ? " " + condHtml(br.c) : ""}${br.c ? gloss(UI.condZh(br.c)) : ""}` });
          renderBody(br.b, file, depth + 1, out);
        });
        out.push({ html: `${ind}<span class="kw">endif</span>` });
      } else if (st.t === "rand") {
        const total = st.br.reduce((a, b) => a + b.p, 0) || 100;
        st.br.forEach((br, i) => {
          out.push({ line: i === 0 ? st.line : undefined, html: `${ind}<span class="kw">${i === 0 ? "random" : "elser"}</span> (${br.p})<span class="pbar" style="width:${(br.p / total) * 120}px"></span>${br.p ? gloss(UI.pct(br.p / total)) : ""}` });
          renderBody(br.b, file, depth + 1, out);
        });
        out.push({ html: `${ind}<span class="kw">endr</span>` });
      }
    }
  }

  function nodeEffects(n) {
    const calls = [], acts = new Set(), regs = new Set();
    const walk = (b) => {
      for (const s of b) {
        if (s.t === "seg") {
          if (s.call) calls.push(s.call);
          if (s.act) acts.add(s.act.name);
          if (s.fn && s.fn.startsWith("[")) regs.add(MHWI.parseCond(s.fn).reg);
        }
        if (s.br) s.br.forEach((br) => { if (br.c && br.c.startsWith("[")) regs.add(MHWI.parseCond(br.c).reg); walk(br.b); });
      }
    };
    walk(n.body);
    const uniq = [];
    const seen = new Set();
    for (const c of calls) { const k = c.file + c.node; if (!seen.has(k)) { seen.add(k); uniq.push(c); } }
    return { calls: uniq, acts: [...acts], regs: [...regs].filter(Boolean) };
  }

  function renderNode(file, node, line) {
    const n = UI.ctx.project._index[file] && UI.ctx.project._index[file][node];
    const main = UI.$("#code-main");
    const xref = UI.$("#code-xref");
    if (!n) { main.innerHTML = `<div class="panel">找不到节点 ${esc(file)}.${esc(node)}</div>`; return; }
    const info = UI.nodeInfo(file, node) || {};
    const out = [];
    renderBody(n.body, file, 1, out);
    const ctxName = UI.ctx.fileContext[file] || "";
    main.innerHTML = `
      <div class="code-head"><h2>${esc(file)}.${esc(node)}</h2><span class="tag">${esc(ctxName)}</span><span class="tag" title="THK 文件里的原始节点序号，与游戏日志一致。node_NNN 是 Leviathon 去掉空节点后重排的编号（社区注释表、文章也用这套）">原始序号 ${n.index}</span>
        <span style="font:600 16px var(--f-display);color:var(--gold)">${esc(info.zh || "")}</span></div>
      ${info.note ? `<p class="code-head note">${esc(info.note)}</p>` : ""}
      <div class="src">
        <div class="ln"><span class="no">${n.line}</span><span class="tx"><span class="kw">def</span> <span class="nodehead">${esc(node)}</span> @ ${n.index}</span></div>
        ${out.map((o) => `<div class="ln ${line && o.line === +line ? "hl" : ""}"><span class="no">${o.line || ""}</span><span class="tx">${o.html}</span></div>`).join("")}
        <div class="ln"><span class="no"></span><span class="tx"><span class="kw">endf</span></span></div>
      </div>`;

    const callers = UI.ctx.xref.callers[file + "." + node] || [];
    const eff = nodeEffects(n);
    const li = (f, nn, extra = "") => `<li>${UI.nodeLink(f, nn)} <span class="muted">${esc(UI.nodeTitle(f, nn))}</span>${extra}</li>`;
    xref.innerHTML = `
      <h3>被调用（${callers.length}）</h3><ul>${callers.map((c) => li(c.file, c.node)).join("") || '<li class="dim">无（入口或未使用）</li>'}</ul>
      <h3>调用（${eff.calls.length}）</h3><ul>${eff.calls.map((c) => li(c.file, c.node)).join("") || '<li class="dim">无</li>'}</ul>
      <h3>直接动作</h3><ul>${eff.acts.map((a) => `<li>${UI.actionChip(a)} <span class="dim mono" style="font-size:11px">${esc(a)}</span></li>`).join("") || '<li class="dim">无</li>'}</ul>
      <h3>寄存器</h3><ul>${eff.regs.map((r) => `<li data-tip="${esc((UI.ctx.anno.registers[r] || {}).note || "")}">${esc(UI.regZh(r))}</li>`).join("") || '<li class="dim">无</li>'}</ul>`;

    UI.$$("#code-list a.n").forEach((a) => a.classList.toggle("on", a.dataset.k === `${file}.${node}`));
    const hl = UI.$(".src .ln.hl");
    if (hl) hl.scrollIntoView({ block: "center" });
    else window.scrollTo({ top: 0 });
    const on = UI.$("#code-list a.n.on");
    if (on) on.scrollIntoView({ block: "nearest" });
  }

  function render(view, params) {
    view.innerHTML = `
      <div class="code reveal">
        <aside class="panel nodelist"><input type="search" id="code-filter" placeholder="搜索节点 / 招式 / 中文名" value="${esc(filterText)}" style="width:100%"><div id="code-list"></div></aside>
        <section id="code-main"></section>
        <aside class="panel xref" id="code-xref"></aside>
      </div>`;
    UI.$("#code-list").innerHTML = renderList();
    UI.$("#code-filter").oninput = (e) => { filterText = e.target.value; UI.$("#code-list").innerHTML = renderList(); };
    update(view, params);
  }

  function update(view, params) {
    const entry = UI.ctx.anno.entry;
    renderNode(params[0] || entry.file, params[1] || entry.node, params[2]);
  }

  MHWI.views.code = { render, update };
})();
