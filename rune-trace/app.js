const APP_VERSION = "0.0.4";
const APP_VERSION_NAME = "RUNE TRACE";
const BOARD_SIZE = 7;
const RUNES_PER_FLOOR = 4;

const RUNE_TEMPLATES = [
  {
    id: "line",
    name: "일섬",
    hint: "일자",
    points: [[0, 0], [1, 0], [2, 0], [3, 0]],
  },
  {
    id: "corner",
    name: "굽은 뿔",
    hint: "ㄴ자",
    points: [[0, 0], [1, 0], [2, 0], [2, 1]],
  },
  {
    id: "diagonal",
    name: "별의 사선",
    hint: "대각선",
    points: [[0, 0], [1, 1], [2, 2], [3, 3]],
  },
  {
    id: "check",
    name: "서약",
    hint: "체크",
    points: [[0, 0], [1, 1], [2, 0], [3, -1]],
  },
  {
    id: "zig",
    name: "여우걸음",
    hint: "지그재그",
    points: [[0, 0], [1, 0], [1, 1], [2, 1]],
  },
  {
    id: "crown",
    name: "쌍봉",
    hint: "두 봉우리",
    points: [[0, 1], [1, 0], [2, 1], [3, 0], [4, 1]],
  },
];

const RUNE_COLORS = ["#72e1ff", "#9ba8ff", "#78e7be", "#ffd27c"];
const TRANSFORMS = [
  ([x, y]) => [x, y],
  ([x, y]) => [-x, y],
  ([x, y]) => [x, -y],
  ([x, y]) => [-x, -y],
  ([x, y]) => [y, x],
  ([x, y]) => [-y, x],
  ([x, y]) => [y, -x],
  ([x, y]) => [-y, -x],
];

const refs = {
  floorDisplay: document.querySelector("#floorDisplay"),
  runeProgress: document.querySelector("#runeProgress"),
  enemyCount: document.querySelector("#enemyCount"),
  experienceCount: document.querySelector("#experienceCount"),
  safeCount: document.querySelector("#safeCount"),
  turnLabel: document.querySelector("#turnLabel"),
  boardGoal: document.querySelector("#boardGoal"),
  board: document.querySelector("#runeBoard"),
  gridCells: document.querySelector("#gridCells"),
  pathLayer: document.querySelector("#pathLayer"),
  runeChoices: document.querySelector("#runeChoices"),
  completeCount: document.querySelector("#completeCount"),
  feedback: document.querySelector("#feedbackText"),
  helpButton: document.querySelector("#helpButton"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalPanel: document.querySelector("#modalPanel"),
  modalClose: document.querySelector("#modalClose"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  modalActions: document.querySelector("#modalActions"),
};

const state = {
  floor: 1,
  runes: [],
  completedPaths: [],
  claimed: new Set(),
  corrupted: new Set(),
  enemies: [],
  currentPath: [],
  drawing: false,
  pointerId: null,
  defeated: 0,
  experience: 0,
  floorStartExperience: 0,
  running: true,
  modalType: "intro",
};

const pathVariantCache = new Map();
const pathSequenceCache = new Map();
const placementVariantCache = new Map();

function cellKey(row, col) {
  return `${row}:${col}`;
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function normalizeFromFirst(points) {
  const [originX, originY] = points[0];
  return points.map(([x, y]) => [x - originX, y - originY]);
}

function sequenceSignature(points) {
  return normalizeFromFirst(points)
    .map(([x, y]) => `${x},${y}`)
    .join("|");
}

function getPathSequences(template) {
  if (pathSequenceCache.has(template.id)) {
    return pathSequenceCache.get(template.id);
  }

  const sequences = new Map();
  TRANSFORMS.forEach((transform) => {
    const transformed = template.points.map(transform);
    [transformed, [...transformed].reverse()].forEach((sequence) => {
      const normalized = normalizeFromFirst(sequence);
      sequences.set(sequenceSignature(normalized), normalized);
    });
  });

  const result = [...sequences.values()];
  pathSequenceCache.set(template.id, result);
  return result;
}

function getPathVariants(template) {
  if (pathVariantCache.has(template.id)) {
    return pathVariantCache.get(template.id);
  }

  const signatures = new Set(
    getPathSequences(template).map((sequence) => sequenceSignature(sequence)),
  );
  pathVariantCache.set(template.id, signatures);
  return signatures;
}

function pathAsRelativePoints(path) {
  return normalizeFromFirst(path.map(({ row, col }) => [col, row]));
}

function isRunePrefix(path, template) {
  if (path.length === 0) {
    return true;
  }
  const relative = pathAsRelativePoints(path);
  return getPathSequences(template).some((sequence) =>
    relative.every(
      ([x, y], index) =>
        sequence[index]?.[0] === x && sequence[index]?.[1] === y,
    ),
  );
}

function getNextStepCandidates(path, template) {
  if (path.length === 0 || path.length >= template.points.length) {
    return [];
  }

  const relative = pathAsRelativePoints(path);
  const candidates = new Map();
  getPathSequences(template).forEach((sequence) => {
    const matches = relative.every(
      ([x, y], index) =>
        sequence[index]?.[0] === x && sequence[index]?.[1] === y,
    );
    if (!matches) {
      return;
    }
    const next = sequence[path.length];
    const current = sequence[path.length - 1];
    const delta = [next[0] - current[0], next[1] - current[1]];
    candidates.set(delta.join(","), delta);
  });
  return [...candidates.values()];
}

function getPlacementVariants(template) {
  if (placementVariantCache.has(template.id)) {
    return placementVariantCache.get(template.id);
  }

  const variants = new Map();
  TRANSFORMS.forEach((transform) => {
    const transformed = template.points.map(transform);
    const minX = Math.min(...transformed.map(([x]) => x));
    const minY = Math.min(...transformed.map(([, y]) => y));
    const normalized = transformed.map(([x, y]) => [x - minX, y - minY]);
    const key = [...normalized]
      .sort(([ax, ay], [bx, by]) => ax - bx || ay - by)
      .map(([x, y]) => `${x},${y}`)
      .join("|");
    if (!variants.has(key)) {
      variants.set(key, normalized);
    }
  });

  const result = [...variants.values()];
  placementVariantCache.set(template.id, result);
  return result;
}

function canTemplateFit(template) {
  return getPlacementVariants(template).some((variant) => {
    const width = Math.max(...variant.map(([x]) => x)) + 1;
    const height = Math.max(...variant.map(([, y]) => y)) + 1;
    for (let top = 0; top <= BOARD_SIZE - height; top += 1) {
      for (let left = 0; left <= BOARD_SIZE - width; left += 1) {
        const isFree = variant.every(([x, y]) => {
          const key = cellKey(top + y, left + x);
          return !state.claimed.has(key) && !state.corrupted.has(key);
        });
        if (isFree) {
          return true;
        }
      }
    }
    return false;
  });
}

function matchesRune(path, template) {
  if (path.length !== template.points.length) {
    return false;
  }
  const points = path.map(({ row, col }) => [col, row]);
  return getPathVariants(template).has(sequenceSignature(points));
}

function chooseRunes() {
  return shuffle(RUNE_TEMPLATES)
    .slice(0, RUNES_PER_FLOOR)
    .map((template, index) => ({
      ...template,
      instanceId: `${state.floor}-${template.id}`,
      color: RUNE_COLORS[index],
      complete: false,
    }));
}

function spawnEnemies() {
  const amount = Math.min(12, 7 + state.floor);
  const positions = shuffle(
    Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
    })),
  ).slice(0, amount);

  state.enemies = positions.map((position, index) => ({
    id: `${state.floor}-enemy-${index}`,
    ...position,
  }));
}

function startFloor(floor, { retry = false } = {}) {
  if (retry) {
    state.experience = state.floorStartExperience;
  } else {
    state.floorStartExperience = state.experience;
  }
  state.floor = floor;
  state.runes = chooseRunes();
  state.completedPaths = [];
  state.claimed = new Set();
  state.corrupted = new Set();
  state.currentPath = [];
  state.drawing = false;
  state.pointerId = null;
  state.defeated = 0;
  state.running = true;
  spawnEnemies();
  setFeedback("목록에 있는 룬을 판 위에 바로 그리세요.");
  render();
}

function remainingRunes() {
  return state.runes.filter((rune) => !rune.complete);
}

function candidateRunesForPath(path) {
  return remainingRunes().filter(
    (rune) =>
      path.length <= rune.points.length &&
      isRunePrefix(path, rune),
  );
}

function miniRuneSvg(rune) {
  const minX = Math.min(...rune.points.map(([x]) => x));
  const maxX = Math.max(...rune.points.map(([x]) => x));
  const minY = Math.min(...rune.points.map(([, y]) => y));
  const maxY = Math.max(...rune.points.map(([, y]) => y));
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const drawableSize = 32;
  const scaleX = spanX > 0 ? drawableSize / spanX : Number.POSITIVE_INFINITY;
  const scaleY = spanY > 0 ? drawableSize / spanY : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (48 - spanX * scale) / 2 - minX * scale;
  const offsetY = (48 - spanY * scale) / 2 - minY * scale;
  const previewPoints = rune.points.map(([x, y]) => ({
    x: x * scale + offsetX,
    y: y * scale + offsetY,
  }));
  const points = previewPoints.map(({ x, y }) => `${x},${y}`).join(" ");
  const nodes = previewPoints
    .map(({ x, y }, index) => {
      const endpoint = index === 0 || index === previewPoints.length - 1;
      return `<circle class="rune-node${endpoint ? " is-endpoint" : ""}" cx="${x}" cy="${y}" r="${endpoint ? 3.8 : 2.8}"></circle>`;
    })
    .join("");
  return `
    <svg class="rune-mini" viewBox="0 0 48 48" aria-hidden="true">
      <polyline points="${points}"></polyline>
      ${nodes}
    </svg>
  `;
}

function renderStatus() {
  const complete = state.runes.filter((rune) => rune.complete).length;
  refs.floorDisplay.textContent = `FLOOR ${String(state.floor).padStart(2, "0")}`;
  refs.enemyCount.textContent = String(state.enemies.length);
  refs.experienceCount.textContent = String(state.experience);
  refs.safeCount.textContent = String(
    BOARD_SIZE * BOARD_SIZE - state.claimed.size - state.corrupted.size,
  );
  refs.completeCount.textContent = `${complete} / ${RUNES_PER_FLOOR}`;
  refs.runeProgress.innerHTML = Array.from(
    { length: RUNES_PER_FLOOR },
    (_, index) => `<i class="${index < complete ? "is-complete" : ""}"></i>`,
  ).join("");

  refs.turnLabel.textContent = "자동 룬 인식";
  refs.boardGoal.textContent =
    complete < RUNES_PER_FLOOR
      ? `남은 룬 ${RUNES_PER_FLOOR - complete}개 중 하나를 그리세요`
      : "모든 룬 완성";
}

function renderBoard() {
  const enemiesByCell = new Map(
    state.enemies.map((enemy) => [cellKey(enemy.row, enemy.col), enemy]),
  );
  const currentKeys = new Set(
    state.currentPath.map(({ row, col }) => cellKey(row, col)),
  );

  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const key = cellKey(row, col);
      const classes = ["grid-cell"];
      if (state.claimed.has(key)) classes.push("is-claimed");
      if (state.corrupted.has(key)) classes.push("is-corrupted");
      if (currentKeys.has(key)) classes.push("is-current");
      const enemy = enemiesByCell.get(key);
      cells.push(`
        <div class="${classes.join(" ")}">
          ${enemy ? '<span class="enemy">◆</span>' : ""}
        </div>
      `);
    }
  }
  refs.gridCells.innerHTML = cells.join("");

  const completedLines = state.completedPaths.map((entry) => {
    const points = entry.path
      .map(({ row, col }) => `${col + 0.5},${row + 0.5}`)
      .join(" ");
    return `<polyline class="completed-path" points="${points}" style="stroke:${entry.color};color:${entry.color}"></polyline>`;
  });

  if (state.currentPath.length > 0) {
    const points = state.currentPath
      .map(({ row, col }) => `${col + 0.5},${row + 0.5}`)
      .join(" ");
    completedLines.push(`<polyline class="preview-path" points="${points}"></polyline>`);
    state.currentPath.forEach(({ row, col }) => {
      completedLines.push(
        `<circle class="path-node" cx="${col + 0.5}" cy="${row + 0.5}" r=".13"></circle>`,
      );
    });
  }
  refs.pathLayer.innerHTML = completedLines.join("");
}

function renderRuneChoices() {
  refs.runeChoices.innerHTML = state.runes
    .map((rune) => {
      const canFit = rune.complete ? true : canTemplateFit(rune);
      const classes = ["rune-card"];
      if (rune.complete) classes.push("is-complete");
      if (!canFit) classes.push("is-impossible");
      const status = rune.complete ? "완성" : canFit ? `${rune.points.length}칸` : "배치 불가";
      return `
        <div
          class="${classes.join(" ")}"
          style="color:${rune.complete ? "#72dca9" : rune.color}"
        >
          ${miniRuneSvg(rune)}
          <b>${rune.name}</b>
          <small>${status}</small>
        </div>
      `;
    })
    .join("");
}

function render() {
  renderStatus();
  renderBoard();
  renderRuneChoices();
}

function setFeedback(message, tone = "") {
  refs.feedback.textContent = message;
  refs.feedback.className = `feedback${tone ? ` is-${tone}` : ""}`;
}

function cellFromPointer(event) {
  const rect = refs.board.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
    return null;
  }
  return {
    row: Math.min(BOARD_SIZE - 1, Math.floor((y / rect.height) * BOARD_SIZE)),
    col: Math.min(BOARD_SIZE - 1, Math.floor((x / rect.width) * BOARD_SIZE)),
  };
}

function diagonalPriorityCell(event) {
  const last = state.currentPath[state.currentPath.length - 1];
  if (!last) {
    return null;
  }

  const diagonalStepsByKey = new Map();
  candidateRunesForPath(state.currentPath).forEach((rune) => {
    getNextStepCandidates(state.currentPath, rune)
      .filter(
        ([colDelta, rowDelta]) =>
          Math.abs(colDelta) === 1 && Math.abs(rowDelta) === 1,
      )
      .forEach((step) => diagonalStepsByKey.set(step.join(","), step));
  });
  const diagonalSteps = [...diagonalStepsByKey.values()];
  if (diagonalSteps.length === 0) {
    return null;
  }

  const rect = refs.board.getBoundingClientRect();
  const pointerCol = ((event.clientX - rect.left) / rect.width) * BOARD_SIZE;
  const pointerRow = ((event.clientY - rect.top) / rect.height) * BOARD_SIZE;
  const colMotion = pointerCol - (last.col + 0.5);
  const rowMotion = pointerRow - (last.row + 0.5);
  const snapThreshold = 0.16;

  const preferred = diagonalSteps
    .filter(
      ([colDelta, rowDelta]) =>
        colMotion * colDelta >= snapThreshold &&
        rowMotion * rowDelta >= snapThreshold,
    )
    .sort(
      ([aCol, aRow], [bCol, bRow]) =>
        colMotion * bCol +
        rowMotion * bRow -
        (colMotion * aCol + rowMotion * aRow),
    )[0];

  if (!preferred) {
    return null;
  }

  const [colDelta, rowDelta] = preferred;
  const cell = {
    row: last.row + rowDelta,
    col: last.col + colDelta,
  };
  if (
    cell.row < 0 ||
    cell.row >= BOARD_SIZE ||
    cell.col < 0 ||
    cell.col >= BOARD_SIZE ||
    isBlocked(cell)
  ) {
    return null;
  }
  return cell;
}

function isBlocked(cell) {
  const key = cellKey(cell.row, cell.col);
  return state.claimed.has(key) || state.corrupted.has(key);
}

function isAdjacent(a, b) {
  const rowDistance = Math.abs(a.row - b.row);
  const colDistance = Math.abs(a.col - b.col);
  return Math.max(rowDistance, colDistance) === 1;
}

function isOrthogonalStep(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function sameCell(a, b) {
  return a?.row === b?.row && a?.col === b?.col;
}

function appendDrawingCell(cell) {
  if (!cell || isBlocked(cell)) {
    return;
  }

  const path = state.currentPath;
  const last = path[path.length - 1];
  if (sameCell(last, cell)) {
    return;
  }

  if (path.length > 1 && sameCell(path[path.length - 2], cell)) {
    path.pop();
    renderBoard();
    return;
  }

  if (last && !isAdjacent(last, cell)) {
    return;
  }

  if (path.some((point) => sameCell(point, cell))) {
    return;
  }

  const candidateRunes = candidateRunesForPath(path);
  const maxLength = Math.max(
    0,
    ...remainingRunes().map((rune) => rune.points.length),
  );
  if (path.length >= maxLength) {
    return;
  }

  const nextSteps = candidateRunes.flatMap((rune) =>
    getNextStepCandidates(path, rune),
  );
  const diagonalOnly =
    nextSteps.length > 0 &&
    nextSteps.every(
      ([colDelta, rowDelta]) =>
        Math.abs(colDelta) === 1 && Math.abs(rowDelta) === 1,
    );
  if (last && diagonalOnly && isOrthogonalStep(last, cell)) {
    return;
  }

  path.push(cell);
  renderBoard();
}

function beginDrawing(event) {
  if (!state.running || state.drawing || remainingRunes().length === 0) {
    return;
  }
  const cell = cellFromPointer(event);
  if (!cell || isBlocked(cell)) {
    setFeedback("완성된 룬과 오염된 칸 위에는 새 룬을 그릴 수 없습니다.", "alert");
    return;
  }

  event.preventDefault();
  state.drawing = true;
  state.pointerId = event.pointerId;
  state.currentPath = [];
  refs.board.setPointerCapture?.(event.pointerId);
  appendDrawingCell(cell);
}

function continueDrawing(event) {
  if (!state.drawing || event.pointerId !== state.pointerId) {
    return;
  }
  event.preventDefault();
  appendDrawingCell(diagonalPriorityCell(event) ?? cellFromPointer(event));
}

function cancelDrawing() {
  state.drawing = false;
  state.pointerId = null;
  state.currentPath = [];
  renderBoard();
}

function finishDrawing(event) {
  if (!state.drawing || event.pointerId !== state.pointerId) {
    return;
  }
  event.preventDefault();
  refs.board.releasePointerCapture?.(event.pointerId);
  state.drawing = false;
  state.pointerId = null;

  const rune = remainingRunes().find((entry) =>
    matchesRune(state.currentPath, entry),
  );
  if (!rune) {
    setFeedback("목록의 남은 룬과 일치하지 않습니다. 다시 그려보세요.", "alert");
    state.currentPath = [];
    renderBoard();
    return;
  }

  commitRune(rune, [...state.currentPath]);
}

function moveEnemies() {
  const occupied = new Set(state.enemies.map((enemy) => cellKey(enemy.row, enemy.col)));
  shuffle(state.enemies).forEach((enemy) => {
    occupied.delete(cellKey(enemy.row, enemy.col));
    const candidates = [];
    for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
      for (let colDelta = -1; colDelta <= 1; colDelta += 1) {
        if (rowDelta === 0 && colDelta === 0) continue;
        const row = enemy.row + rowDelta;
        const col = enemy.col + colDelta;
        const key = cellKey(row, col);
        if (
          row >= 0 &&
          row < BOARD_SIZE &&
          col >= 0 &&
          col < BOARD_SIZE &&
          !state.claimed.has(key) &&
          !state.corrupted.has(key) &&
          !occupied.has(key)
        ) {
          candidates.push({ row, col });
        }
      }
    }
    const destination = candidates[Math.floor(Math.random() * candidates.length)];
    if (destination) {
      enemy.row = destination.row;
      enemy.col = destination.col;
    }
    occupied.add(cellKey(enemy.row, enemy.col));
  });
}

function corruptCells() {
  const enemyCells = new Set(
    state.enemies.map((enemy) => cellKey(enemy.row, enemy.col)),
  );
  const budget = Math.min(3, 1 + Math.ceil(state.enemies.length / 4));
  let corruptedNow = 0;

  for (const enemy of shuffle(state.enemies)) {
    if (corruptedNow >= budget) break;
    const candidates = [];
    for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
      for (let colDelta = -1; colDelta <= 1; colDelta += 1) {
        if (rowDelta === 0 && colDelta === 0) continue;
        const row = enemy.row + rowDelta;
        const col = enemy.col + colDelta;
        const key = cellKey(row, col);
        if (
          row >= 0 &&
          row < BOARD_SIZE &&
          col >= 0 &&
          col < BOARD_SIZE &&
          !state.claimed.has(key) &&
          !state.corrupted.has(key) &&
          !enemyCells.has(key)
        ) {
          candidates.push(key);
        }
      }
    }
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (target) {
      state.corrupted.add(target);
      corruptedNow += 1;
    }
  }
  return corruptedNow;
}

function commitRune(rune, path) {
  const pathKeys = new Set(path.map(({ row, col }) => cellKey(row, col)));
  pathKeys.forEach((key) => state.claimed.add(key));
  rune.complete = true;
  state.completedPaths.push({
    runeId: rune.instanceId,
    color: rune.color,
    path,
  });
  state.currentPath = [];

  const before = state.enemies.length;
  state.enemies = state.enemies.filter(
    (enemy) => !pathKeys.has(cellKey(enemy.row, enemy.col)),
  );
  const defeatedNow = before - state.enemies.length;
  state.defeated += defeatedNow;
  state.experience += defeatedNow;

  if (remainingRunes().length === 0) {
    state.running = false;
    setFeedback(
      `네 개의 룬이 공명했습니다. 적 ${defeatedNow}체를 베고 EXP ${defeatedNow}을 얻었습니다.`,
      "success",
    );
    render();
    window.setTimeout(showClearModal, 260);
    return;
  }

  moveEnemies();
  const corruptedNow = corruptCells();

  const fittingRunes = remainingRunes().filter((entry) => canTemplateFit(entry));
  if (fittingRunes.length === 0) {
    state.running = false;
    setFeedback("오염으로 남은 룬을 놓을 공간이 사라졌습니다.", "alert");
    render();
    window.setTimeout(showFailModal, 260);
    return;
  }

  const killCopy =
    defeatedNow > 0
      ? `적 ${defeatedNow}체 제거 · EXP +${defeatedNow}, `
      : "";
  setFeedback(
    `${rune.name} 완성! ${killCopy}빈 칸 ${corruptedNow}곳이 오염됐습니다.`,
    "success",
  );
  render();
}

function makeAction(label, onClick, primary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (primary) button.classList.add("primary");
  button.addEventListener("click", onClick);
  return button;
}

function openModal({ type, eyebrow, title, body, actions }) {
  state.modalType = type;
  refs.modalEyebrow.textContent = eyebrow;
  refs.modalTitle.innerHTML = title;
  refs.modalBody.innerHTML = body;
  refs.modalActions.innerHTML = "";
  actions.forEach((action) => {
    refs.modalActions.append(
      makeAction(action.label, action.onClick, action.primary),
    );
  });
  refs.modalBackdrop.classList.add("is-open");
  window.setTimeout(() => refs.modalPanel.focus(), 0);
}

function closeModal() {
  refs.modalBackdrop.classList.remove("is-open");
  refs.helpButton.focus({ preventScroll: true });
}

function rulesMarkup() {
  return `
    <p>적을 전부 쓰러뜨리는 대신, <strong>제시된 룬 네 개를 모두 그리면</strong> 층을 통과합니다.</p>
    <div class="rule-list">
      <div class="rule"><b>1</b><span>왼쪽 목록의 룬 중 하나를 그리면 자동으로 인식됩니다.</span></div>
      <div class="rule"><b>2</b><span>룬은 회전·좌우 반전 가능하며, 지나간 적을 처치하면 EXP를 얻습니다.</span></div>
      <div class="rule"><b>3</b><span>살아남은 적은 이동하고 최대 3개의 빈 칸을 오염시킵니다.</span></div>
      <div class="rule"><b>4</b><span>완성 룬과 오염 칸은 다시 쓸 수 없습니다. 네 룬의 자리를 남겨두세요.</span></div>
    </div>
    <p>선을 잘못 그리면 소모 없이 다시 시도할 수 있습니다.</p>
  `;
}

function showIntroModal() {
  openModal({
    type: "intro",
    eyebrow: "NEW PROTOTYPE",
    title: "네 개의 룬으로<br>탑의 문을 여세요",
    body: rulesMarkup(),
    actions: [
      {
        label: "탑에 들어가기",
        primary: true,
        onClick: closeModal,
      },
    ],
  });
}

function showHelpModal() {
  openModal({
    type: "help",
    eyebrow: `FLOOR ${String(state.floor).padStart(2, "0")} · GUIDE`,
    title: "룬을 그리는 법",
    body: rulesMarkup(),
    actions: [
      {
        label: "확인",
        primary: true,
        onClick: closeModal,
      },
    ],
  });
}

function showClearModal() {
  openModal({
    type: "clear",
    eyebrow: "FLOOR CLEAR",
    title: "룬이 공명했습니다",
    body: `
      <p>적을 모두 쓰러뜨리지 않아도 네 개의 궤적이 탑의 문을 열었습니다.</p>
      <div class="result-grid">
        <div><span>처치</span><strong>${state.defeated}</strong></div>
        <div><span>획득 EXP</span><strong>+${state.defeated}</strong></div>
        <div><span>생존 적</span><strong>${state.enemies.length}</strong></div>
      </div>
    `,
    actions: [
      {
        label: "이 층 다시",
        onClick: () => {
          closeModal();
          startFloor(state.floor, { retry: true });
        },
      },
      {
        label: "다음 층",
        primary: true,
        onClick: () => {
          closeModal();
          startFloor(state.floor + 1);
        },
      },
    ],
  });
}

function showFailModal() {
  openModal({
    type: "fail",
    eyebrow: "RUNE SPACE LOST",
    title: "그릴 공간이<br>사라졌습니다",
    body: `
      <p>살아남은 적의 오염이 남은 룬 경로를 막았습니다. 룬으로 적을 더 많이 베거나, 완성 경로의 위치를 바꿔보세요.</p>
      <div class="result-grid">
        <div><span>완성 룬</span><strong>${state.completedPaths.length}</strong></div>
        <div><span>획득 EXP</span><strong>+${state.defeated}</strong></div>
        <div><span>오염 칸</span><strong>${state.corrupted.size}</strong></div>
      </div>
    `,
    actions: [
      {
        label: "이 층 다시",
        primary: true,
        onClick: () => {
          closeModal();
          startFloor(state.floor, { retry: true });
        },
      },
    ],
  });
}

refs.board.addEventListener("pointerdown", beginDrawing);
refs.board.addEventListener("pointermove", continueDrawing);
refs.board.addEventListener("pointerup", finishDrawing);
refs.board.addEventListener("pointercancel", cancelDrawing);
refs.board.addEventListener("lostpointercapture", () => {
  if (state.drawing) cancelDrawing();
});

refs.helpButton.addEventListener("click", showHelpModal);
refs.modalClose.addEventListener("click", closeModal);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && refs.modalBackdrop.classList.contains("is-open")) {
    closeModal();
  }
});

document.querySelectorAll("[data-app-version]").forEach((label) => {
  label.textContent = `v${APP_VERSION}${label.classList.contains("modal-version") ? ` · ${APP_VERSION_NAME}` : ""}`;
});

startFloor(1);
showIntroModal();
