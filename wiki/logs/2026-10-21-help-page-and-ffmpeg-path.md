---
type: Log
title: "사용법 페이지와 서비스 ffmpeg PATH 수정"
description: "사용법 페이지와 서비스 ffmpeg PATH 수정"
okf_version: "0.1"
timestamp: 2026-10-21
---

# 사용법 페이지와 서비스 ffmpeg PATH 수정

- 장애: vk.leonamin.com에서 추출·제거·변환이 500이었다. systemd 서비스의 PATH에 `ffmpeg`(`~/.local/bin`)가 없어 업로드 디코딩이 `FileNotFoundError`로 실패했다. 소스·참조는 브라우저 처리라 동작했다.
- 수정: `/etc/systemd/system/voice-killer-web.service`에 `Environment=PATH=/home/leonamin/.local/bin:/usr/local/bin:/usr/bin:/bin`을 추가하고 재시작했다. 유닛 파일은 저장소 밖이다.
- 확인: 서버 PC의 `127.0.0.1:8000`에서 5초 샘플로 추출·제거·변환(품질 4, 약 20초)이 모두 200이었다.
- 미확인: 외부 주소에서의 동작, 결과 음질.
- 추가: 웹 `#/help` 사용법 페이지(`web/src/Help.tsx`, 스크린샷 `web/src/manual/`). 아직 `deploy.sh`로 배포하지 않았다.
- 한계: 스크린샷은 데모 파일(잡스 60초)로 찍었고 변환 결과 화면은 포함하지 않았다.
