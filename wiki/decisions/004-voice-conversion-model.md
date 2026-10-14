---
type: Decision
title: "ADR 004: 음성 변환에 Seed-VC를 별도 프로세스로 사용"
description: "ADR 004: 음성 변환에 Seed-VC를 별도 프로세스로 사용"
okf_version: "0.1"
timestamp: 2026-10-14
---

# ADR 004: 음성 변환에 Seed-VC를 별도 프로세스로 사용

## Status

Accepted — 2026-10-14 [스파이크 실측](../references/vc-spike.md)에 따른 선택.

## Context

③은 사용자가 넣은 참조 음원 A의 목소리로 변환하는 zero-shot VC다. 시연 PC는 CPU 전용이다.

## Decision

1. 오프라인 `engine.convert`는 Seed-VC(`51383ef`)를 쓴다. 기본 10 step, 빠른 미리보기 4 step.
2. Seed-VC는 `.venv-seedvc`에서 모델을 한 번 로드하는 상주 worker 프로세스로 실행하고, 웹 서버와 엔진은 이 프로세스를 호출한다. GPL-3.0 코드와 약 3 GB 메모리, 로드 시간을 FastAPI 프로세스와 분리하기 위해서다. Seed-VC 소스와 가중치는 Git에 넣지 않는다.
3. 출력은 다른 기능과 맞추어 16 kHz 모노로 변환한다.
4. 실시간 변환은 범위에서 제외한다. Seed-VC 실시간 경로는 이 CPU에서 7~15배 느렸다. OpenVoice는 속도는 되지만 유사도가 낮아, 여유가 있을 때만 저품질 실시간 실험으로 둔다.

## Consequences

변환 한 번에 약 30초(10 step, 12~14초 음원)가 걸리므로 웹 화면에 진행 상태를 보여 준다. 한국어 품질은 팀원 녹음으로 별도 확인한다. 공개 배포 시 GPL-3.0 검토가 필요하다.
