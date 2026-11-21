# Repositories

The project is split into seven repos in the [sweg9](https://github.com/sweg9) organization.

| Repo | Role |
|---|---|
| [dataset](https://github.com/sweg9/dataset) | Photos of switch panels and their labels for the detector: collection, drafting boxes, correction |
| [ai-engine](https://github.com/sweg9/ai-engine) | Recognition and checking, run in the Nitro Enclave on AWS: YOLO11n control detector, Linker (which device a key runs), MobileNet result check, motion planner |
| [backend-server](https://github.com/sweg9/backend-server) | FastAPI backend in two run modes: `server` (on k3s on AWS EC2) for the API, the web app and monitoring; `hub` (a laptop at home) for the records, the orchestrator, channel adapters, safety gate, dashboard and the hand. The models and the autonomy policy run in a Nitro Enclave on the same EC2 instance. See [Stack](/overview/stack) |
| [sim-demo](https://github.com/sweg9/sim-demo) | Unity simulator, an auxiliary tool for the rough demo and for tests without the real hardware |
| [live-demo](https://github.com/sweg9/live-demo) | The one front end: the resident's web app and the presenter's demo screens |
| [docs](https://github.com/sweg9/docs) | This wiki |
| [harness](https://github.com/sweg9/harness) | Standards, shared skills, CI/CD, and the test and evaluation harness |

## How they relate

```text
dataset ──> ai-engine ──> backend-server ──> live-demo (web app)
                               ▲
                               └── sim-demo (WebSocket, stands in for the hand)
harness: build, test and release checks for every repo
```

- Photos and labels in `dataset` train and evaluate the detector in `ai-engine`.
- `backend-server` calls `ai-engine` on the hub, and stores mappings, routines and the log in the server's database.
- `sim-demo` is meant to connect to the Python hub through a WebSocket and stand in for the real hand (see [Simulator](/product/simulator)).
- Every repo uses the requirement numbers 1 to 12 from the [requirements](/product/requirements).

## Shared skills

Every repo except `docs` mounts `harness` as `skills/` at its root (git submodule), and `.claude/skills` links to it so Claude Code sees the skills. See [Skills](/standards/skills/).

```bash
git clone --recurse-submodules https://github.com/sweg9/<repo>.git
git submodule update --remote skills   # move to the latest skills, then commit
```
