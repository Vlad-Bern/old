/* battle.js — АРХИТЕКТУРНО ИСПРАВЛЕННАЯ ВЕРСИЯ */

let battle = {
  active: false,
  enemies: [],
  turn: "player",
  defending: false,
  stepData: null,
  fleeCooldown: 0,
  targetMode: false,
  isUlti: false,
  turnTimers: [],
};

// --- ЗАПУСК БИТВЫ ---
function startBattle(step) {
  let enemiesList = [];
  if (step.enemies) {
    enemiesList = step.enemies.map((id) => createEnemyInstance(id));
  } else if (step.enemyId) {
    enemiesList = [createEnemyInstance(step.enemyId)];
  }
  enemiesList = enemiesList.filter(Boolean);

  battle.active = true;
  battle.enemies = enemiesList;
  battle.turn = "player";
  battle.defending = false;
  battle.stepData = step;
  battle.fleeCooldown = 0;
  battle.targetMode = false;
  battle.isUlti = false;

  els.uiLayer.style.display = "none";
  els.chars.style.display = "none";
  if (els.mapLayer) els.mapLayer.style.display = "none";
  if (els.mapBtn) els.mapBtn.style.display = "none";
  els.battleLayer.style.display = "flex";

  renderBattleEnemies();
  updateBattleUI();
  logBattle("Враги наступают! Приготовьтесь к бою.");
}

// Создание врага
function createEnemyInstance(data) {
  let id, targetLvl;

  // Если передали просто строку "skeleton"
  if (typeof data === "string") {
    id = data;
    targetLvl = null; // Уровень по умолчанию (из data.js)
  } else {
    // Если передали объект { id: "skeleton", lvl: 5 }
    id = data.id;
    targetLvl = data.lvl;
  }

  const proto = ENEMIES[id];
  if (!proto) return null;

  // Базовый уровень врага
  let baseLvl = proto.level || 1;
  let finalLvl = targetLvl || baseLvl; // Если уровень не указан, берем базовый

  // Рассчитываем множитель силы
  // Если уровень выше базового, враг становится сильнее (+20% за каждый уровень)
  let multiplier = 1;
  if (finalLvl > baseLvl) {
    multiplier = 1 + (finalLvl - baseLvl) * 0.2;
  }

  // Собираем объект
  return {
    id: id,
    name: proto.name,
    level: finalLvl,

    // Масштабируем HP
    maxHp: data.hp || Math.floor(proto.hp * multiplier),
    hp: data.hp || Math.floor(proto.hp * multiplier),

    // Масштабируем Урон
    damage: data.damage || [
      Math.floor(proto.damage[0] * multiplier),
      Math.floor(proto.damage[1] * multiplier),
    ],

    img: proto.img,
    alive: true,
  };
}

function renderBattleEnemies() {
  els.enemiesContainer.innerHTML = "";

  battle.enemies.forEach((enemy, index) => {
    if (!enemy) return;

    const card = document.createElement("div");
    card.className = "enemy-card";
    card.style.position = "relative"; // Важно для позиционирования

    if (!enemy.alive) card.classList.add("dead");

    const hpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);

    card.innerHTML = `
      <!-- Обертка для верхней части (ХП + Уровень) -->
      <div style="position: relative; margin-bottom: 5px;">
        
        <!-- БЕЙДЖИК УРОВНЯ (Поверх полоски) -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #000;
          border: 1px solid #d4af37;
          color: #d4af37;
          font-size: 10px;
          font-weight: bold;
          padding: 1px 6px;
          border-radius: 12px; /* Форма пилюли */
          z-index: 10;
          line-height: 1;
          box-shadow: 0 0 4px #000; /* Тень, чтобы отделить от полоски */
        ">
          LVL ${enemy.level}
        </div>

        <!-- Полоска HP -->
        <div class="enemy-hp-mini" style="position: relative; z-index: 1;">
          <div class="enemy-hp-fill" style="width: ${hpPct}%"></div>
        </div>
      </div>

      <!-- Картинка -->
      <img src="${enemy.img}" class="enemy-sprite" alt="${enemy.name}" onerror="this.style.display='none'">
      
      <!-- Имя -->
      <div style="font-size:14px; margin-top:5px; font-weight:bold">${enemy.name}</div>
    `;

    // Клик для атаки
    card.addEventListener("click", () => {
      if (battle.turn === "player" && battle.targetMode && enemy.alive) {
        playerAttackTarget(index);
      }
    });

    els.enemiesContainer.appendChild(card);
  });
}

// ===========================================
// ЛОГИКА ЗАВЕРШЕНИЯ ХОДА ИГРОКА (НОВОЕ!)
// ===========================================
// Эта функция теперь вызывается ВСЕГДА, когда игрок что-то сделал (Атака, Защита, Зелье)
// Именно здесь мы списываем баффы.
function finishPlayerTurn() {
  // 1. Обработка баффов
  if (state.hero.buffs && state.hero.buffs.length > 0) {
    state.hero.buffs = state.hero.buffs.filter((b) => {
      b.turns--; // Уменьшаем счетчик
      if (b.turns <= 0) {
        logBattle(`Эффект "${b.name}" закончился.`);
        return false; // Удаляем
      }
      return true;
    });
  }

  // 2. Сброс кулдаунов побега
  if (battle.fleeCooldown > 0) battle.fleeCooldown--;

  // 3. Обновляем интерфейс
  updateBattleUI();

  // 4. Передача хода врагу с задержкой
  setTimeout(enemyTurn, 1000);
}

// ===========================================
// ЛОГИКА ДЕЙСТВИЙ
// ===========================================

function playerTurn(action) {
  if (battle.turn !== "player") return;

  if (action === "attack") {
    battle.isUlti = false;
    logBattle("Выберите врага для атаки!");
    battle.targetMode = true;
    // Здесь мы НЕ заканчиваем ход, так как игрок еще не выбрал цель
  } else if (action === "defend") {
    battle.defending = true;
    battle.turn = "enemy";

    const staminaRegen = 30 + state.hero.level * 2;
    state.hero.stamina = Math.min(
      state.hero.stamina + staminaRegen,
      state.hero.maxStamina,
    );
    const healAmt = Math.floor(state.hero.maxHp * 0.05);
    state.hero.hp = Math.min(state.hero.hp + healAmt, state.hero.maxHp);

    logBattle(`Стойка! (+${healAmt} HP, +${staminaRegen} эн.)`);
    if (window.playSfx) playSfx("assets/sfx/shield_up.mp3");

    // ЗАВЕРШАЕМ ХОД
    finishPlayerTurn();
  } else if (action === "flee") {
    battle.turn = "enemy";
    const enemyLvl = battle.enemies.find((e) => e.alive)?.level || 1;
    let fleeChance = 50 + (state.hero.level - enemyLvl) * 10;

    if (rand(1, 100) <= fleeChance) {
      logBattle("Вы успешно сбежали!");
      if (window.playSfx) playSfx("assets/sfx/run.mp3");
      setTimeout(
        () => endBattle(battle.stepData.nextFlee || battle.stepData.nextLose),
        1000,
      );
    } else {
      logBattle("Не удалось сбежать!");
      state.hero.stamina = Math.max(0, state.hero.stamina - 20);
      battle.fleeCooldown = 3;
      battle.defending = false;

      // ЗАВЕРШАЕМ ХОД
      finishPlayerTurn();
    }
  }
}

function playerAttackTarget(enemyIndex) {
  battle.targetMode = false;
  battle.turn = "enemy";
  const enemy = battle.enemies[enemyIndex];

  let staminaCost = 15;
  if (battle.isUlti) staminaCost = 100;

  if (state.hero.stamina < staminaCost) {
    logBattle("Недостаточно энергии!");
    battle.turn = "player";
    return;
  }

  state.hero.stamina -= staminaCost;
  if (window.playSfx)
    playSfx(
      battle.isUlti ? "assets/sfx/ulti_sound.mp3" : "assets/sfx/swing.mp3",
    );

  let hitChance = battle.isUlti ? 100 : 90;
  if (rand(1, 100) > hitChance) {
    logBattle("Промах!");
    if (window.playSfx) playSfx("assets/sfx/miss.mp3");
    battle.defending = false;
    battle.isUlti = false;

    // Промах - тоже конец хода
    finishPlayerTurn();
    return;
  }

  let finalDmg = getPlayerDamage();
  if (battle.isUlti) {
    finalDmg = Math.floor(finalDmg * 3);
    logBattle(`УЛЬТА!!!`);
    els.container.classList.add("shake");
    setTimeout(() => els.container.classList.remove("shake"), 500);
  }

  enemy.hp -= finalDmg;
  if (window.playSfx) playSfx("assets/sfx/hit.mp3");

  const card = els.enemiesContainer.children[enemyIndex];
  if (card) {
    showDamage(card, finalDmg, battle.isUlti);
    const img = card.querySelector("img");
    if (img) img.classList.add("shake");
    setTimeout(() => img?.classList.remove("shake"), 300);
  }

  let msg = `-${finalDmg} урона`;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.alive = false;
    msg = `${enemy.name} повержен!`;
    if (window.playSfx) playSfx("assets/sfx/enemy_die.mp3");
    gainXp(25 * enemy.level);
  } else {
    gainXp(5);
  }

  logBattle(msg);
  battle.defending = false;
  battle.isUlti = false;

  renderBattleEnemies();

  // Проверка победы
  const isWin = checkWinCondition();
  if (!isWin) {
    // УСПЕШНАЯ АТАКА - КОНЕЦ ХОДА
    finishPlayerTurn();
  }
}

// Использование предметов
function useItem(itemId) {
  const item = ITEMS[itemId];
  if (!item) return;

  if (
    !state.hero.inventory ||
    !state.hero.inventory[itemId] ||
    state.hero.inventory[itemId] <= 0
  ) {
    logBattle("Нет предмета!");
    return;
  }

  state.hero.inventory[itemId]--;

  if (item.type === "heal") {
    const oldVal = state.hero.hp;
    state.hero.hp = Math.min(state.hero.hp + item.value, state.hero.maxHp);
    logBattle(`${item.name}: +${state.hero.hp - oldVal} HP`);
    if (window.playSfx) playSfx("assets/sfx/potion.mp3");
  } else if (item.type === "stamina") {
    const oldVal = state.hero.stamina;
    state.hero.stamina = Math.min(
      state.hero.stamina + item.value,
      state.hero.maxStamina,
    );
    logBattle(`${item.name}: +${state.hero.stamina - oldVal} EN`);
    if (window.playSfx) playSfx("assets/sfx/potion.mp3");
  } else if (item.type === "buff_str" || item.type === "buff_def") {
    if (!state.hero.buffs) state.hero.buffs = [];
    state.hero.buffs.push({
      type: item.type,
      val: item.value,
      turns: item.duration || 3, // Защита от NaN: по умолчанию 3 хода
      name: item.name,
    });
    logBattle(`${item.name}: активировано!`);
    if (window.playSfx) playSfx("assets/sfx/buff.mp3");
  }

  updateBattleUI();

  const invModal = document.getElementById("inventory-modal");
  if (invModal) invModal.style.display = "none";

  if (battle.active) {
    battle.targetMode = false;
    battle.isUlti = false;
    battle.defending = false;
    battle.turn = "enemy";

    // Использование предмета - ЭТО ТОЖЕ КОНЕЦ ХОДА
    finishPlayerTurn();
  }
}

window.useItem = useItem;

// --- ХОД ВРАГА ---
function enemyTurn() {
  if (!battle.active) return;
  clearTurnTimers();

  const aliveEnemies = battle.enemies.filter((e) => e.alive);
  if (aliveEnemies.length === 0) {
    checkWinCondition();
    return;
  }

  let delay = 0;

  aliveEnemies.forEach((enemy, i) => {
    const timerId = setTimeout(() => {
      if (!battle.active || state.hero.hp <= 0) return;

      let dmg = rand(enemy.damage[0], enemy.damage[1]);

      if (battle.defending) dmg = Math.floor(dmg / 2);

      if (state.hero.buffs) {
        const defBuff = state.hero.buffs.find((b) => b.type === "buff_def");
        if (defBuff) {
          dmg -= defBuff.val;
          if (dmg < 0) dmg = 0;
        }
      }

      state.hero.hp -= dmg;

      els.container.classList.add("damage-flash");
      setTimeout(() => els.container.classList.remove("damage-flash"), 300);

      showDamage(els.heroHpFill, dmg, false);
      if (window.playSfx) playSfx("assets/sfx/hit.mp3");

      updateBattleUI();

      if (state.hero.hp <= 0) {
        checkLoseCondition();
        return;
      }

      if (i === aliveEnemies.length - 1 && state.hero.hp > 0) {
        // Возврат управления игроку
        state.hero.stamina = Math.min(
          state.hero.stamina + 10,
          state.hero.maxStamina,
        );
        battle.turn = "player";
        battle.targetMode = false;
        logBattle("Ваш ход!");
        updateBattleUI();
      }
    }, delay);

    battle.turnTimers.push(timerId);
    delay += 1200;
  });
}

// --- UI ОБНОВЛЕНИЕ ---
function updateBattleUI() {
  const heroPct = (state.hero.hp / state.hero.maxHp) * 100;
  els.heroHpFill.style.width = Math.max(0, heroPct) + "%";
  els.heroHpText.innerText = `${state.hero.hp}/${state.hero.maxHp} | Lvl ${state.hero.level}`;

  const stamPct = (state.hero.stamina / state.hero.maxStamina) * 100;
  if (els.heroStaminaFill) {
    els.heroStaminaFill.style.width = Math.max(0, stamPct) + "%";
  }

  const isPlayerTurn = battle.turn === "player";

  if (els.btnAttack)
    els.btnAttack.disabled = !isPlayerTurn || state.hero.stamina < 15;
  if (els.btnDefend) els.btnDefend.disabled = !isPlayerTurn;

  if (els.btnUlti) {
    els.btnUlti.style.display = "block";
    const canUlt = state.hero.stamina >= 100;
    els.btnUlti.disabled = !isPlayerTurn || !canUlt;
    els.btnUlti.innerText = "🔥 УЛЬТА";

    if (canUlt) {
      els.btnUlti.style.borderColor = "#ff0000";
      els.btnUlti.style.color = "#ff4444";
    } else {
      els.btnUlti.style.borderColor = "#444";
      els.btnUlti.style.color = "#888";
    }
  }

  if (els.btnFlee) {
    if (battle.fleeCooldown > 0) {
      els.btnFlee.disabled = true;
      els.btnFlee.innerText = `🏃 Бежать (${battle.fleeCooldown})`;
    } else {
      els.btnFlee.disabled = !isPlayerTurn;
      els.btnFlee.innerText = `🏃 Бежать`;
    }
  }

  if (els.btnSurrender) els.btnSurrender.disabled = !isPlayerTurn;
  if (els.btnPotions) {
    const hasPotions =
      state.hero.inventory &&
      (state.hero.inventory.hp_small > 0 ||
        state.hero.inventory.hp_medium > 0 ||
        state.hero.inventory.hp_large > 0);
    els.btnPotions.disabled = !isPlayerTurn || !hasPotions;
  }

  if (state.hero.hp < state.hero.maxHp * 0.2) {
    if (window.bgm) window.bgm.playbackRate = 0.8;
  } else {
    if (window.bgm) window.bgm.playbackRate = 1.0;
  }

  updateHealthEffects();
}

function updateHeroStats() {
  updateBattleUI();
}
function updateHealthEffects() {
  const isCritical = state.hero.hp / state.hero.maxHp < 0.3;
  els.container.classList.toggle("critical-state", isCritical);
  if (typeof toggleHeartbeat === "function") toggleHeartbeat(isCritical);
}

// --- ВСПОМОГАТЕЛЬНЫЕ ---
function checkWinCondition() {
  const anyAlive = battle.enemies.some((e) => e.alive);
  if (!anyAlive) {
    clearTurnTimers();
    logBattle("ПОБЕДА!");
    if (window.playSfx) playSfx("assets/sfx/win.mp3");
    setTimeout(() => endBattle(battle.stepData.nextWin), 2000);
    return true;
  }
  return false;
}

function checkLoseCondition() {
  if (state.hero.hp <= 0) {
    clearTurnTimers();
    state.hero.hp = 0;
    updateBattleUI();
    logBattle("ВЫ ПОГИБЛИ...");
    setTimeout(() => endBattle(battle.stepData.nextLose), 2500);
  }
}

function endBattle(nextSceneId) {
  battle.active = false;
  els.battleLayer.style.display = "none";
  els.uiLayer.style.display = "flex";
  els.chars.style.display = "flex";
  if (els.mapBtn) els.mapBtn.style.display = "block";
  if (typeof toggleHeartbeat === "function") toggleHeartbeat(false);
  els.container.classList.remove("critical-state");
  loadScene(nextSceneId);
}

function gainXp(amount) {
  state.hero.xp += amount;
  if (state.hero.xp >= state.hero.maxXp) {
    state.hero.xp -= state.hero.maxXp;
    state.hero.level++;
    state.hero.maxXp = Math.floor(state.hero.maxXp * 1.5);
    state.hero.maxHp += 20;
    state.hero.hp = state.hero.maxHp;
    state.hero.maxStamina += 10;
    state.hero.stamina = state.hero.maxStamina;
    state.hero.attack[0] += 2;
    state.hero.attack[1] += 3;

    if (window.playSfx) playSfx("assets/sfx/levelup.mp3");
    showLevelUpPopup();
    logBattle(`Уровень повышен! Теперь ${state.hero.level}`);
  }
  updateBattleUI();
}

function showLevelUpPopup() {
  const container = document.createElement("div");
  container.className = "levelup-popup";
  container.innerHTML = `<div class="lvl-title">LEVEL UP!</div><div class="lvl-num">${state.hero.level}</div>`;
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3500);
}

function showDamage(targetElement, amount, isCrit) {
  if (!targetElement) return;
  const rect = targetElement.getBoundingClientRect();
  const div = document.createElement("div");
  div.className = isCrit ? "damage-popup crit" : "damage-popup";
  div.innerText = "-" + amount;
  document.body.appendChild(div);
  div.style.position = "fixed";
  div.style.left = rect.left + rect.width / 2 + "px";
  div.style.top = rect.top + "px";
  div.style.zIndex = "2000";
  setTimeout(() => div.remove(), 1000);
}

function clearTurnTimers() {
  battle.turnTimers.forEach((id) => clearTimeout(id));
  battle.turnTimers = [];
}

function getPlayerDamage() {
  let minDmg = state.hero.attack[0];
  let maxDmg = state.hero.attack[1];
  if (state.hero.buffs) {
    const strBuff = state.hero.buffs.find((b) => b.type === "buff_str");
    if (strBuff) {
      minDmg += strBuff.val;
      maxDmg += strBuff.val;
    }
  }
  return rand(minDmg, maxDmg);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function logBattle(msg) {
  if (els.battleLog) els.battleLog.innerText = msg;
  console.log("[BattleLog]", msg);
}
