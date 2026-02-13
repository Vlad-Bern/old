// --- js/data.js ---

// Сначала объявляем пустые объекты, чтобы не было ошибок
window.ENEMIES = {};
window.CHAPTER_MAPS = {};
window.CHAR_NAMES = {};
window.CHAR_SPRITES = {};
window.ITEMS = {};

// Теперь заполняем их данными
// --- ВРАГИ ---
Object.assign(window.ENEMIES, {
  wolf: {
    name: "Волк",
    level: 1,
    hp: 40,
    damage: [4, 8],
    img: "assets/enemies/wolf.webp",
  },
  bandit: {
    name: "Бандит",
    level: 3,
    hp: 80,
    damage: [8, 12],
    img: "assets/enemies/bandit.webp",
  },
  guard_royal: {
    name: "Элитный Страж",
    level: 50,
    hp: 2000,
    damage: [50, 80],
    img: "",
  },
});

// --- СЛОВАРИ ---
Object.assign(window.CHAPTER_MAPS, {
  1: "hub_map",
  2: "map_chapter2",
});

// --- ИМЕНА ---
Object.assign(window.CHAR_NAMES, {
  hero: "Гоша",
  yuno: "Юно",
  villain: "???",
  unknown: "???",
  hero_inner: "",
  narrator: "",
  stranger: "Незнакомец",
  guard: "Стражник",
  aida: "Аида",
  girl1: "Тянка 1",
  girl2: "Тянка 2",
  girl3: "Тянка 3",
  dream_girl: "Тянка",
  groza: "Гроза",
  light: "Лайт",
  whitey: "Беловолосый",
});

// --- СПРАЙТЫ ---
Object.assign(window.CHAR_SPRITES, {
  hero: "",
  yuno: "", // Заглушка
  villain: "",
  none: "",
});

// --- ПРЕДМЕТЫ ---
Object.assign(window.ITEMS, {
  // ... (твои старые предметы) ...
  vladber_eye: {
    name: "Всевидящее око Владбера",
    icon: "👁️",
    type: "key_item",
    desc: "Это око зрит сквозь димку дискорда. Он всё видит и слышит.",
  },
  god_sword: {
    name: "Убийца Богов",
    icon: "⚡",
    type: "weapon",
    damageBonus: 999,
    desc: "...",
  },
});
