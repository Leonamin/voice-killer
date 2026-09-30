---
type: Concept
title: "파일 변환 및 스트리밍 구현"
description: "파일 변환 및 스트리밍 구현"
okf_version: "0.1"
timestamp: 2026-09-30
---

# 파일 변환 및 스트리밍 구현

## 처리 순서

1. 입력과 등록 음성을 16 kHz 모노로 변환한다.
2. REAL-TSE의 BSRNN + ECAPA 화자 인코더(`spk_emb_100`)로 등록 화자 성분을 추정한다.
3. 12초 단위 추론을 2초 중첩하고 선형 crossfade로 합친다. 마지막 구간은 128샘플 hop의 배수로 padding한 뒤 원래 길이로 자른다.
4. 혼합 신호 X와 추정 대상 S를 512샘플 Hann STFT, 128샘플 hop으로 분석한다.
5. 잔여 성분 R=X−S를 계산하고 `q=|S|/(|S|+|R|)`로 정규화한다. `M=q^p/(q^p+(1−q)^p)`, `Y=X×(1−strength×M)`를 적용한다.
6. 역 STFT로 정확히 입력 길이의 결과를 저장한다. 기본 p=4, strength=1이다. `q>=0.65`인 대상 우세 bin은 M=1로 포화시켜 아주 작은 발화 흔적이 남는 것을 줄인다. `--hard-threshold 1`로 비교용 soft-only 동작을 선택할 수 있다.

전체 시간 구간을 음소거하는 gate는 없다. 대상 우세 주파수 성분만 억제한다. p=4는 박수 보존과 강한 발화 억제의 실험상 절충이며 만능 설정이 아니다.

## 수치·진폭 처리

모델 출력의 peak normalization을 사용하지 않는다. SI-SDR 학습 모델은 대상 추정 진폭이 입력과 다를 수 있어 직접 subtraction에는 잔류 발화가 컸다. 원시 STFT 크기를 고차 거듭제곱하면 작은 값에서 epsilon이 결과를 지배하므로, 비율을 정규화한 뒤 거듭제곱한다. 이 scale invariance를 테스트한다.

float WAV를 사용해 파일 저장 과정의 숨은 정규화·클리핑을 피한다. `*.original.wav`도 동일 16 kHz 모노라 처리 효과를 공정하게 비교할 수 있지만, 48 kHz 스테레오 원본의 완전 보존은 아니다.

## 연구 코드 호환성

공식 `wesep`·`wespeaker` 패키지 진입점은 사용하지 않는 ASR·학습·화자분할 도구까지 import했다. Mac에서 파일 생성 후 종료 시 abort도 발생했다. 어댑터는 고정된 원본 소스의 core package 경로를 등록하고 모델 클래스만 로드한다. upstream 소스와 가중치는 수정하지 않는다. checkpoint는 `weights_only=True`, `strict=True`로 로드한다.

30초 샘플에서 공식 진입점과 코어 어댑터의 대상 추정 파형 최대 차이는 0이었다. 최소 의존성의 별도 가상환경에서 실제 추론이 종료 코드 0으로 재현됐다.

## 스트리밍

`voice-killer-stream`은 stdin/stdout에 16 kHz 모노 little-endian float32 PCM을 주고받는다. 2초 block과 과거 2초 문맥을 사용한다. 미래 block을 기다리지는 않지만 block 내부 전체를 참조하는 비인과 모델이므로 최소 버퍼 지연이 있다. 마이크·헤드폰 I/O 및 실시간 운영체제 지연은 별도 후속 검증이다.
