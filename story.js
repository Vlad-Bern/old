// Инициализация глобального объекта истории
window.story = {};

console.log("Story core initialized.");

// =================================================================
// Небольшой UI-polish слой.
// Fullscreen, блокировка ПКМ и плавные фоны.
// =================================================================
(() => {
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }

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

// =================================================================
// STORY
//
// В сюжете намеренно НЕТ подключённых музыкальных и SFX-файлов.
// Ищи комментарии "MUSIC:" и "SFX:" — это места, куда их стоит поставить.
// Внутренние prologue_* ID оставлены ради совместимости переходов и сейвов.
// =================================================================
Object.assign(window.story, {
  start: [
    // MUSIC: старт — тихий мрачный эмбиент / трагичная тема, очень негромко.
    // SFX: далёкий гул разрушенного мира, ветер, редкие низкие удары вдали.
    {
      ..._.bg("black"),
      ..._.lockUI(),
      ..._.thought("..."),
    },
    _.horror("unknown", "ГОША...."),
    _.horror("unknown", "Гоша... Эй, ты слышишь?"),

    _.bg("begining_yuno"),
    _.say("unknown", "У нас всё... Пошло не по плану, верно?"),
    _.say("hero", "Держись, Юно, я верю, что ещё есть шанс..."),
    _.say("yuno", "Гоша, возьми...."),
    _.say("hero", "Что это?"),
    // SFX: короткий мистический звон / пульсация, когда Гоша получает око.
    _.give("vladber_eye"),
    _.say("yuno", "Это всевидящее око Владбера."),
    _.say("hero", "Юно, ты же не хочешь сказать, что..."),

    // MUSIC: здесь можно слегка усилить напряжение, но не менять тему целиком.
    // SFX: тяжёлый далёкий шаг/удар + низкий cinematic boom перед появлением врага.
    _.bg("begining_yunoAngry"),
    _.say("unknown", "О, вы всё ещё живы, толстяки?"),
    _.thought("*Чья-то тень появилась... Это он. Он нашёл нас.*"),
    _.say("unknown", "Гоша, больше нет времени!"),
    // SFX: резкое движение ткани / толчок.
    _.thought("*Она впихивает око мне в руки и отталкивает.*"),

    // SFX: сильный порыв воздуха / свист падения.
    _.cam("quake"),
    _.bg("begining_GoshaFalling"),
    _.thought("*Я падаю со здания.*"),
    _.say("hero", "ЮНО!!!!"),

    // SFX: тяжёлое приземление, короткий удар по низам.
    _.cam("flash"),
    _.bg("begining_GoshaGlases"),
    _.say("hero", "Я приземлился на ноги."),
    _.thought("*Забудь об эмоциях...*"),

    // SFX: гул/треск портала; можно добавить очень тихую пульсацию ока.
    _.bg("begining_portal"),
    _.thought("*Вижу портал, бегу к нему.*"),
    _.thought("*Око Владбера бьётся в моей руке, словно живое сердце.*"),

    // MUSIC: смена на короткую экшен-тему для QTE.
    // SFX: каменный скрежет / появление трёх стражей.
    _.bg("begining_portalGolems"),
    _.thought("*Но три стражника перегородили путь...*"),
    _.say("hero", "Пошли вон, ничтожества.", "prologue_qte"),
  ],

  prologue_qte: [
    // SFX: на успешные A/S/W — быстрые удары/взмахи; сам QTE уже умеет реагировать на клавиши.
    _.qteSeq(
      [
        { k: "A", bg: "golem_fight_1" },
        { k: "S", bg: "golem_fight_2" },
        { k: "W", bg: "golem_fight_3" },
      ],
      3000,
      "prologue_after_qte",
      "prologue_qte_fail",
    ),
  ],

  prologue_qte_fail: [
    // SFX: глухой удар / провал QTE. Музыку экшена можно оставить без смены.
    {
      ..._.bg("black"),
      ..._.thought("*Спатанство, я всрал...*"),
    },
    _.bg("begining_portalGolems"),
    _.thought("*Соберись, Гоша Дэр, это проще лёгкого.*", "prologue_qte"),
  ],

  prologue_after_qte: [
    // SFX: финальный сильный удар + развал/падение каменных противников.
    {
      ..._.bg("begining_GoshaHimurama"),
      ..._.say("hero", "Химукама кагура спасла."),
    },
    _.thought("*Вот я и у портала...*"),
    _.thought(
      "*Я должен уйти немедленно, но решил в последний раз обернуться...*",
    ),

    // MUSIC: экшен резко уходит; начинается печальная/пустая тема разрушенного мира.
    // SFX: далёкий огонь, ветер, редкий грохот руин.
    _.bg("ruins_destroyed"),
    _.thought("*Юно...*"),
    _.thought("*Миру конец... И этот псих идёт ко мне навстречу.*"),
    _.say(
      "villain",
      "Ты со своей яндеркой упорно верите в возможность изменить судьбу?",
    ),
    _.say(
      "villain",
      "Гоша-Дэр, ты последний оставшийся в живых казах, и ты трусливо сбегаешь?!?!",
    ),
    _.say("hero", "Я отомщу за Юно."),
    // SFX: мощный всасывающий whoosh портала.
    _.thought("*Я прыгнул в портал с полной уверенностью в своей мести.*"),

    // MUSIC: печальную тему приглушить/остановить; перейти в почти безмузыкальный dark ambient.
    // SFX: далёкий шёпот вокруг головы, реверс, глубокий гул пустоты.
    _.bg("black"),
    _.thought(
      "*Затем пустота... Она длилась минут десять. Я слышал лишь странный шёпот.*",
    ),
    _.thought("*Юно... Как я мог тебя оставить, Юно?!*"),
    _.thought("*Юно... Кто такая Юно?*"),
    _.thought("*Где я?*"),
    _.thought("*Сознание уплывает...*"),
    _.thought("*Веки становятся тяжёлыми...*"),
    // MUSIC: здесь fade out в полную тишину перед сном.
    _.thought("..."),

    // MUSIC: лёгкая намеренно приторная/романтичная тема сна.
    _.bg("dream_harem"),
    _.say("girl1", "Гоша Дэр, ты такой сильный."),
    _.say("girl2", "Гошенька, позволь мне нашептать в твоё ухо."),
    _.say("girl3", "Эй, я тоже хочу нашептать в ухо Гоше!"),
    _.say("hero", "Эй, эй, тяночки мои, не спешите."),
    _.say("hero", "Мы можем шептать друг другу на ухо сколько влезет."),

    _.bg("dream_girl"),
    _.thought("*Одна из девушек подходит ближе.*"),
    _.say("dream_girl", "Ну что, Гоша, приступим?"),
    // SFX: очень близкий шёпот/дыхание возле уха.
    _.thought("*Она наклоняется к моему уху.*"),

    // MUSIC: романтическую музыку ОБОРВАТЬ мгновенно.
    // SFX: короткий horror stinger / glitch при смене лица.
    _.bg("dream_nightmare_face"),
    _.horror("aida", "Твой стёпа мелкий"),
    _.thought("*Я осознаю, что внезапно эта девушка превратилась в Аиду.*"),
    _.cam("quake"),
    // SFX: громкий крик/скример поверх реплики, но короткий, чтобы не забил голос.
    _.say("hero", "ААААААААААААААА!!!!!!!!!!!!!!"),

    // MUSIC: спокойное утро, лучше совсем лёгкая бытовая тема либо только ambience.
    // SFX: птицы за окном / комнатный утренний фон.
    _.bg("gosharoom"),
    _.anim("hero", "jump"),
    _.say("hero", "ААААААаааа…."),
    _.say(
      "hero",
      "Обычно мои сны жестокие, но этот... Он намного жёстче обычного.",
    ),
    _.say("hero", "Видимо, моё психическое состояние становится всё хуже...."),
    _.thought(
      "*Сегодня 15 февраля, мой первый день в колледже после долгого отдыха от этого позора.*",
    ),
    _.thought("*Почти семь утра, пора вставать.*"),
    { next: "prologue_room" },
  ],

  prologue_room: [
    // MUSIC: продолжить спокойную утреннюю тему без смены.
    // SFX: очень тихий комнатный ambience; клики предметов можно оставить UI-звукам движка.
    {
      ..._.bg("gosharoom"),
      ..._.explore([
        {
          x: 83,
          y: 5,
          w: 15,
          h: 12,
          item: "vr_headset",
          name: "Oculus Quest 2",
          desc: "Мой всемогущий, до сих пор актуальный вр.",
          canTake: false,
          failMsg:
            "Мне его некуда девать, да я всё равно почти не играю в него.",
        },
        {
          x: 85,
          y: 37,
          w: 18,
          h: 12,
          item: "hat",
          name: "Соломенная шляпа",
          desc: "Надеюсь, мама до сих пор не в курсе, как я использовал эту шляпу.",
          canTake: false,
          failMsg: "Не время курить.",
        },
        {
          x: 83,
          y: 58,
          w: 15,
          h: 25,
          item: "figures",
          name: "Какие-то фигурки",
          desc: "Мои вайфу охраняют полку.",
          canTake: false,
          failMsg: "Иди в колледж, анимешник.",
        },
        {
          x: 45,
          y: 45,
          w: 25,
          h: 20,
          item: "laptop",
          name: "Пак",
          desc: "Мой могучий пак макдак... Рад, что он всё ещё не сгорел.",
          canTake: true,
        },
        {
          x: 18,
          y: 5,
          w: 25,
          h: 65,
          item: "wardrobe",
          name: "Шкаф",
          desc: "Там мои трусики казахские.",
          canTake: false,
          failMsg: "Я пойду в колледж без трусов.",
        },
        {
          x: 90,
          y: 85,
          w: 10,
          h: 15,
          name: "Выйти из комнаты",
          desc: "Пора выдвигаться.",
          nextScene: "prologue_outside",
        },
      ]),
    },
  ],

  prologue_outside: [
    // MUSIC: утренняя тема ещё немного играет, затем можно плавно убрать перед автобусом.
    {
      ..._.showUI(),
      ..._.bg("hallway"),
      ..._.say("hero", "Теперь нужно покушать."),
    },
    _.thought("*....*"),
    _.thought("*Посидеть на талкане.*"),
    _.thought("*И теперь на казахскую улицу.*"),

    // MUSIC: нейтральная городская/повседневная тема.
    // SFX: автобус — двигатель, дорога, приглушённый гул пассажиров.
    _.bg("bus_interior"),
    _.thought("Еду в вонючем наполненном автобусе..."),
    _.thought("Как вдруг!"),
    // SFX: короткий едва заметный eerie stinger при появлении розовых волос.
    _.bg("bus_interiorYuno"),
    _.cam("zoom"),
    _.thought("Чей-то взгляд промелькнул в толпе..."),
    _.thought("Розовые волосы, школьная форма..."),
    _.cam("normal"),
    _.thought("Наверное, показалось."),

    // MUSIC: спокойная фоновая тема колледжа, максимально незаметная.
    // SFX: тихий класс — далёкие голоса, шорох бумаги, ручки.
    _.bg("classroom_day"),
    _.thought("Вот я в классе..."),
    _.thought("Сижу... Учусь..."),
    // MUSIC: fade out — небольшой таймскип в тишине.
    _.bg("black"),
    _.thought("..."),

    // MUSIC: одинокая вечерняя/слегка меланхоличная тема.
    // SFX: почти пустой класс, лёгкий комнатный тон.
    _.bg("classroom_sunset"),
    _.say("hero", "Я уснул?"),
    _.thought("♪ Я чувствую звон в голове... и моя жизнь на грани... ♪"),
    _.thought("♪ Будто победил этот злобный мир... ♪"),
    _.anim("hero", "shake"),
    _.thought("*Стоп, нахера я пою?*"),
    _.thought("*Походу все ушли домой, мне тоже пора...*"),
    _.say(
      "hero",
      "Вот бы какая-нибудь красивая сталкерша за мной наблюдала...",
    ),

    // MUSIC: здесь лучше резко приглушить до 20–30%, чтобы шёпот пробил сцену.
    // SFX: БЛИЗКИЙ женский шёпот справа/слева от уха: «А я уже наблюдаю...».
    _.bg("classroom_whisper"),
    _.horror("unknown", "А я уже наблюдаю..."),

    // SFX: резкий скрип/грохот парты + удар тела о пол.
    _.bg("classroom_fall"),
    _.cam("quake"),
    _.say("hero", "ЁБ ТВОЮ!"),
    _.thought("Я упал прямо на парту и повалился вместе с ней на пол."),

    // MUSIC: новая тема — игривая, странная, чуть yandere; не слишком хоррорная.
    _.bg("classroom_fall2"),
    _.say("unknown", "Хихи, Гошенька, ты боишься шёпота на ухо?"),
    _.say("hero", "Шёпот... Ты меня напугала..."),
    _.bg("classroom_goshaFace"),
    _.thought("Она похожа на ту девушку из автобуса..."),
    _.say(
      "unknown",
      "Прости... Ты сказал, что хочешь сталкершу, вот я и решила...",
    ),
    _.say("hero", "Ты... наблюдала за мной?"),
    _.say("unknown", "Да, Гоша, знаешь, моё сердечко..."),
    _.thought("Девушка... За мной наблюдает. Она влюблена?"),
    _.thought("Это мой шанс! Самое время начать действовать!"),

    // MUSIC: мгновенно сменить на быструю комедийную погоню.
    // SFX: резкий whoosh/старт бега.
    _.cam("flash"),
    _.bg("classroom_goshaRun"),
    _.say("hero", "АААААААААА!!!!!!! СТАЛКЕРША, БЕЖАААТЬ!!!"),
    _.say("unknown", "Не убегай!"),

    // SFX: быстрые шаги по улице, дыхание. Музыка погони продолжается.
    _.bg("street_gosha"),
    _.thought("Я выбежал на улицу и бегу так далеко, как могу."),
    _.thought("Я, великий казах, в очередной раз бегу от своих проблем!!!"),
    _.say("hero", "Она отстала?"),
    _.bg("street_goshaLookBack"),
    _.thought("Я попытался обернуться, чтобы посмотреть, нет ли её сзади."),

    // MUSIC: на столкновении резко оборвать комедийную погоню или оставить один басовый удар.
    // SFX: мощный тупой удар столкновения.
    _.cam("quake"),
    _.bg("street_groza"),
    _.thought("Но тут же врезался в чьё-то маленькое тельце."),
    _.thought("Этот толстяк меня схватил и прижал к сетке."),
    // SFX: металлический дребезг/удар сетки забора.
    _.bg("street_grozaHand"),
    _.say("groza", "Попался, дылда."),
    _.say("hero", "Агхгха, пустииии..."),

    // MUSIC: короткая напряжённо-комедийная тема для разговора троицы.
    _.bg("street_light"),
    _.say("light", "Смотри-ка сюда."),
    // SFX: шорох помятой фотографии.
    _.thought("Он показывает мне фото какого-то психопада."),
    _.say("groza", "Не узнаёшь психа?"),
    _.say("hero", "Понятия не имею!"),
    _.bg("street_whitey"),
    _.say("whitey", "Сейчас мы быстро тебя вернём в норму."),
    _.say("hero", "Э-ЭЭ?!?! Ч-что вы делаете?"),
    _.say("groza", "Эй, расслабься. Ща будет нормас."),

    // MUSIC: полностью оборвать. На чёрном экране пару секунд оставить только тишину.
    // SFX: короткое приглушённое воздействие/удар, затем высокий tinnitus-писк и тишина.
    _.bg("black"),
    _.thought("Опять темнота... Что за конченый день?!"),

    // MUSIC: очень тихий мистический drone, который постепенно нарастает.
    // SFX: низкая пульсация/сердцебиение ока + едва слышный reversed whisper.
    _.bg("void_eye"),
    _.thought("Какое-то око явилось передо мной."),
    _.thought("Оно пытается мне что-то прошептать?"),
    // SFX: короткий магический всплеск/высокий удар на flash.
    _.cam("flash"),
    _.thought("Око засияло, и тут я увидел картину..."),

    // MUSIC: ПОЛНЫЙ STOP перед видео. Дальше работает только звук самого ролика.
    {
      video: "vision_vladber.mp4",
      nextScene: "prologue_after_vision",
    },
  ],

  // После видео музыку пока не возвращать — пусть признание/видение повисит в тишине.
  prologue_after_vision: [_.thought("Что это было?..")],
});
