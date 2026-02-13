const _ = {
  // 1. Быстрый диалог (Обычный)
  // _.say("hero", "Привет", "nextScene")
  say: (speaker, text, next = null) => {
    const obj = { speaker, text, textStyle: "normal" };
    if (next) obj.next = next;
    return obj;
  },

  // 2. ХОРРОР ДИАЛОГ (Красный, трясущийся)
  // _.horror("???", "УХОДИ ОТСЮДА!")
  horror: (speaker, text, next = null) => ({
    speaker,
    text,
    next,
    textStyle: "horror",
  }),

  // 3. Фон (авто-путь)
  // _.bg("forest") -> assets/bg/forest.jpg
  bg: (name) => ({ bg: `assets/bg/${name}.webp` }),

  // 4. Музыка
  // _.music("theme") -> assets/music/theme.mp3
  music: (track) => ({ music: `assets/music/${track}.mp3` }),

  // 5. Установка главы (для карты)
  // _.chapter(1)
  chapter: (num) => ({ setChapter: num }),

  // 6. Выбор
  // _.choose("Вопрос?", [ {t:"Да", n:"y"}, {t:"Нет", n:"n"} ])
  choose: (text, variants) => ({
    text,
    choices: variants.map((v) => ({
      text: v.t || v.text,
      next: v.n || v.next,
      // Если нужно условие
      condition: v.cond || null,
    })),
  }),

  // 7. Битва
  // _.fight("bg_name", ["enemy1", "enemy2"], "win", "lose")
  fight: (bgName, enemies, win, lose) => ({
    type: "battle",
    bg: `assets/bg/${bgName}.webp`,
    enemies: enemies,
    nextWin: win,
    nextLose: lose,
  }),

  // 8. СКРЫТЬ ВСЕ КНОПКИ (Ловушка / катсцена)
  lockUI: () => ({
    lockMap: true,
    lockInv: true,
  }),

  // 9. ВЕРНУТЬ ВСЕ КНОПКИ
  unlockUI: () => ({
    lockMap: false,
    lockInv: false,
  }),

  // 10. Анимация Персонажа
  // _.anim("hero", "jump")
  anim: (charId, animName) => ({
    type: "anim_char",
    target: charId,
    anim: animName, // jump, shake, tilt, fade-in
  }),

  // 11. Анимация Камеры (Фона/Экрана)
  // _.cam("quake")
  cam: (animName) => ({
    type: "anim_cam",
    anim: animName, // quake, zoom, flash, blur
  }),

  show: (...ids) => ({
    characters: ids.map((id) => ({
      id: id,
      name: CHAR_NAMES[id] || id,
      img: CHAR_SPRITES[id] || "", // <--- Вот здесь он берет картинку!
    })),
  }),

  // Обновленный .say, который не трогает картинки (оставляет как есть)
  say: (speaker, text, next = null) => {
    const obj = { speaker, text, textStyle: "normal" };
    if (next) obj.next = next;
    return obj;
  },

  // Макрос для мыслей (Серый курсив, без имени)
  // Использование: _.thought("А вот и портал...")
  thought: (text, next = null) => ({
    speaker: "hero_inner", // Специальный ID для мыслей
    text: text,
    textStyle: "thought", // Специальный стиль
    next: next,
  }),

  qteSeq: (sequence, timePerKey, win, fail) => ({
    type: "custom",
    action: () => {
      // Преобразуем короткие имена картинок в полные пути (если надо)
      const fullSequence = sequence.map((s) => ({
        key: s.k || s.key,
        bg: s.bg ? `${s.bg}.webp` : null, // Автодобавление .webp
      }));
      startQTE(fullSequence, timePerKey, win, fail);
    },
  }),

  give: (itemId, customText = null) => {
    const item = ITEMS[itemId];
    const itemName = item ? item.name : itemId;
    const icon = item && item.icon ? item.icon : "";

    // Формируем текст уведомления, если не задан свой
    const text = customText || `Получено: ${icon} ${itemName}`;

    return {
      speaker: "narrator", // Говорит рассказчик (пустое имя)
      text: text,
      addItem: itemId, // Наш новый флаг для engine.js
    };
  },

  explore: (spots) => ({
    hotspots: spots,
    hideUI: true, // <--- ПРИНУДИТЕЛЬНО СКРЫВАЕМ ИНТЕРФЕЙС
    text: "", // Гарантируем отсутствие текста
  }),

  // Скрыть интерфейс (для катсцен и исследования)
  hideUI: () => ({
    hideUI: true,
  }),

  // Показать интерфейс обратно
  showUI: () => ({
    showUI: true,
  }),
};
