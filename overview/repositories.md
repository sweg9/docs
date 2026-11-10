# Repositories

The project is split into seven repos in the [sweg9](https://github.com/sweg9) organization.

| Repo | Role |
|---|---|
| [dataset](https://github.com/sweg9/dataset) | Photos of switch panels and their labels for the detector: collection, drafting boxes, correction |
| [ai-engine](https://github.com/sweg9/ai-engine) | Recognition and checking: YOLO detector, VLM calls, fingerprints (DINOv2), state check, motion planner |
| [backend-server](https://github.com/sweg9/backend-server) | FastAPI backend: Mapping Registry, routines, log, Control Orchestrator, channel adapters, safety gate, learning |
| [sim-demo](https://github.com/sweg9/sim-demo) | Unity simulator, an auxiliary tool for the rough demo and for tests without the real hardware |
| [live-demo](https://github.com/sweg9/live-demo) | Front end used with the real camera and hand |
| [docs](https://github.com/sweg9/docs) | This wiki |
| [harness](https://github.com/sweg9/harness) | Standards, shared skills, CI/CD, and the test and evaluation harness |

## How they relate

```text
dataset ──> ai-engine ──> backend-server ──> web app / live-demo
                               ▲
                               └── sim-demo (WebSocket, stands in for the hand)
harness: build, test and release checks for every repo
```

- Photos and labels in `dataset` train and evaluate the detector in `ai-engine`.
- `backend-server` calls `ai-engine` and the cloud VLM, and stores mappings, routines and the log.
- `sim-demo` is meant to connect to the Python hub through a WebSocket and stand in for the real hand (see [Simulator](/product/simulator)).
- Every repo uses the requirement numbers 1 to 12 from the [requirements](/product/requirements).

## Shared skills

Every repo except `docs` mounts `harness` as `skills/` at its root (git submodule), and `.claude/skills` links to it so Claude Code sees the skills. See [Skills](/standards/skills/).

```bash
git clone --recurse-submodules https://github.com/sweg9/<repo>.git
git submodule update --remote skills   # move to the latest skills, then commit
```
