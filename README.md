# cc-switch

**한국어** | [English](README.en.md)

여러 개의 **Claude Code 프로필**(서로 다른 계정 / 커스텀 모델 게이트웨이)을
대화형으로 손쉽게 세팅해 주는 CLI 도구입니다.

```bash
npx @naram/cc-switch
```

실행하면 몇 가지 질문에 답하는 것만으로 `cc`, `claude-o`, `cc-glm` 같은 명령으로
서로 다른 계정·모델의 Claude Code를 바로 띄울 수 있게 됩니다.

---

## "프로필"이란?

Claude Code에는 공식 "프로필" 기능이 없습니다. 이 도구가 말하는 프로필은:

> **격리된 `CLAUDE_CONFIG_DIR`** + (선택) **커스텀 모델 env** + **실행 런처(alias/스크립트)** 의 묶음

`CLAUDE_CONFIG_DIR`는 Claude Code의 모든 설정·자격증명·세션·히스토리가 저장되는
위치입니다. 프로필마다 이 디렉토리를 분리하면 **계정과 세션이 완전히 격리**됩니다
(macOS는 디렉토리 경로 해시로 Keychain 항목까지 분리됨).

---

## 빠른 시작

```bash
# 대화형으로 프로필 생성
npx @naram/cc-switch

# 또는 전역 설치 후
npm i -g @naram/cc-switch
cc-switch            # = cc-switch create
cc-switch list
cc-switch doctor
cc-switch remove cc-glm
```

### 예시 1 — 표준 계정 추가

```
alias        : cc-o
custom model : No
launchers    : alias
```

→ 새 셸에서 `cc-o` 를 실행하면, 메인 계정과 분리된 환경에서 Claude Code가 뜨고
처음 한 번 로그인하면 그 프로필에 자격증명이 귀속됩니다.

### 예시 2 — 커스텀 게이트웨이(GLM 등)

```
alias            : cc-glm
custom model     : Yes
auth method      : AUTH_TOKEN (Bearer)
base URL         : https://api.z.ai/api/anthropic
auth token       : ********           (입력 마스킹)
model            : glm-5.1
small fast model : glm-4.5-air
launchers        : alias + script
```

→ `cc-glm` 명령으로 해당 게이트웨이/모델에 연결된 Claude Code가 즉시 실행됩니다.

---

## 명령어

| 명령                             | 설명                                                    |
| -------------------------------- | ------------------------------------------------------- |
| `cc-switch` / `cc-switch create` | 대화형 프로필 생성 (기존 alias 재실행 시 업데이트)      |
| `cc-switch list`                 | 등록된 프로필 목록                                      |
| `cc-switch remove <alias>`       | 프로필 제거 (런처 정리; config 디렉토리는 확인 후 삭제) |
| `cc-switch doctor`               | claude 설치 / PATH / 프로필 상태 점검                   |
| `cc-switch help`                 | 도움말                                                  |

---

## 무엇이 어디에 생성되나

```
~/.cc-switch/
├── profiles.json          # 중앙 레지스트리 (메타데이터, 0600) — 비밀은 저장 안 함
├── cc-glm/                # 프로필의 CLAUDE_CONFIG_DIR
│   ├── settings.json      # env(BASE_URL/AUTH_TOKEN/MODEL...) — 0600
│   └── ...                # (로그인 후) 자격증명·세션·히스토리
└── cc-o/
    └── settings.json
```

런처:

- **alias** — 셸 rc 파일(`~/.zshrc` 등)에 마커 블록으로 주입
  ```bash
  # >>> cc-switch: cc-glm >>>
  alias cc-glm='CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc-glm" claude'
  # <<< cc-switch: cc-glm <<<
  ```
- **script** — 실행 파일(기본 `~/.local/bin/<alias>`):
  ```sh
  #!/bin/sh
  # cc-switch launcher: cc-glm
  export CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc-glm"
  exec claude "$@"
  ```

---

## 보안 설계

- **토큰/API 키는 런처(rc·스크립트)에 절대 노출되지 않습니다.** 오직 해당 프로필의
  `settings.json`(`env`)에만 저장되며 파일 권한은 `0600`입니다.
- 런처는 `CLAUDE_CONFIG_DIR`만 export하고 `claude`를 실행합니다.
- 중앙 `profiles.json`에는 재구성을 위한 메타데이터만 저장하고 **비밀은 저장하지 않습니다.**
- rc 파일을 수정하기 전에 항상 백업(`<rc>.cc-switch.bak`)을 만듭니다.
- 입력 시 토큰은 마스킹되며 화면에 다시 출력하지 않습니다.

> **참고 (AUTH_TOKEN 사용 시):** 환경에 `ANTHROPIC_API_KEY`가 전역으로 export 되어
> 있으면 Bearer 토큰보다 우선합니다. 토큰 방식 프로필을 쓸 때는 전역 `ANTHROPIC_API_KEY`를
> 해제해 두세요.

---

## 요구 사항

- Node.js **18+**
- **macOS / Linux** (Windows/PowerShell은 현재 범위 외)
- 셸: **zsh / bash / fish**
- [Claude Code](https://claude.com/claude-code) (`claude`) 설치 — 미설치 시 프로필은
  만들어지지만 실행 전 설치가 필요합니다.

적용 후 alias는 **새 셸을 열거나** `source ~/.zshrc` 를 실행해야 반영됩니다.

---

## 제거 / 정리

```bash
cc-switch remove <alias>      # alias·스크립트·레지스트리 정리 (config dir은 확인 후)
```

수동으로 모두 지우려면 rc 파일의 `# >>> cc-switch: ... >>>` 블록, `~/.local/bin/<alias>`,
`~/.cc-switch/<alias>/` 를 삭제하면 됩니다.

---

## 개발

```bash
npm install
npm run build       # tsup 번들 → dist/index.js
npm test            # vitest
npm run lint        # tsc --noEmit + prettier --check
```

## 라이선스

MIT
