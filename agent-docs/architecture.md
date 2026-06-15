# 아키텍처

## 확정된 설계 결정

| 항목                    | 결정                                                         |
| ----------------------- | ------------------------------------------------------------ |
| 구현 스택               | **TypeScript** (Node.js, ESM)                                |
| 실행 방식               | **alias + 래퍼 스크립트** (프로필마다 선택)                  |
| 설정 격리               | 프로필마다 **`CLAUDE_CONFIG_DIR`** (`~/.cc-switch/<alias>/`) |
| 시크릿 보관             | 프로필 격리 디렉토리의 `settings.json` `env` (0600)          |
| 패키지명                | **`@naram/cc-switch`** (실행 명령은 `cc-switch`)             |
| 프롬프트 라이브러리     | **`@clack/prompts`**                                         |
| 빌드 도구               | **`tsup`** (deps 인라인 번들 → `npx` 단독 실행)              |
| 시크릿 단일 출처        | `settings.json`만 보관, 레지스트리엔 비밀 제외 메타만        |
| 래퍼 스크립트 기본 경로 | **`~/.local/bin`** (설치 시 변경 가능)                       |
| 레지스트리 위치         | **`~/.cc-switch/profiles.json`**                             |
| Windows 지원            | **v1 제외** (macOS/Linux 우선)                               |
| 소형 모델 변수          | `ANTHROPIC_SMALL_FAST_MODEL` 로 기록 (대화형 라벨과 일치)    |

## 디렉토리 레이아웃 (런타임 산출물)

```
~/.cc-switch/                        # 도구가 관리하는 루트
├── profiles.json                    # 중앙 레지스트리 (메타, 0600)
├── cc/                              # 프로필 "cc"의 CLAUDE_CONFIG_DIR
│   ├── settings.json                # env(BASE_URL/AUTH_TOKEN/MODEL...) 0600
│   ├── .credentials.json            # (Claude 로그인 시 생성, Linux/Win)
│   └── ...                          # 세션/히스토리
└── cc-glm/
    └── settings.json
```

런처 산출물:

- **alias** → 사용자 셸 rc 파일에 마커 블록으로 주입
- **스크립트** → `~/.local/bin/<alias>` (기본, 변경 가능)에 실행 파일(0755) 생성

포맷 상세는 [interactive-flow.md](./interactive-flow.md) 참고.

## 소스 구조

```
src/
├── index.ts            # 엔트리: CLI 인자 파싱 → 서브커맨드 디스패치
├── commands/
│   ├── create.ts       # 대화형 생성 (@clack/prompts, 기본 동작)
│   ├── list.ts
│   ├── remove.ts
│   └── doctor.ts
├── core/
│   ├── profile.ts      # Profile 타입 정의
│   ├── registry.ts     # ~/.cc-switch/profiles.json 읽기/쓰기 (0600)
│   ├── settings.ts     # 프로필별 settings.json 생성 (managed env 키만 관리)
│   ├── apply.ts        # 생성 부수효과를 순수 함수로 분리 (헤드리스 테스트 가능)
│   └── paths.ts        # 경로 계산 (CC_SWITCH_HOME override 지원 → 테스트 격리)
├── installers/
│   ├── shell.ts        # 셸/rc 탐지 (zsh/bash/fish) + 충돌 점검 + PATH
│   ├── alias.ts        # rc 마커 블록 idempotent 주입/제거 + 백업
│   └── script.ts       # 래퍼 스크립트 생성/삭제 (ours-마커로 클로버 방지)
└── util/{fs,log,validate}.ts
test/                   # vitest (registry/settings/alias/script/validate/doctor + apply 통합)
```

## 데이터 모델

```ts
interface Profile {
  alias: string; // 실행 명령 이름 (예: "cc")
  configDir: string; // CLAUDE_CONFIG_DIR 절대경로
  custom: boolean; // 커스텀 모델 여부
  baseUrl?: string; // custom일 때
  authMethod?: 'token' | 'apiKey';
  // 토큰 자체는 settings.json에만 저장 (레지스트리 비저장)
  model?: string;
  smallFastModel?: string;
  launchers: ('alias' | 'script')[];
  scriptPath?: string; // script 런처일 때
  shellRc?: string; // alias 주입한 rc 경로 (제거 시 사용)
  createdAt: string; // ISO
}
```

## 시크릿 흐름 (핵심 설계)

1. 토큰/모델/BASE_URL 등 민감·설정값은 **`~/.cc-switch/<alias>/settings.json`의
   `env`** 에만 저장 (0600).
2. 런처(alias/스크립트)는 **`CLAUDE_CONFIG_DIR`만 export**하고 `claude` 실행.
3. 따라서 rc 파일/스크립트에는 토큰이 들어가지 않는다.
4. 중앙 `profiles.json`에는 재구성용 메타만 저장하고 **비밀은 저장하지 않는다.**

> ⚠️ `settings.json`의 `env`가 인증·라우팅에 실제 적용되는지는 실모델 미검증
> 항목이다. 안 먹히면 런처가 env를 직접 export하는 폴백으로 전환한다.
> [open-questions.md](./open-questions.md) 참고.
