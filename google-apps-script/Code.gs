const SPREADSHEET_ID = "1cT2RzvHeshUi4AH6FRBEj8OukQe_oxl3z4xbOvQwdGM";
const EVENTS_SHEET_NAME = "Events";
const MAX_BATCH_SIZE = 50;
const MAX_REQUEST_CHARS = 500000;
const MAX_PAYLOAD_CHARS = 20000;
const EVENT_HEADERS = [
  "server_time_utc",
  "client_time_utc",
  "event_id",
  "event_name",
  "participant_id",
  "session_id",
  "game_version",
  "schema_version",
  "platform",
  "locale",
  "test_group",
  "stage_id",
  "floor_index",
  "payload_json",
];
const ALLOWED_EVENT_NAMES = new Set([
  "session_start",
  "session_end",
  "app_background",
  "app_resume",
  "state_restore",
  "tutorial_start",
  "tutorial_step",
  "tutorial_complete",
  "tutorial_quit",
  "stage_start",
  "floor_start",
  "floor_end",
  "stage_clear",
  "stage_fail",
  "retry",
  "stage_quit",
  "rune_selected",
  "path_result",
  "boss_start",
  "boss_info_view",
  "boss_end",
  "tool_offer",
  "tool_acquire_free",
  "tool_purchase",
  "tool_use",
  "clear_after_tool",
  "ad_offer",
  "ad_start",
  "ad_complete",
  "ad_fail",
  "ad_exit",
]);

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse_({
    ok: true,
    service: "rune-trace-play-log",
    schema_version: 1,
    server_time_utc: new Date().toISOString(),
  });
}

function doPost(event) {
  const contents = event?.postData?.contents ?? "";
  if (!contents || contents.length > MAX_REQUEST_CHARS) {
    return jsonResponse_({
      ok: false,
      error: "invalid_request_size",
    });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(contents);
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: "invalid_json",
    });
  }

  const events = requestBody?.events;
  if (
    !Array.isArray(events) ||
    events.length === 0 ||
    events.length > MAX_BATCH_SIZE
  ) {
    return jsonResponse_({
      ok: false,
      error: "invalid_batch",
    });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse_({
      ok: false,
      error: "server_busy",
    });
  }

  try {
    return persistEvents_(events);
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      ok: false,
      error: "server_error",
    });
  } finally {
    lock.releaseLock();
  }
}

function persistEvents_(events) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(EVENTS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Missing sheet: ${EVENTS_SHEET_NAME}`);
  }
  validateHeaders_(sheet);

  const lastRow = sheet.getLastRow();
  const existingEventIds = lastRow > 1
    ? new Set(
        sheet
          .getRange(2, 3, lastRow - 1, 1)
          .getDisplayValues()
          .flat()
          .filter(Boolean),
      )
    : new Set();
  const receivedEventIds = new Set();
  const acknowledgedEventIds = [];
  const rejectedEvents = [];
  const rows = [];
  const serverTime = new Date().toISOString();

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

    if (
      existingEventIds.has(event.event_id) ||
      receivedEventIds.has(event.event_id)
    ) {
      acknowledgedEventIds.push(event.event_id);
      return;
    }

    const payloadJson = JSON.stringify(event.payload);
    rows.push([
      serverTime,
      event.client_time_utc,
      event.event_id,
      event.event_name,
      event.participant_id,
      event.session_id,
      event.game_version,
      event.schema_version,
      event.platform,
      event.locale,
      event.test_group,
      event.stage_id,
      event.floor_index,
      payloadJson,
    ]);
    receivedEventIds.add(event.event_id);
    acknowledgedEventIds.push(event.event_id);
  });

  if (rows.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rows.length, EVENT_HEADERS.length)
      .setValues(rows);
    SpreadsheetApp.flush();
  }

  return jsonResponse_({
    ok: true,
    acknowledged_event_ids: acknowledgedEventIds,
    rejected_events: rejectedEvents,
    written_count: rows.length,
    duplicate_count: acknowledgedEventIds.length - rows.length,
  });
}

function validateHeaders_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, EVENT_HEADERS.length)
    .getDisplayValues()[0];
  if (headers.join("\u001f") !== EVENT_HEADERS.join("\u001f")) {
    throw new Error("Events sheet headers do not match the schema.");
  }
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
  if (!ALLOWED_EVENT_NAMES.has(event.event_name)) {
    return "event_name_not_allowed";
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
