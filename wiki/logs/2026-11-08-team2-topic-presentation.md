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
- 화면: `#/how` "원리와 구조" 페이지 추가(web/src/How.tsx, Arch.tsx). 구조 그림은 stack-diagram 스킬로 배치하고 TSX로 옮겼다. 원리 설명과 칸 모형은 ~/study/decks/voice-killer-suppression 덱의 내용과 격자 그림 아이디어를 가져와 다시 썼다(덱 엔진 deck-kit은 쓰지 않음).
- 정정: 원리 탭 설명을 dsp.py와 대조해 고쳤다. "애매한 칸이 0에 가까워진다"는 틀렸다(비율 0.5는 p와 상관없이 0.5로 남고, 0.5보다 낮은 쪽이 0으로 간다). STFT는 대상 추정 뒤에 섞인 소리와 추정 둘 다에 적용한다. 목소리와 박수가 "다른 칸"에 산다는 말은 "대부분"으로 낮추고, 그림이 모델의 완벽한 추정을 가정한 모형임을 적었다. 원리 5단계를 칸 그림, 마스크 곡선(p 슬라이더), 강도 슬라이더가 있는 인포그래픽으로 바꿨다.
- 원리 탭의 칸 그림을 가짜 모형에서 실제 처리 결과로 교체: `scripts/export_spectrogram.py`가 통제 혼합음 8초(발화 + 환호)를 REAL-TSE로 처리해 섞인 소리 X, 대상 추정 S, 나머지 R의 STFT 크기를 40×100 칸으로 합쳐 `web/src/data/spectrogram.json`(약 16 KB, dB uint8, 위상 없음)에 저장한다. 화면은 이 값으로 비율·마스크·결과를 서버와 같은 식으로 계산한다. 칸을 합친 값으로 비율을 구하므로 서버가 칸마다 구하는 값과 정확히 같지는 않다. 이 파일을 Git에 둘지는 "생성 결과는 Git에 넣지 않는다" 규칙과 맞는지 사용자가 판단해야 한다.
