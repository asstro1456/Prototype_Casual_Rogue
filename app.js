const APP_VERSION = "0.4.0";
const APP_VERSION_NAME = "REALTIME DEFENSE";

const COLOR_META = {
  red: { name: "적색", symbol: "◆" },
  blue: { name: "청색", symbol: "●" },
  yellow: { name: "황색", symbol: "▲" },
};

const ENEMY_TYPE_META = {
  normal: { name: "일반형", hp: 1, tag: "NORMAL" },
  armor: { name: "중장형", hp: 2, tag: "ARMOR" },
};

const MAX_SHIELD = 3;
const BOARD_COLUMNS = 5;
const BOARD_ROWS = 5;
const MOVE_INTERVAL = 1500;
const SPAWN_INTERVAL = 2600;
const WARRIOR_INTERVAL = 1800;
const ARCHER_INTERVAL = 2300;
const COLOR_COOLDOWN = 1800;

const ROUND_DATA = [
  {
    name: "빙결 해안 01",
    pattern: "실시간 훈련",
    goal: "위험한 색이 방어선에 닿기 전에 전체 공격하세요.",
    nextIntel: "중장형 등장 · 2회 공격 필요",
    wave: [
      [
        { column: 1, color: "red", type: "normal" },
        { column: 3, color: "blue", type: "normal" },
      ],
      [
        { column: 0, color: "yellow", type: "normal" },
        { column: 2, color: "red", type: "normal" },
        { column: 4, color: "blue", type: "normal" },
      ],
      [
        { column: 1, color: "blue", type: "armor" },
        { column: 2, color: "yellow", type: "normal" },
        { column: 3, color: "red", type: "normal" },
      ],
      [
        { column: 0, color: "red", type: "normal" },
        { column: 2, color: "blue", type: "normal" },
        { column: 4, color: "yellow", type: "normal" },
      ],
    ],
  },
  {
    name: "빙결 해안 02",
    pattern: "색상 혼합",
    goal: "대상 수보다 방어선에 가까운 색을 먼저 보세요.",
    nextIntel: "중장형 비중 증가",
    wave: [
      [
        { column: 0, color: "red", type: "normal" },
        { column: 1, color: "red", type: "normal" },
        { column: 3, color: "blue", type: "armor" },
      ],
      [
        { column: 1, color: "yellow", type: "normal" },
        { column: 2, color: "blue", type: "normal" },
        { column: 4, color: "yellow", type: "normal" },
      ],
      [
        { column: 0, color: "blue", type: "armor" },
        { column: 2, color: "red", type: "armor" },
        { column: 4, color: "yellow", type: "normal" },
      ],
      [
        { column: 1, color: "red", type: "normal" },
        { column: 2, color: "blue", type: "normal" },
        { column: 3, color: "yellow", type: "normal" },
      ],
      [
        { column: 0, color: "yellow", type: "armor" },
        { column: 4, color: "red", type: "normal" },
      ],
    ],
  },
  {
    name: "빙결 해안 03",
    pattern: "장갑 압박",
    goal: "자동 공격이 중장형을 깎는 동안 색 공격 타이밍을 잡으세요.",
    nextIntel: "세 색·중장형 종합 웨이브",
    wave: [
      [
        { column: 0, color: "blue", type: "armor" },
        { column: 2, color: "red", type: "normal" },
        { column: 4, color: "yellow", type: "armor" },
      ],
      [
        { column: 1, color: "red", type: "normal" },
        { column: 2, color: "red", type: "normal" },
        { column: 3, color: "blue", type: "normal" },
      ],
      [
        { column: 0, color: "yellow", type: "normal" },
        { column: 2, color: "blue", type: "armor" },
        { column: 4, color: "red", type: "normal" },
      ],
      [
        { column: 1, color: "yellow", type: "armor" },
        { column: 3, color: "red", type: "armor" },
      ],
      [
        { column: 0, color: "red", type: "normal" },
        { column: 2, color: "blue", type: "normal" },
        { column: 4, color: "yellow", type: "normal" },
      ],
    ],
  },
  {
    name: "핵심 기억체",
    pattern: "종합 방어",
    goal: "자동 전투를 지원하며 네 번째 웨이브를 방어하세요.",
    nextIntel: "런 결과 분석",
    wave: [
      [
        { column: 0, color: "red", type: "normal" },
        { column: 2, color: "blue", type: "armor" },
        { column: 4, color: "yellow", type: "normal" },
      ],
      [
        { column: 1, color: "yellow", type: "armor" },
        { column: 3, color: "red", type: "armor" },
      ],
      [
        { column: 0, color: "blue", type: "normal" },
        { column: 1, color: "blue", type: "normal" },
        { column: 3, color: "yellow", type: "normal" },
        { column: 4, color: "yellow", type: "normal" },
      ],
      [
        { column: 0, color: "red", type: "armor" },
        { column: 2, color: "yellow", type: "armor" },
        { column: 4, color: "blue", type: "armor" },
      ],
      [
        { column: 1, color: "red", type: "normal" },
        { column: 2, color: "blue", type: "normal" },
        { column: 3, color: "yellow", type: "normal" },
      ],
      [
        { column: 0, color: "yellow", type: "normal" },
        { column: 2, color: "red", type: "armor" },
        { column: 4, color: "blue", type: "normal" },
      ],
    ],
  },
];

const state = {
  round: 0,
  shield: MAX_SHIELD,
  colorAttacks: 0,
  totalColorAttacks: 0,
  enemies: [],
  waveIndex: 0,
  totalEnemies: 0,
  defeated: 0,
  breached: 0,
  autoKills: { warrior: 0, archer: 0 },
  enemySequence: 0,
  cooldownUntil: 0,
  paused: true,
  running: false,
  timing: {
    move: 0,
    spawn: 0,
    warrior: 0,
    archer: 0,
  },
};

const refs = {
  roundLabel: document.querySelector("#roundLabel"),
  shieldDisplay: document.querySelector("#shieldDisplay"),
  enemyCountDisplay: document.querySelector("#enemyCountDisplay"),
  patternLabel: document.querySelector("#patternLabel"),
  enemyName: document.querySelector("#enemyName"),
  roundGoal: document.querySelector("#roundGoal"),
  crystalGrid: document.querySelector("#crystalGrid"),
  damageFlash: document.querySelector("#damageFlash"),
  clearProgress: document.querySelector("#clearProgress"),
  clearPercent: document.querySelector("#clearPercent"),
  actionChoices: document.querySelector("#actionChoices"),
  tapCount: document.querySelector("#tapCount"),
  feedbackText: document.querySelector("#feedbackText"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalPanel: document.querySelector("#modalPanel"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  modalActions: document.querySelector("#modalActions"),
  helpButton: document.querySelector("#helpButton"),
};

function getRoundTotalEnemies(roundData) {
  return roundData.wave.reduce((sum, squad) => sum + squad.length, 0);
}

function getRemainingEnemyCount() {
  return Math.max(0, state.totalEnemies - state.defeated - state.breached);
}

function resetTiming() {
  const now = performance.now();
  state.timing.move = now;
  state.timing.spawn = now;
  state.timing.warrior = now;
  state.timing.archer = now;
}

function spawnNextSquad() {
  const wave = ROUND_DATA[state.round].wave;
  if (state.waveIndex >= wave.length) return false;

  wave[state.waveIndex].forEach(({ column, color, type }) => {
    state.enemySequence += 1;
    state.enemies.push({
      id: state.enemySequence,
      column,
      row: 0,
      color,
      type,
      hp: ENEMY_TYPE_META[type].hp,
    });
  });
  state.waveIndex += 1;
  return true;
}

function startRun() {
  Object.assign(state, {
    round: 0,
    shield: MAX_SHIELD,
    colorAttacks: 0,
    totalColorAttacks: 0,
    enemies: [],
    waveIndex: 0,
    totalEnemies: 0,
    defeated: 0,
    breached: 0,
    autoKills: { warrior: 0, archer: 0 },
    enemySequence: 0,
    cooldownUntil: 0,
    paused: false,
    running: true,
  });
  closeModal();
  loadRound(0);
}

function loadRound(roundIndex) {
  const data = ROUND_DATA[roundIndex];
  state.round = roundIndex;
  state.colorAttacks = 0;
  state.enemies = [];
  state.waveIndex = 0;
  state.totalEnemies = getRoundTotalEnemies(data);
  state.defeated = 0;
  state.breached = 0;
  state.cooldownUntil = 0;
  state.paused = false;
  state.running = true;
  spawnNextSquad();
  resetTiming();
  refs.feedbackText.textContent = "전사와 궁수가 자동 공격 중입니다. 색 공격 타이밍을 선택하세요.";
  render();
}

function getWarriorTargets() {
  if (!state.enemies.length) return [];
  const frontRow = Math.max(...state.enemies.map((enemy) => enemy.row));
  return state.enemies
    .filter((enemy) => enemy.row === frontRow)
    .sort((left, right) => left.column - right.column)
    .slice(0, 2);
}

function getArcherTarget() {
  const armorTargets = state.enemies
    .filter((enemy) => enemy.type === "armor")
    .sort((left, right) => right.row - left.row);
  if (armorTargets.length) return armorTargets[0];
  return [...state.enemies].sort((left, right) => right.row - left.row)[0] || null;
}

function damageEnemy(enemyId, damage) {
  const enemy = state.enemies.find((unit) => unit.id === enemyId);
  if (enemy) enemy.hp -= damage;
}

function removeDefeatedEnemies(source) {
  const defeatedNow = state.enemies.filter((enemy) => enemy.hp <= 0).length;
  state.defeated += defeatedNow;
  if (source && defeatedNow > 0) state.autoKills[source] += defeatedNow;
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  return defeatedNow;
}

function warriorAutoAttack() {
  const targets = getWarriorTargets();
  if (!targets.length) return false;
  targets.forEach((enemy) => damageEnemy(enemy.id, 1));
  const defeatedNow = removeDefeatedEnemies("warrior");
  refs.feedbackText.textContent = `전사 자동 공격 · ${targets.length}체 타격 · ${defeatedNow}체 처치`;
  return true;
}

function archerAutoAttack() {
  const target = getArcherTarget();
  if (!target) return false;
  damageEnemy(target.id, 1);
  const defeatedNow = removeDefeatedEnemies("archer");
  refs.feedbackText.textContent = `궁수 자동 공격 · ${ENEMY_TYPE_META[target.type].name} 타격 · ${defeatedNow}체 처치`;
  return true;
}

function advanceEnemies() {
  state.enemies.forEach((enemy) => {
    enemy.row += 1;
  });
  const breachedNow = state.enemies.filter((enemy) => enemy.row >= BOARD_ROWS).length;
  state.breached += breachedNow;
  state.shield -= breachedNow;
  state.enemies = state.enemies.filter((enemy) => enemy.row < BOARD_ROWS);
  if (breachedNow > 0) {
    refs.feedbackText.textContent = `${breachedNow}체가 방어선을 돌파했습니다.`;
  }
  return true;
}

function ensureWavePresence(now) {
  if (state.enemies.length || state.waveIndex >= ROUND_DATA[state.round].wave.length) return false;
  const spawned = spawnNextSquad();
  if (spawned) state.timing.spawn = now;
  return spawned;
}

function isRoundClear() {
  return (
    state.waveIndex >= ROUND_DATA[state.round].wave.length
    && state.enemies.length === 0
  );
}

function settleBattle(now) {
  if (state.shield <= 0) {
    state.running = false;
    state.paused = true;
    render();
    window.setTimeout(showFailModal, 250);
    return true;
  }

  if (isRoundClear()) {
    state.running = false;
    state.paused = true;
    render();
    window.setTimeout(handleRoundClear, 250);
    return true;
  }

  ensureWavePresence(now);
  return false;
}

function gameLoop(now) {
  updateCooldownUi(now);
  if (!state.running || state.paused) return;

  let changed = false;
  if (now - state.timing.move >= MOVE_INTERVAL) {
    changed = advanceEnemies() || changed;
    state.timing.move = now;
  }
  if (now - state.timing.spawn >= SPAWN_INTERVAL) {
    changed = spawnNextSquad() || changed;
    state.timing.spawn = now;
  }
  if (now - state.timing.warrior >= WARRIOR_INTERVAL) {
    changed = warriorAutoAttack() || changed;
    state.timing.warrior = now;
  }
  if (now - state.timing.archer >= ARCHER_INTERVAL) {
    changed = archerAutoAttack() || changed;
    state.timing.archer = now;
  }

  if (settleBattle(now)) return;
  if (changed) {
    flashDamage();
    render();
  }
}

function attackColor(color) {
  const now = performance.now();
  if (!state.running || state.paused || now < state.cooldownUntil) return;

  const targets = state.enemies.filter((enemy) => enemy.color === color);
  if (!targets.length) {
    refs.feedbackText.textContent = `${COLOR_META[color].name} 적이 화면에 없습니다.`;
    return;
  }

  targets.forEach((enemy) => damageEnemy(enemy.id, 1));
  const defeatedNow = removeDefeatedEnemies(null);
  state.colorAttacks += 1;
  state.totalColorAttacks += 1;
  state.cooldownUntil = now + COLOR_COOLDOWN;
  refs.feedbackText.textContent = `${COLOR_META[color].name} 전체 공격 · ${targets.length}체 타격 · ${defeatedNow}체 처치`;
  flashDamage();

  if (!settleBattle(now)) render();
}

function getColorTargetInfo(color) {
  const targets = state.enemies.filter((enemy) => enemy.color === color);
  if (!targets.length) return { count: 0, distance: null };
  const nearestRow = Math.max(...targets.map((enemy) => enemy.row));
  return {
    count: targets.length,
    distance: BOARD_ROWS - nearestRow,
  };
}

function render() {
  renderHeader();
  renderBoard();
  renderColorActions();
  updateCooldownUi(performance.now());
}

function renderHeader() {
  const data = ROUND_DATA[state.round];
  refs.roundLabel.textContent = `ROUND ${state.round + 1} / 4`;
  refs.patternLabel.textContent = data.pattern;
  refs.enemyName.textContent = data.name;
  refs.roundGoal.textContent = data.goal;
  refs.shieldDisplay.textContent = `${"◆".repeat(Math.max(0, state.shield))}${"◇".repeat(Math.min(MAX_SHIELD, Math.max(0, MAX_SHIELD - state.shield)))}`;
  refs.enemyCountDisplay.textContent = `${getRemainingEnemyCount()}체`;

  document.querySelectorAll("[data-round-dot]").forEach((dot, index) => {
    dot.classList.toggle("is-current", index === state.round);
    dot.classList.toggle("is-complete", index < state.round);
  });
}

function renderBoard() {
  const warriorIds = new Set(getWarriorTargets().map((enemy) => enemy.id));
  const archerTarget = getArcherTarget();
  refs.crystalGrid.innerHTML = "";

  for (let cellIndex = 0; cellIndex < BOARD_COLUMNS * BOARD_ROWS; cellIndex += 1) {
    const row = Math.floor(cellIndex / BOARD_COLUMNS);
    const column = cellIndex % BOARD_COLUMNS;
    const enemy = state.enemies.find((unit) => unit.row === row && unit.column === column);
    const cell = document.createElement("div");

    if (!enemy) {
      cell.className = "crystal-cell is-lane-empty";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `빈 전투선 ${row + 1}행 ${column + 1}열`);
      refs.crystalGrid.appendChild(cell);
      continue;
    }

    const typeMeta = ENEMY_TYPE_META[enemy.type];
    const colorMeta = COLOR_META[enemy.color];
    const warriorTarget = warriorIds.has(enemy.id);
    const archerTargeted = archerTarget?.id === enemy.id;
    cell.className = [
      "crystal-cell",
      "enemy-unit",
      warriorTarget ? "is-warrior-target" : "",
      archerTargeted ? "is-archer-target" : "",
    ].filter(Boolean).join(" ");
    cell.dataset.color = enemy.color;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute(
      "aria-label",
      `${colorMeta.name} ${typeMeta.name}, 체력 ${enemy.hp}`,
    );
    cell.innerHTML = `
      <span class="enemy-tag">${typeMeta.tag}</span>
      <span class="symbol">${colorMeta.symbol}</span>
      <i class="depth">${enemy.hp}HP</i>
      <span class="role-markers">
        ${warriorTarget ? '<i data-role="warrior">⚔</i>' : ""}
        ${archerTargeted ? '<i data-role="archer">➶</i>' : ""}
      </span>
    `;
    refs.crystalGrid.appendChild(cell);
  }

  const resolved = state.defeated + state.breached;
  const progress = state.totalEnemies
    ? Math.round((resolved / state.totalEnemies) * 100)
    : 0;
  refs.clearProgress.style.width = `${progress}%`;
  refs.clearPercent.textContent = `${progress}%`;
}

function renderColorActions() {
  refs.actionChoices.innerHTML = "";
  Object.entries(COLOR_META).forEach(([color, meta]) => {
    const targetInfo = getColorTargetInfo(color);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button color-button";
    button.dataset.color = color;
    button.innerHTML = `
      <span class="action-symbol">${meta.symbol}</span>
      <strong>${meta.name} 전체 공격</strong>
      <small class="action-detail">${targetInfo.count ? `대상 ${targetInfo.count}체 · 최근 ${targetInfo.distance}칸` : "대상 없음"}</small>
    `;
    button.addEventListener("click", () => attackColor(color));
    button.addEventListener("mouseenter", () => setColorFocus(color));
    button.addEventListener("mouseleave", () => setColorFocus(null));
    button.addEventListener("focus", () => setColorFocus(color));
    button.addEventListener("blur", () => setColorFocus(null));
    refs.actionChoices.appendChild(button);
  });
}

function setColorFocus(color) {
  document.querySelectorAll(".enemy-unit").forEach((cell) => {
    cell.classList.toggle("is-focused-target", Boolean(color) && cell.dataset.color === color);
  });
}

function updateCooldownUi(now) {
  const remaining = Math.max(0, state.cooldownUntil - now);
  refs.tapCount.textContent = remaining > 0
    ? `공용 쿨타임 ${(remaining / 1000).toFixed(1)}초`
    : state.running && !state.paused
      ? "전체 공격 준비"
      : "전투 정지";

  document.querySelectorAll(".color-button").forEach((button) => {
    const targetInfo = getColorTargetInfo(button.dataset.color);
    button.disabled = !state.running || state.paused || remaining > 0 || targetInfo.count === 0;
    const detail = button.querySelector(".action-detail");
    if (detail) {
      detail.textContent = remaining > 0
        ? `공용 재사용 ${(remaining / 1000).toFixed(1)}초`
        : targetInfo.count
          ? `대상 ${targetInfo.count}체 · 최근 ${targetInfo.distance}칸`
          : "대상 없음";
    }
  });
}

function flashDamage() {
  refs.damageFlash.classList.remove("is-active");
  void refs.damageFlash.offsetWidth;
  refs.damageFlash.classList.add("is-active");
}

function handleRoundClear() {
  if (state.round === ROUND_DATA.length - 1) {
    showResultModal();
  } else {
    showRoundClearModal();
  }
}

function showIntroModal() {
  refs.modalEyebrow.textContent = "4 ROUND REALTIME PLAYTEST";
  refs.modalTitle.textContent = "전투는 자동, 색 공격은 직접";
  refs.modalBody.innerHTML = `
    <p>적은 실시간으로 이동하고 전사와 궁수는 자동 공격합니다.</p>
    <ul>
      <li>적색·청색·황색 중 하나를 탭하면 같은 색 적 전체에 1피해</li>
      <li>색 공격 세 개는 하나의 공용 쿨타임을 사용</li>
      <li>일반형은 1HP, 중장형은 2HP</li>
      <li>적이 방어선을 돌파하면 보호막 1칸 감소</li>
    </ul>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("실시간 방어 시작", startRun));
  openModal();
}

function showHelpModal() {
  const shouldResume = state.running && !state.paused;
  state.paused = true;
  render();
  refs.modalEyebrow.textContent = "HOW TO PLAY · PAUSED";
  refs.modalTitle.textContent = "가까운 색과 많은 색을 비교하세요";
  refs.modalBody.innerHTML = `
    <ul>
      <li>색 버튼의 대상 수와 가장 가까운 거리를 확인합니다.</li>
      <li>⚔ 전사는 가장 가까운 적 최대 2체를 자동 공격합니다.</li>
      <li>➶ 궁수는 중장형을 우선 자동 공격합니다.</li>
      <li>도움말이 열린 동안 실시간 전투는 정지합니다.</li>
    </ul>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("확인", () => {
    closeModal();
    if (shouldResume) {
      state.paused = false;
      resetTiming();
    }
    render();
  }));
  openModal();
}

function showRoundClearModal() {
  refs.modalEyebrow.textContent = `ROUND ${state.round + 1} CLEAR`;
  refs.modalTitle.textContent = "다음 웨이브가 감지되었습니다";
  refs.modalBody.innerHTML = `
    <div class="intel-card">
      <strong>다음 라운드 예고</strong>
      ${ROUND_DATA[state.round].nextIntel}
    </div>
    <p>보호막은 다음 라운드에도 유지됩니다.</p>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("다음 라운드", () => {
    closeModal();
    loadRound(state.round + 1);
  }));
  openModal();
}

function calculateGrade() {
  if (state.shield === MAX_SHIELD && state.totalColorAttacks <= 20) return "S";
  if (state.shield >= 2) return "A";
  if (state.shield >= 1) return "B";
  return "C";
}

function showResultModal() {
  const grade = calculateGrade();
  refs.modalEyebrow.textContent = "BLOCK A COMPLETE";
  refs.modalTitle.textContent = "빙결 해안 방어 완료";
  refs.modalBody.innerHTML = `
    <div class="result-card">
      <strong>방어 등급</strong>
      <div class="result-grade">${grade}</div>
      <p>색 전체 공격: ${state.totalColorAttacks}회 · 잔여 보호막: ${state.shield}</p>
      <p>전사 자동 처치 ${state.autoKills.warrior}체 · 궁수 자동 처치 ${state.autoKills.archer}체</p>
    </div>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("다시 시작", startRun));
  openModal();
}

function showFailModal() {
  refs.modalEyebrow.textContent = "RUN FAILED";
  refs.modalTitle.textContent = "방어선이 돌파되었습니다";
  refs.modalBody.innerHTML = `
    <div class="result-card">
      <strong>도달 기록</strong>
      <p>ROUND ${state.round + 1} · 색 공격 ${state.totalColorAttacks}회</p>
    </div>
    <p>대상 수가 적더라도 방어선에 가까운 색을 먼저 공격해 보세요.</p>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("블록 다시 시작", startRun));
  openModal();
}

function makePrimaryButton(label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary-button";
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function openModal() {
  refs.modalBackdrop.classList.add("is-open");
  window.setTimeout(() => refs.modalPanel.focus(), 0);
}

function closeModal() {
  refs.modalBackdrop.classList.remove("is-open");
}

refs.helpButton.addEventListener("click", showHelpModal);

document.querySelectorAll("[data-app-version]").forEach((label) => {
  label.textContent = `v${APP_VERSION} · ${APP_VERSION_NAME}`;
});

window.setInterval(() => gameLoop(performance.now()), 100);

showIntroModal();
render();
