# 대화형 플로우 & 런처 포맷

## 질문 순서 (`create`)

1. **실행 별칭(alias)** : 예 `cc` — 검증: 비어있지 않음 / 셸 유효 이름 / 기존
   명령·프로필과 충돌 여부 경고.
2. **커스텀 모델 설정? (y/n)**
   - **(y)**
     - 인증 방식: `AUTH_TOKEN(Bearer)` / `API_KEY(x-api-key)` — 기본 AUTH_TOKEN.
     - **BASE URL** : 예 `https://api.z.ai/api/anthropic`
     - **AUTH TOKEN / API KEY** : 마스킹 입력
     - **MODEL** : 예 `glm-5.1`
     - **SMALL FAST MODEL** (엔터 시 생략) : 예 `glm-4.5-air`
   - **(n)** : 표준 Claude 계정. 격리 config dir만 만들고 첫 실행 시 `claude`
     로그인. (선택) 고정 모델 지정.
3. **실행 방식** : alias / 래퍼 스크립트 / 둘 다.
   - (스크립트 선택 시) 설치 경로(기본 `~/.local/bin`), PATH 포함 여부 점검.
4. **요약 확인** → 적용.
5. 적용 후 안내: alias는 새 셸 또는 `source <rc>` 필요. 첫 실행/로그인 방법 안내.

## 검증 / 엣지 케이스

- `claude` 설치 여부 점검 → 없으면 경고/안내.
- 동일 alias 재실행 → 덮어쓰기(업데이트) 확인. **idempotent** 처리.
- alias가 기존 셸 명령/실행파일과 충돌하는지 점검 (`command -v`).
- rc 파일 수정 전 백업 생성 (`<rc>.cc-switch.bak`).
- 시크릿: 입력 마스킹, 화면에 토큰 재출력 금지, 파일 0600.
- fish는 alias 문법이 다름 → `env` 프리픽스로 별도 처리.
- Windows(PowerShell)는 v1 범위 외.

## alias 마커 블록 (idempotency)

```bash
# >>> cc-switch: cc >>>
alias cc='CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc" claude'
# <<< cc-switch: cc <<<
```

같은 alias 재설정 시 해당 블록만 교체, 제거 시 블록만 삭제.
경로는 `$HOME` 상대로 렌더한다. fish는 `alias cc 'env CLAUDE_CONFIG_DIR=... claude'`.

## 래퍼 스크립트 포맷

```sh
#!/bin/sh
# cc-switch launcher: cc
export CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc"
exec claude "$@"
```

- 권한 0755. 첫 줄의 `# cc-switch launcher:` 마커로 **우리 스크립트만** 덮어쓰기
  (외부 동명 파일 클로버 방지).
- 폴백 시(시크릿 흐름 검증 실패)에는 여기에 `export ANTHROPIC_*` 를 추가하고
  스크립트만 사용 + 0600 제한. [open-questions.md](./open-questions.md) 참고.

## 대화형 테스트 (PTY / expect)

대화형 플로우를 자동 검증할 때 주의점:

- 이 환경의 pty가 `columns=0` 이면 clack이 글자마다 줄바꿈한다 →
  `set stty_init "columns 100 rows 30"` 필수.
- select/multiselect는 **마지막 옵션이 렌더된 뒤** 키를 전송해야 핸들러 레이스를
  피한다.
- 실행 대상은 번들된 **`dist/index.js`** (빌드 후 검증).
- 헤드리스(비대화형) 검증: `apply.ts`의 순수 함수 + `CC_SWITCH_HOME` 격리.
  통합 테스트는 생성된 래퍼 스크립트를 **가짜 `claude`로 실제 실행**해
  `CLAUDE_CONFIG_DIR` export까지 확인한다.
