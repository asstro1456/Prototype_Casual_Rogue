# 룬 트레이스 자동 플레이 로그 설정

## 현재 구성

- 대상 스프레드시트: [프로토타입 플레이 로그 수집](https://docs.google.com/spreadsheets/d/1cT2RzvHeshUi4AH6FRBEj8OukQe_oxl3z4xbOvQwdGM/edit)
- 공개 테스트 배포 대상: [룬 트레이스 GitHub Pages](https://asstro1456.github.io/Prototype_Casual_Rogue/rune-trace/index.html)
- 운영 Apps Script: `AKfycbyy8cKUCoayoV_d9_cehUwr-nXANfO5SuP83SGCZK7rzxx5ICMjIIR6rUqKIhVyTRQ9HQ`
- 압축 원본 탭: `Raw_Batches`
- 기존 이벤트 탭: `Events` — 과거 데이터 보존용, 새 로그는 추가하지 않음
- 분석 탭: `Participants`, `Sessions`, `Floor_Attempts`, `Dashboard_Data`, `Dashboard`
- 게임 클라이언트: IndexedDB 우선 저장 후 최대 50개씩 배치 전송
- 자동 전송 조건: 대기 20개, 30초 경과, 주요 종료 이벤트
- 무입력 중단: 마지막 클릭·터치·키 입력 후 5분이 지나면 네트워크 전송을 멈추고 로컬 큐에만 보관
- 전송 재개: 다음 사용자 입력 또는 다음 실행에서 재시도
- 이탈 유예: 탭 종료 후 5분 안에 재접속하면 같은 `session_id`와 누적 활성 시간으로 이어서 기록
- 이탈 확정: 5분을 넘겨 재접속하면 이전 세션을 중간 이탈로 집계하고 새 세션을 시작
- 정식 테스트 환경: HTTPS

## 배포 설정

### Apps Script 웹앱

운영 `/exec` 주소가 `rune-trace/analytics-config.js`의 `production` 엔드포인트에 연결되어 있다. Apps Script `Code.gs`를 수정하면 기존 배포를 새 버전으로 업데이트해야 한다.

현재 운영 설정:

```text
activeEnvironment: production
testGroup: external_prototype_v0.2.3
```

### 게임 배포

`file://` 실행에서는 이벤트를 IndexedDB에 저장하지만 Google Apps Script로 전송하지 않는다. GitHub Pages 공개 주소에 현재 변경을 배포한 뒤 Chrome과 Edge에서 검증한다.

## 동의와 저장

- 최초 실행 시 익명 플레이 기록 전송 동의를 묻는다.
- 동의 전이나 거부 상태에서는 이벤트를 저장·전송하지 않는다.
- 익명 `participant_id`와 동의 상태는 브라우저 `localStorage`에 보관한다.
- 마지막 종료 세션 ID·종료 시각·누적 활성 시간은 재접속 판정을 위해 `localStorage`에 보관한다.
- 미전송 이벤트는 `rune-trace-play-log` IndexedDB의 `events` 저장소에 보관한다.
- 큐는 최대 5,000개이며 초과 시 가장 오래된 이벤트부터 삭제한다.

## 개발용 상태 확인

브라우저 개발자 도구 콘솔에서 다음 명령으로 전송 상태를 확인할 수 있다.

```js
await RuneTracePlayLog.getStatus()
```

확인 값:

- 동의 상태
- 참가자·세션 ID
- 엔드포인트 설정 여부
- 로컬 대기 이벤트 수
- 무입력 중단 여부
- 성공·실패 전송 횟수
- 마지막 성공 전송 시각
- 다음 재시도 시각
- 5분 내 동일 세션 복귀 또는 5분 초과 이탈 복귀 상태

수동 전송 재시도:

```js
await RuneTracePlayLog.flush()
```

## 1차 검증 절차

1. HTTPS 테스트 주소에서 사이트 데이터의 기존 동의값을 지우고 게임을 연다.
2. 익명 로그 전송에 동의한다.
3. 룬을 유효·무효 형태로 각각 한 번 이상 입력한다.
4. 플로어 성공 또는 실패까지 진행한다.
5. 최대 30초 뒤 `Raw_Batches`에 압축 행이 추가되고 `Floor_Attempts`와 `Dashboard`가 갱신되는지 확인한다.
6. 같은 브라우저를 새로 열어 `participant_id`가 유지되는지 확인한다.
7. 네트워크를 끈 상태에서 플레이하고 `queuedEvents`가 증가하는지 확인한다.
8. 네트워크를 복구한 뒤 대기 이벤트가 전송되는지 확인한다.
9. 페이지를 5분 이상 조작하지 않아 `idle: true`가 되고 전송이 멈추는지 확인한다.
10. 다시 클릭한 뒤 대기 이벤트가 전송되는지 확인한다.
11. 탭을 닫고 5분 안에 다시 열어 같은 `session_id`가 유지되고 `Sessions`의 종료 상태가 해제되는지 확인한다.
12. 탭을 닫고 5분을 넘겨 다시 열어 새 `session_id`가 생성되고 플레이 데이터 초기화 선택창이 표시되는지 확인한다.
13. 종료 후 5분이 지난 세션이 `Dashboard`의 중간 이탈과 평균 세션 플레이 시간에 반영되는지 확인한다.

## 현재 이벤트 연결 범위

현재 게임 흐름에 존재하는 다음 이벤트를 기록한다.

- 세션·앱: `session_start`, `session_resume`, `session_end`, `app_background`, `app_resume`
- 튜토리얼: `tutorial_start`, `tutorial_step`, `tutorial_complete`, `tutorial_quit`
- 진행: `stage_start`, `floor_start`, `floor_end`, `stage_clear`, `stage_fail`, `retry`, `stage_quit`
- 룬: `rune_selected`, `path_result`

현재 구현된 보스 정보·전투·종료, 진행 복원과 명시적 초기화는 `boss_start`, `boss_info_view`, `boss_end`, `state_restore`, `data_reset`으로 기록한다. 아직 기능이 없는 `tool_*`, `ad_*`는 거짓 이벤트를 만들지 않는다.

## 압축 저장과 대시보드

- 클라이언트 이벤트 구조와 IndexedDB 큐는 그대로 유지한다.
- Apps Script는 같은 세션·스테이지·플로어의 이벤트를 최대 셀 크기 안에서 `event_batch_v1` JSON으로 묶어 `Raw_Batches` 한 행에 저장한다.
- `Session_Index`는 세션별 이벤트 ID를 여러 압축 청크로 보관해 매 요청마다 과거 `Events` 전체를 읽지 않고 중복을 제거한다.
- `Participants`는 참가자별 세션 수·튜토리얼 완료·최고 도달 구간을 누적한다.
- `Sessions`는 세션별 시작·종료·이벤트 수·최고 도달 구간·누적 활성 시간·중간 이탈 여부를 누적한다. 5분 내 복귀한 세션은 종료 상태를 해제한다.
- `Floor_Attempts`는 플로어 시도별 성공·실패·소요시간·경로 결과를 누적한다.
- `Dashboard_Data`는 버전·테스트 그룹·스테이지·플로어·보스 변형별 결과를 증분 집계한다.
- `Dashboard`는 참가자 수, 세션 수, 튜토리얼 완료율, 플로어 클리어율, 평균 시간, 재시도율, 확정 중간 이탈 수·비율, 평균 세션 플레이 시간과 플로어별 누적 결과를 표시한다.
- 중간 이탈은 `Dashboard_Data`의 플로어 실패로 섞지 않고 `Sessions`를 원본으로 별도 계산한다. 실행 중 탭 종료 후 5분이 지나야 이탈과 평균 세션 시간의 확정 집계에 포함된다.
- 기존 `Events`는 삭제하거나 수정하지 않는다. Apps Script 편집기에서 `migrateLegacyEvents()`를 반복 실행하면 한 번에 최대 200행씩 새 압축·집계 구조로 옮길 수 있다.

### 배포 후 사용자 작업

1. Apps Script 프로젝트의 `Code.gs`를 새 코드로 교체한다.
2. 기존 웹 앱 배포를 새 버전으로 업데이트한다.
3. GitHub Pages에 `v0.2.3` 게임 파일을 배포한다.
4. 실제 HTTPS 주소에서 로그 1회 전송 후 새 시트 7개가 자동 생성되는지 확인한다.
5. 과거 `Events`를 대시보드에 포함하려면 Apps Script 편집기에서 `migrateLegacyEvents()`를 완료될 때까지 반복 실행한다.

## 개인정보와 운영 주의

- 이름, 이메일, 전화번호, 주소, 위치, 자유 의견을 수집하지 않는다.
- Apps Script URL은 인증 비밀키가 아니므로 서버가 허용 이벤트와 크기를 항상 검증한다.
- Sheet 편집 권한은 소유자와 필요한 개발 인원으로 제한한다.
- Apps Script 실행 기록에서 오류와 동시 요청 실패를 확인한다.

## 교차 출처 응답 확인

Apps Script 배포 설정과 브라우저 정책에 따라 게임에서 응답 JSON을 읽지 못하는 경우가 있을 수 있다. 이때 시트에는 행이 추가되지만 클라이언트가 성공을 확정하지 못해 로컬 큐가 유지된다. 서버의 `event_id` 중복 제거로 중복 행은 막지만, 다음 조치를 실제 HTTPS 주소에서 확인해야 한다.

1. 브라우저 개발자 도구에서 POST 요청과 응답 JSON을 확인한다.
2. `RuneTracePlayLog.getStatus()`에서 `queuedEvents`가 전송 후 감소하는지 확인한다.
3. 시트에는 저장되지만 큐가 감소하지 않는다면 Apps Script만으로 성공 응답을 읽을 수 없는 배포 상태다.
4. 해당 상태가 반복되면 정적 게임과 Apps Script 사이에 CORS 응답을 제어할 수 있는 별도 중계 서버를 둔다.
