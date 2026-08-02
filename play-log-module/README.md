# Play Log Module

## 먼저 읽는 쉬운 설명

이 패키지는 웹 게임에서 발생한 플레이 기록을 모아 Google Sheets에 보내는 도구다.
게임 화면에 직접 기능을 추가하는 도구가 아니라, “누가 언제 시작했고 어디까지 했는지”를
나중에 확인할 수 있게 해주는 기록용 부품이다.

사용 흐름은 단순하다.

1. 사용자가 로그 수집에 동의한다.
2. 게임에서 일어난 일을 기록한다.
3. 인터넷이 되면 기록을 여러 개 묶어 시트로 보낸다.
4. 잠시 자리를 비우면 자동 전송을 멈추고, 다시 움직일 때 이어서 보낸다.

### AI에게 컬럼 추가를 부탁하는 방법

다음처럼 **어느 탭에, 어떤 이름으로, 어디의 값을 넣을지**를 함께 말하면 된다.

> `Sessions` 탭에 `device_type` 컬럼을 추가해줘. 브라우저 종류를 기록하고, 기존 행은 빈칸으로 두고, 원본 이벤트에도 영향이 없는지 확인해줘. Apps Script 수정 후 정적 구문 검사까지 해줘.

### AI에게 새 탭 추가를 부탁하는 방법

새 탭의 목적과 기록 기준을 먼저 적는다.

> `Daily_Summary` 탭을 추가해줘. 날짜별 참가자 수, 세션 수, 평균 플레이 시간을 집계하고, `Raw_Batches`는 원본으로 유지해줘. 분석 기능을 끈 경우에는 이 탭을 참조하지 않게 하고, 기존 탭이나 패치 노트는 수정하지 마.

부탁할 때 아래 내용을 넣으면 재작업이 줄어든다.

- 탭 이름과 새 컬럼 이름
- 값을 가져올 이벤트 또는 기존 탭
- 기존 데이터 처리 방법(빈칸, 일괄 변환, 재집계)
- 대시보드에 포함할지 여부
- 기존 탭·원본 데이터·버전을 건드리지 않을지 여부
- 수정 뒤 원하는 검사(구문 검사, 중복 기록 검사 등)

### 이 도구의 장점

- 별도 서버를 직접 만들지 않고 Google Sheets로 시작할 수 있다.
- 인터넷이 잠시 끊겨도 브라우저에 임시 보관했다가 다시 보낸다.
- 같은 기록을 여러 번 보내도 중복 저장을 줄인다.
- 로그 수집 동의, 5분 이내 복귀, 장시간 방치 시 전송 중단이 기본으로 들어 있다.
- 기록 형식이 단순해서 다른 게임이나 프로토타입에도 설정만 바꿔 사용할 수 있다.

### 이 도구의 단점과 한계

- Google Sheets는 데이터베이스보다 동시 사용자와 대량 데이터에 약하다.
- Apps Script 실행 시간과 시트 쓰기 속도에 영향을 받는다.
- 현재는 한 페이지에서 기록 장치 하나만 사용하는 구조다.
- 사용자 로그인이나 권한 관리 기능은 없다. 수집하는 값은 익명 정보로 제한해야 한다.
- 큰 파일, 이미지, 리플레이를 기록 데이터 안에 넣으면 전송과 저장이 무거워진다.
- 사용자 정의 기록은 원본 탭에는 남지만 기존 게임용 대시보드에 자동으로 집계되지는 않는다.

### 토큰과 작업량에 관한 제약

모델과 당시 대화 길이에 따라 달라지는 대략적인 작업량은 다음과 같다.

| 요청 | 대략적인 범위 | 분할 권장 |
|---|---:|---|
| 사용 설명서 문장 수정 | 1천~3천 토큰 | 보통 불필요 |
| 컬럼 1개 추가와 검사 | 5천~1만5천 토큰 | 변경 대상이 여러 탭이면 분할 |
| 집계 탭 1개와 마이그레이션 | 1만~3만 토큰 | 설계·구현·검사를 나눌 수 있음 |
| 저장소 교체나 전체 구조 변경 | 3만 토큰 이상 | 반드시 단계별 진행 |

위 수치는 보장값이 아니라 작업 범위를 잡기 위한 참고값이다. 기존 코드 전체를 다시 읽거나
오류를 추적해야 하면 더 늘어날 수 있다.

이 도구가 실행될 때 AI 토큰을 사용하는 것은 아니다. 토큰은 사람이 AI에게 수정이나 확장을
요청할 때만 사용된다. 다음 작업일수록 AI가 읽고 확인해야 할 코드가 많아져 요청량이 커진다.

- 설명서 문구만 수정: 작은 작업
- 컬럼 하나 추가: 중간 작업
- 새 집계 탭·마이그레이션·대시보드까지 추가: 큰 작업
- Apps Script 전체 구조 변경이나 저장소 교체: 매우 큰 작업

AI에게 한 번에 너무 많은 기능을 부탁하기보다, 한 번에 하나의 탭·기능을 요청하고 먼저
현재 구조를 확인하게 하는 편이 안전하다. “코드 수정 없이 영향만 분석해줘”라고 먼저
요청하면 토큰과 수정 위험을 줄일 수 있다.

아래부터는 설치 순서, 설정값, 컬럼 구조처럼 개발에 필요한 상세 설명이다.

이 문서는 설치와 연결을 위한 **사용 설명서**다.
AI·개발자가 구현을 이어갈 때는 [`AI_DEVELOPER_SPEC.md`](./AI_DEVELOPER_SPEC.md)를 읽는다.

브라우저 게임·프로토타입에서 익명 플레이 로그를 수집하기 위한 독립 공유 패키지다.
현재 룬 트레이스에서 사용 중인 전송·로컬 큐·동의·세션 복귀 로직을 그대로 재사용하되,
프로젝트명·저장소·Apps Script 주소는 사용하는 사람이 설정한다.

## 구성

```text
play-log-module/
├─ client/play-log.js                 브라우저 로그 클라이언트
├─ server/Code.gs                     Google Apps Script 수신기
└─ examples/analytics-config.example.js 설정 예시
```

## 1. Google Sheets와 Apps Script 준비

1. 새 Google Sheets를 만든다.
2. Apps Script 프로젝트를 만들고 `server/Code.gs` 전체를 붙여 넣는다.
3. Apps Script 프로젝트 설정의 스크립트 속성에 다음을 입력한다.

| 속성 | 값 |
|---|---|
| `PLAY_LOG_SPREADSHEET_ID` | 사용할 Google Sheets ID |
| `PLAY_LOG_SERVICE_NAME` | 선택 사항. 기본값 `play-log` |
| `PLAY_LOG_ENABLE_ANALYTICS` | `false` 권장. 원본·세션 인덱스만 저장 |

4. 웹 앱으로 배포하고 실행 권한은 **나**, 접근 권한은 사용하는 범위에 맞게 설정한다.
5. 배포된 `/exec` 주소를 클라이언트 설정에 넣는다.

`PLAY_LOG_ENABLE_ANALYTICS`를 `false`로 두면 `Raw_Batches`와 `Session_Index`만
사용한다. `true`로 두면 현재 룬 트레이스용 참가자·세션·플로어·대시보드 집계도 만든다.

## 2. 브라우저 연결

`examples/analytics-config.example.js`를 복사해 프로젝트 설정 파일로 만들고 값을 수정한다.
그 다음 HTML에서 설정 파일과 클라이언트를 로드한다.

```html
<script src="./analytics-config.js"></script>
<script src="./play-log.js"></script>
```

초기화 예시:

```js
PlayLog.init({
  gameVersion: "your-game-version",
  getContext: () => ({
    stageId: window.currentStageId ?? null,
    floorIndex: window.currentFloorIndex ?? null,
    running: Boolean(window.gameRunning),
  }),
});

await PlayLog.setConsent(true);
PlayLog.startSession({ entry_point: "game_load" });
await PlayLog.log("custom_event", { value: 1 });
await PlayLog.flush();
```

동의 전에는 이벤트가 큐에 들어가지 않는다. `PlayLog.setConsent(false)`는 기존 로컬 큐도
비운다. `PlayLog`와 `RuneTracePlayLog`는 같은 API이며, 후자는 기존 룬 트레이스 코드와의
호환용 별칭이다.

## 설정 항목

```js
window.RUNE_TRACE_ANALYTICS_CONFIG = {
  activeEnvironment: "production",
  endpoints: { test: "", production: "YOUR_APPS_SCRIPT_EXEC_URL" },
  testGroup: "your_project",
  storageNamespace: "your-project",
  databaseName: "your-project-play-log",
  databaseVersion: 1,
  eventStoreName: "events",
  participantPrefix: "participant_",
  logPrefix: "PlayLog",
  schemaVersion: 1,
  flushThreshold: 20,
  flushIntervalMs: 30000,
  idleTimeoutMs: 300000,
  reconnectGraceMs: 300000,
  maxBatchSize: 50,
  maxQueueSize: 5000,
  debug: false,
};
```

`storageNamespace`와 `databaseName`은 같은 브라우저에서 여러 프로젝트를 사용할 때
서로의 참가자 ID·동의 상태·IndexedDB 큐가 섞이지 않도록 프로젝트마다 다르게 지정한다.

## 컬럼이나 탭 추가

### 기존 탭에 컬럼 추가

기존 이벤트에 새 값을 붙이는 목적이면 먼저 `payload`에 넣는 방식을 사용한다.
이 방식은 서버 컬럼 변경 없이 바로 확장할 수 있다.

```js
await PlayLog.log("stage_clear", {
  score: 120,
  selected_ability: "example_ability",
});
```

분석에서 자주 쓰는 값을 별도 컬럼으로 승격해야 할 때는 다음 순서를 따른다.

1. `server/Code.gs`의 해당 헤더 배열(`RAW_BATCH_HEADERS`, `SESSION_HEADERS` 등)에 컬럼명을 추가한다.
2. 같은 행을 만드는 함수(`createRawBatchRows_`, `updateSession_` 등)에 값을 추가한다.
3. Google Sheets의 해당 탭 1행에 같은 컬럼명을 같은 위치로 추가한다.
4. 기존 데이터가 있는 탭이면 열 순서와 기존 컬럼명을 바꾸지 않는다. 현재 서버는 헤더 불일치를 오류로 처리한다.
5. 빈 값이 과거 행에 들어가야 한다면 Apps Script에서 1회 마이그레이션을 실행한다.
6. 새 Apps Script 버전을 배포한 뒤 테스트 이벤트 1건을 보내 헤더와 값이 맞는지 확인한다.

컬럼을 추가하지 않고 차트만 만들 목적이면 `events_json`의 `payload`를 기준으로 별도
집계 탭이나 피벗 테이블을 만드는 편이 안전하다.

### 새 탭 추가

새로운 집계나 프로젝트 전용 뷰가 필요할 때는 탭을 추가한다.

1. 탭 이름 상수와 헤더 배열을 `server/Code.gs`에 추가한다.
2. `ensureStorageSheets_()`에서 `getOrCreateSheet_()`로 탭을 생성한다.
3. `PLAY_LOG_ENABLE_ANALYTICS=false`일 때는 새 분석 탭을 참조하지 않도록 조건문으로 감싼다.
4. `updateAnalyticsSheets_()`에서 필요한 이벤트를 그룹화하고 새 탭에 행을 기록한다.
5. 중복 전송을 고려해 `event_id` 또는 `session_id` 기준으로 같은 데이터를 다시 쓰지 않게 한다.
6. 배포 후 새 탭이 자동 생성되는지 확인한다. 기존 `Raw_Batches`, `Session_Index`는 삭제하거나 이름을 바꾸지 않는다.

## 확장 가능한 방향성

- **1단계 — payload 확장:** 이벤트 이름과 봉투를 유지하고 `payload`만 추가한다. 가장 비용이 낮고 기존 수집기와 호환된다.
- **2단계 — 분석 탭 추가:** 반복해서 조회하는 값만 별도 탭으로 투영한다. 원본 `Raw_Batches`를 기준 데이터로 유지한다.
- **3단계 — 스키마 버전 관리:** 컬럼 구조를 바꿔야 하면 `schema_version`을 올리고, 구버전 행을 변환하는 마이그레이션 함수를 함께 둔다.
- **4단계 — 대시보드 연결:** `Dashboard_Data` 또는 별도 집계 탭을 Google Sheets 차트·Looker Studio의 입력으로 사용한다.
- **5단계 — 저장소 교체:** 데이터량이나 동시 사용자가 커지면 Apps Script를 유지한 채 저장 계층만 별도 API·데이터베이스로 교체한다.

현재 패키지는 한 Apps Script와 한 스프레드시트를 기준으로 한다. 여러 프로젝트를 분리할 때는
프로젝트마다 `PLAY_LOG_SPREADSHEET_ID`, `storageNamespace`, `databaseName`, `testGroup`을
다르게 설정한다.

## 리소스·부하 명세

아래 수치는 별도 벤치마크 결과가 아니라 현재 코드의 제한값으로 계산한 설계상 범위다.
실제 게임·브라우저·네트워크 환경에 따라 달라지므로 배포 전 대상 환경에서 측정한다.

### 브라우저 측

| 항목 | 기본 동작 및 상한 | 영향 |
|---|---|---|
| RAM | 전체 이벤트를 RAM에 쌓지 않고 IndexedDB에 저장한다. 자동 전송 시 최대 50개만 읽어 임시로 만든다. | 일반 이벤트 기준 수십~수백 KB 수준의 일시적 사용. JSON 직렬화·`fetch` 중에는 일시적으로 더 늘어날 수 있다. |
| IndexedDB 디스크 | 큐 최대 5,000개. 이벤트 payload는 서버 검증 기준 20,000자까지 허용된다. | 일반적인 1~3KB 이벤트라면 약 5~15MB. 이론상 payload 상한만 채우면 약 100MB까지 가능하므로 큰 payload는 피한다. |
| localStorage | 참가자 ID, 동의 상태, 세션 복귀 정보만 저장한다. | 수 KB 이하. |
| CPU | 이벤트 1건마다 JSON 복사와 IndexedDB 저장 1회. | 일반적인 입력 흐름에서는 미미한 수준이며, 무거운 게임 루프와 같은 프레임에서 실행하지 않는다. |
| 네트워크 | 20개 도달 또는 30초 간격으로 최대 50개를 배치 전송한다. | 요청 횟수를 줄이고, 5분 이상 유휴 상태면 자동 전송을 멈춘다. |

서버 요청 본문은 500,000자 제한이 있으므로 payload 상한을 모든 이벤트에 채워 한 번에
보내는 방식은 사용하지 않는다. 큰 데이터·리플레이·스크린샷은 로그 payload에 넣지 말고
별도 저장소에 보관한 뒤 식별자만 기록한다.

### Apps Script·Sheets 측

- `Raw_Batches`에는 이벤트를 묶은 행을 기록하고, `Session_Index`에는 중복 방지용 인덱스를 기록한다.
- `PLAY_LOG_ENABLE_ANALYTICS=false`면 요청마다 원본·세션 인덱스만 갱신하므로 가장 가볍다.
- 분석을 켜면 참가자·세션·플로어·대시보드 탭을 추가로 갱신한다. 요청당 쓰기 작업과 실행 시간이 늘어난다.
- Apps Script는 스크립트 잠금으로 동시 요청을 직렬화한다. 많은 사용자가 동시에 전송하는 서비스라면 이 잠금과 Sheets 쓰기가 먼저 병목이 된다.
- Apps Script의 실제 RAM 한도와 실행 시간은 Google 실행 환경이 관리하므로 이 패키지가 고정된 RAM 수치를 보장하지 않는다.

### 측정 방법

1. 브라우저 개발자 도구의 **Memory**에서 동의 전·큐 5,000개·배치 전송 직후를 각각 비교한다.
2. **Network**에서 배치 크기, 요청 횟수, 응답 시간을 확인한다.
3. Apps Script의 **Executions**에서 요청별 실행 시간과 실패율을 확인한다.
4. 실제 이벤트 평균 크기와 동시 참가자 수를 기록해 위 설계상 범위와 비교한다.

현재 구조의 확장 순서는 `payload 최소화` → `분석 비활성 원본 수집` → `집계 탭 분리` →
`Apps Script 외부 저장소/API 이전`이다. RAM·실행 시간이 실제 측정에서 한계에 도달했을 때만
다음 단계로 이동한다.

## API

- `init(options)`: 한 페이지에서 한 번 초기화한다.
- `getConsent()` / `setConsent(granted)`: 로그 수집 동의 상태를 조회·변경한다.
- `startSession(payload)`: 동의 후 세션을 시작한다.
- `log(eventName, payload, options)`: 이벤트를 로컬 큐에 저장한다.
- `flush()`: 가능한 이벤트를 즉시 전송한다.
- `getStatus()`: 큐·전송·유휴 상태를 확인한다.
- `getReconnectState()`: 5분 복귀 기준의 세션 복귀 상태를 확인한다.

## 이벤트 규칙

`eventName`은 다음 형식을 사용한다.

```text
^[a-z][a-z0-9_]{1,63}$
```

표준 이벤트가 아닌 이름도 원본 로그에는 저장된다. 다만 서버의 게임 전용 대시보드
집계에는 포함되지 않으므로, 다른 프로젝트는 `Raw_Batches`의 `events_json`을 기준으로
별도 차트를 만들면 된다.

## 공유·업데이트

이 폴더만 복사하거나 압축해 다른 사람에게 전달하면 된다. 공유받은 사용자는
`README.md`를 먼저 읽고 자신의 Sheets ID·Apps Script URL·스토리지 네임스페이스를
설정한다. Apps Script를 바꾼 경우에는 기존 웹 앱 배포를 새 버전으로 업데이트한다.

이 패키지는 현재 게임의 패치 노트와 별도 관리하며, 게임 버전이나 게임 UI를 변경하지 않는다.
