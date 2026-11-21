# docs

Documentation for **NOVA: Non-connected Object Vision and Actuation for Smart Home Routines**: a camera finds wall switches, toggles and power strips, the system works out which device each one operates, and routines use them through wireless channels or, when those fail, a physical press by a robot (linear actuators on a cart in the prototype). The reference document is the [proposal](public/papers/proposal.pdf).

## Wiki

The documents are published as a development wiki at **https://sweg9.github.io/docs/**, with search, a PDF viewer and rendered API specs.

```bash
npm install
npm run dev   # http://localhost:5173/docs/
```

See [contributing.md](contributing.md) for how to add pages, PDFs and API specs.

## Contents

| Folder | Content |
|---|---|
| [overview/](overview/) | Introduction, architecture, stack, related work, team, repositories |
| [product/](product/) | Requirements 1 to 12, development environment, models, simulator |
| [dataset/](dataset/) | Labeling spec for the switch-panel dataset |
| [api/](api/) | API conventions and the draft backend spec (`public/api/`) |
| [papers/](papers/) | The proposal (`public/papers/`) |

Standards and skills are not stored here. The wiki copies them from [harness](https://github.com/sweg9/harness) at build time.

## Repositories

| Repo | Role |
|---|---|
| [dataset](https://github.com/sweg9/dataset) | Photos of switch panels and their labels for the detector |
| [ai-engine](https://github.com/sweg9/ai-engine) | All recognition on the hub: detectors, state classifier, result check, fingerprints, motion planner |
| [backend-server](https://github.com/sweg9/backend-server) | FastAPI backend in two run modes: `server` (on k3s on AWS EC2) for the API, the web app and monitoring; `hub` (a laptop at home) for the records, the orchestrator, channel adapters, safety gate, dashboard and the hand. The models and the autonomy policy run in a Nitro Enclave on the same EC2 instance |
| [sim-demo](https://github.com/sweg9/sim-demo) | Unity simulator, an auxiliary tool for the rough demo and tests without the real hardware |
| [live-demo](https://github.com/sweg9/live-demo) | The one front end: the resident's web app and the presenter's demo screens |
| [docs](https://github.com/sweg9/docs) | This wiki |
| [harness](https://github.com/sweg9/harness) | Standards, shared skills, CI/CD, and the test and evaluation harness |

## Language

All documents and text in every repo are written in English. Code comments may be in Korean.
