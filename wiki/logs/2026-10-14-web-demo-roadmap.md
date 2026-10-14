---
type: Log
title: "웹 데모 범위 확정과 로드맵 작성"
description: "웹 데모 범위 확정과 로드맵 작성"
okf_version: "0.1"
timestamp: 2026-10-14
---

# 웹 데모 범위 확정과 로드맵 작성

- 결정: 추출, 제거, 참조 음원 기반 음성 변환, 실시간 제거를 웹 데모로 시연한다. 엔진과 웹의 책임을 분리한다 (ADR 003).
- 추가: concepts/roadmap.md에 트랙 A~E, 인터페이스 계약, 마일스톤을 기록했다.
- 실측: 시연 PC(Ryzen 7 8745HS, CPU)에서 REAL-TSE 블록 처리 시간을 측정했다. 1초 블록 약 0.70초, 2초 블록 약 0.84초다.
- 미검증: 음성 변환 모델 후보, 마이크·스피커 종단 지연.
- 구현: 트랙 A 엔진 API(`engine.py`)를 추가했다. 리팩터링 전후로 CLI 샘플과 스트림 PCM이 동일함을 확인했다.
- 구현: 트랙 B 웹 파일 처리(`voice-killer-web`)를 추가했다. 업로드·구간 선택·추출·제거·A/B 재생을 브라우저 자동화로 확인했다.
- 실측·결정: 트랙 D 스파이크로 Seed-VC와 OpenVoice v2를 비교하고 Seed-VC 별도 프로세스 사용을 결정했다 (ADR 004).
- 구현: 트랙 C 실시간 제거(`/ws/stream`과 웹 화면)를 추가했다. 1초 블록 서버 왕복 평균 692 ms다.
- 구현: 트랙 D 음성 변환(Seed-VC worker, `engine.convert`, 웹 변환 모드)을 추가했다. 웹 경로 화자 유사도가 스파이크와 일치했다.
- 변경: 다른 기기 접속을 위해 `--host`와 HTTPS 옵션을 추가했다(ADR 003 갱신). 쓰지 않는 OpenVoice 환경과 Seed-VC 실시간 전용 가중치를 삭제했다.
- 결정: DESIGN.md(다크 네온, Pretendard, Star IA)와 ADR 005(React + Goodcase UI 프런트엔드)를 추가했다.
- 구현: React 프런트엔드 1·2단계(허브, 소스·참조·추출·제거·변환·실시간 패널)를 완료하고 `web.html`을 삭제했다.
