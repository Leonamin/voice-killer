# Voice Killer

등록한 화자의 발화를 억제하고 주변 소리를 남기는 오프라인 오디오 변환 도구. 스티브 잡스의 2007년 첫 아이폰 발표를 실제로 변환한 연구 PoC다.

**REAL-TSE 사전학습 모델 + 등록 음성 + 시간·주파수 마스킹**을 사용한다. 발화 구간 전체를 음소거하지 않는다. 입력은 libsndfile이 읽을 수 있는 WAV/FLAC 등의 음원이며, 출력은 **16 kHz 모노 float WAV**다. 영상·MP3 등은 ffmpeg로 WAV 변환 후 입력한다.

## 설치

검증 환경: macOS 26.3, Apple M4 Max, Python 3.11, PyTorch 2.7.1 CPU. `uv`, Git, ffmpeg가 필요하다.

```bash
cd ~/dev/voice-killer
bash scripts/setup.sh
```

전용 `.venv`에 고정 의존성을 설치하고, 고정 revision의 공개 연구 코드와 공식 체크포인트 묶음(약 1.05 GB)을 내려받는다. 모델 파일의 SHA-256을 검사한다. 첫 다운로드에는 인터넷이 필요하며 이후 변환은 로컬에서 수행한다. 이미 설치된 작업 환경에서도 바로 아래 명령을 실행할 수 있다.

## 파일 변환

```bash
.venv/bin/voice-killer input.wav \
  --enroll target-speaker.wav \
  --output outputs/filtered.wav
```

등록 음성은 대상이 혼자 말하는 별도의 깨끗한 5~10초 구간을 권장한다. 도구는 사람의 이름을 아는 것이 아니라 등록 음성의 특징을 조건으로 사용한다.

함께 생성되는 파일:

- `filtered.wav`: 억제 결과
- `filtered.original.wav`: 동일 구간·16 kHz 모노 원본 비교본
- `filtered.target.wav`: 모델이 추정한 대상 화자
- `filtered.json`: 입력·모델·출력 해시, 옵션, 구간과 처리 시간

출력을 자동 음량 정규화하지 않는다. 기존 결과는 `--force` 없이 덮어쓰지 않는다. 원본과 등록 음성 덮어쓰기는 차단한다.

## 잡스 발표 데모 재현

```bash
.venv/bin/python scripts/prepare_demo.py
.venv/bin/voice-killer data/source/iphone-2007.wav \
  --enroll data/jobs-enroll.wav \
  --start 132 --duration 70 \
  --output outputs/reveal.wav

# 확보한 10분 19초 소개 영상 전체
.venv/bin/voice-killer data/source/iphone-2007.wav \
  --enroll data/jobs-enroll.wav \
  --output outputs/iphone-2007-final.wav
```

[출처 영상](https://www.youtube.com/watch?v=MnrJzXM7a6o)은 전체 Macworld 행사 중 아이폰 소개 발췌본이다. 등록 구간은 12.4~19.4초, 주요 자연 평가 구간은 38~68초와 132~202초다. 전체 변환에는 등록 구간도 포함되므로 독립 평가에는 사용하지 않는다. 실제 결과 파일은 Git에서 제외된 `outputs/`에 있다.

## 강도와 방식

기본값은 `--method mask --mask-power 4 --hard-threshold 0.65 --strength 1`이다. 대상 성분 비율이 0.65 이상인 주파수 bin은 완전히 차단한다. `--hard-threshold 1`로 이 보정을 끄고 `--mask-power 1`이나 `2`를 쓰면 부드럽지만 말이 더 남는다. `--strength 0`은 모델 입력 형식으로 변환된 원본을 그대로 출력한다. `--method subtract`는 비교용 직접 차감 방식이다.

모델은 12초 단위, 2초 중첩으로 동작한다. `--chunk-seconds`, `--overlap-seconds`, `--threads`로 조정할 수 있다. CUDA/MPS 옵션은 노출하지만 이번 검증은 CPU만 수행했다.

## 웹 데모

```bash
.venv/bin/voice-killer-web   # http://127.0.0.1:8000
```

파일을 올리거나 녹음한 뒤 파형에서 처리 구간과 참조 구간(대상이 혼자 말하는 5~10초)을 지정하고 추출·제거를 실행한다. 업로드는 ffmpeg로 16 kHz 모노로 변환하므로 mp3·mp4·webm도 받는다. 로컬(127.0.0.1)에서만 열리며 한 번에 한 요청만 처리한다. 수 분 이상의 고음질 원본은 브라우저 파형 표시가 멈출 수 있으니 시연용으로 잘라 쓴다.

## 스트리밍 실험

```bash
# 70초 음원을 실제 시간 속도로 stdin에 공급하는 검증 스크립트
.venv/bin/python scripts/stream_demo.py

# 실시간 속도로 디코딩한 파일을 PCM 파이프로 처리하는 예시
set -o pipefail
ffmpeg -re -i input.wav -f f32le -ar 16000 -ac 1 pipe:1 | \
  .venv/bin/voice-killer-stream --enroll target-speaker.wav \
    --report outputs/stream-report.json | \
  ffmpeg -f f32le -ar 16000 -ac 1 -i pipe:0 outputs/stream-result.wav
```

이것은 **2초 입력 버퍼 + 계산 지연**이 있는 연속 처리 실험이다. 저지연 이어폰 ANC가 아니며 실제 마이크·스피커 장치의 종단 지연은 검증하지 않았다. 파일을 실제 시간 속도로 공급하고 매 블록 결과를 즉시 출력하는 방식이다. 오프라인과 문맥 길이가 달라 억제 품질도 다를 수 있다.

## 결과와 한계

동일 발표에서 분리한 발화·박수 구간을 같은 RMS로 합친 시험에서, 기본 마스킹은 대상 발화 성분을 약 25.1 dB 줄이면서 관중 성분은 약 0.9 dB 줄였다. 실제 자연 박수 구간은 약 0.05 dB 감소했다. 이는 특정 시험 결과이며 모든 소리에 대한 보장이 아니다. [최종 70초 원본](outputs/reveal-final.original.wav)과 [처리본](outputs/reveal-final.wav), [전체 처리본](outputs/iphone-2007-final.wav)을 같은 재생 음량으로 비교할 수 있다.

일부 큰 환호는 대상 화자와 함께 감소한다. 잔류음·음질 왜곡이 있고 16 kHz 모노로 고역·공간 정보가 줄어든다. ASR이 말을 인식하지 못해도 사람이 못 알아듣는다는 증명은 아니다. 타인 대화·한국어·마이크 입력의 일반화는 아직 검증하지 않았다.

[실험 결과와 근거](wiki/references/jobs-experiment.md) · [알고리즘](wiki/concepts/implementation.md) · [위키](wiki/index.md)

## 검증

```bash
.venv/bin/python -m pytest -q
.venv/bin/python scripts/evaluate_overlap.py
```

음원, 모델 가중치, 실험 출력은 Git에 넣지 않는다. 모델 출처·revision·체크포인트 해시는 `model-provenance.json`에 기록한다.
