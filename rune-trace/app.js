const APP_VERSION = "0.0.8";
const APP_VERSION_NAME = "RUNE TRACE";
const BOARD_SIZE = 7;
const RUNES_PER_FLOOR = 4;
const STAGES_PER_CHAPTER = 3;
const FLOORS_PER_STAGE = 3;
const TOTAL_FLOORS_PER_CHAPTER = STAGES_PER_CHAPTER * FLOORS_PER_STAGE;
const EXPERIENCE_PER_LEVEL = 7;
const COMBAT_ABILITIES = [
  {
    id: "temptation",
    name: "유혹",
    description: "새 룬에 이동이 막힌 적을 유인해 추가 처치",
  },
  {
    id: "continuous-defeat",
    name: "연속 격파",
    description: "직접 2체 이상 처치 시 끝점과 가까운 적을 추가 처치",
  },
  {
    id: "endpoint-slash",
    name: "끝점 참격",
    description: "룬 끝점의 진행 방향에 추가 공격 범위 생성",
  },
];

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
const MOVE_DIRECTIONS = [
  { rowDelta: -1, colDelta: -1, arrow: "↖" },
  { rowDelta: -1, colDelta: 0, arrow: "↑" },
  { rowDelta: -1, colDelta: 1, arrow: "↗" },
  { rowDelta: 0, colDelta: -1, arrow: "←" },
  { rowDelta: 0, colDelta: 1, arrow: "→" },
  { rowDelta: 1, colDelta: -1, arrow: "↙" },
  { rowDelta: 1, colDelta: 0, arrow: "↓" },
  { rowDelta: 1, colDelta: 1, arrow: "↘" },
];
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
  floorContext: document.querySelector("#floorContext"),
  floorDisplay: document.querySelector("#floorDisplay"),
  chapterProgress: document.querySelector("#chapterProgress"),
  runeProgress: document.querySelector("#runeProgress"),
  levelCount: document.querySelector("#levelCount"),
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
  undoButton: document.querySelector("#undoButton"),
  resetButton: document.querySelector("#resetButton"),
  abilityList: document.querySelector("#abilityList"),
  helpButton: document.querySelector("#helpButton"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalPanel: document.querySelector("#modalPanel"),
  modalClose: document.querySelector("#modalClose"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  modalActions: document.querySelector("#modalActions"),
  levelUpResumeButton: document.querySelector("#levelUpResumeButton"),
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
  level: 1,
  abilities: [],
  directDefeated: 0,
  continuousDefeatUsed: false,
  floorStartExperience: 0,
  floorStartLevel: 1,
  floorStartAbilities: [],
  stageStartExperience: 0,
  stageStartLevel: 1,
  stageStartAbilities: [],
  pendingLevelUps: 0,
  pendingOutcome: null,
  history: [],
  floorInitialSnapshot: null,
  running: true,
  modalType: "intro",
  levelUpReviewingBoard: false,
};

const pathVariantCache = new Map();
const pathSequenceCache = new Map();
const placementVariantCache = new Map();

function cellKey(row, col) {
  return `${row}:${col}`;
}

function abilityById(abilityId) {
  return COMBAT_ABILITIES.find((ability) => ability.id === abilityId);
}

function abilityLevel(abilityId) {
  return state.abilities.filter((entry) => entry === abilityId).length;
}

function activeStandaloneAbility() {
  const owned = COMBAT_ABILITIES
    .map((ability) => ({
      ...ability,
      level: abilityLevel(ability.id),
    }))
    .filter((ability) => ability.level > 0);
  return owned.length === 1 ? owned[0] : null;
}

function currentStage() {
  return Math.floor((state.floor - 1) / FLOORS_PER_STAGE) + 1;
}

function currentFloorInStage() {
  return ((state.floor - 1) % FLOORS_PER_STAGE) + 1;
}

function isStageFinalFloor() {
  return currentFloorInStage() === FLOORS_PER_STAGE;
}

function isChapterFinalFloor() {
  return state.floor === TOTAL_FLOORS_PER_CHAPTER;
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
    moveIntent: null,
  }));
}

function planEnemyMoves() {
  const occupied = new Set(
    state.enemies.map((enemy) => cellKey(enemy.row, enemy.col)),
  );
  const reserved = new Set();

  shuffle(state.enemies).forEach((enemy) => {
    const candidates = MOVE_DIRECTIONS
      .map(({ rowDelta, colDelta, arrow }) => {
        const row = enemy.row + rowDelta;
        const col = enemy.col + colDelta;
        return { row, col, rowDelta, colDelta, arrow };
      })
      .filter(({ row, col }) => {
        const key = cellKey(row, col);
        return (
          row >= 0 &&
          row < BOARD_SIZE &&
          col >= 0 &&
          col < BOARD_SIZE &&
          !state.claimed.has(key) &&
          !state.corrupted.has(key) &&
          !occupied.has(key) &&
          !reserved.has(key)
        );
      });

    const destination =
      candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    enemy.moveIntent = destination;
    if (destination) {
      reserved.add(cellKey(destination.row, destination.col));
    }
  });
}

function createStateSnapshot() {
  return {
    runes: state.runes.map((rune) => ({
      ...rune,
      points: rune.points.map((point) => [...point]),
    })),
    completedPaths: state.completedPaths.map((entry) => ({
      ...entry,
      path: entry.path.map((point) => ({ ...point })),
    })),
    claimed: [...state.claimed],
    corrupted: [...state.corrupted],
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      moveIntent: enemy.moveIntent ? { ...enemy.moveIntent } : null,
    })),
    defeated: state.defeated,
    directDefeated: state.directDefeated,
    experience: state.experience,
    level: state.level,
    abilities: [...state.abilities],
    continuousDefeatUsed: state.continuousDefeatUsed,
    pendingLevelUps: state.pendingLevelUps,
    pendingOutcome: state.pendingOutcome,
    running: state.running,
  };
}

function restoreStateSnapshot(snapshot) {
  state.runes = snapshot.runes.map((rune) => ({
    ...rune,
    points: rune.points.map((point) => [...point]),
  }));
  state.completedPaths = snapshot.completedPaths.map((entry) => ({
    ...entry,
    path: entry.path.map((point) => ({ ...point })),
  }));
  state.claimed = new Set(snapshot.claimed);
  state.corrupted = new Set(snapshot.corrupted);
  state.enemies = snapshot.enemies.map((enemy) => ({
    ...enemy,
    moveIntent: enemy.moveIntent ? { ...enemy.moveIntent } : null,
  }));
  state.defeated = snapshot.defeated;
  state.directDefeated = snapshot.directDefeated;
  state.experience = snapshot.experience;
  state.level = snapshot.level;
  state.abilities = [...snapshot.abilities];
  state.continuousDefeatUsed = snapshot.continuousDefeatUsed;
  state.pendingLevelUps = snapshot.pendingLevelUps;
  state.pendingOutcome = snapshot.pendingOutcome;
  state.running = snapshot.running;
  state.levelUpReviewingBoard = false;
  state.currentPath = [];
  state.drawing = false;
  state.pointerId = null;
}

function startFloor(floor, { retry = false } = {}) {
  if (retry) {
    state.experience = state.floorStartExperience;
    state.level = state.floorStartLevel;
    state.abilities = [...state.floorStartAbilities];
  } else {
    state.floorStartExperience = state.experience;
    state.floorStartLevel = state.level;
    state.floorStartAbilities = [...state.abilities];
  }
  state.floor = floor;
  if (currentFloorInStage() === 1) {
    state.stageStartExperience = state.experience;
    state.stageStartLevel = state.level;
    state.stageStartAbilities = [...state.abilities];
  }
  state.runes = chooseRunes();
  state.completedPaths = [];
  state.claimed = new Set();
  state.corrupted = new Set();
  state.currentPath = [];
  state.drawing = false;
  state.pointerId = null;
  state.defeated = 0;
  state.directDefeated = 0;
  state.continuousDefeatUsed = false;
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  state.history = [];
  state.running = true;
  spawnEnemies();
  planEnemyMoves();
  state.floorInitialSnapshot = createStateSnapshot();
  setFeedback("목록에 있는 룬을 판 위에 바로 그리세요.");
  render();
}

function undoLastRune() {
  const snapshot = state.history.pop();
  if (!snapshot) {
    setFeedback("되돌릴 완성 룬이 없습니다.", "alert");
    return;
  }
  restoreStateSnapshot(snapshot);
  state.running = true;
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  setFeedback("마지막 룬을 그리기 전 상태로 되돌렸습니다.", "success");
  render();
}

function resetFloor() {
  if (!state.floorInitialSnapshot) {
    return;
  }
  restoreStateSnapshot(state.floorInitialSnapshot);
  state.history = [];
  state.running = true;
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  setFeedback("현재 층을 최초 배치로 초기화했습니다.");
  render();
}

function restartChapter() {
  state.experience = 0;
  state.level = 1;
  state.abilities = [];
  state.directDefeated = 0;
  state.continuousDefeatUsed = false;
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  startFloor(1);
}

function restartStage() {
  const firstFloor = (currentStage() - 1) * FLOORS_PER_STAGE + 1;
  state.experience = state.stageStartExperience;
  state.level = state.stageStartLevel;
  state.abilities = [...state.stageStartAbilities];
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  startFloor(firstFloor);
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

function temptationTargets(path, survivors, level) {
  const pathIndexByKey = new Map(
    path.map(({ row, col }, index) => [cellKey(row, col), index]),
  );
  const start = path[0];
  const end = path[path.length - 1];
  const fullyHorizontal = path.every(({ row }) => row === start.row);
  const finalRowDirection = Math.sign(
    end.row - start.row || end.row - path[path.length - 2].row,
  );

  const candidates = survivors
    .filter(
      (enemy) =>
        enemy.moveIntent &&
        pathIndexByKey.has(
          cellKey(enemy.moveIntent.row, enemy.moveIntent.col),
        ),
    )
    .sort((a, b) => {
      const aPathIndex = pathIndexByKey.get(
        cellKey(a.moveIntent.row, a.moveIntent.col),
      );
      const bPathIndex = pathIndexByKey.get(
        cellKey(b.moveIntent.row, b.moveIntent.col),
      );
      if (aPathIndex !== bPathIndex) return aPathIndex - bPathIndex;
      if (a.col !== b.col) return a.col - b.col;
      if (fullyHorizontal) return a.row - b.row;
      if (finalRowDirection !== 0 && a.row !== b.row) {
        return (b.row - a.row) * finalRowDirection;
      }
      return a.row - b.row || a.id.localeCompare(b.id);
    });

  return level >= 3 ? candidates : candidates.slice(0, level);
}

function continuousDefeatTargets(path, survivors, level, directCount) {
  if (
    directCount < 2 ||
    state.continuousDefeatUsed ||
    survivors.length < level
  ) {
    return [];
  }
  const endpoint = path[path.length - 1];
  return [...survivors]
    .sort((a, b) => {
      const aDistance =
        (a.col - endpoint.col) ** 2 + (a.row - endpoint.row) ** 2;
      const bDistance =
        (b.col - endpoint.col) ** 2 + (b.row - endpoint.row) ** 2;
      return (
        aDistance - bDistance ||
        a.row - b.row ||
        a.col - b.col ||
        a.id.localeCompare(b.id)
      );
    })
    .slice(0, level);
}

function endpointSlashCells(path, level) {
  const endpoint = path[path.length - 1];
  const previous = path[path.length - 2];
  if (!endpoint || !previous) {
    return [];
  }

  const rowDelta = endpoint.row - previous.row;
  const colDelta = endpoint.col - previous.col;
  let cells = [];

  if (level === 1) {
    cells = [{
      row: endpoint.row + rowDelta,
      col: endpoint.col + colDelta,
    }];
  } else if (level === 2) {
    if (Math.abs(rowDelta) + Math.abs(colDelta) !== 1) {
      return [];
    }
    const center = {
      row: endpoint.row + rowDelta,
      col: endpoint.col + colDelta,
    };
    cells = rowDelta === 0
      ? [-1, 0, 1].map((offset) => ({
          row: center.row + offset,
          col: center.col,
        }))
      : [-1, 0, 1].map((offset) => ({
          row: center.row,
          col: center.col + offset,
        }));
  } else {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        const cell = {
          row: endpoint.row + rowOffset,
          col: endpoint.col + colOffset,
        };
        if (!sameCell(cell, endpoint) && !sameCell(cell, previous)) {
          cells.push(cell);
        }
      }
    }
  }

  return cells.filter(
    ({ row, col }) =>
      row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE,
  );
}

function combatPreview(path) {
  const directTargetIds = new Set(
    state.enemies
      .filter((enemy) =>
        path.some((cell) => sameCell(cell, enemy)),
      )
      .map((enemy) => enemy.id),
  );
  const survivors = state.enemies.filter(
    (enemy) => !directTargetIds.has(enemy.id),
  );
  const extraTargetIds = new Set();
  const rangeKeys = new Set();
  const ability = activeStandaloneAbility();
  let continuousDefeatTriggered = false;

  if (ability?.id === "temptation") {
    temptationTargets(path, survivors, ability.level).forEach((enemy) => {
      extraTargetIds.add(enemy.id);
    });
  } else if (ability?.id === "continuous-defeat") {
    const targets = continuousDefeatTargets(
      path,
      survivors,
      ability.level,
      directTargetIds.size,
    );
    targets.forEach((enemy) => extraTargetIds.add(enemy.id));
    continuousDefeatTriggered = targets.length === ability.level;
  } else if (ability?.id === "endpoint-slash") {
    endpointSlashCells(path, ability.level).forEach((cell) => {
      rangeKeys.add(cellKey(cell.row, cell.col));
    });
    survivors.forEach((enemy) => {
      if (rangeKeys.has(cellKey(enemy.row, enemy.col))) {
        extraTargetIds.add(enemy.id);
      }
    });
  }

  return {
    directTargetIds,
    extraTargetIds,
    rangeKeys,
    continuousDefeatTriggered,
  };
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
  const levelExperience =
    state.experience - (state.level - 1) * EXPERIENCE_PER_LEVEL;
  const stage = currentStage();
  const floor = currentFloorInStage();
  const currentFloorComplete =
    !state.running &&
    state.runes.length > 0 &&
    remainingRunes().length === 0;
  refs.floorContext.textContent = `CHAPTER 01 · STAGE ${stage}`;
  refs.floorDisplay.textContent = `FLOOR ${floor} / ${FLOORS_PER_STAGE}`;
  refs.levelCount.textContent = String(state.level);
  refs.enemyCount.textContent = String(state.enemies.length);
  refs.experienceCount.textContent = `${levelExperience} / ${EXPERIENCE_PER_LEVEL}`;
  refs.safeCount.textContent = String(
    BOARD_SIZE * BOARD_SIZE - state.claimed.size - state.corrupted.size,
  );
  refs.completeCount.textContent = `${complete} / ${RUNES_PER_FLOOR}`;
  refs.runeProgress.innerHTML = Array.from(
    { length: RUNES_PER_FLOOR },
    (_, index) => `<i class="${index < complete ? "is-complete" : ""}"></i>`,
  ).join("");
  refs.chapterProgress.innerHTML = Array.from(
    { length: STAGES_PER_CHAPTER },
    (_, stageIndex) => {
      const stageNumber = stageIndex + 1;
      const floors = Array.from(
        { length: FLOORS_PER_STAGE },
        (_, floorIndex) => {
          const floorNumber = floorIndex + 1;
          const absoluteFloor = stageIndex * FLOORS_PER_STAGE + floorNumber;
          const status =
            absoluteFloor < state.floor ||
            (absoluteFloor === state.floor && currentFloorComplete)
              ? "is-complete"
              : absoluteFloor === state.floor
                ? "is-current"
                : "";
          return `
            <i class="${status}" aria-label="스테이지 ${stageNumber} 플로어 ${floorNumber}">
              ${floorNumber}
            </i>
          `;
        },
      ).join("");
      return `
        <div class="stage-row${stageNumber === stage ? " is-current" : ""}">
          <strong>STAGE ${stageNumber}</strong>
          <div class="stage-floor-row">${floors}</div>
        </div>
      `;
    },
  ).join("");

  refs.turnLabel.textContent = "자동 룬 인식";
  refs.boardGoal.textContent =
    complete < RUNES_PER_FLOOR
      ? `남은 룬 ${RUNES_PER_FLOOR - complete}개 중 하나를 그리세요`
      : "모든 룬 완성";
}

function renderRunControls() {
  const levelUpPending = state.modalType === "levelup";
  refs.undoButton.disabled = levelUpPending || state.history.length === 0;
  refs.resetButton.disabled = levelUpPending || !state.floorInitialSnapshot;

  if (state.abilities.length === 0) {
    refs.abilityList.textContent = "획득 능력 없음";
    return;
  }

  const owned = COMBAT_ABILITIES
    .map((ability) => ({
      ...ability,
      level: abilityLevel(ability.id),
    }))
    .filter((ability) => ability.level > 0);
  refs.abilityList.innerHTML = owned
    .map(
      (ability) =>
        `<span>${ability.name} LV.${ability.level}</span>`,
    )
    .concat(
      owned.length > 1
        ? '<span class="is-on-hold">복합 발동 보류</span>'
        : [],
    )
    .join("");
}

function renderBoard() {
  const enemiesByCell = new Map(
    state.enemies.map((enemy) => [cellKey(enemy.row, enemy.col), enemy]),
  );
  const currentKeys = new Set(
    state.currentPath.map(({ row, col }) => cellKey(row, col)),
  );
  const completedPreviewRune = remainingRunes().find((rune) =>
    matchesRune(state.currentPath, rune),
  );
  const preview = completedPreviewRune
    ? combatPreview(state.currentPath)
    : {
        directTargetIds: new Set(),
        extraTargetIds: new Set(),
        rangeKeys: new Set(),
      };

  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const key = cellKey(row, col);
      const classes = ["grid-cell"];
      if (state.claimed.has(key)) classes.push("is-claimed");
      if (state.corrupted.has(key)) classes.push("is-corrupted");
      if (currentKeys.has(key)) classes.push("is-current");
      if (preview.rangeKeys.has(key)) classes.push("is-ability-range");
      const enemy = enemiesByCell.get(key);
      const intent = enemy?.moveIntent;
      const enemyClasses = ["enemy"];
      if (preview.directTargetIds.has(enemy?.id)) {
        enemyClasses.push("is-defeat-preview", "is-direct-preview");
      }
      if (preview.extraTargetIds.has(enemy?.id)) {
        enemyClasses.push("is-defeat-preview", "is-ability-preview");
      }
      cells.push(`
        <div class="${classes.join(" ")}">
          ${
            enemy
              ? `
                <span class="${enemyClasses.join(" ")}">
                  <span class="enemy-mark">◆</span>
                  <span class="enemy-intent${intent ? "" : " is-stopped"}">
                    ${
                      intent
                        ? intent.arrow
                        : '<img class="enemy-stop-icon" src="./assets/stop-intent-lock.png" alt="" aria-hidden="true">'
                    }
                  </span>
                </span>
              `
              : ""
          }
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
  renderRunControls();
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
  if (state.modalType === "levelup") {
    if (state.levelUpReviewingBoard) {
      showLevelUpSelection();
    }
    return;
  }
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
  state.enemies.forEach((enemy) => {
    const destination = enemy.moveIntent;
    if (!destination) {
      return;
    }

    const destinationKey = cellKey(destination.row, destination.col);
    if (
      state.claimed.has(destinationKey) ||
      state.corrupted.has(destinationKey)
    ) {
      enemy.moveIntent = null;
      return;
    }

    enemy.row = destination.row;
    enemy.col = destination.col;
    enemy.moveIntent = null;
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

function grantExperience(amount) {
  state.experience += amount;
  while (state.experience >= state.level * EXPERIENCE_PER_LEVEL) {
    state.level += 1;
    state.pendingLevelUps += 1;
  }
}

function resolveQueuedModal() {
  if (state.pendingOutcome === "chapter-clear") {
    state.pendingLevelUps = 0;
    state.pendingOutcome = null;
    showChapterClearModal();
    return;
  }
  if (state.pendingLevelUps > 0) {
    showLevelUpModal();
    return;
  }
  if (state.pendingOutcome === "floor-clear") {
    state.pendingOutcome = null;
    showFloorClearModal();
    return;
  }
  if (state.pendingOutcome === "stage-clear") {
    state.pendingOutcome = null;
    showStageClearModal();
    return;
  }
  if (state.pendingOutcome === "fail") {
    state.pendingOutcome = null;
    showFailModal();
  }
}

function commitRune(rune, path) {
  const preview = combatPreview(path);
  state.history.push(createStateSnapshot());
  const pathKeys = new Set(path.map(({ row, col }) => cellKey(row, col)));
  pathKeys.forEach((key) => state.claimed.add(key));
  rune.complete = true;
  state.completedPaths.push({
    runeId: rune.instanceId,
    color: rune.color,
    path,
  });
  state.currentPath = [];

  const defeatedIds = new Set([
    ...preview.directTargetIds,
    ...preview.extraTargetIds,
  ]);
  state.enemies = state.enemies.filter(
    (enemy) => !defeatedIds.has(enemy.id),
  );
  const defeatedNow = preview.directTargetIds.size;
  const abilityDefeatedNow = preview.extraTargetIds.size;
  state.defeated += defeatedNow + abilityDefeatedNow;
  state.directDefeated += defeatedNow;
  if (preview.continuousDefeatTriggered) {
    state.continuousDefeatUsed = true;
  }
  grantExperience(defeatedNow);

  if (remainingRunes().length === 0) {
    state.running = false;
    state.pendingOutcome = isChapterFinalFloor()
      ? "chapter-clear"
      : isStageFinalFloor()
        ? "stage-clear"
        : "floor-clear";
    setFeedback(
      `네 개의 룬이 공명했습니다. 직접 ${defeatedNow}체 · 능력 ${abilityDefeatedNow}체를 처치하고 EXP ${defeatedNow}을 얻었습니다.`,
      "success",
    );
    render();
    window.setTimeout(resolveQueuedModal, 260);
    return;
  }

  moveEnemies();
  const corruptedNow = corruptCells();
  planEnemyMoves();

  const fittingRunes = remainingRunes().filter((entry) => canTemplateFit(entry));
  if (fittingRunes.length === 0) {
    state.running = false;
    state.pendingOutcome = "fail";
    setFeedback("오염으로 남은 룬을 놓을 공간이 사라졌습니다.", "alert");
    render();
    window.setTimeout(resolveQueuedModal, 260);
    return;
  }

  const killCopy =
    defeatedNow + abilityDefeatedNow > 0
      ? `직접 ${defeatedNow}체 · 능력 ${abilityDefeatedNow}체 제거 · EXP +${defeatedNow}, `
      : "";
  setFeedback(
    `${rune.name} 완성! ${killCopy}빈 칸 ${corruptedNow}곳이 오염됐습니다.`,
    "success",
  );
  render();
  if (state.pendingLevelUps > 0) {
    window.setTimeout(resolveQueuedModal, 260);
  }
}

function makeAction(label, onClick, primary = false, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (primary) button.classList.add("primary");
  if (className) button.classList.add(className);
  button.addEventListener("click", onClick);
  return button;
}

function openModal({ type, eyebrow, title, body, actions }) {
  state.modalType = type;
  refs.modalPanel.dataset.modalType = type;
  refs.modalEyebrow.textContent = eyebrow;
  refs.modalTitle.innerHTML = title;
  refs.modalBody.innerHTML = body;
  refs.modalActions.innerHTML = "";
  actions.forEach((action) => {
    refs.modalActions.append(
      makeAction(
        action.label,
        action.onClick,
        action.primary,
        action.className,
      ),
    );
  });
  refs.modalClose.setAttribute(
    "aria-label",
    type === "levelup" ? "보드 보기" : "모달 닫기",
  );
  refs.modalClose.hidden = !["intro", "help", "levelup"].includes(type);
  state.levelUpReviewingBoard = false;
  refs.levelUpResumeButton.hidden = true;
  refs.modalBackdrop.classList.add("is-open");
  window.setTimeout(() => refs.modalPanel.focus(), 0);
}

function closeModal() {
  refs.modalBackdrop.classList.remove("is-open");
  refs.modalPanel.dataset.modalType = "";
  state.modalType = null;
  state.levelUpReviewingBoard = false;
  refs.levelUpResumeButton.hidden = true;
  refs.modalClose.hidden = false;
  refs.helpButton.focus({ preventScroll: true });
}

function showLevelUpBoard() {
  if (state.modalType !== "levelup") {
    return;
  }
  state.levelUpReviewingBoard = true;
  refs.modalBackdrop.classList.remove("is-open");
  refs.levelUpResumeButton.hidden = false;
  renderRunControls();
  refs.levelUpResumeButton.focus({ preventScroll: true });
}

function showLevelUpSelection() {
  if (state.modalType !== "levelup") {
    return;
  }
  state.levelUpReviewingBoard = false;
  refs.levelUpResumeButton.hidden = true;
  refs.modalBackdrop.classList.add("is-open");
  window.setTimeout(() => refs.modalPanel.focus(), 0);
}

function completeLevelUp(abilityId = null) {
  const resolvedLevel = state.level - state.pendingLevelUps + 1;
  const ability = abilityById(abilityId);
  const previousAbilityLevel = ability ? abilityLevel(ability.id) : 0;
  if (ability && previousAbilityLevel < 3) {
    state.abilities.push(ability.id);
  }
  state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
  closeModal();
  setFeedback(
    ability
      ? previousAbilityLevel < 3
        ? `LEVEL ${resolvedLevel} · ${ability.name} LV.${previousAbilityLevel + 1}`
        : `LEVEL ${resolvedLevel} · ${ability.name}은 이미 최대 단계입니다.`
      : `LEVEL ${resolvedLevel} · 능력 선택을 건너뛰었습니다.`,
    "success",
  );
  render();
  window.setTimeout(resolveQueuedModal, 0);
}

function requestModalClose() {
  if (state.modalType === "levelup") {
    showLevelUpBoard();
    return;
  }
  if (state.modalType === "intro" || state.modalType === "help") {
    closeModal();
  }
}

function rulesMarkup() {
  return `
    <p>적을 전부 쓰러뜨리는 대신, <strong>제시된 룬 네 개를 모두 그리면</strong> 층을 통과합니다.</p>
      <div class="rule-list">
        <div class="rule"><b>1</b><span>왼쪽 목록의 룬 중 하나를 그리면 자동으로 인식됩니다.</span></div>
        <div class="rule"><b>2</b><span>룬은 회전·좌우 반전 가능하며, 지나간 적을 처치하면 EXP를 얻습니다.</span></div>
        <div class="rule"><b>3</b><span>몬스터 안의 화살표는 다음 이동 방향이며, 자물쇠는 정지를 뜻합니다.</span></div>
        <div class="rule"><b>4</b><span>완성 룬과 오염 칸은 다시 쓸 수 없습니다. 네 룬의 자리를 남겨두세요.</span></div>
      </div>
      <p>룬 경로로 직접 처치한 적만 EXP를 주며, 능력 추가 처치는 섬멸 수에만 포함됩니다.</p>
      <p>한 챕터는 3개 스테이지, 각 스테이지는 3개 플로어입니다. EXP ${EXPERIENCE_PER_LEVEL}마다 레벨이 오릅니다.</p>
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
    eyebrow: `STAGE ${currentStage()} · FLOOR ${currentFloorInStage()} · GUIDE`,
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

function showLevelUpModal() {
  const targetLevel = state.level - state.pendingLevelUps + 1;
  const ownedKinds = COMBAT_ABILITIES.filter(
    (ability) => abilityLevel(ability.id) > 0,
  ).length;
  openModal({
    type: "levelup",
    eyebrow: `LEVEL ${targetLevel} REACHED`,
    title: "능력을 하나<br>선택하세요",
    body: `
      <p>같은 능력을 다시 선택하면 최대 3단계까지 강화됩니다. 서로 다른 능력을 함께 보유하면 복합 발동은 현재 보류됩니다.</p>
      <div class="level-preview">
        <span>현재 레벨</span>
        <strong>LV ${targetLevel}${ownedKinds > 1 ? " · 복합 보류" : ""}</strong>
      </div>
    `,
    actions: [
      {
        label: "보드 보기",
        onClick: showLevelUpBoard,
        className: "review-board-action",
      },
      ...COMBAT_ABILITIES.map((ability) => {
        const currentLevel = abilityLevel(ability.id);
        return {
          label: `${ability.name} · ${
            currentLevel >= 3
              ? "MAX"
              : currentLevel === 0
                ? "획득"
                : `LV.${currentLevel} → LV.${currentLevel + 1}`
          }`,
          onClick: () => completeLevelUp(ability.id),
          className: `ability-action ability-${ability.id}`,
        };
      }),
    ],
  });
}

function floorResultMarkup() {
  return `
    <p>적을 모두 쓰러뜨리지 않아도 네 개의 궤적이 탑의 문을 열었습니다.</p>
    <div class="result-grid">
      <div><span>처치</span><strong>${state.defeated}</strong></div>
      <div><span>획득 EXP</span><strong>+${state.directDefeated}</strong></div>
      <div><span>생존 적</span><strong>${state.enemies.length}</strong></div>
    </div>
  `;
}

function showFloorClearModal() {
  openModal({
    type: "clear",
    eyebrow: "FLOOR CLEAR",
    title: "룬이 공명했습니다",
    body: floorResultMarkup(),
    actions: [
      {
        label: "이 층 다시",
        onClick: () => {
          closeModal();
          resetFloor();
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

function showStageClearModal() {
  openModal({
    type: "stage-clear",
    eyebrow: `STAGE ${currentStage()} CLEAR`,
    title: "스테이지를<br>돌파했습니다",
    body: `
      ${floorResultMarkup()}
      <p>현재 성장 상태를 유지한 채 다음 스테이지로 이어집니다.</p>
    `,
    actions: [
      {
        label: "스테이지 재도전",
        onClick: () => {
          closeModal();
          restartStage();
        },
      },
      {
        label: "다음 스테이지",
        primary: true,
        onClick: () => {
          closeModal();
          startFloor(state.floor + 1);
        },
      },
    ],
  });
}

function showChapterClearModal() {
  openModal({
    type: "chapter-clear",
    eyebrow: "CHAPTER 01 CLEAR",
    title: "첫 챕터의<br>정상에 올랐습니다",
    body: `
      <p>마지막 턴에서 남은 레벨업 선택은 생략하고 챕터를 종료했습니다.</p>
      <div class="result-grid">
        <div><span>완료 스테이지</span><strong>${STAGES_PER_CHAPTER}</strong></div>
        <div><span>완료 플로어</span><strong>${TOTAL_FLOORS_PER_CHAPTER}</strong></div>
        <div><span>최종 레벨</span><strong>${state.level}</strong></div>
      </div>
    `,
    actions: [
      {
        label: "챕터 재도전",
        primary: true,
        onClick: () => {
          closeModal();
          restartChapter();
        },
      },
    ],
  });
}

function showFailModal() {
  const actions = [];
  if (currentStage() <= 2) {
    actions.push({
      label: "스테이지 재도전",
      onClick: () => {
        closeModal();
        restartStage();
      },
    });
  }
  actions.push({
    label: "플로어 초기화",
    primary: true,
    onClick: () => {
      closeModal();
      resetFloor();
    },
  });

  openModal({
    type: "fail",
    eyebrow: "RUNE SPACE LOST",
    title: "그릴 공간이<br>사라졌습니다",
    body: `
      <p>살아남은 적의 오염이 남은 룬 경로를 막았습니다. 룬으로 적을 더 많이 베거나, 완성 경로의 위치를 바꿔보세요.</p>
      <div class="result-grid">
        <div><span>완성 룬</span><strong>${state.completedPaths.length}</strong></div>
        <div><span>획득 EXP</span><strong>+${state.directDefeated}</strong></div>
        <div><span>오염 칸</span><strong>${state.corrupted.size}</strong></div>
      </div>
    `,
    actions,
  });
}

refs.board.addEventListener("pointerdown", beginDrawing);
refs.board.addEventListener("pointermove", continueDrawing);
refs.board.addEventListener("pointerup", finishDrawing);
refs.board.addEventListener("pointercancel", cancelDrawing);
refs.board.addEventListener("lostpointercapture", () => {
  if (state.drawing) cancelDrawing();
});

refs.undoButton.addEventListener("click", undoLastRune);
refs.resetButton.addEventListener("click", resetFloor);
refs.helpButton.addEventListener("click", () => {
  if (state.modalType === "levelup") {
    showLevelUpSelection();
    return;
  }
  showHelpModal();
});
refs.modalClose.addEventListener("click", requestModalClose);
refs.levelUpResumeButton.addEventListener("click", showLevelUpSelection);
refs.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === refs.modalBackdrop && state.modalType === "levelup") {
    showLevelUpBoard();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && refs.modalBackdrop.classList.contains("is-open")) {
    requestModalClose();
  }
});

document.querySelectorAll("[data-app-version]").forEach((label) => {
  label.textContent = `v${APP_VERSION}${label.classList.contains("modal-version") ? ` · ${APP_VERSION_NAME}` : ""}`;
});

startFloor(1);
showIntroModal();
