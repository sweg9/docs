# Stack

::: warning Draft
A first proposal for the detailed stack. Library choices marked *proposed* are open until the demo devices are bought and the first measurements are in.
:::

The [architecture](./architecture) says what the parts are. This page says which machine runs each part, how the machines talk, and which libraries they use.

## Two run modes of one backend

The devices that the system operates can only be reached from inside the home. The Arduino is on the hub's USB port, and the Wi-Fi plug and the IR blaster are on the home network. A server on AWS cannot reach any of them. So `backend-server` is one repository with two run modes.

| Mode | Runs on | Parts | Requirements |
|---|---|---|---|
| `hub` | The laptop at home | Camera capture, `ai-engine` (imported as a package), Control Orchestrator, channel adapters, Safety Guard, Robot Abstraction Layer, State Verifier | FR-01, FR-03, FR-07 to FR-11 |
| `cloud` | AWS EC2 | Mapping Registry, Routine Engine, trigger scheduler, autonomy policy, log, VLM calls, the API for the web app | FR-02, FR-04 to FR-06, FR-12 |

The hub opens a WebSocket **out** to the cloud when it starts and keeps it open. The cloud sends commands down this connection, and the hub sends progress and results back up. The home router needs no port forwarding.

Frames never leave the hub. Only crops of controls and short notes go up, as the [introduction](./#privacy) says.

```text
web app ──REST/WS──> cloud (EC2) ──VLM API──> cloud VLM
                        ▲
                        │ WebSocket opened by the hub
                        ▼
                     hub (laptop) ──USB──> Arduino ──> actuators
                        │
                        ├──LAN──> Wi-Fi plug, IR blaster ──> lamp, fan
                        └──USB──> webcam
```

### One run, end to end

1. The resident starts a routine in the web app, or the scheduler fires it. The cloud resolves the intent and the target device (FR-05) and decides act, ask or suggest (FR-06).
2. If the decision is act, or the resident said yes, the cloud looks up the `Verified` mapping and sends `run.start` to the hub.
3. The hub ranks the channels, sends the command, and checks the result (FR-07, FR-08). If wireless fails, it runs the Safety Guard and presses (FR-10, FR-11).
4. The hub streams `run.progress` events and a final `run.result` to the cloud.
5. The cloud writes the run to the log, updates scores and confidence (FR-12), and pushes the result to the web app.

If the connection drops, the hub finishes or cancels the run it holds and keeps its events in a local queue until it reconnects. The cloud never treats a run as successful without a `run.result`.

## Libraries

### Python (hub and cloud)

| Area | Choice | Notes |
|---|---|---|
| Language and tools | Python 3.11, `uv`, `ruff`, `pytest` | `ai-engine` already uses `uv` |
| Models and settings | Pydantic v2, YAML settings files | Every number in settings, not in code |
| Web framework | FastAPI | Cloud API and the WebSocket endpoints |
| Database | SQLite in WAL mode, SQLAlchemy 2, Alembic | Cloud only. Alembic records every schema change |
| Time triggers | APScheduler | In process, no separate queue |
| Recognition | Ultralytics YOLO11 (CPU), DINOv2 small, OpenCV 4 | In `ai-engine`, imported by the hub. No separate service |
| Cloud VLM | One `VLMClient` interface, one adapter per provider | The provider is chosen after testing. Called from the cloud |
| Serial | `pyserial` | Hub to Arduino |
| Wi-Fi plug | `python-kasa` (TP-Link Tapo or Kasa) or `tinytuya` (Tuya) | *Proposed*, depends on the plug we buy |
| IR | `python-broadlink` (Broadlink RM4 mini) | *Proposed*, depends on the blaster we buy |
| Bluetooth | `bleak` | *Proposed* |

### Interfaces inside the hub

| Interface | Methods | Implementations |
|---|---|---|
| Channel adapter (FR-07) | `reachable(device)`, `send(device, action)` | `WIFI`, `IR`, `BT` |
| Robot Abstraction Layer (FR-11) | `go_to_spot`, `press`, `release`, `stop` | `linear_actuators` (serial), `unity_sim` (WebSocket), `script`, chosen in a settings file |

### Arduino firmware

A line protocol over USB serial at 115200 baud: `PUSH <actuator> <ms>`, `REL <actuator>`, `STOP`, each answered with `OK` or `ERR <reason>`. The firmware itself caps the push time and releases the actuator when the cap is reached or when no command arrives for a set time. The actuator then stops even if the hub crashes (FR-10).

### Web app (live-demo)

| Area | Choice | Notes |
|---|---|---|
| Build | Vite, React 18, TypeScript 5, Node.js 20 | |
| Server data | TanStack Query | Lists of controls, mappings, routines, runs |
| Live updates | Browser WebSocket | New control, new routine, run progress |
| API types | `openapi-typescript` from [backend-server.yaml](/api/backend-server) | The app and the backend share one contract |

### Simulator

The Unity simulator is a WebSocket client of the hub and uses the same messages as the RAL (see [Simulator](/product/simulator)).

## Hub to cloud messages

JSON objects over the hub's WebSocket: a scan (`scan.start`, `control.found`, `scan.done`), a mapping candidate (`mapping.candidate`), a run (`run.start`, `run.progress`, `check.ask`, `check.answer`, `run.result`), the emergency `stop`, and the `hub.status` heartbeat. The payloads are in [Hub messages](/api/hub-messages).

## Deployment

| Place | How |
|---|---|
| EC2 | Docker Compose with the cloud API and Caddy for HTTPS. SQLite file on the instance disk |
| Hub | `uv run` on the laptop, with the settings file that picks the RAL implementation |
| Web app | Static build served by the cloud's Caddy |

## Open questions

| Question | Why it matters |
|---|---|
| Which Wi-Fi plug and IR blaster to support | Decides the adapter libraries. The demo device has no wireless channel (see the [live-demo plan](/live-demo/PLAN)), so none is bought for the demo, and the adapters are tested with stubs |
| Backups: `data-model.md` says S3, the team does not use S3 | Decides how the SQLite file is backed up, for example EC2 snapshots |
| Which cloud VLM | Decides the `VLMClient` adapter and its cost |
