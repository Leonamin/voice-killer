---
type: Decision
title: "ADR 002: REAL-TSE와 강한 마스킹을 기본 구현으로 선택"
description: "ADR 002: REAL-TSE와 강한 마스킹을 기본 구현으로 선택"
okf_version: "0.1"
timestamp: 2026-09-30
---

# ADR 002: REAL-TSE와 강한 마스킹을 기본 구현으로 선택

## Status

Accepted — 2026-09-30 실제 파일 실험에 따른 선택.

## Context

사용자는 잡스의 최초 아이폰 발표에서 잡스 발화를 뭉개고 박수·환호를 남기는 실행 도구와 실제 음원을 요구했다. 현재 WeSep 본 저장소는 공식 사전학습 패키지가 준비 중이고 REAL-TSE 저장소에는 실행 예제와 공개 체크포인트가 있다.

## Decision

REAL-TSE `spk_emb_100`을 등록 음성 조건부 추출기로 사용한다. 기본 억제는 비율을 정규화한 p=4 시간·주파수 마스크와 대상 비율 q>=0.65 bin의 완전 차단이다. 전체 파일 후반에서 soft-only 처리의 아주 작은 발화가 ASR에 남아 threshold 보정을 추가했다. 단순 subtraction과 약한 마스크는 비교용으로 유지한다. 첫 검증 환경은 로컬 M4 Max CPU다.

## Consequences

실제 파일 변환이 가능하고 특정 화자를 등록 음성으로 지정한다. 모델은 16 kHz 모노이며 일부 환호도 훼손한다. 결과를 전체 화자·언어에 일반화하지 않는다. 2초 PCM 스트림 실험은 추가하되 저지연 하드웨어 데모로 표현하지 않는다.
