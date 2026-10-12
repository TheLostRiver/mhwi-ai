/* 自定义控件：下拉选择面板（替代原生 select）、数字步进器（替代原生 spinner） */
(function () {
  "use strict";
  const UI = MHWI.ui;
  const esc = UI.esc;

  // ---------- 下拉选择面板 ----------
  // UI.dropdown.open(anchorEl, { items:[{value,label,group,meta,dim,sub}], value, onSelect, search, placeholder, caption, minWidth })
  const dd = (UI.dropdown = {});
  let state = null;

  function pop() {
    let el = document.getElementById("dd-pop");
    if (!el) {
      el = document.createElement("div");
      el.id = "dd-pop";
      el.className = "dd-pop";
      el.setAttribute("role", "listbox");
      document.body.appendChild(el);
    }
    return el;
  }

  function visibleItems() {
    const f = state.query.trim().toLowerCase();
    return state.items.filter((it) => !f || `${it.label} ${it.sub || ""} ${it.value}`.toLowerCase().includes(f));
  }

  function renderList() {
    const list = pop().querySelector(".dd-list");
    const items = visibleItems();
    state.visible = items;
    if (state.active >= items.length) state.active = items.length - 1;
    if (state.active < 0 && items.length) state.active = Math.max(0, items.findIndex((it) => it.value === state.value));
    let html = "";
    let group = null;
    items.forEach((it, i) => {
      if (it.group !== undefined && it.group !== group) {
        group = it.group;
        html += `<div class="dd-group">${esc(group)}</div>`;
      }
      html += `<div class="dd-item ${it.value === state.value ? "sel" : ""} ${i === state.active ? "act" : ""} ${it.dim ? "dim" : ""}" data-i="${i}" role="option" aria-selected="${it.value === state.value}">
        <span class="dd-check">${it.value === state.value ? "✓" : ""}</span>
        <span class="dd-label">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span>
        ${it.meta !== undefined ? `<span class="dd-meta">${esc(it.meta)}</span>` : ""}
      </div>`;
    });
    list.innerHTML = html || `<div class="dd-empty">没有匹配项</div>`;
    const act = list.querySelector(".dd-item.act");
    if (act) act.scrollIntoView({ block: "nearest" });
  }

  function place() {
    const el = pop();
    const r = state.anchor.getBoundingClientRect();
    const width = Math.max(r.width, state.minWidth || 260);
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 320 && above > below;
    const maxH = Math.min(440, up ? above : below);
    el.style.width = width + "px";
    el.style.left = Math.min(r.left, window.innerWidth - width - 10) + "px";
    el.style.maxHeight = maxH + "px";
    el.style.top = up ? "" : r.bottom + 6 + "px";
    el.style.bottom = up ? window.innerHeight - r.top + 6 + "px" : "";
    el.classList.toggle("up", up);
  }

  dd.open = function (anchor, opts) {
    if (state && state.anchor === anchor) return dd.close();
    dd.close(true);
    state = { anchor, items: opts.items, value: opts.value, onSelect: opts.onSelect, query: "", active: -1, minWidth: opts.minWidth };
    const el = pop();
    el.innerHTML = `${opts.search === false ? "" : `<div class="dd-search"><input type="search" placeholder="${esc(opts.placeholder || "搜索")}" autocomplete="off"></div>`}${opts.caption ? `<div class="dd-caption">${esc(opts.caption)}</div>` : ""}<div class="dd-list"></div>`;
    el.classList.remove("closing");
    el.classList.add("open");
    anchor.classList.add("dd-open");
    anchor.setAttribute("aria-expanded", "true");
    place();
    renderList();
    const q = el.querySelector(".dd-search input");
    if (q) {
      q.focus();
      q.oninput = () => { state.query = q.value; state.active = 0; renderList(); };
    }
    el.onmousemove = (e) => {
      const it = e.target.closest(".dd-item");
      if (it && +it.dataset.i !== state.active) {
        state.active = +it.dataset.i;
        el.querySelectorAll(".dd-item.act").forEach((x) => x.classList.remove("act"));
        it.classList.add("act");
      }
    };
    el.onclick = (e) => {
      e.stopPropagation();
      const it = e.target.closest(".dd-item");
      if (it) choose(+it.dataset.i);
    };
  };

  function choose(i) {
    const it = state && state.visible[i];
    if (!it) return;
    const cb = state.onSelect;
    dd.close();
    cb(it.value);
  }

  dd.close = function (instant) {
    if (!state) return;
    const el = pop();
    state.anchor.classList.remove("dd-open");
    state.anchor.setAttribute("aria-expanded", "false");
    state = null;
    if (instant) { el.classList.remove("open", "closing"); return; }
    el.classList.add("closing");
    setTimeout(() => { if (!state) el.classList.remove("open", "closing"); }, 130);
  };

  document.addEventListener("click", (e) => {
    if (state && !state.anchor.contains(e.target)) dd.close();
  });
  window.addEventListener("resize", () => state && place());
  window.addEventListener("scroll", (e) => {
    if (state && !pop().contains(e.target)) place();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (!state) return;
    const n = state.visible.length;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); const a = state.anchor; dd.close(); a.focus(); }
    else if (e.key === "ArrowDown" && n) { e.preventDefault(); state.active = (state.active + 1) % n; renderList(); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); state.active = (state.active - 1 + n) % n; renderList(); }
    else if (e.key === "Enter") { e.preventDefault(); choose(state.active); }
  }, true);

  // ---------- 数字步进器 ----------
  // UI.stepper(attrs) → <span class="num"><button>−</button><input type=number ...><button>+</button></span>
  UI.stepper = function (attrs) {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(" ");
    return `<span class="num"><button type="button" class="num-b" data-d="-1" tabindex="-1" aria-label="减少">−</button><input type="number" ${a}><button type="button" class="num-b" data-d="1" tabindex="-1" aria-label="增加">+</button></span>`;
  };

  function stepOnce(btn) {
    const input = btn.parentElement.querySelector("input");
    const step = +input.step || 1;
    let v = (+input.value || 0) + step * +btn.dataset.d;
    if (input.min !== "") v = Math.max(+input.min, v);
    if (input.max !== "") v = Math.min(+input.max, v);
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  let holdTimer = 0;
  let holdInterval = 0;
  const stopHold = () => { clearTimeout(holdTimer); clearInterval(holdInterval); };
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".num-b");
    if (!b) return;
    e.preventDefault();
    stepOnce(b);
    // 按住连续步进；松开或移出按钮即停止
    stopHold();
    holdTimer = setTimeout(() => { holdInterval = setInterval(() => stepOnce(b), 70); }, 380);
    b.addEventListener("pointerleave", stopHold, { once: true });
  });
  document.addEventListener("pointerup", stopHold);
  document.addEventListener("pointercancel", stopHold);

  // ---------- 滑条填充 ----------
  UI.syncRange = (input) => input.style.setProperty("--fill", ((input.value - input.min) / (input.max - input.min)) * 100 + "%");
  document.addEventListener("input", (e) => { if (e.target.matches && e.target.matches('input[type="range"]')) UI.syncRange(e.target); });
})();
