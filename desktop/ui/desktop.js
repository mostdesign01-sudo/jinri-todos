// Injected by the Tauri shell (see desktop_init_script in src-tauri/src/main.rs)
// before overlay.html's own scripts run. Adds the collapsed capsule, the 收起
// button, Esc handling, and mirrors the collapsed state owned by Rust.
(function () {
  const html = document.documentElement;
  html.classList.add("jinri-desktop", "jinri-collapsed");

  const tauri = window.__TAURI__;
  const invoke = (cmd, args) => tauri.core.invoke(cmd, args);
  let collapsed = true;

  function counts() {
    const today = Jinri.shanghaiDateStr();
    return {
      today: Jinri.todosOnDate(today, false).length,
      overdue: Jinri.overdueTodos().length,
    };
  }

  function renderCapsule() {
    const el = document.getElementById("cap-text");
    if (!el || typeof Jinri === "undefined") return;
    const { today, overdue } = counts();
    if (!today && !overdue) {
      el.innerHTML = `<span class="cap-done">都做完了</span>`;
      return;
    }
    let out = "";
    if (today) out += `<span class="cap-today">今日 · ${today}</span>`;
    if (overdue) out += `<span class="cap-overdue"><i class="dot"></i>逾期 · ${overdue}</span>`;
    el.innerHTML = out;
  }

  function applyCollapsed(next) {
    collapsed = !!next;
    html.classList.toggle("jinri-collapsed", collapsed);
    renderCapsule();
    if (!collapsed) {
      // overlay.html's render() is a page-level function; refresh so a day
      // rollover while collapsed shows up immediately.
      if (typeof window.render === "function") window.render();
      const input = document.getElementById("title-input");
      if (input) input.focus();
    }
  }

  function requestCollapsed(next) {
    invoke("set_collapsed", { collapsed: !!next }).catch((err) => console.error("set_collapsed", err));
  }

  function mount() {
    const style = document.createElement("style");
    style.textContent = window.__JINRI_DESKTOP_CSS__ || "";
    document.head.appendChild(style);

    const capsule = document.createElement("div");
    capsule.className = "capsule";
    capsule.innerHTML = `
      <span class="cap-grip" data-tauri-drag-region="deep" title="拖动"><i></i></span>
      <button type="button" class="cap-main" id="cap-main" title="展开（⌥Space）">
        <span class="cap-text" id="cap-text"></span>
        <span class="cap-chevron" aria-hidden="true"></span>
      </button>`;
    document.body.appendChild(capsule);
    document.getElementById("cap-main").addEventListener("click", () => requestCollapsed(false));

    const head = document.querySelector(".overlay-head");
    const remain = document.getElementById("remain");
    if (head && remain) {
      const right = document.createElement("div");
      right.className = "head-right";
      right.appendChild(remain);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "collapse-btn";
      btn.title = "收起（Esc / ⌥Space）";
      btn.textContent = "收起";
      btn.addEventListener("click", () => requestCollapsed(true));
      right.appendChild(btn);
      head.appendChild(right);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !collapsed) {
        e.preventDefault();
        requestCollapsed(true);
      }
    });

    // overlay.html's own handlers sit on #add-form / #list, so by the time these
    // document-level listeners run the todo has already been saved.
    document.addEventListener("submit", renderCapsule);
    document.addEventListener("click", renderCapsule);
    setInterval(renderCapsule, 60 * 1000);

    tauri.event.listen("jinri-collapsed", (ev) => applyCollapsed(ev.payload));
    invoke("is_collapsed").then(applyCollapsed).catch(renderCapsule);
    renderCapsule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
