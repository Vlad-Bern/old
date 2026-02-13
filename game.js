// =================================================================
// GAME.JS — ФИНАЛЬНАЯ ВЕРСИЯ (FIXED AUDIO)
// =================================================================

// --- СОСТОЯНИЕ ИГРЫ ---
let justClosedModal = false;
let state = {
  bg: null,
  characters: [],
  music: null,
  chapter: 1,
  hero: {
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    level: 1,
    xp: 0,
    maxXp: 100,
    attack: [8, 12],
    coins: 0,
    equippedWeapon: "sword_basic",
    inventory: { str_large: 1, hp_large: 3, sword_basic: 1 },
  },
  buffs: [],
};
let blockNextStep = false;
let dialogueHistory = [];

// --- ЭЛЕМЕНТЫ DOM ---
const els = {
  container: document.getElementById("game-container"),
  bg: document.getElementById("background"),
  chars: document.getElementById("characters"),
  mapLayer: document.getElementById("map-layer"),
  uiLayer: document.getElementById("ui-layer"),
  battleLayer: document.getElementById("battle-layer"),
  enemiesContainer: document.getElementById("enemies-container"),
  heroStaminaFill: document.getElementById("hero-stamina-fill"),
  heroHpFill: document.getElementById("hero-hp-fill"),
  heroHpText: document.getElementById("hero-hp-text"),
  battleLog: document.getElementById("battle-log"),
  btnAttack: document.getElementById("btn-attack"),
  btnDefend: document.getElementById("btn-defend"),
  btnUlti: document.getElementById("btn-ulti"),
  btnFlee: document.getElementById("btn-flee"),
  btnSurrender: document.getElementById("btn-surrender"),
  mainInvBtn: document.getElementById("main-inv-btn"),
  btnPotions: document.getElementById("btn-inv-potions"),
  btnWeapons: document.getElementById("btn-inv-weapons"),
  btnItems: document.getElementById("btn-inv-items"),
  name: document.getElementById("speaker-name"),
  text: document.getElementById("dialogue-text"),
  choices: document.getElementById("choices-container"),
  saveBtn: document.getElementById("save-btn"),
  loadBtn: document.getElementById("load-btn"),
  mapBtn: document.getElementById("map-btn"),
};

// ===========================================
// 🎵 МОЩНЫЙ ЗВУКОВОЙ ДВИЖОК (AUDIO ENGINE)
// ===========================================

// Глобальные настройки
let settings = {
  volume: 1.0, // По умолчанию 100%
  theme: "default",
};

// РЕЕСТР ВСЕХ АКТИВНЫХ ЗВУКОВ
// Сюда попадают и музыка, и SFX. Это позволяет менять громкость всему сразу.
const activeAudioSet = new Set();

// --- 1. Функция загрузки настроек ---
function loadSettings() {
  const saved = localStorage.getItem("myVN_settings");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Проверка валидности
      if (
        typeof parsed.volume === "number" &&
        parsed.volume >= 0 &&
        parsed.volume <= 1
      ) {
        settings = parsed;
      }
    } catch (e) {
      console.warn("Settings error:", e);
    }
  }
  // Применяем настройки (но не сохраняем, так как только загрузили)
  applyVolumeToAll();
  applyTheme();
}

// --- 2. Функция применения громкости КО ВСЕМУ ---
function applyVolumeToAll() {
  const vol = settings.volume;

  // 1. Проходимся по всем активным звукам (SFX + Music)
  activeAudioSet.forEach((audio) => {
    if (!audio.paused) {
      audio.volume = vol;
    } else {
      // Очищаем мусор, если звук уже не играет
      activeAudioSet.delete(audio);
    }
  });

  // 2. Отдельно видео-фон (он элемент DOM, а не объект Audio)
  const bgVideo = document.getElementById("bg-video");
  if (bgVideo) bgVideo.volume = vol;
}

// --- 3. Функция сохранения настроек ---
function saveSettings() {
  localStorage.setItem("myVN_settings", JSON.stringify(settings));
}

// --- 4. Применение темы ---
function applyTheme() {
  document.body.classList.remove(
    "theme-retro",
    "theme-glass",
    "theme-gold",
    "theme-cyber",
    "theme-yandere",
  );
  if (settings.theme !== "default") {
    document.body.classList.add(`theme-${settings.theme}`);
  }
}

// --- 5. Глобальная ссылка на музыку ---
// Используем window.bgm, чтобы быть совместимыми с engine.js
window.bgm = window.bgm || null;

// --- ФУНКЦИЯ ЗАПУСКА МУЗЫКИ ---
function setMusic(path) {
  // Выключение музыки
  if (!path) {
    if (window.bgm) {
      window.bgm.pause();
      activeAudioSet.delete(window.bgm); // Удаляем из реестра
      window.bgm = null;
    }
    state.music = null;
    return;
  }

  // Если тот же трек — просто обновляем громкость
  if (state.music === path && window.bgm) {
    window.bgm.volume = settings.volume;
    if (window.bgm.paused) window.bgm.play().catch(() => {});
    return;
  }

  // Новый трек
  if (window.bgm) {
    window.bgm.pause();
    activeAudioSet.delete(window.bgm);
  }

  state.music = path;
  window.bgm = new Audio(path);
  window.bgm.loop = true;
  window.bgm.volume = settings.volume;

  // ДОБАВЛЯЕМ В РЕЕСТР
  activeAudioSet.add(window.bgm);

  window.bgm.play().catch((e) => console.log("Music play error:", e));
}

// --- ФУНКЦИЯ ЗАПУСКА SFX (ЭФФЕКТОВ) ---
function playSfx(path) {
  const audio = new Audio(path);
  audio.volume = settings.volume;

  // ДОБАВЛЯЕМ В РЕЕСТР
  activeAudioSet.add(audio);

  // Когда звук закончится — удаляем из реестра
  audio.onended = () => {
    activeAudioSet.delete(audio);
  };

  audio.play().catch((e) => console.warn("SFX error:", e));
}

function playCloseSfx() {
  playSfx("assets/sfx/close.mp3");
}

// Функция проверяет, открыто ли ХОТЬ ОДНО модальное окно
function isAnyModalOpen() {
  const modals = [
    "saveload-modal",
    "inventory-modal",
    "history-modal",
    "custom-confirm",
    "inspect-modal",
    "settings-modal",
  ];
  return modals.some((id) => {
    const el = document.getElementById(id);
    return el && el.style.display !== "none" && el.style.display !== "";
  });
}

// ===========================================
// ЛОГИКА ИНТЕРФЕЙСА (СЛУШАТЕЛИ)
// ===========================================

// Инвентарь
if (els.mainInvBtn) {
  els.mainInvBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (battle.active && battle.turn !== "player") return;
    openInventory("weapons");
  });
}

// Клик по игре
els.container.addEventListener("click", (e) => {
  // Игнорируем клики по кнопкам интерфейса
  if (
    e.target.closest("button") ||
    e.target.closest(".choice-btn") ||
    e.target.closest(".ui-btn") ||
    e.target.closest(".modal-content") ||
    e.target.closest(".action-btn") ||
    e.target.closest("#saveload-modal") ||
    e.target.closest("#inventory-modal") ||
    e.target.closest(".modal-overlay")
  )
    return;

  if (isAnyModalOpen()) return;

  if (blockNextStep) {
    blockNextStep = false;
    return;
  }

  if (typeof justClosedModal !== "undefined" && justClosedModal) {
    justClosedModal = false;
    return;
  }

  // ЛОГИКА ПРОПУСКА
  if (window.typeWriterTimeout) {
    // 1. Останавливаем таймер
    clearTimeout(window.typeWriterTimeout);
    window.typeWriterTimeout = null;

    // 2. Берем текст из ГЛОБАЛЬНОЙ переменной (теперь она доступна)
    if (window.currentScene && window.currentScene[window.stepIndex]) {
      const fullText = window.currentScene[window.stepIndex].text;

      // 3. Принудительно ставим полный текст
      els.text.innerHTML = fullText;
    }
    return; // Важно: выходим, чтобы не сработал nextStep
  }

  // Проверяем, открыто ли модальное окно сохранения
  const saveModal = document.getElementById("saveload-modal");
  const isSaveOpen = saveModal && saveModal.style.display !== "none";

  // Если открыто сохранение, или инвентарь, или идет бой -> НЕ ДЕЛАЕМ ШАГ
  if (!battle.active && els.uiLayer.style.display !== "none" && !isSaveOpen) {
    nextStep();
  }
});

// Верхнее меню
if (els.saveBtn)
  els.saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openSaveLoadMenu("save");
  });
if (els.loadBtn)
  els.loadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openSaveLoadMenu("load");
  });
if (els.mapBtn)
  els.mapBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (battle.active) {
      alert("Нельзя открыть карту в бою!");
      return;
    }
    window.returnPoint = {
      sceneId: currentSceneId,
      stepIndex: stepIndex,
    };
    const mapSceneId = CHAPTER_MAPS[state.chapter];
    if (mapSceneId) loadScene(mapSceneId);
  });

// Кнопки битвы
if (els.btnAttack)
  els.btnAttack.addEventListener("click", () => {
    if (battle.turn !== "player") return;
    battle.isUlti = false;
    logBattle("Выберите цель!");
    battle.targetMode = true;
  });
if (els.btnDefend)
  els.btnDefend.addEventListener("click", () => playerTurn("defend"));
if (els.btnUlti)
  els.btnUlti.addEventListener("click", () => {
    if (battle.turn !== "player") return;
    logBattle("УЛЬТА: Выберите цель!");
    battle.targetMode = true;
    battle.isUlti = true;
  });

// Выпадающие меню
function setupDropdown(btnId, menuId) {
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  if (!btn || !menu) return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (
      btnId === "btn-inventory-menu" &&
      battle.active &&
      battle.turn !== "player"
    )
      return;
    document.querySelectorAll(".dropdown-content").forEach((el) => {
      if (el !== menu) el.classList.remove("open");
    });
    menu.classList.toggle("open");
  });
}
setupDropdown("btn-actions-menu", "actions-dropdown");
setupDropdown("btn-inventory-menu", "inventory-dropdown");
// ... (твой код выше)

// Клик в любом месте закрывает меню
document.addEventListener("click", () => {
  document.querySelectorAll(".dropdown-content").forEach((el) => {
    el.classList.remove("open");
  });
});

// Кнопки в меню боя
const btnFlee = document.getElementById("btn-flee");
if (btnFlee) btnFlee.addEventListener("click", () => playerTurn("flee"));

const btnSurrender = document.getElementById("btn-surrender");
if (btnSurrender)
  btnSurrender.addEventListener("click", () => {
    gameConfirm("Отдать родную Русь?", () =>
      endBattle(battle.stepData.nextLose),
    );
  });

// Кнопки открытия инвентаря
if (els.btnPotions)
  els.btnPotions.addEventListener("click", (e) => {
    e.stopPropagation();
    openInventory("potions");
  });
if (els.btnWeapons)
  els.btnWeapons.addEventListener("click", (e) => {
    e.stopPropagation();
    openInventory("weapons");
  });
if (els.btnItems)
  els.btnItems.addEventListener("click", (e) => {
    e.stopPropagation();
    openInventory("items");
  });

// ===========================================
// ЛОГИКА ИНВЕНТАРЯ
// ===========================================
const invModal = document.getElementById("inventory-modal");
const invList = document.getElementById("inv-list");
const invTitle = document.getElementById("inv-title");

function openInventory(category) {
  if (!invModal) return;
  invModal.style.display = "flex";
  const titles = { potions: "Зелья", items: "Предметы", weapons: "Оружие" };
  if (invTitle) invTitle.innerText = titles[category] || "Инвентарь";

  const statsEl = document.getElementById("inv-stats");
  if (statsEl && state.hero) {
    statsEl.innerHTML = `<div style="color:#ff5555;">❤️ ${state.hero.hp}/${state.hero.maxHp}</div>
                         <div style="color:#55ff55;">⚡ ${state.hero.stamina}/${state.hero.maxStamina}</div>
                         <div style="color:#ffd700;">💰 ${state.hero.coins || 0}</div>
                         <div style="color:#aaa;">🛡️ Lvl ${state.hero.level}</div>`;
  }
  renderInventoryItems(category);
}

function closeInventory() {
  if (invModal) invModal.style.display = "none";
}
const closeInvBtn = document.getElementById("inv-close-btn");
if (closeInvBtn)
  closeInvBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    playCloseSfx();
    closeInventory();
  });

function renderInventoryItems(category) {
  if (!invList) return;
  invList.innerHTML = "";
  if (!state.hero.inventory) state.hero.inventory = {};
  let isEmpty = true;

  for (const [itemId, count] of Object.entries(state.hero.inventory)) {
    if (count <= 0) continue;
    const itemData = ITEMS[itemId];
    if (!itemData) continue;

    const isWeapon = itemData.type === "weapon";
    const isPotion =
      ["heal", "stamina"].includes(itemData.type) ||
      itemData.type.startsWith("buff");
    if (category === "weapons" && !isWeapon) continue;
    if (category === "potions" && !isPotion) continue;
    if (category === "items" && (isWeapon || isPotion)) continue;

    isEmpty = false;
    const row = document.createElement("div");
    row.className = "inv-item-row";
    row.style.cssText =
      "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); margin-bottom: 5px; padding: 10px; border-radius: 5px; border: 1px solid #333;";
    row.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><div style="font-size:24px;">${itemData.icon || "📦"}</div><div><div style="font-weight:bold; color:#eee;">${itemData.name} ${!isWeapon ? `x${count}` : ""}</div><div style="font-size:12px; color:#888;">${itemData.desc || ""}</div></div></div>`;

    const actionBtn = document.createElement("button");
    actionBtn.style.cssText =
      "padding: 5px 10px; cursor: pointer; background: #444; color: white; border: 1px solid #666; border-radius: 3px;";

    if (category === "weapons") {
      if (state.hero.equippedWeapon === itemId) {
        actionBtn.innerText = "Надето";
        actionBtn.style.background = "#2e7d32";
        actionBtn.disabled = true;
      } else {
        actionBtn.innerText = "Надеть";
        actionBtn.addEventListener("click", () => {
          state.hero.equippedWeapon = itemId;
          renderInventoryItems("weapons");
        });
      }
    } else if (category === "potions") {
      const isBuff = itemData.type.startsWith("buff");
      if (isBuff && !battle.active) {
        actionBtn.innerText = "Только в бою";
        actionBtn.disabled = true;
        actionBtn.style.opacity = "0.5";
      } else {
        actionBtn.innerText = "Использовать";
        actionBtn.addEventListener("click", () => {
          if (typeof useItem === "function") {
            useItem(itemId);
            renderInventoryItems("potions");
          }
        });
      }
    } else {
      actionBtn.style.display = "none";
    }

    row.appendChild(actionBtn);
    invList.appendChild(row);
  }
  if (isEmpty)
    invList.innerHTML =
      "<div style='text-align:center; color:#666; padding:20px;'>Пусто</div>";
}

// Вспомогательные
function gainItem(id, amt = 1) {
  if (!state.hero.inventory) state.hero.inventory = {};
  if (!state.hero.inventory[id]) state.hero.inventory[id] = 0;
  state.hero.inventory[id] += amt;
}
function updateCoinUI() {
  const el = document.getElementById("coin-count");
  if (el) el.innerText = state.hero.coins || 0;
}
function gainGold(amt) {
  state.hero.coins = (state.hero.coins || 0) + amt;
  updateCoinUI();
}
function spendGold(amt) {
  if ((state.hero.coins || 0) >= amt) {
    state.hero.coins -= amt;
    updateCoinUI();
    return true;
  }
  return false;
}

// ===========================================
// МОДАЛЬНОЕ ОКНО НАСТРОЕК
// ===========================================
const settingsModal = document.getElementById("settings-modal");
const settingsBtn = document.getElementById("settings-btn");
const settingsClose = document.getElementById("settings-close-btn");

function openSettings() {
  if (settingsModal) {
    settingsModal.style.display = "flex";
    const volSlider = document.getElementById("volume-slider");
    if (volSlider) volSlider.value = settings.volume * 100;
    const themeSel = document.getElementById("theme-select");
    if (themeSel) themeSel.value = settings.theme;
  }
}
function closeSettings() {
  if (settingsModal && settingsModal.style.display === "flex") {
    playCloseSfx();
    settingsModal.style.display = "none";
  }
}
if (settingsBtn)
  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openSettings();
  });
if (settingsClose)
  settingsClose.addEventListener("click", (e) => {
    e.stopPropagation();
    closeSettings();
  });

// ===========================================
// ИНИЦИАЛИЗАЦИЯ (DOMContentLoaded) - ПОЛНАЯ ВЕРСИЯ
// ===========================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Инит настроек
  loadSettings();

  // 2. СЛАЙДЕР ГРОМКОСТИ
  const volSlider = document.getElementById("volume-slider");
  if (volSlider) {
    volSlider.value = Math.round(settings.volume * 100);
    volSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      settings.volume = val / 100;
      applyVolumeToAll();
      saveSettings();
    });
  }

  // 3. ТЕМА
  const themeSelect = document.getElementById("theme-select");
  if (themeSelect) {
    themeSelect.value = settings.theme;
    themeSelect.addEventListener("change", (e) => {
      settings.theme = e.target.value;
      applyTheme();
      saveSettings();
    });
  }

  // --- ЛОГИКА ДИСКЛЕЙМЕРА И ИНТРО (ВОТ ЧТО МОГЛО ПРОПАСТЬ) ---
  const disclaimer = document.getElementById("intro-disclaimer");
  const studio = document.getElementById("intro-studio");
  const btnAccept = document.getElementById("btn-accept-disclaimer");
  const mainMenu = document.getElementById("main-menu");

  // Скрываем игровые слои при старте
  if (els.uiLayer) els.uiLayer.style.display = "none";
  if (els.chars) els.chars.style.display = "none";

  // Функция показа главного меню
  function showMainMenu() {
    if (mainMenu) {
      mainMenu.style.display = "flex";
      mainMenu.style.opacity = "1";
      // Запускаем музыку меню, если ещё не играет
      setMusic("assets/music/main_menu_theme.mp3");
    }
  }

  // Обработчик кнопки "Я ПРОЧИТАЛ" (Дисклеймер)
  if (btnAccept && disclaimer) {
    btnAccept.addEventListener("click", () => {
      disclaimer.style.opacity = "0";
      setTimeout(() => {
        disclaimer.style.display = "none";

        // Показываем лого студии, если есть
        if (studio) {
          studio.style.display = "flex";
          if (typeof playSfx === "function") playSfx("assets/sfx/intro.mp3");

          // Тайминги логотипа
          setTimeout(() => {
            studio.style.opacity = "0"; // Исчезновение
            setTimeout(() => {
              studio.style.display = "none";
              showMainMenu(); // Переход в меню
            }, 500);
          }, 2500); // Сколько висит лого
        } else {
          // Если лого нет, сразу в меню
          showMainMenu();
        }
      }, 500); // Время исчезновения дисклеймера
    });
  } else {
    // Если дисклеймера нет в HTML, сразу грузим меню (страховка)
    showMainMenu();
  }

  // --- ЛОГИКА ГЛАВНОГО МЕНЮ ---

  // Кнопка "НОВАЯ ИГРА" (С твоей новой анимацией)
  const btnNew = document.getElementById("mm-newgame");
  if (btnNew) {
    btnNew.addEventListener("click", () => {
      btnNew.disabled = true; // Блок повторного нажатия

      const menu = document.getElementById("main-menu");
      // Запуск CSS анимации
      menu.classList.add("menu-fade-out-anim");

      // Плавное затухание звука (если функция добавлена)
      if (typeof window.audioFadeOut === "function") {
        audioFadeOut(1500, startGameSequence);
      } else {
        // Если функции нет, просто ждем и запускаем
        setTimeout(startGameSequence, 1500);
      }

      function startGameSequence() {
        menu.style.display = "none";
        menu.classList.remove("menu-fade-out-anim");

        if (els.uiLayer) els.uiLayer.style.display = "flex";
        if (els.chars) els.chars.style.display = "flex";

        loadScene("start");
        btnNew.disabled = false;
      }
    });
  }

  // Кнопка "ЗАГРУЗИТЬ"
  const btnLoad = document.getElementById("mm-load");
  if (btnLoad)
    btnLoad.addEventListener("click", () => openSaveLoadMenu("load"));

  // Кнопка "НАСТРОЙКИ" (в меню)
  const btnSettingsMM = document.getElementById("mm-settings");
  if (btnSettingsMM) {
    // Клон элемента, чтобы убрать старые слушатели (хак)
    const newBtn = btnSettingsMM.cloneNode(true);
    btnSettingsMM.parentNode.replaceChild(newBtn, btnSettingsMM);
    newBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openSettings();
    });
  }

  // 5. Клик по фону модалок (закрытие)
  const slModal = document.getElementById("saveload-modal");
  if (slModal)
    slModal.addEventListener("click", (e) => {
      if (e.target === slModal) {
        if (typeof playCloseSfx === "function") playCloseSfx();
        slModal.style.display = "none";
        justClosedModal = true;
      }
    });

  const invModal = document.getElementById("inventory-modal");
  if (invModal)
    invModal.addEventListener("click", (e) => {
      if (e.target === invModal) {
        if (typeof playCloseSfx === "function") playCloseSfx();
        closeInventory();
      }
    });

  const settingsModal = document.getElementById("settings-modal");
  if (settingsModal)
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) closeSettings();
    });
});

document.addEventListener("keydown", (e) => {
  // 1. Если идет QTE — отдаем приоритет ему
  if (typeof qteState !== "undefined" && qteState.active) {
    handleQTEKey(e); // Вынесем логику QTE в отдельную функцию ниже
    return;
  }

  const modalOpen = isAnyModalOpen();

  // 2. Закрытие на ESC (База)
  if (e.key === "Escape") {
    // Просто прячем все модалки разом
    const modalIds = [
      "saveload-modal",
      "inventory-modal",
      "history-modal",
      "custom-confirm",
      "inspect-modal",
      "settings-modal",
    ];
    modalIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.style.display !== "none") {
        el.style.display = "none";
        if (typeof playCloseSfx === "function") playCloseSfx();
      }
    });
    justClosedModal = true;
    setTimeout(() => (justClosedModal = false), 100);
    return;
  }

  // 3. Блокировка Enter/Space если открыто окно
  if (modalOpen && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    return;
  }

  // 4. Прогресс диалога (Enter/Space)
  if (!modalOpen && !battle.active && (e.key === "Enter" || e.key === " ")) {
    if (window.typeWriterTimeout) {
      // Пропуск анимации текста
      clearTimeout(window.typeWriterTimeout);
      window.typeWriterTimeout = null;
      if (window.currentScene && window.currentScene[window.stepIndex]) {
        els.text.innerHTML = window.currentScene[window.stepIndex].text;
      }
    } else if (els.uiLayer.style.display !== "none") {
      nextStep();
    }
  }
});

// Вынеси логику QTE в эту функцию, чтобы не путаться
function handleQTEKey(e) {
  if (!qteState.currentStep) return;
  const overlay = document.getElementById("damage-overlay");
  if (overlay && overlay.style.opacity > 0.1) return;

  const code = e.code;
  let targetChar = qteState.currentStep.key.toUpperCase();
  let targetCode = targetChar === " " ? "Space" : `Key${targetChar}`;

  if (code === targetCode) {
    if (typeof playSfx === "function") playSfx("assets/sfx/sword_hit.mp3");
    document.getElementById("qte-layer").innerHTML = "";
    clearTimeout(qteState.timer);
    setTimeout(nextQTEKey, 200);
  } else {
    if (!["ShiftLeft", "ShiftRight", "AltLeft", "ControlLeft"].includes(code)) {
      failQTE();
    }
  }
}

const closeSaveLoadBtn = document.getElementById("saveload-close-btn");
if (closeSaveLoadBtn)
  closeSaveLoadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    playCloseSfx();
    document.getElementById("saveload-modal").style.display = "none";
  });

// --- ПОЛНЫЙ ЭКРАН (NW.js) ---
try {
  const gui = require("nw.gui");
  const win = gui.Window.get();
} catch (e) {
  // Этот код упадет в обычном браузере (Chrome), потому что там нет require('nw.gui')
  // Мы просто игнорируем ошибку, чтобы разработка в браузере не ломалась.
  console.log("Not running in NW.js environment");
}

function exitGameWithAnimation() {
  // 1. Находим наш оверлей
  const overlay = document.getElementById("crt-overlay");

  // 2. Если есть звук "выключения" (щелчок тумблера), можно добавить сюда
  // playSfx("assets/sfx/tv_off.mp3");

  // 3. Резко глушим музыку (выключение питания)
  if (window.bgm) {
    window.bgm.pause();
    window.bgm.currentTime = 0;
  }

  // 4. Запускаем анимацию
  if (overlay) {
    overlay.style.display = "block";
    overlay.classList.add("crt-off-active");
  }

  // 5. Ждем окончания анимации (700мс) и закрываемся
  setTimeout(() => {
    try {
      // Попытка закрыть в NW.js
      const gui = require("nw.gui");
      gui.App.quit();
    } catch (e) {
      // Если мы в браузере
      console.log("Эффект завершен. В NW.js окно бы закрылось.");
      // Можно затемнить экран полностью, чтобы показать "конец"
      if (overlay) overlay.style.background = "#000";
      alert("Имитация выхода: Окно NW.js закрылось бы сейчас.");
    }
  }, 800); // Чуть больше чем анимация (0.7s)
}

// Функция попытки выхода (с подтверждением)
function tryQuitGame() {
  // 1. Спрашиваем подтверждение
  const isSure = confirm(
    "Ты точно хочешь выйти? Несохраненный прогресс пропадет!",
  );

  // 2. Если нажал "ОК" (true)
  if (isSure) {
    exitGame(); // Вызываем нашу функцию закрытия окна
  }
  // Если нажал "Отмена", ничего не происходит
}

// ===========================================
// ФИНАЛЬНЫЙ ФИКС V2 (Через stopPropagation)
// ===========================================

function setupModalClose(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    // Если клик был ровно по серому фону (overlay), а не по содержимому
    if (e.target === modal) {
      // 1. Останавливаем событие, чтобы оно НЕ дошло до игры
      e.stopPropagation();
      e.stopImmediatePropagation();

      // 2. Играем звук (если функция есть)
      if (typeof playCloseSfx === "function") playCloseSfx();

      // 3. Закрываем окно
      modal.style.display = "none";

      // 4. (На всякий случай) ставим флаг блокировки
      justClosedModal = true;
      setTimeout(() => (justClosedModal = false), 100);
    }
  });
}

// Применяем ко всем твоим окнам
setupModalClose("inventory-modal");
setupModalClose("saveload-modal");
// setupModalClose("settings-modal"); // Если есть ID настроек

// ===========================================
// УНИВЕРСАЛЬНЫЙ ЗВУК КЛИКА V2 (Через mousedown + capture)
// ===========================================
window.addEventListener(
  "mousedown",
  (e) => {
    // Ищем кнопку или ссылку
    const btn = e.target.closest("button, .menu-btn, .choice-btn, .ui-btn");

    if (btn && !btn.disabled) {
      // Исключаем кнопки, где звук не нужен (если такие есть)
      if (btn.classList.contains("silent-click") || btn.id === "map-back-btn")
        return;

      // Воспроизводим звук
      if (typeof playSfx === "function") {
        // Используем короткий клик. Если нет click.mp3, то ui_click.mp3
        playSfx("assets/sfx/click.mp3");
      }
    }
  },
  true,
);

// --- PARALLAX V5 (Final Fix) ---
document.addEventListener("mousemove", (e) => {
  const menu = document.getElementById("main-menu");
  if (!menu || menu.style.display === "none") return;

  const bgEl = menu.querySelector(".menu-bg");
  if (bgEl) {
    const moveForce = 60; // Чем больше, тем меньше движение
    const x = (window.innerWidth / 2 - e.clientX) / moveForce;
    const y = (window.innerHeight / 2 - e.clientY) / moveForce;

    // ВАЖНО: Сохраняем -50% для центрирования и добавляем сдвиг мыши
    bgEl.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1.02)`;
  }
});

// Функция плавного затухания текущей музыки
function fadeOutMusic() {
  if (!window.bgm) return;

  const fadeAudio = window.bgm;
  const fadeInterval = setInterval(() => {
    // Уменьшаем громкость
    if (fadeAudio.volume > 0.05) {
      fadeAudio.volume -= 0.05;
    } else {
      // Когда совсем тихо — выключаем
      clearInterval(fadeInterval);
      fadeAudio.pause();
      fadeAudio.currentTime = 0;
      // Восстанавливаем громкость для следующего трека
      fadeAudio.volume = settings.volume || 1.0;

      // Если это была именно музыка меню, обнуляем ссылку
      if (window.bgm === fadeAudio) {
        // window.bgm = null; // Можно не обнулять, setMusic заменит
      }
    }
  }, 100); // Каждые 100мс уменьшаем громкость
}

// --- PARALLAX V3 (Debug) ---
const bgEl = document.getElementById("background");

document.addEventListener("mousemove", (e) => {
  // Работаем только в меню
  const menu = document.getElementById("main-menu");
  if (!menu || menu.style.display === "none") return;

  if (bgEl) {
    const moveForce = 40;
    const x = (window.innerWidth / 2 - e.clientX) / moveForce;
    const y = (window.innerHeight / 2 - e.clientY) / moveForce;

    // Применяем стиль
    bgEl.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;

    // Раскомментируй, чтобы проверить, идут ли координаты в консоль:
    // console.log("Parallax:", x, y);
  } else {
    console.warn("Element #background not found!");
  }
});

// --- ФИКС ЗАКРЫТИЯ ОКОН (Предотвращает пропуск диалога) ---
const modals = document.querySelectorAll(".modal, .modal-overlay");
modals.forEach((modal) => {
  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) {
      // Если клик по темному фону
      e.stopPropagation(); // ОСТАНОВИТЬ событие!

      // Ставим флаг блокировки
      justClosedModal = true;
      setTimeout(() => (justClosedModal = false), 100);

      // Закрываем окно
      modal.style.display = "none";
      if (window.playSfx) playSfx("assets/sfx/close.mp3");
    }
  });
});

// Плавное затухание музыки
function audioFadeOut(duration, callback) {
  if (!window.bgm) {
    if (callback) callback();
    return;
  }

  const startVol = window.bgm.volume;
  const steps = 20; // Сколько шагов уменьшения громкости
  const stepTime = duration / steps;
  const volStep = startVol / steps;

  let currentStep = 0;

  const fadeInterval = setInterval(() => {
    currentStep++;
    // Защита от отрицательной громкости
    if (window.bgm.volume >= volStep) {
      window.bgm.volume -= volStep;
    } else {
      window.bgm.volume = 0;
    }

    if (currentStep >= steps) {
      clearInterval(fadeInterval);
      window.bgm.pause();
      // Возвращаем громкость обратно (для следующего трека), но музыка уже на паузе
      window.bgm.volume = settings.volume || 1.0;
      if (callback) callback();
    }
  }, stepTime);
}

// --- Вставь в конец game.js ---
// УБЕДИСЬ, ЧТО УДАЛИЛ ВСЕ СТАРЫЕ ВЕРСИИ ЭТИХ ФУНКЦИЙ!

let qteState = {
  active: false,
  timer: null,
  currentStep: null,
  queue: [],
  onSuccess: null,
  onFail: null,
  stepTime: 2000,
};

function startQTE(steps, timeMs, winScene, failScene) {
  els.uiLayer.style.display = "none";

  // Сбрасываем старый таймер, если вдруг висел
  if (qteState.timer) clearTimeout(qteState.timer);

  qteState.active = true;
  qteState.queue = JSON.parse(JSON.stringify(steps));
  qteState.stepTime = timeMs;
  qteState.onSuccess = winScene;
  qteState.onFail = failScene;

  console.log("QTE STARTED:", qteState.queue);
  nextQTEKey();
}

function nextQTEKey() {
  const layer = document.getElementById("qte-layer");
  if (!layer) return;
  layer.innerHTML = "";

  // Если очередь пуста - ПОБЕДА
  if (qteState.queue.length === 0) {
    endQTE(true);
    return;
  }

  // Берем следующий шаг
  const step = qteState.queue.shift();
  qteState.currentStep = step;

  // СМЕНА ФОНА
  if (step.bg) {
    if (els.bg) els.bg.style.backgroundImage = `url('assets/bg/${step.bg}')`;
  }

  // РИСУЕМ БУКВУ
  const keyChar = step.key.toUpperCase();
  const x = 30 + Math.random() * 40;
  const y = 30 + Math.random() * 40;

  const keyDiv = document.createElement("div");
  keyDiv.className = "qte-key";
  keyDiv.innerText = keyChar === " " ? "SPACE" : keyChar;
  keyDiv.style.left = x + "%";
  keyDiv.style.top = y + "%";

  layer.style.display = "block";
  layer.appendChild(keyDiv);

  console.log("WAITING FOR:", keyChar);

  // ВАЖНО: Запускаем таймер заново для ЭТОГО шага
  // Если время выйдет, сработает failQTE
  if (qteState.timer) clearTimeout(qteState.timer);

  // Используем время из шага, если оно там есть, иначе общее
  const thisStepTime = step.time || qteState.stepTime;

  qteState.timer = setTimeout(() => {
    console.log("TIMEOUT! FAILED.");
    failQTE();
  }, thisStepTime);
}

function failQTE() {
  console.log("QTE FAILED");
  if (qteState.timer) clearTimeout(qteState.timer);

  const overlay = document.getElementById("damage-overlay");
  if (overlay) overlay.style.opacity = "0.8";

  if (typeof playSfx === "function") playSfx("assets/sfx/punch.mp3");

  setTimeout(() => {
    if (overlay) overlay.style.opacity = "0";
    endQTE(false);
  }, 1000);
}

function endQTE(win) {
  qteState.active = false;
  qteState.currentStep = null; // Очищаем текущий шаг

  const layer = document.getElementById("qte-layer");
  if (layer) layer.style.display = "none";

  if (qteState.timer) clearTimeout(qteState.timer);

  if (win) {
    loadScene(qteState.onSuccess);
  } else {
    loadScene(qteState.onFail);
  }
}

const inspectEls = {
  modal: document.getElementById("inspect-modal"),
  title: document.getElementById("inspect-title"),
  imgContainer: document.getElementById("inspect-img-container"),
  desc: document.getElementById("inspect-desc"),
  btnTake: document.getElementById("btn-inspect-take"),
  btnClose: document.getElementById("btn-inspect-close"),
};

function openInspect(
  itemKey,
  name,
  desc,
  img,
  canTake,
  failText,
  hotspotDiv,
  newBg,
) {
  if (!inspectEls.modal) return;

  const dbItem = window.ITEMS ? window.ITEMS[itemKey] : null;
  const finalName = name || (dbItem ? dbItem.name : "Предмет");
  const finalDesc = desc || (dbItem ? dbItem.desc : "...");

  if (inspectEls.title) inspectEls.title.innerText = finalName;
  if (inspectEls.desc) inspectEls.desc.innerText = finalDesc;

  if (inspectEls.btnTake) {
    inspectEls.btnTake.onclick = (e) => {
      e.stopPropagation();

      if (canTake) {
        // УСПЕХ: Берем предмет
        if (!state.hero.inventory) state.hero.inventory = {};
        state.hero.inventory[itemKey] =
          (state.hero.inventory[itemKey] || 0) + 1;

        notify(`Вы взяли: ${finalName}`, "success"); // ЗЕЛЕНОЕ
        closeInspect();

        if (hotspotDiv) hotspotDiv.style.display = "none";
      } else {
        // ОШИБКА: Нельзя взять
        notify(failText || "Нельзя взять.", "error"); // КРАСНОЕ
      }
    };
  }

  if (inspectEls.btnClose) {
    inspectEls.btnClose.onclick = (e) => {
      e.stopPropagation();
      closeInspect();
    };
  }

  inspectEls.modal.style.display = "flex";
}

function closeInspect() {
  if (inspectEls.modal) inspectEls.modal.style.display = "none";
}
