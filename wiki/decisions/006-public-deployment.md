---
type: Decision
title: "ADR 006: vk.leonamin.com 인증 없는 공개 배포"
description: "ADR 006: vk.leonamin.com 인증 없는 공개 배포"
okf_version: "0.1"
timestamp: 2026-10-21
---

# ADR 006: vk.leonamin.com 인증 없는 공개 배포

## Status

Accepted — 2026-10-21 사용자 요구. [ADR 003](003-web-demo-scope.md)의 "인터넷 공개 배포는 하지 않는다"를 대체한다.

## Context

사용자가 시연 PC의 웹 데모를 `vk.leonamin.com`으로 공개하길 원했다. PyTorch 모델과 ffmpeg, 상주 Seed-VC worker를 CPU로 돌리므로 Cloudflare Workers나 Pages에는 올릴 수 없다. Cloudflare Access(이메일 인증)를 제안했으나 사용자가 로그인 없이 공개하기로 정했다.

## Decision

1. 서버는 이 PC에서 `127.0.0.1:8000`으로 실행하고, 전용 Cloudflare Tunnel `voice-killer`(ID `2ea39bb9-22af-4ebf-b631-0be6b27e368f`)가 `vk.leonamin.com`을 연결한다. 설정은 `~/.cloudflared/voice-killer.yml`이다.
2. 배포는 `sudo scripts/deploy.sh`가 `/opt/voice-killer/releases/<UTC 시각>`에 스냅샷을 만들고 `current` 링크를 바꾼 뒤 재시작한다. venv는 절대 경로에 묶여 복사하지 않고, `.venv-seedvc`·`models`·`vendor`는 저장소를 링크한다. 최근 5개 릴리스만 남긴다.
3. systemd 서비스 `voice-killer-web`과 `voice-killer-tunnel`이 부팅 시 자동 시작된다.
4. 인증은 두지 않는다.

## Consequences

HTTPS가 Cloudflare에서 처리되어 자체 서명 인증서 없이 마이크를 쓸 수 있다. 주소를 아는 누구나 이 PC의 CPU로 추출·변환을 돌릴 수 있고, 서버는 한 번에 한 요청만 처리하므로 한 사용자가 다른 사용자를 막을 수 있다. 업로드는 무료 플랜 한도 100 MB다. 남용 시 `sudo systemctl stop voice-killer-tunnel`로 닫는다. 실존 인물 목소리 변환 결과는 공개 서비스에서 합성 음성 표시 외의 통제가 없다.

후속 과제(미확정): 기존 hamsbox 터널(대시보드 관리)에 호스트를 합쳐 전용 터널을 없앨지, Cloudflare Access나 앱 로그인을 붙일지. 외부 주소에서 업로드·처리·실시간 기능은 실행해 확인하지 않았고, 루트 `/`가 200을 돌려주는 것만 확인했다.
