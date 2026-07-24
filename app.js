const APP_VERSION = "0.3.0";
const APP_VERSION_NAME = "SIMPLE LINE";

const ENEMY_META = {
  normal: {
    name: "일반형",
    symbol: "◆",
    hp: 1,
    tag: "NORMAL",
    color: "red",
  },
  armor: {
    name: "중장형",
    symbol: "●",
    hp: 2,
    tag: "ARMOR",
    color: "blue",
  },
};

const ACTOR_META = {
  warrior: {
    name: "전사",
    action: "전열 베기",
    symbol: "⚔",
  },
  archer: {
    name: "궁수",
    action: "정밀 사격",
    symbol: "➶",
  },
};

const MAX_SHIELD = 3;
const BOARD_COLUMNS = 5;
const BOARD_ROWS = 5;

const ROUND_DATA = [
  {
    name: "빙결 해안 01",
    pattern: "기본 진격",
    goal: "앞줄은 전사, 중장형은 궁수로 막으세요.",
    nextIntel: "중장형 비중 증가",
    wave: [
      [
        { column: 1, type: "normal" },
        { column: 2, type: "normal" },
        { column: 3, type: "normal" },
      ],
      [
        { column: 0, type: "normal" },
        { column: 2, type: "armor" },
        { column: 4, type: "normal" },
      ],
      [
        { column: 1, type: "armor" },
        { column: 2, type: "normal" },
        { column: 3, type: "armor" },
      ],
    ],
  },
  {
    name: "빙결 해안 02",
    pattern: "장갑 혼합",
    goal: "전열의 수와 중장형 위치를 비교하세요.",
    nextIntel: "다중 전열 등장",
    wave: [
      [
        { column: 0, type: "normal" },
        { column: 1, type: "normal" },
        { column: 2, type: "normal" },
        { column: 3, type: "normal" },
      ],
      [
        { column: 1, type: "armor" },
        { column: 3, type: "armor" },
      ],
      [
        { column: 0, type: "normal" },
        { column: 2, type: "armor" },
        { column: 4, type: "normal" },
      ],
      [
        { column: 1, type: "normal" },
        { column: 2, type: "normal" },
        { column: 3, type: "normal" },
      ],
    ],
  },
  {
    name: "빙결 해안 03",
    pattern: "전열 압박",
    goal: "한 줄 처치와 중장형 저격의 타이밍을 고르세요.",
    nextIntel: "최종 혼합 웨이브",
    wave: [
      [
        { column: 0, type: "armor" },
        { column: 1, type: "normal" },
        { column: 2, type: "normal" },
        { column: 3, type: "normal" },
        { column: 4, type: "armor" },
      ],
      [
        { column: 1, type: "armor" },
        { column: 2, type: "armor" },
        { column: 3, type: "armor" },
      ],
      [
        { column: 0, type: "normal" },
        { column: 1, type: "normal" },
        { column: 3, type: "normal" },
        { column: 4, type: "normal" },
      ],
      [
        { column: 1, type: "normal" },
        { column: 2, type: "armor" },
        { column: 3, type: "normal" },
      ],
    ],
  },
  {
    name: "핵심 기억체",
    pattern: "종합 웨이브",
    goal: "두 캐릭터만 사용해 마지막 진격을 막으세요.",
    nextIntel: "런 결과 분석",
    wave: [
      [
        { column: 0, type: "normal" },
        { column: 1, type: "normal" },
        { column: 2, type: "normal" },
        { column: 3, type: "normal" },
        { column: 4, type: "normal" },
      ],
      [
        { column: 0, type: "armor" },
        { column: 2, type: "armor" },
        { column: 4, type: "armor" },
      ],
      [
        { column: 1, type: "normal" },
        { column: 2, type: "normal" },
        { column: 3, type: "normal" },
      ],
      [
        { column: 0, type: "normal" },
        { column: 1, type: "armor" },
        { column: 3, type: "armor" },
        { column: 4, type: "normal" },
      ],
      [
        { column: 1, type: "normal" },
        { column: 2, type: "armor" },
        { column: 3, type: "normal" },
      ],
    ],
  },
];

const state = {
  round: 0,
  shield: MAX_SHIELD,
  taps: 0,
  totalTaps: 0,
  enemies: [],
  waveIndex: 0,
  totalEnemies: 0,
  defeated: 0,
  breached: 0,
  actorUse: { warrior: 0, archer: 0 },
  enemySequence: 0,
  locked: true,
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

function spawnNextSquad() {
  const wave = ROUND_DATA[state.round].wave;
  if (state.waveIndex >= wave.length) return;

  wave[state.waveIndex].forEach(({ column, type }) => {
    state.enemySequence += 1;
    state.enemies.push({
      id: state.enemySequence,
      type,
      column,
      row: 0,
      hp: ENEMY_META[type].hp,
    });
  });
  state.waveIndex += 1;
}

function startRun() {
  Object.assign(state, {
    round: 0,
    shield: MAX_SHIELD,
    taps: 0,
    totalTaps: 0,
    enemies: [],
    waveIndex: 0,
    totalEnemies: 0,
    defeated: 0,
    breached: 0,
    actorUse: { warrior: 0, archer: 0 },
    enemySequence: 0,
    locked: false,
  });
  closeModal();
  loadRound(0);
}

function loadRound(roundIndex) {
  const data = ROUND_DATA[roundIndex];
  state.round = roundIndex;
  state.taps = 0;
  state.enemies = [];
  state.waveIndex = 0;
  state.totalEnemies = getRoundTotalEnemies(data);
  state.defeated = 0;
  state.breached = 0;
  state.locked = false;
  spawnNextSquad();
  refs.feedbackText.textContent = "전사 또는 궁수를 한 번 탭하세요.";
  render();
}

function getFrontRow() {
  if (!state.enemies.length) return null;
  return Math.max(...state.enemies.map((enemy) => enemy.row));
}

function getWarriorTargets() {
  const frontRow = getFrontRow();
  if (frontRow === null) return [];
  return state.enemies.filter((enemy) => enemy.row === frontRow);
}

function getArcherTarget() {
  const armorTargets = state.enemies
    .filter((enemy) => enemy.type === "armor")
    .sort((left, right) => right.row - left.row);
  if (armorTargets.length) return armorTargets[0];

  return [...state.enemies].sort((left, right) => right.row - left.row)[0] || null;
}

function render() {
  renderHeader();
  renderBoard();
  renderActions();
}

function renderHeader() {
  const data = ROUND_DATA[state.round];
  refs.roundLabel.textContent = `ROUND ${state.round + 1} / 4`;
  refs.patternLabel.textContent = data.pattern;
  refs.enemyName.textContent = data.name;
  refs.roundGoal.textContent = data.goal;
  refs.shieldDisplay.textContent = `${"◆".repeat(Math.max(0, state.shield))}${"◇".repeat(Math.min(MAX_SHIELD, Math.max(0, MAX_SHIELD - state.shield)))}`;
  refs.enemyCountDisplay.textContent = `${getRemainingEnemyCount()}체`;
  refs.tapCount.textContent = `탭 ${state.taps}회`;

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

    const meta = ENEMY_META[enemy.type];
    const warriorTarget = warriorIds.has(enemy.id);
    const archerTargeted = archerTarget?.id === enemy.id;
    cell.className = [
      "crystal-cell",
      "enemy-unit",
      warriorTarget ? "is-warrior-target" : "",
      archerTargeted ? "is-archer-target" : "",
    ].filter(Boolean).join(" ");
    cell.dataset.color = meta.color;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute(
      "aria-label",
      `${meta.name}, 체력 ${enemy.hp}${warriorTarget ? ", 전사 공격 대상" : ""}${archerTargeted ? ", 궁수 공격 대상" : ""}`,
    );
    cell.innerHTML = `
      <span class="enemy-tag">${meta.tag}</span>
      <span class="symbol">${meta.symbol}</span>
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

function renderActions() {
  const warriorTargets = getWarriorTargets();
  const archerTarget = getArcherTarget();
  refs.actionChoices.innerHTML = "";

  const warriorButton = makeActionButton(
    "warrior",
    `${warriorTargets.length}체에 1피해`,
    attackWithWarrior,
  );
  const archerDescription = archerTarget
    ? `${ENEMY_META[archerTarget.type].name} 1체에 2피해`
    : "대상 없음";
  const archerButton = makeActionButton(
    "archer",
    archerDescription,
    attackWithArcher,
  );

  warriorButton.disabled = state.locked || !warriorTargets.length;
  archerButton.disabled = state.locked || !archerTarget;
  refs.actionChoices.append(warriorButton, archerButton);
}

function makeActionButton(type, description, handler) {
  const actor = ACTOR_META[type];
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-button character-button";
  button.dataset.role = type;
  button.innerHTML = `
    <span class="action-symbol">${actor.symbol}</span>
    <strong>${actor.name} · ${actor.action}</strong>
    <small>${description}</small>
  `;
  button.addEventListener("click", handler);
  return button;
}

function damageEnemy(enemyId, damage) {
  const enemy = state.enemies.find((unit) => unit.id === enemyId);
  if (!enemy) return;
  enemy.hp -= damage;
}

function removeDefeatedEnemies() {
  const defeatedNow = state.enemies.filter((enemy) => enemy.hp <= 0).length;
  state.defeated += defeatedNow;
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  return defeatedNow;
}

function advanceEnemies() {
  state.enemies.forEach((enemy) => {
    enemy.row += 1;
  });

  const breachedNow = state.enemies.filter((enemy) => enemy.row >= BOARD_ROWS).length;
  state.breached += breachedNow;
  state.shield -= breachedNow;
  state.enemies = state.enemies.filter((enemy) => enemy.row < BOARD_ROWS);
  spawnNextSquad();
  return breachedNow;
}

function isRoundClear() {
  return (
    state.waveIndex >= ROUND_DATA[state.round].wave.length
    && state.enemies.length === 0
  );
}

function finishAction(type, defeatedNow) {
  state.taps += 1;
  state.totalTaps += 1;
  state.actorUse[type] += 1;
  const breachedNow = advanceEnemies();
  const actor = ACTOR_META[type];
  refs.feedbackText.textContent = `${actor.name} ${actor.action} · ${defeatedNow}체 처치`;
  if (breachedNow > 0) {
    refs.feedbackText.textContent += ` · ${breachedNow}체 돌파`;
  }
  flashDamage();

  const roundClear = isRoundClear();
  render();

  if (state.shield <= 0) {
    window.setTimeout(showFailModal, 420);
    return;
  }

  if (roundClear) {
    window.setTimeout(handleRoundClear, 500);
    return;
  }

  window.setTimeout(() => {
    state.locked = false;
    renderActions();
  }, 220);
}

function attackWithWarrior() {
  if (state.locked) return;
  const targets = getWarriorTargets();
  if (!targets.length) return;
  state.locked = true;
  targets.forEach((enemy) => damageEnemy(enemy.id, 1));
  finishAction("warrior", removeDefeatedEnemies());
}

function attackWithArcher() {
  if (state.locked) return;
  const target = getArcherTarget();
  if (!target) return;
  state.locked = true;
  damageEnemy(target.id, 2);
  finishAction("archer", removeDefeatedEnemies());
}

function flashDamage() {
  refs.damageFlash.classList.remove("is-active");
  void refs.damageFlash.offsetWidth;
  refs.damageFlash.classList.add("is-active");
}

function handleRoundClear() {
  state.locked = true;
  if (state.round === ROUND_DATA.length - 1) {
    showResultModal();
  } else {
    showRoundClearModal();
  }
}

function showIntroModal() {
  refs.modalEyebrow.textContent = "4 ROUND SIMPLE PLAYTEST";
  refs.modalTitle.textContent = "전사와 궁수 중 하나를 고르세요";
  refs.modalBody.innerHTML = `
    <p>공격 후 적은 모두 아래로 한 칸 전진합니다.</p>
    <ul>
      <li><strong>전사</strong>: 가장 가까운 적 한 줄 전체에 1피해</li>
      <li><strong>궁수</strong>: 중장형을 우선해 적 하나에게 2피해</li>
      <li><strong>일반형</strong>: 체력 1</li>
      <li><strong>중장형</strong>: 체력 2</li>
      <li>적이 방어선을 돌파하면 보호막 1칸 감소</li>
    </ul>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("4라운드 시작", startRun));
  openModal();
}

function showHelpModal() {
  const wasLocked = state.locked;
  state.locked = true;
  renderActions();
  refs.modalEyebrow.textContent = "HOW TO PLAY";
  refs.modalTitle.textContent = "앞줄이 많으면 전사, 중장형은 궁수";
  refs.modalBody.innerHTML = `
    <ul>
      <li>⚔ 표시는 이번 전사 공격 대상입니다.</li>
      <li>➶ 표시는 이번 궁수 공격 대상입니다.</li>
      <li>공격할 때마다 모든 적이 한 칸 전진합니다.</li>
      <li>모든 웨이브를 처리하면 라운드가 끝납니다.</li>
    </ul>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("확인", () => {
    closeModal();
    state.locked = wasLocked;
    renderActions();
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
  if (state.shield === MAX_SHIELD && state.totalTaps <= 20) return "S";
  if (state.shield >= 2) return "A";
  if (state.shield >= 1) return "B";
  return "C";
}

function showResultModal() {
  const grade = calculateGrade();
  const dominantTactic = state.actorUse.warrior >= state.actorUse.archer ? "warrior" : "archer";
  refs.modalEyebrow.textContent = "BLOCK A COMPLETE";
  refs.modalTitle.textContent = "빙결 해안 방어 완료";
  refs.modalBody.innerHTML = `
    <div class="result-card">
      <strong>방어 등급</strong>
      <div class="result-grade">${grade}</div>
      <p>주력 전술: ${ACTOR_META[dominantTactic].symbol} ${ACTOR_META[dominantTactic].name}</p>
      <p>총 탭 수: ${state.totalTaps} · 잔여 보호막: ${state.shield}</p>
      <p>전사 ${state.actorUse.warrior}회 · 궁수 ${state.actorUse.archer}회</p>
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
      <p>ROUND ${state.round + 1} · 총 탭 ${state.totalTaps}회</p>
    </div>
    <p>앞줄이 많이 모이면 전사, 중장형은 궁수로 먼저 제거해 보세요.</p>
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

showIntroModal();
render();
