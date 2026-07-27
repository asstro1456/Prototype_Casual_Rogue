# 룬 트레이스 플레이 로그 이벤트 명세

- 스키마 버전: `1`
- 게임 버전: 이벤트 발생 시 현재 `APP_VERSION`
- 시간 형식: UTC ISO 8601
- 원본 저장 위치: Google Sheet `Events`

## 공통 필드

| 필드 | 형식 | 기준 |
|---|---|---|
| `event_id` | string | 생성 후 재전송에서도 유지되는 고유 ID |
| `event_name` | string | Apps Script 허용 목록의 고정 이벤트명 |
| `client_time_utc` | string | 브라우저 발생 시각 |
| `participant_id` | string | 같은 브라우저에서 유지되는 익명 ID |
| `session_id` | string | 페이지 실행마다 생성되는 세션 ID |
| `game_version` | string | 룬 트레이스 버전 |
| `schema_version` | integer | 현재 `1` |
| `platform` | string | `web_windows`, `web_android`, `web_macos`, `web_linux`, `web_other` |
| `locale` | string | 브라우저 로케일 |
| `test_group` | string | 설정 파일의 테스트 그룹 |
| `stage_id` | string/null | `chapter_01_stage_1` 형식 |
| `floor_index` | integer/null | 챕터 내 1~9 플로어 |
| `payload` | object | 이벤트별 추가 값 |

## 현재 연결된 이벤트

### 세션·앱

| 이벤트 | 주요 payload |
|---|---|
| `session_start` | `returning_participant`, `entry_point` |
| `session_end` | `active_time_ms`, `reason` |
| `app_background` | `active_time_ms` |
| `app_resume` | `interruption_duration_ms` |
| `stage_quit` | `reason`, `completed_runes` |

### 튜토리얼

| 이벤트 | 주요 payload |
|---|---|
| `tutorial_start` | `tutorial_version` |
| `tutorial_step` | `step_id`, `status`, `duration_ms` |
| `tutorial_complete` | `tutorial_version`, `duration_ms` |
| `tutorial_quit` | `last_step_id`, `reason`, `duration_ms` |

현재 시작 안내 한 장을 `intro_rules` 단계로 기록한다.

### 진행

| 이벤트 | 주요 payload |
|---|---|
| `stage_start` | `chapter_id`, `stage_index`, `seed`, `retry` |
| `floor_start` | 보드 크기, 적 수, 룬 ID·종류, 오염·점유 칸, `retry` |
| `floor_end` | 성공, 실패 코드, 소요시간, 직접·능력 처치, 생존 적, 레벨·EXP |
| `stage_clear` | 스테이지 소요시간, 최종 레벨·EXP |
| `stage_fail` | 실패 코드, 남은 룬, 생존 적, 오염 칸 |
| `retry` | 재시도 범위, 직전 실패 코드, 재시작 위치 |

### 룬 입력

| 이벤트 | 주요 payload |
|---|---|
| `rune_selected` | `rune_id`, `rune_type`, `selection_method: auto_recognized` |
| `path_result` | 룬 ID·종류, 경로 칸, 직접·능력 처치, 교차 수, 유효 여부, 실패 코드, 입력 시간 |

`path_result.invalid_reason`은 현재 다음 코드를 사용한다.

- `invalid_path`
- `blocked_by_trace`
- `blocked_by_corruption`

## 아직 연결하지 않은 이벤트

현재 게임에 해당 기능이 없으므로 다음 이벤트는 발생시키지 않는다.

- `state_restore`
- `boss_start`, `boss_info_view`, `boss_end`
- `tool_offer`, `tool_acquire_free`, `tool_purchase`, `tool_use`, `clear_after_tool`
- `ad_offer`, `ad_start`, `ad_complete`, `ad_fail`, `ad_exit`

기능 구현 시 표시 이름 대신 고정 ID를 payload에 기록하고 `RuneTracePlayLog.log()`로 연결한다.
