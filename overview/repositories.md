# Repositories

The project is split into seven repos in the [sweg9](https://github.com/sweg9) organization.

| Repo | Role |
|---|---|
| [dataset](https://github.com/sweg9/dataset) | Data for training and evaluation: collection, cleaning, labeling |
| [ai-engine](https://github.com/sweg9/ai-engine) | AI models: switch recognition, device mapping, intent inference, state check, manipulation planning |
| [backend-server](https://github.com/sweg9/backend-server) | Server and Redis: API, mapping registry, routine engine, execution logs |
| [sim-demo](https://github.com/sweg9/sim-demo) | Simulator demo in Unity: a robot in a house shows the whole process from recognition to learning |
| [live-demo](https://github.com/sweg9/live-demo) | Demo front end that runs a real camera together with the AI |
| [docs](https://github.com/sweg9/docs) | This wiki: plan, PRD, prompts, API specs, papers |
| [harness](https://github.com/sweg9/harness) | Standards, shared skills, CI/CD, and the test and evaluation harness |

## How they relate

```text
dataset ──> ai-engine ──> backend-server ──> live-demo
                │                 │
                │                 └────────> sim-demo
                └── prompts and evaluation criteria are managed in docs
harness: build, test, evaluation and release gate for every repo
```

- Data from `dataset` is used to build and evaluate the models and prompts in `ai-engine`.
- `backend-server` calls `ai-engine` and stores the results: mappings, channel ranking, execution logs.
- `live-demo` processes a real camera stream through `backend-server` and shows the result.
- `sim-demo` reproduces the same process inside Unity with rules. It is a showcase and runs on its own, without a server.
- Every repo uses the requirement ids (FR, NFR) and metric ids (E1 to E10) defined in the [PRD](/sim-demo/PRD).
- `harness` runs the tests and metric measurements for each requirement.

## Shared skills

Every repo except `docs` mounts `harness` as `skills/` at its root (git submodule), and `.claude/skills` links to it so Claude Code sees the skills. See [Skills](/standards/skills/).

```bash
git clone --recurse-submodules https://github.com/sweg9/<repo>.git
git submodule update --remote skills   # move to the latest skills, then commit
```
