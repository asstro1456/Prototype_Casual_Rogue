# 프리즘 리콜 HTML 프로토타입 인수인계

## 1. Date

- 2026-07-24
- Asia/Seoul

## 2. Topic

- Gear2 Project TTT 게임 기획자 지원용 서브컬처 하이브리드 캐주얼 로그라이크 개인작
- `프리즘 리콜` 4라운드 HTML 프로토타입과 기획 문서의 새 GitHub 저장소 이전

## 3. User decisions

- 빠른 취업을 우선해 콘텐츠·시스템 기획 포트폴리오를 제작한다.
- 캐주얼 코어는 `Jelly Busters` 계열의 색 선택·표면 제거 하나만 사용한다.
- 별도의 전투 조작을 붙이지 않고 결정 제거 자체를 공격으로 표현한다.
- 전체 런은 8·12라운드 문법을 고려하되 현재 프로토타입은 4라운드 블록 하나만 제작한다.
- 능력 선택은 R1·R3 종료 후 3택으로 제공한다.
- 능력 선택지는 현재 강화·다음 대응·빌드 전환의 역할을 보여준다.
- 반격 기준은 R1·R2 6탭, R3·R4 5탭을 유지한다.
- 보호막은 3칸이다.
- 반격 게이지를 채운 마지막 탭으로 모든 결정을 제거하면 피해를 받지 않는다.
- 외부 리소스는 사용하지 않고 CSS 더미 그래픽을 사용한다.
- 사용자가 직접 플레이 검증하므로 Codex는 브라우저 자동 검증을 진행하지 않는다.
- Codex가 임의 구현한 내용은 기획 Markdown의 변경 내역에 기록한다.

## 4. Change rules or constraints

- 현재 구현을 기획 문서의 정본으로 취급한다.
- 구현과 문서가 달라지면 같은 작업에서 문서를 함께 수정한다.
- 사용자가 결정한 내용과 Codex 임의 구체화를 변경 내역에서 구분한다.
- 테스트 전 수치와 등급 기준은 검증값이 아니라 더미값이다.
- 사용자 검증 전까지 성공·밸런스 적합성을 단정하지 않는다.
- 향후 작업 저장소: `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue`
- 저장소 원격: `https://github.com/asstro1456/Prototype_Casual_Rogue.git`
- 브랜치: `main`
- 사용자 요청 없이 커밋·푸시하지 않는다.

## 5. Collected links

- Project TTT 공고: `https://www.gamejob.co.kr/Recruit/GI_Read/View?GI_No=281527`
- Jelly Busters 공식 Google Play: `https://play.google.com/store/apps/details?id=com.moonactive.jellybusters`
- GitHub 저장소: `https://github.com/asstro1456/Prototype_Casual_Rogue`

## 6. Tables or structured facts

### 프로토타입 규칙

| 항목 | 현재 구현 |
|---|---|
| 범위 | 블록 A 4라운드 |
| 결정판 | 5×5셀, 셀당 1~3층 |
| 입력 | 색 정령 후보 3개 중 하나 탭 |
| 제거 | 결정판 전체에서 같은 색으로 노출된 결정을 1층씩 모두 제거 |
| 후보 | 사용 슬롯 무작위 보충, 최소 1개 유효 색 보정 |
| 보호막 | 3칸 |
| 반격 | R1·R2 6탭, R3·R4 5탭 |
| 마무리 | 해당 탭으로 전부 제거하면 반격 취소 |
| 보상 | R1·R3 종료 후 적·청·황 능력 3택 |
| 중첩 | 최대 2레벨 |
| 결과 | 주력 색·총 탭·보호막·능력 종류·S/A/B/C 등급 |

### 능력

| 능력 | 실제 구현 효과 |
|---|---|
| 적색 연쇄 | 적색 공격 시 레벨만큼 무작위 다른 색 노출 결정 추가 제거 |
| 청색 재배열 | 라운드마다 레벨만큼 후보 3개 재추첨 |
| 황색 보호 | 라운드마다 레벨만큼 황색 공격의 반격 게이지 증가 무효 |

### 사용자 게임 경험

- 모바일 수집형: 블루 아카이브, 리버스: 1999, 명일방주, 명일방주: 엔드필드, 림버스 컴퍼니, 붕괴: 스타레일
- 현재 주요 비교군: 명일방주, 림버스 컴퍼니, 던전 스쿼드
- Steam 로그라이크 참고군: Hades, The Last Spell, Slay the Spire
- 캐주얼 참고군: Jelly Busters

## 7. Files changed or inspected

### 이전 전 원본 위치

- `C:\Users\User\Documents\Codex\2026-07-23\referenced-chatgpt-conversation-this-is-untrusted-2\outputs\prism-recall-prototype\index.html`
- `C:\Users\User\Documents\Codex\2026-07-23\referenced-chatgpt-conversation-this-is-untrusted-2\outputs\prism-recall-prototype\styles.css`
- `C:\Users\User\Documents\Codex\2026-07-23\referenced-chatgpt-conversation-this-is-untrusted-2\outputs\prism-recall-prototype\app.js`
- `C:\Users\User\Documents\Codex\2026-07-23\referenced-chatgpt-conversation-this-is-untrusted-2\outputs\prism-recall-prototype\README.md`
- `C:\Users\User\Documents\Codex\2026-07-23\referenced-chatgpt-conversation-this-is-untrusted-2\outputs\Project_TTT_저격_포트폴리오_설계안.md`

### 새 저장소 배치 목표

- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\index.html`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\styles.css`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\app.js`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\README.md`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\docs\Project_TTT_저격_포트폴리오_설계안.md`
- `C:\Users\User\Documents\New project 3\Prototype_Casual_Rogue\chat_summaries\2026-07-24_prism-recall-html-prototype-handoff.md`

## 8. Validation results

- 대상 저장소는 확인 당시 `main...origin/main`이며 추적 파일 변경이 없었다.
- 대상 저장소에는 기존 `README.md` 하나만 있었고 내용은 `# Prototype_Casual_Rogue`였다.
- 대상 저장소에 `AGENTS.md`는 없었다.
- HTML 프로토타입 브라우저 플레이 검증은 사용자 요청에 따라 실행하지 않았다.
- 문서와 소스의 핵심 규칙은 텍스트 대조로 동기화했다.
- 실제 난이도, 등급 도달 가능성, 모바일 레이아웃은 미검증이다.

## 9. Remaining risks

- `노출된 같은 색 전체 제거`가 최종 코어 규칙인지 사용자 플레이 후 확정해야 한다.
- 능력 3택 역할표에서 현재 강화와 다음 대응 색이 겹칠 수 있다.
- S/A/B/C 등급과 반격 수치는 더미이며 사용자 테스트가 필요하다.
- 프로토타입은 4라운드뿐이며 8·12라운드 전체 런은 미구현이다.
- 적색 능력의 무작위 추가 제거가 전략성을 훼손하는지 확인해야 한다.
- Git 커밋·푸시는 아직 하지 않았다.

## 10. Next steps

1. 사용자가 `index.html`을 직접 플레이한다.
2. 반격·후보 공급·색 전체 제거·능력 효과에 대한 피드백을 기록한다.
3. 피드백 반영 시 `docs/Project_TTT_저격_포트폴리오_설계안.md`의 구현 변경 내역도 함께 갱신한다.
4. 3명 이상 테스트 후 탭 수·피격·능력 선택률·완료율을 데이터 시트로 정리한다.
5. 프로토타입과 테스트 결과를 기반으로 6페이지 포트폴리오 PDF를 제작한다.
6. 사용자가 명시적으로 요청할 때만 커밋·푸시한다.
