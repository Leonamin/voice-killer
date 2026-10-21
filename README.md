# Voice Killer

특정 인물의 목소리만 골라 **추출·제거·변환**하는 오디오 도구다. 대상이 혼자 말하는 짧은 참조 음성(5~10초)을 주면, 도구가 이름이 아니라 그 목소리의 특징을 기준으로 처리한다. 디지털미디어원리 수업 프로젝트이며, 스티브 잡스의 2007년 아이폰 발표로 실험했다.

| 기능 | 하는 일 | 방식 |
| --- | --- | --- |
| 추출 | 섞인 소리에서 참조 인물의 목소리만 남긴다 | REAL-TSE 대상 화자 추출 |
| 제거 | 참조 인물의 목소리만 지우고 주변 소리는 남긴다 | 추출 결과로 시간·주파수 마스킹 |
| 변환 | 내 목소리를 참조 음원의 목소리로 바꾼다 | Seed-VC zero-shot 변환 |
| 실시간 제거 | 마이크 입력에서 참조 인물 목소리를 바로 지운다 | 1·2초 블록 스트리밍 |

모든 처리는 이 PC의 CPU에서 로컬로 실행한다. 첫 설치 때만 모델을 내려받는다.

## 빠른 시작

필요한 것: Linux 또는 macOS, [uv](https://docs.astral.sh/uv/), Git, ffmpeg, Node.js 20.19 이상(웹 빌드용).

```bash
bash scripts/setup.sh        # 추출·제거·실시간: .venv, REAL-TSE 모델(약 1.05 GB), 웹 빌드
bash scripts/setup_vc.sh     # 변환(선택): .venv-seedvc, Seed-VC (가중치 약 1.8 GB는 첫 변환 때 다운로드)
.venv/bin/voice-killer-web   # http://127.0.0.1:8000
```

설치 스크립트는 고정된 revision의 연구 코드를 받고 모델 파일의 SHA-256을 검사한다.

## 웹 데모 사용법

화면은 **작업 공간**을 중심으로 6개 메뉴를 자유롭게 오간다. 메뉴의 배지가 각 단계가 `필요`인지, `진행 중`인지, `완료`인지 보여 준다.

1. **소스**: 처리할 오디오를 올리거나 녹음하고, 파형에서 처리 구간(주황)을 고른다. 업로드는 ffmpeg로 변환하므로 wav, mp3, mp4, webm 모두 된다.
2. **참조**: 대상 인물이 혼자 말하는 구간(초록)을 고른다. 같은 파일을 써도 되고 다른 파일을 올려도 된다.
3. **작업**: 추출, 제거, 변환, 실시간 중 하나를 실행하고 원본과 결과를 번갈아 듣는다.
   - **추출**: 결과 화면의 "이 결과를 참조로 쓰기" 버튼을 누르면 잡음 섞인 영상에서 뽑은 목소리를 변환의 참조로 바로 쓸 수 있다.
   - **변환**: 원본은 최대 60초, 참조는 최대 30초까지 쓸 수 있다. 결과는 합성 음성임을 표시한다.
   - **실시간**: 마이크 입력이나 파일 구간을 1초 또는 2초 블록으로 처리한다. 스피커 소리가 마이크로 되먹임되지 않도록 헤드폰을 쓴다.

서버는 기본적으로 127.0.0.1에서만 열리며 한 번에 한 요청만 처리한다. 수 분이 넘는 고음질 원본은 브라우저의 파형 표시가 멈출 수 있으니 시연용으로 잘라 쓴다.

### 다른 기기에서 접속

브라우저는 HTTPS나 localhost에서만 마이크를 허용한다. 그래서 다른 기기에서 접속하려면 자체 서명 인증서와 함께 띄워야 하고, 접속하는 기기에서 인증서 경고를 한 번 수락해야 한다. 인증 기능이 없어서 같은 네트워크의 누구나 접속할 수 있다.

```bash
mkdir -p .cache/tls && openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj /CN=voice-killer \
  -addext "subjectAltName=IP:<이 PC의 IP>,IP:127.0.0.1" -keyout .cache/tls/key.pem -out .cache/tls/cert.pem
.venv/bin/voice-killer-web --host 0.0.0.0 --ssl-certfile .cache/tls/cert.pem --ssl-keyfile .cache/tls/key.pem
```

방화벽이 켜져 있으면 8000번 포트를 연다. 시연이 끝나면 포트를 다시 닫는다.

### 상시 배포

`sudo ./scripts/deploy.sh`가 소스를 `/opt/voice-killer/releases/<UTC 시각>`에 복사하고 `current` 링크를 바꾼 뒤 `voice-killer-web` 서비스를 재시작한다. venv는 절대 경로에 묶여 있어 복사하지 않고, `.venv-seedvc`·`models`·`vendor`는 저장소를 링크한다. 배포 전에 `web`을 빌드해 둔다. 공개는 Cloudflare Tunnel이 `127.0.0.1:8000`으로 연결하며, 앱에 인증이 없으므로 주소를 아는 사람은 누구나 쓸 수 있다.

### 프런트엔드 개발

```bash
cd web && npm run dev        # 서버(voice-killer-web)를 띄운 채로 실행
cd web && npm run build      # 빌드 후 서버를 다시 시작해야 반영된다
```

React 19, Vite, [Goodcase UI](web/src/ui/SOURCE.md) 컴포넌트를 쓴다. 디자인 토큰과 정보 구조는 [DESIGN.md](DESIGN.md)에 정리돼 있다.

## 명령줄 도구

웹 없이 파일을 처리할 때 쓴다. 출력은 16 kHz 모노 float WAV다.

```bash
.venv/bin/voice-killer input.wav --enroll target-speaker.wav --output outputs/filtered.wav
```

다음 파일이 함께 만들어진다.

- `filtered.wav`: 제거 결과
- `filtered.original.wav`: 같은 구간을 16 kHz 모노로 바꾼 원본(비교용)
- `filtered.target.wav`: 추출된 대상 목소리
- `filtered.json`: 입력·모델·출력 해시, 옵션, 처리 시간

이미 있는 결과는 `--force` 없이는 덮어쓰지 않는다.

- **기본 옵션**: `--method mask --mask-power 4 --hard-threshold 0.65 --strength 1`.
- **더 부드럽게**: `--hard-threshold 1 --mask-power 2`. 대신 말소리가 더 남는다.
- **처리 단위**: 모델은 12초 단위로 2초씩 겹쳐 처리한다. `--chunk-seconds`, `--overlap-seconds`, `--threads`로 바꿀 수 있다.

### 잡스 발표 데모 재현

```bash
.venv/bin/python scripts/prepare_demo.py
.venv/bin/voice-killer data/source/iphone-2007.wav --enroll data/jobs-enroll.wav \
  --start 132 --duration 70 --output outputs/reveal.wav
```

원본은 [아이폰 소개 발췌 영상](https://www.youtube.com/watch?v=MnrJzXM7a6o)이다. 등록 구간은 12.4~19.4초다.

### 스트리밍 실험

```bash
ffmpeg -re -i input.wav -f f32le -ar 16000 -ac 1 pipe:1 | \
  .venv/bin/voice-killer-stream --enroll target-speaker.wav --report outputs/stream-report.json | \
  ffmpeg -f f32le -ar 16000 -ac 1 -i pipe:0 outputs/stream-result.wav
```

## 실측 결과

모든 수치는 시연 PC(Ryzen 7 8745HS, CPU만 사용)에서 측정했다.

### 제거

같은 발표에서 분리한 발화와 박수를 같은 음량으로 섞어 시험했다.

- 대상 발화: 약 25.1 dB 감소
- 관중 소리: 약 0.9 dB 감소
- 실제 자연 박수 구간: 약 0.05 dB 감소

특정 시험의 결과이며 모든 소리에 통하는 보장은 아니다.

### 실시간 제거

| 블록 | 서버 왕복 평균 | 브라우저 추정 총지연 |
| --- | --- | --- |
| 1초 | 692 ms | 약 1.6초 |
| 2초 | 920 ms | 약 2.9초 |

### 변환

- 처리 시간: 12.5초 음원을 바꾸는 데 약 29초 걸린다(10 step). 워커를 띄우는 첫 요청은 약 36초다.
- 화자 유사도: 변환 결과와 참조 목소리의 ECAPA 유사도가 0.655다(1이면 같은 목소리).

### 한계

- **같이 줄어드는 소리**: 큰 환호 일부가 대상 목소리와 함께 줄어든다. 남는 소리와 음질 왜곡도 있다.
- **음질 손실**: 16 kHz 모노로 처리해서 고음과 공간감이 줄어든다.
- **실시간의 정체**: 저지연 이어폰 노이즈 캔슬링이 아니다. 1~3초 늦게 나온다.
- **아직 검증하지 않은 것**:
  - 한국어 음성
  - 실제 마이크와 스피커를 거친 종단 지연
  - 변환 결과의 주관적 품질

## 윤리

변환 결과는 합성 음성이다. 실존 인물의 목소리로 만든 결과는 공개하지 않는다. 음원, 모델 가중치, 생성 결과는 Git에 넣지 않는다.

## 테스트

```bash
.venv/bin/python -m pytest -q
cd web && npm run typecheck
```

## 문서

- [위키](wiki/index.md)
  - [로드맵](wiki/concepts/roadmap.md): 작업 트랙 A~E와 진행 상태
  - [알고리즘](wiki/concepts/implementation.md)
  - [잡스 실험 결과](wiki/references/jobs-experiment.md)
  - [결정 기록(ADR)](wiki/decisions/index.md)
- [DESIGN.md](DESIGN.md): 웹 디자인 시스템
- [model-provenance.json](model-provenance.json): 모델 출처, revision, 체크포인트 해시
- 라이선스: Seed-VC는 GPL-3.0이다. GPL 코드, 약 3 GB 메모리, 모델 로드 시간을 웹 서버와 분리하려고 별도 환경(`.venv-seedvc`)의 별도 프로세스로 실행한다. 공개 배포 전에는 라이선스 검토가 필요하다.
