# Modules

::: warning Draft
A first proposal for the layout of the `backend-server` repository. The repository owns its layout and changes this page as it is built.
:::

[Stack](./stack) says that `backend-server` runs in two modes, `hub` and `cloud`. This page says how the code is split so that both modes live in one repository without getting in each other's way, and which module serves which requirement.

## Layout

```text
backend-server/
├── pyproject.toml          uv project; the hub extra pulls in ai-engine
├── settings/
│   ├── hub.yaml            spots, rooms, RAL choice, camera, time limits
│   ├── cloud.yaml          thresholds, weights, habit rule, backup, time zone
│   └── risk.yaml           risk sorting of device types (FR-06)
├── src/backend/
│   ├── cli.py              `backend hub`, `backend cloud`, `backend export-runs`, `backend seed-demo`
│   ├── common/             used by both modes
│   ├── hub/                runs on the laptop
│   └── cloud/              runs on EC2
├── migrations/             Alembic, cloud only
├── firmware/               Arduino sketch for the actuators
├── scripts/                backup.sh (EC2 cron), pull_backup.sh (hub)
├── deploy/                 Dockerfile, compose.yaml, Caddyfile
└── tests/
    ├── common/  hub/  cloud/
    └── contract/           hub messages and the OpenAPI spec
```

## Import rules

| Module | May import | Never imports |
|---|---|---|
| `common` | Pydantic, the standard library | `hub`, `cloud`, `ai_engine` |
| `hub` | `common`, `ai_engine` | `cloud` |
| `cloud` | `common` | `hub`, `ai_engine` |

The two modes talk only through the [hub messages](/api/hub-messages), whose models are in `common`. So the cloud image needs no YOLO and no PyTorch and stays small, and the hub can be tested without a database. A test in `tests/` checks the rules with `import-linter`.

## `common`

| File | Content | Source |
|---|---|---|
| `vocab.py` | Enumerations with the exact spelling of the data model: stages, control kinds, statuses, channels, risk, results | [Data model](/standards/data-model), C-02 |
| `messages.py` | Pydantic models of the envelope and every hub message payload | [Hub messages](/api/hub-messages) |
| `runlog.py` | The run entry model and checks for L-01 to L-09 | [Run log](/standards/execution-log) |
| `settings.py` | Loads a YAML settings file into Pydantic models; a missing or unknown key stops the start | C-12 |
| `ids.py` | Prefix and ULID identifiers | [Database](./database#rules-for-every-table) |

## `hub`

One Python process with `asyncio`. Camera capture runs in its own thread, and model calls run in a worker thread, so a slow detection never delays the heartbeat or a `stop`.

| Module | Job | Requirement |
|---|---|---|
| `main.py` | Starts the parts below from `hub.yaml` | |
| `link.py` | WebSocket client to the cloud: connect, reconnect, `hub.status` every 5 s, and an outbox file for messages while offline | Hub messages |
| `camera.py` | Reads the webcam, keeps the newest frame and a short history for before and after crops | FR-01, FR-08 |
| `scan.py` | Runs a scan: detect every fifth frame, read state, fingerprint, drop crops with a person in them, send `control.found`; then watch for flips and send `mapping.candidate` | FR-01, FR-02 |
| `orchestrator.py` | Runs one run from `run.start`: tries the wireless channels in the order given, then the press; sends `run.progress` and `run.result` | FR-07, FR-11 |
| `verifier.py` | Decides each command's result: the platform's report or the camera check, with the second look after `unsure` | FR-08 |
| `safety.py` | The gate before every movement: person or pet in the work area, risk, position reliable | FR-10 |
| `press.py` | At the press spot: re-finds the control and gets a press plan from `ai-engine` (the motion planner lives there), runs the gate, presses through the RAL | FR-09, FR-11 |
| `channels/` | `base.py` (`reachable`, `send`), `wifi.py`, `ir.py`, `bt.py`, `stub.py` | FR-03, FR-07 |
| `ral/` | `base.py` (`go_to_spot`, `press`, `release`, `stop`), `linear_actuators.py` (serial), `unity_sim.py` (WebSocket), `script.py` | FR-11, C-13 |

**Stop comes first.** `link.py` handles a `stop` message itself: it calls `ral.stop()` before it hands anything to the rest of the hub, then cancels the run task. The firmware stops the actuators on its own as well if the hub goes silent (see [Arduino firmware](./stack#arduino-firmware)).

**One run at a time.** `orchestrator.py` holds at most one run task, as the hub messages require.

**`go_to_spot` in the prototype.** `linear_actuators.py` sends a `run.progress` with `step: move` and waits until the presenter confirms in the app that the cart is in place.

## `cloud`

One FastAPI process with **one worker**: SQLite, the APScheduler jobs and the hub's WebSocket all live in that process, and a second worker would run every scheduled trigger twice.

| Module | Job | Requirement |
|---|---|---|
| `main.py` | FastAPI app, the scheduler, the database | |
| `db/` | SQLAlchemy models of the [database](./database), sessions | FR-12 |
| `api/` | One router per tag of the [API](/api/backend-server): `controls`, `devices`, `mappings`, `routines`, `runs`, `safety` | |
| `live.py` | WebSocket to the app: pushes new controls, mappings, routines, run progress | |
| `hub_gateway.py` | WebSocket for the hub: checks the hub token, skips message `id`s already handled, sends each message to the module below | Hub messages |
| `registry.py` | Same control or new one, finds or creates the device, creates and updates mappings | FR-01, FR-02 |
| `routines.py` | Finds habits in `uses`, handles feedback and demotion | FR-04 |
| `triggers.py` | Time triggers from APScheduler, sensor and routine triggers, merges duplicates within 10 s, opens a run | FR-05 |
| `policy.py` | Act, ask or suggest from risk and confidence | FR-06, C-03 |
| `runs.py` | Sends `run.start`, writes the run entry when `run.result` arrives, ends runs that never got one | FR-12, L-01 |
| `learning.py` | Channel scores, mapping confidence and `Stale`, press spot, routine priority, in the run's transaction | FR-12 |
| `explain.py` | Fixed sentence templates for the plain-language explanation | C-07 |

## What the hub needs from `ai-engine`

The hub imports `ai_engine` and calls one `Engine` object for every model step: detecting controls and devices, reading state, fingerprints, the change and effect checks, finding people, re-finding a control and planning a press (FR-09). The calls and their results are in [ai-engine interface](/api/ai-engine). The hub passes images and gets answers; it never loads a model itself.

## Tests

| Folder | What | How |
|---|---|---|
| `tests/common` | Message and run entry models | Examples from the wiki pages must parse |
| `tests/hub` | Orchestrator, verifier, safety, press | Fake camera with recorded frames, `stub` channels, `script` RAL. No hardware |
| `tests/cloud` | API, registry, policy, learning | SQLite in memory, a fake hub on the WebSocket |
| `tests/contract` | Both modes against each other | A real hub and cloud in one test, with fakes for the camera and the RAL |

Every test names its requirement with `@pytest.mark.fr("FR-07")` (C-01). The `check-fr-coverage` skill reads these marks.

## Open questions

| Question | Why it matters |
|---|---|
| How the app signs in | The cloud API is on the internet. A shared password at Caddy is the smallest step; the hub already uses a token from an environment variable (C-10) |
| Whether the outbox needs acknowledgements | A message written into the socket just before it drops can be lost. For now, a run without `run.result` ends as `cancelled` on the cloud after its time limit |
