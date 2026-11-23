# Modules

::: warning Draft
The layout of the `backend-server` repository for the design of 2026-11-20. Many modules are still docstrings that say what they will do (see the repository's README). The repository owns its layout and changes this page as it is built.
:::

[Stack](./stack) says where each part runs. `backend-server` holds three of them:
- `hub`, on a laptop at home;
- `server`, a pod on k3s on AWS EC2;
- `enclave`, the program in the Nitro Enclave on the same instance.

This page says how the code is split so that the three live in one repository without getting in each other's way, and which module serves which requirement.

## Layout

```text
backend-server/
├── pyproject.toml          uv project; extras: hub, server, enclave (ai-engine goes into the enclave image)
├── Dockerfile              the server image (no models)
├── enclave/                Dockerfile of the enclave image, turned into an EIF with nitro-cli
├── settings/
│   ├── hub.yaml            spots, rooms, RAL choice, camera, time limits, thresholds, weights, habit rule, backup, time zone
│   ├── server.yaml         ports, time limits, the S3 bucket
│   └── risk.yaml           risk sorting of device types (FR-06), passed to the enclave when it starts
├── src/backend/
│   ├── cli.py              `backend hub`, `backend server`, `backend enclave`, `backend backup`,
│   │                       `backend export-runs`, `backend seed-demo`, `backend hash-password`
│   ├── common/             used by every part
│   ├── hub/                runs on a laptop at home; owns the database
│   ├── server/             runs as a pod on k3s on AWS EC2; no database
│   └── enclave/            runs in the Nitro Enclave; the only part that calls ai-engine
├── migrations/             Alembic, the hub's database
├── deploy/
│   ├── README.md           setting up the EC2 instance
│   └── k8s/                kustomization: namespaces, server, ml-engine, web, ingress, logging
├── firmware/               Arduino sketch for the actuators
└── tests/
    ├── common/  hub/  server/  enclave/
    └── contract/           hub messages and the OpenAPI spec
```

## Import rules

| Module | May import | Never imports |
|---|---|---|
| `common` | Pydantic, the standard library | `hub`, `server`, `enclave`, `ai_engine` |
| `hub` | `common` | `server`, `enclave`, `ai_engine` |
| `server` | `common` | `hub`, `enclave`, `ai_engine` |
| `enclave` | `common`, `ai_engine` | `hub`, `server` |

- The hub and the server talk only through the [hub messages](/api/hub-messages).
- The server and the enclave talk only over vsock, in the same message shapes. The models of those shapes are in `common`.
- So only the enclave image carries YOLO and PyTorch, the server image stays small, and each part can be tested alone. A test in `tests/` checks the rules with `import-linter`.

## `common`

| File | Content | Source |
|---|---|---|
| `vocab.py` | Enumerations with the exact spelling of the data model: stages, control kinds, statuses, channels, risk, results | [Data model](/standards/data-model), C-02 |
| `messages.py` | Pydantic models of the envelope and every hub message payload | [Hub messages](/api/hub-messages) |
| `runlog.py` | The run entry model and checks for L-01 to L-09 | [Run log](/standards/execution-log) |
| `settings.py` | Loads a YAML settings file into Pydantic models; a missing or unknown key stops the start | C-12 |
| `ids.py` | Prefix and ULID identifiers | [Database](./database#rules-for-every-table) |

## `hub`

One Python process with `asyncio`. Photos are taken in their own thread, so a slow request never delays the heartbeat or a `stop`.

| Module | Job | Requirement |
|---|---|---|
| `main.py` | Starts the parts below from `hub.yaml` | |
| `link.py` | WebSocket client to the server: connect, reconnect, `hub.status` every 5 s, requests with their time limits, `app.request` handed to `app.py` | Hub messages |
| `seal.py` | Gets a data key from KMS for each photo and encrypts it (AES-256-GCM) | C-05 |
| `camera.py` | The Reader: asks the robot's camera for a photo when a step needs one | FR-01, FR-08 |
| `db/` | SQLAlchemy models of the [database](./database) | FR-12 |
| `scan.py` | Runs a scan: sends `recognize`, saves clear controls (same control or new one), then watches for a flip and sends `check` with `purpose: map` | FR-01, FR-02 |
| `registry.py` | Finds or creates the device and creates and updates mappings | FR-02 |
| `watch.py` | Watches the controls with a `Verified` mapping at the current spot and writes `uses` | FR-04 |
| `routines.py` | Finds habits once a day, handles feedback and demotion | FR-04 |
| `triggers.py` | Time triggers from APScheduler, sensor and routine triggers, merges duplicates within 10 s, opens a run and sends `decide` | FR-05, FR-06 |
| `orchestrator.py` | Runs one run: tries the wireless channels in order, then the press; sends `app.event` for each step | FR-07, FR-11 |
| `verifier.py` | Decides each command's result: the platform's report, or `check` with `purpose: verify` and the second look after `unsure` | FR-08 |
| `safety.py` | The gate before every movement: `people`, risk, position reliable; no answer means no press | FR-10 |
| `press.py` | At the press spot: `refind` for the box and the press plan, the gate, the press through the RAL | FR-09, FR-11 |
| `runs.py` | Writes the run entry when a run ends | FR-12, L-01 |
| `learning.py` | Channel scores, mapping confidence and `Stale`, press spot, routine priority, in the run's transaction | FR-12 |
| `explain.py` | Fixed sentence templates for the plain-language explanation | C-07 |
| `app.py` | Answers `app.request`: one handler per API route, the session check, login and logout | Sign-in |
| `dashboard.py` | The Streamlit Dashboard, read-only on the database; works without the server | |
| `backup.py` | The daily copy of the database | |
| `channels/` | `base.py` (`reachable`, `send`), `wifi.py`, `ir.py`, `bt.py`, `stub.py` | FR-03, FR-07 |
| `ral/` | `base.py` (`go_to_spot`, `press`, `release`, `stop`), `linear_actuators.py` (serial), `unity_sim.py` (WebSocket), `script.py` | FR-11, C-13 |

**Stop comes first.** `link.py` handles a `stop` message itself. It calls `ral.stop()` before it hands anything to the rest of the hub, then cancels the run task. The firmware stops the actuators on its own as well if the hub goes silent (see [Arduino firmware](./stack#arduino-firmware)).

**One run at a time.** `orchestrator.py` holds at most one run task.

**`go_to_spot` in the prototype.** `linear_actuators.py` sends an `app.event` with the step `move` and waits until the presenter confirms in the app that the cart is in place.

## `server`

One FastAPI process in one pod. It keeps no database. It logs JSON lines to stdout (see [Logging](./stack#logging)) and answers `GET /healthz` for Kubernetes.

| Module | Job | Requirement |
|---|---|---|
| `main.py` | FastAPI app | |
| `api/` | One router per tag of the [API](/api/backend-server): `controls`, `devices`, `mappings`, `routines`, `runs`, `safety`. Each call is relayed to the hub as `app.request`; `503` while the hub is offline | |
| `auth.py` | The hub token check and the login limit; the session itself is checked by the hub | Sign-in |
| `live.py` | WebSocket to the app: pushes each `app.event` | |
| `hub_gateway.py` | WebSocket for the hub: checks the hub token, passes requests to the enclave and the answers back, relays `app.request` and `stop` | Hub messages |
| `enclave_link.py` | vsock client to the enclave | |
| `store.py` | Puts each sealed photo in S3 under its `photo_id` | C-05 |

## `enclave`

One process in the Nitro Enclave. It has no network and no disk. It talks only to the server over vsock and to KMS through the server's vsock proxy.

| Module | Job | Requirement |
|---|---|---|
| `main.py` | vsock server; at start gets `risk.yaml` and `ai-engine`'s settings over vsock and loads the `Engine` once | C-12 |
| `unseal.py` | Decrypts a sealed photo with KMS, using the enclave's attestation document | C-05 |
| `handlers.py` | `recognize`, `check`, `refind`, `people`: calls into `ai_engine` | FR-01, FR-02, FR-08 to FR-10 |
| `policy.py` | Act, ask or suggest from risk and confidence (`decide`) | FR-06, C-03 |

## What the enclave needs from `ai-engine`

The enclave imports `ai_engine` and calls one `Engine` object for every model step: detecting controls, reading state, the link guess, the change and effect checks, finding people, re-finding a control and planning a press (FR-09). The calls and their results are in [ai-engine interface](/api/ai-engine). The enclave passes the opened photos and gets answers; it never loads a model itself.

## Tests

| Folder | What | How |
|---|---|---|
| `tests/common` | Message and run entry models | Examples from the wiki pages must parse |
| `tests/hub` | Orchestrator, verifier, safety, press, registry, routines, learning | SQLite in memory, a fake server, `stub` channels, `script` RAL. No hardware |
| `tests/server` | API relay, hub gateway | A fake hub and a fake enclave |
| `tests/enclave` | Handlers and policy | A fake KMS; the `Engine` with its not-trained answers |
| `tests/contract` | The parts against each other | A real hub, server and enclave process in one test, with fakes for the camera, KMS and the RAL |

Every test names its requirement with `@pytest.mark.fr("FR-07")` (C-01). The `check-fr-coverage` skill reads these marks.
