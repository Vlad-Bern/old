// Инициализация глобального объекта истории
window.story = {};

console.log("Story core initialized.");

// =================================================================
// Небольшой UI-polish слой.
// Держим отдельно от сюжетной логики движка: fullscreen, ПКМ и плавные фоны.
// =================================================================
(() => {
  // --- 1. Блокируем браузерное контекстное меню внутри игры ---
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }

  // --- 2. Кнопка полноэкранного режима в левом верхнем углу главного меню ---
  const mainMenu = document.getElementById("main-menu");
  if (mainMenu && !document.getElementById("fullscreen-btn")) {
    const fullscreenBtn = document.createElement("button");
    fullscreenBtn.id = "fullscreen-btn";
    fullscreenBtn.type = "button";
    fullscreenBtn.className = "fullscreen-menu-btn";
    fullscreenBtn.title = "Полноэкранный режим";
    fullscreenBtn.setAttribute("aria-label", "Переключить полноэкранный режим");

    const updateFullscreenButton = () => {
      fullscreenBtn.textContent = document.fullscreenElement
        ? "⛶ ВЫЙТИ ИЗ FULLSCREEN"
        : "⛶ FULLSCREEN";
    };

    fullscreenBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (error) {
        console.warn("Fullscreen недоступен:", error);
      }
    });

    document.addEventListener("fullscreenchange", updateFullscreenButton);
    updateFullscreenButton();
    mainMenu.appendChild(fullscreenBtn);
  }

  // Стили добавляем здесь, чтобы не раздувать и без того большой style.css.
  const polishStyle = document.createElement("style");
  polishStyle.textContent = `
    .fullscreen-menu-btn {
      position: absolute;
      top: 22px;
      left: 24px;
      z-index: 10020;
      padding: 10px 14px;
      border: 1px solid rgba(255,255,255,.28);
      border-radius: 6px;
      background: rgba(0,0,0,.55);
      color: rgba(255,255,255,.78);
      font: 700 12px/1 "Courier New", monospace;
      letter-spacing: 1.5px;
      cursor: pointer;
      backdrop-filter: blur(5px);
      transition: background .2s ease, color .2s ease, border-color .2s ease, transform .2s ease;
    }

    .fullscreen-menu-btn:hover {
      color: #fff;
      border-color: #d4af37;
      background: rgba(20,20,20,.88);
      transform: translateY(-1px);
    }

    #background {
      opacity: 1;
      transition: opacity 280ms ease, transform 50ms linear;
      will-change: opacity;
    }

    #background.bg-switching {
      opacity: 0;
    }

    #bg-video {
      opacity: 1;
      transition: opacity 280ms ease;
    }
  `;
  document.head.appendChild(polishStyle);

  // --- 3. Более мягкая смена сюжетных фонов ---
  // setBackground объявлен движком глобально. Здесь заменяем только его реализацию,
  // сохраняя тот же интерфейс для всех существующих сцен.
  let backgroundSwapId = 0;

  window.setBackground = function setBackgroundSmooth(url) {
    if (typeof url !== "string" || !url) {
      console.warn("setBackground: invalid url", url);
      return;
    }

    if (url === state.bg) return;

    const bgDiv = document.getElementById("background");
    const bgVideo = document.getElementById("bg-video");
    if (!bgDiv || !bgVideo) return;

    const swapId = ++backgroundSwapId;
    const isVideo = /\.(mp4|webm)$/i.test(url);

    state.bg = url;

    if (isVideo) {
      bgDiv.classList.add("bg-switching");

      setTimeout(() => {
        if (swapId !== backgroundSwapId) return;

        bgVideo.src = url;
        bgVideo.style.display = "block";
        bgVideo.style.opacity = "0";
        bgDiv.style.display = "none";

        bgVideo.play().catch((error) =>
          console.log("Автоплей видео-фона заблокирован:", error),
        );

        requestAnimationFrame(() => {
          bgVideo.style.opacity = "1";
        });
      }, 220);
      return;
    }

    // Предзагрузка предотвращает чёрную вспышку на медленной картинке.
    const image = new Image();
    image.onload = () => {
      if (swapId !== backgroundSwapId) return;

      bgDiv.classList.add("bg-switching");

      setTimeout(() => {
        if (swapId !== backgroundSwapId) return;

        bgVideo.pause();
        bgVideo.removeAttribute("src");
        bgVideo.load();
        bgVideo.style.display = "none";
        bgVideo.style.opacity = "1";

        bgDiv.style.backgroundImage = `url('${url}')`;
        bgDiv.style.display = "block";

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bgDiv.classList.remove("bg-switching");
          });
        });
      }, 220);
    };

    image.onerror = () => {
      if (swapId !== backgroundSwapId) return;
      console.warn("Не удалось загрузить фон:", url);
      bgDiv.style.backgroundImage = `url('${url}')`;
      bgDiv.style.display = "block";
      bgDiv.classList.remove("bg-switching");
    };
    image.src = url;
  };
})();
