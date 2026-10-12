/* 资料对照：社区二手资料的结论 vs 代码实证 */
(function () {
  "use strict";
  const UI = MHWI.ui;
  const esc = UI.esc;
  const V = { ok: "一致", diff: "有出入", partial: "部分一致", na: "无法验证" };

  function render(view) {
    const { notes } = UI.ctx;
    const list = notes.sources || [];
    const refs = notes.references || [];
    const count = (v) => list.filter((x) => x.verdict === v).length;
    view.innerHTML = `
      <div class="reveal">
        <div class="panel">
          <h2>资料对照 <small>CLAIM vs CODE · 一致 ${count("ok")} · 有出入 ${count("diff")} · 部分一致 ${count("partial")}</small></h2>
          <table class="grid"><thead><tr><th style="width:34%">说法</th><th>来源</th><th>判定</th><th>代码实证</th></tr></thead><tbody>
            ${list.map((x) => `<tr><td>${esc(x.claim)}</td><td><span class="tag src-${esc(x.source)}">${esc(x.source)}</span></td>
              <td><span class="verdict ${x.verdict}">${V[x.verdict]}</span></td><td class="muted">${UI.richText(x.detail)}</td></tr>`).join("")}
          </tbody></table>
        </div>
        <div class="panel" style="margin-top:20px">
          <h2>参考资料 <small>REFERENCES</small></h2>
          <ul>${refs.map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a> <span class="dim">${esc(r.note || "")}</span></li>`).join("")}</ul>
        </div>
      </div>`;
  }

  MHWI.views.sources = { render };
})();
