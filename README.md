# docs

카메라로 벽 스위치를 인식하고 로봇 팔로 조작해 선제적 홈 루틴에 연결하는 프로젝트의 문서 레포다. 프로젝트는 아래 7개 레포로 나뉜다.

## 레포 구성

| 레포 | 역할 |
|---|---|
| [dataset](https://github.com/sweg9/dataset) | 학습과 평가에 쓰는 데이터. 수집, 정제, 라벨링 |
| [ai-engine](https://github.com/sweg9/ai-engine) | AI 모델 쪽. 스위치 인식, 기기 매핑, 의도 추론, 상태 확인, 조작 계획 |
| [backend-server](https://github.com/sweg9/backend-server) | 서버와 Redis. API, 매핑 저장소, 루틴 엔진, 실행 로그 |
| [sim-demo](https://github.com/sweg9/sim-demo) | 시뮬레이터 데모(Unity). 집 안 로봇이 인식부터 학습까지 전체 과정을 보여 줌 |
| [live-demo](https://github.com/sweg9/live-demo) | 실제 카메라와 AI를 붙여 돌리는 데모 프론트 |
| [docs](https://github.com/sweg9/docs) | 기획서, PRD, 프롬프트 관리 문서 (이 레포) |
| [cicd-harness](https://github.com/sweg9/cicd-harness) | CI/CD와 테스트·평가 하네스 |

## 관계

```text
dataset ──> ai-engine ──> backend-server ──> live-demo
                │                 │
                │                 └────────> sim-demo
                └── 프롬프트·평가 기준은 docs 에서 관리
cicd-harness: 모든 레포의 빌드, 테스트, 평가, 배포
```

- `dataset`의 데이터로 `ai-engine`의 모델과 프롬프트를 만들고 평가한다.
- `backend-server`가 `ai-engine`을 호출하고 결과(매핑, 채널 순위, 실행 로그)를 저장한다.
- `live-demo`는 `backend-server`를 통해 실제 카메라 영상을 처리하고 결과를 보여 준다.
- `sim-demo`는 같은 과정을 Unity 안에서 규칙으로 재현하는 시연용 데모이며, 서버 없이 단독으로 돌아간다.
- `docs`의 요구사항 번호(FR, NFR)와 지표 번호(E1~E10)를 모든 레포가 같이 쓴다.
- `cicd-harness`가 요구사항별 테스트와 지표 측정을 자동으로 돌린다.

## 문서

| 위치 | 내용 |
|---|---|
| [sim-demo/](sim-demo/) | 시뮬레이터 데모의 기획서, PRD, 프롬프트 관리 |

다른 레포의 문서도 같은 방식으로 폴더를 하나씩 추가한다.

## Standards

Mandatory standards and shared skills live in [cicd-harness](https://github.com/sweg9/cicd-harness) (`standards/`). This repo does not mount them. Its rules are summarized in `CLAUDE.md`.
