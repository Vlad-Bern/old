(() => {
  const UNLOCK_KEY = "gosha_final_unlocked";

  function isUnlocked() {
    return localStorage.getItem(UNLOCK_KEY) === "1";
  }

  function markUnlocked() {
    localStorage.setItem(UNLOCK_KEY, "1");
    mountBurger();
  }

  function mountBurger() {
    if (!isUnlocked() || document.getElementById("gosha-burger")) return;

    const style = document.createElement("style");
    style.textContent = `
      #gosha-burger {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 2147483647;
        width: 38px;
        height: 38px;
        border: 1px solid rgba(255,255,255,.28);
        border-radius: 8px;
        background: rgba(0,0,0,.72);
        color: #fff;
        font: 700 22px/1 sans-serif;
        display: grid;
        place-items: center;
        cursor: pointer;
        backdrop-filter: blur(8px);
        box-shadow: 0 6px 24px rgba(0,0,0,.35);
      }

      #gosha-burger:hover {
        background: rgba(20,20,20,.92);
        border-color: rgba(255,255,255,.5);
      }

      #gosha-nav-menu {
        position: fixed;
        top: 58px;
        right: 12px;
        z-index: 2147483646;
        min-width: 180px;
        padding: 8px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 10px;
        background: rgba(0,0,0,.9);
        backdrop-filter: blur(10px);
        box-shadow: 0 12px 40px rgba(0,0,0,.5);
        display: none;
      }

      #gosha-nav-menu.open { display: grid; gap: 6px; }

      #gosha-nav-menu a {
        display: block;
        padding: 10px 12px;
        border-radius: 7px;
        color: #fff;
        text-decoration: none;
        font: 600 14px/1.2 sans-serif;
        white-space: nowrap;
      }

      #gosha-nav-menu a:hover { background: rgba(255,255,255,.1); }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "gosha-burger";
    button.type = "button";
    button.setAttribute("aria-label", "Открыть навигацию");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "☰";

    const menu = document.createElement("nav");
    menu.id = "gosha-nav-menu";
    menu.innerHTML = `
      <a href="Index.html">1-я страница</a>
      <a href="game.html">Игра</a>
      <a href="final.html">2-я страница</a>
    `;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = menu.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target) && event.target !== button) {
        menu.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        menu.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
      }
    });

    document.body.append(button, menu);
  }

  function bindFinalVideo() {
    const finalVideo = document.getElementById("final-video");
    if (!finalVideo || finalVideo.dataset.unlockBound === "1") return;
    finalVideo.dataset.unlockBound = "1";
    finalVideo.addEventListener("ended", markUnlocked, { once: true });
  }

  function init() {
    bindFinalVideo();
    mountBurger();
  }

  window.GoshaNav = { markUnlocked, mountBurger };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
