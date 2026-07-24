const COLOR_META = {
  red: { name: "적색", symbol: "◆" },
  blue: { name: "청색", symbol: "●" },
  yellow: { name: "황색", symbol: "▲" },
};

const MAX_SHIELD = 3;

const ROUND_DATA = [
  {
    name: "기억체 01",
    pattern: "온보딩형",
    goal: "2색 결정로 기본 공격을 익힙니다.",
    colors: ["red", "blue"],
    threshold: 6,
    stacks: [
      "R", "B", "RR", "B", "R",
      "B", "RB", "R", "BR", "B",
      "R", "B", "RR", "B", "R",
      "B", "R", "BR", "R", "B",
      "R", "B", "R", "B", "R",
    ],
    nextIntel: "혼합형 · 3색 등장 · 반격 6탭",
  },
  {
    name: "기억체 02",
    pattern: "규칙 변형",
    goal: "3색과 반격 게이지를 함께 관리합니다.",
    colors: ["red", "blue", "yellow"],
    threshold: 6,
    stacks: [
      "RY", "B", "YB", "R", "BR",
      "Y", "RB", "Y", "BY", "R",
      "B", "YR", "R", "BB", "Y",
      "RY", "B", "Y", "RB", "B",
      "Y", "R", "BY", "R", "Y",
    ],
    nextIntel: "분산형 · 황색 비중 높음 · 반격 5탭",
  },
  {
    name: "기억체 03",
    pattern: "압박형",
    goal: "획득한 능력으로 분산된 결정을 효율화합니다.",
    colors: ["red", "blue", "yellow"],
    threshold: 5,
    stacks: [
      "YB", "R", "BY", "R", "YR",
      "B", "YR", "B", "RY", "Y",
      "RB", "Y", "BR", "Y", "RB",
      "Y", "BR", "Y", "RB", "B",
      "RY", "B", "YR", "B", "Y",
    ],
    nextIntel: "종합형 · 다층 결정 · 반격 5탭",
  },
  {
    name: "핵심 기억체",
    pattern: "종합 검증",
    goal: "완성한 빌드로 다층 결정을 제거합니다.",
    colors: ["red", "blue", "yellow"],
    threshold: 5,
    stacks: [
      "RYB", "BR", "YB", "RY", "BRY",
      "BY", "YRB", "RB", "YR", "BYR",
      "RB", "YB", "BRY", "YR", "RYB",
      "YR", "BRY", "YB", "RB", "BY",
      "BRY", "YR", "RB", "BYR", "RY",
    ],
    nextIntel: "런 결과 분석",
  },
];

const ABILITIES = {
  red_chain: {
    id: "red_chain",
    color: "red",
    name: "적색 연쇄",
    description: "적색 공격 시 능력 레벨만큼 다른 색의 노출 결정도 제거합니다.",
  },
  blue_reroll: {
    id: "blue_reroll",
    color: "blue",
    name: "청색 재배열",
    description: "라운드마다 능력 레벨만큼 색 정령 후보를 재배열할 수 있습니다.",
  },
  yellow_guard: {
    id: "yellow_guard",
    color: "yellow",
    name: "황색 보호",
    description: "라운드마다 능력 레벨만큼 황색 공격의 반격 게이지를 막습니다.",
  },
};

const state = {
  round: 0,
  shield: MAX_SHIELD,
  counter: 0,
  taps: 0,
  totalTaps: 0,
  board: [],
  initialLayers: 0,
  candidates: [],
  abilities: {},
  colorUse: { red: 0, blue: 0, yellow: 0 },
  rerollsLeft: 0,
  yellowGuardsUsed: 0,
  locked: true,
};

const refs = {
  blockLabel: document.querySelector("#blockLabel"),
  roundLabel: document.querySelector("#roundLabel"),
  shieldDisplay: document.querySelector("#shieldDisplay"),
  counterDisplay: document.querySelector("#counterDisplay"),
  patternLabel: document.querySelector("#patternLabel"),
  enemyName: document.querySelector("#enemyName"),
  roundGoal: document.querySelector("#roundGoal"),
  crystalGrid: document.querySelector("#crystalGrid"),
  damageFlash: document.querySelector("#damageFlash"),
  clearProgress: document.querySelector("#clearProgress"),
  clearPercent: document.querySelector("#clearPercent"),
  abilityChips: document.querySelector("#abilityChips"),
  spiritChoices: document.querySelector("#spiritChoices"),
  tapCount: document.querySelector("#tapCount"),
  feedbackText: document.querySelector("#feedbackText"),
  rerollButton: document.querySelector("#rerollButton"),
  rerollCount: document.querySelector("#rerollCount"),
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

function getDominantColor() {
  return Object.entries(state.colorUse).sort((a, b) => b[1] - a[1])[0][0];
}

function getNextPatternColor() {
  const next = ROUND_DATA[Math.min(state.round + 1, ROUND_DATA.length - 1)];
  const counts = { red: 0, blue: 0, yellow: 0 };
  next.stacks.forEach((stackString) => {
    normalizeStack(stackString).forEach((color) => {
      counts[color] += 1;
    });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function makeCandidate() {
  const currentRound = ROUND_DATA[state.round];
  const exposed = new Set(state.board.map(topColor).filter(Boolean));
  const validColors = currentRound.colors.filter((color) => exposed.has(color));
  const pool = validColors.length ? validColors : currentRound.colors;
  return pool[Math.floor(Math.random() * pool.length)];
}

function ensureCandidateVariety() {
  const exposed = [...new Set(state.board.map(topColor).filter(Boolean))];
  if (!exposed.length) return;

  const hasPlayable = state.candidates.some((color) => exposed.includes(color));
  if (!hasPlayable) {
    state.candidates[0] = exposed[0];
  }
}

function refillCandidates() {
  while (state.candidates.length < 3) {
    state.candidates.push(makeCandidate());
  }
  ensureCandidateVariety();
}

function startRun() {
  Object.assign(state, {
    round: 0,
    shield: MAX_SHIELD,
    counter: 0,
    taps: 0,
    totalTaps: 0,
    board: [],
    initialLayers: 0,
    candidates: [],
    abilities: {},
    colorUse: { red: 0, blue: 0, yellow: 0 },
    rerollsLeft: 0,
    yellowGuardsUsed: 0,
    locked: false,
  });
  closeModal();
  loadRound(0);
}

function loadRound(roundIndex) {
  const data = ROUND_DATA[roundIndex];
  state.round = roundIndex;
  state.counter = 0;
  state.taps = 0;
  state.board = data.stacks.map(normalizeStack);
  state.initialLayers = countLayers();
  state.candidates = [];
  state.rerollsLeft = state.abilities.blue_reroll || 0;
  state.yellowGuardsUsed = 0;
  state.locked = false;
  refillCandidates();
  refs.feedbackText.textContent = "색 정령을 탭하면 같은 색 결정이 공격됩니다.";
  render();
}

function render() {
  renderHeader();
  renderCounter();
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

function renderBoard() {
  refs.crystalGrid.innerHTML = "";
  state.board.forEach((stack, index) => {
    const cell = document.createElement("div");
    const color = topColor(stack);
    cell.className = `crystal-cell${color ? "" : " is-empty"}`;
    cell.dataset.cellIndex = String(index);
    if (color) cell.dataset.color = color;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", color ? `${COLOR_META[color].name} 결정, ${stack.length}층` : "제거된 결정");
    cell.innerHTML = color
      ? `<span class="symbol">${COLOR_META[color].symbol}</span>${stack.length > 1 ? `<i class="depth">${stack.length}F</i>` : ""}`
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
    chip.dataset.color = ability.color;
    chip.textContent = `${COLOR_META[ability.color].symbol} ${ability.name} Lv.${level}`;
    refs.abilityChips.appendChild(chip);
  });
}

function renderCandidates() {
  refs.spiritChoices.innerHTML = "";
  state.candidates.forEach((color, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "spirit-button";
    button.dataset.color = color;
    button.setAttribute("aria-label", `${COLOR_META[color].name} 색 정령 선택`);
    button.disabled = state.locked;
    button.innerHTML = `
      <span class="spirit-symbol">${COLOR_META[color].symbol}</span>
      <small>${COLOR_META[color].name} 정령</small>
    `;
    button.addEventListener("click", () => attackWithCandidate(index));
    refs.spiritChoices.appendChild(button);
  });

  const hasReroll = state.rerollsLeft > 0;
  refs.rerollButton.hidden = !hasReroll;
  refs.rerollCount.textContent = hasReroll ? `×${state.rerollsLeft}` : "";
}

function removeExtraVisibleCell(excludedColor) {
  const candidateIndexes = state.board
    .map((stack, index) => ({ stack, index }))
    .filter(({ stack }) => stack.length && topColor(stack) !== excludedColor)
    .map(({ index }) => index);

  if (!candidateIndexes.length) return 0;
  const index = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
  state.board[index].shift();
  return 1;
}

function attackWithCandidate(candidateIndex) {
  if (state.locked) return;
  const color = state.candidates[candidateIndex];
  const targetIndexes = state.board
    .map((stack, index) => ({ stack, index }))
    .filter(({ stack }) => topColor(stack) === color)
    .map(({ index }) => index);

  if (!targetIndexes.length) {
    refs.feedbackText.textContent = `${COLOR_META[color].name} 결정이 표면에 없습니다. 정령은 소모되지 않았습니다.`;
    pulseInvalid(color);
    return;
  }

  state.locked = true;
  targetIndexes.forEach((index) => state.board[index].shift());
  let extra = 0;

  const redLevel = state.abilities.red_chain || 0;
  if (color === "red" && redLevel > 0) {
    for (let count = 0; count < redLevel; count += 1) {
      extra += removeExtraVisibleCell("red");
    }
  }

  const guardLevel = state.abilities.yellow_guard || 0;
  const guardTriggered = color === "yellow"
    && guardLevel > 0
    && state.yellowGuardsUsed < guardLevel;
  if (guardTriggered) state.yellowGuardsUsed += 1;

  state.taps += 1;
  state.totalTaps += 1;
  state.colorUse[color] += 1;
  if (!guardTriggered) state.counter += 1;

  const removedCount = targetIndexes.length + extra;
  refs.feedbackText.textContent = `${COLOR_META[color].name} 공격으로 결정 ${removedCount}개 제거${guardTriggered ? " · 반격 게이지 방어" : ""}`;
  state.candidates.splice(candidateIndex, 1);
  refillCandidates();
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

function pulseInvalid(color) {
  document.querySelectorAll(".crystal-cell").forEach((cell) => {
    if (cell.dataset.color === color) {
      cell.animate(
        [{ filter: "brightness(1)" }, { filter: "brightness(1.8)" }, { filter: "brightness(1)" }],
        { duration: 360 },
      );
    }
  });
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
  refs.modalEyebrow.textContent = "4 ROUND PLAYTEST";
  refs.modalTitle.textContent = "결정을 지우는 것이 곧 공격입니다";
  refs.modalBody.innerHTML = `
    <p>하단의 색 정령을 탭하면 표면에 노출된 같은 색 결정이 한 번에 제거됩니다.</p>
    <ul>
      <li>결정을 모두 제거하면 라운드 클리어</li>
      <li>탭할 때마다 반격 게이지 증가</li>
      <li>R1·R3 종료 후 능력 3개 중 하나 선택</li>
      <li>R4에서 완성한 빌드 검증</li>
    </ul>
  `;
  refs.modalActions.innerHTML = "";
  const startButton = makePrimaryButton("4라운드 시작", startRun);
  refs.modalActions.appendChild(startButton);
  openModal();
}

function showHelpModal() {
  const wasLocked = state.locked;
  state.locked = true;
  renderCandidates();
  refs.modalEyebrow.textContent = "HOW TO PLAY";
  refs.modalTitle.textContent = "한 번의 선택, 즉시 공격";
  refs.modalBody.innerHTML = `
    <p><strong>◆ 적색 · ● 청색 · ▲ 황색</strong> 기호와 색을 함께 확인하세요.</p>
    <ul>
      <li>색 정령을 탭하면 같은 색의 노출 결정이 제거됩니다.</li>
      <li>결정 우측 하단의 숫자는 남은 층 수입니다.</li>
      <li>반격 게이지가 가득 차면 보호막이 1칸 감소합니다.</li>
      <li>능력 선택에서는 강화·대응·전환 중 하나를 고릅니다.</li>
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
  const dominant = getDominantColor();
  const nextColor = getNextPatternColor();
  refs.modalEyebrow.textContent = `ROUND ${state.round + 1} CLEAR · ABILITY PICK`;
  refs.modalTitle.textContent = "능력 하나를 선택하세요";
  refs.modalBody.innerHTML = `
    <div class="intel-card">
      <strong>다음 라운드 예고</strong>
      ${ROUND_DATA[state.round].nextIntel}
    </div>
    <p>현재 빌드 강화, 다음 상황 대응, 다른 색 계열 전환의 세 선택지를 제공합니다.</p>
  `;
  refs.modalActions.innerHTML = "";

  Object.values(ABILITIES).forEach((ability) => {
    const role = ability.color === dominant
      ? "현재 강화"
      : ability.color === nextColor
        ? "다음 대응"
        : "빌드 전환";
    const level = state.abilities[ability.id] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ability-option";
    button.dataset.color = ability.color;
    button.innerHTML = `
      <span class="option-symbol">${COLOR_META[ability.color].symbol}</span>
      <span>
        <strong>${ability.name}${level ? ` Lv.${level} → Lv.${Math.min(level + 1, 2)}` : ""}</strong>
        <small>${ability.description}</small>
      </span>
      <span class="option-role">${role}</span>
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
  if (state.shield === MAX_SHIELD && state.totalTaps <= 20) return "S";
  if (state.shield >= 2 && state.totalTaps <= 25) return "A";
  if (state.shield >= 1) return "B";
  return "C";
}

function showResultModal() {
  const grade = calculateGrade();
  const dominant = getDominantColor();
  refs.modalEyebrow.textContent = "BLOCK A COMPLETE";
  refs.modalTitle.textContent = "기억 복원이 완료되었습니다";
  refs.modalBody.innerHTML = `
    <div class="result-card">
      <strong>복원 등급</strong>
      <div class="result-grade">${grade}</div>
      <p>주력 계열: ${COLOR_META[dominant].symbol} ${COLOR_META[dominant].name}</p>
      <p>총 탭 수: ${state.totalTaps} · 잔여 보호막: ${state.shield}</p>
      <p>획득 능력: ${Object.keys(state.abilities).length || 0}종</p>
    </div>
    <p>실제 포트폴리오에서는 이 결과를 탭 수·피격·능력 선택률 테스트 데이터와 연결합니다.</p>
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
    <p>색 제거 순서와 능력 선택을 바꿔 반격 횟수를 줄여보세요.</p>
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

refs.rerollButton.addEventListener("click", () => {
  if (state.locked || state.rerollsLeft <= 0) return;
  state.rerollsLeft -= 1;
  state.candidates = [];
  refillCandidates();
  refs.feedbackText.textContent = "청색 재배열로 색 정령 후보를 교체했습니다.";
  renderCandidates();
});

refs.helpButton.addEventListener("click", showHelpModal);

showIntroModal();
render();
