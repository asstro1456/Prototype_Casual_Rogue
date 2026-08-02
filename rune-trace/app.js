const APP_VERSION = "1.0.1";
const APP_VERSION_NAME = "RUNE TRACE";
const BOARD_SIZE = 7;
const RUNES_PER_FLOOR = 4;
const STAGES_PER_CHAPTER = 3;
const FLOORS_PER_STAGE = 3;
const TOTAL_FLOORS_PER_CHAPTER = STAGES_PER_CHAPTER * FLOORS_PER_STAGE;
const EXPERIENCE_PER_LEVEL = 7;
const MAX_CORRUPTION_SOURCES_PER_TURN = 2;
const MAX_MONSTER_CORRUPTION_PER_FLOOR = 6;
const SAVE_KEY = "rune-trace.run-state.v1";
const COMPATIBLE_SAVE_VERSIONS = new Set(["0.2.3", APP_VERSION]);
const ALL_ABILITIES = [
  {
    id: "temptation",
    name: "유혹",
    icon: "◎",
    category: "combat",
    maxLevel: 3,
    description: "새 룬에 이동이 막힌 적을 유인해 추가 피격",
  },
  {
    id: "ricochet",
    name: "도탄",
    icon: "↝",
    category: "combat",
    maxLevel: 3,
    description: "직접 2체 이상 처치 시 가까운 일반 적을 추가 피격",
  },
  {
    id: "endpoint-slash",
    name: "끝점 참격",
    icon: "⌁",
    category: "combat",
    maxLevel: 3,
    description: "룬 끝점의 진행 방향에 추가 공격 범위 생성",
  },
  {
    id: "corruption-ignore",
    name: "오염 무시",
    icon: "◇",
    category: "puzzle",
    maxLevel: 1,
    description: "플로어당 한 번 오염 칸 1개를 경로로 통과",
  },
  {
    id: "rune-link",
    name: "룬 연결",
    icon: "∞",
    category: "puzzle",
    maxLevel: 1,
    description: "기존 흔적 끝점에서 새 룬을 이어 이전 흔적 제거",
  },
  {
    id: "rune-replace",
    name: "룬 교체",
    icon: "↻",
    category: "puzzle",
    maxLevel: 1,
    description: "플로어당 한 번 남은 룬을 다른 기본 형태로 교체",
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
  appShell: document.querySelector(".app-shell"),
  gameCard: document.querySelector(".game-card"),
  floorContext: document.querySelector("#floorContext"),
  floorDisplay: document.querySelector("#floorDisplay"),
  chapterProgress: document.querySelector("#chapterProgress"),
  runeProgress: document.querySelector("#runeProgress"),
  levelCount: document.querySelector("#levelCount"),
  enemyCount: document.querySelector("#enemyCount"),
  experienceCount: document.querySelector("#experienceCount"),
  safeCount: document.querySelector("#safeCount"),
  bossEffectBanner: document.querySelector("#bossEffectBanner"),
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
  undoReason: document.querySelector("#undoReason"),
  resetReason: document.querySelector("#resetReason"),
  abilityList: document.querySelector("#abilityList"),
  qaMenuButton: document.querySelector("#qaMenuButton"),
  qaPanel: document.querySelector("#qaPanel"),
  qaCloseButton: document.querySelector("#qaCloseButton"),
  qaAbilitySelect: document.querySelector("#qaAbilitySelect"),
  qaAbilityAddButton: document.querySelector("#qaAbilityAddButton"),
  qaAbilityReason: document.querySelector("#qaAbilityReason"),
  qaLevelUpButton: document.querySelector("#qaLevelUpButton"),
  qaLevelUpReason: document.querySelector("#qaLevelUpReason"),
  qaRuneSelect: document.querySelector("#qaRuneSelect"),
  qaRuneRerollButton: document.querySelector("#qaRuneRerollButton"),
  qaRuneRerollAllButton: document.querySelector("#qaRuneRerollAllButton"),
  qaRuneReason: document.querySelector("#qaRuneReason"),
  qaDataResetButton: document.querySelector("#qaDataResetButton"),
  qaDataResetReason: document.querySelector("#qaDataResetReason"),
  helpButton: document.querySelector("#helpButton"),
  bossInfoButton: document.querySelector("#bossInfoButton"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalPanel: document.querySelector("#modalPanel"),
  modalClose: document.querySelector("#modalClose"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  modalActions: document.querySelector("#modalActions"),
  levelUpResumeButton: document.querySelector("#levelUpResumeButton"),
};

const WORKSPACE_WIDTH = 1260;
const WORKSPACE_VIEWPORT_MARGIN = 24;
let workspaceFitPending = false;

function fitWorkspaceToViewport() {
  const workspaceHeight = Math.max(
    1,
    Math.ceil(refs.gameCard.scrollHeight || refs.gameCard.offsetHeight),
  );
  const viewportWidth = Number(window.innerWidth) || WORKSPACE_WIDTH;
  const viewportHeight = Number(window.innerHeight) || workspaceHeight;
  const availableWidth = Math.max(
    1,
    viewportWidth - WORKSPACE_VIEWPORT_MARGIN,
  );
  const availableHeight = Math.max(
    1,
    viewportHeight - WORKSPACE_VIEWPORT_MARGIN,
  );
  const scale = Math.min(
    1,
    availableWidth / WORKSPACE_WIDTH,
    availableHeight / workspaceHeight,
  );

  refs.appShell.style.setProperty("--workspace-height", `${workspaceHeight}px`);
  refs.appShell.style.setProperty("--workspace-scale", scale.toFixed(4));
}

function scheduleWorkspaceFit() {
  if (workspaceFitPending) return;
  workspaceFitPending = true;
  const applyFit = () => {
    workspaceFitPending = false;
    fitWorkspaceToViewport();
  };
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(applyFit);
  } else {
    applyFit();
  }
}

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
  ricochetUsed: false,
  puzzleUses: {
    corruptionIgnore: false,
    runeLink: false,
    runeReplace: false,
  },
  bossConfigs: [],
  bossMechanicStats: {
    hitSources: {},
    weakPointNoCandidate: 0,
    escapeCount: 0,
    escapeRemoved: {},
  },
  pendingAbilityChoices: [],
  abilityChoiceLocks: {},
  replacementSerial: 0,
  randomState: Date.now() >>> 0,
  monsterCorruptionCreated: 0,
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
  modalDismissAction: null,
  levelUpReviewingBoard: false,
  floorStartedAt: 0,
  stageStartedAt: 0,
  pathStartedAt: 0,
  tutorialStartedAt: 0,
  lastFailureReason: null,
  restoredFromSave: false,
  qaOpen: false,
};

const pathVariantCache = new Map();
const pathSequenceCache = new Map();
let levelUpSelectionLocked = false;
let levelUpResumeInputBlockedUntil = 0;

function cellKey(row, col) {
  return `${row}:${col}`;
}

function abilityById(abilityId) {
  return ALL_ABILITIES.find((ability) => ability.id === abilityId);
}

function abilityLevel(abilityId) {
  return state.abilities.filter((entry) => entry === abilityId).length;
}

function hasAbility(abilityId) {
  return abilityLevel(abilityId) > 0;
}

function abilityEffectText(abilityId, level) {
  if (abilityId === "temptation") {
    return level >= 3
      ? "새 룬에 이동이 막힌 모든 대상에게 추가 타격"
      : `새 룬에 이동이 막힌 대상 최대 ${level}체에게 추가 타격`;
  }
  if (abilityId === "ricochet") {
    return `일반 몬스터 2체 이상 직접 처치 시 끝점과 가까운 일반 몬스터 최대 ${level}체에게 추가 타격`;
  }
  if (abilityId === "endpoint-slash") {
    return [
      "",
      "룬 끝점 진행 방향의 다음 1칸을 추가 공격",
      "룬 끝점 진행 방향의 3칸 너비를 추가 공격",
      "룬 끝점 주변을 넓게 추가 공격",
    ][level] ?? "룬 끝점 진행 방향에 추가 공격 범위 생성";
  }
  return abilityById(abilityId)?.description ?? "";
}

function abilityUsageState(ability) {
  if (ability.id === "ricochet") {
    return state.ricochetUsed
      ? { label: "이번 플로어 사용 완료", used: true }
      : { label: "이번 플로어 발동 가능", used: false };
  }
  const useKey = {
    "corruption-ignore": "corruptionIgnore",
    "rune-link": "runeLink",
    "rune-replace": "runeReplace",
  }[ability.id];
  if (useKey) {
    return state.puzzleUses[useKey]
      ? { label: "이번 플로어 사용 완료", used: true }
      : { label: "이번 플로어 사용 가능", used: false };
  }
  return { label: "조건 충족 시 자동 발동", used: false };
}

function currentStage() {
  return Math.floor((state.floor - 1) / FLOORS_PER_STAGE) + 1;
}

function currentFloorInStage() {
  return ((state.floor - 1) % FLOORS_PER_STAGE) + 1;
}

function completedRuneCount() {
  return state.runes.filter((rune) => rune.complete).length;
}

function stageId() {
  return `chapter_01_stage_${currentStage()}`;
}

function elapsedSince(startedAt) {
  return startedAt > 0
    ? Math.max(0, Date.now() - startedAt)
    : 0;
}

function logPlayEvent(eventName, payload = {}, options = {}) {
  return window.RuneTracePlayLog?.log(eventName, payload, options)
    ?? Promise.resolve(null);
}

function playLogContext() {
  return {
    stageId: stageId(),
    floorIndex: state.floor,
    running: state.running,
    completedRunes: completedRuneCount(),
  };
}

function boardLogPayload() {
  return {
    chapter_id: "chapter_01",
    stage_index: currentStage(),
    floor_in_stage: currentFloorInStage(),
    board_size: BOARD_SIZE,
    enemy_count: state.enemies.length,
    corrupted_cell_count: state.corrupted.size,
    claimed_cell_count: state.claimed.size,
    rune_ids: state.runes.map((rune) => rune.instanceId),
    rune_types: state.runes.map((rune) => rune.id),
    seed: null,
  };
}

function logStageAndFloorStart({ retry = false } = {}) {
  if (currentFloorInStage() === 1) {
    void logPlayEvent("stage_start", {
      chapter_id: "chapter_01",
      stage_index: currentStage(),
      seed: null,
      retry,
    });
  }
  void logPlayEvent("floor_start", {
    ...boardLogPayload(),
    retry,
  });
}

function floorEndPayload(success, failureReason = null) {
  return {
    success,
    failure_reason: failureReason,
    duration_ms: elapsedSince(state.floorStartedAt),
    completed_runes: completedRuneCount(),
    direct_defeated: state.directDefeated,
    ability_defeated: state.defeated - state.directDefeated,
    surviving_enemies: state.enemies.length,
    corrupted_cell_count: state.corrupted.size,
    monster_corruption_created: state.monsterCorruptionCreated,
    boss_hit_sources: { ...state.bossMechanicStats.hitSources },
    boss_weak_point_no_candidate:
      state.bossMechanicStats.weakPointNoCandidate,
    boss_escape_count: state.bossMechanicStats.escapeCount,
    boss_escape_removed: { ...state.bossMechanicStats.escapeRemoved },
    level: state.level,
    experience: state.experience,
  };
}

function isStageFinalFloor() {
  return currentFloorInStage() === FLOORS_PER_STAGE;
}

function isChapterFinalFloor() {
  return state.floor === TOTAL_FLOORS_PER_CHAPTER;
}

function isBossFloor() {
  return isStageFinalFloor();
}

function currentBossConfig() {
  return state.bossConfigs[currentStage() - 1] ?? null;
}

function createBossConfigs() {
  const variants = ["weak-point", "guardian-link", "reinforcement"];
  return Array.from({ length: STAGES_PER_CHAPTER }, (_, index) => {
    const stage = index + 1;
    const baseShieldCount = stage === 3 ? 2 : 1;
    const variant = variants[index];
    return {
      stage,
      type: "moving-boss",
      variant,
      baseShieldCount,
      shieldCount: baseShieldCount,
    };
  });
}

function bossVariantName(variant) {
  if (variant === "weak-point") return "약점 표식";
  if (variant === "guardian-link") return "수호 연결";
  if (variant === "amplified-shield") return "증폭 방어막";
  if (variant === "reinforcement") return "증원 소환";
  return "변형 없음";
}

function bossVariantEffect(variant) {
  if (variant === "weak-point") {
    return "표식을 직접 통과하면 보스 피격";
  }
  if (variant === "guardian-link") {
    return "연결된 몬스터 처치 시 보스 피격";
  }
  if (variant === "amplified-shield") {
    return "기본형보다 방어막 1개 추가";
  }
  if (variant === "reinforcement") {
    return "피격 후 생존 시 일반 몬스터 1체 소환";
  }
  return "추가 효과 없음";
}

function bossHitSourceName(source) {
  return {
    direct: "직접",
    "endpoint-slash": "끝점",
    "weak-point": "약점",
    "guardian-link": "수호",
    "charge-collision": "충돌",
  }[source] ?? "피격";
}

function createRandomSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] || 1;
}

function nextRandom() {
  state.randomState =
    (Math.imul(state.randomState, 1664525) + 1013904223) >>> 0;
  return state.randomState / 4294967296;
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(nextRandom() * (index + 1));
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

function completedPathAtEndpoint(cell) {
  if (!cell) return null;
  return state.completedPaths.find((entry) => {
    const first = entry.path[0];
    const last = entry.path[entry.path.length - 1];
    return sameCell(cell, first) || sameCell(cell, last);
  }) ?? null;
}

function canUseCorruptionIgnore() {
  return (
    hasAbility("corruption-ignore") &&
    !state.puzzleUses.corruptionIgnore
  );
}

function canUseRuneLink() {
  return hasAbility("rune-link") && !state.puzzleUses.runeLink;
}

function pathUsesCorruptionIgnore(path) {
  return path.some(({ row, col }) =>
    state.corrupted.has(cellKey(row, col)),
  );
}

function linkedPathForPath(path) {
  if (!canUseRuneLink() || path.length === 0) return null;
  return completedPathAtEndpoint(path[0]);
}

function crossProduct(a, b, c) {
  return (
    (b.col - a.col) * (c.row - a.row) -
    (b.row - a.row) * (c.col - a.col)
  );
}

function pointOnSegment(point, start, end) {
  return (
    crossProduct(start, end, point) === 0 &&
    point.row >= Math.min(start.row, end.row) &&
    point.row <= Math.max(start.row, end.row) &&
    point.col >= Math.min(start.col, end.col) &&
    point.col <= Math.max(start.col, end.col)
  );
}

function segmentsIntersect(a, b, c, d) {
  const abC = crossProduct(a, b, c);
  const abD = crossProduct(a, b, d);
  const cdA = crossProduct(c, d, a);
  const cdB = crossProduct(c, d, b);
  if (
    ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
    ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))
  ) {
    return true;
  }
  return (
    pointOnSegment(c, a, b) ||
    pointOnSegment(d, a, b) ||
    pointOnSegment(a, c, d) ||
    pointOnSegment(b, c, d)
  );
}

function pathCrossesCompletedTrace(path) {
  if (path.length < 2) return false;
  const linkedPath = linkedPathForPath(path);
  const sharedStart = linkedPath ? path[0] : null;
  for (let pathIndex = 1; pathIndex < path.length; pathIndex += 1) {
    const newStart = path[pathIndex - 1];
    const newEnd = path[pathIndex];
    for (const completed of state.completedPaths) {
      for (
        let completedIndex = 1;
        completedIndex < completed.path.length;
        completedIndex += 1
      ) {
        const oldStart = completed.path[completedIndex - 1];
        const oldEnd = completed.path[completedIndex];
        if (
          !state.claimed.has(cellKey(oldStart.row, oldStart.col)) ||
          !state.claimed.has(cellKey(oldEnd.row, oldEnd.col))
        ) {
          continue;
        }
        if (!segmentsIntersect(newStart, newEnd, oldStart, oldEnd)) {
          continue;
        }
        const allowedLinkedEndpoint =
          completed.runeId === linkedPath?.runeId &&
          pathIndex === 1 &&
          sameCell(newStart, sharedStart) &&
          (sameCell(oldStart, sharedStart) ||
            sameCell(oldEnd, sharedStart));
        if (!allowedLinkedEndpoint) {
          return true;
        }
      }
    }
  }
  return false;
}

function isLegalPuzzlePath(path) {
  const linkedPath = linkedPathForPath(path);
  let corruptedCount = 0;
  const cellsAreLegal = path.every(({ row, col }, index) => {
    const key = cellKey(row, col);
    if (state.claimed.has(key)) {
      return index === 0 && Boolean(linkedPath);
    }
    if (state.corrupted.has(key)) {
      corruptedCount += 1;
      return canUseCorruptionIgnore() && corruptedCount <= 1;
    }
    return true;
  });
  return cellsAreLegal && !pathCrossesCompletedTrace(path);
}

function canTemplateFit(template) {
  return getPathSequences(template).some((sequence) =>
    Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
    })).some((start) => {
      const path = sequence.map(([x, y]) => ({
        row: start.row + y,
        col: start.col + x,
      }));
      const inBounds = path.every(
        ({ row, col }) =>
          row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE,
      );
      return inBounds && isLegalPuzzlePath(path);
    }),
  );
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

function remainingRunesThatCanHitCell(row, col) {
  return remainingRunes().filter((template) =>
    getPathSequences(template).some((sequence) =>
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
        row: Math.floor(index / BOARD_SIZE),
        col: index % BOARD_SIZE,
      })).some((start) => {
        const path = sequence.map(([x, y]) => ({
          row: start.row + y,
          col: start.col + x,
        }));
        return (
          path.some((cell) => cell.row === row && cell.col === col) &&
          path.every(
            (cell) =>
              cell.row >= 0 &&
              cell.row < BOARD_SIZE &&
              cell.col >= 0 &&
              cell.col < BOARD_SIZE,
          ) &&
          isLegalPuzzlePath(path)
        );
      }),
    ),
  ).length;
}

function canAnyRemainingRuneHitCell(row, col) {
  return remainingRunesThatCanHitCell(row, col) > 0;
}

function spawnEnemies() {
  const allPositions = shuffle(
    Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
    })),
  );

  if (isBossFloor()) {
    const config = currentBossConfig();
    const bossPosition =
      allPositions.find(({ row, col }) =>
        canAnyRemainingRuneHitCell(row, col),
      ) ?? allPositions[0];
    const normalCount = currentStage() === 3 ? 5 : 3;
    const normalPositions = allPositions
      .filter((position) => !sameCell(position, bossPosition))
      .slice(0, normalCount);
    const normalEnemies = normalPositions.map((position, index) => ({
      id: `${state.floor}-enemy-${index}`,
      kind: "normal",
      ...position,
      shieldCount: 0,
      moveIntent: null,
      corruptionPlanned: false,
    }));
    const boss = {
      id: `${state.floor}-boss`,
      kind: "boss",
      row: bossPosition.row,
      col: bossPosition.col,
      shieldCount: config.shieldCount,
      moveIntent: null,
      weakPoint: null,
      guardianTargetId: null,
      summonRoll: nextRandom(),
      corruptionPlanned: false,
    };
    if (config.variant === "guardian-link" && normalEnemies.length > 0) {
      boss.guardianTargetId =
        normalEnemies[Math.floor(nextRandom() * normalEnemies.length)].id;
    }
    state.enemies = [boss, ...normalEnemies];
    return;
  }

  const amount = Math.min(12, 7 + state.floor);
  state.enemies = allPositions.slice(0, amount).map((position, index) => ({
    id: `${state.floor}-enemy-${index}`,
    kind: "normal",
    ...position,
    shieldCount: 0,
    moveIntent: null,
    corruptionPlanned: false,
  }));
}

function planCorruptionSources() {
  state.enemies.forEach((enemy) => {
    enemy.corruptionPlanned = false;
  });
  const remainingBudget = Math.max(
    0,
    MAX_MONSTER_CORRUPTION_PER_FLOOR -
      state.monsterCorruptionCreated,
  );
  if (remainingBudget === 0) return;
  const eligible = state.enemies.filter(
    (enemy) => enemy.kind === "normal" && enemy.moveIntent,
  );
  const sourceCount = Math.min(
    MAX_CORRUPTION_SOURCES_PER_TURN,
    eligible.length,
    remainingBudget,
  );
  shuffle(eligible)
    .slice(0, sourceCount)
    .forEach((enemy) => {
      enemy.corruptionPlanned = true;
    });
}

function bossEscapeIntent(boss) {
  const adjacent = MOVE_DIRECTIONS.map(
    ({ rowDelta, colDelta, arrow }) => ({
      row: boss.row + rowDelta,
      col: boss.col + colDelta,
      rowDelta,
      colDelta,
      arrow,
    }),
  ).filter(
    ({ row, col }) =>
      row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE,
  );
  const normalByKey = new Map(
    state.enemies
      .filter((enemy) => enemy.kind === "normal")
      .map((enemy) => [cellKey(enemy.row, enemy.col), enemy]),
  );
  const priorities = [
    {
      kind: "trace",
      candidates: adjacent.filter(({ row, col }) =>
        state.claimed.has(cellKey(row, col)),
      ),
    },
    {
      kind: "corruption",
      candidates: adjacent.filter(({ row, col }) =>
        state.corrupted.has(cellKey(row, col)),
      ),
    },
    {
      kind: "monster",
      candidates: adjacent.filter(({ row, col }) =>
        normalByKey.has(cellKey(row, col)),
      ),
    },
  ];
  const group = priorities.find((entry) => entry.candidates.length > 0);
  if (!group) {
    const emptyCandidates = adjacent.filter(({ row, col }) => {
      const key = cellKey(row, col);
      return (
        !state.claimed.has(key) &&
        !state.corrupted.has(key) &&
        !normalByKey.has(key)
      );
    });
    if (emptyCandidates.length > 0) {
      const target =
        emptyCandidates[
          Math.floor(nextRandom() * emptyCandidates.length)
        ];
      void logPlayEvent("boss_mechanic", {
        mechanic: "escape",
        result: "emergency_empty_move",
        stage_index: currentStage(),
        floor_in_stage: currentFloorInStage(),
      });
      return {
        ...target,
        escape: true,
        obstacleKind: "empty",
        targetEnemyId: null,
      };
    }
    void logPlayEvent("boss_mechanic", {
      mechanic: "escape",
      result: "no_candidate",
      stage_index: currentStage(),
      floor_in_stage: currentFloorInStage(),
    });
    return null;
  }
  const target =
    group.candidates[Math.floor(nextRandom() * group.candidates.length)];
  return {
    ...target,
    escape: true,
    obstacleKind: group.kind,
    targetEnemyId:
      group.kind === "monster"
        ? normalByKey.get(cellKey(target.row, target.col))?.id ?? null
        : null,
  };
}

function planWeakPoint(boss) {
  boss.weakPoint = null;
  if (currentBossConfig()?.variant !== "weak-point") return;
  const occupied = new Set(
    state.enemies.map((enemy) => cellKey(enemy.row, enemy.col)),
  );
  const reservedKey = boss.moveIntent
    ? cellKey(boss.moveIntent.row, boss.moveIntent.col)
    : null;
  const candidates = Array.from(
    { length: BOARD_SIZE * BOARD_SIZE },
    (_, index) => ({
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
    }),
  ).filter(({ row, col }) => {
    const key = cellKey(row, col);
    return (
      key !== reservedKey &&
      !occupied.has(key) &&
      !state.claimed.has(key) &&
      !state.corrupted.has(key) &&
      canAnyRemainingRuneHitCell(row, col)
    );
  });
  if (candidates.length === 0) {
    state.bossMechanicStats.weakPointNoCandidate += 1;
    void logPlayEvent("boss_mechanic", {
      mechanic: "weak_point",
      result: "no_candidate",
      stage_index: currentStage(),
      floor_in_stage: currentFloorInStage(),
    });
    return;
  }
  boss.weakPoint =
    candidates[Math.floor(nextRandom() * candidates.length)];
}

function ensureBossStateForCurrentConfig() {
  const boss = state.enemies.find((enemy) => enemy.kind === "boss");
  const config = currentBossConfig();
  if (!boss || !config) return;
  boss.shieldCount = Math.min(boss.shieldCount, config.shieldCount);
  if (config.variant === "guardian-link") {
    boss.weakPoint = null;
    if (!boss.guardianTargetId) {
      const normalTargets = state.enemies.filter(
        (enemy) => enemy.kind === "normal",
      );
      boss.guardianTargetId =
        normalTargets[
          Math.floor(nextRandom() * normalTargets.length)
        ]?.id ?? null;
    }
  } else {
    boss.guardianTargetId = null;
  }
  if (config.variant === "weak-point") {
    if (!boss.weakPoint) planWeakPoint(boss);
  } else {
    boss.weakPoint = null;
  }
}

function planEnemyMoves() {
  const occupied = new Set(
    state.enemies.map((enemy) => cellKey(enemy.row, enemy.col)),
  );
  const reserved = new Set();
  const boss = state.enemies.find((enemy) => enemy.kind === "boss");
  const actors = [
    ...(boss ? [boss] : []),
    ...shuffle(state.enemies.filter((enemy) => enemy.kind !== "boss")),
  ];

  actors.forEach((enemy) => {
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
          !reserved.has(key) &&
          (
            enemy.kind !== "boss" ||
            canAnyRemainingRuneHitCell(row, col)
          )
        );
      });

    let destination =
      candidates[Math.floor(nextRandom() * candidates.length)] ?? null;
    if (enemy.kind === "boss" && !destination) {
      destination = bossEscapeIntent(enemy);
    }
    enemy.moveIntent = destination;
    if (destination) {
      reserved.add(cellKey(destination.row, destination.col));
    }
    if (enemy.kind === "boss") {
      enemy.summonRoll = nextRandom();
    }
  });
  if (boss) {
    planWeakPoint(boss);
  }
  planCorruptionSources();
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
      weakPoint: enemy.weakPoint ? { ...enemy.weakPoint } : null,
    })),
    defeated: state.defeated,
    directDefeated: state.directDefeated,
    experience: state.experience,
    level: state.level,
    abilities: [...state.abilities],
    ricochetUsed: state.ricochetUsed,
    puzzleUses: { ...state.puzzleUses },
    pendingAbilityChoices: [...state.pendingAbilityChoices],
    abilityChoiceLocks: { ...state.abilityChoiceLocks },
    replacementSerial: state.replacementSerial,
    randomState: state.randomState,
    monsterCorruptionCreated: state.monsterCorruptionCreated,
    bossMechanicStats: {
      hitSources: { ...state.bossMechanicStats.hitSources },
      weakPointNoCandidate: state.bossMechanicStats.weakPointNoCandidate,
      escapeCount: state.bossMechanicStats.escapeCount,
      escapeRemoved: { ...state.bossMechanicStats.escapeRemoved },
    },
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
    weakPoint: enemy.weakPoint ? { ...enemy.weakPoint } : null,
    corruptionPlanned: Boolean(enemy.corruptionPlanned),
  }));
  state.defeated = snapshot.defeated;
  state.directDefeated = snapshot.directDefeated;
  state.experience = snapshot.experience;
  state.level = snapshot.level;
  state.abilities = [...snapshot.abilities];
  state.ricochetUsed = snapshot.ricochetUsed;
  state.puzzleUses = { ...snapshot.puzzleUses };
  state.pendingAbilityChoices = [...snapshot.pendingAbilityChoices];
  state.abilityChoiceLocks = { ...(snapshot.abilityChoiceLocks ?? {}) };
  state.replacementSerial = snapshot.replacementSerial;
  state.randomState = snapshot.randomState ?? state.randomState;
  state.monsterCorruptionCreated =
    snapshot.monsterCorruptionCreated ?? 0;
  state.bossMechanicStats = {
    hitSources: { ...(snapshot.bossMechanicStats?.hitSources ?? {}) },
    weakPointNoCandidate:
      snapshot.bossMechanicStats?.weakPointNoCandidate ?? 0,
    escapeCount: snapshot.bossMechanicStats?.escapeCount ?? 0,
    escapeRemoved: {
      ...(snapshot.bossMechanicStats?.escapeRemoved ?? {}),
    },
  };
  if (snapshot.monsterCorruptionCreated === undefined) {
    planCorruptionSources();
  }
  state.pendingLevelUps = snapshot.pendingLevelUps;
  state.pendingOutcome = snapshot.pendingOutcome;
  state.running = snapshot.running;
  ensureBossStateForCurrentConfig();
  state.levelUpReviewingBoard = false;
  state.currentPath = [];
  state.drawing = false;
  state.pointerId = null;
}

function saveRunState() {
  try {
    const payload = {
      version: APP_VERSION,
      savedAt: Date.now(),
      floor: state.floor,
      snapshot: createStateSnapshot(),
      history: state.history,
      floorInitialSnapshot: state.floorInitialSnapshot,
      bossConfigs: state.bossConfigs,
      floorStartExperience: state.floorStartExperience,
      floorStartLevel: state.floorStartLevel,
      floorStartAbilities: state.floorStartAbilities,
      stageStartExperience: state.stageStartExperience,
      stageStartLevel: state.stageStartLevel,
      stageStartAbilities: state.stageStartAbilities,
      floorStartedAt: state.floorStartedAt,
      stageStartedAt: state.stageStartedAt,
      lastFailureReason: state.lastFailureReason,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("룬 트레이스 진행 상태를 저장하지 못했습니다.", error);
  }
}

function restoreRunState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (
      !COMPATIBLE_SAVE_VERSIONS.has(payload?.version) ||
      !payload.snapshot ||
      !Array.isArray(payload.bossConfigs)
    ) {
      return false;
    }
    state.floor = payload.floor;
    state.bossConfigs = createBossConfigs();
    restoreStateSnapshot(payload.snapshot);
    state.history = Array.isArray(payload.history) ? payload.history : [];
    state.floorInitialSnapshot = payload.floorInitialSnapshot ?? null;
    state.floorStartExperience = payload.floorStartExperience ?? 0;
    state.floorStartLevel = payload.floorStartLevel ?? 1;
    state.floorStartAbilities = payload.floorStartAbilities ?? [];
    state.stageStartExperience = payload.stageStartExperience ?? 0;
    state.stageStartLevel = payload.stageStartLevel ?? 1;
    state.stageStartAbilities = payload.stageStartAbilities ?? [];
    state.floorStartedAt = payload.floorStartedAt ?? Date.now();
    state.stageStartedAt = payload.stageStartedAt ?? state.floorStartedAt;
    state.lastFailureReason = payload.lastFailureReason ?? null;
    state.restoredFromSave = true;
    render();
    return true;
  } catch (error) {
    console.warn("룬 트레이스 진행 상태를 복원하지 못했습니다.", error);
    return false;
  }
}

function startFloor(
  floor,
  { retry = false, logStart = true, analyticsRetry = false } = {},
) {
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
  state.ricochetUsed = false;
  state.puzzleUses = {
    corruptionIgnore: false,
    runeLink: false,
    runeReplace: false,
  };
  state.pendingAbilityChoices = [];
  state.replacementSerial = 0;
  state.monsterCorruptionCreated = 0;
  state.bossMechanicStats = {
    hitSources: {},
    weakPointNoCandidate: 0,
    escapeCount: 0,
    escapeRemoved: {},
  };
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  state.history = [];
  state.running = true;
  state.lastFailureReason = null;
  spawnEnemies();
  planEnemyMoves();
  state.floorInitialSnapshot = createStateSnapshot();
  state.floorStartedAt = Date.now();
  if (currentFloorInStage() === 1) {
    state.stageStartedAt = state.floorStartedAt;
  }
  setFeedback("목록에 있는 룬을 판 위에 바로 그리세요.");
  render();
  if (logStart) {
    logStageAndFloorStart({ retry: analyticsRetry });
    if (isBossFloor()) {
      void logPlayEvent("boss_start", {
        chapter_id: "chapter_01",
        stage_index: currentStage(),
        floor_in_stage: currentFloorInStage(),
        boss_type: currentBossConfig()?.type ?? "moving-boss",
        boss_variant: currentBossConfig()?.variant ?? null,
        shield_count: currentBossConfig()?.shieldCount ?? 0,
      });
    }
  }
  saveRunState();
}

function undoLastRune() {
  if (state.pendingLevelUps > 0) {
    setFeedback("능력 선택을 완료한 뒤 되돌릴 수 있습니다.", "alert");
    return;
  }
  const snapshot = state.history.pop();
  if (!snapshot) {
    setFeedback("되돌릴 완성 룬이 없습니다.", "alert");
    return;
  }
  restoreStateSnapshot(snapshot);
  state.running = true;
  setFeedback("마지막 룬을 그리기 전 상태로 되돌렸습니다.", "success");
  render();
  saveRunState();
}

function resetFloor() {
  if (state.pendingLevelUps > 0) {
    setFeedback("능력 선택을 완료한 뒤 층을 초기화할 수 있습니다.", "alert");
    return;
  }
  if (!state.floorInitialSnapshot) {
    return;
  }
  const previousFailureReason = state.lastFailureReason;
  void logPlayEvent("retry", {
    retry_scope: "floor",
    previous_failure_reason: previousFailureReason,
    retry_stage_id: stageId(),
    retry_floor_index: state.floor,
  });
  restoreStateSnapshot(state.floorInitialSnapshot);
  state.history = [];
  state.running = true;
  state.lastFailureReason = null;
  state.floorStartedAt = Date.now();
  setFeedback("현재 층을 최초 배치로 초기화했습니다.");
  render();
  void logPlayEvent("floor_start", {
    ...boardLogPayload(),
    retry: true,
  });
  saveRunState();
}

function restartChapter() {
  void logPlayEvent("retry", {
    retry_scope: "chapter",
    previous_failure_reason: state.lastFailureReason,
    retry_stage_id: "chapter_01_stage_1",
    retry_floor_index: 1,
  });
  state.experience = 0;
  state.level = 1;
  state.abilities = [];
  state.abilityChoiceLocks = {};
  state.randomState = createRandomSeed();
  state.directDefeated = 0;
  state.ricochetUsed = false;
  state.bossConfigs = createBossConfigs();
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  startFloor(1, { analyticsRetry: true });
  showBossInfoForCurrentEntry();
}

function clearRunSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn("룬 트레이스 진행 저장을 삭제하지 못했습니다.", error);
  }
}

function resetPlayData(source = "qa") {
  void logPlayEvent("data_reset", {
    source,
    previous_stage_index: currentStage(),
    previous_floor_in_stage: currentFloorInStage(),
    previous_level: state.level,
    previous_experience: state.experience,
  }, { flush: true });
  clearRunSave();
  state.experience = 0;
  state.level = 1;
  state.abilities = [];
  state.abilityChoiceLocks = {};
  state.randomState = createRandomSeed();
  state.directDefeated = 0;
  state.ricochetUsed = false;
  state.bossConfigs = createBossConfigs();
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  state.restoredFromSave = false;
  startFloor(1);
  setFeedback("플레이 데이터를 초기 상태로 되돌렸습니다.", "success");
}

function restartStage() {
  const firstFloor = (currentStage() - 1) * FLOORS_PER_STAGE + 1;
  void logPlayEvent("retry", {
    retry_scope: "stage",
    previous_failure_reason: state.lastFailureReason,
    retry_stage_id: stageId(),
    retry_floor_index: firstFloor,
  });
  state.experience = state.stageStartExperience;
  state.level = state.stageStartLevel;
  state.abilities = [...state.stageStartAbilities];
  state.pendingLevelUps = 0;
  state.pendingOutcome = null;
  startFloor(firstFloor, { analyticsRetry: true });
  showBossInfoForCurrentEntry();
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

function ricochetTargets(path, survivors, level) {
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
    const center = {
      row: endpoint.row + rowDelta,
      col: endpoint.col + colDelta,
    };
    if (rowDelta !== 0 && colDelta !== 0) {
      cells = [
        { row: endpoint.row + rowDelta, col: endpoint.col },
        center,
        { row: endpoint.row, col: endpoint.col + colDelta },
      ];
    } else {
      cells = rowDelta === 0
        ? [-1, 0, 1].map((offset) => ({
            row: center.row + offset,
            col: center.col,
          }))
        : [-1, 0, 1].map((offset) => ({
            row: center.row,
            col: center.col + offset,
          }));
    }
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

function summonPreviewCell(actors, pathKeys, boss) {
  const config = currentBossConfig();
  if (
    !boss ||
    !boss.alive ||
    config?.variant !== "reinforcement" ||
    !boss.wasHit
  ) {
    return null;
  }

  const escapeRemovedEnemyId =
    boss.moveIntent?.escape ? boss.moveIntent.targetEnemyId : null;
  const projected = actors
    .filter(
      (actor) => actor.alive && actor.id !== escapeRemovedEnemyId,
    )
    .map((actor) => {
      const destination = actor.moveIntent;
      const destinationKey = destination
        ? cellKey(destination.row, destination.col)
        : null;
      const canMove =
        destination &&
        (
          destination.escape ||
          (
            !pathKeys.has(destinationKey) &&
            !state.claimed.has(destinationKey) &&
            !state.corrupted.has(destinationKey)
          )
        );
      return {
        id: actor.id,
        row: canMove ? destination.row : actor.row,
        col: canMove ? destination.col : actor.col,
      };
    });
  const projectedBoss = projected.find((actor) => actor.id === boss.id);
  if (!projectedBoss) return null;
  const occupied = new Set(
    projected.map((actor) => cellKey(actor.row, actor.col)),
  );
  const candidates = MOVE_DIRECTIONS
    .map(({ rowDelta, colDelta }) => ({
      row: projectedBoss.row + rowDelta,
      col: projectedBoss.col + colDelta,
    }))
    .filter(({ row, col }) => {
      const key = cellKey(row, col);
      return (
        row >= 0 &&
        row < BOARD_SIZE &&
        col >= 0 &&
        col < BOARD_SIZE &&
        !pathKeys.has(key) &&
        !state.claimed.has(key) &&
        !state.corrupted.has(key) &&
        !occupied.has(key)
      );
    })
    .sort((a, b) => a.row - b.row || a.col - b.col);
  if (candidates.length === 0) return null;
  const index = Math.floor((boss.summonRoll ?? 0) * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}

function corruptionPreview(actors, pathKeys, summonCell) {
  const boss = actors.find((actor) => actor.kind === "boss");
  const escapeRemovedEnemyId =
    boss?.moveIntent?.escape ? boss.moveIntent.targetEnemyId : null;
  const projectedById = new Map();
  actors
    .filter(
      (actor) => actor.alive && actor.id !== escapeRemovedEnemyId,
    )
    .forEach((actor) => {
      const destination = actor.moveIntent;
      const destinationKey = destination
        ? cellKey(destination.row, destination.col)
        : null;
      const canMove =
        destination &&
        (
          destination.escape ||
          (
            !pathKeys.has(destinationKey) &&
            !state.claimed.has(destinationKey) &&
            !state.corrupted.has(destinationKey)
          )
        );
      projectedById.set(actor.id, {
        row: canMove ? destination.row : actor.row,
        col: canMove ? destination.col : actor.col,
        moved: Boolean(canMove),
      });
    });
  const occupied = new Set(
    [...projectedById.values()].map(({ row, col }) => cellKey(row, col)),
  );
  const summonKey = summonCell
    ? cellKey(summonCell.row, summonCell.col)
    : null;
  const willCorruptIds = new Set();
  const cancelledCorruptionIds = new Set();

  actors
    .filter(
      (actor) =>
        actor.corruptionPlanned && actor.id !== escapeRemovedEnemyId,
    )
    .forEach((actor) => {
      const projected = projectedById.get(actor.id);
      const originKey = cellKey(actor.row, actor.col);
      const willCorrupt =
        actor.alive &&
        projected?.moved &&
        !pathKeys.has(originKey) &&
        !state.claimed.has(originKey) &&
        !state.corrupted.has(originKey) &&
        !occupied.has(originKey) &&
        originKey !== summonKey;
      (willCorrupt ? willCorruptIds : cancelledCorruptionIds).add(
        actor.id,
      );
    });

  return { willCorruptIds, cancelledCorruptionIds };
}

function combatPreview(path) {
  const actors = state.enemies.map((enemy) => ({
    ...enemy,
    moveIntent: enemy.moveIntent ? { ...enemy.moveIntent } : null,
    alive: true,
    wasHit: false,
  }));
  const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
  const hitTargetIds = new Set();
  const directTargetIds = new Set();
  const extraTargetIds = new Set();
  const defeatTargetIds = new Set();
  const shieldBreakTargetIds = new Set();
  const rangeKeys = new Set();
  const outcomes = [];
  const pathKeys = new Set(
    path.map(({ row, col }) => cellKey(row, col)),
  );
  const boss = actors.find((actor) => actor.kind === "boss");

  function resolveHit(actor, source) {
    if (!actor?.alive || hitTargetIds.has(actor.id)) return null;
    hitTargetIds.add(actor.id);
    actor.wasHit = true;
    const result = actor.shieldCount > 0 ? "shield" : "kill";
    if (result === "shield") {
      actor.shieldCount -= 1;
      shieldBreakTargetIds.add(actor.id);
    } else {
      actor.alive = false;
      defeatTargetIds.add(actor.id);
    }
    if (source === "direct") {
      directTargetIds.add(actor.id);
    } else {
      extraTargetIds.add(actor.id);
    }
    const outcome = { id: actor.id, source, result };
    outcomes.push(outcome);
    return outcome;
  }

  path.forEach((cell) => {
    const actor = actors.find(
      (entry) => entry.row === cell.row && entry.col === cell.col,
    );
    resolveHit(actor, "direct");
  });
  const weakPointTriggered =
    currentBossConfig()?.variant === "weak-point" &&
    boss?.weakPoint &&
    pathKeys.has(cellKey(boss.weakPoint.row, boss.weakPoint.col));
  if (weakPointTriggered) {
    resolveHit(boss, "weak-point");
  }
  const directNormalKills = outcomes.filter(
    (outcome) =>
      outcome.source === "direct" &&
      outcome.result === "kill" &&
      actorsById.get(outcome.id)?.kind === "normal",
  ).length;

  const endpointSlashLevel = abilityLevel("endpoint-slash");
  if (endpointSlashLevel > 0) {
    endpointSlashCells(path, endpointSlashLevel).forEach((cell) => {
      const key = cellKey(cell.row, cell.col);
      rangeKeys.add(key);
      const actor = actors.find(
        (entry) =>
          entry.alive && entry.row === cell.row && entry.col === cell.col,
      );
      resolveHit(actor, "endpoint-slash");
    });
  }

  const temptationLevel = abilityLevel("temptation");
  if (temptationLevel > 0) {
    temptationTargets(
      path,
      actors.filter(
        (actor) =>
          actor.kind === "normal" &&
          actor.alive &&
          !hitTargetIds.has(actor.id),
      ),
      temptationLevel,
    ).forEach((actor) => resolveHit(actor, "temptation"));
  }

  const ricochetLevel = abilityLevel("ricochet");
  const ricochetTriggered =
    ricochetLevel > 0 &&
    !state.ricochetUsed &&
    directNormalKills >= 2;
  if (ricochetTriggered) {
    ricochetTargets(
      path,
      actors.filter(
        (actor) =>
          actor.kind === "normal" &&
          actor.alive &&
          !hitTargetIds.has(actor.id),
      ),
      ricochetLevel,
    ).forEach((actor) => resolveHit(actor, "ricochet"));
  }

  const guardianTargetDefeated =
    currentBossConfig()?.variant === "guardian-link" &&
    outcomes.some(
      (outcome) =>
        outcome.id === boss?.guardianTargetId &&
        outcome.result === "kill",
    );
  if (guardianTargetDefeated) {
    resolveHit(boss, "guardian-link");
  }
  const collisionTriggered = Boolean(
    boss?.alive &&
    boss.moveIntent &&
    !boss.moveIntent.escape &&
    pathKeys.has(cellKey(boss.moveIntent.row, boss.moveIntent.col)) &&
    !state.claimed.has(
      cellKey(boss.moveIntent.row, boss.moveIntent.col),
    ) &&
    !state.corrupted.has(
      cellKey(boss.moveIntent.row, boss.moveIntent.col),
    ),
  );
  if (collisionTriggered) {
    resolveHit(boss, "charge-collision");
  }
  const bossOutcome = outcomes.find((outcome) => outcome.id === boss?.id);
  const summonCell = summonPreviewCell(actors, pathKeys, boss);
  const corruption = corruptionPreview(actors, pathKeys, summonCell);
  return {
    outcomes,
    actors,
    hitTargetIds,
    directTargetIds,
    extraTargetIds,
    defeatTargetIds,
    shieldBreakTargetIds,
    rangeKeys,
    ricochetTriggered,
    directNormalKills,
    weakPointTriggered,
    guardianTargetDefeated,
    collisionTriggered,
    bossHitSource: bossOutcome?.source ?? null,
    summonCell,
    ...corruption,
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
    !state.lastFailureReason;
  refs.floorContext.textContent = `CHAPTER 01 · STAGE ${stage}`;
  refs.floorDisplay.textContent = `FLOOR ${floor} / ${FLOORS_PER_STAGE}`;
  refs.levelCount.textContent = String(state.level);
  refs.enemyCount.textContent = String(state.enemies.length);
  refs.experienceCount.textContent = `${levelExperience} / ${EXPERIENCE_PER_LEVEL}`;
  refs.safeCount.textContent = String(
    BOARD_SIZE * BOARD_SIZE - state.claimed.size - state.corrupted.size,
  );
  const bossConfig = currentBossConfig();
  refs.bossEffectBanner.innerHTML = bossConfig
    ? `<strong>${bossVariantName(bossConfig.variant)}</strong><span>${bossVariantEffect(bossConfig.variant)}</span>`
    : "<strong>보스 변형 없음</strong><span>추가 효과 없음</span>";
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
    isBossFloor() && state.enemies.some((enemy) => enemy.kind === "boss")
      ? `남은 룬 ${RUNES_PER_FLOOR - complete}개로 보스를 처치하세요`
      : complete < RUNES_PER_FLOOR
      ? `남은 룬 ${RUNES_PER_FLOOR - complete}개 중 하나를 그리세요`
      : "모든 룬 완성";
}

function renderRunControls() {
  const levelUpPending = state.pendingLevelUps > 0;
  refs.undoButton.disabled = levelUpPending || state.history.length === 0;
  refs.resetButton.disabled = levelUpPending || !state.floorInitialSnapshot;
  refs.undoButton.title = levelUpPending
    ? "능력 선택을 먼저 완료해야 합니다."
    : state.history.length === 0
      ? "직전 룬 행동 기록이 없습니다."
      : "직전 룬 행동 이전 상태를 복원합니다.";
  refs.resetButton.title = levelUpPending
    ? "능력 선택을 먼저 완료해야 합니다."
    : !state.floorInitialSnapshot
      ? "플로어 최초 상태가 없습니다."
      : "현재 플로어 최초 진입 상태를 복원합니다.";
  refs.undoReason.textContent = refs.undoButton.title;
  refs.resetReason.textContent = refs.resetButton.title;
  refs.qaMenuButton.setAttribute("aria-expanded", String(state.qaOpen));
  refs.qaPanel.setAttribute("aria-hidden", String(!state.qaOpen));
  refs.qaPanel.classList.toggle("is-open", state.qaOpen);
  refs.appShell.classList.toggle("is-qa-open", state.qaOpen);

  if (state.abilities.length === 0) {
    refs.abilityList.innerHTML = "<small>획득 능력 없음</small>";
  } else {
    const owned = ALL_ABILITIES
      .map((ability) => ({
        ...ability,
        level: abilityLevel(ability.id),
      }))
      .filter((ability) => ability.level > 0);
    refs.abilityList.innerHTML = owned
      .map((ability) => {
        const usage = abilityUsageState(ability);
        const mode = ability.category === "combat" ? "AUTO" : "USE";
        return `
          <button
            class="ability-icon-button${ability.category === "puzzle" ? " is-puzzle" : ""}"
            type="button"
            data-ability-id="${ability.id}"
            aria-label="${ability.name} 상세 보기, 레벨 ${ability.level}, ${usage.label}"
            title="${ability.name} · ${usage.label}"
          >
            <span class="ability-icon" aria-hidden="true">${ability.icon}</span>
            <span class="ability-name">${ability.name}</span>
            <span class="ability-level">LV.${ability.level}</span>
            <span class="ability-mode">${mode}</span>
            <i class="ability-use-state${usage.used ? " is-used" : ""}" aria-hidden="true"></i>
          </button>
        `;
      })
      .join("");
  }

  const selectedAbilityId = refs.qaAbilitySelect.value;
  const availableAbilities = ALL_ABILITIES.filter(
    (ability) => abilityLevel(ability.id) < ability.maxLevel,
  );
  refs.qaAbilitySelect.innerHTML = availableAbilities.length > 0
    ? availableAbilities
        .map((ability) => `
          <option value="${ability.id}">
            ${ability.name} · LV.${abilityLevel(ability.id)}/${ability.maxLevel}
          </option>
        `)
        .join("")
    : '<option value="">모든 능력 최대 단계</option>';
  if (
    selectedAbilityId &&
    availableAbilities.some((ability) => ability.id === selectedAbilityId)
  ) {
    refs.qaAbilitySelect.value = selectedAbilityId;
  }
  refs.qaAbilitySelect.disabled = availableAbilities.length === 0;
  refs.qaAbilityAddButton.disabled =
    levelUpPending || availableAbilities.length === 0;
  refs.qaAbilityReason.textContent = levelUpPending
    ? "대기 중인 레벨업 후보를 유지하기 위해 선택 완료 후 사용할 수 있습니다."
    : availableAbilities.length === 0
      ? "모든 능력이 최대 단계입니다."
      : "선택 능력의 실제 보유 단계를 1 올립니다.";

  refs.qaLevelUpButton.disabled = levelUpPending || !state.running;
  refs.qaLevelUpReason.textContent = levelUpPending
    ? "이미 처리할 레벨업이 대기 중입니다."
    : !state.running
      ? "플로어 진행 중에만 발생시킬 수 있습니다."
      : "실제 EXP 지급 경로로 다음 레벨업을 발생시킵니다.";

  const previousRuneId = refs.qaRuneSelect.value;
  const rerollableRunes = remainingRunes();
  refs.qaRuneSelect.innerHTML = rerollableRunes.length > 0
    ? rerollableRunes
        .map((rune) => `
          <option value="${rune.instanceId}">
            ${rune.name} · ${rune.points.length}칸
          </option>
        `)
        .join("")
    : '<option value="">남은 룬 없음</option>';
  if (
    previousRuneId &&
    rerollableRunes.some((rune) => rune.instanceId === previousRuneId)
  ) {
    refs.qaRuneSelect.value = previousRuneId;
  }
  refs.qaRuneSelect.disabled = rerollableRunes.length === 0;
  refs.qaRuneRerollButton.disabled = rerollableRunes.length === 0;
  refs.qaRuneRerollAllButton.disabled = rerollableRunes.length === 0;
  refs.qaRuneReason.textContent = rerollableRunes.length === 0
    ? "교체할 남은 룬이 없습니다."
    : "룬 교체 능력을 소비하지 않고 지정 범위만 다시 생성합니다.";

  refs.qaDataResetButton.disabled = levelUpPending;
  refs.qaDataResetReason.textContent = levelUpPending
    ? "능력 선택을 완료한 뒤 초기화할 수 있습니다."
    : "진행 저장만 초기화하며 익명 참여자 ID와 로그 동의는 유지합니다.";
}

function setQaPanel(open) {
  state.qaOpen = Boolean(open);
  renderRunControls();
  scheduleWorkspaceFit();
  if (state.qaOpen) {
    window.setTimeout(() => refs.qaCloseButton.focus(), 0);
  } else {
    refs.qaMenuButton.focus({ preventScroll: true });
  }
}

function updateQaSnapshots(mutator) {
  if (state.floorInitialSnapshot) {
    mutator(state.floorInitialSnapshot);
  }
  state.history.forEach(mutator);
}

function qaAddAbility() {
  if (state.pendingLevelUps > 0) return;
  const ability = abilityById(refs.qaAbilitySelect.value);
  if (!ability) return;
  const currentLevel = abilityLevel(ability.id);
  if (currentLevel >= ability.maxLevel) {
    renderRunControls();
    return;
  }
  state.abilities.push(ability.id);
  state.floorStartAbilities.push(ability.id);
  state.stageStartAbilities.push(ability.id);
  updateQaSnapshots((snapshot) => {
    snapshot.abilities = [...(snapshot.abilities ?? []), ability.id];
  });
  setFeedback(
    `${ability.name}을 LV.${currentLevel + 1}(으)로 설정했습니다.`,
    "success",
  );
  render();
  saveRunState();
}

function qaTriggerLevelUp() {
  if (state.pendingLevelUps > 0 || !state.running) return;
  const requiredExperience = state.level * EXPERIENCE_PER_LEVEL;
  const amount = Math.max(1, requiredExperience - state.experience);
  grantExperience(amount);
  setFeedback(`QA · EXP +${amount}, 레벨업 선택을 시작합니다.`, "success");
  render();
  saveRunState();
  window.setTimeout(resolveQueuedModal, 0);
}

function createQaRerolledRune(previousRune) {
  const candidates = RUNE_TEMPLATES.filter(
    (template) => template.id !== previousRune.id,
  );
  const replacement =
    candidates[Math.floor(nextRandom() * candidates.length)];
  state.replacementSerial += 1;
  return {
    ...replacement,
    points: replacement.points.map((point) => [...point]),
    instanceId:
      `${state.floor}-${replacement.id}-qa-${state.replacementSerial}`,
    color: previousRune.color,
    complete: false,
  };
}

function qaRerollRunes(instanceIds) {
  const targets = new Set(instanceIds);
  if (targets.size === 0) return;
  let changed = 0;
  state.runes = state.runes.map((rune) => {
    if (rune.complete || !targets.has(rune.instanceId)) return rune;
    changed += 1;
    return createQaRerolledRune(rune);
  });
  if (changed === 0) return;
  state.currentPath = [];
  state.drawing = false;
  state.pointerId = null;
  planEnemyMoves();
  setFeedback(`QA · 남은 룬 ${changed}개를 다시 생성했습니다.`, "success");
  render();
  saveRunState();
}

function qaRerollSelectedRune() {
  const instanceId = refs.qaRuneSelect.value;
  if (!instanceId) return;
  qaRerollRunes([instanceId]);
}

function qaRerollAllRunes() {
  qaRerollRunes(remainingRunes().map((rune) => rune.instanceId));
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
        hitTargetIds: new Set(),
        defeatTargetIds: new Set(),
        shieldBreakTargetIds: new Set(),
        directTargetIds: new Set(),
        extraTargetIds: new Set(),
        rangeKeys: new Set(),
        weakPointTriggered: false,
        guardianTargetDefeated: false,
        collisionTriggered: false,
        bossHitSource: null,
        summonCell: null,
        willCorruptIds: new Set(),
        cancelledCorruptionIds: new Set(),
      };
  const boss = state.enemies.find((enemy) => enemy.kind === "boss");
  const weakPointKey = boss?.weakPoint
    ? cellKey(boss.weakPoint.row, boss.weakPoint.col)
    : null;
  const guardianTarget = state.enemies.find(
    (enemy) => enemy.id === boss?.guardianTargetId,
  );
  const guardianTargetKey = guardianTarget
    ? cellKey(guardianTarget.row, guardianTarget.col)
    : null;
  const collisionKey =
    preview.collisionTriggered && boss?.moveIntent
      ? cellKey(boss.moveIntent.row, boss.moveIntent.col)
      : null;
  const escapeKey =
    boss?.moveIntent?.escape
      ? cellKey(boss.moveIntent.row, boss.moveIntent.col)
      : null;
  const summonKey = preview.summonCell
    ? cellKey(preview.summonCell.row, preview.summonCell.col)
    : null;
  const linkPreview = linkedPathForPath(state.currentPath);

  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const key = cellKey(row, col);
      const classes = ["grid-cell"];
      if (state.claimed.has(key)) classes.push("is-claimed");
      if (state.corrupted.has(key)) classes.push("is-corrupted");
      if (currentKeys.has(key)) classes.push("is-current");
      if (preview.rangeKeys.has(key)) classes.push("is-ability-range");
      if (weakPointKey === key) classes.push("is-weak-point");
      if (collisionKey === key) classes.push("is-collision-target");
      if (escapeKey === key) classes.push("is-escape-target");
      if (
        canUseRuneLink() &&
        state.claimed.has(key) &&
        completedPathAtEndpoint({ row, col })
      ) {
        classes.push("is-link-endpoint");
      }
      const enemy = enemiesByCell.get(key);
      const intent = enemy?.moveIntent;
      const corruptionCancelled =
        preview.cancelledCorruptionIds.has(enemy?.id);
      if (enemy?.corruptionPlanned) {
        classes.push("is-corruption-preview");
      }
      if (corruptionCancelled) {
        classes.push("is-corruption-cancelled");
      }
      const enemyClasses = ["enemy"];
      if (enemy?.kind === "boss") enemyClasses.push("is-boss");
      if (enemy?.kind === "boss" && enemy.shieldCount > 0) {
        enemyClasses.push("has-shield");
      }
      if (enemy?.corruptionPlanned) {
        enemyClasses.push("is-corruption-source");
      }
      if (guardianTargetKey === key) {
        enemyClasses.push("is-guardian-target");
      }
      if (preview.hitTargetIds.has(enemy?.id)) {
        enemyClasses.push("is-hit-preview");
      }
      if (preview.defeatTargetIds.has(enemy?.id)) {
        enemyClasses.push("is-defeat-preview");
      }
      if (preview.shieldBreakTargetIds.has(enemy?.id)) {
        enemyClasses.push("is-shield-break-preview");
      }
      if (preview.extraTargetIds.has(enemy?.id)) {
        enemyClasses.push("is-ability-preview");
      }
      cells.push(`
        <div class="${classes.join(" ")}">
          ${
            enemy
              ? `
                <span class="${enemyClasses.join(" ")}">
                  ${
                    enemy.kind === "boss" && enemy.shieldCount > 0
                      ? '<span class="boss-shield-overlay" aria-hidden="true"></span>'
                      : ""
                  }
                  <span class="enemy-mark">${enemy.kind === "boss" ? "♛" : "◆"}</span>
                  ${
                    enemy.corruptionPlanned
                      ? '<span class="enemy-corruption-icon" aria-label="이동 후 현재 칸 오염 예정">✦</span>'
                      : ""
                  }
                  ${
                    enemy.shieldCount > 0
                      ? `<span class="enemy-shield" aria-label="방어막 ${enemy.shieldCount}개">◈${enemy.shieldCount}</span>`
                      : ""
                  }
                  ${
                    enemy.kind === "boss" && preview.bossHitSource
                      ? `<span class="boss-hit-source">${bossHitSourceName(preview.bossHitSource)}</span>`
                      : ""
                  }
                </span>
                <span
                  class="enemy-intent${intent ? "" : " is-stopped"}${enemy.kind === "boss" ? " is-boss-intent" : ""}${intent?.escape ? " is-escape-intent" : ""}${preview.defeatTargetIds.has(enemy.id) ? " is-defeat-preview" : ""}"
                  style="--move-x:${intent?.colDelta ?? 0};--move-y:${intent?.rowDelta ?? 0}"
                >
                  ${
                    intent
                      ? intent.arrow
                      : '<img class="enemy-stop-icon" src="./assets/stop-intent-lock.png" alt="" aria-hidden="true">'
                  }
                </span>
              `
              : ""
          }
          ${
            enemy?.corruptionPlanned
              ? `<span class="corruption-cell-preview${corruptionCancelled ? " is-cancelled" : ""}" aria-label="이동 후 오염 예정 칸"></span>`
              : ""
          }
          ${summonKey === key ? '<span class="summon-ghost" aria-label="증원 소환 예정">◆</span>' : ""}
          ${weakPointKey === key ? '<span class="weak-point-marker" aria-label="약점 표식">◎<b>약점</b></span>' : ""}
          ${collisionKey === key ? '<span class="collision-marker" aria-label="돌진 충돌 예정">!<b>충돌</b></span>' : ""}
          ${escapeKey === key ? '<span class="escape-crack" aria-label="탈출 이동으로 제거 예정">✦<b>탈출</b></span>' : ""}
        </div>
      `);
    }
  }
  refs.gridCells.innerHTML = cells.join("");

  const completedLines = [];
  if (boss && guardianTarget) {
    completedLines.push(
      `<line class="guardian-link-line${preview.guardianTargetDefeated ? " is-triggered" : ""}" x1="${boss.col + 0.5}" y1="${boss.row + 0.5}" x2="${guardianTarget.col + 0.5}" y2="${guardianTarget.row + 0.5}"></line>`,
    );
  }
  state.completedPaths.forEach((entry) => {
    const segments = [];
    let segment = [];
    entry.path.forEach((point) => {
      if (state.claimed.has(cellKey(point.row, point.col))) {
        segment.push(point);
      } else {
        if (segment.length > 1) segments.push(segment);
        segment = [];
      }
    });
    if (segment.length > 1) segments.push(segment);
    const linking = linkPreview?.runeId === entry.runeId
      ? " is-link-preview"
      : "";
    segments.forEach((pointsInSegment) => {
      const points = pointsInSegment
        .map(({ row, col }) => `${col + 0.5},${row + 0.5}`)
        .join(" ");
      completedLines.push(
        `<polyline class="completed-path${linking}" points="${points}" style="stroke:${entry.color};color:${entry.color}"></polyline>`,
      );
    });
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
  const canReplace =
    hasAbility("rune-replace") && !state.puzzleUses.runeReplace;
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
          ${
            canReplace && !rune.complete
              ? `<button class="rune-replace-button" type="button" data-rune-id="${rune.instanceId}">교체</button>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function replaceRune(instanceId) {
  if (
    !hasAbility("rune-replace") ||
    state.puzzleUses.runeReplace ||
    !state.running
  ) {
    return;
  }
  const runeIndex = state.runes.findIndex(
    (rune) => rune.instanceId === instanceId && !rune.complete,
  );
  if (runeIndex < 0) return;
  const previousRune = state.runes[runeIndex];
  const candidates = RUNE_TEMPLATES.filter(
    (template) => template.id !== previousRune.id,
  );
  const replacement =
    candidates[Math.floor(nextRandom() * candidates.length)];
  state.replacementSerial += 1;
  const replacementRune = {
    ...replacement,
    points: replacement.points.map((point) => [...point]),
    instanceId:
      `${state.floor}-${replacement.id}-replacement-${state.replacementSerial}`,
    color: previousRune.color,
    complete: false,
  };
  state.runes[runeIndex] = replacementRune;
  state.puzzleUses.runeReplace = true;

  const applyLockedReplacement = (snapshot) => {
    if (!snapshot) return;
    const index = snapshot.runes.findIndex(
      (rune) => rune.instanceId === instanceId,
    );
    if (index >= 0) {
      snapshot.runes[index] = {
        ...replacementRune,
        points: replacementRune.points.map((point) => [...point]),
      };
    }
    snapshot.puzzleUses.runeReplace = true;
    snapshot.replacementSerial = state.replacementSerial;
    snapshot.randomState = state.randomState;
  };
  applyLockedReplacement(state.floorInitialSnapshot);
  state.history.forEach(applyLockedReplacement);
  setFeedback(
    `${previousRune.name}을 ${replacementRune.name}(으)로 교체했습니다.`,
    "success",
  );
  render();
  saveRunState();
}

function render() {
  renderStatus();
  renderBoard();
  renderRuneChoices();
  renderRunControls();
  scheduleWorkspaceFit();
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
  if (state.claimed.has(key)) {
    return !(
      state.currentPath.length === 0 &&
      canUseRuneLink() &&
      completedPathAtEndpoint(cell)
    );
  }
  if (state.corrupted.has(key)) {
    const corruptionAlreadyUsed = state.currentPath.some((point) =>
      state.corrupted.has(cellKey(point.row, point.col)),
    );
    return !canUseCorruptionIgnore() || corruptionAlreadyUsed;
  }
  return false;
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
  if (pathCrossesCompletedTrace([...path, cell])) {
    setFeedback(
      "기존 룬 궤적을 가로질러 통과할 수 없습니다.",
      "alert",
    );
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
    const blockedKey = cell ? cellKey(cell.row, cell.col) : null;
    void logPlayEvent("path_result", {
      rune_id: null,
      rune_type: null,
      path_cell_count: cell ? 1 : 0,
      processed_monster_count: 0,
      intersection_count: 0,
      crossed_corruption: Boolean(
        blockedKey && state.corrupted.has(blockedKey),
      ),
      valid: false,
      invalid_reason: blockedKey && state.corrupted.has(blockedKey)
        ? "blocked_by_corruption"
        : blockedKey && state.claimed.has(blockedKey)
          ? "blocked_by_trace"
          : "invalid_path",
      invalid_detail: cell ? "blocked_start_cell" : "outside_board",
      input_duration_ms: 0,
    });
    setFeedback("완성된 룬과 오염된 칸 위에는 새 룬을 그릴 수 없습니다.", "alert");
    return;
  }

  event.preventDefault();
  state.drawing = true;
  state.pointerId = event.pointerId;
  state.currentPath = [];
  state.pathStartedAt = Date.now();
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
  const cancelledPath = [...state.currentPath];
  if (cancelledPath.length > 0) {
    void logPlayEvent("path_result", {
      rune_id: null,
      rune_type: null,
      path_cell_count: cancelledPath.length,
      processed_monster_count: 0,
      intersection_count: state.enemies.filter((enemy) =>
        cancelledPath.some((cell) => sameCell(cell, enemy)),
      ).length,
      crossed_corruption: pathUsesCorruptionIgnore(cancelledPath),
      valid: false,
      invalid_reason: "invalid_path",
      invalid_detail: "pointer_cancelled",
      input_duration_ms: elapsedSince(state.pathStartedAt),
    });
  }
  state.drawing = false;
  state.pointerId = null;
  state.currentPath = [];
  state.pathStartedAt = 0;
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
    void logPlayEvent("path_result", {
      rune_id: null,
      rune_type: null,
      path_cell_count: state.currentPath.length,
      processed_monster_count: 0,
      intersection_count: state.enemies.filter((enemy) =>
        state.currentPath.some((cell) => sameCell(cell, enemy)),
      ).length,
      crossed_corruption: pathUsesCorruptionIgnore(state.currentPath),
      valid: false,
      invalid_reason: "invalid_path",
      invalid_detail: "rune_not_matched",
      input_duration_ms: elapsedSince(state.pathStartedAt),
    });
    setFeedback("목록의 남은 룬과 일치하지 않습니다. 다시 그려보세요.", "alert");
    state.currentPath = [];
    state.pathStartedAt = 0;
    renderBoard();
    return;
  }

  commitRune(rune, [...state.currentPath]);
}

function moveEnemies(collisionTriggered = false) {
  const movements = new Map();
  let escapeResult = null;
  const boss = state.enemies.find((enemy) => enemy.kind === "boss");
  if (boss) {
    const origin = { row: boss.row, col: boss.col };
    const destination = boss.moveIntent;
    if (destination?.escape) {
      const destinationKey = cellKey(destination.row, destination.col);
      if (destination.obstacleKind === "trace") {
        state.claimed.delete(destinationKey);
      } else if (destination.obstacleKind === "corruption") {
        state.corrupted.delete(destinationKey);
      } else if (destination.obstacleKind === "monster") {
        state.enemies = state.enemies.filter(
          (enemy) => enemy.id !== destination.targetEnemyId,
        );
      }
      boss.row = destination.row;
      boss.col = destination.col;
      boss.moveIntent = null;
      escapeResult = {
        obstacleKind: destination.obstacleKind,
        row: boss.row,
        col: boss.col,
      };
      state.bossMechanicStats.escapeCount += 1;
      state.bossMechanicStats.escapeRemoved[destination.obstacleKind] =
        (state.bossMechanicStats.escapeRemoved[
          destination.obstacleKind
        ] ?? 0) + 1;
      void logPlayEvent("boss_mechanic", {
        mechanic: "escape",
        result: "moved",
        removed_obstacle: destination.obstacleKind,
        stage_index: currentStage(),
        floor_in_stage: currentFloorInStage(),
      });
      movements.set(boss.id, {
        origin,
        destination: { row: boss.row, col: boss.col },
        moved: true,
        escape: true,
      });
    } else if (collisionTriggered) {
      boss.moveIntent = null;
      movements.set(boss.id, { origin, moved: false, collision: true });
    } else if (destination) {
      const destinationKey = cellKey(destination.row, destination.col);
      if (
        state.claimed.has(destinationKey) ||
        state.corrupted.has(destinationKey)
      ) {
        movements.set(boss.id, { origin, moved: false });
      } else {
        boss.row = destination.row;
        boss.col = destination.col;
        movements.set(boss.id, {
          origin,
          destination: { row: boss.row, col: boss.col },
          moved: true,
        });
      }
      boss.moveIntent = null;
    } else {
      movements.set(boss.id, { origin, moved: false });
    }
  }

  state.enemies
    .filter((enemy) => enemy.kind !== "boss")
    .forEach((enemy) => {
      const origin = { row: enemy.row, col: enemy.col };
      const destination = enemy.moveIntent;
      if (!destination) {
        movements.set(enemy.id, { origin, moved: false });
        return;
      }

      const destinationKey = cellKey(destination.row, destination.col);
      if (
        state.claimed.has(destinationKey) ||
        state.corrupted.has(destinationKey)
      ) {
        enemy.moveIntent = null;
        movements.set(enemy.id, { origin, moved: false });
        return;
      }

      enemy.row = destination.row;
      enemy.col = destination.col;
      enemy.moveIntent = null;
      movements.set(enemy.id, {
        origin,
        destination: { row: enemy.row, col: enemy.col },
        moved: true,
      });
    });
  return { movements, escapeResult };
}

function corruptCells(movements, reservedKeys = new Set()) {
  const occupied = new Set(
    state.enemies.map((enemy) => cellKey(enemy.row, enemy.col)),
  );
  let corruptedNow = 0;

  for (const enemy of state.enemies) {
    if (
      !enemy.corruptionPlanned ||
      state.monsterCorruptionCreated >=
        MAX_MONSTER_CORRUPTION_PER_FLOOR
    ) {
      continue;
    }
    const movement = movements.get(enemy.id);
    if (!movement?.moved) continue;
    const originKey = cellKey(
      movement.origin.row,
      movement.origin.col,
    );
    if (
      state.claimed.has(originKey) ||
      state.corrupted.has(originKey) ||
      occupied.has(originKey) ||
      reservedKeys.has(originKey)
    ) {
      continue;
    }
    state.corrupted.add(originKey);
    state.monsterCorruptionCreated += 1;
    corruptedNow += 1;
  }
  return corruptedNow;
}

function summonReinforcement(cell) {
  if (!cell) return false;
  state.enemies.push({
    id: `${state.floor}-summon-${completedRuneCount()}`,
    kind: "normal",
    row: cell.row,
    col: cell.col,
    shieldCount: 0,
    moveIntent: null,
    corruptionPlanned: false,
  });
  return true;
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
  const crossedCorruption = pathUsesCorruptionIgnore(path);
  const linkedPath = linkedPathForPath(path);
  const activeAbilities = ALL_ABILITIES.filter(
    (ability) => abilityLevel(ability.id) > 0,
  );
  void logPlayEvent("rune_selected", {
    rune_id: rune.instanceId,
    rune_type: rune.id,
    selection_method: "auto_recognized",
  });
  void logPlayEvent("path_result", {
    rune_id: rune.instanceId,
    rune_type: rune.id,
    path_cell_count: path.length,
    processed_monster_count:
      preview.directTargetIds.size + preview.extraTargetIds.size,
    direct_defeated: preview.outcomes.filter(
      (outcome) => outcome.source === "direct" && outcome.result === "kill",
    ).length,
    ability_defeated: preview.outcomes.filter(
      (outcome) => outcome.source !== "direct" && outcome.result === "kill",
    ).length,
    intersection_count: preview.directTargetIds.size,
    crossed_corruption: crossedCorruption,
    valid: true,
    invalid_reason: null,
    input_duration_ms: elapsedSince(state.pathStartedAt),
    ability_id: activeAbilities.map((ability) => ability.id).join(",") || null,
    ability_level:
      activeAbilities.map((ability) => abilityLevel(ability.id)).join(",") ||
      null,
    boss_hit_source: preview.bossHitSource,
    boss_collision_triggered: preview.collisionTriggered,
    boss_weak_point_triggered: preview.weakPointTriggered,
    boss_guardian_triggered: preview.guardianTargetDefeated,
  });
  state.pathStartedAt = 0;
  state.history.push(createStateSnapshot());

  if (linkedPath) {
    state.completedPaths = state.completedPaths.filter(
      (entry) => entry.runeId !== linkedPath.runeId,
    );
    linkedPath.path.forEach(({ row, col }) => {
      state.claimed.delete(cellKey(row, col));
    });
    state.puzzleUses.runeLink = true;
  }

  const pathKeys = new Set(path.map(({ row, col }) => cellKey(row, col)));
  pathKeys.forEach((key) => {
    if (!state.corrupted.has(key)) {
      state.claimed.add(key);
    }
  });
  if (crossedCorruption) {
    state.puzzleUses.corruptionIgnore = true;
  }
  rune.complete = true;
  state.completedPaths.push({
    runeId: rune.instanceId,
    color: rune.color,
    path,
  });
  state.currentPath = [];

  const defeatedIds = new Set(
    preview.outcomes
      .filter((outcome) => outcome.result === "kill")
      .map((outcome) => outcome.id),
  );
  const shieldBreakIds = new Set(
    preview.outcomes
      .filter((outcome) => outcome.result === "shield")
      .map((outcome) => outcome.id),
  );
  state.enemies.forEach((enemy) => {
    if (shieldBreakIds.has(enemy.id)) {
      enemy.shieldCount = Math.max(0, enemy.shieldCount - 1);
    }
  });
  state.enemies = state.enemies.filter((enemy) => !defeatedIds.has(enemy.id));
  const defeatedNow = preview.outcomes.filter(
    (outcome) => outcome.source === "direct" && outcome.result === "kill",
  ).length;
  const abilityDefeatedNow = preview.outcomes.filter(
    (outcome) => outcome.source !== "direct" && outcome.result === "kill",
  ).length;
  state.defeated += defeatedNow + abilityDefeatedNow;
  state.directDefeated += defeatedNow;
  if (preview.ricochetTriggered) {
    state.ricochetUsed = true;
  }
  if (preview.bossHitSource) {
    state.bossMechanicStats.hitSources[preview.bossHitSource] =
      (state.bossMechanicStats.hitSources[preview.bossHitSource] ?? 0) + 1;
    void logPlayEvent("boss_hit", {
      source: preview.bossHitSource,
      result:
        preview.outcomes.find(
          (outcome) => preview.actors.find(
            (actor) =>
              actor.id === outcome.id && actor.kind === "boss",
          ),
        )?.result ?? null,
      stage_index: currentStage(),
      floor_in_stage: currentFloorInStage(),
    });
  }
  grantExperience(defeatedNow);

  const bossDefeated =
    isBossFloor() &&
    !state.enemies.some((enemy) => enemy.kind === "boss");
  const normalFloorCleared = !isBossFloor() && state.enemies.length === 0;
  if (bossDefeated || normalFloorCleared) {
    state.running = false;
    state.pendingOutcome = isChapterFinalFloor()
      ? "chapter-clear"
      : isStageFinalFloor()
        ? "stage-clear"
        : "floor-clear";
    if (isBossFloor()) {
      void logPlayEvent("boss_end", {
        chapter_id: "chapter_01",
        stage_index: currentStage(),
        boss_variant: currentBossConfig()?.variant ?? null,
        success: true,
        completed_runes: completedRuneCount(),
      });
    }
    void logPlayEvent(
      "floor_end",
      floorEndPayload(true),
      { flush: true },
    );
    if (isStageFinalFloor()) {
      void logPlayEvent(
        "stage_clear",
        {
          chapter_id: "chapter_01",
          stage_index: currentStage(),
          duration_ms: elapsedSince(state.stageStartedAt),
          final_level: state.level,
          final_experience: state.experience,
          total_defeated_on_final_floor: state.defeated,
        },
        { flush: true },
      );
    }
    setFeedback(
      `클리어 · 직접 ${defeatedNow} · 능력 ${abilityDefeatedNow} · EXP +${defeatedNow}`,
      "success",
    );
    render();
    saveRunState();
    window.setTimeout(resolveQueuedModal, 260);
    return;
  }

  const { movements, escapeResult } = moveEnemies(
    preview.collisionTriggered,
  );
  const summonKey = preview.summonCell
    ? new Set([cellKey(preview.summonCell.row, preview.summonCell.col)])
    : new Set();
  const corruptedNow = corruptCells(movements, summonKey);
  const summoned = summonReinforcement(preview.summonCell);

  if (remainingRunes().length === 0) {
    if (isBossFloor()) {
      state.running = false;
      state.lastFailureReason = "boss_survived";
      state.pendingOutcome = "fail";
      void logPlayEvent("boss_end", {
        chapter_id: "chapter_01",
        stage_index: currentStage(),
        boss_variant: currentBossConfig()?.variant ?? null,
        success: false,
        completed_runes: completedRuneCount(),
      });
      void logPlayEvent(
        "floor_end",
        floorEndPayload(false, state.lastFailureReason),
        { flush: true },
      );
      void logPlayEvent(
        "stage_fail",
        {
          chapter_id: "chapter_01",
          stage_index: currentStage(),
          duration_ms: elapsedSince(state.stageStartedAt),
          failure_reason: state.lastFailureReason,
          completed_runes: completedRuneCount(),
          remaining_runes: [],
          surviving_enemies: state.enemies.length,
          corrupted_cell_count: state.corrupted.size,
        },
        { flush: true },
      );
      setFeedback("네 번째 룬 뒤에도 보스가 생존해 토벌에 실패했습니다.", "alert");
      render();
      saveRunState();
      window.setTimeout(resolveQueuedModal, 260);
      return;
    }

    state.running = false;
    state.pendingOutcome = isChapterFinalFloor()
      ? "chapter-clear"
      : isStageFinalFloor()
        ? "stage-clear"
        : "floor-clear";
    void logPlayEvent("floor_end", floorEndPayload(true), { flush: true });
    if (isStageFinalFloor()) {
      void logPlayEvent(
        "stage_clear",
        {
          chapter_id: "chapter_01",
          stage_index: currentStage(),
          duration_ms: elapsedSince(state.stageStartedAt),
          final_level: state.level,
          final_experience: state.experience,
          total_defeated_on_final_floor: state.defeated,
        },
        { flush: true },
      );
    }
    setFeedback(
      `클리어 · 직접 ${defeatedNow} · 능력 ${abilityDefeatedNow} · EXP +${defeatedNow}`,
      "success",
    );
    render();
    saveRunState();
    window.setTimeout(resolveQueuedModal, 260);
    return;
  }

  planEnemyMoves();

  const fittingRunes = remainingRunes().filter((entry) => canTemplateFit(entry));
  if (fittingRunes.length === 0) {
    state.running = false;
    state.lastFailureReason = "blocked_by_corruption";
    state.pendingOutcome = "fail";
    if (isBossFloor()) {
      void logPlayEvent("boss_end", {
        chapter_id: "chapter_01",
        stage_index: currentStage(),
        boss_variant: currentBossConfig()?.variant ?? null,
        success: false,
        completed_runes: completedRuneCount(),
        failure_reason: state.lastFailureReason,
      });
    }
    void logPlayEvent(
      "floor_end",
      floorEndPayload(false, state.lastFailureReason),
      { flush: true },
    );
    void logPlayEvent(
      "stage_fail",
      {
        chapter_id: "chapter_01",
        stage_index: currentStage(),
        duration_ms: elapsedSince(state.stageStartedAt),
        failure_reason: state.lastFailureReason,
        completed_runes: completedRuneCount(),
        remaining_runes: remainingRunes().map((entry) => entry.id),
        surviving_enemies: state.enemies.length,
        corrupted_cell_count: state.corrupted.size,
      },
      { flush: true },
    );
    setFeedback("오염으로 남은 룬을 놓을 공간이 사라졌습니다.", "alert");
    render();
    saveRunState();
    window.setTimeout(resolveQueuedModal, 260);
    return;
  }

  const killCopy =
    `직접 ${defeatedNow} · 능력 ${abilityDefeatedNow} · EXP +${defeatedNow}`;
  setFeedback(
    `${rune.name} · ${killCopy} · 오염 ${corruptedNow}/${MAX_MONSTER_CORRUPTION_PER_FLOOR}${preview.bossHitSource ? ` · 보스 ${bossHitSourceName(preview.bossHitSource)}` : ""}${escapeResult ? " · 보스 탈출" : ""}${summoned ? " · 증원 1체" : ""}`,
    "success",
  );
  render();
  saveRunState();
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

function openModal({
  type,
  eyebrow,
  title,
  body,
  actions,
  onDismiss = null,
}) {
  state.modalType = type;
  state.modalDismissAction = onDismiss;
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
  refs.modalClose.hidden = ![
    "intro",
    "help",
    "levelup",
    "ability-detail",
  ].includes(type);
  state.levelUpReviewingBoard = false;
  refs.levelUpResumeButton.hidden = true;
  refs.modalBackdrop.classList.add("is-open");
  window.setTimeout(() => refs.modalPanel.focus(), 0);
}

function closeModal() {
  refs.modalBackdrop.classList.remove("is-open");
  refs.modalPanel.dataset.modalType = "";
  state.modalType = null;
  state.modalDismissAction = null;
  state.levelUpReviewingBoard = false;
  refs.levelUpResumeButton.hidden = true;
  refs.modalClose.hidden = false;
  refs.helpButton.focus({ preventScroll: true });
}

function showAbilityDetail(abilityId) {
  if (state.pendingLevelUps > 0) {
    showLevelUpSelection();
    return;
  }
  const ability = abilityById(abilityId);
  const level = abilityLevel(abilityId);
  if (!ability || level <= 0) return;
  const usage = abilityUsageState(ability);
  const category =
    ability.category === "combat" ? "전투 능력 · 자동 발동" : "퍼즐 능력 · 사용형";
  openModal({
    type: "ability-detail",
    eyebrow: category.toUpperCase(),
    title: `${ability.icon} ${ability.name}`,
    body: `
      <div class="result-grid">
        <div><span>분류</span><strong>${ability.category === "combat" ? "전투" : "퍼즐"}</strong></div>
        <div><span>현재 단계</span><strong>LV.${level}</strong></div>
        <div><span>플로어 상태</span><strong>${usage.used ? "사용 완료" : ability.category === "combat" ? "자동 대기" : "사용 가능"}</strong></div>
      </div>
      <p><strong>현재 효과</strong><br>${abilityEffectText(ability.id, level)}</p>
      <p>${usage.label}</p>
    `,
    actions: [
      {
        label: "닫기",
        primary: true,
        onClick: closeModal,
      },
    ],
  });
}

function showBossInfoModal(source = "manual") {
  const config = currentBossConfig();
  if (!config) return;
  void logPlayEvent("boss_info_view", {
    chapter_id: "chapter_01",
    stage_index: currentStage(),
    floor_in_stage: currentFloorInStage(),
    source,
    boss_type: config.type,
    boss_variant: config.variant,
    shield_count: config.shieldCount,
  });
  openModal({
    type: "boss-info",
    eyebrow: `STAGE ${currentStage()} · BOSS INFO`,
    title: "이동형 보스<br>토벌 정보",
    body: `
      <div class="boss-info-grid">
        <div><span>방어막</span><strong>${config.shieldCount}</strong></div>
        <div><span>필요 타격</span><strong>${config.shieldCount + 1}</strong></div>
        <div><span>변형</span><strong>${bossVariantName(config.variant)}</strong></div>
      </div>
      <p><strong>기본 규칙:</strong> 한 룬 행동에 최대 1회 피격합니다. 새 룬으로 예약 칸을 막으면 <strong>돌진 충돌</strong>로 피격 후 정지합니다.</p>
      <p><strong>탈출 이동:</strong> 완전히 갇히면 룬 흔적·오염·일반 몬스터 순으로 1개를 제거하고 이동합니다.</p>
      <p><strong>${bossVariantName(config.variant)}:</strong> ${bossVariantEffect(config.variant)}.</p>
    `,
    actions: [
      {
        label: "확인",
        primary: true,
        onClick: closeModal,
      },
    ],
  });
}

function showBossInfoForCurrentEntry() {
  if (currentFloorInStage() === 1) {
    showBossInfoModal("stage_entry");
  } else if (isBossFloor()) {
    showBossInfoModal("boss_floor_entry");
  }
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

function interceptHiddenLevelUpInput(event) {
  if (event.target.closest("#qaMenuButton")) return;
  const now = Date.now();
  const shouldResume =
    state.modalType === "levelup" && state.levelUpReviewingBoard;
  const shouldConsumeFollowUp =
    event.type === "click" && now < levelUpResumeInputBlockedUntil;
  if (!shouldResume && !shouldConsumeFollowUp) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (shouldResume) {
    levelUpResumeInputBlockedUntil = now + 600;
    showLevelUpSelection();
  }
}

function availableAbilityChoices() {
  return ALL_ABILITIES.filter(
    (ability) => abilityLevel(ability.id) < ability.maxLevel,
  );
}

function ensureAbilityChoices() {
  const targetLevel = state.level - state.pendingLevelUps + 1;
  const available = availableAbilityChoices();
  const availableIds = new Set(available.map((ability) => ability.id));
  const pendingChoices = state.pendingAbilityChoices.filter((abilityId) =>
    availableIds.has(abilityId),
  );
  if (pendingChoices.length > 0) {
    state.pendingAbilityChoices = pendingChoices;
    return pendingChoices.map(abilityById).filter(Boolean);
  }
  const lockedChoices = state.abilityChoiceLocks[targetLevel];
  const validLockedChoices = Array.isArray(lockedChoices)
    ? lockedChoices.filter((abilityId) => availableIds.has(abilityId))
    : [];
  if (validLockedChoices.length > 0 || available.length === 0) {
    state.pendingAbilityChoices = [...validLockedChoices];
    return validLockedChoices.map(abilityById).filter(Boolean);
  }
  delete state.abilityChoiceLocks[targetLevel];
  const choices = shuffle(available).slice(0, 3);
  state.pendingAbilityChoices = choices.map((ability) => ability.id);
  state.abilityChoiceLocks[targetLevel] = [...state.pendingAbilityChoices];
  const persistLock = (snapshot) => {
    if (!snapshot) return;
    snapshot.abilityChoiceLocks = {
      ...(snapshot.abilityChoiceLocks ?? {}),
      [targetLevel]: [...state.pendingAbilityChoices],
    };
    snapshot.randomState = state.randomState;
  };
  persistLock(state.floorInitialSnapshot);
  state.history.forEach(persistLock);
  saveRunState();
  return choices;
}

function completeLevelUp(abilityId = null) {
  if (levelUpSelectionLocked || state.pendingLevelUps <= 0) return;
  levelUpSelectionLocked = true;
  [
    ...refs.modalBody.querySelectorAll("[data-levelup-ability-id]"),
    ...refs.modalActions.querySelectorAll("button"),
  ]
    .forEach((button) => {
      button.disabled = true;
    });
  const resolvedLevel = state.level - state.pendingLevelUps + 1;
  const ability = abilityById(abilityId);
  const previousAbilityLevel = ability ? abilityLevel(ability.id) : 0;
  if (ability && previousAbilityLevel < ability.maxLevel) {
    state.abilities.push(ability.id);
  }
  state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
  state.pendingAbilityChoices = [];
  closeModal();
  setFeedback(
    ability
      ? previousAbilityLevel < ability.maxLevel
        ? `LEVEL ${resolvedLevel} · ${ability.name} LV.${previousAbilityLevel + 1}`
        : `LEVEL ${resolvedLevel} · ${ability.name}은 이미 최대 단계입니다.`
      : `LEVEL ${resolvedLevel} · 획득 가능한 능력이 없어 선택을 마쳤습니다.`,
    "success",
  );
  render();
  saveRunState();
  window.setTimeout(resolveQueuedModal, 0);
}

function requestModalClose() {
  if (state.modalType === "levelup") {
    showLevelUpBoard();
    return;
  }
  if (
    state.modalType === "consent" ||
    state.modalType === "return-after-exit"
  ) {
    return;
  }
  if (state.modalDismissAction) {
    const dismissAction = state.modalDismissAction;
    state.modalDismissAction = null;
    dismissAction();
    return;
  }
  if (state.modalType === "intro") {
    void logPlayEvent("tutorial_quit", {
      tutorial_version: 1,
      last_step_id: "intro_rules",
      reason: "modal_close",
      duration_ms: elapsedSince(state.tutorialStartedAt),
    });
    closeModal();
    if (state.restoredFromSave) {
      state.restoredFromSave = false;
      if (state.pendingLevelUps > 0 || state.pendingOutcome) {
        resolveQueuedModal();
      } else {
        showBossInfoForCurrentEntry();
      }
    } else {
      showBossInfoForCurrentEntry();
    }
    return;
  }
  if (state.modalType === "help") {
    closeModal();
    return;
  }
  closeModal();
}

function rulesMarkup() {
  return `
    <p>일반 플로어는 <strong>룬 네 개를 완성하거나 적을 전부 처치하면</strong> 통과합니다. 보스 플로어는 네 번째 룬까지 보스를 처치해야 합니다.</p>
      <div class="rule-list">
        <div class="rule"><b>1</b><span>왼쪽 목록의 룬 중 하나를 그리면 자동으로 인식됩니다.</span></div>
        <div class="rule"><b>2</b><span>룬은 회전·좌우 반전 가능하며, 지나간 적을 처치하면 EXP를 얻습니다.</span></div>
        <div class="rule"><b>3</b><span>화살표는 다음 이동이며, 보라색 표식이 있는 일반 몬스터는 떠난 칸을 오염시킵니다.</span></div>
        <div class="rule"><b>4</b><span>완성 룬·오염 칸은 다시 쓸 수 없고 기존 룬 선도 가로지를 수 없습니다.</span></div>
      </div>
      <p>룬 경로로 직접 처치한 적만 EXP를 주며, 능력 추가 처치는 섬멸 수에만 포함됩니다.</p>
      <p>한 챕터는 3개 스테이지, 각 스테이지는 3개 플로어이며 마지막 플로어에 보스가 등장합니다. EXP ${EXPERIENCE_PER_LEVEL}마다 레벨이 오릅니다.</p>
    `;
}

function showIntroModal() {
  state.tutorialStartedAt = Date.now();
  void logPlayEvent("tutorial_start", {
    tutorial_version: 1,
  });
  void logPlayEvent("tutorial_step", {
    tutorial_version: 1,
    step_id: "intro_rules",
    status: "entered",
  });
  openModal({
    type: "intro",
    eyebrow: "NEW PROTOTYPE",
    title: "네 개의 룬으로<br>탑의 문을 여세요",
    body: rulesMarkup(),
    actions: [
      {
        label: "탑에 들어가기",
        primary: true,
        onClick: () => {
          const duration = elapsedSince(state.tutorialStartedAt);
          void logPlayEvent("tutorial_step", {
            tutorial_version: 1,
            step_id: "intro_rules",
            status: "completed",
            duration_ms: duration,
          });
          void logPlayEvent("tutorial_complete", {
            tutorial_version: 1,
            duration_ms: duration,
          });
          closeModal();
          if (state.restoredFromSave) {
            state.restoredFromSave = false;
            if (state.pendingLevelUps > 0 || state.pendingOutcome) {
              resolveQueuedModal();
            } else {
              showBossInfoForCurrentEntry();
            }
          } else {
            showBossInfoForCurrentEntry();
          }
        },
      },
    ],
  });
}

function startPlayLogSession({ logCurrentStart = false } = {}) {
  window.RuneTracePlayLog?.startSession({
    entry_point: "game_load",
  });
  if (logCurrentStart) {
    logStageAndFloorStart();
  }
}

function showPlayLogConsentModal() {
  openModal({
    type: "consent",
    eyebrow: "ANONYMOUS PLAY LOG",
    title: "익명 플레이 기록<br>전송 안내",
    body: `
      <p>게임 개선을 위해 익명 플레이 기록이 자동 전송됩니다. 이름·이메일 등 직접 식별 정보는 수집하지 않습니다.</p>
      <div class="rule-list">
        <div class="rule"><b>1</b><span>플로어 진행, 룬 결과, 성공·실패와 소요시간을 기록합니다.</span></div>
        <div class="rule"><b>2</b><span>동의하지 않으면 플레이 로그를 저장하거나 전송하지 않습니다.</span></div>
      </div>
    `,
    actions: [
      {
        label: "동의하지 않음",
        onClick: async () => {
          await window.RuneTracePlayLog?.setConsent(false);
          showIntroModal();
        },
      },
      {
        label: "동의하고 시작",
        primary: true,
        onClick: async () => {
          await window.RuneTracePlayLog?.setConsent(true);
          startPlayLogSession({ logCurrentStart: true });
          if (state.restoredFromSave) {
            const reconnectState =
              window.RuneTracePlayLog?.getReconnectState?.() ?? {};
            if (reconnectState.returnedAfterExit) {
              showReturnAfterExitModal(reconnectState);
              return;
            }
            logRestoredRun(
              reconnectState.resumedWithinGrace
                ? "reconnect_within_grace"
                : "consent_granted",
            );
          }
          showIntroModal();
        },
      },
    ],
  });
}

function logRestoredRun(source = "page_load") {
  void logPlayEvent("state_restore", {
    restore_scope: "run",
    source,
    stage_index: currentStage(),
    floor_in_stage: currentFloorInStage(),
    completed_runes: completedRuneCount(),
    pending_level_ups: state.pendingLevelUps,
    pending_outcome: state.pendingOutcome,
  });
}

function showReturnAfterExitModal(reconnectState) {
  const gapMinutes = Math.max(
    5,
    Math.round(Number(reconnectState?.gapMs ?? 0) / 60000),
  );
  openModal({
    type: "return-after-exit",
    eyebrow: "RETURNING SESSION",
    title: "이전 플레이를<br>어떻게 처리할까요?",
    body: `
      <p>마지막 접속 종료 후 약 <strong>${gapMinutes}분</strong>이 지나 별도 이탈 세션으로 기록했습니다.</p>
      <p>저장된 진행을 이어서 플레이하거나 초기 상태로 되돌릴 수 있습니다. 초기화해도 익명 참여자 ID와 로그 수집 동의는 유지됩니다.</p>
    `,
    actions: [
      {
        label: "이어서 플레이",
        onClick: () => {
          logRestoredRun("return_after_exit");
          showIntroModal();
        },
      },
      {
        label: "데이터 초기화",
        primary: true,
        onClick: () => {
          closeModal();
          resetPlayData("return_after_exit");
          showIntroModal();
        },
      },
    ],
  });
}

function showQaDataResetModal() {
  if (state.pendingLevelUps > 0) return;
  openModal({
    type: "data-reset-confirm",
    eyebrow: "QA · DATA RESET",
    title: "플레이 데이터를<br>초기화할까요?",
    body: `
      <p>현재 챕터 진행, EXP, 레벨, 능력과 보드 저장을 초기 상태로 되돌립니다.</p>
      <p>익명 참여자 ID, 로그 수집 동의와 이미 전송된 통계는 삭제하지 않습니다.</p>
    `,
    actions: [
      {
        label: "취소",
        onClick: closeModal,
      },
      {
        label: "초기화",
        primary: true,
        onClick: () => {
          closeModal();
          resetPlayData("qa_panel");
        },
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
  levelUpSelectionLocked = false;
  const targetLevel = state.level - state.pendingLevelUps + 1;
  const choices = ensureAbilityChoices();
  if (choices.length === 0) {
    completeLevelUp();
    return;
  }
  openModal({
    type: "levelup",
    eyebrow: `LEVEL ${targetLevel} REACHED`,
    title: "능력을 하나<br>선택하세요",
    body: `
      <p>획득하거나 강화할 수 있는 능력 중 최대 3개가 같은 확률로 제시됩니다. 최대 단계 능력은 나오지 않습니다.</p>
      <div class="level-choice-list">
        ${choices
          .map(
            (ability) => {
              const currentLevel = abilityLevel(ability.id);
              const nextLevel = currentLevel + 1;
              return `
                <button
                  class="level-choice-card"
                  type="button"
                  data-levelup-ability-id="${ability.id}"
                >
                  <strong>${ability.name} · ${currentLevel > 0 ? `LV.${currentLevel} → LV.${nextLevel}` : "신규 획득"}</strong>
                  <span>${abilityEffectText(ability.id, nextLevel)}</span>
                </button>
              `;
            },
          )
          .join("")}
      </div>
      <div class="level-preview">
        <span>현재 레벨</span>
        <strong>LV ${targetLevel}</strong>
      </div>
    `,
    actions: [
      {
        label: "보드 보기",
        onClick: showLevelUpBoard,
        className: "review-board-action",
      },
    ],
  });
}

function floorResultMarkup() {
  const resultCopy = isBossFloor()
    ? "보스를 쓰러뜨려 남은 일반 몬스터와 관계없이 관문을 돌파했습니다."
    : completedRuneCount() < RUNES_PER_FLOOR
      ? "일반 몬스터를 모두 쓰러뜨려 남은 룬과 관계없이 층을 통과했습니다."
      : "적을 모두 쓰러뜨리지 않아도 네 개의 궤적이 탑의 문을 열었습니다.";
  return `
    <p>${resultCopy}</p>
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
    onDismiss: () => {
      closeModal();
      startFloor(state.floor + 1);
      showBossInfoForCurrentEntry();
    },
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
          showBossInfoForCurrentEntry();
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
    onDismiss: () => {
      closeModal();
      startFloor(state.floor + 1);
      showBossInfoForCurrentEntry();
    },
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
          showBossInfoForCurrentEntry();
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
  } else if (isChapterFinalFloor()) {
    actions.push({
      label: "챕터 재도전",
      onClick: () => {
        closeModal();
        restartChapter();
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
    title:
      state.lastFailureReason === "boss_survived"
        ? "보스가 마지막 룬을<br>버텨냈습니다"
        : "그릴 공간이<br>사라졌습니다",
    body: `
      <p>${
        state.lastFailureReason === "boss_survived"
          ? "네 번째 룬까지 보스의 방어막과 본체를 모두 타격하지 못했습니다."
          : "살아남은 적의 오염이 남은 룬 경로를 막았습니다. 룬으로 적을 더 많이 베거나, 완성 경로의 위치를 바꿔보세요."
      }</p>
      <div class="result-grid">
        <div><span>완성 룬</span><strong>${completedRuneCount()}</strong></div>
        <div><span>획득 EXP</span><strong>+${state.directDefeated}</strong></div>
        <div><span>오염 칸</span><strong>${state.corrupted.size}</strong></div>
      </div>
    `,
    onDismiss: () => {
      closeModal();
      resetFloor();
    },
    actions,
  });
}

refs.gameCard.addEventListener(
  "pointerdown",
  interceptHiddenLevelUpInput,
  true,
);
refs.gameCard.addEventListener(
  "click",
  interceptHiddenLevelUpInput,
  true,
);
refs.board.addEventListener("pointerdown", beginDrawing);
refs.board.addEventListener("pointermove", continueDrawing);
refs.board.addEventListener("pointerup", finishDrawing);
refs.board.addEventListener("pointercancel", cancelDrawing);
refs.board.addEventListener("lostpointercapture", () => {
  if (state.drawing) cancelDrawing();
});
refs.runeChoices.addEventListener("click", (event) => {
  const button = event.target.closest("[data-rune-id]");
  if (!button) return;
  event.stopPropagation();
  replaceRune(button.dataset.runeId);
});
refs.abilityList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ability-id]");
  if (!button) return;
  showAbilityDetail(button.dataset.abilityId);
});
refs.modalBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-levelup-ability-id]");
  if (!button || state.modalType !== "levelup") return;
  completeLevelUp(button.dataset.levelupAbilityId);
});

refs.undoButton.addEventListener("click", undoLastRune);
refs.resetButton.addEventListener("click", resetFloor);
refs.qaAbilityAddButton.addEventListener("click", qaAddAbility);
refs.qaLevelUpButton.addEventListener("click", qaTriggerLevelUp);
refs.qaRuneRerollButton.addEventListener("click", qaRerollSelectedRune);
refs.qaRuneRerollAllButton.addEventListener("click", qaRerollAllRunes);
refs.qaDataResetButton.addEventListener("click", showQaDataResetModal);
refs.qaMenuButton.addEventListener("click", () => {
  setQaPanel(!state.qaOpen);
});
refs.qaCloseButton.addEventListener("click", () => {
  setQaPanel(false);
});
refs.helpButton.addEventListener("click", () => {
  if (state.modalType === "levelup") {
    showLevelUpSelection();
    return;
  }
  showHelpModal();
});
refs.bossInfoButton?.addEventListener("click", () => {
  if (state.modalType === "levelup") {
    showLevelUpSelection();
    return;
  }
  showBossInfoModal("manual");
});
refs.modalClose.addEventListener("click", requestModalClose);
refs.levelUpResumeButton.addEventListener("click", showLevelUpSelection);
refs.modalBackdrop.addEventListener("click", (event) => {
  if (
    event.target === refs.modalBackdrop &&
    state.modalType !== "consent"
  ) {
    requestModalClose();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.qaOpen) {
    setQaPanel(false);
    return;
  }
  if (refs.modalBackdrop.classList.contains("is-open")) {
    requestModalClose();
  }
});

window.addEventListener?.("resize", scheduleWorkspaceFit);
if (typeof window.ResizeObserver === "function") {
  const workspaceResizeObserver = new window.ResizeObserver(
    scheduleWorkspaceFit,
  );
  workspaceResizeObserver.observe(refs.gameCard);
}

document.querySelectorAll("[data-app-version]").forEach((label) => {
  label.textContent = `v${APP_VERSION}${label.classList.contains("modal-version") ? ` · ${APP_VERSION_NAME}` : ""}`;
});

window.RuneTracePlayLog?.init({
  gameVersion: APP_VERSION,
  getContext: playLogContext,
});

const restoredRun = restoreRunState();
if (!restoredRun) {
  state.randomState = createRandomSeed();
  state.bossConfigs = createBossConfigs();
}
const storedPlayLogConsent = window.RuneTracePlayLog?.getConsent();
if (storedPlayLogConsent === "granted") {
  startPlayLogSession();
  if (restoredRun) {
    const reconnectState =
      window.RuneTracePlayLog?.getReconnectState?.() ?? {};
    if (reconnectState.returnedAfterExit) {
      showReturnAfterExitModal(reconnectState);
    } else {
      logRestoredRun(
        reconnectState.resumedWithinGrace
          ? "reconnect_within_grace"
          : "page_load",
      );
      showIntroModal();
    }
  } else {
    startFloor(1);
    showIntroModal();
  }
} else {
  if (!restoredRun) {
    startFloor(1, { logStart: false });
  }
  if (storedPlayLogConsent === "declined") {
    showIntroModal();
  } else {
    showPlayLogConsentModal();
  }
}
  /* =========================================================
 * Automated QA API
 * URL에 ?test=1이 있을 때만 활성화됩니다.
 * ========================================================= */

const runeTraceTestApiEnabled =
  new URLSearchParams(window.location.search).get("test") === "1";

if (runeTraceTestApiEnabled) {
  document.documentElement.dataset.testApi = "rune-trace-v1";

  function clearTestPath() {
    state.currentPath = [];
    state.pathStartedAt = 0;
    renderBoard();
  }

  function getTestState() {
    return {
      apiVersion: 1,
      gameVersion: APP_VERSION,

      floor: state.floor,
      stage: currentStage(),
      floorInStage: currentFloorInStage(),

      running: state.running,
      modalType: state.modalType,

      level: state.level,
      experience: state.experience,

      completedRuneCount: completedRuneCount(),

      remainingRunes: remainingRunes().map((rune) => ({
        instanceId: rune.instanceId,
        id: rune.id,
        name: rune.name,
        points: rune.points.map(([x, y]) => [x, y]),
      })),

      completedPaths: state.completedPaths.map((entry) => ({
        runeId: entry.runeId ?? null,
        path: entry.path.map(({ row, col }) => ({
          row,
          col,
        })),
      })),

      claimedCells: [...state.claimed],
      corruptedCells: [...state.corrupted],

      enemies: state.enemies.map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        row: enemy.row,
        col: enemy.col,
        shieldCount: enemy.shieldCount ?? 0,
        moveIntent: enemy.moveIntent
          ? { ...enemy.moveIntent }
          : null,
      })),

      abilities: [...state.abilities],
      failureReason: state.lastFailureReason,
    };
  }

  /*
   * 현재 보드에서 실제로 그릴 수 있는 룬 경로를 찾습니다.
   * 반환 형식:
   * [
   *   {
   *     runeId: "line",
   *     runeName: "일섬",
   *     cells: [[3, 1], [3, 2], [3, 3], [3, 4]]
   *   }
   * ]
   */
  function findPlayableTestPaths(limit = 20) {
    const results = [];
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

    for (const rune of remainingRunes()) {
      const sequences = getPathSequences(rune);

      for (const sequence of sequences) {
        for (let originRow = 0; originRow < BOARD_SIZE; originRow += 1) {
          for (
            let originCol = 0;
            originCol < BOARD_SIZE;
            originCol += 1
          ) {
            const path = sequence.map(([x, y]) => ({
              row: originRow + y,
              col: originCol + x,
            }));

            const insideBoard = path.every(
              ({ row, col }) =>
                row >= 0 &&
                row < BOARD_SIZE &&
                col >= 0 &&
                col < BOARD_SIZE,
            );

            if (!insideBoard) {
              continue;
            }

            const uniqueCells = new Set(
              path.map(({ row, col }) => cellKey(row, col)),
            );

            if (uniqueCells.size !== path.length) {
              continue;
            }

            const usesBlockedCell = path.some(({ row, col }) => {
              const key = cellKey(row, col);

              return (
                state.claimed.has(key) ||
                state.corrupted.has(key)
              );
            });

            if (usesBlockedCell) {
              continue;
            }

            if (pathCrossesCompletedTrace(path)) {
              continue;
            }

            if (!matchesRune(path, rune)) {
              continue;
            }

            results.push({
              runeId: rune.id,
              runeName: rune.name,
              cells: path.map(({ row, col }) => [row, col]),
            });

            if (results.length >= safeLimit) {
              return results;
            }
          }
        }
      }
    }

    return results;
  }

  /*
   * [[row, col], ...] 형식의 경로를 실제 게임 로직으로 처리합니다.
   */
  function drawTestPath(cells) {
    if (!Array.isArray(cells) || cells.length === 0) {
      return {
        ok: false,
        reason: "empty_path",
      };
    }

    if (!state.running) {
      return {
        ok: false,
        reason: "game_not_running",
      };
    }

    if (state.modalType) {
      return {
        ok: false,
        reason: "modal_open",
        modalType: state.modalType,
      };
    }

    const normalizedCells = [];

    for (const value of cells) {
      if (
        !Array.isArray(value) ||
        value.length !== 2 ||
        !Number.isInteger(value[0]) ||
        !Number.isInteger(value[1])
      ) {
        return {
          ok: false,
          reason: "invalid_cell_format",
          value,
        };
      }

      const [row, col] = value;

      if (
        row < 0 ||
        row >= BOARD_SIZE ||
        col < 0 ||
        col >= BOARD_SIZE
      ) {
        return {
          ok: false,
          reason: "cell_out_of_bounds",
          row,
          col,
        };
      }

      normalizedCells.push({ row, col });
    }

    state.currentPath = [];
    state.pathStartedAt = Date.now();

    for (const cell of normalizedCells) {
      const previousLength = state.currentPath.length;

      appendDrawingCell(cell);

      /*
       * 정상 입력이면 한 칸씩 추가되어야 합니다.
       * 차단, 비인접, 잘못된 방향이면 추가되지 않습니다.
       */
      if (state.currentPath.length !== previousLength + 1) {
        clearTestPath();

        return {
          ok: false,
          reason: "cell_rejected",
          row: cell.row,
          col: cell.col,
        };
      }
    }

    const matchedRune = remainingRunes().find((rune) =>
      matchesRune(state.currentPath, rune),
    );

    if (!matchedRune) {
      const attemptedPath = state.currentPath.map(({ row, col }) => [
        row,
        col,
      ]);

      clearTestPath();

      return {
        ok: false,
        reason: "rune_not_matched",
        attemptedPath,
      };
    }

    const committedPath = state.currentPath.map(({ row, col }) => ({
      row,
      col,
    }));

    const result = {
      ok: true,
      runeId: matchedRune.id,
      runeName: matchedRune.name,
      cells: committedPath.map(({ row, col }) => [row, col]),
    };

    commitRune(matchedRune, committedPath);

    return result;
  }

  /*
   * 로그 동의·튜토리얼·보스 설명처럼
   * 자동 테스트를 막는 초기 모달을 정리합니다.
   */
  async function prepareAutomatedTest() {
    if (state.modalType === "consent") {
      await window.RuneTracePlayLog?.setConsent(false);
      showIntroModal();
    }

    /*
     * intro를 닫으면 boss-info가 연속으로 열릴 수 있으므로
     * 여러 번 확인합니다.
     */
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const dismissibleModalTypes = [
        "intro",
        "boss-info",
        "help",
      ];

      if (!dismissibleModalTypes.includes(state.modalType)) {
        break;
      }

      requestModalClose();
    }

    return {
      ok: !state.modalType,
      ready: Boolean(
        state.running &&
        remainingRunes().length > 0 &&
        !state.modalType
      ),
      modalType: state.modalType,
    };
  }

  window.RuneTraceTest = Object.freeze({
    getCapabilities() {
      return {
        apiVersion: 1,
        gameVersion: APP_VERSION,
        enabledBy: "?test=1",

        methods: [
          "getCapabilities",
          "isReady",
          "prepare",
          "getState",
          "listPlayablePaths",
          "drawPath",
          "drawFirstPlayable",
          "resetFloor",
          "undo",
        ],

        pathFormat: "[[row, col], ...]",
      };
    },

    isReady() {
      return {
        ready: Boolean(
          refs.board &&
          state.running &&
          remainingRunes().length > 0 &&
          !state.modalType
        ),
        modalType: state.modalType,
        remainingRuneCount: remainingRunes().length,
      };
    },

    prepare: prepareAutomatedTest,

    getState: getTestState,

    listPlayablePaths(limit = 20) {
      return findPlayableTestPaths(limit);
    },

    drawPath: drawTestPath,

    drawFirstPlayable() {
      const candidate = findPlayableTestPaths(1)[0];

      if (!candidate) {
        return {
          ok: false,
          reason: "no_playable_path",
        };
      }

      return drawTestPath(candidate.cells);
    },

    resetFloor: () => {
      resetFloor();

      return {
        ok: true,
        floor: state.floor,
        state: getTestState(),
      };
    },

    undo: () => {
      const previousCount = completedRuneCount();

      undoLastRune();

      return {
        ok: completedRuneCount() < previousCount,
        completedRuneCount: completedRuneCount(),
        state: getTestState(),
      };
    },
  });

  console.info(
    "[RuneTraceTest] Automated QA API enabled. " +
    "Run RuneTraceTest.getCapabilities() for usage.",
  );
}

