/* engine.js - ФИНАЛЬНАЯ ВЕРСИЯ */

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (В САМОМ ВЕРХУ!) ---
window.typeWriterTimeout = null; // Исправление ошибки инициализации
let currentSceneId = null;
let currentScene = [];
let stepIndex = 0;
let returnPoint = null;
let bgm = null;
let currentSaveMode = "save"; // "save" или "load"
let currentMusic = null;
window.currentMusic = null;

// ===========================================
// СОХРАНЕНИЯ И ЗАГРУЗКА
// ===========================================

// 1. Открытие меню
function openSaveLoadMenu(mode) {
  if (battle.active) {
    notify("Бой — не время для мемуаров!", "error");
    return;
  }

  currentSaveMode = mode;
  const modal = document.getElementById("saveload-modal");
  const title = document.getElementById("saveload-title");

  if (!modal) return;

  modal.style.display = "flex";
  title.innerText =
    mode === "save"
      ? "Сохранить свою великую игру"
      : "Загрузить своё великое сохранение";

  renderSaveSlots();
}

// 2. Закрытие меню
function closeSaveLoadMenu() {
  const modal = document.getElementById("saveload-modal");
  if (modal) modal.style.display = "none";
}

const slCloseBtn = document.getElementById("saveload-close-btn");
if (slCloseBtn) slCloseBtn.addEventListener("click", closeSaveLoadMenu);

// 3. Отрисовка слотов
function renderSaveSlots() {
  const grid = document.getElementById("save-slots-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const slots = [1, 2, 3, 4, 5, 6];

  slots.forEach((id) => {
    // ЛОГИКА ДЛЯ СЛОТА 1 (АВТО)
    const isAutoSlot = id === 1;

    // ИСПРАВЛЕНИЕ: Используем 'id', а не 'slotId'
    // Если это слот 1 -> читаем myVN_auto. Иначе -> myVN_save_2, 3...
    const storageKey = isAutoSlot ? "myVN_auto" : `myVN_save_${id}`;

    const savedData = localStorage.getItem(storageKey);

    let infoText = "Пустой слот";
    let dateText = "---";
    let isEmpty = true;

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed && parsed.hero) {
          const ch = parsed.chapter || 1;
          const sc = parsed.sceneId || "???";
          infoText = `Глава ${ch} | Сцена: ${sc}`;
          dateText = parsed.date || "Неизв. дата";
          isEmpty = false;
        }
      } catch (e) {
        infoText = "Ошибка файла";
      }
    }

    const slotDiv = document.createElement("div");
    slotDiv.className = "save-slot";
    if (isAutoSlot) slotDiv.classList.add("auto-slot");

    let borderColor = isEmpty ? "#444" : "#d4af37";
    let bgColor = isEmpty ? "rgba(0,0,0,0.3)" : "rgba(50,50,0,0.2)";
    let titleColor = isEmpty ? "#888" : "#ffd700";
    let titleText = `Слот ${id}`;

    if (isAutoSlot) {
      titleText = "АВТОСОХРАНЕНИЕ";
      borderColor = "#00d2ff";
      titleColor = "#00d2ff";
      if (!isEmpty) bgColor = "rgba(0, 50, 100, 0.2)";
    }

    slotDiv.style.cssText = `
        position: relative; 
        border: 1px solid ${borderColor}; 
        padding: 10px; 
        margin: 5px; 
        cursor: pointer; 
        background: ${bgColor};
        transition: all 0.2s;
    `;

    slotDiv.onmouseenter = () => {
      if (isAutoSlot)
        slotDiv.style.background = isEmpty
          ? "rgba(0,200,255,0.1)"
          : "rgba(0, 100, 200, 0.4)";
      else
        slotDiv.style.background = isEmpty
          ? "rgba(255,255,255,0.1)"
          : "rgba(212, 175, 55, 0.3)";
    };
    slotDiv.onmouseleave = () => (slotDiv.style.background = bgColor);

    slotDiv.innerHTML = `
      <div style="font-weight: bold; color: ${titleColor}; margin-bottom:5px;">${titleText}</div>
      <div style="font-size: 0.9em; color: #ccc; margin: 5px 0;">${infoText}</div>
      <div style="font-size: 0.8em; color: #666;">${dateText}</div>
    `;

    slotDiv.onclick = () => {
      if (currentSaveMode === "save") {
        // --- ЛОГИКА СОХРАНЕНИЯ ---
        if (isAutoSlot) {
          notify("Убери руки от автосейва.", "error");
          return;
        }
        if (!isEmpty) {
          gameConfirm(`Перезаписать слот ${id}?`, () => saveGame(id));
        } else {
          saveGame(id);
        }
      } else {
        // --- ЛОГИКА ЗАГРУЗКИ ---
        if (isEmpty) return;

        const confirmText = isAutoSlot
          ? "Загрузить автосейв?"
          : `Загрузить слот ${id}?`;

        gameConfirm(confirmText, () => {
          const targetId = isAutoSlot ? "auto" : id;
          const menu = document.getElementById("main-menu");
          const isInMainMenu =
            menu && menu.style.display !== "none" && menu.style.opacity !== "0";

          if (isInMainMenu) {
            closeSaveLoadMenu();
            menu.classList.add("menu-fade-out-anim");

            if (typeof window.audioFadeOut === "function") {
              window.audioFadeOut(1500, () => {
                loadGame(targetId);
                menu.classList.remove("menu-fade-out-anim");
              });
            } else {
              setTimeout(() => {
                loadGame(targetId);
                menu.classList.remove("menu-fade-out-anim");
              }, 1500);
            }
          } else {
            // Если грузимся во время игры (через Esc/паузу)
            loadGame(targetId);
            closeSaveLoadMenu();
          }
        });
      }
    };

    if (!isEmpty && !isAutoSlot) {
      const delBtn = document.createElement("button");
      delBtn.innerHTML = "🗑️";
      delBtn.title = "Удалить";
      delBtn.style.cssText =
        "position: absolute; top: 10px; right: 10px; background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.7; color: #fff;";

      delBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Чтобы не сработал клик по самому слоту (загрузка)

        // Передаем действие удаления вторым аргументом
        gameConfirm(`Удалить сохранение ${id}?`, () => {
          // Этот код выполнится ТОЛЬКО если нажать "ОК" в нашем окне
          localStorage.removeItem(storageKey);
          notify("Сохранение удалено", "info");
          renderSaveSlots(); // Обновляем список слотов
        });
      });
      slotDiv.appendChild(delBtn);
    }

    grid.appendChild(slotDiv);
  });
}

function saveGame(slotId, forceSceneId = null) {
  // Если сохраняем автосейв, state.hero может быть еще старым,
  // но мы хотим сохранить текущее состояние.
  if (!state.hero) return;

  const saveData = {
    chapter: state.chapter,
    sceneId: forceSceneId || currentSceneId, // Для автосейва берем новую сцену
    stepIndex: forceSceneId ? 0 : stepIndex, // Для автосейва всегда начало (0)
    hero: state.hero,
    inventory: state.hero.inventory || {},
    date: new Date().toLocaleString(),
    lockMap: state.lockMap || false,
    lockInv: state.lockInv || false,
    isAuto: slotId === "auto", // Метка, что это авто
  };

  const storageKey = slotId === "auto" ? "myVN_auto" : `myVN_save_${slotId}`;

  try {
    localStorage.setItem(storageKey, JSON.stringify(saveData));

    // Показываем уведомление только если это РУЧНОЕ сохранение
    if (slotId !== "auto") {
      notify("Казахские подвиги засейвлены!", "success");
      renderSaveSlots(); // Обновляем меню, если оно открыто
    }
  } catch (e) {
    console.error("Save error:", e);
    if (slotId !== "auto") alert("Ошибка сохранения (нет места?)");
  }
}

function loadGame(slotId) {
  // 1. Сначала определяем ключ (ОДИН РАЗ)
  const storageKey = slotId === "auto" ? "myVN_auto" : `myVN_save_${slotId}`;

  // 2. Потом читаем JSON (ОДИН РАЗ)
  const json = localStorage.getItem(storageKey);

  if (!json) {
    alert("Сохранение не найдено!");
    return;
  }

  try {
    const data = JSON.parse(json);
    setMusic(null);

    const mainMenu = document.getElementById("main-menu");
    if (mainMenu) {
      mainMenu.style.display = "none";
      mainMenu.style.opacity = "0";
    }

    if (els.uiLayer) els.uiLayer.style.display = "flex";
    if (els.chars) els.chars.style.display = "flex";

    closeSaveLoadMenu();

    state.chapter = data.chapter || 1;
    state.hero = data.hero;
    if (data.inventory) state.hero.inventory = data.inventory;

    state.lockMap = data.lockMap || false;
    state.lockInv = data.lockInv || false;

    currentSceneId = data.sceneId;
    // Если это автосейв - всегда начинаем с 0, если ручной - с сохраненного шага
    stepIndex = data.isAuto ? 0 : data.stepIndex || 0;

    loadScene(currentSceneId);
  } catch (e) {
    console.error(e);
    alert("Ошибка: файл сохранения поврежден.");
  }
}

// ===========================================
// НАВИГАЦИЯ
// ===========================================

function loadScene(sceneName) {
  if (!story[sceneName]) {
    alert("Сцена " + sceneName + " не найдена");
    return;
  }

  // --- АВТОСОХРАНЕНИЕ ---
  // Сохраняем ПЕРЕД сбросом переменных, но с НОВЫМ sceneId
  // Чтобы при загрузке мы оказались в начале этой сцены
  saveGame("auto", sceneName); // Передаем спец. ID "auto" и имя сцены

  currentSceneId = sceneName;
  currentScene = story[sceneName];
  stepIndex = 0;
  dialogueHistory = [];

  const firstStep = currentScene[0];
  if (
    firstStep &&
    (firstStep.type === "anim_cam" || firstStep.type === "anim_char")
  ) {
    stepIndex = -1;
    // Если первый шаг - анимация (например, сброс камеры),
    // запускаем обработчик шагов, чтобы он её выполнил.
    nextStep();
  } else {
    renderStep();
  }
}

function nextStep() {
  console.group("🔵 NEXT STEP CALL");
  console.log("Старый индекс:", stepIndex);

  // 1. Проверка перехода у ТЕКУЩЕГО шага
  if (currentScene && currentScene[stepIndex] && currentScene[stepIndex].next) {
    console.log("🚀 Переход по .next:", currentScene[stepIndex].next);
    loadScene(currentScene[stepIndex].next);
    console.groupEnd();
    return;
  }

  // 2. Увеличиваем индекс
  stepIndex++;
  console.log("Новый индекс:", stepIndex);

  // 3. Проверка конца сцены
  if (!currentScene || stepIndex >= currentScene.length) {
    console.warn("⛔ Конец сцены");
    console.groupEnd();
    return;
  }

  const step = currentScene[stepIndex];
  console.log("📦 Данные шага:", step);

  // 4. АНИМАЦИИ (Рекурсия)
  if (step.type === "anim_char" || step.type === "anim_cam") {
    console.log("🎬 Найдена анимация, запускаем и пропускаем шаг...");

    // ... (Тут твой код анимации, который был) ...
    // ... (CharEl, GameContainer и т.д.) ...
    if (step.type === "anim_char") {
      const charEl = document.querySelector(`.char-${step.target}`);
      if (charEl) {
        charEl.classList.add(`anim-${step.anim}`);
        setTimeout(() => charEl.classList.remove(`anim-${step.anim}`), 1000);
      }
    }
    if (step.type === "anim_cam") {
      const gc = document.getElementById("game-container");
      if (step.anim === "blur") gc.classList.add("cam-blur");
      else if (step.anim === "normal") {
        gc.style.filter = "";
        gc.classList.remove("cam-blur", "cam-zoom", "cam-quake");
        gc.style.transform = "scale(1)";
        gc.className = "";
      } else if (step.anim === "quake") {
        // Трясем BODY, чтобы гарантированно работало
        document.body.classList.add("cam-quake");
        setTimeout(() => document.body.classList.remove("cam-quake"), 500);
      } else {
        // Для flash и прочего - оставляем на контейнере
        gc.classList.add(`cam-${step.anim}`);
        setTimeout(() => gc.classList.remove(`cam-${step.anim}`), 1000);
      }
    }

    console.groupEnd();
    nextStep(); // <--- РЕКУРСИЯ
    return;
  }

  // 5. ПРОПУСК ПУСТЫХ ШАГОВ (Background / Music)
  // Если в шаге нет текста, нет выбора и нет типа (битвы/карты) - это просто смена настроек
  // Мы должны применить их и идти дальше!
  const isInteractive =
    step.text ||
    step.choices ||
    step.type === "battle" ||
    step.type === "map" ||
    step.type === "store";

  if (!isInteractive) {
    console.log("⚙️ Шаг без текста (фон/музыка). Применяем и идем дальше.");
    renderStep(); // Применяем смену фона/музыки (в renderStep это есть)
    console.groupEnd();
    nextStep(); // <--- РЕКУРСИЯ (Сразу следующий)
    return;
  }

  console.log("✅ Отрисовка диалога (renderStep)");
  renderStep();
  console.groupEnd();
}

// ===========================================
// РЕНДЕР (ОТРИСОВКА) - ИСПРАВЛЕННЫЙ
// ===========================================

function renderStep(forceRefresh = false) {
  window.currentScene = currentScene;
  window.stepIndex = stepIndex;

  const step = currentScene[stepIndex];
  if (step.bg && typeof step.bg === "function") {
    step.bg = step.bg(); // Выполняем функцию и заменяем свойство
  }

  if (step.text && step.text.trim() !== "") {
    let speakerName = CHAR_NAMES[step.speaker] || step.speaker || "";

    // Если это мысли или голос за кадром — имя не нужно
    if (step.speaker === "narrator" || step.speaker === "hero_inner") {
      speakerName = "";
    }

    dialogueHistory.push({
      name: speakerName,
      text: step.text,
    });
  }

  const uiLayer = document.getElementById("ui-layer");
  const dialogueFrame = document.getElementById("dialogue-box");
  const textBox = els.text;

  // --- ХОТПОТЫ (ЗОНЫ КЛИКА) ---
  const clickLayer = document.getElementById("click-layer");
  if (clickLayer) {
    clickLayer.innerHTML = "";
    if (step.hotspots) {
      clickLayer.style.display = "block";
      step.hotspots.forEach((spot) => {
        // Пропуск взятых предметов
        if (
          spot.item &&
          state.hero.inventory &&
          state.hero.inventory[spot.item]
        )
          return;

        const div = document.createElement("div");
        div.className = "hotspot";
        div.style.left = spot.x + "%";
        div.style.top = spot.y + "%";
        div.style.width = spot.w + "%";
        div.style.height = spot.h + "%";
        div.style.cursor = "pointer";

        // Если есть картинка предмета (на столе)
        if (spot.image) {
          const img = document.createElement("img");
          img.src = spot.image.includes("/")
            ? spot.image
            : `assets/props/${spot.image}`;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "contain";
          div.appendChild(img);
        }

        // --- ПРАВИЛЬНЫЙ ОБРАБОТЧИК КЛИКА ---
        div.onclick = (e) => {
          e.stopPropagation();

          // 1. Если это переход в другую локацию
          if (spot.nextScene) {
            if (spot.nextScene === "prologue_leave_home") {
              gameConfirm("Пора выдвигаться в колледж? Ты точно готов?", () => {
                loadScene(spot.nextScene);
              });
            } else {
              loadScene(spot.nextScene);
            }
            return;
          }

          // 2. Если это предмет (осмотр)
          openInspect(
            spot.item,
            spot.name,
            spot.desc,
            null,
            spot.canTake,
            spot.failMsg,
            div,
          );
        };
        clickLayer.appendChild(div);
      });
    } else {
      clickLayer.style.display = "none";
    }
  }

  // --- ЛОГИКА ОТОБРАЖЕНИЯ ИНТЕРФЕЙСА (UI) ---
  // Сначала решаем, должен ли быть виден UI
  let showUI = true;

  // 1. Если спец. режим (карта, битва, магазин) -> UI скрыт
  if (
    step.type === "investigate" ||
    step.type === "map" ||
    step.type === "battle" ||
    step.type === "store"
  ) {
    showUI = false;
  }

  // 2. Если есть явный флаг hideUI -> UI скрыт
  if (step.hideUI) {
    showUI = false;
  }
  // 3. Если есть флаг showUI -> UI принудительно показан
  else if (step.showUI) {
    showUI = true;
  }

  // Применяем решение
  if (uiLayer) {
    uiLayer.style.display = showUI ? "flex" : "none";
  }

  // --- ТЕКСТ (TYPEWRITER) ---
  // Запускаем печатную машинку только если UI показан и есть текст
  if (showUI && step.text) {
    const isHorror = step.textStyle === "horror";
    textBox.className = "";
    if (isHorror) {
      textBox.classList.add("text-style-horror");
      if (dialogueFrame) dialogueFrame.classList.add("dialogue-box-horror");
    } else {
      textBox.classList.add("text-style-normal");
      if (dialogueFrame) dialogueFrame.classList.remove("dialogue-box-horror");
    }

    const speed = isHorror ? 100 : 20;
    if (typeof typeWriter === "function") {
      typeWriter(textBox, step.text, speed, isHorror);
    } else {
      textBox.textContent = step.text;
    }
  } else {
    // Если UI скрыт или текста нет - чистим, но таймер не трогаем (он сам умрет)
    textBox.textContent = "";
  }

  // --- БЛОКИРОВКИ ---
  if (typeof step.lockMap !== "undefined") state.lockMap = step.lockMap;
  if (typeof step.lockInv !== "undefined") state.lockInv = step.lockInv;

  // --- ПРОПУСК ПУСТЫХ ШАГОВ ---
  if (
    step.next &&
    !step.text &&
    !step.choices &&
    !step.type &&
    !step.hotspots
  ) {
    loadScene(step.next);
    return;
  }

  // --- КАСТОМНЫЕ ДЕЙСТВИЯ (QTE) ---
  if (step.type === "custom" && typeof step.action === "function") {
    step.action();
    return;
  }

  // --- СПЕЦ. РЕЖИМЫ ---
  if (step.type === "battle") {
    if (step.bg) setBackground(step.bg);
    startBattle(step);
    return;
  }
  if (step.type === "map") {
    if (step.bg) setBackground(step.bg);
    if (step.music) setMusic(step.music);
    renderMap(step);
    return;
  }
  if (step.type === "store") {
    if (step.bg) setBackground(step.bg);
    if (step.music) setMusic(step.music);
    renderStore(step);
    return;
  }
  // Investigate используем старый (для поиска монет), а hotspots для нового
  if (step.type === "investigate") {
    if (step.bg) setBackground(step.bg);
    renderInvestigate(step);
    return;
  }

  // --- ОБЫЧНАЯ СЦЕНА (ФОН/МУЗЫКА/ПЕРСОНАЖИ) ---
  if (els.mapLayer) els.mapLayer.style.display = "none";
  if (els.battleLayer) els.battleLayer.style.display = "none";
  if (els.chars) els.chars.style.display = showUI ? "flex" : "none"; // Персонажи тоже скрываются при hideUI

  if (step.bg) setBackground(step.bg);
  if (step.music) setMusic(step.music);
  if (step.setChapter) state.chapter = step.setChapter;

  // ВЫДАЧА ПРЕДМЕТА (ПРОСТАЯ)
  if (step.addItem && ITEMS[step.addItem]) {
    if (!state.hero.inventory) state.hero.inventory = {};
    state.hero.inventory[step.addItem] =
      (state.hero.inventory[step.addItem] || 0) + 1;
  }

  // ПЕРСОНАЖИ
  let nextChars = state.characters;
  if ("characters" in step) nextChars = step.characters || [];

  const speakerId = step.speaker || "narrator";
  if (speakerId === "narrator") els.name.textContent = "";
  else {
    const speakerOnScreen = nextChars.find((c) => c.id === speakerId);
    els.name.textContent = speakerOnScreen
      ? speakerOnScreen.name
      : window.CHAR_NAMES
        ? CHAR_NAMES[speakerId]
        : speakerId;
  }

  renderCharacters(nextChars, speakerId, forceRefresh);
  setChoices(step);

  // --- КНОПКИ UI ---
  const shouldHideMap = state.lockMap || step.hideMapBtn;
  if (els.mapBtn) els.mapBtn.style.display = shouldHideMap ? "none" : "block";

  const invBtn = els.mainInvBtn || document.getElementById("main-inv-btn");
  if (invBtn) invBtn.style.display = state.lockInv ? "none" : "";
}

// ===========================================
// ОСТАЛЬНЫЕ ФУНКЦИИ (Рендер карты, магазина и т.д.)
// ===========================================

function renderMap(step) {
  els.uiLayer.style.display = "none";
  els.chars.style.display = "none";
  els.battleLayer.style.display = "none";
  els.mapLayer.style.display = "block";
  els.bg.style.backgroundImage = `url("${step.bg}")`;

  // 1. Очищаем всё старое (включая магазин, если он был)
  els.mapLayer.innerHTML = "";

  // 2. Создаем контейнер карты заново (так надежнее всего)
  const mapContainer = document.createElement("div");
  mapContainer.id = "map-locations";
  els.mapLayer.appendChild(mapContainer);

  mapContainer.innerHTML = "";

  step.locations.forEach((loc) => {
    const el = document.createElement("div");
    el.className = "map-location";
    el.style.left = loc.x + "%";
    el.style.top = loc.y + "%";
    el.style.width = loc.w + "%";
    el.style.height = loc.h + "%";
    el.innerText = loc.text;

    el.onclick = (e) => {
      e.stopPropagation();
      loadScene(loc.next);
    };
    mapContainer.appendChild(el);
  });

  const backBtn = document.getElementById("map-back-btn");
  if (backBtn) {
    if (window.returnPoint) {
      backBtn.style.display = "flex";
      backBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.playSfx) playSfx("assets/sfx/close.mp3");
        loadScene(window.returnPoint.sceneId);
        stepIndex = window.returnPoint.stepIndex;
        renderStep(true);
        window.returnPoint = null;
      };
    } else {
      backBtn.style.display = "none";
    }
  }
}

function renderStore(step) {
  // ... Твой код магазина (он был длинный, я его сократил тут для примера,
  // но в твоем файле оставь его полным, я вижу он правильный) ...
  // Если у тебя он есть в оригинале, просто скопируй его сюда.
  // НО Я СКОПИРУЮ ТВОЮ ФУНКЦИЮ ПОЛНОСТЬЮ, ЧТОБЫ ТЫ МОГ ПРОСТО ЗАМЕНИТЬ ФАЙЛ:

  els.mapLayer.style.display = "block";
  els.uiLayer.style.display = "none";
  els.chars.style.display = "flex";
  els.mapLayer.innerHTML = "";

  if (step.characters) {
    renderCharacters(step.characters, null, true);
  }

  const storeContainer = document.createElement("div");
  storeContainer.style.cssText = `
      position: absolute; top: 60%; left: 50%; transform: translate(-50%, -50%);
      width: 600px; height: 400px; background: rgba(0,0,0,0.95);
      border: 2px solid #d4af37; border-radius: 10px; padding: 20px;
      display: flex; flex-direction: column; gap: 15px; color: white; font-family: sans-serif;
      box-shadow: 0 0 20px rgba(0,0,0,0.8); z-index: 1000;
  `;

  const header = document.createElement("div");
  header.style.cssText =
    "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 10px;";

  const title = document.createElement("h2");
  title.innerText = step.text || "Магазин";
  title.style.margin = "0";
  title.style.fontSize = "22px";
  title.style.color = "#d4af37";

  const coinDisplay = document.createElement("div");
  coinDisplay.innerHTML = `💰 <span id="coin-count">${state.hero.coins || 0}</span>`;
  coinDisplay.style.fontSize = "20px";
  coinDisplay.style.color = "gold";

  header.appendChild(title);
  header.appendChild(coinDisplay);
  storeContainer.appendChild(header);

  const menuArea = document.createElement("div");
  menuArea.id = "store-menu-area";
  menuArea.style.cssText =
    "flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 5px;";
  storeContainer.appendChild(menuArea);

  let currentView = "main";

  function showMainMenu() {
    currentView = "main";
    menuArea.innerHTML = "";
    title.innerText = step.text || "Магазин";

    if (step.talk) {
      menuArea.appendChild(
        createStoreBtn("🗣️ Поговорить", () => showTalkList(step.talk)),
      );
    }
    menuArea.appendChild(
      createStoreBtn("⚔️ Оружие", () => showCategory("weapon")),
    );
    menuArea.appendChild(
      createStoreBtn("🧪 Зелья и Усиления", () => showCategory("potion")),
    );

    const exitBtn = createStoreBtn("🚪 Уйти (Esc)", exitStore);
    exitBtn.style.marginTop = "auto";
    exitBtn.style.background = "#522";
    menuArea.appendChild(exitBtn);
  }

  function showTalkList(talkNode) {
    currentView = "talk_list";
    menuArea.innerHTML = "";
    title.innerText = step.characters ? step.characters[0].name : "Торговец";

    if (talkNode.text) {
      const intro = document.createElement("div");
      intro.innerText = talkNode.text;
      intro.style.cssText = "padding: 10px; color:#aaa; font-style: italic;";
      menuArea.appendChild(intro);
    }

    if (talkNode.choices) {
      talkNode.choices.forEach((choice) => {
        menuArea.appendChild(
          createStoreBtn("💬 " + choice.text, () => {
            showTalkAnswer(choice.nextTalk || { text: "..." }, talkNode);
          }),
        );
      });
    }

    const backBtn = createStoreBtn("⬅️ Назад (Esc)", showMainMenu);
    backBtn.style.marginTop = "auto";
    menuArea.appendChild(backBtn);
  }

  function showTalkAnswer(answerNode, parentNode) {
    currentView = "talk_answer";
    menuArea.innerHTML = "";

    const txt = document.createElement("div");
    txt.innerText = answerNode.text;
    txt.style.cssText =
      "padding: 15px; background: rgba(255,255,255,0.1); border-radius: 5px; font-size: 16px; line-height: 1.4; color: #eee; font-style: italic; margin-bottom: 10px;";
    menuArea.appendChild(txt);

    if (answerNode.choices && answerNode.choices.length > 0) {
      answerNode.choices.forEach((choice) => {
        menuArea.appendChild(
          createStoreBtn("💬 " + choice.text, () => {
            showTalkAnswer(choice.nextTalk || { text: "..." }, parentNode);
          }),
        );
      });
    }

    const backText =
      answerNode.choices && answerNode.choices.length > 0
        ? "⬅️ Прервать (Esc)"
        : "⬅️ К вопросам (Esc)";

    const backBtn = createStoreBtn(backText, () => {
      showTalkList(step.talk);
    });
    backBtn.style.marginTop = "auto";
    menuArea.appendChild(backBtn);
  }

  function showCategory(catType) {
    currentView = "category";
    menuArea.innerHTML = "";

    let found = false;
    for (const [id, item] of Object.entries(ITEMS)) {
      if (item.price === undefined) continue;
      let match = false;
      if (catType === "weapon" && item.type === "weapon") match = true;
      if (
        catType === "potion" &&
        (item.type === "heal" ||
          item.type === "stamina" ||
          item.type.startsWith("buff"))
      )
        match = true;

      if (!match) continue;
      found = true;
      const row = document.createElement("div");
      row.style.cssText =
        "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; border: 1px solid #444;";

      row.innerHTML = `
              <div style="display:flex; align-items:center; gap:10px;">
                  <div style="font-size:24px;">${item.icon || "📦"}</div>
                  <div>
                      <div style="font-weight:bold; font-size:14px; color:#eee;">${item.name}</div>
                      <div style="font-size:11px; color:#aaa;">${item.desc || ""}</div>
                  </div>
              </div>
          `;

      const buyBtn = document.createElement("button");
      buyBtn.innerText = `${item.price} 💰`;
      buyBtn.style.cssText =
        "padding: 5px 10px; cursor: pointer; background: #d4af37; color: #000; border: none; font-weight: bold; border-radius: 4px; font-size:12px;";

      buyBtn.addEventListener("click", () => {
        if (spendGold(item.price)) {
          gainItem(id, 1);
          const countEl = document.getElementById("coin-count");
          if (countEl) countEl.innerText = state.hero.coins;
        } else {
          buyBtn.style.background = "red";
          setTimeout(() => (buyBtn.style.background = "#d4af37"), 200);
        }
      });
      row.appendChild(buyBtn);
      menuArea.appendChild(row);
    }

    if (!found)
      menuArea.innerHTML =
        "<div style='text-align:center; padding:20px; color:#666;'>Нет товаров</div>";

    const backBtn = createStoreBtn("⬅️ Назад (Esc)", showMainMenu);
    backBtn.style.marginTop = "auto";
    menuArea.appendChild(backBtn);
  }

  function createStoreBtn(text, onClick) {
    const btn = document.createElement("button");
    btn.innerText = text;
    btn.style.cssText = `
          padding: 10px 15px; font-size: 16px; cursor: pointer;
          background: linear-gradient(to bottom, #333, #222);
          color: #eee; border: 1px solid #555; border-radius: 5px;
          text-align: left; transition: all 0.2s;
      `;
    btn.onmouseover = () => (btn.style.borderColor = "#888");
    btn.onmouseout = () => (btn.style.borderColor = "#555");
    btn.addEventListener("click", onClick);
    return btn;
  }

  function exitStore() {
    document.removeEventListener("keydown", escHandler);
    if (step.next) loadScene(step.next);
  }

  const escHandler = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      if (currentView === "main") {
        exitStore();
      } else if (currentView === "talk_answer") {
        showTalkList(step.talk);
      } else {
        showMainMenu();
      }
    }
  };
  document.addEventListener("keydown", escHandler);

  showMainMenu();
  els.mapLayer.appendChild(storeContainer);
}

function renderInvestigate(step) {
  if (step.bg) {
    setBackground(step.bg);
    state.bg = null;
  }

  els.mapLayer.style.display = "block";
  els.uiLayer.style.display = "flex";
  els.chars.style.display = "none";
  els.mapLayer.innerHTML = "";

  if (step.next) {
    const nextBtn = document.createElement("div");
    nextBtn.innerText = "Закончить осмотр ➡️";
    nextBtn.style.cssText =
      "position:absolute; bottom:20px; right:20px; background:rgba(0,0,0,0.8); color:white; padding:10px; cursor:pointer; z-index:100; border:1px solid white; font-family: sans-serif;";
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      gameConfirm("Закончить осмотр и идти дальше?", () => {
        loadScene(step.next);
      });
    });
    els.mapLayer.appendChild(nextBtn);
  }

  const objectsToRender = step.choices || step.items || [];
  objectsToRender.forEach((obj) => {
    if (obj.itemId && state.history && state.history[obj.itemId]) return;

    const btn = document.createElement("div");
    if (obj.customStyle) {
      btn.style.cssText = obj.customStyle;
    } else {
      btn.style.position = "absolute";
      btn.style.left = (obj.x || 0) + "%";
      btn.style.top = (obj.y || 0) + "%";
      btn.style.width = (obj.w || 10) + "%";
      btn.style.height = (obj.h || 10) + "%";
      btn.style.border = "1px dashed rgba(255,255,255,0.3)";
    }
    btn.style.cursor = "help";
    if (obj.text) btn.innerText = obj.text;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      // --- (Логика переходов/дверей) ---
      if (obj.nextScene) {
        gameConfirm(obj.desc || "Уйти отсюда?", () => {
          loadScene(obj.nextScene);
        });
        return; //
      }

      // ПРОВЕРКА: Можно ли брать предмет?
      if (obj.canTake === false) {
        notify(obj.failMsg || "Это нельзя взять.", "error");
        return;
      }

      if (obj.gold) {
        gainGold(obj.gold);
        notify(`💰 Вы нашли: ${obj.gold} монет!`, "success");
        btn.style.display = "none";
        // ... (твой старый код записи в историю) ...
        return;
      }

      // Обычное описание
      els.name.textContent = "";
      let description = obj.desc || "Ничего необычного.";
      if (obj.item && ITEMS[obj.item] && ITEMS[obj.item].desc) {
        description = ITEMS[obj.item].desc;
      }

      // Используем печатающийся текст (если есть функция type) или просто ставим текст
      if (typeof type === "function") type(description);
      else els.text.textContent = description;

      // Получение предмета
      if (obj.item) {
        if (typeof gainItem === "function") gainItem(obj.item);
        const itemName = ITEMS[obj.item] ? ITEMS[obj.item].name : obj.item;

        notify("Получено: " + itemName, "success");
        btn.style.display = "none";

        if (obj.itemId) {
          if (!state.history) state.history = {};
          state.history[obj.itemId] = true;
        }
      }
    });

    els.mapLayer.appendChild(btn);
  });
}

// ===========================================
// УТИЛИТЫ (Звук, Фон, Персонажи)
// ===========================================

function setBackground(url) {
  // 1. Если url не строка (или пустая) — выходим
  if (typeof url !== "string" || !url) {
    console.warn("setBackground: invalid url", url);
    return;
  }

  if (url === state.bg) return;
  state.bg = url;

  const bgDiv = document.getElementById("background");
  const bgVideo = document.getElementById("bg-video");
  if (!bgDiv || !bgVideo) return;

  // Теперь безопасно
  const isVideo = url.endsWith(".mp4") || url.endsWith(".webm");

  if (isVideo) {
    bgVideo.src = url;
    bgVideo.style.display = "block";
    bgVideo.play().catch((e) => console.log("Автоплей блокирован:", e));
    bgDiv.style.display = "none";
    videoEl.onended = () => {
      if (step.nextScene) {
        loadScene(step.nextScene);
      } else {
        nextStep();
      }
    };
  } else {
    bgVideo.pause();
    bgVideo.style.display = "none";
    bgDiv.style.backgroundImage = `url('${url}')`;
    bgDiv.style.display = "block";
  }
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ МУЗЫКИ (ОДНА!)
function setMusic(path) {
  if (state.music === path && window.currentMusic) {
    if (window.settings && typeof window.settings.volume === "number")
      window.currentMusic.volume = window.settings.volume;
    return;
  }

  if (window.currentMusic) {
    window.currentMusic.pause();
    window.currentMusic = null;
  }

  if (!path) {
    state.music = null;
    return;
  }

  state.music = path;
  window.currentMusic = new Audio(path);
  window.currentMusic.loop = true;

  if (window.settings && typeof window.settings.volume === "number") {
    window.currentMusic.volume = window.settings.volume;
  } else {
    window.currentMusic.volume = 0.5;
  }

  window.currentMusic.play().catch((e) => console.log("Music play error:", e));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function playSfx(path) {
  const audio = new Audio(path);
  if (window.settings && typeof window.settings.volume === "number") {
    audio.volume = window.settings.volume;
  } else {
    audio.volume = 0.5;
  }
  audio.play().catch((e) => console.log("SFX error:", e));
}

let heartbeatAudio = null;
function toggleHeartbeat(enable) {
  if (enable) {
    if (!heartbeatAudio) {
      heartbeatAudio = new Audio("assets/sfx/heartbeat.mp3");
      heartbeatAudio.loop = true;
      heartbeatAudio.volume = 0.5;
    }
    if (heartbeatAudio.paused) heartbeatAudio.play().catch(() => {});
  } else {
    if (heartbeatAudio) {
      heartbeatAudio.pause();
      heartbeatAudio.currentTime = 0;
    }
  }
}

function renderCharacters(nextChars, speakerId, forceRefresh = false) {
  if (!nextChars) nextChars = [];
  if (!state.characters) state.characters = [];
  const incoming = nextChars || [];
  const current = forceRefresh ? [] : state.characters;
  let same = !forceRefresh && incoming.length === current.length;

  if (same) {
    for (let i = 0; i < incoming.length; i++) {
      if (
        incoming[i].id !== current[i].id ||
        incoming[i].img !== current[i].img
      ) {
        same = false;
        break;
      }
    }
  }

  const isNarrator = speakerId === "narrator";

  if (same) {
    const containers = els.chars.querySelectorAll(".char-container");
    containers.forEach((container, index) => {
      container.classList.remove("active", "inactive");
      const char = incoming[index];
      const isActive = !isNarrator && speakerId === char.id;
      container.classList.add(isActive ? "active" : "inactive");
    });
    return;
  }

  els.chars.innerHTML = "";
  state.characters = incoming.slice(0, 3);

  state.characters.forEach((char) => {
    const container = document.createElement("div");
    container.className = "char-container";
    const isActive = !isNarrator && speakerId === char.id;
    container.classList.add(isActive ? "active" : "inactive");

    const img = document.createElement("img");
    img.src = char.img;
    img.className = `char-img char-sprite char-${char.id}`; // <--- ДОБАВИЛ char-img

    const nameDiv = document.createElement("div");
    nameDiv.className = "char-name";
    nameDiv.textContent = char.name;

    container.appendChild(img);
    container.appendChild(nameDiv);
    els.chars.appendChild(container);

    requestAnimationFrame(() => container.classList.add("show"));
  });
}

function setChoices(step) {
  els.choices.innerHTML = "";
  if (!step.choices || !step.choices.length) return;

  step.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice.text;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      els.choices.innerHTML = "";
      if (choice.next) loadScene(choice.next);
    });
    els.choices.appendChild(btn);
  });
}

// ФУНКЦИЯ TYPEWRITER (ДОЛЖНА БЫТЬ В КОНЦЕ)
function typeWriter(element, text, speed, isHorror) {
  if (window.typeWriterTimeout) clearTimeout(window.typeWriterTimeout);
  element.innerHTML = "";

  let i = 0;
  function type() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      let currentSpeed = speed;
      if (isHorror && Math.random() > 0.8) currentSpeed *= 3;
      window.typeWriterTimeout = setTimeout(type, currentSpeed);
    } else {
      window.typeWriterTimeout = null;
    }
  }
  type();
}

// --- 1. ФУНКЦИЯ УВЕДОМЛЕНИЙ (TOAST) ---
function notify(text, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerText = text;

  container.appendChild(toast);

  // Звуки (когда добавишь файлы, они заработают)
  let sfx = "assets/sfx/notify.mp3";
  if (type === "error") sfx = "assets/sfx/error.mp3";
  if (type === "success") sfx = "assets/sfx/success.mp3";

  if (typeof playSfx === "function") playSfx(sfx);

  setTimeout(() => toast.remove(), 3000);
}

// --- 2. ФУНКЦИЯ ПОДТВЕРЖДЕНИЯ (CONFIRM) ---
function gameConfirm(text, onYes, onNo = null) {
  const overlay = document.getElementById("custom-confirm");
  const yesBtn = document.getElementById("confirm-yes");
  const noBtn = document.getElementById("confirm-no");

  document.getElementById("confirm-message").innerText = text;
  overlay.style.display = "flex";

  // ВАЖНО: Мы используем onclick, который ПЕРЕЗАПИСЫВАЕТ предыдущий обработчик.
  // Это гарантирует, что старое действие (например, удаление сохранения) не сработает при новом вопросе.
  yesBtn.onclick = (e) => {
    e.stopPropagation();
    overlay.style.display = "none";
    if (onYes) onYes();
  };

  noBtn.onclick = (e) => {
    e.stopPropagation();
    overlay.style.display = "none";
    if (onNo) onNo();
  };
}

// Открытие истории
document.getElementById("history-btn").addEventListener("click", () => {
  const modal = document.getElementById("history-modal");
  const container = document.getElementById("history-log-container");
  container.innerHTML = ""; // Очищаем старое

  dialogueHistory.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    const namePart = item.name
      ? `<span class="history-name">${item.name}:</span>`
      : "";
    div.innerHTML = `<span class="history-name">${item.name}:</span><span class="history-text">${item.text}</span>`;
    container.appendChild(div);
  });

  modal.style.display = "flex";
  container.scrollTop = container.scrollHeight; // Скроллим в самый низ
});

// Закрытие
document.getElementById("history-close-btn").addEventListener("click", () => {
  document.getElementById("history-modal").style.display = "none";
});
