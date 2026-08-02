# 룬 트레이스 플레이 로그 이벤트 명세

- 스키마 버전: `1`
- 게임 버전: 이벤트 발생 시 현재 `APP_VERSION`
- 시간 형식: UTC ISO 8601
- 압축 원본 저장 위치: Google Sheet `Raw_Batches`
- 과거 원본 위치: Google Sheet `Events`

## 공통 필드

| 필드 | 형식 | 기준 |
|---|---|---|
| `event_id` | string | 생성 후 재전송에서도 유지되는 고유 ID |
| `event_name` | string | 소문자 영문으로 시작하는 `[a-z][a-z0-9_]{1,63}` 형식. 표준 이벤트는 대시보드에서 집계하고 사용자 정의 이벤트는 원본 로그로 보관 |
| `client_time_utc` | string | 브라우저 발생 시각 |
| `participant_id` | string | 같은 브라우저에서 유지되는 익명 ID |
| `session_id` | string | 첫 접속에 생성되며 탭 종료 후 5분 안에 복귀하면 유지되는 세션 ID |
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
| `session_start` | `returning_participant`, `return_after_exit`, `interruption_duration_ms`, `entry_point` |
| `session_resume` | `interruption_duration_ms`, `previous_active_time_ms`, `reconnect_grace_ms` |
| `session_end` | `active_time_ms`, `running`, `reason`, `reconnect_grace_ms` |
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

## 기능별 연결 상태

현재 게임은 진행 복원과 보스 흐름에서 다음 이벤트를 발생시킨다.

- `state_restore`
- `data_reset`
- `boss_start`, `boss_info_view`, `boss_hit`, `boss_mechanic`, `boss_end`

`session_end`는 탭 종료 시 즉시 기록을 시도하지만 5분 동안 잠정 종료로 본다. 같은 브라우저가 5분 안에 돌아오면 `session_resume`으로 같은 세션을 다시 열고, 5분을 넘기면 이전 세션의 실행 중 `page_hide`를 중간 이탈로 확정한다.

현재 게임에 해당 기능이 없으므로 다음 이벤트는 발생시키지 않는다.

- `tool_offer`, `tool_acquire_free`, `tool_purchase`, `tool_use`, `clear_after_tool`
- `ad_offer`, `ad_start`, `ad_complete`, `ad_fail`, `ad_exit`

기능 구현 시 표시 이름 대신 고정 ID를 payload에 기록하고 `RuneTracePlayLog.log()`로 연결한다.

## 서버 저장 형식

이벤트 스키마 버전은 `1`을 유지하되 서버 저장 형식은 `event_batch_v1`을 사용한다.

- 같은 참가자·세션·버전·스테이지·플로어 문맥의 이벤트를 한 행에 묶는다.
- `events_json`에는 각 이벤트의 `event_id`, `event_name`, `client_time_utc`, `payload`를 보존한다.
- 셀 크기 상한에 가까워지면 같은 문맥이어도 여러 행으로 나눈다.
- 클라이언트에는 묶음 안에서 저장된 개별 `event_id`를 승인 응답으로 돌려준다.
- `Session_Index`의 세션별 ID 청크로 재전송 중복을 제거한다.
- 차트와 대시보드는 압축 JSON을 직접 계산하지 않고 `Participants`, `Sessions`, `Floor_Attempts`, `Dashboard_Data`를 사용한다.
