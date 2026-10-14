---
type: Concept
title: "웹 데모 로드맵"
description: "추출·제거·음성 변환·실시간 제거 웹 데모의 트랙별 작업 분할"
okf_version: "0.1"
timestamp: 2026-10-14
---

# 웹 데모 로드맵

결정 배경은 [ADR 003](../decisions/003-web-demo-scope.md)을 따른다. 트랙은 서로 다른 팀원이 병렬로 맡을 수 있게 나눴다. 다른 트랙과는 아래 **인터페이스 계약**으로만 만난다. 계약을 바꾸려면 이 문서를 먼저 고친다.

## 기능

| 기능 | 담당 | 상태 |
| --- | --- | --- |
| ① 특정 인물 음성 추출 | 엔진 | 구현됨 (`*.target.wav`) |
| ② 특정 인물 음성 제거 | 엔진 | 구현됨 (`dsp.suppress`) |
| ③ 음성 변환: 내 목소리 → 참조 음원 A의 목소리 | 엔진 | 미구현, 모델 미검증 |
| ④ 실시간 제거 | 엔진 + 웹 | 파이프 실험만 있음 |
| 자르기, 구간 선택, 녹음, 재생, A/B 비교 | 웹 | 미구현 |

③의 대상은 고정 인물이 아니다. 사용자가 넣은 참조 음원 A의 목소리 특징(지문)을 그때그때 쓴다. 학습 없이 참조만으로 변환하는 zero-shot VC가 필요하다.

## 인터페이스 계약

모든 오디오는 **16 kHz 모노 float32**로 주고받는다.

엔진 (`voice_killer.engine` 모듈):

```python
load_extractor() -> TargetExtractor           # lru_cache: 서버는 모델을 한 번만 로드
check_enrollment(enroll)                      # 1초 미만·무음이면 ValueError
extract(mixture, enroll, extractor=None) -> target            # ①
remove(mixture, enroll, strength=1.0, extractor=None) -> out  # ②
convert(source, reference) -> out             # ③ (트랙 D)
StreamSuppressor(enroll, context_seconds=2.0).push(block) -> block  # ④
```

블록 길이는 호출하는 쪽이 정한다. `push`는 받은 블록과 같은 길이를 돌려준다.

HTTP:

- `POST /api/process` (multipart): `audio`, `start`, `end`, `ref`(선택, 없으면 `audio`를 씀), `ref_start`, `ref_end`, `mode`=`extract|remove|convert`, `strength`. 응답은 WAV 파일이다.
- 자르기는 브라우저에서 파일을 자르지 않는다. 구간 초를 보내고 서버가 자른다.

WebSocket `/ws/stream`:

1. 클라이언트가 text `{"enroll_seconds": n}`을 보낸다.
2. 클라이언트가 binary로 등록 음성 PCM을 보낸다.
3. 서버가 text `{"ready": true}`를 보낸다.
4. 이후 양방향으로 binary PCM 블록을 주고받는다.

## 트랙

### A. 엔진 API 정리 (선행, 소규모)

- `cli.main()`의 처리를 `extract`와 `remove` 함수로 꺼낸다.
- `stream.py`의 반복 처리를 `StreamSuppressor`로 꺼낸다. CLI 동작은 그대로 둔다.
- 완료 기준: 기존 테스트 통과, 잡스 70초 결과 샘플 동일.
- 상태: 2026-10-14 완료. `src/voice_killer/engine.py`. CLI 출력 3개는 샘플 최대 차이 0, 스트림 PCM은 바이트 동일. WAV 파일 해시는 libsndfile PEAK 청크의 생성 시각 때문에 매번 달라지므로 회귀 비교는 디코딩한 샘플로 한다.
- B와 C는 A가 끝나기 전에도 계약대로 스텁을 두고 시작할 수 있다.

### B. 웹: 파일 처리 (①②, 이후 ③ 탭)

- FastAPI 서버 1개, HTML 1개, wavesurfer.js(CDN)로 구성한다. `localhost`에서만 서비스한다.
- 화면 흐름: 업로드 또는 녹음 → 파형 → 처리 구간과 참조/등록 구간 지정 → 실행 → 원본과 결과를 A/B로 재생.
- 등록 구간 선택 UI는 ①②의 등록 음성과 ③의 참조 음원 A가 같이 쓴다.
- 완료 기준: 잡스 데모를 웹에서 재현함.
- 상태: 2026-10-14 완료. `voice-killer-web`(`web.py`, `web.html`). 잡스 132~152초 제거 결과는 엔진 직접 호출과 RMS 차이 4.5e-05다. 원인은 ffmpeg와 scipy 리샘플러 차이다. ffmpeg 기본 다운믹스(채널당 0.707)는 +3 dB 차이를 만들어 `rematrix_maxval=1.0`으로 평균 다운믹스한다.
- 한계: 10분 48 kHz 스테레오 원본은 헤드리스 Chrome에서 파형 디코딩이 멈췄다. 마이크 녹음 경로는 브라우저 자동화로 검증하지 않았다.

### C. 실시간 제거 (④)

- 브라우저: `getUserMedia` → AudioWorklet에서 16 kHz float32로 변환 → WebSocket 전송 → 받은 블록을 재생.
- 서버: 연결마다 `StreamSuppressor` 하나를 만든다.
- 등록 음성은 시작 전에 녹음하거나 파일 구간을 고른다.
- 완료 기준: 마이크부터 스피커까지 종단 지연을 실측해 위키에 기록함. 블록 1초와 2초 설정을 비교함.

### D. 음성 변환 (③), 위험이 가장 큼, 즉시 착수

1. 스파이크: 후보 모델을 이 PC CPU에서 실행해 본다. 후보는 Seed-VC(품질)와 OpenVoice v2 tone color converter(속도)이며, 둘 다 미검증이다.
   - 확인 항목: 참조 길이 5~30초에서의 결과, 한국어 입력, RTF, torch 2.7.1 의존성 충돌.
   - 충돌하면 별도 venv에서 프로세스를 따로 띄운다.
2. 선택한 모델로 엔진 `convert()`를 구현하고 모델 출처를 기록한다(`model-provenance.json`).
3. 웹 B에 변환 탭을 연결한다.
4. (확장) 실시간 변환. RTF가 충분할 때만 한다.

- 조합 시연: 잡음 섞인 영상에서 ①로 목소리를 추출하고, 그 결과를 ③의 참조로 쓴다.
- 완료 기준: 녹음 1개를 서로 다른 참조 2개로 변환한 결과와 RTF.

### E. 평가와 발표

- 기존 `evaluate_asr.py`와 `evaluate_overlap.py`를 웹 결과에 적용한다.
- ③은 화자 유사도(ECAPA 임베딩 코사인, 참조 대비)를 보조 지표로 검토한다.
- 발표 흐름: STFT와 마스크 원리 → ① → ② → ④ → ③.

## 마일스톤

| 마일스톤 | 포함 | 의존 |
| --- | --- | --- |
| M1 파일 데모 | A, B(①②) | — |
| M2 실시간 제거 | C | A |
| M3 음성 변환 | D 1~3 | D 스파이크 |
| M4 통합 리허설 | E | M1~M3 |

마감일은 미정이라 날짜는 두지 않는다.

## 시연 장비 실측 (2026-10-14)

- 장비: AMD Ryzen 7 8745HS (16 스레드), Radeon 780M 내장 GPU, 메모리 26 GB, NVIDIA GPU 없음.
- PyTorch 2.7.1에서 CUDA 사용 불가로 CPU 추론만 가능하다.
- REAL-TSE 블록 추론 + 마스킹, 8 스레드, 합성 잡음 입력, 4회 측정:
  - 1초 블록 + 2초 문맥: 약 0.70초
  - 2초 블록 + 2초 문맥: 약 0.84초
- 두 설정 모두 입력 주기보다 빠르다.
- 아직 실측하지 않은 것: 실제 음성 입력, 마이크와 스피커 I/O 지연, VC와 동시 실행할 때의 부하.
