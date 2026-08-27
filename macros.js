const stripExt = (value, ext) => {
  if (typeof value !== "string") return value;
  return value.toLowerCase().endsWith(ext) ? value.slice(0, -ext.length) : value;
};

const normalizeCamName = (name) => {
  if (name === "reset") return "normal";
  if (name === "shake") return "quake";
  return name;
};

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
    return { music: `assets/music/${stripExt(track, ".mp3")}.mp3` };
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
