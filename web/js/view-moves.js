/* 招式表：所有动作的中文名、类别与使用位置 */
(function () {
  "use strict";
  const UI = MHWI.ui;
  const esc = UI.esc;
  const CAT = { attack: "攻击", move: "移动", turn: "转身/后退", state: "状态切换", special: "特殊" };
  let cat = "attack";

  function render(view) {
    const uses = UI.ctx.xref.actionUses;
    const names = Object.keys(uses);
    const rows = names.filter((n) => cat === "all" || UI.actionCat(n) === cat)
      .sort((a, b) => UI.actionZh(a).localeCompare(UI.actionZh(b), "zh"))
      .map((n) => {
        const u = uses[n];
        const nodes = [...new Map(u.map((x) => [x.file + x.node, x])).values()];
        return `<tr><td>${UI.actionChip(n)}</td><td class="mono" style="font-size:12px;color:var(--verdigris)">${esc(UI.actionOfficial(n))}</td><td class="muted" style="font-size:12.5px">${esc(UI.actionLit(n))}</td><td class="dim">${CAT[UI.actionCat(n)] || ""}</td>
          <td>${nodes.map((x) => UI.nodeLink(x.file, x.node, { line: x.line })).join(" ")}</td></tr>`;
      }).join("");
    view.innerHTML = `
      <div class="reveal">
        <div class="panel">
          <h2>招式表 <small>${names.length} 个动作</small></h2>
          <p class="muted" style="margin:-4px 0 14px;font-size:13px">游戏没有面向玩家的官方招式名（猎人笔记只有怪物简介与攻略提示）。唯一的官方命名是 Capcom 写在游戏 exe 里的<b style="color:var(--verdigris);font-weight:600">内部动作名</b>，下表给出它与逐词直译；${esc(UI.ctx.anno.movesNote || "")}</p>
          <div class="seg" id="mv-cat" style="margin-bottom:14px">${Object.entries({ attack: "攻击", state: "状态切换", special: "特殊", turn: "转身/后退", move: "移动", all: "全部" })
            .map(([k, v]) => `<button data-c="${k}" class="${k === cat ? "on" : ""}">${v}</button>`).join("")}</div>
          <table class="grid"><thead><tr><th>${esc(UI.ctx.anno.movesHeader || "招式")}</th><th>官方内部名</th><th>直译</th><th>类别</th><th>出现位置（点击查看代码）</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
      </div>`;
    UI.$("#mv-cat").onclick = (e) => { const b = e.target.closest("button"); if (b) { cat = b.dataset.c; render(view); } };
  }

  MHWI.views.moves = { render };
})();
