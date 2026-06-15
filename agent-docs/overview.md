# 프로젝트 개요

## 무엇을 만드는가

Claude Code를 **여러 개의 프로필**로 손쉽게 세팅하는 대화형 CLI 도구 (`cc-switch`).

- 배포: `npx @naram/cc-switch` 로 즉시 실행
- 실행하면 대화형 질문을 던지고, 답변대로 환경 설정을 자동 구성
- 결과물: `cc`, `claude-o`, `cc-glm` 같은 명령으로 서로 다른 계정/모델의
  Claude Code를 바로 실행

## 왜 만드는가

여러 Claude 계정(`claude`, `claude-c`, `claude-o`)과 서드파티 모델 연결
(`cc-glm` = GLM 등)을 alias로 운용하는 세팅을, 누구나 대화형으로 따라할 수 있게
자동화해 배포하기 위함.

## "프로필"의 정의 (중요)

Claude Code에는 **공식적인 "프로필" 기능이 없다.** 본 프로젝트의 "프로필"이란:

> **격리된 `CLAUDE_CONFIG_DIR` + (선택) 커스텀 모델 env + 실행 런처(alias/스크립트)**
> 의 묶음.

즉 이 도구는 community 표준 패턴(`CLAUDE_CONFIG_DIR` 격리 + 셸 런처)을 자동화하는
래퍼다. 자세한 메커니즘은 [claude-code-internals.md](./claude-code-internals.md) 참고.

## 명령어 (서브커맨드)

| 커맨드             | 설명                                               |
| ------------------ | -------------------------------------------------- |
| `create` (기본)    | 대화형 프로필 생성 (기존 alias 재실행 시 업데이트) |
| `list`             | 등록된 프로필 목록                                 |
| `remove <alias>`   | 프로필 제거 (런처 정리; config dir은 확인 후 삭제) |
| `doctor`           | claude 설치 / PATH / 프로필 상태 점검              |
| `help` / `version` | 도움말 / 버전                                      |

> `edit`은 별도 구현하지 않고 `create`의 upsert(기존 alias 재실행 시 갱신)로 대체한다.

## 요구 사항 / 범위

- Node.js **18+**
- **macOS / Linux** (Windows/PowerShell은 v1 범위 외)
- 셸: **zsh / bash / fish**
- `claude`(Claude Code) 설치 필요 — 미설치 시 프로필은 생성되나 실행 전 설치 필요

## 산출물 위치 (요약)

- 프로필 루트: `~/.cc-switch/`
- 중앙 레지스트리: `~/.cc-switch/profiles.json` (0600, **비밀 미저장**)
- 프로필별 `CLAUDE_CONFIG_DIR`: `~/.cc-switch/<alias>/` (그 안에 `settings.json` 0600)
- 런처: alias(셸 rc 마커 블록) / 스크립트(`~/.local/bin/<alias>`)

자세한 레이아웃·설계는 [architecture.md](./architecture.md) 참고.
