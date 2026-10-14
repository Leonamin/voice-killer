---
type: Reference
title: "음성 변환 모델 스파이크"
description: "Seed-VC와 OpenVoice v2의 CPU 실측 비교"
okf_version: "0.1"
timestamp: 2026-10-14
---

# 음성 변환 모델 스파이크

2026-10-14 시연 PC(Ryzen 7 8745HS, CPU, torch 8 스레드)에서 실측했다. 별도 venv(`.venv-seedvc`, `.venv-openvoice`)와 `vendor/vc-spike/`에서 실행했고 Git 추적 파일은 바꾸지 않았다.

## 후보

| | Seed-VC | OpenVoice v2 converter |
| --- | --- | --- |
| commit | `51383efd921027683c89e5348211d93ff12ac2a8` | `74a1d147b17a8c3092dd5430504bd83ef6c7eb23` |
| 라이선스 (코드/가중치) | GPL-3.0 / GPL-3.0 | MIT / MIT |
| 가중치 | 약 1.8 GB (DiT, whisper-small, BigVGAN, CAMPPlus) | 131 MB |
| 로드 | warm 5.8초, 첫 다운로드 포함 154.7초 | 2.0초 |
| 최대 RSS | 3.05 GB | 1.40 GB |
| 출력 | 22.05 kHz | 22.05 kHz |

OpenVoice는 `enable_watermark=False`에서 upstream `TypeError`가 있어 드라이버에서 우회했다. Seed-VC의 `requirements.txt`는 CUDA nightly를 가리켜 쓰지 않았다. 둘 다 torch 2.7.1 CPU에서 동작했다.

## 시험 조건

원본: Seed-VC 예제의 영어 화자 2명(12.5초, 14.1초). 참조: `data/jobs-enroll.wav`(7초, 강연장 녹음)와 Seed-VC 예제 `s1p1.wav`(14.6초, 깨끗함). 원본×참조 4쌍.

## 결과

- 처리 속도(RTF): Seed-VC 30 step 3.9~6.0, 10 step 2.3~2.9, 4 step 1.7~1.9. 4 step에도 약 15초 고정 비용이 있고, 참조가 길수록 느리다. OpenVoice는 0.18이다.
- 화자 유사도(ECAPA 코사인, 출력→참조): Seed-VC 10 step 0.64~0.79, 4 step 0.62~0.74, OpenVoice 0.20~0.48. 원본→참조 기준값은 대부분 약 0이다. 30→4 step 차이는 0.00~0.07로 4쌍 표본에서는 잡음 수준과 구분하기 어렵다.
- 명료도: faster-whisper small로 16개 출력 모두 원본 전사 대비 WER 0.00. 깨끗한 영어 표본이라 약한 근거다.
- 실시간: OpenVoice는 1초 창 0.094초로 계산상 가능하다. 조각 경계 품질은 시험하지 않았다. Seed-VC 실시간 모델은 0.3~1.0초 블록에 2.2~5.9초가 걸려 이 CPU에서는 불가능하다.

## 미검증

한국어, 주관적 자연스러움, OpenVoice 스트리밍 경계 품질, bf16·ONNX·ROCm 가속. 다른 에이전트 작업과 동시에 측정해 배경 부하를 배제하지 못했다.
