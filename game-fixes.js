(() => {
  // ================================================================
  // DISCLAIMER: блокируем повторный клик сразу после первого нажатия.
  // ================================================================
  const lockDisclaimerButton = () => {
    const button = document.getElementById("btn-accept-disclaimer");
    if (!button || button.dataset.singleClickBound === "1") return;

    button.dataset.singleClickBound = "1";
    button.addEventListener(
      "click",
      () => {
        if (button.dataset.clicked === "1") return;
        button.dataset.clicked = "1";
        button.style.pointerEvents = "none";
        button.setAttribute("aria-disabled", "true");
      },
      { capture: true },
    );
  };

  // ================================================================
  // AUDIO HELPERS
  // ================================================================
  function stopEveryMusicTrack() {
    const candidates = [window.currentMusic, window.bgm];
    const seen = new Set();

    candidates.forEach((audio) => {
      if (!audio || seen.has(audio)) return;
      seen.add(audio);
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_) {}
    });

    window.currentMusic = null;
    window.bgm = null;

    if (typeof state !== "undefined") state.music = null;
  }

  function getCurrentMusicPath() {
    if (typeof state !== "undefined" && state.music) return state.music;

    const audio = window.currentMusic || window.bgm;
    if (!audio) return null;

    const src = audio.getAttribute?.("src") || audio.src || "";
    if (!src) return null;

    try {
      const url = new URL(src, window.location.href);
      const pathname = decodeURIComponent(url.pathname);
      const marker = "/assets/";
      const index = pathname.lastIndexOf(marker);
      return index >= 0 ? pathname.slice(index + 1) : src;
    } catch (_) {
      return src;
    }
  }

  // ================================================================
  // SAVES V2
  // Сохраняем реальное положение внутри сцены и текущую музыку.
  // Старые сейвы остаются совместимыми.
  // ================================================================
  window.saveGame = saveGame = function saveGameFixed(slotId, forceSceneId = null) {
    if (typeof state === "undefined" || !state.hero) return;

    const isAuto = slotId === "auto";
    const sceneToSave = forceSceneId || currentSceneId;
    const indexToSave = forceSceneId ? 0 : Math.max(0, stepIndex || 0);

    const saveData = {
      version: 2,
      chapter: state.chapter,
      sceneId: sceneToSave,
      stepIndex: indexToSave,
      hero: state.hero,
      inventory: state.hero.inventory || {},
      buffs: state.buffs || [],
      lockMap: state.lockMap || false,
      lockInv: state.lockInv || false,
      music: getCurrentMusicPath(),
      date: new Date().toLocaleString(),
      isAuto,
    };

    const storageKey = isAuto ? "myVN_auto" : `myVN_save_${slotId}`;

    try {
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      if (!isAuto) {
        if (typeof notify === "function") {
          notify("Казахские подвиги засейвлены!", "success");
        }
        if (typeof renderSaveSlots === "function") renderSaveSlots();
      }
    } catch (error) {
      console.error("Save error:", error);
      if (!isAuto) alert("Ошибка сохранения (нет места?)");
    }
  };

  window.loadGame = loadGame = function loadGameFixed(slotId) {
    const storageKey = slotId === "auto" ? "myVN_auto" : `myVN_save_${slotId}`;
    const json = localStorage.getItem(storageKey);

    if (!json) {
      alert("Сохранение не найдено!");
      return;
    }

    try {
      const data = JSON.parse(json);
      if (!data || !data.sceneId || !window.story?.[data.sceneId]) {
        throw new Error("Save scene is missing");
      }

      // Главное меню должно исчезнуть вместе со своей музыкой до загрузки сцены.
      stopEveryMusicTrack();

      const mainMenu = document.getElementById("main-menu");
      if (mainMenu) {
        mainMenu.style.display = "none";
        mainMenu.style.opacity = "0";
        mainMenu.classList.remove("menu-fade-out-anim");
      }

      if (typeof closeSaveLoadMenu === "function") closeSaveLoadMenu();
      if (els?.mapLayer) els.mapLayer.style.display = "none";
      if (els?.battleLayer) els.battleLayer.style.display = "none";
      if (els?.uiLayer) els.uiLayer.style.display = "flex";
      if (els?.chars) els.chars.style.display = "flex";

      state.chapter = data.chapter || 1;
      state.hero = data.hero || state.hero;
      if (data.inventory) state.hero.inventory = data.inventory;
      state.buffs = Array.isArray(data.buffs) ? data.buffs : [];
      state.lockMap = !!data.lockMap;
      state.lockInv = !!data.lockInv;

      currentSceneId = data.sceneId;
      currentScene = window.story[currentSceneId];
      dialogueHistory = [];

      const maxIndex = Math.max(0, currentScene.length - 1);
      stepIndex = Math.max(0, Math.min(Number(data.stepIndex) || 0, maxIndex));

      // ВАЖНО: loadScene() здесь не вызываем — он сбрасывает stepIndex в 0
      // и создаёт новый автосейв поверх только что загруженного состояния.
      renderStep(true);

      // Сейв хранит именно тот трек, который звучал в момент сохранения.
      // Старые сейвы без поля music просто продолжат работать без восстановления музыки.
      if (data.music && typeof setMusic === "function") {
        setMusic(data.music);
      } else {
        state.music = null;
      }
    } catch (error) {
      console.error("Load error:", error);
      alert("Ошибка: файл сохранения поврежден.");
    }
  };

  // ================================================================
  // LOAD WITHOUT CONFIRMATION
  // Перехватываем клик по слоту в режиме загрузки ДО старого onclick.
  // Подтверждения удаления/перезаписи сейва остаются как были.
  // ================================================================
  document.addEventListener(
    "click",
    (event) => {
      if (typeof currentSaveMode === "undefined" || currentSaveMode !== "load") return;

      const slot = event.target.closest?.(".save-slot");
      if (!slot) return;

      // Кнопка удаления имеет собственную логику — её не перехватываем.
      if (event.target.closest("button")) return;

      const title = slot.firstElementChild?.textContent?.trim() || "";
      let targetId = null;

      if (title === "АВТОСОХРАНЕНИЕ") {
        targetId = "auto";
      } else {
        const match = title.match(/Слот\s+(\d+)/i);
        if (match) targetId = Number(match[1]);
      }

      if (targetId === null) return;

      const storageKey = targetId === "auto" ? "myVN_auto" : `myVN_save_${targetId}`;
      if (!localStorage.getItem(storageKey)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      loadGame(targetId);
    },
    true,
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", lockDisclaimerButton, { once: true });
  } else {
    lockDisclaimerButton();
  }
})();
