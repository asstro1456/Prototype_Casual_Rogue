const COLOR_META = {
  red: { name: "적색", symbol: "◆" },
  blue: { name: "청색", symbol: "●" },
  yellow: { name: "황색", symbol: "▲" },
};

const ACTOR_META = {
  melee: { name: "근접", action: "베기", symbol: "⚔" },
  archer: { name: "궁수", action: "관통", symbol: "➶" },
  duo: { name: "연계", action: "교차 공격", symbol: "✦" },
};

const MAX_SHIELD = 3;
const BOARD_SIZE = 5;
const BASE_LINK_THRESHOLD = 3;
const BASE_PIERCE_DEPTH = 2;

const ROUND_DATA = [
  {
    name: "기억체 01",
    pattern: "교대 훈련",
    goal: "넓은 덩어리는 베고, 두꺼운 결정은 관통하세요.",
    threshold: 6,
    stacks: [
      "R", "R", "RB", "B", "B",
      "R", "RR", "RB", "B", "BB",
      "R", "R", "B", "B", "B",
      "B", "BR", "B", "R", "R",
      "B", "B", "BR", "R", "RR",
    ],
    nextIntel: "혼합형 · 3색 등장 · 반격 6탭",
  },
  {
    name: "기억체 02",
    pattern: "삼색 혼합",
    goal: "공격 위치와 다음에 드러날 색을 함께 판단하세요.",
    threshold: 6,
    stacks: [
      "RY", "R", "B", "BY", "B",
      "R", "RY", "B", "B", "YB",
      "Y", "YB", "BR", "R", "YR",
      "Y", "B", "BR", "R", "R",
      "BY", "B", "Y", "Y", "RY",
    ],
    nextIntel: "분산형 · 작은 덩어리 증가 · 반격 5탭",
  },
  {
    name: "기억체 03",
    pattern: "분산 압박",
    goal: "교대 공격으로 연계를 준비해 행동 수를 줄이세요.",
    threshold: 5,
    stacks: [
      "YB", "Y", "R", "RB", "B",
      "Y", "BR", "R", "B", "BY",
      "R", "R", "YB", "Y", "B",
      "RB", "B", "Y", "RY", "Y",
      "B", "BR", "R", "Y", "YR",
    ],
    nextIntel: "종합형 · 최대 4층 결정 · 반격 5탭",
  },
  {
    name: "핵심 기억체",
    pattern: "종합 검증",
    goal: "완성한 근접·궁수·연계 빌드로 핵심을 돌파하세요.",
    threshold: 5,
    stacks: [
      "RYBR", "RY", "B", "BYR", "B",
      "R", "RYB", "B", "YB", "Y",
      "YR", "Y", "BRY", "R", "RY",
      "B", "BRY", "B", "YR", "Y",
      "BYR", "B", "R", "RYB", "R",
    ],
    nextIntel: "런 결과 분석",
  },
];

const ABILITIES = {
  spin_slash: {
    id: "spin_slash",
    role: "melee",
    name: "회전 베기",
    description: "Lv.1은 상하좌우, Lv.2는 대각선까지 주변 표면을 추가 파괴합니다.",
  },
  piercing_arrow: {
    id: "piercing_arrow",
    role: "archer",
    name: "관통 화살",
    description: "궁수 공격의 관통 깊이가 기본 2층에서 레벨마다 1층 증가합니다.",
  },
  crossfire: {
    id: "crossfire",
    role: "duo",
    name: "교차 사격",
    description: "연계 공격에 필요한 교대 횟수가 기본 3회에서 레벨마다 1회 감소합니다.",
  },
};

const state = {
  round: 0,
  shield: MAX_SHIELD,
  counter: 0,
  link: 0,
  lastActor: null,
  taps: 0,
  totalTaps: 0,
  board: [],
  initialLayers: 0,
  candidates: [],
  abilities: {},
  actorUse: { melee: 0, archer: 0, duo: 0 },
  locked: true,
};

const refs = {
  blockLabel: document.querySelector("#blockLabel"),
  roundLabel: document.querySelector("#roundLabel"),
  shieldDisplay: document.querySelector("#shieldDisplay"),
  counterDisplay: document.querySelector("#counterDisplay"),
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

function normalizeStack(stackString) {
  const map = { R: "red", B: "blue", Y: "yellow" };
  return stackString.split("").map((code) => map[code]);
}

function countLayers(board = state.board) {
  return board.reduce((sum, stack) => sum + stack.length, 0);
}

function topColor(stack) {
  return stack.length ? stack[0] : null;
}

function getCardinalNeighbors(index) {
  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  const neighbors = [];
  if (row > 0) neighbors.push(index - BOARD_SIZE);
  if (row < BOARD_SIZE - 1) neighbors.push(index + BOARD_SIZE);
  if (column > 0) neighbors.push(index - 1);
  if (column < BOARD_SIZE - 1) neighbors.push(index + 1);
  return neighbors;
}

function getAllNeighbors(index) {
  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (
        nextRow >= 0
        && nextRow < BOARD_SIZE
        && nextColumn >= 0
        && nextColumn < BOARD_SIZE
      ) {
        neighbors.push((nextRow * BOARD_SIZE) + nextColumn);
      }
    }
  }

  return neighbors;
}

function getConnectedGroups() {
  const visited = new Set();
  const groups = [];

  state.board.forEach((stack, startIndex) => {
    const color = topColor(stack);
    if (!color || visited.has(startIndex)) return;

    const indexes = [];
    const queue = [startIndex];
    visited.add(startIndex);

    while (queue.length) {
      const index = queue.shift();
      indexes.push(index);
      getCardinalNeighbors(index).forEach((neighborIndex) => {
        if (
          !visited.has(neighborIndex)
          && topColor(state.board[neighborIndex]) === color
        ) {
          visited.add(neighborIndex);
          queue.push(neighborIndex);
        }
      });
    }

    groups.push({
      id: `${color}-${Math.min(...indexes)}`,
      color,
      indexes,
    });
  });

  return groups;
}

function getPierceDepth() {
  return BASE_PIERCE_DEPTH + (state.abilities.piercing_arrow || 0);
}

function getLinkThreshold() {
  return Math.max(1, BASE_LINK_THRESHOLD - (state.abilities.crossfire || 0));
}

function getGroupDepth(group) {
  return Math.max(...group.indexes.map((index) => state.board[index].length));
}

function makeMeleeCandidate(group) {
  return {
    type: "melee",
    color: group.color,
    targetIndexes: [...group.indexes],
    targetIndex: group.indexes[0],
    value: group.indexes.length,
  };
}

function makeArcherCandidate(index) {
  const stack = state.board[index];
  return {
    type: "archer",
    color: topColor(stack),
    targetIndexes: [index],
    targetIndex: index,
    value: Math.min(stack.length, getPierceDepth()),
  };
}

function makeDuoCandidate(group) {
  const targetIndex = [...group.indexes]
    .sort((left, right) => state.board[right].length - state.board[left].length)[0];
  return {
    type: "duo",
    color: group.color,
    targetIndexes: [...group.indexes],
    targetIndex,
    value: group.indexes.length + Math.min(2, Math.max(0, state.board[targetIndex].length - 1)),
  };
}

function buildActionChoices() {
  const groups = getConnectedGroups();
  if (!groups.length) return [];

  const meleePool = [...groups]
    .sort((left, right) => {
      const sizeDifference = right.indexes.length - left.indexes.length;
      return sizeDifference || getGroupDepth(right) - getGroupDepth(left);
    });

  const archerPool = state.board
    .map((stack, index) => ({ index, depth: stack.length }))
    .filter(({ depth }) => depth > 0)
    .sort((left, right) => right.depth - left.depth);

  const choices = [
    makeMeleeCandidate(meleePool[0]),
    makeArcherCandidate(archerPool[0].index),
  ];

  if (state.link >= getLinkThreshold()) {
    choices.push(makeDuoCandidate(meleePool[0]));
  } else if (state.taps % 2 === 0 && meleePool[1]) {
    choices.push(makeMeleeCandidate(meleePool[1]));
  } else {
    const alternateArcher = archerPool.find(({ index }) => index !== archerPool[0].index);
    choices.push(
      alternateArcher
        ? makeArcherCandidate(alternateArcher.index)
        : makeMeleeCandidate(meleePool[Math.min(1, meleePool.length - 1)]),
    );
  }

  return choices;
}

function startRun() {
  Object.assign(state, {
    round: 0,
    shield: MAX_SHIELD,
    counter: 0,
    link: 0,
    lastActor: null,
    taps: 0,
    totalTaps: 0,
    board: [],
    initialLayers: 0,
    candidates: [],
    abilities: {},
    actorUse: { melee: 0, archer: 0, duo: 0 },
    locked: false,
  });
  closeModal();
  loadRound(0);
}

function loadRound(roundIndex) {
  const data = ROUND_DATA[roundIndex];
  state.round = roundIndex;
  state.counter = 0;
  state.link = 0;
  state.lastActor = null;
  state.taps = 0;
  state.board = data.stacks.map(normalizeStack);
  state.initialLayers = countLayers();
  state.locked = false;
  state.candidates = buildActionChoices();
  refs.feedbackText.textContent = "번호가 표시된 공격 후보 하나를 탭하세요.";
  render();
}

function render() {
  renderHeader();
  renderCounter();
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
  refs.shieldDisplay.textContent = `${"◆".repeat(state.shield)}${"◇".repeat(MAX_SHIELD - state.shield)}`;
  refs.tapCount.textContent = `탭 ${state.taps}회`;

  document.querySelectorAll("[data-round-dot]").forEach((dot, index) => {
    dot.classList.toggle("is-current", index === state.round);
    dot.classList.toggle("is-complete", index < state.round);
  });
}

function renderCounter() {
  const threshold = ROUND_DATA[state.round].threshold;
  refs.counterDisplay.innerHTML = "";
  for (let index = 0; index < threshold; index += 1) {
    const pip = document.createElement("i");
    pip.classList.toggle("is-filled", index < state.counter);
    refs.counterDisplay.appendChild(pip);
  }
  refs.counterDisplay.setAttribute("aria-label", `반격 게이지 ${state.counter} / ${threshold}`);
}

function renderLink() {
  const threshold = getLinkThreshold();
  refs.linkDisplay.innerHTML = "";
  for (let index = 0; index < threshold; index += 1) {
    const pip = document.createElement("i");
    pip.classList.toggle("is-filled", index < state.link);
    refs.linkDisplay.appendChild(pip);
  }
  refs.linkDisplay.classList.toggle("is-ready", state.link >= threshold);
  refs.linkDisplay.setAttribute(
    "aria-label",
    state.link >= threshold ? "연계 공격 준비 완료" : `연계 게이지 ${state.link} / ${threshold}`,
  );
}

function getCandidateSlotsForCell(cellIndex) {
  return state.candidates
    .map((candidate, candidateIndex) => (
      candidate.targetIndexes.includes(cellIndex) ? candidateIndex + 1 : null
    ))
    .filter(Boolean);
}

function renderBoard() {
  refs.crystalGrid.innerHTML = "";
  state.board.forEach((stack, index) => {
    const cell = document.createElement("div");
    const color = topColor(stack);
    const candidateSlots = getCandidateSlotsForCell(index);
    cell.className = `crystal-cell${color ? "" : " is-empty"}${candidateSlots.length ? " has-target" : ""}`;
    cell.dataset.cellIndex = String(index);
    if (color) cell.dataset.color = color;
    if (candidateSlots.length) cell.dataset.targetSlots = candidateSlots.join(" ");
    cell.setAttribute("role", "gridcell");
    cell.setAttribute(
      "aria-label",
      color
        ? `${COLOR_META[color].name} 결정, ${stack.length}층, 행동 후보 ${candidateSlots.join(", ")}의 대상`
        : "제거된 결정",
    );
    cell.innerHTML = color
      ? `
        <span class="symbol">${COLOR_META[color].symbol}</span>
        ${stack.length > 1 ? `<i class="depth">${stack.length}F</i>` : ""}
        <span class="target-markers">
          ${candidateSlots.map((slot) => `<i data-slot="${slot}">${slot}</i>`).join("")}
        </span>
      `
      : "";
    refs.crystalGrid.appendChild(cell);
  });

  const remaining = countLayers();
  const progress = state.initialLayers
    ? Math.round(((state.initialLayers - remaining) / state.initialLayers) * 100)
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
  if (candidate.type === "melee") {
    return `${COLOR_META[candidate.color].name} 연결 ${candidate.targetIndexes.length}칸`;
  }
  if (candidate.type === "archer") {
    return `${COLOR_META[candidate.color].name} ${candidate.value}층 관통`;
  }
  return `${COLOR_META[candidate.color].name} 표면 + 중심 관통`;
}

function renderCandidates() {
  refs.actionChoices.innerHTML = "";
  state.candidates.forEach((candidate, index) => {
    const actor = ACTOR_META[candidate.type];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button";
    button.dataset.role = candidate.type;
    button.dataset.color = candidate.color;
    button.setAttribute(
      "aria-label",
      `${index + 1}번 ${actor.name} ${actor.action}, ${getCandidateDescription(candidate)}`,
    );
    button.disabled = state.locked;
    button.innerHTML = `
      <span class="candidate-number">${index + 1}</span>
      <span class="action-symbol">${actor.symbol}</span>
      <strong>${actor.name} · ${actor.action}</strong>
      <small>${COLOR_META[candidate.color].symbol} ${getCandidateDescription(candidate)}</small>
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
  document.querySelectorAll(".crystal-cell").forEach((cell) => {
    const slots = (cell.dataset.targetSlots || "").split(" ");
    cell.classList.toggle("is-focused-target", Boolean(slot) && slots.includes(String(slot)));
  });
}

function removeLayer(index, amount = 1) {
  let removed = 0;
  while (removed < amount && state.board[index].length) {
    state.board[index].shift();
    removed += 1;
  }
  return removed;
}

function performMeleeAttack(candidate) {
  const targetSet = new Set(candidate.targetIndexes);
  const sweepLevel = state.abilities.spin_slash || 0;
  const splashIndexes = new Set();

  if (sweepLevel > 0) {
    candidate.targetIndexes.forEach((index) => {
      const neighbors = sweepLevel >= 2 ? getAllNeighbors(index) : getCardinalNeighbors(index);
      neighbors.forEach((neighborIndex) => {
        if (!targetSet.has(neighborIndex) && state.board[neighborIndex].length) {
          splashIndexes.add(neighborIndex);
        }
      });
    });
  }

  let removed = 0;
  candidate.targetIndexes.forEach((index) => {
    removed += removeLayer(index);
  });
  splashIndexes.forEach((index) => {
    removed += removeLayer(index);
  });
  return { removed, splash: splashIndexes.size };
}

function performArcherAttack(candidate) {
  const depth = getPierceDepth();
  return {
    removed: removeLayer(candidate.targetIndex, depth),
    depth,
  };
}

function performDuoAttack(candidate) {
  let removed = 0;
  candidate.targetIndexes.forEach((index) => {
    removed += removeLayer(index);
  });
  const pierced = removeLayer(candidate.targetIndex, BASE_PIERCE_DEPTH);
  removed += pierced;
  return { removed, pierced };
}

function updateLink(type) {
  if (type === "duo") {
    state.link = 0;
    state.lastActor = null;
    return;
  }

  if (state.lastActor && state.lastActor !== type) {
    state.link = Math.min(getLinkThreshold(), state.link + 1);
  }
  state.lastActor = type;
}

function attackWithCandidate(candidateIndex) {
  if (state.locked) return;
  const candidate = state.candidates[candidateIndex];
  if (!candidate) return;

  state.locked = true;
  let result;

  if (candidate.type === "melee") {
    result = performMeleeAttack(candidate);
  } else if (candidate.type === "archer") {
    result = performArcherAttack(candidate);
  } else {
    result = performDuoAttack(candidate);
  }

  state.taps += 1;
  state.totalTaps += 1;
  state.counter += 1;
  state.actorUse[candidate.type] += 1;
  updateLink(candidate.type);

  const actor = ACTOR_META[candidate.type];
  const detail = candidate.type === "melee" && result.splash
    ? ` · 주변 ${result.splash}칸 추가 타격`
    : candidate.type === "archer"
      ? ` · 최대 ${result.depth}층 관통`
      : candidate.type === "duo"
        ? ` · 중심 ${result.pierced}층 추가 관통`
        : "";
  const linkReady = state.link >= getLinkThreshold();
  refs.feedbackText.textContent = `${actor.name} ${actor.action}로 결정 ${result.removed}개 제거${detail}${linkReady ? " · 연계 공격 준비 완료" : ""}`;
  flashDamage();

  const threshold = ROUND_DATA[state.round].threshold;
  const boardCleared = countLayers() === 0;
  if (state.counter >= threshold && !boardCleared) {
    state.counter = 0;
    state.shield -= 1;
    refs.feedbackText.textContent += " · 적의 반격으로 보호막 1칸 손실";
  } else if (state.counter >= threshold && boardCleared) {
    state.counter = 0;
    refs.feedbackText.textContent += " · 마무리 공격으로 반격 무효";
  }

  state.candidates = boardCleared ? [] : buildActionChoices();
  render();

  if (state.shield <= 0) {
    window.setTimeout(showFailModal, 420);
    return;
  }

  if (boardCleared) {
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
  refs.modalEyebrow.textContent = "4 ROUND DUO PLAYTEST";
  refs.modalTitle.textContent = "넓게 베고, 깊게 꿰뚫으세요";
  refs.modalBody.innerHTML = `
    <p>번호가 표시된 행동 후보 하나를 탭하면 두 캐릭터가 즉시 공격합니다.</p>
    <ul>
      <li><strong>근접</strong>: 연결된 같은 색 덩어리의 표면을 한 번에 제거</li>
      <li><strong>궁수</strong>: 선택된 결정 하나를 기본 2층 관통</li>
      <li><strong>연계</strong>: 근접과 궁수를 교대해 게이지를 채우면 등장</li>
      <li>반격 전에 모든 결정을 제거하면 라운드 클리어</li>
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
  refs.modalTitle.textContent = "세 후보 중 하나를 탭하세요";
  refs.modalBody.innerHTML = `
    <p>판의 <strong>1·2·3 번호</strong>와 하단 행동 후보의 번호가 공격 위치를 표시합니다.</p>
    <ul>
      <li>근접은 상하좌우로 연결된 같은 색 표면을 공격합니다.</li>
      <li>궁수는 표시된 한 칸을 깊게 관통합니다.</li>
      <li>근접과 궁수를 번갈아 쓰면 연계 게이지가 증가합니다.</li>
      <li>연계 준비가 끝나면 세 번째 후보에 합동 공격이 등장합니다.</li>
      <li>반격 게이지가 가득 차면 보호막이 1칸 감소합니다.</li>
    </ul>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("계속하기", () => {
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
    <p>근접의 범위, 궁수의 깊이, 두 캐릭터의 연계 중 하나를 강화합니다.</p>
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
  refs.modalTitle.textContent = "다음 기억체가 감지되었습니다";
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
  if (state.shield >= 2 && state.totalTaps <= 30) return "A";
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
  refs.modalTitle.textContent = "기억 복원이 완료되었습니다";
  refs.modalBody.innerHTML = `
    <div class="result-card">
      <strong>복원 등급</strong>
      <div class="result-grade">${grade}</div>
      <p>주력 전술: ${ACTOR_META[dominantTactic].symbol} ${ACTOR_META[dominantTactic].name}</p>
      <p>총 탭 수: ${state.totalTaps} · 잔여 보호막: ${state.shield}</p>
      <p>근접 ${state.actorUse.melee}회 · 궁수 ${state.actorUse.archer}회 · 연계 ${state.actorUse.duo}회</p>
    </div>
    <p>다른 능력과 공격 순서를 선택해 행동 수와 피격 횟수를 비교할 수 있습니다.</p>
  `;
  refs.modalActions.innerHTML = "";
  refs.modalActions.appendChild(makePrimaryButton("다른 빌드로 다시 시작", startRun));
  openModal();
}

function showFailModal() {
  refs.modalEyebrow.textContent = "RUN FAILED";
  refs.modalTitle.textContent = "보호막이 모두 소진되었습니다";
  refs.modalBody.innerHTML = `
    <div class="result-card">
      <strong>도달 기록</strong>
      <p>ROUND ${state.round + 1} · 총 탭 ${state.totalTaps}회</p>
    </div>
    <p>넓은 덩어리는 근접으로, 두꺼운 결정은 궁수로 처리하고 교대 공격을 이어가 보세요.</p>
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

showIntroModal();
render();
