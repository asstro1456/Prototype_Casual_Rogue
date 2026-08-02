function scriptProperty_(key, fallback) {
  return PropertiesService.getScriptProperties().getProperty(key) || fallback;
}

const SPREADSHEET_ID = scriptProperty_(
  "PLAY_LOG_SPREADSHEET_ID",
  "",
);
const SERVICE_NAME = scriptProperty_(
  "PLAY_LOG_SERVICE_NAME",
  "play-log",
);
const ENABLE_ANALYTICS = scriptProperty_(
  "PLAY_LOG_ENABLE_ANALYTICS",
  "true",
) !== "false";
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
const LEGACY_EVENTS_SHEET_NAME = "Events";
const RAW_BATCHES_SHEET_NAME = "Raw_Batches";
const SESSION_INDEX_SHEET_NAME = "Session_Index";
const PARTICIPANTS_SHEET_NAME = "Participants";
const SESSIONS_SHEET_NAME = "Sessions";
const FLOOR_ATTEMPTS_SHEET_NAME = "Floor_Attempts";
const DASHBOARD_DATA_SHEET_NAME = "Dashboard_Data";
const DASHBOARD_SHEET_NAME = "Dashboard";
const DASHBOARD_LAYOUT_VERSION = "dashboard_v0.2.1";
const MAX_BATCH_SIZE = 50;
const MAX_REQUEST_CHARS = 500000;
const MAX_PAYLOAD_CHARS = 20000;
const MAX_PACKED_CELL_CHARS = 42000;
const MAX_INDEX_CELL_CHARS = 40000;
const LEGACY_MIGRATION_SIZE = 200;

const RAW_BATCH_HEADERS = [
  "server_time_utc",
  "batch_id",
  "event_count",
  "participant_id",
  "session_id",
  "game_version",
  "schema_version",
  "platform",
  "locale",
  "test_group",
  "stage_id",
  "floor_index",
  "first_client_time_utc",
  "last_client_time_utc",
  "events_json",
];
const SESSION_INDEX_HEADERS = [
  "session_id",
  "chunk_index",
  "participant_id",
  "first_event_utc",
  "last_event_utc",
  "event_count",
  "event_ids_json",
];
const PARTICIPANT_HEADERS = [
  "participant_id",
  "first_play_utc",
  "last_play_utc",
  "total_sessions",
  "tutorial_completed",
  "max_stage",
  "max_floor",
  "last_game_version",
  "last_test_group",
];
const SESSION_HEADERS = [
  "session_id",
  "participant_id",
  "started_at",
  "last_event_at",
  "ended_at",
  "game_version",
  "test_group",
  "event_count",
  "max_stage",
  "max_floor",
  "active_time_ms",
  "exit_reason",
];
const FLOOR_ATTEMPT_HEADERS = [
  "attempt_id",
  "session_id",
  "participant_id",
  "game_version",
  "test_group",
  "stage_id",
  "floor_index",
  "started_at",
  "ended_at",
  "success",
  "failure_reason",
  "duration_ms",
  "completed_runes",
  "direct_defeated",
  "ability_defeated",
  "surviving_enemies",
  "corrupted_cell_count",
  "level",
  "experience",
  "retry",
  "path_attempts",
  "valid_paths",
  "invalid_paths",
  "boss_variant",
  "updated_at",
  "inferred_start",
];
const DASHBOARD_DATA_HEADERS = [
  "metric_key",
  "game_version",
  "test_group",
  "stage_id",
  "floor_index",
  "boss_variant",
  "attempts",
  "clears",
  "failures",
  "total_duration_ms",
  "valid_paths",
  "invalid_paths",
  "retries",
  "last_updated_utc",
];
function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse_({
    ok: true,
    service: SERVICE_NAME,
    schema_version: 1,
    storage_format: "event_batch_v1",
    analytics_enabled: ENABLE_ANALYTICS,
    server_time_utc: new Date().toISOString(),
  });
}

function doPost(event) {
  const contents = event?.postData?.contents ?? "";
  if (!contents || contents.length > MAX_REQUEST_CHARS) {
    return jsonResponse_({ ok: false, error: "invalid_request_size" });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(contents);
  } catch (error) {
    return jsonResponse_({ ok: false, error: "invalid_json" });
  }

  const events = requestBody?.events;
  if (
    !Array.isArray(events) ||
    events.length === 0 ||
    events.length > MAX_BATCH_SIZE
  ) {
    return jsonResponse_({ ok: false, error: "invalid_batch" });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse_({ ok: false, error: "server_busy" });
  }

  try {
    return jsonResponse_(persistEventBatches_(events));
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: "server_error" });
  } finally {
    lock.releaseLock();
  }
}

function persistEventBatches_(events) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ensureStorageSheets_(spreadsheet);
  const sessionIndexes = new Map();
  const acceptedEvents = [];
  const acknowledgedEventIds = [];
  const rejectedEvents = [];
  let duplicateCount = 0;

  events.forEach((event) => {
    const validationError = validateEvent_(event);
    if (validationError) {
      rejectedEvents.push({
        event_id: typeof event?.event_id === "string"
          ? event.event_id
          : null,
        reason: validationError,
      });
      return;
    }

    let sessionIndex = sessionIndexes.get(event.session_id);
    if (!sessionIndex) {
      sessionIndex = loadSessionIndex_(
        sheets.sessionIndex,
        event.session_id,
      );
      sessionIndexes.set(event.session_id, sessionIndex);
    }
    if (sessionIndex.ids.has(event.event_id)) {
      acknowledgedEventIds.push(event.event_id);
      duplicateCount += 1;
      return;
    }

    sessionIndex.ids.add(event.event_id);
    sessionIndex.newEvents.push(event);
    acceptedEvents.push(event);
    acknowledgedEventIds.push(event.event_id);
  });

  let writtenBatchCount = 0;
  if (acceptedEvents.length > 0) {
    const rawRows = createRawBatchRows_(
      acceptedEvents,
      new Date().toISOString(),
    );
    sheets.rawBatches
      .getRange(
        sheets.rawBatches.getLastRow() + 1,
        1,
        rawRows.length,
        RAW_BATCH_HEADERS.length,
      )
      .setValues(rawRows);
    writtenBatchCount = rawRows.length;
    persistSessionIndexes_(sheets.sessionIndex, sessionIndexes);
    if (ENABLE_ANALYTICS) updateAnalyticsSheets_(sheets, acceptedEvents);
    SpreadsheetApp.flush();
  }

  return {
    ok: true,
    storage_format: "event_batch_v1",
    acknowledged_event_ids: acknowledgedEventIds,
    rejected_events: rejectedEvents,
    written_count: writtenBatchCount,
    written_event_count: acceptedEvents.length,
    duplicate_count: duplicateCount,
  };
}

function ensureStorageSheets_(spreadsheet) {
  const sheets = {
    rawBatches: getOrCreateSheet_(
      spreadsheet,
      RAW_BATCHES_SHEET_NAME,
      RAW_BATCH_HEADERS,
    ),
    sessionIndex: getOrCreateSheet_(
      spreadsheet,
      SESSION_INDEX_SHEET_NAME,
      SESSION_INDEX_HEADERS,
    ),
  };
  if (!ENABLE_ANALYTICS) return sheets;
  Object.assign(sheets, {
    participants: getOrCreateSheet_(
      spreadsheet,
      PARTICIPANTS_SHEET_NAME,
      PARTICIPANT_HEADERS,
    ),
    sessions: getOrCreateSheet_(
      spreadsheet,
      SESSIONS_SHEET_NAME,
      SESSION_HEADERS,
    ),
    floorAttempts: getOrCreateSheet_(
      spreadsheet,
      FLOOR_ATTEMPTS_SHEET_NAME,
      FLOOR_ATTEMPT_HEADERS,
    ),
    dashboardData: getOrCreateSheet_(
      spreadsheet,
      DASHBOARD_DATA_SHEET_NAME,
      DASHBOARD_DATA_HEADERS,
    ),
  });
  ensureDashboardSheet_(spreadsheet);
  return sheets;
}

function getOrCreateSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name)
    ?? spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    validateHeaders_(sheet, headers);
  }
  return sheet;
}

function validateHeaders_(sheet, expectedHeaders) {
  const headers = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getDisplayValues()[0];
  if (headers.join("\u001f") !== expectedHeaders.join("\u001f")) {
    throw new Error(`${sheet.getName()} sheet headers do not match.`);
  }
}

function ensureDashboardSheet_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME)
    ?? spreadsheet.insertSheet(DASHBOARD_SHEET_NAME);
  if (sheet.getRange("Z1").getValue() === DASHBOARD_LAYOUT_VERSION) {
    return;
  }
  if (
    sheet.getRange("A1").getValue() &&
    sheet.getRange("A8").getValue() !== "확정 중간 이탈 세션"
  ) {
    sheet.getRange("A1:F30").clearContent();
  }

  sheet.getRange("A1").setValue("룬 트레이스 테스트 대시보드");
  sheet.getRange("A2:A10").setValues([
    ["참가자 수"],
    ["세션 수"],
    ["튜토리얼 완료율"],
    ["플로어 클리어율"],
    ["평균 플로어 시간(초)"],
    ["재시도 플로어 비율"],
    ["확정 중간 이탈 세션"],
    ["중간 이탈률"],
    ["평균 세션 플레이 시간(분)"],
  ]);
  sheet.getRange("B2").setFormula(
    `=MAX(0,COUNTA(${PARTICIPANTS_SHEET_NAME}!A2:A))`,
  );
  sheet.getRange("B3").setFormula(
    `=MAX(0,COUNTA(${SESSIONS_SHEET_NAME}!A2:A))`,
  );
  sheet.getRange("B4").setFormula(
    `=IFERROR(COUNTIF(${PARTICIPANTS_SHEET_NAME}!E2:E,TRUE)/COUNTA(${PARTICIPANTS_SHEET_NAME}!A2:A),0)`,
  );
  sheet.getRange("B5").setFormula(
    `=IFERROR(COUNTIF(${FLOOR_ATTEMPTS_SHEET_NAME}!J2:J,TRUE)/COUNTA(${FLOOR_ATTEMPTS_SHEET_NAME}!J2:J),0)`,
  );
  sheet.getRange("B6").setFormula(
    `=IFERROR(AVERAGE(${FLOOR_ATTEMPTS_SHEET_NAME}!L2:L)/1000,0)`,
  );
  sheet.getRange("B7").setFormula(
    `=IFERROR(COUNTIF(${FLOOR_ATTEMPTS_SHEET_NAME}!T2:T,TRUE)/COUNTA(${FLOOR_ATTEMPTS_SHEET_NAME}!A2:A),0)`,
  );
  sheet.getRange("B8").setFormula(
    `=COUNTIFS(${SESSIONS_SHEET_NAME}!L2:L,"page_hide_running",${SESSIONS_SHEET_NAME}!E2:E,"<>",${SESSIONS_SHEET_NAME}!E2:E,"<="&NOW()-TIME(0,5,0))`,
  );
  sheet.getRange("B9").setFormula(
    `=IFERROR(B8/COUNTIFS(${SESSIONS_SHEET_NAME}!E2:E,"<>",${SESSIONS_SHEET_NAME}!E2:E,"<="&NOW()-TIME(0,5,0)),0)`,
  );
  sheet.getRange("B10").setFormula(
    `=IFERROR(AVERAGE(FILTER(${SESSIONS_SHEET_NAME}!K2:K,${SESSIONS_SHEET_NAME}!E2:E<>"",${SESSIONS_SHEET_NAME}!E2:E<=NOW()-TIME(0,5,0)))/60000,0)`,
  );
  sheet.getRange("A13").setValue("스테이지·플로어별 누적 결과");
  sheet.getRange("A14").setFormula(
    `=QUERY(${DASHBOARD_DATA_SHEET_NAME}!A:N,"select D,E,sum(G),sum(H),sum(I) where D is not null group by D,E label D '스테이지', E '플로어', sum(G) '시도', sum(H) '성공', sum(I) '실패'",1)`,
  );
  sheet.getRange("B4:B5").setNumberFormat("0.0%");
  sheet.getRange("B7").setNumberFormat("0.0%");
  sheet.getRange("B9").setNumberFormat("0.0%");
  sheet.getRange("B6").setNumberFormat("0.0");
  sheet.getRange("B10").setNumberFormat("0.0");
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 120);
  sheet.getRange("Z1").setValue(DASHBOARD_LAYOUT_VERSION);
}

function loadSessionIndex_(sheet, sessionId) {
  const result = {
    sessionId,
    ids: new Set(),
    chunks: [],
    newEvents: [],
  };
  if (sheet.getLastRow() <= 1) return result;

  const matches = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(sessionId)
    .matchEntireCell(true)
    .findAll();
  matches.forEach((match) => {
    const row = match.getRow();
    const values = sheet
      .getRange(row, 1, 1, SESSION_INDEX_HEADERS.length)
      .getValues()[0];
    let ids = [];
    try {
      ids = JSON.parse(values[6] || "[]");
    } catch (error) {
      ids = [];
    }
    ids.filter((id) => typeof id === "string").forEach(
      (id) => result.ids.add(id),
    );
    result.chunks.push({
      row,
      chunkIndex: Number(values[1]) || 1,
      participantId: values[2],
      firstEventUtc: values[3],
      lastEventUtc: values[4],
      ids,
      dirty: false,
    });
  });
  result.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  return result;
}

function persistSessionIndexes_(sheet, sessionIndexes) {
  sessionIndexes.forEach((sessionIndex) => {
    if (sessionIndex.newEvents.length === 0) return;
    let chunk =
      sessionIndex.chunks[sessionIndex.chunks.length - 1] ?? null;

    sessionIndex.newEvents.forEach((event) => {
      if (!chunk) {
        chunk = {
          row: null,
          chunkIndex: 1,
          participantId: event.participant_id,
          firstEventUtc: event.client_time_utc,
          lastEventUtc: event.client_time_utc,
          ids: [],
          dirty: true,
        };
        sessionIndex.chunks.push(chunk);
      }
      const candidateIds = [...chunk.ids, event.event_id];
      if (
        chunk.ids.length > 0 &&
        JSON.stringify(candidateIds).length > MAX_INDEX_CELL_CHARS
      ) {
        chunk = {
          row: null,
          chunkIndex: chunk.chunkIndex + 1,
          participantId: event.participant_id,
          firstEventUtc: event.client_time_utc,
          lastEventUtc: event.client_time_utc,
          ids: [],
          dirty: true,
        };
        sessionIndex.chunks.push(chunk);
      }
      chunk.ids.push(event.event_id);
      chunk.lastEventUtc = event.client_time_utc;
      chunk.dirty = true;
    });

    sessionIndex.chunks
      .filter((entry) => entry.dirty)
      .forEach((entry) => {
        const values = [[
          sessionIndex.sessionId,
          entry.chunkIndex,
          entry.participantId,
          entry.firstEventUtc,
          entry.lastEventUtc,
          entry.ids.length,
          JSON.stringify(entry.ids),
        ]];
        if (entry.row) {
          sheet
            .getRange(
              entry.row,
              1,
              1,
              SESSION_INDEX_HEADERS.length,
            )
            .setValues(values);
        } else {
          entry.row = sheet.getLastRow() + 1;
          sheet
            .getRange(
              entry.row,
              1,
              1,
              SESSION_INDEX_HEADERS.length,
            )
            .setValues(values);
        }
      });
  });
}

function createRawBatchRows_(events, serverTime) {
  const groups = new Map();
  events.forEach((event) => {
    const key = JSON.stringify([
      event.participant_id,
      event.session_id,
      event.game_version,
      event.schema_version,
      event.platform,
      event.locale,
      event.test_group,
      event.stage_id,
      event.floor_index,
    ]);
    if (!groups.has(key)) {
      groups.set(key, { common: event, entries: [] });
    }
    groups.get(key).entries.push({
      event_id: event.event_id,
      event_name: event.event_name,
      client_time_utc: event.client_time_utc,
      payload: event.payload,
    });
  });

  const rows = [];
  groups.forEach(({ common, entries }) => {
    let chunk = [];
    const writeChunk = () => {
      if (chunk.length === 0) return;
      const payload = JSON.stringify({
        format: "event_batch_v1",
        events: chunk,
      });
      rows.push([
        serverTime,
        `batch_${Utilities.getUuid()}`,
        chunk.length,
        common.participant_id,
        common.session_id,
        common.game_version,
        common.schema_version,
        common.platform,
        common.locale,
        common.test_group,
        common.stage_id,
        common.floor_index,
        chunk[0].client_time_utc,
        chunk[chunk.length - 1].client_time_utc,
        payload,
      ]);
      chunk = [];
    };

    entries.forEach((entry) => {
      const candidate = [...chunk, entry];
      const candidateJson = JSON.stringify({
        format: "event_batch_v1",
        events: candidate,
      });
      if (
        chunk.length > 0 &&
        candidateJson.length > MAX_PACKED_CELL_CHARS
      ) {
        writeChunk();
      }
      chunk.push(entry);
    });
    writeChunk();
  });
  return rows;
}

function updateAnalyticsSheets_(sheets, events) {
  const participantGroups = groupBy_(events, "participant_id");
  participantGroups.forEach((group, participantId) => {
    updateParticipant_(sheets.participants, participantId, group);
  });

  const sessionGroups = groupBy_(events, "session_id");
  sessionGroups.forEach((group, sessionId) => {
    updateSession_(sheets.sessions, sessionId, group);
  });

  const completedAttempts = updateFloorAttempts_(
    sheets.floorAttempts,
    events,
  );
  updateDashboardData_(sheets.dashboardData, completedAttempts);
}

function groupBy_(values, field) {
  const groups = new Map();
  values.forEach((value) => {
    const key = value[field];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  });
  return groups;
}

function findExactRow_(sheet, column, value) {
  if (sheet.getLastRow() <= 1) return null;
  const match = sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .findNext();
  return match?.getRow() ?? null;
}

function eventStage_(event) {
  const payloadStage = Number(event.payload?.stage_index);
  if (Number.isInteger(payloadStage) && payloadStage > 0) {
    return payloadStage;
  }
  const match = String(event.stage_id ?? "").match(/stage_(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function updateParticipant_(sheet, participantId, events) {
  const row = findExactRow_(sheet, 1, participantId);
  const existing = row
    ? sheet.getRange(row, 1, 1, PARTICIPANT_HEADERS.length).getValues()[0]
    : [
        participantId,
        events[0].client_time_utc,
        events[0].client_time_utc,
        0,
        false,
        0,
        0,
        "",
        "",
      ];
  const eventTimes = events.map((event) => event.client_time_utc).sort();
  existing[1] = existing[1] || eventTimes[0];
  existing[2] = eventTimes[eventTimes.length - 1];
  existing[3] =
    Number(existing[3] || 0) +
    events.filter((event) => event.event_name === "session_start").length;
  existing[4] =
    Boolean(existing[4]) ||
    events.some((event) => event.event_name === "tutorial_complete");
  existing[5] = Math.max(
    Number(existing[5] || 0),
    ...events.map(eventStage_),
  );
  existing[6] = Math.max(
    Number(existing[6] || 0),
    ...events.map((event) => Number(event.floor_index) || 0),
  );
  existing[7] = events[events.length - 1].game_version;
  existing[8] = events[events.length - 1].test_group;
  const targetRow = row ?? sheet.getLastRow() + 1;
  sheet
    .getRange(targetRow, 1, 1, PARTICIPANT_HEADERS.length)
    .setValues([existing]);
}

function sheetDate_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventDate_(event) {
  return sheetDate_(event.client_time_utc) ?? new Date();
}

function updateSession_(sheet, sessionId, events) {
  const row = findExactRow_(sheet, 1, sessionId);
  const first = events[0];
  const orderedEvents = [...events].sort(
    (a, b) => eventDate_(a).getTime() - eventDate_(b).getTime(),
  );
  const earliestEventAt = eventDate_(orderedEvents[0]);
  const latestEventAt = eventDate_(
    orderedEvents[orderedEvents.length - 1],
  );
  const existing = row
    ? sheet.getRange(row, 1, 1, SESSION_HEADERS.length).getValues()[0]
    : [
        sessionId,
        first.participant_id,
        earliestEventAt,
        latestEventAt,
        "",
        first.game_version,
        first.test_group,
        0,
        0,
        0,
        "",
        "",
      ];
  const existingStartAt = sheetDate_(existing[2]);
  const existingLastEventAt = sheetDate_(existing[3]);
  existing[2] =
    !existingStartAt || earliestEventAt < existingStartAt
      ? earliestEventAt
      : existingStartAt;
  existing[3] =
    !existingLastEventAt || latestEventAt > existingLastEventAt
      ? latestEventAt
      : existingLastEventAt;

  orderedEvents
    .filter((event) =>
      ["session_resume", "session_end"].includes(event.event_name),
    )
    .forEach((event) => {
      const eventAt = eventDate_(event);
      const endedAt = sheetDate_(existing[4]);
      if (event.event_name === "session_resume") {
        if (!endedAt || eventAt >= endedAt) {
          existing[4] = "";
          existing[11] = "";
        }
        return;
      }
      if (
        !endedAt &&
        existingLastEventAt &&
        eventAt < existingLastEventAt
      ) {
        return;
      }
      if (!endedAt || eventAt >= endedAt) {
        existing[4] = eventAt;
        existing[10] = Math.max(
          Number(existing[10] || 0),
          Number(event.payload?.active_time_ms || 0),
        );
        existing[11] = event.payload?.running
          ? "page_hide_running"
          : event.payload?.reason ?? existing[11];
      }
    });
  existing[7] = Number(existing[7] || 0) + events.length;
  existing[8] = Math.max(
    Number(existing[8] || 0),
    ...events.map(eventStage_),
  );
  existing[9] = Math.max(
    Number(existing[9] || 0),
    ...events.map((event) => Number(event.floor_index) || 0),
  );
  const targetRow = row ?? sheet.getLastRow() + 1;
  sheet
    .getRange(targetRow, 1, 1, SESSION_HEADERS.length)
    .setValues([existing]);
}

function updateFloorAttempts_(sheet, events) {
  const sessionIds = [...new Set(events.map((event) => event.session_id))];
  const attempts = [];
  sessionIds.forEach((sessionId) => {
    if (sheet.getLastRow() <= 1) return;
    const matches = sheet
      .getRange(2, 2, sheet.getLastRow() - 1, 1)
      .createTextFinder(sessionId)
      .matchEntireCell(true)
      .findAll();
    matches.forEach((match) => {
      attempts.push({
        row: match.getRow(),
        values: sheet
          .getRange(
            match.getRow(),
            1,
            1,
            FLOOR_ATTEMPT_HEADERS.length,
          )
          .getValues()[0],
        dirty: false,
        isNew: false,
      });
    });
  });

  const completedAttempts = [];
  events.forEach((event) => {
    const floorIndex = Number(event.floor_index);
    if (!Number.isInteger(floorIndex)) return;
    const keyMatches = (attempt) =>
      attempt.values[1] === event.session_id &&
      Number(attempt.values[6]) === floorIndex;
    let attempt = [...attempts].reverse().find(keyMatches);

    if (event.event_name === "floor_start") {
      attempt = {
        row: null,
        values: createAttemptValues_(event, false),
        dirty: true,
        isNew: true,
      };
      attempts.push(attempt);
      return;
    }
    if (
      !attempt &&
      ["path_result", "boss_start", "floor_end"].includes(event.event_name)
    ) {
      attempt = {
        row: null,
        values: createAttemptValues_(event, true),
        dirty: true,
        isNew: true,
      };
      attempts.push(attempt);
    }
    if (!attempt) return;

    if (event.event_name === "path_result") {
      attempt.values[20] = Number(attempt.values[20] || 0) + 1;
      if (event.payload?.valid) {
        attempt.values[21] = Number(attempt.values[21] || 0) + 1;
      } else {
        attempt.values[22] = Number(attempt.values[22] || 0) + 1;
      }
      attempt.dirty = true;
    } else if (event.event_name === "boss_start") {
      attempt.values[23] = event.payload?.boss_variant ?? "";
      attempt.dirty = true;
    } else if (event.event_name === "floor_end") {
      attempt.values[8] = event.client_time_utc;
      attempt.values[9] = Boolean(event.payload?.success);
      attempt.values[10] = event.payload?.failure_reason ?? "";
      attempt.values[11] = event.payload?.duration_ms ?? "";
      attempt.values[12] = event.payload?.completed_runes ?? "";
      attempt.values[13] = event.payload?.direct_defeated ?? "";
      attempt.values[14] = event.payload?.ability_defeated ?? "";
      attempt.values[15] = event.payload?.surviving_enemies ?? "";
      attempt.values[16] = event.payload?.corrupted_cell_count ?? "";
      attempt.values[17] = event.payload?.level ?? "";
      attempt.values[18] = event.payload?.experience ?? "";
      attempt.values[24] = new Date().toISOString();
      attempt.dirty = true;
      completedAttempts.push(attempt);
    }
  });

  attempts
    .filter((attempt) => attempt.dirty)
    .forEach((attempt) => {
      if (!attempt.row) {
        attempt.row = sheet.getLastRow() + 1;
      }
      sheet
        .getRange(
          attempt.row,
          1,
          1,
          FLOOR_ATTEMPT_HEADERS.length,
        )
        .setValues([attempt.values]);
    });
  return completedAttempts;
}

function createAttemptValues_(event, inferredStart) {
  return [
    `attempt_${event.event_id}`,
    event.session_id,
    event.participant_id,
    event.game_version,
    event.test_group,
    event.stage_id,
    event.floor_index,
    inferredStart ? "" : event.client_time_utc,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    Boolean(event.payload?.retry),
    0,
    0,
    0,
    "",
    new Date().toISOString(),
    inferredStart,
  ];
}

function updateDashboardData_(sheet, completedAttempts) {
  if (completedAttempts.length === 0) return;
  const records = new Map();
  if (sheet.getLastRow() > 1) {
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        DASHBOARD_DATA_HEADERS.length,
      )
      .getValues()
      .forEach((values, index) => {
        records.set(values[0], { row: index + 2, values });
      });
  }

  completedAttempts.forEach((attempt) => {
    const values = attempt.values;
    const key = [
      values[3],
      values[4],
      values[5],
      values[6],
      values[23] || "none",
    ].join("|");
    let record = records.get(key);
    if (!record) {
      record = {
        row: null,
        values: [
          key,
          values[3],
          values[4],
          values[5],
          values[6],
          values[23] || "none",
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          "",
        ],
      };
      records.set(key, record);
    }
    record.values[6] += 1;
    record.values[7] += values[9] === true ? 1 : 0;
    record.values[8] += values[9] === true ? 0 : 1;
    record.values[9] += Number(values[11]) || 0;
    record.values[10] += Number(values[21]) || 0;
    record.values[11] += Number(values[22]) || 0;
    record.values[12] += values[19] === true ? 1 : 0;
    record.values[13] = new Date().toISOString();
  });

  records.forEach((record) => {
    if (!record.row) {
      record.row = sheet.getLastRow() + 1;
    }
    sheet
      .getRange(
        record.row,
        1,
        1,
        DASHBOARD_DATA_HEADERS.length,
      )
      .setValues([record.values]);
  });
}

function validateEvent_(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return "event_not_object";
  }
  const requiredStrings = [
    "event_id",
    "event_name",
    "client_time_utc",
    "participant_id",
    "session_id",
    "game_version",
    "platform",
    "locale",
    "test_group",
  ];
  if (
    requiredStrings.some(
      (field) =>
        typeof event[field] !== "string" ||
        event[field].length === 0 ||
        event[field].length > 160,
    )
  ) {
    return "invalid_required_field";
  }
  if (!EVENT_NAME_PATTERN.test(event.event_name)) {
    return "invalid_event_name";
  }
  if (
    !Number.isInteger(event.schema_version) ||
    event.schema_version < 1
  ) {
    return "invalid_schema_version";
  }
  if (
    event.stage_id !== null &&
    typeof event.stage_id !== "string"
  ) {
    return "invalid_stage_id";
  }
  if (
    event.floor_index !== null &&
    !Number.isInteger(event.floor_index)
  ) {
    return "invalid_floor_index";
  }
  if (
    !event.payload ||
    typeof event.payload !== "object" ||
    Array.isArray(event.payload)
  ) {
    return "invalid_payload";
  }
  if (JSON.stringify(event.payload).length > MAX_PAYLOAD_CHARS) {
    return "payload_too_large";
  }
  if (Number.isNaN(Date.parse(event.client_time_utc))) {
    return "invalid_client_time";
  }
  return null;
}

function migrateLegacyEvents() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(LEGACY_EVENTS_SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      return { ok: true, migrated: 0, complete: true };
    }
    const properties = PropertiesService.getScriptProperties();
    const nextRow = Number(
      properties.getProperty("legacy_migration_next_row") || 2,
    );
    if (nextRow > sheet.getLastRow()) {
      return { ok: true, migrated: 0, complete: true };
    }
    const count = Math.min(
      LEGACY_MIGRATION_SIZE,
      sheet.getLastRow() - nextRow + 1,
    );
    const rows = sheet
      .getRange(nextRow, 1, count, 14)
      .getValues();
    const events = rows.map((row) => {
      let payload = {};
      try {
        payload = JSON.parse(row[13] || "{}");
      } catch (error) {
        payload = { legacy_payload_parse_error: true };
      }
      return {
        client_time_utc: row[1] instanceof Date
          ? row[1].toISOString()
          : String(row[1]),
        event_id: String(row[2]),
        event_name: String(row[3]),
        participant_id: String(row[4]),
        session_id: String(row[5]),
        game_version: String(row[6]),
        schema_version: Number(row[7]),
        platform: String(row[8]),
        locale: String(row[9]),
        test_group: String(row[10]),
        stage_id: row[11] ? String(row[11]) : null,
        floor_index: row[12] === "" ? null : Number(row[12]),
        payload,
      };
    });
    const result = persistEventBatches_(events);
    properties.setProperty(
      "legacy_migration_next_row",
      String(nextRow + count),
    );
    return {
      ...result,
      migrated_source_rows: count,
      next_row: nextRow + count,
      complete: nextRow + count > sheet.getLastRow(),
    };
  } finally {
    lock.releaseLock();
  }
}
