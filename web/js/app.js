/* 路由与怪物数据加载。路由格式: #/<怪物key>/<页签>/<参数...> */
(function () {
  "use strict";
  const UI = MHWI.ui;
  MHWI.views = MHWI.views || {};
  const loaded = {};
  // 与 index.html 中资源的 ?v= 保持一致，避免浏览器缓存旧数据
  const VERSION = (document.currentScript && new URL(document.currentScript.src).searchParams.get("v")) || "";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = VERSION ? `${src}?v=${VERSION}` : src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("加载失败: " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureMonster(key) {
    if (loaded[key]) return loaded[key];
    const m = MHWI.monsters.find((x) => x.key === key);
    if (!m || m.status !== "ready") throw new Error("该怪物尚未完成解析");
    loaded[key] = (async () => { for (const f of m.files) await loadScript(f); })();
    return loaded[key];
  }

  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const def = MHWI.monsters.find((m) => m.status === "ready").key;
    return { key: parts[0] || def, tab: parts[1] || "overview", params: parts.slice(2) };
  }

  // ---------- 刊头的当前怪物按钮：点击打开图鉴浮层（js/dex.js） ----------
  function renderPicker(active) {
    const el = document.getElementById("monster-picker");
    const cur = MHWI.monsters.find((m) => m.key === active) || MHWI.monsters[0];
    const ready = MHWI.monsters.filter((m) => m.status === "ready").length;
    el.innerHTML = `
      <button class="picker-btn" id="picker-btn" aria-haspopup="dialog" title="切换怪物（快捷键 / 或 Ctrl+K）">
        <span class="pk-text"><span class="pk-name">${UI.esc(cur.zh)}</span><span class="pk-meta">${UI.esc(cur.en)} · ${cur.key}</span></span>
        <span class="pk-sep"></span>
        <span class="pk-action"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 15.5 L21 21" stroke="currentColor" stroke-width="1.8"/></svg>图鉴<small>${ready}/${MHWI.monsters.length}</small></span>
      </button>`;
    el.querySelector("#picker-btn").onclick = () =>
      MHWI.dex.open(active, (key) => { location.hash = `#/${key}/${parseHash().tab}`; });
  }

  // 页签下方的滑动指示条
  function moveInk() {
    const on = UI.$("#tabs a.on");
    const ink = UI.$("#tabs .tab-ink");
    if (!on || !ink) return;
    ink.style.width = on.offsetWidth - 28 + "px";
    ink.style.transform = `translateX(${on.offsetLeft + 14}px)`;
  }
  window.addEventListener("resize", moveInk);

  let lastRender = "";
  let renderedSig = ""; // 已真正画到页面上的「怪物/页签」；视图过渡是异步的，可能落后于 lastRender
  let routeGen = 0;
  async function route() {
    const gen = ++routeGen;
    const { key, tab, params } = parseHash();
    const view = document.getElementById("view");
    try {
      await ensureMonster(key);
    } catch (e) {
      if (gen !== routeGen) return;
      renderPicker(key);
      view.innerHTML = `<div class="panel">${UI.esc(e.message)}</div>`;
      return;
    }
    if (gen !== routeGen) return; // 加载期间又跳转了，这次作废
    const v = MHWI.views[tab] || MHWI.views.overview;
    const sig = key + "/" + tab;
    // 同一页签内的参数变化交给视图自己处理，避免整页重绘丢失状态
    if (sig === lastRender && sig === renderedSig && v.update) { v.update(view, params); return; }
    const monsterChanged = !lastRender.startsWith(key + "/");
    lastRender = sig;

    const swap = () => {
      if (gen !== routeGen) return; // 过渡回调执行前已有更新的跳转
      if (!UI.ctx || UI.ctx.key !== key) UI.setMonster(key);
      const a = UI.ctx.anno.monster || {};
      renderPicker(key);
      document.getElementById("monster-title").textContent = a.full || a.zh || key;
      document.getElementById("monster-sub").textContent = `${a.en || ""} · ${key} · 怪物 AI（THK）解析`;
      document.title = `${a.zh || key} · 古龙研究档案`;
      for (const t of UI.$$("#tabs a")) {
        t.classList.toggle("on", t.dataset.tab === tab);
        t.href = `#/${key}/${t.dataset.tab}`;
      }
      moveInk();
      view.innerHTML = "";
      v.render(view, params);
      renderedSig = sig;
      if (monsterChanged) window.scrollTo({ top: 0 });
    };
    // 切怪物与切页签用不同的过渡（见 app.css 的 view-transition 部分）
    document.documentElement.dataset.swap = monsterChanged ? "monster" : "tab";
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // 连续快速切页时上一个过渡会被跳过，其 Promise 以 AbortError 拒绝，属正常情况
      const t = document.startViewTransition(swap);
      t.ready.catch(() => {});
      t.finished.catch(() => {});
    } else swap();
  }

  window.addEventListener("hashchange", route);
  route();
})();
