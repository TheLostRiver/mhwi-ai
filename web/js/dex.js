/* 怪物图鉴浮层：搜索 + 分类筛选 + 卡片网格 + 键盘导航，开合带过渡动画 */
(function () {
  "use strict";
  const UI = MHWI.ui;
  const esc = UI.esc;
  const dex = (MHWI.dex = {});
  let query = "";
  let group = "全部";
  let activeKey = "";
  let onPick = null;

  function el() { return document.getElementById("dex"); }

  function cards() {
    const f = query.trim().toLowerCase();
    return MHWI.monsters.filter((m) =>
      (group === "全部" || m.group === group) &&
      (!f || `${m.zh} ${m.en} ${m.key} ${m.group}`.toLowerCase().includes(f)));
  }

  function renderGrid() {
    const list = cards();
    const grid = el().querySelector(".dex-grid");
    grid.innerHTML = list.map((m, i) => `
      <button class="dex-card ${m.status} ${m.key === activeKey ? "current" : ""}" data-key="${m.key}" style="--i:${i}" ${m.status === "ready" ? "" : 'aria-disabled="true"'}>
        <span class="dc-group">${esc(m.group || "")}</span>
        <span class="dc-name">${esc(m.zh)}</span>
        <span class="dc-en">${esc(m.en)}</span>
        <span class="dc-foot"><code>${m.key}</code><i>${m.key === activeKey ? "当前" : m.status === "ready" ? "已解析" : "解析中"}</i></span>
      </button>`).join("") || `<div class="dex-empty">没有匹配「${esc(query)}」的怪物</div>`;
    el().querySelector(".dex-count").textContent = `${list.length} / ${MHWI.monsters.length}`;
  }

  function renderChips() {
    const groups = ["全部"].concat((MHWI.monsterGroups || []).filter((g) => MHWI.monsters.some((m) => m.group === g)));
    el().querySelector(".dex-chips").innerHTML = groups.map((g) =>
      `<button class="${g === group ? "on" : ""}" data-g="${g}">${g}<small>${g === "全部" ? MHWI.monsters.length : MHWI.monsters.filter((m) => m.group === g).length}</small></button>`).join("");
  }

  dex.open = function (current, pick) {
    activeKey = current;
    onPick = pick;
    const root = el();
    root.innerHTML = `
      <div class="dex-backdrop" data-close="1"></div>
      <section class="dex-panel" role="dialog" aria-modal="true" aria-label="怪物图鉴">
        <header class="dex-head">
          <div><div class="kicker">MONSTER INDEX</div><h2>怪物图鉴</h2></div>
          <button class="dex-x" data-close="1" aria-label="关闭">ESC</button>
        </header>
        <div class="dex-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 L21 21" stroke="currentColor" stroke-width="1.6"/></svg>
          <input type="search" id="dex-q" placeholder="搜索 中文名 / English / em 编号" autocomplete="off" value="${esc(query)}">
          <span class="dex-count"></span>
        </div>
        <nav class="dex-chips"></nav>
        <div class="dex-grid"></div>
        <footer class="dex-foot"><kbd>↑↓←→</kbd> 选择 <kbd>Enter</kbd> 打开 <kbd>Esc</kbd> 关闭 <kbd>/</kbd> 随时呼出</footer>
      </section>`;
    renderChips();
    renderGrid();
    root.classList.remove("closing");
    root.classList.add("open");
    document.body.classList.add("dex-lock");
    const q = root.querySelector("#dex-q");
    q.focus();
    q.oninput = () => { query = q.value; renderGrid(); };
    root.querySelector(".dex-chips").onclick = (e) => {
      const b = e.target.closest("button[data-g]");
      if (!b) return;
      group = b.dataset.g;
      renderChips();
      renderGrid();
    };
    root.onclick = (e) => {
      if (e.target.closest("[data-close]")) return dex.close();
      const c = e.target.closest(".dex-card");
      if (c && c.getAttribute("aria-disabled") !== "true") pickCard(c.dataset.key);
    };
  };

  function pickCard(key) {
    const cb = onPick;
    dex.close();
    if (cb && key !== activeKey) cb(key);
  }

  dex.close = function () {
    const root = el();
    if (!root.classList.contains("open")) return;
    root.classList.add("closing");
    document.body.classList.remove("dex-lock");
    setTimeout(() => { root.classList.remove("open", "closing"); root.innerHTML = ""; }, 180);
  };

  dex.isOpen = () => el().classList.contains("open") && !el().classList.contains("closing");

  // 键盘：/ 或 Ctrl+K 打开；方向键在卡片间移动；Enter 打开；Esc 关闭
  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (!dex.isOpen()) {
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        document.getElementById("picker-btn").click();
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); dex.close(); return; }
    const cardsEl = [...el().querySelectorAll(".dex-card")];
    if (!cardsEl.length) return;
    const idx = cardsEl.indexOf(document.activeElement);
    if (e.key === "Enter") {
      e.preventDefault();
      const target = idx >= 0 ? cardsEl[idx] : cardsEl.find((c) => c.getAttribute("aria-disabled") !== "true");
      if (target && target.getAttribute("aria-disabled") !== "true") pickCard(target.dataset.key);
      return;
    }
    const cols = Math.max(1, Math.round(el().querySelector(".dex-grid").clientWidth / cardsEl[0].offsetWidth));
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (step === undefined || (typing && (e.key === "ArrowLeft" || e.key === "ArrowRight"))) return;
    e.preventDefault();
    const next = idx < 0 ? 0 : Math.min(cardsEl.length - 1, Math.max(0, idx + step));
    cardsEl[next].focus();
  });
})();
