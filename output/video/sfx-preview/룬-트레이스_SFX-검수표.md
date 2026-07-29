# 룬 트레이스 SFX 검수표

영상에는 아직 합성하지 않은 개별 효과음 시안이다.

이번 수정의 핵심은 룬 그리기를 이어지는 소리에서 **새로운 칸이 확정될 때마다 한 번씩 발생하는 짧은 타격음**으로 바꾼 것이다. 실제 자산은 단일 칸 소리이며, 6칸 검수본은 서로 다른 시점에 새 칸이 확정되는 상황을 가정해 여섯 번 호출했다. 음높이는 경로 진행을 느낄 수 있을 정도로만 조금씩 올라가며, 고주파와 바람 소리는 억제했다.

## 룬 그리기 결정

**E2 마력 실형을 칸 입력 기준음으로 선택했다.** 별가루 레이어를 초기 시안보다 약 -6dB 낮추고, 0.035초 지점의 매듭 어택을 약 28% 줄인 뒤 0.012초의 짧은 어택 구간을 추가해 딱딱거리는 소리를 완화했다.

**E4 균형형은 경로 완성음의 기반으로 사용했다.** 칸 입력음보다 공명과 잔광을 강화해 한 칸 입력과 전체 경로 확정을 구분한다.

챕터 클리어음은 기존 상승 구조를 유지하면서 마지막 확정 지점에 짧은 공간감과 마력 실 해결음을 추가했다. 별가루는 10% 수준으로 억제하고 전체 길이는 2.78초로 조정했다. 후반의 저음 4음 동시 공명은 앞 구간과 톤이 맞지 않아 제거하고, 음량을 낮춘 상태에서 `D4–F♯4–A4–D5`가 순서대로 울리는 상승형 공명으로 교체했다.

## 시안 파일

| 구분 | 단일 칸 원본 | 6칸 검수본 | 방향 |
|---|---|---|---|
| A | `01a_rune_cell_arcane_stone.wav` | `01a_demo_6_cells_arcane_stone.wav` | 돌판에 마법 문양을 새기는 단단한 타격 |
| B·이전 시안 | `01b_rune_cell_ember_glyph.wav` | `01b_demo_6_cells_ember_glyph.wav` | 따뜻한 인장 타격＋작은 석재 파편＋불씨·분진 |
| C·검토 | `01c_rune_cell_material_glyph.wav` | `01c_demo_6_cells_material_glyph.wav` | 석재 충격·표면 마찰·분진·파편 65% 이상＋낮은 마법 공명 |
| D·검토 | `01d_rune_cell_stylized_glyph.wav` | `01d_demo_6_cells_stylized_glyph.wav` | B의 게임다운 음정감 75%＋C의 재질감 25% |

## 추상 마법 질감 시안

실사 재질음을 제외하고 잔광, 마력 실, 공명, 별가루만으로 구성했다.

| 시안 | 단일 칸 원본 | 6칸 검수본 | 구성 |
|---|---|---|---|
| E1 잔광·공명 | `01e1_magic_glow_resonance_cell.wav` | `01e1_magic_glow_resonance_demo_6_cells.wav` | 잔광 45%＋공명 40%＋별가루 15% |
| E2 마력 실·선택 | `01_rune_cell_magic_thread.wav` | `01_demo_6_cells_magic_thread.wav` | 마력 실 50%＋공명 25%＋잔광 15%＋별가루 5% |
| E3 별가루 | `01e3_magic_stardust_cell.wav` | `01e3_magic_stardust_demo_6_cells.wav` | 별가루 40%＋잔광 35%＋공명 15%＋마력 실 10% |
| E4 균형·완성음 기반 | `01e4_magic_balanced_cell.wav` | `01e4_magic_balanced_demo_6_cells.wav` | 마력 실 30%＋잔광 28%＋공명 28%＋별가루 7% |

E2와 E4의 별가루 레이어는 이전 시안보다 진폭을 50% 낮췄다. 음향 수치로는 약 -6dB이며, 전체 타격음의 최대 음량은 유지한다.

확인할 부분:

- 한 칸마다 시작점이 분명하게 들리는가
- 빠르게 여섯 칸을 놓아도 소리가 뭉개지지 않는가
- 몬스터 처리음과 비슷한 즉각성은 있으나 처치음으로 오인되지 않는가
- 반복해도 고음 피로와 바람 빠지는 느낌이 없는가

## 연속 검수본 순서

| 시작 | 파일 | 사용 장면 |
|---:|---|---|
| 00:00.50 | `01_demo_6_cells_magic_thread.wav` | 룬 6칸 입력 |
| 00:03.66 | `02_rune_commit.wav` | 경로 확정·각인 |
| 00:05.12 | `03_monster_defeat.wav` | 일반 몬스터 처치 |
| 00:06.64 | `04_level_up.wav` | 레벨업 |
| 00:09.22 | `05_ability_select.wav` | 능력 선택 |
| 00:10.80 | `06_boss_warning.wav` | 보스 경보·등장 |
| 00:13.38 | `07_boss_hit.wav` | 보스 타격 |
| 00:15.06 | `08_chapter_clear.wav` | 챕터 클리어 |

## 참고 방향

- [Warcraft Rumble 공식 소개](https://news.blizzard.com/en-us/article/23802868/warcraft-rumbletm-revealed)
- [Kingdom Rush 5 공식 트레일러 페이지](https://www.ironhidegames.com/News/Details/339)
- [Guardian Tales 공식 페이지](https://guardiantales.kakaogames.com/)
- [Clash Royale 공식 페이지](https://supercell.com/en/games/clashroyale/)

공식 작품의 소리를 복제하지 않고, 판타지 캐주얼 광고에서 반복되는 짧고 즉각적인 피드백 구조만 참고했다.

## 아직 제외한 요소

- 배경음악
- 음성 안내
- 화면 장면과의 타이밍 합성
- 최종 광고용 음량 조정

통합 검수 후 승인된 효과음만 영상에 합성한다.
