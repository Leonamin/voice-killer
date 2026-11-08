---
type: Log
title: "2조 주제발표 요구 기록"
description: "수업 공지에서 2조 발표 요구를 정리해 기록"
timestamp: 2026-11-08
okf_version: "0.1"
---

# 2조 주제발표 요구 기록

교수 공지를 정리했다. 확정 요구, 교수 예시(재작성 필요), 미정 항목을 나누어 기록했다. 마감은 11월 9일(월) 자정, 발표는 11월 11일(수)이다.

- 추가: concepts/team2-topic-presentation.md, logs/2026-11-08-team2-topic-presentation.md
- 추가: references/gain-sweep.md
- 갱신: concepts/team2-topic-presentation.md(우리 안 추가), references/index.md, concepts/index.md, logs/index.md
- 코드: dsp.py strength 범위 [-4, 1], tests/test_dsp.py, scripts/evaluate_gain.py
- 배포: vk.leonamin.com을 hamsbox 터널로 통합(decisions/006-public-deployment.md 갱신)
- 코드: 웹에서 실시간·변환 제거, 크기 조절 화면 통합(web/src), web.py strength [-4, 1]
- 코드: 후보 찾기에 같은 사람 합치기 추가(web/src/Candidates.tsx), concepts/reference-candidate-discovery.md 갱신
- 정리: 변환·실시간·추출 백엔드 삭제(stream.py, vc_worker.py, setup_vc.sh, requirements-vc-lock.txt, engine의 StreamSuppressor·convert, web.py의 /ws/stream·mode), README 갱신
- 정리: 옛 전용 터널 voice-killer와 voice-killer-tunnel 서비스 삭제
- 남김: `.venv-seedvc`, `vendor/seed-vc`는 디스크에 그대로 있다. 기록은 references/vc-spike.md에 남는다.

- 디자인: 줄이기·키우기 색 토큰(DESIGN.md reduce/boost, theme.css --vk-reduce/--vk-boost), 라우트 `#/remove`를 `#/adjust`로 변경
- 리팩토링: web/src/state.tsx를 단일 작업(result, isRunning, error)으로 단순화, CLI strength 범위 [-4, 1]
