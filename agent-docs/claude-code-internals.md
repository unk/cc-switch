# Claude Code 설정 메커니즘

> 출처: code.claude.com/docs (env-vars, model-config, settings, authentication,
> llm-gateway). 이 도구가 의존하는 Claude Code 동작의 배경 지식.

## `CLAUDE_CONFIG_DIR` — 격리의 핵심

- Claude Code의 모든 설정/자격증명/세션/히스토리 저장 위치. 기본값 `~/.claude`.
- **계정·세션 완전 격리됨**:
  - macOS: config dir 경로의 SHA-256 해시로 Keychain 항목을 분리 → 디렉토리마다
    독립 인증.
  - Linux/Windows: `<CONFIG_DIR>/.credentials.json` (0600)에 분리 저장.
  - 세션 트랜스크립트/히스토리/상태도 전부 이 디렉토리에 귀속.
- 공식 문서에 일부 언급되나 "다계정용"으로 정식 마케팅된 기능은 아님 (사실상 표준 관행).

## 커스텀 모델 / 서드파티 게이트웨이 env

| 변수                                         | 용도                                         | 비고                                                         |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `ANTHROPIC_BASE_URL`                         | 요청을 게이트웨이로 라우팅 (Messages 포맷)   | 예: `https://api.z.ai/api/anthropic`                         |
| `ANTHROPIC_AUTH_TOKEN`                       | `Authorization: Bearer` 헤더로 전송          | 게이트웨이/프록시 베어러 토큰용                              |
| `ANTHROPIC_API_KEY`                          | `X-Api-Key` 헤더로 전송                      | Anthropic 직접 호출용. **설정 시 AUTH_TOKEN보다 우선**       |
| `ANTHROPIC_MODEL`                            | 세션 기본 모델 override                      | `glm-5.1` 등                                                 |
| `ANTHROPIC_SMALL_FAST_MODEL`                 | 소형/빠른 모델                               | **deprecated** → 신규는 `ANTHROPIC_DEFAULT_HAIKU_MODEL` 권장 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL`              | `haiku` 별칭 매핑 (소형 모델 권장 경로)      |                                                              |
| `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` | 게이트웨이 `/v1/models`로 `/model` 목록 채움 | `1`                                                          |

**인증 주의**: `ANTHROPIC_API_KEY`와 `ANTHROPIC_AUTH_TOKEN`을 동시에 채우면 충돌.
베어러 토큰 방식이면 `ANTHROPIC_API_KEY`는 비어 있어야 한다. (환경에 전역으로
`ANTHROPIC_API_KEY`가 export 돼 있으면 Bearer 토큰보다 우선하므로 해제 필요.)

## `settings.json`

- 위치 우선순위(높음→낮음): managed > project local
  (`.claude/settings.local.json`) > project (`.claude/settings.json`) > user
  (`<CONFIG_DIR>/settings.json`).
- **user settings.json은 `CLAUDE_CONFIG_DIR` 안에 위치** → 프로필별 격리 디렉토리에
  두면 그 프로필 전용 설정이 된다.
- `env` 키로 환경변수 주입, `model` 키로 모델 고정 가능:
  ```json
  {
    "env": {
      "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
      "ANTHROPIC_AUTH_TOKEN": "<token>",
      "ANTHROPIC_MODEL": "glm-5.1",
      "ANTHROPIC_SMALL_FAST_MODEL": "glm-4.5-air"
    }
  }
  ```

## 다계정 운용 표준 패턴

```bash
alias claude-personal='CLAUDE_CONFIG_DIR=~/.claude-personal claude'
alias cc-glm='CLAUDE_CONFIG_DIR=~/.cc-glm \
  ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic \
  ANTHROPIC_AUTH_TOKEN=<token> claude'
```

본 도구는 이 패턴을 자동 생성하되, 토큰은 rc 파일에 평문 노출하지 않도록
`settings.json`으로 분리한다 (시크릿 흐름은 [architecture.md](./architecture.md) 참고).
