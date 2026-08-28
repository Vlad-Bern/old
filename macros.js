const stripExt = (value, ext) => {
  if (typeof value !== "string") return value;
  return value.toLowerCase().endsWith(ext) ? value.slice(0, -ext.length) : value;
};

const normalizeCamName = (name) => {
  if (name === "reset") return "normal";
  if (name === "shake") return "quake";
  return name;
};

// -----------------------------------------------------------------
// MEDIA FORMAT COMPATIBILITY
// Старые вызовы из game.js всё ещё могут просить mp3, но реальные UI-файлы
// теперь лежат в OGG. Перехватываем только существующие четыре ассета,
// не трогая потенциальные будущие mp3-SFX.
// -----------------------------------------------------------------
(() => {
  const NativeAudio = window.Audio;
  const audioAliases = new Map([
    ["assets/sfx/click.mp3", "assets/sfx/click.ogg"],
    ["assets/sfx/close.mp3", "assets/sfx/close.ogg"],
    ["assets/sfx/intro.mp3", "assets/sfx/intro.ogg"],
    ["assets/music/main_menu_theme.mp3", "assets/music/main_menu_theme.ogg"],
  ]);

  function MappedAudio(src) {
    const mappedSrc = typeof src === "string" ? audioAliases.get(src) || src : src;
    return new NativeAudio(mappedSrc);
  }

  MappedAudio.prototype = NativeAudio.prototype;
  Object.setPrototypeOf(MappedAudio, NativeAudio);
  window.Audio = MappedAudio;

  // story.js загружается после macros.js. После завершения загрузки страницы
  // переводим старую ссылку на ролик видения на новый WebM-файл.
  window.addEventListener("DOMContentLoaded", () => {
    Object.values(window.story || {}).forEach((scene) => {
      if (!Array.isArray(scene)) return;
      scene.forEach((step) => {
        if (step && step.video === "vision_vladber.mp4") {
          step.video = "second.webm";
        }
      });
    });
  });
})();

const _ = {
  say: (speaker, text, next = null) => {
    const obj = { speaker, text, textStyle: "normal" };
    if (next) obj.next = next;
    return obj;
  },

  horror: (speaker, text, next = null) => {
    const obj = { speaker, text, textStyle: "horror" };
    if (next) obj.next = next;
    return obj;
  },

  bg: (name) => {
    if (!name) return { bg: null };
    return { bg: `assets/bg/${stripExt(name, ".webp")}.webp` };
  },

  music: (track) => {
    if (!track || track === "stop") return { music: null };
    const normalized = stripExt(stripExt(track, ".mp3"), ".ogg");
    return { music: `assets/music/${normalized}.ogg` };
  },

  chapter: (num) => ({ setChapter: num }),

  choose: (text, variants) => ({
    text,
    choices: variants.map((v) => ({
      text: v.t || v.text,
      next: v.n || v.next,
      condition: v.cond || null,
    })),
  }),

  fight: (bgName, enemies, win, lose) => ({
    type: "battle",
    bg: `assets/bg/${stripExt(bgName, ".webp")}.webp`,
    enemies,
    nextWin: win,
    nextLose: lose,
  }),

  lockUI: () => ({ lockMap: true, lockInv: true }),
  unlockUI: () => ({ lockMap: false, lockInv: false }),

  anim: (charId, animName) => ({
    type: "anim_char",
    target: charId,
    anim: animName,
  }),

  cam: (animName) => ({
    type: "anim_cam",
    anim: normalizeCamName(animName),
  }),

  show: (...ids) => ({
    characters: ids.map((id) => ({
      id,
      name: CHAR_NAMES[id] || id,
      img: CHAR_SPRITES[id] || "",
    })),
  }),

  thought: (text, next = null) => {
    const obj = { speaker: "hero_inner", text, textStyle: "thought" };
    if (next) obj.next = next;
    return obj;
  },

  qteSeq: (sequence, timePerKey, win, fail) => ({
    type: "custom",
    action: () => {
      // QTE больше не меняет сюжетный фон: на экране остаётся тот кадр,
      // на котором началась последовательность.
      const fullSequence = sequence.map((s) => ({
        key: s.k || s.key,
        time: s.time || null,
      }));
      startQTE(fullSequence, timePerKey, win, fail);
    },
  }),

  give: (itemId, customText = null) => {
    const item = ITEMS[itemId];
    const itemName = item ? item.name : itemId;
    const icon = item?.icon || "";
    return {
      speaker: "narrator",
      text: customText || `Получено: ${icon} ${itemName}`,
      addItem: itemId,
    };
  },

  explore: (spots) => ({ hotspots: spots, hideUI: true, text: "" }),
  hideUI: () => ({ hideUI: true }),
  showUI: () => ({ showUI: true }),
};
