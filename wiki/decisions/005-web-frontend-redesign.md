---
type: Decision
title: "ADR 005: 웹 프런트엔드를 React와 Goodcase UI로 재구성"
description: "ADR 005: 웹 프런트엔드를 React와 Goodcase UI로 재구성"
okf_version: "0.1"
timestamp: 2026-10-14
---

# ADR 005: 웹 프런트엔드를 React와 Goodcase UI로 재구성

## Status

Accepted — 2026-10-14 사용자 요구.

## Context

단일 `web.html`은 모든 기능을 세로로 나열해 현재 단계와 완료 여부를 알기 어려웠다. 사용자는 Pretendard, 네온 주황·초록 디자인 시스템, 단계별 CTA와 Star형 IA, Goodcase UI 컴포넌트 사용을 요구했다. Goodcase UI는 React 19, TypeScript, Radix 기반이다.

## Decision

1. 디자인 기준은 루트 `DESIGN.md` 하나로 둔다. 코드의 CSS 변수는 여기서 옮긴 값이다.
2. 프런트엔드는 `web/`의 Vite + React + TypeScript 앱으로 만들고 Goodcase 컴포넌트를 복사해 쓴다. 빌드 결과 `web/dist`는 Git에 넣지 않고 FastAPI가 제공한다.
3. 서버 API(`/api/process`, `/ws/stream`)는 바꾸지 않는다.
4. IA는 작업 공간 허브와 소스·참조·추출·제거·변환·실시간 노드의 Star 구조다. 안내 경로는 소스 → 참조 → 작업이다.

## Consequences

팀원은 Node.js(검증 환경 v24)와 `npm ci && npm run build`가 필요하다. 프런트엔드 의존성(React, Radix, lucide, wavesurfer, Pretendard)이 늘어난다. 시연 중 외부 CDN에 의존하지 않는다.
