---
type: Log
title: "vk.leonamin.com 공개 배포"
description: "vk.leonamin.com 공개 배포"
okf_version: "0.1"
timestamp: 2026-10-21
---

# vk.leonamin.com 공개 배포

- 결정: Cloudflare Tunnel로 `vk.leonamin.com`을 인증 없이 공개한다 (ADR 006). ADR 003의 공개 배포 금지 문구를 대체했다.
- 구현: `scripts/deploy.sh`(`/opt/voice-killer` 릴리스 배포)와 systemd 서비스 2개를 추가했다.
- 확인: 외부 주소 `/`가 200과 앱 HTML을 반환했다.
- 미확인: 외부 주소에서의 업로드·처리·실시간 동작, 기존 터널 통합 여부.

- 추가: decisions/006-public-deployment.md, logs/2026-10-21-public-deployment.md
- 갱신: decisions/003-web-demo-scope.md, decisions/index.md, concepts/roadmap.md, logs/index.md
