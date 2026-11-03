# docs

Documentation repo for a project that recognizes wall switches with a camera, operates them with a robot arm, and connects them to proactive home routines. The project is split into the seven repos below.

## Wiki

The documents are published as a development wiki at **https://sweg9.github.io/docs/**, with search, a PDF viewer and rendered API specs.

```bash
npm install
npm run dev   # http://localhost:5173/docs/
```

See [contributing.md](contributing.md) for how to add pages, PDFs and API specs.

## Repositories

| Repo | Role |
|---|---|
| [dataset](https://github.com/sweg9/dataset) | Data for training and evaluation: collection, cleaning, labeling |
| [ai-engine](https://github.com/sweg9/ai-engine) | AI models: switch recognition, device mapping, intent inference, state check, manipulation planning |
| [backend-server](https://github.com/sweg9/backend-server) | Server and Redis: API, mapping registry, routine engine, execution logs |
| [sim-demo](https://github.com/sweg9/sim-demo) | Simulator demo (Unity): a robot in a house shows the whole process from recognition to learning |
| [live-demo](https://github.com/sweg9/live-demo) | Demo front end that runs a real camera together with the AI |
| [docs](https://github.com/sweg9/docs) | Plan, PRD and prompt management (this repo) |
| [harness](https://github.com/sweg9/harness) | Standards, skills, CI/CD, and the test and evaluation harness |

## How they relate

```text
dataset ──> ai-engine ──> backend-server ──> live-demo
                │                 │
                │                 └────────> sim-demo
                └── prompts and evaluation criteria are managed in docs
harness: build, test, evaluation and release gate for every repo
```

- Data from `dataset` is used to build and evaluate the models and prompts in `ai-engine`.
- `backend-server` calls `ai-engine` and stores the results (mappings, channel ranking, execution logs).
- `live-demo` processes a real camera stream through `backend-server` and shows the result.
- `sim-demo` reproduces the same process inside Unity with rules. It is a showcase and runs on its own, without a server.
- Every repo uses the requirement ids (FR, NFR) and metric ids (E1 to E10) defined in `docs`.
- `harness` runs the tests and metric measurements for each requirement automatically.

## Documents

| Location | Content |
|---|---|
| [sim-demo/](sim-demo/) | Plan, PRD and prompt management for the simulator demo |

Documents for other repos are added the same way, one folder each.

## Standards

Mandatory standards and shared skills live in [harness](https://github.com/sweg9/harness) (`standards/`). This repo does not mount them. Its rules are summarized in `CLAUDE.md`.

## Language

All documents and text in every repo are written in English. Code comments may be in Korean.
