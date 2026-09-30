---
type: Log
title: "잡스 발표 억제 PoC 구현과 실험"
description: "잡스 발표 억제 PoC 구현과 실험"
okf_version: "0.1"
timestamp: 2026-09-30
---

# 잡스 발표 억제 PoC 구현과 실험

사용자의 구체화된 연구 목표에 맞춰 공개 발표 음원과 등록 구간을 확보하고 REAL-TSE checkpoint를 실제 실행했다.

- 추가: Python CLI, 성분별 억제 DSP, 모델 adapter, 설치·음원 준비·평가 스크립트, PCM streaming interface.
- 검증: 발화·박수·동시 혼합 비교, 자연 발표 두 구간 ASR 보조 비교, 별도 가상환경 추론, DSP 테스트.
- 해결: 불필요한 학습용 package import와 Mac 종료 abort, 원시 STFT 고차 거듭제곱 수치 문제.
- 결과·한계: references/jobs-experiment.md에 실측과 실패 구간을 기록한다.
- 갱신: README와 관련 index, 구현 문서, ADR 002.

배포·원격 저장소 생성·외부 업로드는 수행하지 않았다.

전체 변환 후 추가 평가에서 작은 발화의 ASR 잔류를 확인하고 대상 우세 bin 완전 차단(q>=0.65)을 추가했다. soft-only 결과는 실험 이력으로 보존하고 최종 파일 이름에 final을 사용한다.
