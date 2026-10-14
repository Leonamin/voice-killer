---
version: alpha
name: Voice Killer
description: 특정 화자 추출·제거·음성 변환·실시간 제거 웹 데모의 다크 네온 디자인 시스템
colors:
  bg: "#0B0D10"
  surface: "#14171C"
  surface-subtle: "#1B1F26"
  surface-raised: "#222731"
  border: "#2A303A"
  control-border: "#4A5263"
  text: "#F2F4F7"
  text-muted: "#9AA3B2"
  on-accent: "#0B0D10"
  primary: "#FF7A1A"
  primary-hover: "#FF9445"
  primary-soft: "#3A2112"
  live: "#39FF88"
  live-hover: "#7BFFAE"
  live-soft: "#11331F"
  danger: "#FF5C7A"
  danger-soft: "#3D1620"
  warning: "#FFC53D"
  warning-soft: "#3A2E10"
typography:
  display:
    fontFamily: Pretendard Variable
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: -0.02em
  title:
    fontFamily: Pretendard Variable
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: Pretendard Variable
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Pretendard Variable
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
  metric:
    fontFamily: Pretendard Variable
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: '"tnum"'
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  control: 40px
  rail: 248px
components:
  app:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: "{spacing.lg}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-accent}"
  button-live:
    backgroundColor: "{colors.live}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: "{spacing.lg}"
  button-live-hover:
    backgroundColor: "{colors.live-hover}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: "{spacing.lg}"
  nav-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: "{spacing.md}"
  nav-item-current:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
  badge-done:
    backgroundColor: "{colors.live-soft}"
    textColor: "{colors.live}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  badge-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  badge-todo:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  badge-synthetic:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  alert-error:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  region-process:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  region-reference:
    backgroundColor: "{colors.live-soft}"
    textColor: "{colors.live}"
  input:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "{spacing.control}"
    padding: "{spacing.md}"
  input-outline:
    backgroundColor: "{colors.control-border}"
  divider:
    backgroundColor: "{colors.border}"
  metric-tile:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    typography: "{typography.metric}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
---

# Voice Killer Design System

## Overview

수업 시연용 오디오 실험 도구다. 어두운 작업 화면 위에 네온 주황과 네온 초록 두 색만 강하게 쓴다. 색은 장식이 아니라 의미를 전달한다. 주황은 "지우고 바꾸는 처리"와 처리 구간, 초록은 "참조·실시간·완료"를 뜻한다.

사용자가 정한 결정: Pretendard 글꼴, 네온 주황·초록 메인 컬러, 단계별 CTA와 Star형 IA, Goodcase UI 컴포넌트 사용. 테마는 다크 단일이다. 네온은 밝은 배경에서 대비와 정체성을 잃기 때문이다.

## Colors

`primary`는 네온 주황, `live`는 네온 초록이다.

- `{colors.primary}`: 기본 CTA(`{components.button-primary}`), 현재 단계, 처리 구간 파형 영역.
- `{colors.live}`: 참조 구간 파형 영역, 실시간 시작(`{components.button-live}`), 완료 상태(`{components.badge-done}`), 포커스 링.
- `{colors.danger}`: 오류만. 주황과 혼동되지 않도록 분홍빛 빨강을 쓴다.
- `{colors.warning}`: 합성 음성 표시(`{components.badge-synthetic}`)와 주의 안내.
- 네온 색을 글자색으로 쓸 때는 `{colors.bg}`·`{colors.surface}` 위에서만 쓴다. 네온 배경 위 글자는 항상 `{colors.on-accent}`다.
- 은은한 발광(glow)은 기본 CTA와 실시간 실행 중 표시에만 쓴다. 발광 색은 각 강조색의 약 35% 불투명도다.

## Typography

Pretendard Variable을 npm `pretendard` 패키지로 번들한다. 시연장의 네트워크에 의존하지 않기 위해서다. 숫자 지표(지연, 시간, 유사도)는 `{typography.metric}`의 tabular figures로 흔들리지 않게 한다. 화면 제목은 `{typography.display}`, 패널 제목은 `{typography.title}`, 컨트롤 레이블과 배지는 `{typography.label}`이다.

## Layout

### 정보 구조: Star형

중심(허브)은 **작업 공간**이다. 공통 자원 두 가지와 작업 네 가지가 허브를 둘러싼다.

```text
                 ┌─ 소스: 처리할 오디오와 처리 구간
   공통 자원 ────┤
                 └─ 참조: 대상 목소리 구간 (같은 파일 또는 다른 파일)
작업 공간(허브)
                 ┌─ 추출   (필요: 소스, 참조)
   작업 ─────────┼─ 제거   (필요: 소스, 참조)
                 ├─ 변환   (필요: 소스=바꿀 목소리, 참조=닮을 목소리)
                 └─ 실시간 (필요: 참조 또는 마이크 등록)
```

- 한 번에 패널 하나만 보인다. 세로로 모든 기능을 나열하지 않는다.
- 모든 노드는 내비게이션에서 언제든 이동할 수 있다. 순서를 강제하지 않는다.
- 각 노드는 상태를 가진다: `필요`(`{components.badge-todo}`), `진행 중`(`{components.badge-active}`), `완료`(`{components.badge-done}`). 상태는 실제 데이터(파일 로드, 구간 지정, 결과 존재)에서 계산한다.
- 처음 사용하는 사람을 위한 **안내 경로**: 소스 → 참조 → 작업 선택. 각 패널 하단에는 다음으로 갈 곳을 가리키는 기본 CTA가 하나만 있다.
- 선행 조건이 없는 작업 패널은 비활성화하지 않는다. 무엇이 빠졌는지와 그곳으로 가는 CTA를 보여 준다.
- 허브는 각 노드를 상태와 함께 카드로 보여 주고, "다음 할 일" 기본 CTA 하나를 둔다.
- 위치는 URL 해시(`#/source` 등)로 표현해 브라우저 뒤로 가기와 새로고침 후 위치 복원이 동작하게 한다. 오디오 데이터는 새로고침하면 사라진다.

### 배치

- 데스크톱(≥ 960px): 왼쪽에 폭 `{spacing.rail}`의 내비게이션 레일, 오른쪽에 패널.
- 모바일: 상단 바에 현재 위치와 진행 요약, 메뉴 버튼으로 내비게이션 Drawer를 연다. 좌우 여백 `{spacing.lg}`, 가로 스크롤 없음.
- 간격은 4px 단위 `{spacing.xs}`~`{spacing.2xl}`만 쓴다.

## Elevation & Depth

그림자 대신 표면 단계로 깊이를 나눈다. 구분선은 `{components.divider}`, 입력 테두리는 `{components.input-outline}` 색이다. 표면 순서: `{colors.bg}` → `{colors.surface}` → `{colors.surface-subtle}` → `{colors.surface-raised}`. 오버레이(Drawer, Dialog, Toast)만 그림자를 쓴다.

## Shapes

컨트롤은 `{rounded.md}`, 패널과 카드는 `{rounded.lg}`, 배지는 `{rounded.full}`이다.

## Components

Goodcase UI(`~/.agents/skills/use-goodcase-ui`, manifest 0.1.0)의 React 컴포넌트를 복사해 쓰고, `--gc-*` 토큰을 이 문서의 토큰에 연결한다. Goodcase의 동작 계약(중복 실행 차단, Escape 취소, 포커스 복귀, 실패 후 재시도)은 유지한다.

| 화면 요소 | Goodcase 컴포넌트 | 이 문서의 토큰 |
| --- | --- | --- |
| 기본 CTA, 실행 | Button (pending으로 중복 실행 차단) | `{components.button-primary}` |
| 실시간 시작 | Button | `{components.button-live}` |
| 노드 상태, 합성 음성 표시 | Badge | `{components.badge-done}`, `{components.badge-synthetic}` |
| 허브 노드 카드 | Card | `{components.panel}` |
| 오류와 재시도 | Alert | `{components.alert-error}` |
| 변환·처리 진행 | Progress (불확정) | `{colors.primary}` |
| 등록 방식, 입력 방식 | RadioGroup | |
| step 수, 블록 크기 | Select | |
| 원본 듣기 | Switch | |
| 모바일 내비게이션 | Drawer | |
| 완료 알림 | Toast | |
| 지연 지표 | Table 또는 metric tile | `{components.metric-tile}` |
| 보조 설명 | Tooltip | |

파형은 wavesurfer.js로 그리고, 처리 구간은 `{components.region-process}`, 참조 구간은 `{components.region-reference}` 색을 쓴다.

## Do's and Don'ts

- Do: 한 패널에 기본 CTA는 하나만 둔다.
- Do: 상태는 색과 텍스트를 함께 쓴다 ("완료" 글자 + 초록).
- Do: 합성 음성 결과에는 항상 `{components.badge-synthetic}`를 붙인다.
- Don't: 주황과 초록을 의미 없이 섞지 않는다. 처리 = 주황, 참조·실시간·완료 = 초록.
- Don't: 오류에 주황을 쓰지 않는다.
- Don't: 선행 조건이 없다고 내비게이션 항목을 비활성화하지 않는다.

## Known Gaps

- 네온 색의 대비는 lint 결과로만 확인했다. 시연 프로젝터에서의 시인성은 실측하지 않았다.
- 라이트 모드는 정의하지 않았다.
