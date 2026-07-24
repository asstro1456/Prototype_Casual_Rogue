const APP_VERSION = "0.2.0";
const APP_VERSION_NAME = "DESCENT WAVE";

const ENEMY_META = {
  red: {
    name: "속공형",
    symbol: "◆",
    hp: 1,
    speed: 2,
    breachDamage: 1,
    tag: "FAST",
  },
  blue: {
    name: "중장형",
    symbol: "●",
    hp: 2,
    speed: 1,
    breachDamage: 1,
    tag: "ARMOR",
  },
  yellow: {
    name: "위험형",
    symbol: "▲",
    hp: 1,
    speed: 1,
    breachDamage: 2,
    tag: "DANGER",
  },
};

const ACTOR_META = {
  melee: { name: "전사", action: "전열 베기", symbol: "⚔" },
  archer: { name: "궁수", action: "정밀 사격", symbol: "➶" },
  duo: { name: "연계", action: "교차 공격", symbol: "✦" },
};

const MAX_SHIELD = 3;
const BOARD_SIZE = 5;
const LINK_THRESHOLD = 2;

const ROUND_DATA = [
  {
    name: "빙결 해안 01",
    pattern: "진격 훈련",
    goal: "전열은 베고, 먼 적은 궁수로 저격하세요.",
    nextIntel: "중장형 추가 · 방어 2",
    wave: [
      [{ column: 1, type: "red" }, { column: 3, type: "blue" }],
      [{ column: 0, type: "red" }, { column: 2, type: "red" }, { column: 4, type: "blue" }],
      [{ column: 1, type: "blue" }, { column: 2, type: "red" }],
      [{ column: 0, type: "red" }, { column: 3, type: "blue" }],
    ],
  },
  {
    name: "빙결 해안 02",
    pattern: "장갑 혼합",
    goal: "중장형은 궁수로 먼저 관통하세요.",
    nextIntel: "속공·위험형 혼합",
    wave: [
      [{ column: 0, type: "blue" }, { column: 3, type: "red" }],
      [{ column: 1, type: "red" }, { column: 2, type: "blue" }, { column: 4, type: "red" }],
      [{ column: 0, type: "red" }, { column: 2, type: "yellow" }],
      [{ column: 1, type: "blue" }, { column: 3, type: "blue" }],
      [{ column: 0, type: "yellow" }, { column: 4, type: "red" }],
    ],
  },
  {
    name: "빙결 해안 03",
    pattern: "속공 압박",
    goal: "빠른 적과 돌파 피해가 큰 적을 우선하세요.",
    nextIntel: "세 유형 종합 웨이브",
    wave: [
      [{ column: 1, type: "red" }, { column: 4, type: "yellow" }],
      [{ column: 0, type: "blue" }, { column: 2, type: "red" }, { column: 3, type: "red" }],
      [{ column: 1, type: "yellow" }, { column: 4, type: "blue" }],
      [{ column: 0, type: "red" }, { column: 2, type: "blue" }, { column: 4, type: "red" }],
      [{ column: 1, type: "blue" }, { column: 3, type: "yellow" }],
    ],
  },
  {
    name: "핵심 기억체",
    pattern: "종합 웨이브",
    goal: "전사·궁수·연계를 모두 활용해 진격을 막으세요.",
    nextIntel: "런 결과 분석",
    wave: [
      [{ column: 0, type: "red" }, { column: 2, type: "blue" }, { column: 4, type: "yellow" }],
      [{ column: 1, type: "blue" }, { column: 3, type: "red" }],
      [{ column: 0, type: "yellow" }, { column: 2, type: "red" }, { column: 4, type: "blue" }],
      [{ column: 1, type: "red" }, { column: 2, type: "blue" }, { column: 3, type: "red" }],
      [{ column: 0, type: "blue" }, { column: 4, type: "yellow" }],
      [{ column: 1, type: "yellow" }, { column: 3, type: "blue" }],
    ],
  },
];

const ABILITIES = {
  heavy_slash: {
    id: "heavy_slash",
    role: "melee",
    name: "강철 베기",
    description: "전사의 전열 베기 피해가 레벨마다 1 증가합니다.",
  },
  piercing_arrow: {
    id: "piercing_arrow",
    role: "archer",
    name: "관통 화살",
    description: "궁수의 정밀 사격 피해가 레벨마다 1 증가합니다.",
  },
  crossfire: {
    id: "crossfire",
    role: "duo",
    name: "교차 사격",
    description: "연계 공격의 중심 대상 추가 피해가 레벨마다 1 증가합니다.",
  },
};

const state = {
  round: 0,
  shield: MAX_SHIELD,
  link: 0,
  lastActor: null,
  taps: 0,
  totalTaps: 0,
  enemies: [],
  waveIndex: 0,
  totalEnemies: 0,
  defeated: 0,
  breached: 0,
  candidates: [],
  abilities: {},
  actorUse: { melee: 0, archer: 0, duo: 0 },
  enemySequence: 0,
  locked: true,
};

const refs = {
  roundLabel: document.querySelector("#roundLabel"),
  shieldDisplay: document.querySelector("#shieldDisplay"),
  enemyCountDisplay: document.querySelector("#enemyCountDisplay"),
  linkDisplay: document.querySelector("#linkDisplay"),
  patternLabel: document.querySelector("#patternLabel"),
  enemyName: document.querySelector("#enemyName"),
  roundGoal: document.querySelector("#roundGoal"),
  crystalGrid: document.querySelector("#crystalGrid"),
  damageFlash: document.querySelector("#damageFlash"),
  clearProgress: document.querySelector("#clearProgress"),
  clearPercent: document.querySelector("#clearPercent"),
  abilityChips: document.querySelector("#abilityChips"),
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
    const meta = ENEMY_META[type];
    state.enemySequence += 1;
    state.enemies.push({
      id: state.enemySequence,
      type,
      column,
      row: 0,
      hp: meta.hp,
      maxHp: meta.hp,
    });
  });
  state.waveIndex += 1;
}

function startRun() {
  Object.assign(state, {
    round: 0,
    shield: MAX_SHIELD,
    link: 0,
    lastActor: null,
    taps: 0,
    totalTaps: 0,
    enemies: [],
    waveIndex: 0,
    totalEnemies: 0,
    defeated: 0,
    breached: 0,
    candidates: [],
    abilities: {},
    actorUse: { melee: 0, archer: 0, duo: 0 },
    enemySequence: 0,
    locked: false,
  });
  closeModal();
  loadRound(0);
}

function loadRound(roundIndex) {
  const data = ROUND_DATA[roundIndex];
  state.round = roundIndex;
  state.link = 0;
  state.lastActor = null;
  state.taps = 0;
  state.enemies = [];
  state.waveIndex = 0;
  state.totalEnemies = getRoundTotalEnemies(data);
  state.defeated = 0;
  state.breached = 0;
  state.locked = false;
  spawnNextSquad();
  state.candidates = buildActionChoices();
  refs.feedbackText.textContent = "번호가 표시된 공격 후보 하나를 탭하세요.";
  render();
}

function getEnemyById(enemyId) {
  return state.enemies.find((enemy) => enemy.id === enemyId);
}

function getThreatScore(enemy) {
  const meta = ENEMY_META[enemy.type];
  return (enemy.row * 20)
    + (meta.speed * 6)
    + (meta.breachDamage * 5)
    + enemy.hp;
}

function getFrontEnemies() {
  const frontRow = Math.max(...state.enemies.map((enemy) => enemy.row));
  return state.enemies
    .filter((enemy) => enemy.row === frontRow)
    .sort((left, right) => left.column - right.column);
}

function makeMeleeCandidate(anchor) {
  const targetIds = state.enemies
    .filter((enemy) => (
      enemy.row === anchor.row
      && Math.abs(enemy.column - anchor.column) <= 1
    ))
    .map((enemy) => enemy.id);
  return {
    type: "melee",
    anchorId: anchor.id,
    targetIds,
  };
}

function makeArcherCandidate(target) {
  return {
    type: "archer",
    anchorId: target.id,
    targetIds: [target.id],
  };
}

function makeDuoCandidate(anchor) {
  return {
    type: "duo",
    anchorId: anchor.id,
    targetIds: state.enemies
      .filter((enemy) => (
        enemy.row === anchor.row
        && Math.abs(enemy.column - anchor.column) <= 1
      ))
      .map((enemy) => enemy.id),
  };
}

function buildActionChoices() {
  if (!state.enemies.length) return [];

  const frontEnemies = getFrontEnemies();
  const threatOrder = [...state.enemies].sort((left, right) => (
    getThreatScore(right) - getThreatScore(left)
  ));
  const primaryFront = frontEnemies[Math.floor(frontEnemies.length / 2)];
  const choices = [
    makeMeleeCandidate(primaryFront),
    makeArcherCandidate(threatOrder[0]),
  ];

  if (state.link >= LINK_THRESHOLD) {
    choices.push(makeDuoCandidate(primaryFront));
  } else {
    const alternateTarget = threatOrder.find((enemy) => enemy.id !== threatOrder[0].id);
    const alternateFront = frontEnemies.find((enemy) => enemy.id !== primaryFront.id);
    if (alternateTarget) {
      choices.push(
        state.lastActor === "archer" && alternateFront
          ? makeMeleeCandidate(alternateFront)
          : makeArcherCandidate(alternateTarget),
      );
    }
  }

  return choices;
}

function render() {
  renderHeader();
  renderLink();
  renderBoard();
  renderAbilities();
  renderCandidates();
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

function renderLink() {
  refs.linkDisplay.innerHTML = "";
  for (let index = 0; index < LINK_THRESHOLD; index += 1) {
    const pip = document.createElement("i");
    pip.classList.toggle("is-filled", index < state.link);
    refs.linkDisplay.appendChild(pip);
  }
  refs.linkDisplay.classList.toggle("is-ready", state.link >= LINK_THRESHOLD);
  refs.linkDisplay.setAttribute(
    "aria-label",
    state.link >= LINK_THRESHOLD ? "연계 공격 준비 완료" : `연계 게이지 ${state.link} / ${LINK_THRESHOLD}`,
  );
}

function getCandidateSlotsForEnemy(enemyId) {
  return state.candidates
    .map((candidate, index) => (candidate.targetIds.includes(enemyId) ? index + 1 : null))
    .filter(Boolean);
}

function renderBoard() {
  refs.crystalGrid.innerHTML = "";

  for (let cellIndex = 0; cellIndex < BOARD_SIZE * BOARD_SIZE; cellIndex += 1) {
    const row = Math.floor(cellIndex / BOARD_SIZE);
    const column = cellIndex % BOARD_SIZE;
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
    const candidateSlots = getCandidateSlotsForEnemy(enemy.id);
    cell.className = `crystal-cell enemy-unit${candidateSlots.length ? " has-target" : ""}`;
    cell.dataset.color = enemy.type;
    cell.dataset.enemyId = String(enemy.id);
    if (candidateSlots.length) cell.dataset.targetSlots = candidateSlots.join(" ");
    cell.setAttribute("role", "gridcell");
    cell.setAttribute(
      "aria-label",
      `${meta.name}, 체력 ${enemy.hp}, 행동 후보 ${candidateSlots.join(", ")}의 대상`,
    );
    cell.innerHTML = `
      <span class="enemy-tag">${meta.tag}</span>
      <span class="symbol">${meta.symbol}</span>
      <i class="depth">${enemy.hp}HP</i>
      <span class="target-markers">
        ${candidateSlots.map((slot) => `<i data-slot="${slot}">${slot}</i>`).join("")}
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

function renderAbilities() {
  const entries = Object.entries(state.abilities);
  refs.abilityChips.innerHTML = "";
  if (!entries.length) {
    refs.abilityChips.innerHTML = '<span class="empty-chip">아직 획득한 능력이 없습니다.</span>';
    return;
  }

  entries.forEach(([abilityId, level]) => {
    const ability = ABILITIES[abilityId];
    const chip = document.createElement("span");
    chip.className = "ability-chip";
    chip.dataset.role = ability.role;
    chip.textContent = `${ACTOR_META[ability.role].symbol} ${ability.name} Lv.${level}`;
    refs.abilityChips.appendChild(chip);
  });
}

function getCandidateDescription(candidate) {
  const anchor = getEnemyById(candidate.anchorId);
  if (!anchor) return "대상 없음";
  const meta = ENEMY_META[anchor.type];
  if (candidate.type === "melee") {
    return `전열 ${candidate.targetIds.length}체 · 피해 ${1 + (state.abilities.heavy_slash || 0)}`;
  }
  if (candidate.type === "archer") {
    return `${meta.name} · 피해 ${2 + (state.abilities.piercing_arrow || 0)}`;
  }
  return `전열 ${candidate.targetIds.length}체 + 중심 관통`;
}

function renderCandidates() {
  refs.actionChoices.innerHTML = "";
  state.candidates.forEach((candidate, index) => {
    const actor = ACTOR_META[candidate.type];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button";
    button.dataset.role = candidate.type;
    button.setAttribute(
      "aria-label",
      `${index + 1}번 ${actor.name} ${actor.action}, ${getCandidateDescription(candidate)}`,
    );
    button.disabled = state.locked;
    button.innerHTML = `
      <span class="candidate-number">${index + 1}</span>
      <span class="action-symbol">${actor.symbol}</span>
      <strong>${actor.name} · ${actor.action}</strong>
      <small>${getCandidateDescription(candidate)}</small>
    `;
    button.addEventListener("click", () => attackWithCandidate(index));
    button.addEventListener("mouseenter", () => setCandidateFocus(index + 1));
    button.addEventListener("mouseleave", () => setCandidateFocus(null));
    button.addEventListener("focus", () => setCandidateFocus(index + 1));
    button.addEventListener("blur", () => setCandidateFocus(null));
    refs.actionChoices.appendChild(button);
  });
}

function setCandidateFocus(slot) {
  document.querySelectorAll(".enemy-unit").forEach((cell) => {
    const slots = (cell.dataset.targetSlots || "").split(" ");
    cell.classList.toggle("is-focused-target", Boolean(slot) && slots.includes(String(slot)));
  });
}

function damageEnemy(enemyId, damage) {
  const enemy = getEnemyById(enemyId);
  if (!enemy) return 0;
  const appliedDamage = Math.min(enemy.hp, damage);
  enemy.hp -= damage;
  return appliedDamage;
}

function removeDefeatedEnemies() {
  const defeatedNow = state.enemies.filter((enemy) => enemy.hp <= 0).length;
  state.defeated += defeatedNow;
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  return defeatedNow;
}

function updateLink(type) {
  if (type === "duo") {
    state.link = 0;
    state.lastActor = null;
    return;
  }

  if (state.lastActor && state.lastActor !== type) {
    state.link = Math.min(LINK_THRESHOLD, state.link + 1);
  } else if (state.lastActor === type) {
    state.link = 0;
  }
  state.lastActor = type;
}

function performAttack(candidate) {
  if (candidate.type === "melee") {
    const damage = 1 + (state.abilities.heavy_slash || 0);
    candidate.targetIds.forEach((enemyId) => damageEnemy(enemyId, damage));
    return `${candidate.targetIds.length}체에 ${damage}피해`;
  }

  if (candidate.type === "archer") {
    const damage = 2 + (state.abilities.piercing_arrow || 0);
    damageEnemy(candidate.anchorId, damage);
    return `중심 대상에 ${damage}피해`;
  }

  const meleeDamage = 1;
  const centerDamage = 2 + (state.abilities.crossfire || 0);
  candidate.targetIds.forEach((enemyId) => damageEnemy(enemyId, meleeDamage));
  damageEnemy(candidate.anchorId, centerDamage);
  return `${candidate.targetIds.length}체 베기 + 중심 ${centerDamage}피해`;
}

function advanceEnemies() {
  let shieldDamage = 0;
  const survivors = [];
  let breachedCount = 0;

  for (let column = 0; column < BOARD_SIZE; column += 1) {
    const occupiedRows = new Set();
    const laneEnemies = state.enemies
      .filter((enemy) => enemy.column === column)
      .sort((left, right) => right.row - left.row);

    laneEnemies.forEach((enemy) => {
      let nextRow = enemy.row + ENEMY_META[enemy.type].speed;
      if (nextRow >= BOARD_SIZE) {
        shieldDamage += ENEMY_META[enemy.type].breachDamage;
        breachedCount += 1;
        return;
      }

      while (occupiedRows.has(nextRow) && nextRow > enemy.row) {
        nextRow -= 1;
      }
      enemy.row = nextRow;
      occupiedRows.add(nextRow);
      survivors.push(enemy);
    });
  }

  state.breached += breachedCount;
  state.shield -= shieldDamage;
  state.enemies = survivors;
  spawnNextSquad();

  return shieldDamage;
}

function isRoundClear() {
  return (
    state.waveIndex >= ROUND_DATA[state.round].wave.length
    && state.enemies.length === 0
  );
}

function attackWithCandidate(candidateIndex) {
  if (state.locked) return;
  const candidate = state.candidates[candidateIndex];
  if (!candidate) return;

  state.locked = true;
  const actor = ACTOR_META[candidate.type];
  const attackSummary = performAttack(candidate);
  const defeatedNow = removeDefeatedEnemies();
  updateLink(candidate.type);
  state.taps += 1;
  state.totalTaps += 1;
  state.actorUse[candidate.type] += 1;
  const shieldDamage = advanceEnemies();

  refs.feedbackText.textContent = `${actor.name} ${actor.action} · ${attackSummary} · ${defeatedNow}체 처치`;
  if (shieldDamage > 0) {
    refs.feedbackText.textContent += ` · 돌파 피해 ${shieldDamage}`;
  } else if (state.link >= LINK_THRESHOLD) {
    refs.feedbackText.textContent += " · 연계 공격 준비 완료";
  }
  flashDamage();

  const roundClear = isRoundClear();
  state.candidates = roundClear ? [] : buildActionChoices();
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
    renderCandidates();
  }, 220);
}

function flashDamage() {
  refs.damageFlash.classList.remove("is-active");
  void refs.damageFlash.offsetWidth;
  refs.damageFlash.classList.add("is-active");
}

function handleRoundClear() {
  state.locked = true;
  if (state.round === 0 || state.round === 2) {
    showAbilityModal();
  } else if (state.round === 3) {
    showResultModal();
  } else {
    showRoundClearModal();
  }
}

function showIntroModal() {
  refs.modalEyebrow.textContent = "4 ROUND WAVE PLAYTEST";
  refs.modalTitle.textContent = "진격하는 적을 막으세요";
  refs.modalBody.innerHTML = `
    <p>공격 후보 하나를 탭하면 공격 후 모든 적이 아래로 전진합니다.</p>
    <ul>
      <li><strong>전사</strong>: 가장 가까운 적 주변을 3칸 폭으로 공격</li>
      <li><strong>궁수</strong>: 거리 제한 없이 적 하나에게 2피해</li>
      <li><strong>연계</strong>: 전사와 궁수를 교대하면 합동 공격 등장</li>
      <li>적이 최하단을 돌파하면 보호막 피해</li>
    </ul>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("4라운드 시작", startRun));
  openModal();
}

function showHelpModal() {
  const wasLocked = state.locked;
  state.locked = true;
  renderCandidates();
  refs.modalEyebrow.textContent = "HOW TO PLAY";
  refs.modalTitle.textContent = "위험한 적부터 저지하세요";
  refs.modalBody.innerHTML = `
    <ul>
      <li><strong>FAST</strong>: 한 번에 2칸 전진</li>
      <li><strong>ARMOR</strong>: 체력 2, 궁수가 한 번에 처치</li>
      <li><strong>DANGER</strong>: 돌파 시 보호막 2피해</li>
      <li>같은 캐릭터를 연속 사용하면 연계 게이지가 초기화됩니다.</li>
    </ul>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("확인", () => {
    closeModal();
    state.locked = wasLocked;
    renderCandidates();
  }));
  openModal();
}

function showAbilityModal() {
  refs.modalEyebrow.textContent = `ROUND ${state.round + 1} CLEAR · ABILITY PICK`;
  refs.modalTitle.textContent = "전투 능력 하나를 선택하세요";
  refs.modalBody.innerHTML = `
    <div class="intel-card">
      <strong>다음 라운드 예고</strong>
      ${ROUND_DATA[state.round].nextIntel}
    </div>
  `;
  refs.modalActions.innerHTML = "";

  Object.values(ABILITIES).forEach((ability) => {
    const level = state.abilities[ability.id] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ability-option";
    button.dataset.role = ability.role;
    button.innerHTML = `
      <span class="option-symbol">${ACTOR_META[ability.role].symbol}</span>
      <span>
        <strong>${ability.name}${level ? ` Lv.${level} → Lv.${Math.min(level + 1, 2)}` : " Lv.1"}</strong>
        <small>${ability.description}</small>
      </span>
      <span class="option-role">${ACTOR_META[ability.role].name} 강화</span>
    `;
    button.addEventListener("click", () => chooseAbility(ability.id));
    refs.modalActions.appendChild(button);
  });
  openModal();
}

function chooseAbility(abilityId) {
  state.abilities[abilityId] = Math.min((state.abilities[abilityId] || 0) + 1, 2);
  closeModal();
  loadRound(state.round + 1);
}

function showRoundClearModal() {
  refs.modalEyebrow.textContent = `ROUND ${state.round + 1} CLEAR`;
  refs.modalTitle.textContent = "다음 웨이브가 감지되었습니다";
  refs.modalBody.innerHTML = `
    <div class="intel-card">
      <strong>다음 라운드 예고</strong>
      ${ROUND_DATA[state.round].nextIntel}
    </div>
    <p>보호막과 획득 능력은 다음 라운드에도 유지됩니다.</p>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("다음 라운드", () => {
    closeModal();
    loadRound(state.round + 1);
  }));
  openModal();
}

function calculateGrade() {
  if (state.shield === MAX_SHIELD && state.totalTaps <= 24) return "S";
  if (state.shield >= 2) return "A";
  if (state.shield >= 1) return "B";
  return "C";
}

function getDominantTactic() {
  return Object.entries(state.actorUse)
    .filter(([type]) => type !== "duo")
    .sort((left, right) => right[1] - left[1])[0][0];
}

function showResultModal() {
  const grade = calculateGrade();
  const dominantTactic = getDominantTactic();
  refs.modalEyebrow.textContent = "BLOCK A COMPLETE";
  refs.modalTitle.textContent = "빙결 해안 방어 완료";
  refs.modalBody.innerHTML = `
    <div class="result-card">
      <strong>방어 등급</strong>
      <div class="result-grade">${grade}</div>
      <p>주력 전술: ${ACTOR_META[dominantTactic].symbol} ${ACTOR_META[dominantTactic].name}</p>
      <p>총 탭 수: ${state.totalTaps} · 잔여 보호막: ${state.shield}</p>
      <p>전사 ${state.actorUse.melee}회 · 궁수 ${state.actorUse.archer}회 · 연계 ${state.actorUse.duo}회</p>
    </div>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("다른 빌드로 다시 시작", startRun));
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
    <p>속공형과 위험형을 궁수로 먼저 제거하고, 전열이 모이면 전사로 베어보세요.</p>
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
