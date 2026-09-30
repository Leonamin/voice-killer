# Wiki Structure

- Wiki path: ./wiki
- Format: OKF v0.1 style Markdown with YAML frontmatter
- Index policy: Every wiki directory contains index.md
- Change log: ./wiki/logs/

## Directory map

- concepts/: 프로젝트 요구사항, 처리 구조, PoC와 평가 계획
- decisions/: 번호가 있는 ADR 형식의 결정 기록
- references/: 대화 출처와 선행 연구 후보
- logs/: 날짜·주제별 변경 이력

## Rules

- 문서 하나에 하나의 주제를 둔다.
- 각 index.md는 바로 아래 문서와 하위 디렉터리의 index.md만 연결한다.
- 새 문서와 디렉터리는 해당 index.md에 등록한다.
- logs/ 문서는 YYYY-MM-DD-kebab-case.md로 작성하고 최신순으로 등록한다.
- decisions/ 문서는 NNN-kebab-case.md로 작성한다.
- 대화에서 보고된 사실, 프로젝트 결정, 실험 검증 결과를 구분한다.
- 문서에 없는 수치나 모델 실행 결과를 추정해 확정하지 않는다.
