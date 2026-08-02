# Play Log Module — AI Developer Specification

이 문서는 `play-log-module`을 다른 프로젝트에 통합하거나 확장하는 AI·개발자를 위한
구현 계약이다. 설치와 연결은 [`README.md`](./README.md) 사용 설명서를 따른다.

## Scope

- 브라우저에서 익명 participant/session/event 데이터를 수집한다.
- 동의 전에는 이벤트를 저장하거나 전송하지 않는다.
- 네트워크 실패 시 IndexedDB 큐에 보관하고 다음 기회에 재전송한다.
- 5분 이내 복귀는 같은 세션으로 재개하고, 5분 초과 복귀는 새 세션으로 시작한다.
- Apps Script는 이벤트를 검증하고 압축 배치로 Google Sheets에 저장한다.

Out of scope:

- 인증 계정, 이메일, 이름, 광고 식별자 수집
- 게임 규칙·UI·대시보드의 프로젝트별 구현
- 한 페이지에서 동시에 동작하는 다중 logger instance

## Files

| Path | Contract |
|---|---|
| `client/play-log.js` | 브라우저 IIFE. `window.PlayLog`와 `window.RuneTracePlayLog`를 같은 API 객체로 노출 |
| `server/Code.gs` | Apps Script `doGet`/`doPost` 수신기 |
| `examples/analytics-config.example.js` | 복사해 사용하는 브라우저 설정 예시 |

## Client contract

### Initialization

`PlayLog.init(options)` accepts:

```js
{
  gameVersion: string,
  getContext: () => ({
    stageId: string|null,
    floorIndex: number|null,
    running: boolean,
    completedRunes?: number|null,
  }),
  config?: Partial<AnalyticsConfig>,
}
```

Call `init` once per page before `startSession` or `log`. Repeated calls are ignored.

### Public API

| Method | Behavior |
|---|---|
| `getConsent()` | returns `"granted"`, `"declined"`, or `null` |
| `setConsent(boolean)` | stores consent; declining clears the local event queue |
| `startSession(payload?)` | starts or resumes a session only when consent is granted |
| `log(name, payload?, options?)` | creates and queues an event; no-op without consent/session |
| `flush()` | attempts immediate delivery unless idle, offline, or endpoint is missing |
| `getStatus()` | returns consent, IDs, queue count, retry and idle state |
| `getReconnectState()` | returns reconnect grace decision and previous session metadata |

### AnalyticsConfig

Required for a new project:

```js
{
  activeEnvironment: "production"|"test",
  endpoints: { test: string, production: string },
  testGroup: string,
  storageNamespace: string,
  databaseName: string,
  eventStoreName: string,
}
```

Optional defaults are defined in `client/play-log.js`: `schemaVersion: 1`,
`flushThreshold: 20`, `flushIntervalMs: 30000`, `idleTimeoutMs: 300000`,
`reconnectGraceMs: 300000`, `maxBatchSize: 50`, `maxQueueSize: 5000`, `debug: false`.

`storageNamespace` must be unique per project in the same browser. Do not reuse another
project's `databaseName` or event store name.

## Event contract

Each accepted event has these fields:

```json
{
  "event_id": "event_<timestamp>_<random>",
  "event_name": "snake_case_name",
  "client_time_utc": "ISO-8601 UTC",
  "participant_id": "anonymous id",
  "session_id": "session id",
  "game_version": "project version",
  "schema_version": 1,
  "platform": "web_*",
  "locale": "browser locale",
  "test_group": "experiment group",
  "stage_id": "string or null",
  "floor_index": "integer or null",
  "payload": {}
}
```

`event_name` must match `^[a-z][a-z0-9_]{1,63}$`. Payload must be a JSON object and stay
under the server's 20,000-character limit. Add project-specific data under `payload`; do not
add new top-level fields without updating the schema and server validator together.

## Server contract

### Script properties

| Key | Required | Meaning |
|---|---:|---|
| `PLAY_LOG_SPREADSHEET_ID` | yes | destination spreadsheet ID |
| `PLAY_LOG_SERVICE_NAME` | no | `doGet` service label; default `play-log` |
| `PLAY_LOG_ENABLE_ANALYTICS` | no | `false` stores raw batches and session index only |

The packaged server has no project spreadsheet fallback. Missing `PLAY_LOG_SPREADSHEET_ID`
must be fixed before deployment.

### Storage

- `Raw_Batches`: compressed event batches, deduplicated by `event_id`
- `Session_Index`: session-level event ID index used for duplicate detection
- When analytics is enabled: `Participants`, `Sessions`, `Floor_Attempts`, `Dashboard_Data`, `Dashboard`

Unknown but valid event names are stored in raw batches. They are not automatically included in
the game-specific analytics sheets.

### Response expectations

Successful `doPost` responses contain `ok: true` and `acknowledged_event_ids`.
Rejected event IDs may be deleted from the client queue after the server explains the rejection.
The client retries transport failures with exponential backoff.

## Safe extension rules

1. Preserve the public API and the `RuneTracePlayLog` compatibility alias.
2. Preserve consent gating, payload size validation, event-name validation, deduplication, and idle pause behavior.
3. Prefer adding data inside `payload` over changing the envelope.
4. If a new top-level field or event lifecycle is required, update this file and the server validator together.
5. Do not add a framework, dependency, build step, or package manager requirement for browser use.
6. Keep the logger single-instance unless the product explicitly requires isolation between instances.

## Verification checklist

- `node --check client/play-log.js`
- `node --check examples/analytics-config.example.js`
- Compile `server/Code.gs` as JavaScript for syntax validation
- Assert `PlayLog === RuneTracePlayLog`
- Assert a valid custom event name is accepted by the documented regex
- Confirm the package contains no project-specific spreadsheet ID or Apps Script URL
- Perform actual consent, network, and Apps Script deployment checks in the target project
