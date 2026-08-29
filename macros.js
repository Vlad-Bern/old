const stripExt = (value, ext) => {
  if (typeof value !== "string") return value;
  return value.toLowerCase().endsWith(ext) ? value.slice(0, -ext.length) : value;
};

const normalizeCamName = (name) => {
  if (name === "reset") return "normal";
  if (name === "shake") return "quake";
  return name;
};

// Общая навигация после полного прохождения финала.
(() => {
  if (!document.querySelector('script[data-gosha-nav]')) {
    const navScript = document.createElement("script");
    navScript.src = "nav.js";
    navScript.dataset.goshaNav = "1";
    document.body.appendChild(navScript);
  }
})();

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

  // ---------------------------------------------------------------
  // STORY MUSIC PLAYER
  // По умолчанию: старый трек плавно затухает, затем новый плавно входит.
  // Спецкоманды позволяют сделать плавный или мгновенный stop и duck volume.
  // ---------------------------------------------------------------
  let musicTransitionId = 0;
  let musicVolumeMultiplier = 1;

  const getMusicVolume = () => {
    const base =
      window.settings && typeof window.settings.volume === "number"
        ? window.settings.volume
        : 0.5;
    return Math.max(0, Math.min(1, base * musicVolumeMultiplier));
  };

  const fadeAudio = (audio, from, to, duration, transitionId, onDone = null) => {
    if (!audio) {
      onDone?.();
      return;
    }

    if (duration <= 0) {
      audio.volume = Math.max(0, Math.min(1, to));
      onDone?.();
      return;
    }

    const startedAt = performance.now();
    audio.volume = Math.max(0, Math.min(1, from));

    const tick = (now) => {
      if (transitionId !== musicTransitionId) return;

      const progress = Math.min((now - startedAt) / duration, 1);
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * progress));

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        onDone?.();
      }
    };

    requestAnimationFrame(tick);
  };

  const stopMusicNow = () => {
    musicTransitionId++;
    const audio = window.currentMusic;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    window.currentMusic = null;
    if (typeof state !== "undefined") state.music = null;
  };

  window.setMusic = function setMusicWithTransitions(request) {
    if (!request) return;

    if (request === "__MUSIC_STOP_IMMEDIATE__") {
      musicVolumeMultiplier = 1;
      stopMusicNow();
      return;
    }

    if (request === "__MUSIC_STOP__") {
      const transitionId = ++musicTransitionId;
      const oldAudio = window.currentMusic;
      musicVolumeMultiplier = 1;

      if (!oldAudio) {
        if (typeof state !== "undefined") state.music = null;
        return;
      }

      fadeAudio(
        oldAudio,
        oldAudio.volume,
        0,
        700,
        transitionId,
        () => {
          oldAudio.pause();
          oldAudio.currentTime = 0;
          if (window.currentMusic === oldAudio) window.currentMusic = null;
          if (typeof state !== "undefined") state.music = null;
        },
      );
      return;
    }

    if (request.startsWith("__MUSIC_VOLUME__:")) {
      const [, rawMultiplier, rawDuration] = request.split(":");
      const multiplier = Number(rawMultiplier);
      const duration = Number(rawDuration) || 300;
      if (!Number.isFinite(multiplier)) return;

      musicVolumeMultiplier = Math.max(0, Math.min(1, multiplier));
      const audio = window.currentMusic;
      if (!audio) return;

      const transitionId = ++musicTransitionId;
      fadeAudio(
        audio,
        audio.volume,
        getMusicVolume(),
        duration,
        transitionId,
      );
      return;
    }

    if (typeof state !== "undefined" && state.music === request && window.currentMusic) {
      return;
    }

    const transitionId = ++musicTransitionId;
    const oldAudio = window.currentMusic;
    musicVolumeMultiplier = 1;

    const startNewTrack = () => {
      if (transitionId !== musicTransitionId) return;

      const audio = new Audio(request);
      audio.loop = true;
      audio.volume = 0;
      window.currentMusic = audio;
      if (typeof state !== "undefined") state.music = request;

      audio
        .play()
        .then(() => {
          fadeAudio(audio, 0, getMusicVolume(), 500, transitionId);
        })
        .catch((error) => console.log("Music play error:", error));
    };

    if (!oldAudio) {
      startNewTrack();
      return;
    }

    fadeAudio(
      oldAudio,
      oldAudio.volume,
      0,
      700,
      transitionId,
      () => {
        oldAudio.pause();
        oldAudio.currentTime = 0;
        if (window.currentMusic === oldAudio) window.currentMusic = null;
        startNewTrack();
      },
    );
  };

  function showEndingVideo() {
    if (window.typeWriterTimeout) {
      clearTimeout(window.typeWriterTimeout);
      window.typeWriterTimeout = null;
    }

    stopMusicNow();

    if (window.bgm) {
      window.bgm.pause();
      window.bgm.currentTime = 0;
      window.bgm = null;
    }

    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.removeAttribute("src");
    }

    const video = document.createElement("video");
    video.src = "assets/video/second.webm";
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", "Финальное видео");
    video.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      display: block;
      object-fit: contain;
      background: #000;
      z-index: 2147483647;
    `;

    video.addEventListener("ended", () => {
      window.location.href = "final.html";
    });

    document.documentElement.style.background = "#000";
    document.documentElement.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.background = "#000";
    document.body.style.overflow = "hidden";
    document.body.replaceChildren(video);
  }

  // story.js загружается после macros.js. На DOMContentLoaded расставляем
  // реальные музыкальные команды по тем местам, которые отмечены MUSIC-комментариями.
  window.addEventListener("DOMContentLoaded", () => {
    const findByBg = (sceneName, bgName) => {
      const scene = window.story?.[sceneName];
      if (!Array.isArray(scene)) return null;
      return scene.find(
        (step) =>
          step &&
          typeof step.bg === "string" &&
          step.bg.endsWith(`/` + bgName + ".webp"),
      );
    };

    const startScene = window.story?.start;
    if (Array.isArray(startScene) && startScene[0]) {
      startScene[0].music = "assets/music/0829.ogg";
    }

    const dreamStart = findByBg("prologue_after_qte", "dream_harem");
    if (dreamStart) dreamStart.music = "assets/music/Invite for a punishment.ogg";

    const nightmare = findByBg("prologue_after_qte", "dream_nightmare_face");
    if (nightmare) nightmare.music = "__MUSIC_STOP_IMMEDIATE__";

    const roomScene = window.story?.prologue_room;
    if (Array.isArray(roomScene) && roomScene[0]) {
      roomScene[0].music = "assets/music/Field of Hopes and Dreams.ogg";
    }

    const whisper = findByBg("prologue_outside", "classroom_whisper");
    if (whisper) whisper.music = "__MUSIC_VOLUME__:0.25:250";

    const yuno = findByBg("prologue_outside", "classroom_fall2");
    if (yuno) yuno.music = "assets/music/Юно Гасай Кровь.ogg";

    const groza = findByBg("prologue_outside", "street_groza");
    if (groza) groza.music = "assets/music/Быть грозой не легко.ogg";

    const eye = findByBg("prologue_outside", "void_eye");
    if (eye) eye.music = "__MUSIC_STOP__";

    Object.values(window.story || {}).forEach((scene) => {
      if (!Array.isArray(scene)) return;

      scene.forEach((step, index) => {
        if (step && step.video === "vision_vladber.mp4") {
          scene[index] = {
            type: "custom",
            text: " ",
            hideUI: true,
            action: showEndingVideo,
          };
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
    if (!track) return {};
    const normalized = stripExt(stripExt(track, ".mp3"), ".ogg");
    return { music: `assets/music/${normalized}.ogg` };
  },

  musicStop: (immediate = false) => ({
    music: immediate ? "__MUSIC_STOP_IMMEDIATE__" : "__MUSIC_STOP__",
  }),

  musicVolume: (multiplier, duration = 300) => ({
    music: `__MUSIC_VOLUME__:${multiplier}:${duration}`,
  }),

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
