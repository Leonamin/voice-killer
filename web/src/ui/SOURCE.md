# Goodcase UI 출처

- manifest name: use-goodcase-ui
- version: 0.1.0
- contentHash: 024b0811bad0fea4a702b29ceadaa9ae3db6e186ac7444c0013469ad40e06a2f
- 복사 범위: `assets/src/components/**`, `assets/src/styles/**` (구조 유지)
- 코드 수정: 없음 (컴파일을 위한 수정이 필요하면 여기에 기록)
- 토큰 연결: `../theme.css`가 `--gc-*`를 `--vk-*`로 덮어쓴다.

## 추가 (2026-11-08)
- `Slider`: use-goodcase-ui 0.1.0 (contentHash cd53a1e75db16d9d866bd2b075de1e3eec8a3e32cea289d6f4779e73e9ecdffc)에서 `slider.tsx`, `basic.css`의 `.gc-slider*` 규칙, `tokens.css`의 `--gc-slider-*` 토큰을 가져왔다.
- 코드 수정: `slider.tsx`의 `FieldProps` import를 `./field`에서 `./index`로 바꿨다(이 복사본에는 `field.ts`가 없음).
- 위 hash는 위의 기존 복사본 hash(024b0811…)와 다르다. 기존 컴포넌트는 그대로 두고 Slider만 추가했다.
