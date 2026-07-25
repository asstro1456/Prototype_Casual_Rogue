# 룬 트레이스 프로토타입 인수인계

## 1. 날짜

- 2026-07-25

## 2. 주제 및 개발명

- 기존 개발명 `프리즘 리콜`의 전사·궁수 전투 및 실시간 디펜스를 폐기하고, 개발명을 `룬 트레이스`로 변경
- 룬 경로 그리기 기반 캐주얼 로그라이크 프로토타입으로 전환
- 이후 채팅을 기획용과 개발용으로 분리하기 위한 현재 상태 보존

## 3. 사용자 결정사항

- 게임은 탑을 올라가는 캐주얼 로그라이크 형태다.
- 한 층에 무작위 룬 4개가 나오며, 모두 그리면 적 생존 여부와 무관하게 클리어한다.
- 룬은 회전·좌우 반전해서 그려도 인정한다.
- 룬을 별도로 선택하지 않는다. 왼쪽 세로 목록에서 형태만 확인하고, 그린 경로를 남은 룬과 자동 대조한다.
- 룬 경로가 지나간 적은 처치된다.
- 생존한 적은 이동하고 빈 칸을 오염시켜 다음 룬 배치 공간을 압박한다.
- 적 1체 처치 시 EXP 1을 얻는다.
- EXP 3마다 레벨이 오르고 `능력 1`, `능력 2`, `능력 3` 중 하나를 고른다. 능력 효과는 아직 정하지 않았다.
- `한 수 되돌리기`는 마지막 룬 완성 전 상태로 적 위치, 오염, EXP, 레벨, 능력까지 복원한다.
- `층 초기화`는 현재 층의 최초 배치로 복원한다.
- 이전 프로토타입은 삭제하지 않고 허브 하단의 작은 아카이브 목록으로 보존한다.
- 현재 개발판만 허브 상단에 크게 표시한다.
- 비주얼 방향은 일반적인 캐주얼 3D가 아니라 푸른 판타지 배경의 2D/2.5D 카툰풍이며, 완전한 서브컬처 게임보다는 캐주얼에 서브컬처 감각을 섞는 방향이다.

## 4. 변경 기준 및 제약

- 현재 게임 버전은 `v0.0.6 · RUNE TRACE`다.
- 현행 개발명은 `룬 트레이스`이며, `프리즘 리콜` 명칭은 이전 아카이브에만 남긴다.
- 버전은 게임 헤더 왼쪽, 최초 도움말 및 모든 모달 오른쪽 위, 허브 카드에 동일하게 표시한다.
- 버전 변경 시 `rune-trace/index.html`의 CSS·JavaScript 캐시 쿼리도 함께 변경한다.
- 모든 모달에는 닫기 또는 확인 동작이 있어야 한다.
- 사용자가 실제 오류 및 조작 검증을 담당하므로 개발 측에서는 최소 정적 구문 검사만 수행한다.
- 커밋이 필요할 때마다 짧은 영문 커밋 메시지를 제안한다.
- 사용자가 명시하지 않으면 커밋·푸시하지 않는다.
- 기존 아카이브와 무관한 파일은 수정하지 않는다.
- 개발 채팅은 확정된 기획 구현과 버전 관리에 사용하고, 새 기획 채팅은 시스템·밸런스·능력 논의에 사용한다.

## 5. 수집 링크

- 저장소: https://github.com/asstro1456/Prototype_Casual_Rogue
- 공개 허브: https://asstro1456.github.io/Prototype_Casual_Rogue/
- 공개 룬 프로토타입: https://asstro1456.github.io/Prototype_Casual_Rogue/rune-trace/index.html

## 6. 표·구조화 사실

| 구분 | 버전 | 위치 | 상태 |
|---|---:|---|---|
| 현재 룬 트레이스 | v0.0.6 | `rune-trace/` | 로컬 구현 완료, 아직 커밋·푸시 여부 확인 필요 |
| 전체 제거 퍼즐 | v0.1.0 | `archive/clear-all-v0.1.0/` | Git 커밋 `4f1e3f3`의 파일과 해시 일치 |
| 실시간 디펜스 | v0.4.0 | `archive/realtime-defense-v0.4.0/` | 플레이 가능한 보관판 |
| 프로토타입 허브 | 별도 | 프로젝트 루트 | 현재판 크게, 아카이브 작게 하단 배치 |

현재 룬 템플릿:

| ID | 표시명 | 형태 | 칸 수 |
|---|---|---|---:|
| `line` | 일섬 | 일자 | 4 |
| `corner` | 굽은 뿔 | ㄴ자 | 4 |
| `diagonal` | 별의 사선 | 대각선 | 4 |
| `check` | 서약 | 체크 | 4 |
| `zig` | 여우걸음 | 지그재그 | 4 |
| `crown` | 쌍봉 | 두 봉우리 | 5 |

레벨 규칙:

- 누적 EXP 임계치는 레벨마다 3씩 증가한다.
- HUD에서는 현재 레벨 구간의 `EXP n / 3`으로 표시한다.
- 한 번의 룬으로 여러 레벨을 넘으면 능력 선택 모달을 순서대로 표시한 뒤 클리어·실패 결과 모달을 표시한다.
- 같은 층을 초기화하거나 되돌리면 해당 시점 이후의 EXP와 능력 선택도 복원된다.

## 7. 확인·변경 파일

프로젝트 루트:

- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\index.html`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\hub.css`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\README.md`

현재 게임:

- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\rune-trace\index.html`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\rune-trace\styles.css`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\rune-trace\app.js`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\rune-trace\README.md`

보관판:

- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\archive\clear-all-v0.1.0\`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\archive\realtime-defense-v0.4.0\`

Git:

- 저장소 루트: `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue`
- 브랜치: `main`
- 마지막 확인 원격 커밋: `19fb476 Improve rune preview readability and bump version to v0.0.4`
- `v0.0.5` 레벨업·되돌리기·초기화와 `v0.0.6` 개발명 변경은 마지막 정적 검사 시 작업 트리에 미커밋 상태였다.

## 8. 검증 결과

- `C:\Program Files\nodejs\node.exe --check .\rune-trace\app.js` 통과
- `v0.0.6` 표기가 허브, 게임 HTML, JavaScript 상수, README에 동기화된 것을 확인
- 공개 GitHub Pages가 `v0.0.4` 시점의 최신 `rune-trace/app.js`와 `styles.css`를 정상 제공하는 것을 확인
- 룬 이미지가 갱신되지 않아 보였던 문제는 브라우저 캐시 문제로 사용자가 확인
- 실제 플레이, 모바일 조작감, 레벨업 모달 연속 처리, 되돌리기 상태 복원은 사용자 요청에 따라 브라우저 자동 검증하지 않음

## 9. 남은 리스크

- `v0.0.5` 변경은 아직 실제 플레이 검증되지 않았다.
- 더미 능력은 획득 기록만 있고 전투 효과가 없다.
- EXP 3 고정 임계치와 적 수는 임시 수치다.
- 자동 룬 인식과 대각선 우선 스냅이 ㄴ자 입력과 충돌하는지 추가 체감 확인이 필요하다.
- 생존 적의 오염량이 최대 3칸이라 장기 층 진행에서 난이도가 급격히 오를 수 있다.
- `한 수 되돌리기`와 `층 초기화`가 사용자의 의도보다 난이도를 과도하게 낮출 가능성이 있다.
- 새 기획 채팅에서 능력 설계, 성장 구조, 층 길이, 실패 조건을 확정해야 한다.

## 10. 다음 작업

1. `룬 트레이스 개발` 채팅에서 `v0.0.6` 작업 트리와 Git 상태를 먼저 확인한다.
2. 필요하면 커밋 메시지 `Rename current prototype to Rune Trace and bump version to v0.0.6`로 커밋·푸시한다.
3. 새 기획 채팅에서 이 문서를 읽고 더미 능력의 실제 역할을 설계한다.
4. 능력 설계 시 룬 모양 변화, 적 처치 보상, 오염 제어, 되돌리기 비용을 우선 검토한다.
5. 확정된 기획만 이 문서 또는 별도 `docs/current-game-design.md`에 반영한 뒤 개발 채팅으로 전달한다.
