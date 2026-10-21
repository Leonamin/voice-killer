---
type: Log
title: "코어 수별 성능 실측"
description: "코어 수를 제한한 실시간 제거·음성 변환 실측 기록"
okf_version: "0.1"
timestamp: 2026-10-21
---

# 코어 수별 성능 실측

- 실측: 시연 PC에서 `taskset`으로 코어를 2~8개로 제한해 REAL-TSE 블록 시간과 Seed-VC 10 step RTF를 쟀다.
- 결과: 실시간 제거는 1초 블록 4코어, 2초 블록 3코어까지 입력 주기를 따라간다. Seed-VC는 2~8코어 모두 RTF 2.4~5.3으로 실시간이 아니다.
- 미확인: 다른 CPU 기종, GPU, RAM 하한.

- 추가: references/core-scaling-benchmark.md, logs/2026-10-21-core-scaling-benchmark.md
- 갱신: references/index.md, logs/index.md
