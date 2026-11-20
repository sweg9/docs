# Stack

::: warning Draft
The stack for the demo. Libraries marked *not in the demo* are for wireless channels: the demo device has none, so no plug or blaster is bought and the adapters are tested with stubs (see the [live-demo plan](/live-demo/PLAN)).
:::

The [architecture](./architecture) says what the parts are. This page says which machine runs each part, how the machines talk, and which libraries they use. The tables are in [Database](./database), and the code layout in [Modules](./modules).

## Two run modes of one backend

Everything runs on one laptop at home; nothing leaves the home (decision of 2026-11-17, for privacy: the proposal puts the backend on AWS EC2). `backend-server` is one repository with two run modes, because the hub needs the hardware and the server does not.

| Mode | Runs on | Parts | Requirements |
|---|---|---|---|
| `hub` | The laptop, directly (`uv run`), outside Kubernetes | Camera capture, `ai-engine` (imported as a package), Control Orchestrator, channel adapters, Safety Guard, Robot Abstraction Layer, State Verifier | FR-01, FR-03, FR-07 to FR-11 |
| `server` | The same laptop, as a pod on Kubernetes (k3d) | Mapping Registry, Routine Engine, trigger scheduler, autonomy policy, log, the API for the web app | FR-02, FR-04 to FR-06, FR-12 |

The hub stays outside Kubernetes because Docker on macOS cannot pass a USB webcam or the Arduino's serial port into a container. The hub opens a WebSocket to the server through the cluster's ingress when it starts and keeps it open. The server sends commands down this connection, and the hub sends progress and results back.

Frames never leave the hub process. Only crops of controls and short notes go to the server, as the [introduction](./#privacy) says, and the server keeps them on the same laptop.

<StackDiagram />

### One run, end to end

1. The resident starts a routine in the web app, or the scheduler fires it. The server resolves the intent and the target device (FR-05) and decides act, ask or suggest (FR-06).
2. If the decision is act, or the resident said yes, the server looks up the `Verified` mapping and sends `run.start` to the hub.
3. The hub ranks the channels, sends the command, and checks the result (FR-07, FR-08). If wireless fails, it runs the Safety Guard and presses (FR-10, FR-11).
4. The hub streams `run.progress` events and a final `run.result` to the server.
5. The server writes the run to the log, updates scores and confidence (FR-12), and pushes the result to the web app.

If the connection drops (for example while the server pod restarts), the hub finishes or cancels the run it holds and keeps its messages in an outbox file until the server confirms them with `ack`. The server never treats a run as successful without a `run.result`, and never sends a command twice (see [Delivery](/api/hub-messages#delivery)).

## Libraries

### Python (hub and server)

| Area | Choice | Notes |
|---|---|---|
| Language and tools | Python 3.11, `uv`, `ruff`, `pytest` | `ai-engine` already uses `uv` |
| Models and settings | Pydantic v2, YAML settings files | Every number in settings, not in code |
| Web framework | FastAPI, Uvicorn | The server API and the WebSocket endpoints |
| Database | SQLite in WAL mode, SQLAlchemy 2, Alembic | Server only. Alembic records every schema change. Tables in [Database](./database) |
| Time triggers | APScheduler | In process, no separate queue |
| Recognition | Ultralytics YOLO11 (CPU): control detector, control state classifier, device detector. DINOv2 small, OpenCV 4 | In `ai-engine`, imported by the hub. All local, no model API (see [Models](/product/models)) |
| Serial | `pyserial` | Hub to Arduino |
| Wi-Fi plug | `python-kasa` (TP-Link Tapo or Kasa) or `tinytuya` (Tuya) | *Not in the demo*; depends on the plug chosen later |
| IR | `python-broadlink` (Broadlink RM4 mini) | *Not in the demo*; depends on the blaster chosen later |
| Bluetooth | `bleak` | *Not in the demo* |
| Logging | Standard `logging` with a JSON formatter | One JSON object per line; see [Logging](#logging) |

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

## Hub to server messages

JSON objects over the hub's WebSocket: a scan (`scan.start`, `control.found`, `scan.done`), a mapping candidate (`mapping.candidate`), watching for uses (`watch.set`, `control.used`), a run (`run.start`, `run.progress`, `run.result`), the emergency `stop`, the `hub.status` heartbeat, and `ack`. The payloads are in [Hub messages](/api/hub-messages).

## Sign-in

The server answers nothing without a sign-in, even at home: anyone on the home Wi-Fi can reach the laptop. The app and the hub sign in differently.

| Who | How | Secret |
|---|---|---|
| Web app | One resident account with a password. `POST /login` checks it and sets a session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`. Every API call and the app's WebSocket must carry it, or get `401` | `APP_PASSWORD_HASH` (argon2), a Kubernetes Secret |
| Hub | `Authorization: Bearer <token>` when it opens its WebSocket. A wrong token closes the connection | `HUB_TOKEN`, in the same Secret and in the hub's environment |
| Grafana | Its own admin account | `GRAFANA_ADMIN_PASSWORD`, a Kubernetes Secret |

- **Sessions** are rows in the database (see [Database](./database#sessions)), so `POST /logout` ends one for good. A session lasts 30 days and is renewed while the app is used, so the emergency stop in the app is not lost to an expired sign-in in the middle of a demo.
- **The stop needs no app.** The key on the hub and the switch on the power adapter work without signing in (FR-10).
- **Same origin.** The ingress serves the app at `/` and the API under `/api` from one host, `https://sweg9.localhost`, so the browser sends the cookie on its own and `SameSite=Strict` blocks requests from other sites. The TLS certificate is made with `mkcert` on the laptop and stored as a Secret.
- **Guessing.** After 5 wrong passwords within a minute, `POST /login` answers `429` for a minute.
- **No secrets in a repo** (C-10). Secrets are created with `kubectl create secret` on the laptop, never committed. `backend hash-password` prints the hash for a new password.

## Deployment on Kubernetes

Everything but the hub runs on a one-node Kubernetes cluster made with k3d (k3s inside Docker), in development and in the demo alike. The manifests are in `backend-server/deploy/k8s/` and are applied with `kubectl apply -k`.

| Workload | Kind | Image | Notes |
|---|---|---|---|
| `server` | Deployment, 1 replica, strategy `Recreate` | `sweg9/backend-server` (built from the repo) | Exactly one pod: SQLite, the scheduler and the hub's WebSocket live in one process, and two pods would fire every trigger twice. An init container runs `alembic upgrade head`. Readiness and liveness on `GET /healthz` |
| `web` | Deployment, 1 replica | `sweg9/live-demo` (nginx with the app build) | Static files only |
| `backup` | CronJob, 03:00 `Asia/Seoul` | `sweg9/backend-server` | See [Backups](#backups) |
| `loki` | StatefulSet, 1 replica | `grafana/loki` | See [Logging](#logging) |
| `alloy` | DaemonSet | `grafana/alloy` | Reads the pods' logs and the hub's log files and sends them to Loki |
| `grafana` | Deployment, 1 replica | `grafana/grafana` | Loki is provisioned as its data source |
| Ingress | Traefik (built into k3s) | | `https://sweg9.localhost` for the app and the API, `https://grafana.sweg9.localhost` for Grafana. Port 443 of the laptop goes to the ingress |

| Namespace | What |
|---|---|
| `sweg9` | `server`, `web`, `backup`, the app Secret, the settings ConfigMap |
| `logging` | `loki`, `alloy`, `grafana` |

- **Data outside the cluster.** The server's data (`app.db`, crops), the backups, Loki's data and the hub's log files live in folders on the laptop (`~/sweg9-data/`), mounted into the k3d node and used through `hostPath` volumes. Deleting and re-creating the cluster loses nothing.
- **Settings.** `settings/server.yaml` and `settings/risk.yaml` go into a ConfigMap; the image never holds settings (C-12).
- **Resources.** Requests and limits keep the cluster small, so the hub's models keep most of the CPU: `server` 0.5 CPU and 512 MiB at most, Loki and Grafana 256 MiB each.
- **Images** are built on the laptop and loaded with `k3d image import`; no registry is needed.
- **Tests** still run with `uv run pytest` outside the cluster.

```bash
k3d cluster create --config deploy/k3d.yaml        # once: one node, port 443, the data folders
docker build -t sweg9/backend-server:dev . && k3d image import sweg9/backend-server:dev -c sweg9
kubectl create secret generic app -n sweg9 --from-literal=HUB_TOKEN=... --from-literal=APP_PASSWORD_HASH=...
kubectl apply -k deploy/k8s
HUB_TOKEN=... uv run backend hub                    # the hub, on the laptop itself
```

## Logging

Two kinds of logs, kept apart:

| Log | What | Where | Rules |
|---|---|---|---|
| Run log | One entry per run (FR-12) | The `runs` table | [Run log](/standards/execution-log): append-only, the record for evaluation |
| Operational logs | What the hub and the server did and what went wrong: connections, messages, errors, timings | Loki, searched in Grafana | Below |

- **Format.** One JSON object per line: `ts` (UTC ISO 8601), `level`, `mode` (`hub` or `server`), `module`, `msg`, and `run_id`, `scan_id`, `msg_id` when they apply. The same `run_id` connects a log line in Grafana to the run in the run log.
- **Collection.** The server writes to stdout, and Alloy reads the pod logs. The hub writes to `~/sweg9-data/hub-logs/hub.log` (rotated at 10 MiB, 5 files kept), and Alloy reads that folder through the node mount. Loki labels are few: `mode`, `level`, `module`.
- **Content.** No images, no base64, no fingerprints, no secrets, no cookies (C-05, C-10, as L-07 asks of the run log). A message is logged by its `type` and `id`, never with its payload.
- **Retention.** Loki keeps 14 days, then deletes. The run log is not affected.
- **Dashboards.** Grafana gets one dashboard, provisioned from the repo: errors per module, gaps in `hub.status`, the outbox size, and a search by `run_id`.

## Backups

The server's SQLite file holds every mapping, routine and run, so it is backed up once a day.

1. The `backup` CronJob runs `sqlite3 app.db ".backup backups/app-<date>.db"` at 03:00 Seoul time. `.backup` gives a consistent copy while the server keeps writing in WAL mode. The job copies the crops in the same run, keeps the last 7 days and deletes older ones.
2. The backups are in `~/sweg9-data/backups/`, outside the cluster, so they survive a deleted cluster.
3. To restore, scale `server` to 0, put the backup file in place of `app.db`, and scale it back to 1; the init container runs `alembic upgrade head` in case the backup has an older schema.

**Known limit.** Every copy is on the same laptop, so a lost or broken laptop loses them all. The team accepts this: the database holds demo data that a new scan recreates, and the code, wiki and dataset are on GitHub. A real home would copy the backups to an external drive now and then, which still keeps the data at home.

## Open questions

| Question | Why it matters |
|---|---|
| Which Wi-Fi plug and IR blaster to support | Decides the adapter libraries. The demo device has no wireless channel (see the [live-demo plan](/live-demo/PLAN)), so none is bought for the demo, and the adapters are tested with stubs |
| Opening the app from a phone on the home Wi-Fi | The certificate from `mkcert` names `sweg9.localhost`, which a phone cannot resolve. The demo uses the laptop's browser |
