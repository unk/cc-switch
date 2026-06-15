# 미해결 검증 / 결정 사항

## settings.json `env` 인증 실측 (미해결)

- **질문**: `~/.cc-switch/<alias>/settings.json` 의 `env`에 넣은
  `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_BASE_URL` 이 실제 인증·라우팅에 적용되는가?
- **현재 상태**: 실제 게이트웨이 토큰 부재로 **실모델 검증 미실시.**
- **현재 구현(1차 방식)**: `settings.json env`에 `AUTH_TOKEN`/`BASE_URL`을 기록하고,
  런처는 `CLAUDE_CONFIG_DIR`만 export한다.
- **검증 방법**: 실제 토큰 확보 시 `cc-glm` 프로필을 만들고 `cc-glm`으로 실행해
  게이트웨이 라우팅·인증이 되는지 확인.

### 폴백 경로 (검증 실패 시)

`settings.json env`가 인증에 안 먹히면 런처가 env를 직접 export하도록 전환한다:

- `src/installers/script.ts`의 `buildScript`에 `export ANTHROPIC_*` 추가.
- `apply`에서 spec의 secret을 스크립트에 전달하도록 분기.
- 이 경우 토큰이 스크립트에 노출되므로 **스크립트 방식만 사용 + 0600 제한**으로 절충
  (alias 방식은 rc 평문 노출 위험이라 폴백에서는 배제).

## 소형 모델 변수

- 입력값을 **`ANTHROPIC_SMALL_FAST_MODEL`** 로 기록 (대화형 라벨과 일치).
- 이 변수는 deprecated → 동작하지 않으면 `ANTHROPIC_DEFAULT_HAIKU_MODEL` 병기/전환.

## 배포 관련 남은 작업

- `npm publish` (npm 로그인 필요 — 사용자 액션). 패키지명은 스코프
  `@naram/cc-switch` 이므로 **`npm publish --access=public`** 으로 발행
  (무스코프 `cc-switch`는 기존 `ccswitch`와 유사하다는 이유로 npm이 거부함).
- 패키지명은 스코프이지만 설치 후 실행 명령은 `cc-switch` 그대로다.
- 버전 정책(semver) 확정.
- (선택) fish 실측(현재 코드만 존재), CI(GitHub Actions) 추가.
